import { describe, expect, it } from 'vitest';

import {
  buildInstallSkillCommand,
  normalizeRepoUrl,
} from '../../lib/skills/installSkillCli';

describe('installSkillCli', () => {
  it('normalizes GitHub URLs and owner/repo shorthand', () => {
    expect(normalizeRepoUrl('https://github.com/anthropics/skills/')).toBe(
      'https://github.com/anthropics/skills',
    );
    expect(normalizeRepoUrl('anthropics/skills')).toBe('https://github.com/anthropics/skills');
  });

  it('builds npx install command', () => {
    const { command, args } = buildInstallSkillCommand({
      codexHome: '/tmp/codex',
      packageManager: 'npx',
      repoUrl: 'https://github.com/anthropics/skills',
      skillName: 'docx',
    });

    expect(command).toBe('npx');
    expect(args).toEqual([
      '--yes',
      'skills',
      'add',
      'https://github.com/anthropics/skills',
      '--skill',
      'docx',
      '-a',
      'codex',
      '-g',
      '-y',
    ]);
  });

  it('builds pnpm dlx install command', () => {
    const { command, args } = buildInstallSkillCommand({
      codexHome: '/tmp/codex',
      packageManager: 'pnpm',
      repoUrl: 'anthropics/skills',
      skillName: 'docx',
    });

    expect(command).toBe('pnpm');
    expect(args[0]).toBe('dlx');
    expect(args).toContain('docx');
    expect(args).toContain('-a');
    expect(args).toContain('codex');
  });
});
