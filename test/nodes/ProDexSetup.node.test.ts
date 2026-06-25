import { describe, expect, it } from 'vitest';

import { ProDexSetup } from '../../nodes/ProDexSetup/ProDexSetup.node';

describe('ProDexSetup node', () => {
  it('exposes auth-only setup operations', () => {
    const node = new ProDexSetup();
    const operation = node.description.properties?.find((property) => property.name === 'operation');
    const values = (operation?.options ?? []).map((option) =>
      typeof option === 'string' ? option : option.value,
    );

    expect(node.description.name).toBe('prodexSetup');
    expect(operation?.type).toBe('options');
    expect(values).toEqual(['exportCredential', 'startDeviceLogin', 'waitForLogin']);
  });
});
