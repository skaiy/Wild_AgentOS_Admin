/**
 * 总览页聚合计算：纯函数，输入均为后端真实响应片段，无占位数据。
 * 与展示层解耦以便单测覆盖。
 */
import type {
  AgentInfo,
  ApiAuditRecord,
  ModelsConfig,
  SkillMeta,
} from '../../api/client';

export interface NamedCount { name: string; value: number }

/** 按 keyFn 聚合计数并按数量降序返回。 */
export function countBy<T>(items: T[], keyFn: (item: T) => string): NamedCount[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = keyFn(item) || '未分类';
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

/** 截断过长标签（业务域/分类可由用户任意输入，避免图表轴被单条数据撑爆）。 */
export function truncateLabel(name: string, max = 18): string {
  const chars = Array.from(name);
  return chars.length <= max ? name : `${chars.slice(0, max).join('')}…`;
}

/** 取前 n 项，其余合并为「其他」，保证图表可读。 */
export function topN(items: NamedCount[], n: number, otherLabel = '其他'): NamedCount[] {
  if (items.length <= n) return items;
  const head = items.slice(0, n);
  const rest = items.slice(n).reduce((sum, item) => sum + item.value, 0);
  return rest > 0 ? [...head, { name: otherLabel, value: rest }] : head;
}

export interface AgentSummary {
  total: number;
  enabled: number;
  published: number;
  withKnowledge: number;
  withSkills: number;
  byDomain: NamedCount[];
}

export function summarizeAgents(agents: AgentInfo[]): AgentSummary {
  return {
    total: agents.length,
    enabled: agents.filter((a) => a.enabled).length,
    published: agents.filter((a) => a.published).length,
    withKnowledge: agents.filter((a) => (a.knowledge_pack_ids?.length ?? 0) > 0).length,
    withSkills: agents.filter((a) => (a.skills?.length ?? 0) > 0).length,
    byDomain: countBy(agents, (a) => a.business_domain || a.name || '未分类'),
  };
}

export interface SkillSummary {
  total: number;
  byCategory: NamedCount[];
  bySecurity: NamedCount[];
  verified: number;
  unsigned: number;
  untrusted: number;
}

export function summarizeSkills(skills: SkillMeta[]): SkillSummary {
  const status = (s: SkillMeta) => s.signature_status ?? 'unsigned';
  return {
    total: skills.length,
    byCategory: countBy(skills, (s) => s.category),
    bySecurity: countBy(skills, (s) => s.security_level),
    verified: skills.filter((s) => status(s) === 'verified').length,
    unsigned: skills.filter((s) => status(s) === 'unsigned').length,
    untrusted: skills.filter((s) => status(s) === 'invalid' || status(s) === 'no_trust_anchor').length,
  };
}

export interface ModelSummary {
  providerTotal: number;
  providerEnabled: number;
  providerKeyed: number;
  resourceTotal: number;
  resourceEnabled: number;
  byModality: NamedCount[];
  embeddingDimensions: number[];
}

export function summarizeModels(models?: ModelsConfig | null): ModelSummary {
  const providers = models?.providers ?? [];
  const resources = models?.resources ?? [];
  const modalities: NamedCount[] = countBy(
    resources.flatMap((r) => (r.modalities?.length ? r.modalities : ['chat'])),
    (m) => m,
  );
  return {
    providerTotal: providers.length,
    providerEnabled: providers.filter((p) => p.enabled !== false).length,
    providerKeyed: providers.filter((p) => p.api_key_configured).length,
    resourceTotal: resources.length,
    resourceEnabled: resources.filter((r) => r.enabled !== false).length,
    byModality: modalities,
    embeddingDimensions: Array.from(
      new Set(
        resources
          .filter((r) => r.modalities?.includes('embedding') && r.dimension)
          .map((r) => r.dimension as number),
      ),
    ).sort((a, b) => a - b),
  };
}

export interface AuditSummary {
  total: number;
  success: number;
  failure: number;
  successRate: number | null;
  avgLatencyMs: number | null;
  byEndpoint: NamedCount[];
}

export function summarizeAudit(records: ApiAuditRecord[]): AuditSummary {
  const total = records.length;
  const success = records.filter((r) => r.status >= 200 && r.status < 400).length;
  const latencies = records.map((r) => r.latency_ms).filter((v): v is number => typeof v === 'number');
  return {
    total,
    success,
    failure: total - success,
    successRate: total > 0 ? success / total : null,
    avgLatencyMs: latencies.length
      ? Math.round(latencies.reduce((sum, v) => sum + v, 0) / latencies.length)
      : null,
    byEndpoint: countBy(records, (r) => r.endpoint),
  };
}

/** 大数千分位；null/undefined 显示占位符。 */
export function formatCount(value?: number | null, fallback = '—'): string {
  return value == null ? fallback : value.toLocaleString('zh-CN');
}

export function formatBytes(bytes?: number | null): string {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function formatPercent(ratio?: number | null, digits = 1): string {
  return ratio == null ? '—' : `${(ratio * 100).toFixed(digits)}%`;
}

/** 相对时间（用于「最近更新 x 秒前」）。 */
export function formatRelativeTime(iso?: string | null, now = Date.now()): string {
  if (!iso) return '—';
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return iso;
  const diff = Math.max(0, Math.round((now - ts) / 1000));
  if (diff < 60) return `${diff} 秒前`;
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  return `${Math.floor(diff / 86400)} 天前`;
}
