import { describe, expect, it } from 'vitest';

import { ProDexChatModel } from '../../nodes/ProDexChatModel/ProDexChatModel.node';

describe('ProDexChatModel node', () => {
  it('exposes an AI language model output for AI Agent', () => {
    const node = new ProDexChatModel();

    expect(node.description.name).toBe('prodexChatModel');
    expect(node.description.version).toBe(2);
    expect(node.description.outputs).toEqual(['ai_languageModel']);
    expect(node.supplyData).toBeTypeOf('function');
    expect(node.methods?.loadOptions?.getInstalledSkills).toBeTypeOf('function');
    expect(node.description.properties?.some((property) => property.name === 'useN8nCredentials')).toBe(true);
    expect(node.description.credentials?.[0]?.displayOptions?.show?.useN8nCredentials).toEqual([true]);
  });
});
