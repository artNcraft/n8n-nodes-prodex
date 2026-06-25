import { resolveCodexHome } from '../auth/codexEnv';
import { listInstalledSkills } from './skillStore';

export function getInstalledSkillLoadOptions(codexHome?: string): Array<{ name: string; value: string }> {
  const home = codexHome ?? resolveCodexHome();
  return listInstalledSkills(home).map((skill) => ({
    name: skill.description ? `${skill.name} — ${skill.description}` : skill.name,
    value: skill.name,
  }));
}
