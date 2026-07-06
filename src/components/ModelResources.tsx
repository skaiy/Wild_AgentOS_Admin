import { useEffect, useState } from 'react';
import { Plus, Trash2, Save, RefreshCw, AlertTriangle, Server, Boxes, Zap } from 'lucide-react';
import { api, type ProviderInfo, type ModelResourceInfo, type ModelTestResult } from '../api/client';
import { useRuntimeConfig } from '../api/hooks';
import LiveBadge from './LiveBadge';

/** provider 编辑态：额外携带待写入的明文 api_key（留空表示不修改）。 */
type ProviderEdit = ProviderInfo & { api_key?: string };

const MODALITIES = ['chat', 'vision', 'embedding', 'audio_asr', 'audio_tts', 'realtime'];
const genId = (p: string) =>
  `${p}-${(crypto.randomUUID?.() || Math.random().toString(36).slice(2)).slice(0, 8)}`;

export default function ModelResources() {
  const backend = useRuntimeConfig();
  const [providers, setProviders] = useState<ProviderEdit[]>([]);
  const [resources, setResources] = useState<ModelResourceInfo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [tests, setTests] = useState<Record<string, ModelTestResult & { pending?: boolean }>>({});

  // 首次拿到后端快照后载入本地编辑态（provider 不含明文 key，仅 api_key_configured）。
  useEffect(() => {
    const m = backend.data?.models;
    if (!m || loaded) return;
    setProviders(m.providers.map((p) => ({ ...p, api_key: '' })));
    setResources(m.resources.map((r) => ({ ...r })));
    setLoaded(true);
  }, [backend.data, loaded]);

  const reload = () => { setLoaded(false); setMsg(null); setTests({}); backend.refresh(); };

  const addProvider = () =>
    setProviders((ps) => [
      ...ps,
      { id: genId('prov'), name: '', base_url: '', kind: 'openai_compatible', enabled: true, timeout_seconds: 60, api_key: '' },
    ]);
  const updProvider = (i: number, patch: Partial<ProviderEdit>) =>
    setProviders((ps) => ps.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const delProvider = (i: number) => setProviders((ps) => ps.filter((_, idx) => idx !== i));

  const addResource = () =>
    setResources((rs) => [
      ...rs,
      { id: genId('res'), name: '', provider_id: providers[0]?.id || '', model: '', modalities: ['chat'], enabled: true, supports_tools: false, supports_reasoning: false, supports_vision: false },
    ]);
  const updResource = (i: number, patch: Partial<ModelResourceInfo>) =>
    setResources((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const delResource = (i: number) => setResources((rs) => rs.filter((_, idx) => idx !== i));
  const toggleModality = (i: number, mod: string) =>
    setResources((rs) =>
      rs.map((r, idx) => {
        if (idx !== i) return r;
        const cur = r.modalities || [];
        const next = cur.includes(mod) ? cur.filter((x) => x !== mod) : [...cur, mod];
        return { ...r, modalities: next, supports_vision: next.includes('vision') };
      }),
    );

  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      // api_key 留空的 provider 剔除该字段，交由后端按 id 回填旧值（避免误清空）。
      const outProviders = providers.map((p) => {
        const { api_key, api_key_configured, ...rest } = p;
        return api_key && api_key.trim() ? { ...rest, api_key: api_key.trim() } : rest;
      });
      await api.updateConfig({ models: { providers: outProviders, resources } });
      setLoaded(false);
      await backend.refresh();
      setMsg('✅ 已保存并热更新（免重启即时生效）');
    } catch (e: any) {
      setMsg(`❌ ${e?.message ?? String(e)}`);
    } finally {
      setSaving(false);
    }
  };

  const runTest = async (r: ModelResourceInfo) => {
    const modality = r.modalities?.[0] || 'chat';
    setTests((t) => ({ ...t, [r.id]: { ok: false, http_status: 0, latency_ms: 0, pending: true } }));
    try {
      const res = await api.testModelResource({ resource_id: r.id, provider_id: r.provider_id, modality });
      setTests((t) => ({ ...t, [r.id]: res }));
    } catch (e: any) {
      setTests((t) => ({ ...t, [r.id]: { ok: false, http_status: 0, latency_ms: 0, error: e?.message ?? String(e) } }));
    }
  };

  const providerName = (id: string) => providers.find((p) => p.id === id)?.name || id;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-gray-900">模型资源注册表</h2>
          <LiveBadge live={backend.live} loading={backend.loading} error={backend.error} />
        </div>
        <div className="flex items-center gap-2">
          {backend.live && (
            <button onClick={reload}
              className="border border-gray-300 text-gray-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> 从后端刷新
            </button>
          )}
          <button onClick={save} disabled={saving || !backend.live}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 flex items-center gap-2">
            <Save className="w-4 h-4" /> {saving ? '保存中…' : '保存并生效'}
          </button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          配置多个外部 API <strong>Provider</strong> 与其下 <strong>型号(Resource)</strong>，Agent 可按能力槽（chat/vision）挂载不同型号。
          保存<strong>免重启即时生效</strong>；api_key 留空表示<strong>不修改</strong>（沿用已保存值），提交后不回显明文。
        </span>
      </div>

      {msg && (
        <div className={`text-sm rounded-lg px-3 py-2 ${msg.startsWith('✅') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{msg}</div>
      )}

      {/* ── Providers ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2"><Server className="w-4 h-4 text-blue-600" /> Providers（外部 API 接入点）</h3>
          <button onClick={addProvider} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
            <Plus className="w-4 h-4" /> 新增 Provider
          </button>
        </div>
        {providers.length === 0 && <p className="text-sm text-gray-400">暂无 Provider，点击“新增 Provider”开始。</p>}
        {providers.map((p, i) => (
          <div key={p.id} className="border border-gray-200 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-2 md:col-span-2">
              <input className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="显示名（如 阿里云百炼）"
                value={p.name || ''} onChange={(e) => updProvider(i, { name: e.target.value })} />
              <label className="flex items-center gap-1.5 text-xs text-gray-600 whitespace-nowrap">
                <input type="checkbox" checked={p.enabled ?? true} onChange={(e) => updProvider(i, { enabled: e.target.checked })} /> 启用
              </label>
              <button onClick={() => delProvider(i)} className="text-red-500 hover:text-red-600 p-1" title="删除"><Trash2 className="w-4 h-4" /></button>
            </div>
            <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="base_url（如 https://dashscope.aliyuncs.com/compatible-mode）"
              value={p.base_url} onChange={(e) => updProvider(i, { base_url: e.target.value })} />
            <input type="password" className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder={p.api_key_configured ? '（已配置，留空则不修改）' : 'api_key'}
              value={p.api_key || ''} onChange={(e) => updProvider(i, { api_key: e.target.value })} />
            <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={p.kind || 'openai_compatible'}
              onChange={(e) => updProvider(i, { kind: e.target.value })}>
              <option value="openai_compatible">openai_compatible</option>
            </select>
            <input type="number" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="timeout_seconds"
              value={p.timeout_seconds ?? 60} onChange={(e) => updProvider(i, { timeout_seconds: Number(e.target.value) || 60 })} />
          </div>
        ))}
      </section>

      {/* ── Resources ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2"><Boxes className="w-4 h-4 text-blue-600" /> Resources（型号）</h3>
          <button onClick={addResource} disabled={providers.length === 0}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 disabled:opacity-40">
            <Plus className="w-4 h-4" /> 新增型号
          </button>
        </div>
        {resources.length === 0 && <p className="text-sm text-gray-400">暂无型号。先新增 Provider，再在此挂型号。</p>}
        {resources.map((r, i) => {
          const t = tests[r.id];
          return (
            <div key={r.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="显示名（如 通义千问-VL-Max）"
                  value={r.name || ''} onChange={(e) => updResource(i, { name: e.target.value })} />
                <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={r.provider_id}
                  onChange={(e) => updResource(i, { provider_id: e.target.value })}>
                  <option value="">选择 Provider…</option>
                  {providers.map((p) => <option key={p.id} value={p.id}>{p.name || p.id}</option>)}
                </select>
                <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="真实型号名 model（如 qwen-vl-max）"
                  value={r.model} onChange={(e) => updResource(i, { model: e.target.value })} />
                <input type="number" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="context_window（可选）"
                  value={r.context_window ?? ''} onChange={(e) => updResource(i, { context_window: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-600">
                <span className="font-medium text-gray-500">模态:</span>
                {MODALITIES.map((mod) => (
                  <label key={mod} className="flex items-center gap-1">
                    <input type="checkbox" checked={r.modalities?.includes(mod) ?? false} onChange={() => toggleModality(i, mod)} /> {mod}
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-600">
                <label className="flex items-center gap-1"><input type="checkbox" checked={r.enabled ?? true} onChange={(e) => updResource(i, { enabled: e.target.checked })} /> 启用</label>
                <label className="flex items-center gap-1"><input type="checkbox" checked={r.supports_tools ?? false} onChange={(e) => updResource(i, { supports_tools: e.target.checked })} /> 工具</label>
                <label className="flex items-center gap-1"><input type="checkbox" checked={r.supports_reasoning ?? false} onChange={(e) => updResource(i, { supports_reasoning: e.target.checked })} /> 推理</label>
                <div className="ml-auto flex items-center gap-2">
                  {t && !t.pending && (
                    <span className={`px-2 py-0.5 rounded text-xs ${t.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {t.ok ? `✅ ${t.http_status} · ${t.latency_ms}ms${t.dimension ? ` · dim=${t.dimension}` : ''}` : `❌ ${t.error || `HTTP ${t.http_status}`}`}
                    </span>
                  )}
                  <button onClick={() => runTest(r)} disabled={t?.pending}
                    className="border border-gray-300 text-gray-600 px-2.5 py-1 rounded text-xs hover:bg-gray-50 flex items-center gap-1 disabled:opacity-40">
                    <Zap className="w-3.5 h-3.5" /> {t?.pending ? '测试中…' : '连通性测试'}
                  </button>
                  <button onClick={() => delResource(i)} className="text-red-500 hover:text-red-600 p-1" title="删除"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <p className="text-[11px] text-gray-400">Provider: {providerName(r.provider_id)}</p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
