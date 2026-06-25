import { spawn } from 'node:child_process';

import { buildCodexEnv } from '../auth/codexEnv';
import { SkillCliInstallError } from '../errors';
import type { InstalledSkill } from './skillStore';
import { listInstalledSkills, sanitizeSkillName } from './skillStore';

const GITHUB_REPO_PATTERN = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(\/)?$/i;
const DEFAULT_TIMEOUT_MS = 120_000;

export interface InstallSkillCliParams {
  codexHome: string;
  packageManager: 'npx' | 'pnpm';
  repoUrl: string;
  skillName: string;
  timeoutMs?: number;
}

export interface InstallSkillCliResult {
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  installed: InstalledSkill[];
  skill?: InstalledSkill;
  skillFound: boolean;
}

export function normalizeRepoUrl(repoUrl: string): string {
  const trimmed = repoUrl.trim().replace(/\/$/, '');
  if (GITHUB_REPO_PATTERN.test(trimmed)) {
    return trimmed;
  }

  const shorthand = trimmed.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (shorthand) {
    return `https://github.com/${shorthand[1]}/${shorthand[2]}`;
  }

  throw new SkillCliInstallError(
    'Repository URL must be a GitHub HTTPS URL (e.g. https://github.com/anthropics/skills) or owner/repo.',
    { command: '', stdout: '', stderr: '', exitCode: 1 },
  );
}

export function buildInstallSkillCommand(params: InstallSkillCliParams): { command: string; args: string[] } {
  const repoUrl = normalizeRepoUrl(params.repoUrl);
  const skillName = sanitizeSkillName(params.skillName);

  const sharedArgs = ['skills', 'add', repoUrl, '--skill', skillName, '-a', 'codex', '-g', '-y'];

  if (params.packageManager === 'pnpm') {
    return {
      command: 'pnpm',
      args: ['dlx', ...sharedArgs],
    };
  }

  return {
    command: 'npx',
    args: ['--yes', ...sharedArgs],
  };
}

function runCommand(
  command: string,
  args: string[],
  env: Record<string, string>,
  cwd: string,
  timeoutMs: number,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      cwd,
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(
        new SkillCliInstallError(`Skill install timed out after ${timeoutMs / 1000}s.`, {
          command: [command, ...args].join(' '),
          stdout,
          stderr,
          exitCode: -1,
        }),
      );
    }, timeoutMs);

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(
        new SkillCliInstallError(`Failed to run ${command}: ${error.message}`, {
          command: [command, ...args].join(' '),
          stdout,
          stderr,
          exitCode: -1,
        }),
      );
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code ?? 1 });
    });
  });
}

export async function installSkillViaCli(params: InstallSkillCliParams): Promise<InstallSkillCliResult> {
  const skillName = sanitizeSkillName(params.skillName);
  const { command, args } = buildInstallSkillCommand(params);
  const commandLine = [command, ...args].join(' ');
  const env = buildCodexEnv(params.codexHome);
  const timeoutMs = params.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const { stdout, stderr, exitCode } = await runCommand(command, args, env, params.codexHome, timeoutMs);

  if (exitCode !== 0) {
    throw new SkillCliInstallError(
      `Skill install failed (exit ${exitCode}). ${stderr.trim() || stdout.trim() || 'No CLI output.'}`,
      { command: commandLine, stdout, stderr, exitCode },
    );
  }

  const installed = listInstalledSkills(params.codexHome);
  const skill = installed.find((entry) => entry.name === skillName);

  return {
    command: commandLine,
    stdout,
    stderr,
    exitCode,
    installed,
    skill,
    skillFound: Boolean(skill),
  };
}
