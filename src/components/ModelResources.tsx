import { useEffect, useState } from 'react';
import { Plus, Trash2, Save, RefreshCw, AlertTriangle, Server, Zap, Download, CheckCircle2 } from 'lucide-react';
import { api, type ProviderInfo, type ModelResourceInfo, type ModelTestResult } from '../api/client';
import { useRuntimeConfig } from '../api/hooks';
import LiveBadge from './LiveBadge';
import GatewayRoutingSection from './registry/GatewayRoutingSection';
import EmbeddingAdvancedSection from './registry/EmbeddingAdvancedSection';

/** provider 编辑态：额外携带待写入的明文 api_key（留空表示不修改）。 */
type ProviderEdit = ProviderInfo & { api_key?: string };

const MODALITIES = ['chat', 'vision', 'embedding', 'audio_asr', 'audio_tts', 'realtime'];
/** 型号内页模态子 Tab：按能力过滤，并决定「新增型号」预置的模态。 */
const MODALITY_TABS: { id: string; label: string; match: (m: string[]) => boolean; add: string[] }[] = [
  { id: 'chat', label: '文本', match: (m) => m.includes('chat'), add: ['chat'] },
  { id: 'vision', label: '多模态(VL)', match: (m) => m.includes('vision'), add: ['chat', 'vision'] },
  { id: 'embedding', label: '向量', match: (m) => m.includes('embedding'), add: ['embedding'] },
  { id: 'audio', label: '语音', match: (m) => m.includes('audio_asr') || m.includes('audio_tts'), add: ['audio_asr'] },
  { id: 'realtime', label: '实时', match: (m) => m.includes('realtime'), add: ['realtime'] },
];
const genId = (p: string) =>
  `${p}-${(crypto.randomUUID?.() || Math.random().toString(36).slice(2)).slice(0, 8)}`;

/** 按型号名关键词预判模态（/v1/models 不返回模态）；结果允许人工修改。 */
function predictModality(id: string): string {
  const s = id.toLowerCase();
  if (/(embed|bge|gte|m3e|text-embedding)/.test(s)) return 'embedding';
  if (/realtime/.test(s)) return 'realtime';
  if (/(tts|speech|voice)/.test(s)) return 'audio_tts';
  if (/(asr|whisper|audio)/.test(s)) return 'audio_asr';
  if (/(-vl|vl-|vision|multimodal|omni|image)/.test(s)) return 'vision';
  return 'chat';
}

