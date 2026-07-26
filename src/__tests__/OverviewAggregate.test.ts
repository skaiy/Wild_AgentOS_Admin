import { describe, expect, it } from 'vitest';
import {
  countBy,
  formatBytes,
  formatCount,
  formatPercent,
  formatRelativeTime,
  summarizeAgents,
  summarizeAudit,
  summarizeModels,
  summarizeSkills,
  topN,
  truncateLabel,
} from '../components/overview/aggregate';
import type { AgentInfo, ApiAuditRecord, ModelsConfig, SkillMeta } from '../api/client';

const agent = (over: Partial<AgentInfo>): AgentInfo => ({
  name: 'a', description: '', enabled: true, business_domain: '新能源汽车维修', ...over,
});

const skill = (over: Partial<SkillMeta>): SkillMeta => ({
  skill_iri: 'skill://x', name: 'x', description: '', version: '1.0.0',
  category: 'diagnosis', security_level: 'low', allowed_roles: [], ...over,
});

describe('overview aggregation', () => {
  it('counts by key with descending order and 未分类 fallback', () => {
    expect(countBy([{ k: 'a' }, { k: 'b' }, { k: 'a' }, { k: '' }], (x) => x.k)).toEqual([
      { name: 'a', value: 2 },
      { name: 'b', value: 1 },
      { name: '未分类', value: 1 },
    ]);
  });

  it('summarizes agents by state and domain', () => {
    const summary = summarizeAgents([
      agent({ published: true, skills: ['s1'], knowledge_pack_ids: ['p1'] }),
      agent({ enabled: false, business_domain: '电池' }),
      agent({ skills: [] }),
    ]);
    expect(summary).toMatchObject({ total: 3, enabled: 2, published: 1, withKnowledge: 1, withSkills: 1 });
    expect(summary.byDomain[0]).toEqual({ name: '新能源汽车维修', value: 2 });
  });

  it('summarizes skills signature and distributions', () => {
    const summary = summarizeSkills([
      skill({ signature_status: 'verified' }),
      skill({ category: 'repair', security_level: 'high', signature_status: 'invalid' }),
      skill({ category: 'repair' }),
    ]);
    expect(summary).toMatchObject({ total: 3, verified: 1, unsigned: 1, untrusted: 1 });
    expect(summary.byCategory[0]).toEqual({ name: 'repair', value: 2 });
    expect(summary.bySecurity.map((x) => x.name)).toContain('high');
  });

  it('summarizes model registry including modality coverage', () => {
    const models: ModelsConfig = {
      providers: [
        { id: 'p1', base_url: 'https://a', enabled: true, api_key_configured: true },
        { id: 'p2', base_url: 'https://b', enabled: false },
      ],
      resources: [
        { id: 'r1', provider_id: 'p1', model: 'm1', modalities: ['chat'] },
        { id: 'r2', provider_id: 'p1', model: 'm2', modalities: ['embedding'], dimension: 1024 },
        { id: 'r3', provider_id: 'p1', model: 'm3', modalities: [], enabled: false },
      ],
    };
    expect(summarizeModels(models)).toMatchObject({
      providerTotal: 2,
      providerEnabled: 1,
      providerKeyed: 1,
      resourceTotal: 3,
      resourceEnabled: 2,
      embeddingDimensions: [1024],
    });
    expect(summarizeModels(models).byModality).toEqual([
      { name: 'chat', value: 2 },
      { name: 'embedding', value: 1 },
    ]);
    expect(summarizeModels(null)).toMatchObject({ providerTotal: 0, resourceTotal: 0 });
  });

  it('summarizes inbound audit success rate and latency', () => {
    const record = (status: number, latency?: number): ApiAuditRecord => ({
      ts: '2026-07-26T00:00:00Z', client_id: 'c', key_prefix: 'k', agent_id: 'a',
      endpoint: '/api/v1/public/agents/a/chat', status, result: 'ok', latency_ms: latency,
    });
    const summary = summarizeAudit([record(200, 100), record(403, 300), record(200)]);
    expect(summary).toMatchObject({ total: 3, success: 2, failure: 1, avgLatencyMs: 200 });
    expect(formatPercent(summary.successRate)).toBe('66.7%');
    expect(summarizeAudit([])).toMatchObject({ total: 0, successRate: null, avgLatencyMs: null });
  });

  it('clamps long labels and merges the long tail', () => {
    expect(truncateLabel('新能源汽车维修', 16)).toBe('新能源汽车维修');
    expect(truncateLabel('a'.repeat(40), 5)).toBe('aaaaa…');
    expect(topN([{ name: 'a', value: 3 }, { name: 'b', value: 2 }, { name: 'c', value: 1 }], 2)).toEqual([
      { name: 'a', value: 3 },
      { name: 'b', value: 2 },
      { name: '其他', value: 1 },
    ]);
    expect(topN([{ name: 'a', value: 1 }], 3)).toEqual([{ name: 'a', value: 1 }]);
  });

  it('formats counts, bytes, percent and relative time', () => {
    expect(formatCount(12345)).toBe('12,345');
    expect(formatCount(null)).toBe('—');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(null)).toBe('—');
    expect(formatPercent(null)).toBe('—');
    const now = Date.parse('2026-07-26T00:10:00Z');
    expect(formatRelativeTime('2026-07-26T00:09:30Z', now)).toBe('30 秒前');
    expect(formatRelativeTime('2026-07-26T00:00:00Z', now)).toBe('10 分钟前');
    expect(formatRelativeTime(null)).toBe('—');
  });
});
