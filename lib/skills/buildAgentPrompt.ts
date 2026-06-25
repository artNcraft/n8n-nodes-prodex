import { loadInstalledSkill, resolveSkillsHome } from './skillStore';

export interface InlineSkill {
  name: string;
  content: string;
}

export interface BuildAgentPromptParams {
  userPrompt: string;
  systemPrompt?: string;
  staticSkillNames?: string[];
  dynamicSkills?: unknown;
  codexHome: string;
}

export interface BuiltAgentPrompt {
  prompt: string;
  appliedSkills: string[];
  additionalDirectories: string[];
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function parseStaticSkillNames(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }

  return uniqueStrings(raw.split(/[\n,]+/));
}

export function resolveSkillNames(skills: string[] | undefined, legacyStatic = ''): string[] {
  const fromPicker = uniqueStrings(skills ?? []);
  if (fromPicker.length > 0) {
    return fromPicker;
  }
  return parseStaticSkillNames(legacyStatic);
}

export function parseDynamicSkills(value: unknown): InlineSkill[] {
  if (value === undefined || value === null || value === '') {
    return [];
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    if (trimmed.includes('\n') || trimmed.startsWith('#') || trimmed.startsWith('---')) {
      return [{ name: 'dynamic-inline', content: trimmed }];
    }

    return parseStaticSkillNames(trimmed).map((name) => ({ name, content: '' }));
  }

  if (Array.isArray(value)) {
    const skills: InlineSkill[] = [];
    for (const entry of value) {
      if (typeof entry === 'string') {
        skills.push(...parseDynamicSkills(entry));
        continue;
      }

      if (entry && typeof entry === 'object') {
        const record = entry as Record<string, unknown>;
        const name =
          typeof record.name === 'string'
            ? record.name
            : typeof record.skill === 'string'
              ? record.skill
              : 'dynamic-inline';
        const content =
          typeof record.content === 'string'
            ? record.content
            : typeof record.markdown === 'string'
              ? record.markdown
              : typeof record.body === 'string'
                ? record.body
                : '';

        if (content.trim()) {
          skills.push({ name, content: content.trim() });
        } else if (name.trim()) {
          skills.push({ name: name.trim(), content: '' });
        }
      }
    }
    return skills;
  }

  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([name, content]) => ({
        name,
        content: typeof content === 'string' ? content : JSON.stringify(content),
      }))
      .filter((skill) => skill.content.trim() || skill.name.trim());
  }

  return [];
}

export function buildAgentPrompt(params: BuildAgentPromptParams): BuiltAgentPrompt {
  const sections: string[] = [];
  const appliedSkills: string[] = [];
  const staticNames = uniqueStrings(params.staticSkillNames ?? []);
  const dynamicSkills = parseDynamicSkills(params.dynamicSkills);

  if (params.systemPrompt?.trim()) {
    sections.push('# System instructions\n\n' + params.systemPrompt.trim());
  }

  const skillSections: string[] = [];

  for (const skillName of staticNames) {
    const skill = loadInstalledSkill(params.codexHome, skillName);
    appliedSkills.push(skill.name);
    skillSections.push(
      `## Skill: ${skill.name}${skill.description ? `\n\n${skill.description}` : ''}\n\n${skill.body}`.trim(),
    );
  }

  for (const skill of dynamicSkills) {
    if (skill.content.trim()) {
      appliedSkills.push(`${skill.name} (inline)`);
      skillSections.push(`## Skill: ${skill.name}\n\n${skill.content.trim()}`);
      continue;
    }

    const installed = loadInstalledSkill(params.codexHome, skill.name);
    appliedSkills.push(installed.name);
    skillSections.push(
      `## Skill: ${installed.name}${installed.description ? `\n\n${installed.description}` : ''}\n\n${installed.body}`.trim(),
    );
  }

  if (skillSections.length > 0) {
    sections.push('# Active skills\n\n' + skillSections.join('\n\n'));
  }

  const prefix = sections.length > 0 ? `${sections.join('\n\n')}\n\n---\n\n# Task\n\n` : '';
  const prompt = `${prefix}${params.userPrompt.trim()}`;

  return {
    prompt,
    appliedSkills,
    additionalDirectories: appliedSkills.length > 0 ? [resolveSkillsHome(params.codexHome)] : [],
  };
}
