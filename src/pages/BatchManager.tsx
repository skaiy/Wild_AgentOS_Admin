import { useEffect, useState } from 'react';
import { Layers3, RefreshCw, Play, Square, Activity, Cpu } from 'lucide-react';
import { api, type BatchAgentRow, type BatchAgentStatus } from '../api/client';

/** 平台运维态：批处理 Agent 运维台（启停 / 窗口 / 指标）。 */
function statusText(s: BatchAgentStatus | null): string {
  if (!s) return '—';
  if (typeof s === 'string') return s;
  return `Error: ${s.Error}`;
}
function statusStyle(s: BatchAgentStatus | null): string {
  if (s === 'Running') return 'bg-emerald-50 text-emerald-700';
  if (s === 'Paused') return 'bg-amber-50 text-amber-700';
  if (s === 'Stopped') return 'bg-gray-100 text-gray-500';
  if (s === 'Registered') return 'bg-blue-50 text-blue-700';
  return 'bg-red-50 text-red-700';
}

export default function BatchManager() {
  const [data, setData] = useState<{ running: boolean; agents: BatchAgentRow[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const r = await api.listBatchAgents();
      setData({ running: r.running, agents: r.agents });
    } catch (e: any) { setError(e?.message ?? String(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const control = async (name: string, action: 'start' | 'stop') => {
    setBusy(name);
    try { await api.controlBatchAgent(name, action); await load(); }
    catch (e: any) { setError(e?.message ?? String(e)); }
    finally { setBusy(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">批处理运维台 (Batch Agents)</h1>
          <p className="text-sm text-gray-500 mt-1">平台运维态 · 滑动窗口事件处理，按 name + business_domain 组织</p>
        </div>
        {data && (
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${data.running ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
            系统 {data.running ? '运行中' : '未运行'}
          </span>
        )}
        <button onClick={load} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> 刷新
        </button>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</div>}

      {(!data || data.agents.length === 0) && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center text-gray-400">
          {loading ? '加载中…' : '暂无批处理 Agent（config.yaml 中未配置或未启用）'}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {data?.agents.map(a => (
          <div key={a.name} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Layers3 className="w-6 h-6" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-gray-900 truncate">{a.name}</h2>
                  <span className={`px-2 py-0.5 rounded-md text-xs ${statusStyle(a.status)}`}>{statusText(a.status)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{a.config?.description || '—'}</p>
                {a.config && (
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{a.config.business_domain}</span>
                    {a.config.model && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{a.config.model}</span>}
                    {!a.config.enabled && <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded">已禁用</span>}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1"><Activity className="w-3.5 h-3.5" /> 窗口条目</div>
                <div className="font-bold text-gray-900">{a.window?.entry_count ?? '—'}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1"><Cpu className="w-3.5 h-3.5" /> 累计抽取</div>
                <div className="font-bold text-gray-900">{a.metrics?.total_extractions ?? '—'}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">实体 / 关系</div>
                <div className="font-bold text-gray-900">{a.metrics ? `${a.metrics.total_entities_found} / ${a.metrics.total_relations_found}` : '—'}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">成功 / 失败</div>
                <div className="font-bold text-gray-900">{a.metrics ? `${a.metrics.success_count} / ${a.metrics.failure_count}` : '—'}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => control(a.name, 'start')}
                disabled={busy === a.name || a.status === 'Running'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-40"
              >
                <Play className="w-4 h-4" /> 启动
              </button>
              <button
                onClick={() => control(a.name, 'stop')}
                disabled={busy === a.name || a.status === 'Stopped'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-700 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-40"
              >
                <Square className="w-4 h-4" /> 停止
              </button>
              {busy === a.name && <span className="text-xs text-gray-400">处理中…</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
