import { describe, expect, it } from 'vitest';

import { ProDex } from '../../nodes/ProDex/ProDex.node';

describe('ProDex node', () => {
  it('exposes expected metadata', () => {
    const node = new ProDex();

    expect(node.description.name).toBe('prodex');
    expect(node.description.displayName).toBe('ProDex');
    expect(node.description.version).toBe(2);
    expect(node.description.credentials?.[0]?.name).toBe('prodexAuthApi');
    expect(node.description.usableAsTool).toBe(true);
  });

  it('exposes simplified operation dropdown', () => {
    const node = new ProDex();
    const operation = node.description.properties?.find((property) => property.name === 'operation');
    const values = (operation?.options ?? []).map((option) =>
      typeof option === 'string' ? option : option.value,
    );

    expect(values).toEqual([
      'runAgent',
      'installSkill',
      'listSkills',
      'invokeSkill',
      'mcpTools',
      'plugins',
    ]);
    expect(node.methods?.loadOptions?.getInstalledSkills).toBeTypeOf('function');
    expect(node.description.properties?.some((property) => property.name === 'useN8nCredentials')).toBe(true);
    expect(node.description.credentials?.[0]?.displayOptions?.show?.useN8nCredentials).toEqual([true]);
  });
});
