/**
 * 轻量数据获取 Hooks：统一 loading / error / 轮询 / 后端在线状态。
 * 所有页面在后端不可用时回退到各自的占位内容（live=false）。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  api,
  type AgentsResponse,
  type GuardStats,
  type HealthResponse,
  type KbCategoriesResponse,
  type KnowledgeBasesResponse,
  type McpServersResponse,
  type MetricsResponse,
  type PromptVersionsResponse,
  type RuntimeConfigInfo,
  type SkillsResponse,
} from './client';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** 是否成功从后端拿到过数据（用于「实时 / 占位」标识）。 */
  live: boolean;
  refresh: () => void;
}

export function useAsync<T>(
  fetcher: () => Promise<T>,
  opts: { pollMs?: number; deps?: unknown[] } = {},
): AsyncState<T> {
  const { pollMs, deps = [] } = opts;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const mounted = useRef(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(async () => {
    try {
      const res = await fetcherRef.current();
      if (!mounted.current) return;
      setData(res);
      setLive(true);
      setError(null);
    } catch (err: any) {
      if (!mounted.current) return;
      setError(err?.message ?? String(err));
      setLive(false);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    run();
    let timer: ReturnType<typeof setInterval> | undefined;
    if (pollMs) timer = setInterval(run, pollMs);
    const onCfg = () => run();
    window.addEventListener('agentos:config-changed', onCfg);
    return () => {
      mounted.current = false;
      if (timer) clearInterval(timer);
      window.removeEventListener('agentos:config-changed', onCfg);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, pollMs, ...deps]);

  return { data, loading, error, live, refresh: run };
}

// ---------- 业务专用 Hooks（对齐后端各端点） ----------
export const useHealth = () =>
  useAsync<HealthResponse>(() => api.health(), { pollMs: 10_000 });

export const useMetrics = () =>
  useAsync<MetricsResponse>(() => api.metrics(), { pollMs: 5_000 });

export const useSkills = () =>
  useAsync<SkillsResponse>(() => api.skills(), { pollMs: 30_000 });

export const useGuardStats = () =>
  useAsync<GuardStats>(() => api.guardStats(), { pollMs: 8_000 });

export const useGuardAudit = () =>
  useAsync(() => api.guardAudit(), { pollMs: 8_000 });

export const useRuntimeConfig = () =>
  useAsync<RuntimeConfigInfo>(() => api.config(), { pollMs: 30_000 });

export const useAgents = () =>
  useAsync<AgentsResponse>(() => api.listAgents(), { pollMs: 60_000 });

export const useMcpServers = () =>
  useAsync<McpServersResponse>(() => api.listMcpServers(), { pollMs: 30_000 });

export const usePrompts = () =>
  useAsync<PromptVersionsResponse>(() => api.listPrompts(), { pollMs: 30_000 });

export const useKbCategories = () =>
  useAsync<KbCategoriesResponse>(() => api.listKbCategories(), { pollMs: 30_000 });

export const useKnowledgeBases = () =>
  useAsync<KnowledgeBasesResponse>(() => api.listKnowledgeBases(), { pollMs: 30_000 });
