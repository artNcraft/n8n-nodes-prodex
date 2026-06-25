import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';

import { CodexAuthSetupError } from '../errors';

export interface InstalledSkill {
  name: string;
  description?: string;
  path: string;
  updatedAt: string;
}

export interface ParsedSkillMarkdown {
  name?: string;
  description?: string;
  body: string;
}

const SKILL_FILE = 'SKILL.md';
const SKILL_NAME_PATTERN = /^[a-z0-9][a-z0-9-_]{0,63}$/i;

export function resolveSkillsHome(codexHome: string): string {
  return join(codexHome, 'skills');
}

export function sanitizeSkillName(skillName: string): string {
  const normalized = skillName.trim().toLowerCase().replace(/\s+/g, '-');
  if (!SKILL_NAME_PATTERN.test(normalized)) {
    throw new CodexAuthSetupError(
      'Skill name must be 1-64 characters and use only letters, numbers, hyphens, or underscores.',
    );
  }
  return normalized;
}

export function parseSkillMarkdown(content: string): ParsedSkillMarkdown {
  const trimmed = content.trim();
  if (!trimmed.startsWith('---')) {
    return { body: trimmed };
  }

  const end = trimmed.indexOf('---', 3);
  if (end === -1) {
    return { body: trimmed };
  }

  const frontmatter = trimmed.slice(3, end).trim();
  const body = trimmed.slice(end + 3).trim();
  const metadata: Record<string, string> = {};

  for (const line of frontmatter.split('\n')) {
    const match = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.+)$/);
    if (!match) {
      continue;
    }

    metadata[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }

  return {
    name: metadata.name,
    description: metadata.description,
    body,
  };
}

export function installSkill(codexHome: string, skillName: string, skillMarkdown: string): InstalledSkill {
  const name = sanitizeSkillName(skillName);
  const parsed = parseSkillMarkdown(skillMarkdown);
  if (!parsed.body.trim()) {
    throw new CodexAuthSetupError('Skill content is empty. Provide a SKILL.md body with instructions.');
  }

  const skillsHome = resolveSkillsHome(codexHome);
  mkdirSync(skillsHome, { recursive: true, mode: 0o700 });

  const skillDir = join(skillsHome, name);
  mkdirSync(skillDir, { recursive: true, mode: 0o700 });

  const normalizedMarkdown = skillMarkdown.trim().endsWith('\n')
    ? skillMarkdown.trimEnd()
    : skillMarkdown.trim();

  const skillPath = join(skillDir, SKILL_FILE);
  writeFileSync(skillPath, `${normalizedMarkdown}\n`, { encoding: 'utf8', mode: 0o600 });

  return {
    name,
    description: parsed.description,
    path: skillPath,
    updatedAt: new Date(statSync(skillPath).mtimeMs).toISOString(),
  };
}

export function listInstalledSkills(codexHome: string): InstalledSkill[] {
  const skillsHome = resolveSkillsHome(codexHome);
  if (!existsSync(skillsHome)) {
    return [];
  }

  const skills: InstalledSkill[] = [];

  for (const entry of readdirSync(skillsHome, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const skillPath = join(skillsHome, entry.name, SKILL_FILE);
    if (!existsSync(skillPath)) {
      continue;
    }

    const parsed = parseSkillMarkdown(readFileSync(skillPath, 'utf8'));
    skills.push({
      name: entry.name,
      description: parsed.description,
      path: skillPath,
      updatedAt: new Date(statSync(skillPath).mtimeMs).toISOString(),
    });
  }

  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

export function loadInstalledSkill(codexHome: string, skillName: string): ParsedSkillMarkdown & { name: string } {
  const name = sanitizeSkillName(skillName);
  const skillPath = join(resolveSkillsHome(codexHome), name, SKILL_FILE);
  if (!existsSync(skillPath)) {
    throw new CodexAuthSetupError(
      `Skill "${name}" is not installed. Use ProDex → Install Skill, then List Installed Skills to verify.`,
    );
  }

  const parsed = parseSkillMarkdown(readFileSync(skillPath, 'utf8'));
  return {
    name,
    description: parsed.description,
    body: parsed.body,
  };
}
