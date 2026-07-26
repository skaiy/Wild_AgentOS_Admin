import { describe, expect, it } from 'vitest';
import { docNavItems, homeNavItem, navGroups } from '../components/Sidebar';

describe('Sidebar navigation groups', () => {
  it('separates Agent development from operations', () => {
    expect(homeNavItem).toMatchObject({
      id: 'overview',
      label: 'AI Agent 中台总览',
    });
    expect(navGroups.map((group) => group.label)).toEqual([
      '业务 Agent 开发',
      '调试监控与运维',
    ]);
    expect(navGroups[0].items.map((item) => item.id)).toEqual([
      'agents',
      'knowledge',
      'registry',
      'prompts',
      'mcp',
    ]);
    expect(navGroups[1].items.map((item) => item.id)).toEqual([
      'console',
      'runtime',
      'memory',
      'batch',
      'security',
    ]);
  });

  it('exposes the embedded docs site as the last menu entry', () => {
    expect(docNavItems.map((item) => item.id)).toEqual(['docsite']);
    expect(docNavItems[0].label).toBe('平台文档');
  });
});