export default function ModelResources() {
  const backend = useRuntimeConfig();
  const [providers, setProviders] = useState<ProviderEdit[]>([]);
  const [resources, setResources] = useState<ModelResourceInfo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [tests, setTests] = useState<Record<string, ModelTestResult & { pending?: boolean }>>({});
  const [modalityTab, setModalityTab] = useState('chat');
  const [fetchingPid, setFetchingPid] = useState<string | null>(null);
  const [picker, setPicker] = useState<{ pid: string; items: { id: string; modality: string; checked: boolean }[]; msg?: string } | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  // 首次拿到后端快照后载入本地编辑态（provider 不含明文 key，仅 api_key_configured）。
  useEffect(() => {
    const m = backend.data?.models;
    if (!m || loaded) return;
    setProviders(m.providers.map((p) => ({ ...p, api_key: '' })));
    setResources(m.resources.map((r) => ({ ...r })));
    setLoaded(true);
  }, [backend.data, loaded]);

  const reload = () => { setLoaded(false); setMsg(null); setTests({}); setPicker(null); backend.refresh(); };

  const addProvider = () =>
    setProviders((ps) => [
      ...ps,
      { id: genId('prov'), name: '', base_url: '', kind: 'openai_compatible', enabled: true, timeout_seconds: 60, api_key: '' },
    ]);
  const updProvider = (i: number, patch: Partial<ProviderEdit>) =>
    setProviders((ps) => ps.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const delProvider = (i: number) => setProviders((ps) => ps.filter((_, idx) => idx !== i));

  // 型号按 id 操作（列表按模态过滤后索引不稳定）。
  const addResource = (mods: string[]) =>
    setResources((rs) => [
      ...rs,
      { id: genId('res'), name: '', provider_id: providers[0]?.id || '', model: '', modalities: [...mods], enabled: true, supports_tools: false, supports_reasoning: false, supports_vision: mods.includes('vision'), dimension: mods.includes('embedding') ? 1024 : undefined },
    ]);
  const updResource = (id: string, patch: Partial<ModelResourceInfo>) =>
    setResources((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const delResource = (id: string) => setResources((rs) => rs.filter((r) => r.id !== id));
  const toggleModality = (id: string, mod: string) =>
    setResources((rs) =>
      rs.map((r) => {
        if (r.id !== id) return r;
        const cur = r.modalities || [];
        const next = cur.includes(mod) ? cur.filter((x) => x !== mod) : [...cur, mod];
        return { ...r, modalities: next, supports_vision: next.includes('vision') };
      }),
    );

  const save = async (): Promise<boolean> => {
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
      return true;
    } catch (e: any) {
      setMsg(`❌ ${e?.message ?? String(e)}`);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const runTest = async (r: ModelResourceInfo) => {
    const modality = r.modalities?.[0] || 'chat';
    setTests((t) => ({ ...t, [r.id]: { ok: false, http_status: 0, latency_ms: 0, pending: true } }));
    // 连通性测试读取「已持久化」注册表；先保存本地编辑态，避免未保存型号误报「provider 未找到」。
    const saved = await save();
    if (!saved) {
      setTests((t) => { const n = { ...t }; delete n[r.id]; return n; });
      return;
    }
    try {
      const res = await api.testModelResource({ resource_id: r.id, provider_id: r.provider_id, modality });
      setTests((t) => ({ ...t, [r.id]: res }));
    } catch (e: any) {
      setTests((t) => ({ ...t, [r.id]: { ok: false, http_status: 0, latency_ms: 0, error: e?.message ?? String(e) } }));
    }
  };

  // 自动拉取 provider 的 /v1/models（用当前编辑态的 base_url/api_key，或后端按 id 回填）。
  const fetchModels = async (p: ProviderEdit) => {
    setFetchingPid(p.id); setMsg(null);
    try {
      const res = await api.fetchProviderModels({ provider_id: p.id, base_url: p.base_url, api_key: p.api_key?.trim() || undefined });
      if (!res.ok) { setPicker({ pid: p.id, items: [], msg: `拉取失败：HTTP ${res.http_status} ${res.error ?? ''}` }); return; }
      const existing = new Set(resources.filter((r) => r.provider_id === p.id).map((r) => r.model));
      const items = res.models.filter((m) => !existing.has(m.id)).map((m) => ({ id: m.id, modality: predictModality(m.id), checked: false }));
      setPicker({ pid: p.id, items, msg: items.length ? undefined : '该 provider 下型号均已添加或无可用型号。' });
    } catch (e: any) {
      setPicker({ pid: p.id, items: [], msg: `拉取异常：${e?.message ?? String(e)}` });
    } finally {
      setFetchingPid(null);
    }
  };
  const setPickerItem = (idx: number, patch: Partial<{ modality: string; checked: boolean }>) =>
    setPicker((pk) => (pk ? { ...pk, items: pk.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) } : pk));
  const addPicked = () => {
    if (!picker) return;
    const chosen = picker.items.filter((i) => i.checked);
    if (chosen.length) {
      setResources((rs) => [
        ...rs,
        ...chosen.map((c) => ({
          id: genId('res'), name: c.id, provider_id: picker.pid, model: c.id,
          modalities: c.modality === 'vision' ? ['chat', 'vision'] : [c.modality],
          enabled: true, supports_tools: false, supports_reasoning: false,
          supports_vision: c.modality === 'vision',
          dimension: c.modality === 'embedding' ? 1024 : undefined,
        })),
      ]);
      setMsg(`✅ 已从型号列表添加 ${chosen.length} 个型号（记得点「保存并生效」）`);
    }
    setPicker(null);
  };

  // 将某向量型号桥接为生效向量：先保存注册表（确保 provider key 持久化）→ 激活 → 触发重建。
  const activateVector = async (r: ModelResourceInfo) => {
    if (!r.dimension) { setMsg('❌ 请先为该向量型号填写维度(dimension)'); return; }
    setActivatingId(r.id); setMsg(null);
    try {
      await save();
      const res = await api.activateEmbedding(r.id);
      setLoaded(false);
      await backend.refresh();
      setMsg(`✅ ${res.message ?? '已设为生效向量'}`);
    } catch (e: any) {
      setMsg(`❌ ${e?.message ?? String(e)}`);
    } finally {
      setActivatingId(null);
    }
  };

  const providerName = (id: string) => providers.find((p) => p.id === id)?.name || id;
  const emb = backend.data?.embedding;
  const isActiveVector = (r: ModelResourceInfo) =>
    !!emb?.enabled && emb.provider === 'oneapi' && !!r.model && emb.oneapi?.model === r.model;
  const activeTab = MODALITY_TABS.find((t) => t.id === modalityTab) ?? MODALITY_TABS[0];
  const shownResources = resources.filter((r) => activeTab.match(r.modalities || []));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-gray-900">模型注册中心</h2>
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
          统一管理外部 API <strong>Provider</strong> 与其下 <strong>型号</strong>（按模态分 Tab：文本 / 多模态 / 向量 / 语音 / 实时）。
          可对 Provider <strong>自动拉取型号</strong>；<strong>向量</strong> Tab 可将某型号「<strong>设为生效向量</strong>」桥接为 Embedding 服务。
          保存<strong>免重启即时生效</strong>；api_key 留空表示<strong>不修改</strong>，提交后不回显明文。
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
          <div key={p.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center gap-2 md:col-span-2">
                <input className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="显示名（如 阿里云百炼）"
                  value={p.name || ''} onChange={(e) => updProvider(i, { name: e.target.value })} />
                <label className="flex items-center gap-1.5 text-xs text-gray-600 whitespace-nowrap">
                  <input type="checkbox" checked={p.enabled ?? true} onChange={(e) => updProvider(i, { enabled: e.target.checked })} /> 启用
                </label>
                <button onClick={() => fetchModels(p)} disabled={fetchingPid === p.id || !backend.live}
                  className="border border-gray-300 text-gray-600 px-2.5 py-1.5 rounded-lg text-xs hover:bg-gray-50 flex items-center gap-1 disabled:opacity-40 whitespace-nowrap" title="调用 /v1/models 拉取型号">
                  <Download className="w-3.5 h-3.5" /> {fetchingPid === p.id ? '拉取中…' : '拉取型号'}
                </button>
                <button onClick={() => delProvider(i)} className="text-red-500 hover:text-red-600 p-1" title="删除"><Trash2 className="w-4 h-4" /></button>
              </div>
              <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="base_url（含/不含 /v1 均可，如 https://api.xxx.com 或 https://api.xxx.com/v1）"
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

            {/* 拉取型号选择器 */}
            {picker?.pid === p.id && (
              <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-3 space-y-2">
                {picker.msg && <p className="text-xs text-gray-600">{picker.msg}</p>}
                {picker.items.length > 0 && (
                  <>
                    <p className="text-xs text-gray-500">勾选要添加的型号（模态已按名称预判，可改）：</p>
                    <div className="max-h-56 overflow-auto space-y-1.5">
                      {picker.items.map((it, idx) => (
                        <div key={it.id} className="flex items-center gap-2 text-xs">
                          <input type="checkbox" checked={it.checked} onChange={(e) => setPickerItem(idx, { checked: e.target.checked })} />
                          <span className="font-mono flex-1 truncate" title={it.id}>{it.id}</span>
                          <select className="border border-gray-300 rounded px-1.5 py-1" value={it.modality} onChange={(e) => setPickerItem(idx, { modality: e.target.value })}>
                            {MODALITIES.map((m) => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={addPicked} className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs hover:bg-blue-700 flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5" /> 添加所选
                      </button>
                      <button onClick={() => setPicker(null)} className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded text-xs hover:bg-gray-50">取消</button>
                    </div>
                  </>
                )}
                {picker.items.length === 0 && (
                  <button onClick={() => setPicker(null)} className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded text-xs hover:bg-gray-50">关闭</button>
                )}
              </div>
            )}
          </div>
        ))}
      </section>

      {/* ── 型号（按模态子 Tab）── */}
      <section className="space-y-3">
        <div className="flex items-center gap-1.5 border-b border-gray-200">
          {MODALITY_TABS.map((tab) => {
            const count = resources.filter((r) => tab.match(r.modalities || [])).length;
            return (
              <button key={tab.id} onClick={() => setModalityTab(tab.id)}
                className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${modalityTab === tab.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {tab.label}{count > 0 && <span className="ml-1 text-xs text-gray-400">({count})</span>}
              </button>
            );
          })}
          <button onClick={() => addResource(activeTab.add)} disabled={providers.length === 0}
            className="ml-auto text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 disabled:opacity-40 pb-1">
            <Plus className="w-4 h-4" /> 新增{activeTab.label}型号
          </button>
        </div>

        {modalityTab === 'embedding' && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-xs text-indigo-800">
            当前生效向量：{emb?.enabled && emb.provider === 'oneapi'
              ? <><strong>{emb.oneapi?.model || '—'}</strong>（维度 {emb.active_dimension}）</>
              : <>非注册表桥接（provider=<strong>{emb?.provider ?? '—'}</strong>，维度 {emb?.active_dimension ?? '—'}）</>}
            ；点某型号「设为生效向量」将热切换并<strong>自动重建所有向量库索引</strong>。
          </div>
        )}

        {shownResources.length === 0 && (
          <p className="text-sm text-gray-400">
            {providers.length === 0 ? '暂无 Provider。先新增 Provider，再在此挂型号。' : `暂无「${activeTab.label}」型号，点右上「新增${activeTab.label}型号」或对 Provider「拉取型号」。`}
          </p>
        )}
        {shownResources.map((r) => {
          const t = tests[r.id];
          const isVec = (r.modalities || []).includes('embedding');
          const active = isActiveVector(r);
          return (
            <div key={r.id} className={`border rounded-lg p-4 space-y-3 ${active ? 'border-emerald-300 bg-emerald-50/30' : 'border-gray-200'}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="显示名（如 通义千问-VL-Max）"
                  value={r.name || ''} onChange={(e) => updResource(r.id, { name: e.target.value })} />
                <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={r.provider_id}
                  onChange={(e) => updResource(r.id, { provider_id: e.target.value })}>
                  <option value="">选择 Provider…</option>
                  {providers.map((p) => <option key={p.id} value={p.id}>{p.name || p.id}</option>)}
                </select>
                <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="真实型号名 model（如 qwen-vl-max）"
                  value={r.model} onChange={(e) => updResource(r.id, { model: e.target.value })} />
                {isVec ? (
                  <input type="number" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="dimension（向量维度，必填）"
                    value={r.dimension ?? ''} onChange={(e) => updResource(r.id, { dimension: e.target.value ? Number(e.target.value) : null })} />
                ) : (
                  <input type="number" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="context_window（可选）"
                    value={r.context_window ?? ''} onChange={(e) => updResource(r.id, { context_window: e.target.value ? Number(e.target.value) : null })} />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-600">
                <span className="font-medium text-gray-500">模态:</span>
                {MODALITIES.map((mod) => (
                  <label key={mod} className="flex items-center gap-1">
                    <input type="checkbox" checked={r.modalities?.includes(mod) ?? false} onChange={() => toggleModality(r.id, mod)} /> {mod}
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-600">
                <label className="flex items-center gap-1"><input type="checkbox" checked={r.enabled ?? true} onChange={(e) => updResource(r.id, { enabled: e.target.checked })} /> 启用</label>
                <label className="flex items-center gap-1"><input type="checkbox" checked={r.supports_tools ?? false} onChange={(e) => updResource(r.id, { supports_tools: e.target.checked })} /> 工具</label>
                <label className="flex items-center gap-1"><input type="checkbox" checked={r.supports_reasoning ?? false} onChange={(e) => updResource(r.id, { supports_reasoning: e.target.checked })} /> 推理</label>
                <div className="ml-auto flex items-center gap-2">
                  {active && <span className="px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> 生效中</span>}
                  {t && !t.pending && (
                    <span className={`px-2 py-0.5 rounded text-xs ${t.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {t.ok ? `✅ ${t.http_status} · ${t.latency_ms}ms${t.dimension ? ` · dim=${t.dimension}` : ''}` : `❌ ${t.error || `HTTP ${t.http_status}`}`}
                    </span>
                  )}
                  {isVec && !active && (
                    <button onClick={() => activateVector(r)} disabled={activatingId === r.id || !backend.live}
                      className="border border-indigo-300 text-indigo-700 px-2.5 py-1 rounded text-xs hover:bg-indigo-50 flex items-center gap-1 disabled:opacity-40">
                      {activatingId === r.id ? '生效中…' : '设为生效向量'}
                    </button>
                  )}
                  <button onClick={() => runTest(r)} disabled={t?.pending}
                    className="border border-gray-300 text-gray-600 px-2.5 py-1 rounded text-xs hover:bg-gray-50 flex items-center gap-1 disabled:opacity-40">
                    <Zap className="w-3.5 h-3.5" /> {t?.pending ? '测试中…' : '连通性测试'}
                  </button>
                  <button onClick={() => delResource(r.id)} className="text-red-500 hover:text-red-600 p-1" title="删除"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <p className="text-[11px] text-gray-400">Provider: {providerName(r.provider_id)}</p>
            </div>
          );
        })}

        {modalityTab === 'embedding' && <EmbeddingAdvancedSection backend={backend} />}
      </section>

      {/* ── 路由 / 默认（兜底网关）── */}
      <GatewayRoutingSection backend={backend} />
    </div>
  );
}
