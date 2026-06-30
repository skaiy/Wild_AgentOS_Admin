/**
 * 运行期配置存储（localStorage 持久化）。
 * 负责：后端 Base URL 与「外部 LLM 网关」的开放可配置项。
 * LLM 网关字段与后端 GatewaySettings 对齐：base_url / api_key / default_model /
 * timeout_seconds / max_retries / model_mapping。
 */

export interface GatewayConfig {
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
  timeoutSeconds: number;
  maxRetries: number;
  modelMapping: Record<string, string>;
}

export interface RuntimeConfig {
  /** 后端 HTTP Base URL，留空则走 Vite 代理（相对路径）。 */
  backendBaseUrl: string;
  gateway: GatewayConfig;
}

const STORAGE_KEY = 'agentos.runtime.config';

const ENV_BACKEND =
  (import.meta as any)?.env?.VITE_BACKEND_URL?.toString?.() ?? '';

export const DEFAULT_CONFIG: RuntimeConfig = {
  backendBaseUrl: ENV_BACKEND,
  gateway: {
    baseUrl: '',
    apiKey: '',
    defaultModel: '',
    timeoutSeconds: 60,
    maxRetries: 3,
    modelMapping: {},
  },
};

function deepMerge<T>(base: T, patch: Partial<T>): T {
  const out: any = Array.isArray(base) ? [...(base as any)] : { ...base };
  for (const k of Object.keys(patch || {})) {
    const v: any = (patch as any)[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = deepMerge((base as any)[k] ?? {}, v);
    } else if (v !== undefined) {
      out[k] = v;
    }
  }
  return out as T;
}

export function loadConfig(): RuntimeConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return deepMerge(DEFAULT_CONFIG, JSON.parse(raw));
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(cfg: RuntimeConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    window.dispatchEvent(new CustomEvent('agentos:config-changed', { detail: cfg }));
  } catch {
    /* ignore quota errors */
  }
}

export function getBackendBase(): string {
  return (loadConfig().backendBaseUrl || '').replace(/\/$/, '');
}

/** 生成可直接落地到后端的 .env 片段（外部 LLM 接口保持开放可配置）。 */
export function toEnvSnippet(g: GatewayConfig): string {
  return [
    `AGENT_OS_GATEWAY_BASE_URL=${g.baseUrl}`,
    `AGENT_OS_GATEWAY_API_KEY=${g.apiKey || 'sk-xxx'}`,
    `AGENT_OS_GATEWAY_DEFAULT_MODEL=${g.defaultModel}`,
  ].join('\n');
}

/** 生成 config.yaml 的 gateway 段落。 */
export function toYamlSnippet(g: GatewayConfig): string {
  const lines: string[] = [
    'gateway:',
    `  base_url: "${g.baseUrl}"`,
    `  api_key: "${g.apiKey || '${DEEPSEEK_API_KEY}'}"`,
    `  default_model: "${g.defaultModel}"`,
    `  timeout_seconds: ${g.timeoutSeconds}`,
    `  max_retries: ${g.maxRetries}`,
    '  model_mapping:',
  ];
  for (const [k, v] of Object.entries(g.modelMapping)) {
    lines.push(`    ${k}: "${v}"`);
  }
  return lines.join('\n');
}
