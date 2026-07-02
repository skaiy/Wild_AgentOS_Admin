import { useState } from 'react';
import * as Icons from 'lucide-react';
import {
  Boxes, Network, Zap, Sigma, Package, KeyRound, ArrowRight,
  Play, Eye, X, Loader2, CheckCircle2, AlertCircle, Plus, Pencil, Trash2, Save,
} from 'lucide-react';
import { useKnowledgePacks, useOntologyTypes, useKbCategories, useKnowledgeBases } from '../api/hooks';
import { api } from '../api/client';
import type {
  ObjectType, ActionType, ActionInvokeResult,
  KnowledgePack, KnowledgePackCreatePayload, KbCategory, KnowledgeBase,
} from '../api/client';
import LiveBadge from '../components/LiveBadge';
import OntologyGraph from '../components/OntologyGraph';

/** Tailwind 色名 → 十六进制，用于动态强调色（避免 Tailwind 动态类被裁剪）。 */
const COLOR_HEX: Record<string, string> = {
  blue: '#3b82f6', indigo: '#6366f1', slate: '#64748b', violet: '#8b5cf6',
  amber: '#f59e0b', rose: '#f43f5e', orange: '#f97316', cyan: '#06b6d4',
  emerald: '#10b981', teal: '#14b8a6', lime: '#84cc16', sky: '#0ea5e9',
  zinc: '#71717a', green: '#22c55e', purple: '#a855f7',
};
const hex = (c: string) => COLOR_HEX[c] ?? '#6366f1';

const PT_LABEL: Record<string, string> = {
  string: '文本', text: '长文本', integer: '整数', number: '数值',
  boolean: '布尔', date_time: '日期时间', enum: '枚举',
};
const CARD_LABEL: Record<string, string> = {
  one_to_one: '一对一 (1:1)', one_to_many: '一对多 (1:N)',
  many_to_one: '多对一 (N:1)', many_to_many: '多对多 (N:N)',
};

/** 动态取 lucide 图标组件，缺失时回退到 Boxes。 */
function DynIcon({ name, className }: { name: string; className?: string }) {
  const C = (Icons as any)[name] ?? Boxes;
  return <C className={className} />;
}

type Tab = 'graph' | 'objects' | 'links' | 'actions' | 'functions';

export default function OntologyLayer() {
  const packs = useKnowledgePacks();
  const cats = useKbCategories();
  const bases = useKnowledgeBases();
  const ont = useOntologyTypes();
  const [tab, setTab] = useState<Tab>('graph');
  const [activeObj, setActiveObj] = useState<string | null>(null);
  const [runAction, setRunAction] = useState<ActionType | null>(null);
  const [editingPack, setEditingPack] = useState<KnowledgePack | 'new' | null>(null);
  const [packErr, setPackErr] = useState<string | null>(null);

  const catName = (id: string) => cats.data?.categories.find((c) => c.id === id)?.name ?? id;
  const baseName = (id: string) => bases.data?.bases.find((b) => b.id === id)?.name ?? id;

  const handleDeletePack = async (p: KnowledgePack) => {
    if (!window.confirm(`确认删除知识包「${p.name}」？此操作不可撤销。`)) return;
    setPackErr(null);
    try {
      await api.deleteKnowledgePack(p.id);
      packs.refresh();
    } catch (e: any) {
      setPackErr(e?.message ?? String(e));
    }
  };

  const data = ont.data;
  const objectTypes = data?.object_types ?? [];
  const linkTypes = data?.link_types ?? [];
  const actionTypes = data?.action_types ?? [];
  const functions = data?.functions ?? [];
  const objById = new Map(objectTypes.map((o) => [o.id, o]));
  const objLabel = (id: string) => objById.get(id)?.label ?? id;

  const tabs: { id: Tab; label: string; icon: any; count: number }[] = [
    { id: 'graph', label: '对象模型图', icon: Network, count: objectTypes.length },
    { id: 'objects', label: '对象类型', icon: Boxes, count: objectTypes.length },
    { id: 'links', label: '链接类型', icon: ArrowRight, count: linkTypes.length },
    { id: 'actions', label: '动作类型', icon: Zap, count: actionTypes.length },
    { id: 'functions', label: '函数', icon: Sigma, count: functions.length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ontology Layer (本体层)</h1>
          <p className="text-sm text-gray-500 mt-1">
            数字孪生元模型：语义层（对象 / 链接）+ 动力层（动作 / 函数），让知识图谱「可被业务理解、可写、可执行」
          </p>
        </div>
        <LiveBadge live={ont.live} loading={ont.loading} error={ont.error} />
      </div>

      {/* 知识包清单 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
          <Package className="w-4 h-4 text-emerald-600" />
          <h2 className="text-lg font-bold text-gray-900">知识包 (Knowledge Packs)</h2>
          <span className="text-xs text-gray-500 ml-1">关联分类 / 图库 / 向量库 · Agent 可挂载多包 · 包间隔离</span>
          <button
            onClick={() => { setPackErr(null); setEditingPack('new'); }}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" /> 新建知识包
          </button>
        </div>
        {packErr && (
          <div className="mx-4 mt-3 flex items-start gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{packErr}</span>
          </div>
        )}
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {(packs.data?.knowledge_packs ?? []).length === 0 && (
            <div className="col-span-full text-sm text-gray-400 text-center py-6">
              {packs.live ? '暂无知识包，点击右上角「新建知识包」' : '后端离线，无法加载知识包'}
            </div>
          )}
          {(packs.data?.knowledge_packs ?? []).map((p) => {
            const nCat = p.category_ids?.length ?? 0;
            const nGraph = p.graph_kb_ids?.length ?? 0;
            const nVec = p.vector_kb_ids?.length ?? 0;
            return (
            <div key={p.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: `${hex(p.color)}1a`, color: hex(p.color) }}>
                  <DynIcon name={p.icon} className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 truncate">{p.name}</h3>
                    <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">v{p.version}</span>
                    {p.builtin && <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">内置</span>}
                    <div className="ml-auto flex items-center gap-1">
                      <button onClick={() => { setPackErr(null); setEditingPack(p); }} title="编辑"
                        className="p-1 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDeletePack(p)} title="删除"
                        className="p-1 rounded text-gray-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.description}</p>
                  <div className="flex flex-wrap gap-2 mt-3 text-xs">
                    <span className="bg-sky-50 text-sky-700 px-2 py-0.5 rounded">分类 {nCat}</span>
                    <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">图库 {nGraph}</span>
                    <span className="bg-violet-50 text-violet-700 px-2 py-0.5 rounded">向量库 {nVec}</span>
                    {p.builtin && (
                      <>
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">对象 {p.stats.object_types}</span>
                        <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">链接 {p.stats.link_types}</span>
                      </>
                    )}
                  </div>
                  {(nCat + nGraph + nVec) > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(p.category_ids ?? []).map((id) => <span key={`c${id}`} className="text-[10px] bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded">{catName(id)}</span>)}
                      {(p.graph_kb_ids ?? []).map((id) => <span key={`g${id}`} className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded">📊 {baseName(id)}</span>)}
                      {(p.vector_kb_ids ?? []).map((id) => <span key={`v${id}`} className="text-[10px] bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded">🔢 {baseName(id)}</span>)}
                    </div>
                  )}
                  {(p.named_graph || p.vector_namespace) && (
                    <div className="mt-3 space-y-1 text-[11px] font-mono text-gray-400">
                      {p.named_graph && <div className="truncate" title={p.named_graph}>📊 {p.named_graph}</div>}
                      {p.vector_namespace && <div className="truncate" title={p.vector_namespace}>🔢 {p.vector_namespace}</div>}
                    </div>
                  )}
                </div>
              </div>
            </div>
            );
          })}
        </div>
      </div>

      {/* 本体元模型：Tab 切换 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex flex-wrap gap-2">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" /> {t.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>{t.count}</span>
              </button>
            );
          })}
        </div>

        <div className="p-4">
          {!ont.live && (
            <div className="text-sm text-gray-400 text-center py-10">后端离线，无法加载本体定义</div>
          )}

          {/* 对象模型力导向图 */}
          {ont.live && tab === 'graph' && (
            <div className="border border-gray-100 rounded-xl overflow-hidden bg-gray-50/40">
              <OntologyGraph objectTypes={objectTypes} linkTypes={linkTypes} height={580} />
            </div>
          )}

          {ont.live && tab === 'objects' && (
            <ObjectsView objectTypes={objectTypes} activeObj={activeObj} setActiveObj={setActiveObj} />
          )}

          {/* 链接类型 */}
          {ont.live && tab === 'links' && (
            <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
              {linkTypes.map((l) => (
                <div key={l.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                  <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">{objLabel(l.source)}</span>
                  <div className="flex flex-col items-center min-w-[110px]">
                    <span className="text-xs font-medium text-purple-600">{l.label}</span>
                    <div className="flex items-center w-full">
                      <div className="h-px bg-gray-300 flex-1" />
                      <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                    <span className="text-[10px] text-gray-400">{CARD_LABEL[l.cardinality] ?? l.cardinality}</span>
                  </div>
                  <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium">{objLabel(l.target)}</span>
                  <span className="text-xs text-gray-400 ml-auto truncate max-w-[40%]" title={l.description}>{l.description}</span>
                </div>
              ))}
            </div>
          )}

          {/* 动作类型（动力层） */}
          {ont.live && tab === 'actions' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {actionTypes.map((a) => (
                <div key={a.id} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-amber-50 text-amber-600 shrink-0">
                      <DynIcon name={a.icon} className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900">{a.label}</h3>
                        <span className="text-[11px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">作用于 {objLabel(a.applies_to)}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{a.description}</p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2 text-xs">
                    <div>
                      <span className="text-gray-400">参数：</span>
                      <span className="inline-flex flex-wrap gap-1 align-middle">
                        {a.parameters.map((p) => (
                          <span key={p.name} className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-mono">
                            {p.name}{p.required && <span className="text-rose-500">*</span>}:{PT_LABEL[p.prop_type] ?? p.prop_type}
                          </span>
                        ))}
                      </span>
                    </div>
                    {a.preconditions.length > 0 && (
                      <div><span className="text-gray-400">前置条件：</span><span className="text-gray-600">{a.preconditions.join('；')}</span></div>
                    )}
                    <div className="flex flex-col gap-1">
                      <span className="text-gray-400">写回效果 (Side Effects)：</span>
                      {a.side_effects.map((s, i) => (
                        <span key={i} className="flex items-center gap-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${SE_STYLE[s.kind] ?? 'bg-gray-100 text-gray-600'}`}>{SE_LABEL[s.kind] ?? s.kind}</span>
                          <span className="text-gray-600">{s.description}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                    <button
                      onClick={() => setRunAction(a)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                    >
                      <Play className="w-3.5 h-3.5" /> 执行 / 预览
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 函数 */}
          {ont.live && tab === 'functions' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {functions.map((f) => (
                <div key={f.id} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-violet-50 text-violet-600"><Sigma className="w-4 h-4" /></div>
                    <h3 className="font-bold text-gray-900">{f.label}</h3>
                    <span className="text-[11px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">作用于 {objLabel(f.applies_to)}</span>
                    <span className="ml-auto text-[11px] text-gray-400">→ {PT_LABEL[f.returns] ?? f.returns}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{f.description}</p>
                  <pre className="mt-2 bg-gray-900 text-emerald-300 text-[11px] font-mono rounded-lg px-3 py-2 overflow-x-auto whitespace-pre-wrap">{f.expression}</pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {runAction && (
        <ActionRunner action={runAction} objLabel={objLabel} onClose={() => setRunAction(null)} />
      )}

      {editingPack && (
        <PackEditor
          pack={editingPack === 'new' ? null : editingPack}
          categories={cats.data?.categories ?? []}
          bases={bases.data?.bases ?? []}
          onClose={() => setEditingPack(null)}
          onSaved={() => { setEditingPack(null); packs.refresh(); }}
        />
      )}
    </div>
  );
}

const SE_LABEL: Record<string, string> = {
  create_object: '新建对象', update_property: '更新属性', create_link: '建立链接',
};
const SE_STYLE: Record<string, string> = {
  create_object: 'bg-emerald-100 text-emerald-700',
  update_property: 'bg-amber-100 text-amber-700',
  create_link: 'bg-indigo-100 text-indigo-700',
};

/** 对象类型网格 + 属性展开。 */
function ObjectsView({ objectTypes, activeObj, setActiveObj }: {
  objectTypes: ObjectType[]; activeObj: string | null; setActiveObj: (id: string | null) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {objectTypes.map((o) => {
        const open = activeObj === o.id;
        return (
          <div key={o.id} className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setActiveObj(open ? null : o.id)}
              className="w-full flex items-start gap-3 p-3 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: `${hex(o.color)}1a`, color: hex(o.color) }}>
                <DynIcon name={o.icon} className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900">{o.label}</h3>
                  <span className="text-[11px] font-mono text-gray-400">{o.id}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{o.description}</p>
                <div className="flex items-center gap-2 mt-1.5 text-[11px] text-gray-500">
                  <span className="flex items-center gap-1"><KeyRound className="w-3 h-3 text-amber-500" />{o.primary_key}</span>
                  <span className="text-gray-300">·</span>
                  <span>{o.properties.length} 属性</span>
                </div>
              </div>
            </button>
            {open && (
              <div className="border-t border-gray-100 divide-y divide-gray-50 bg-gray-50/50">
                {o.properties.map((p) => (
                  <div key={p.name} className="flex items-center gap-2 px-3 py-2 text-xs">
                    <span className="font-medium text-gray-700">{p.label}</span>
                    {p.required && <span className="text-rose-500">*</span>}
                    <span className="font-mono text-gray-400">{p.name}</span>
                    <span className="ml-auto bg-white border border-gray-200 text-gray-500 px-1.5 py-0.5 rounded">{PT_LABEL[p.prop_type] ?? p.prop_type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** 动力层动作执行器：动态参数表单 + dry_run 预览 / 真正写回。 */
function ActionRunner({ action, objLabel, onClose }: {
  action: ActionType; objLabel: (id: string) => string; onClose: () => void;
}) {
  const [target, setTarget] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ActionInvokeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setVal = (name: string, v: string) => setValues((s) => ({ ...s, [name]: v }));

  // 将表单字符串值按 prop_type 转换为后端期望的 JSON 类型。
  const buildParams = () => {
    const out: Record<string, string | number | boolean> = {};
    for (const p of action.parameters) {
      const raw = values[p.name];
      if (raw === undefined || raw === '') continue;
      if (p.prop_type === 'integer' || p.prop_type === 'number') {
        const n = Number(raw); out[p.name] = Number.isNaN(n) ? raw : n;
      } else if (p.prop_type === 'boolean') {
        out[p.name] = raw === 'true';
      } else { out[p.name] = raw; }
    }
    return out;
  };

  const run = async (dry_run: boolean) => {
    setBusy(true); setError(null); setResult(null);
    try {
      const res = await api.invokeAction(action.id, {
        target: target.trim() || undefined, params: buildParams(), dry_run,
      });
      setResult(res);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-200">
          <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600"><Zap className="w-4 h-4" /></div>
          <h3 className="font-bold text-gray-900">{action.label}</h3>
          <span className="text-[11px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">作用于 {objLabel(action.applies_to)}</span>
          <button onClick={onClose} className="ml-auto p-1 rounded-md text-gray-400 hover:bg-gray-100"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-xs text-gray-500">{action.description}</p>

          {/* 目标对象主键（applies_to 实例） */}
          <label className="block">
            <span className="text-xs font-medium text-gray-700">目标对象（{objLabel(action.applies_to)} 主键）</span>
            <input
              value={target} onChange={(e) => setTarget(e.target.value)}
              placeholder={`如 ${action.applies_to} 的主键值`}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
            />
          </label>

          {/* 动态参数表单 */}
          {action.parameters.map((p) => (
            <label key={p.name} className="block">
              <span className="text-xs font-medium text-gray-700">
                {p.label} {p.required && <span className="text-rose-500">*</span>}
                <span className="ml-1 font-mono text-gray-400">{p.name}:{PT_LABEL[p.prop_type] ?? p.prop_type}</span>
              </span>
              {p.prop_type === 'boolean' ? (
                <select value={values[p.name] ?? ''} onChange={(e) => setVal(p.name, e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none">
                  <option value="">—</option><option value="true">是 (true)</option><option value="false">否 (false)</option>
                </select>
              ) : (
                <input
                  type={p.prop_type === 'integer' || p.prop_type === 'number' ? 'number'
                    : p.prop_type === 'date_time' ? 'datetime-local' : 'text'}
                  value={values[p.name] ?? ''} onChange={(e) => setVal(p.name, e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
              )}
            </label>
          ))}

          {error && (
            <div className="flex items-start gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span>
            </div>
          )}

          {result && (
            <div className="space-y-2">
              <div className={`flex items-center gap-2 text-sm font-medium ${result.status === 'ok' ? 'text-emerald-700' : 'text-blue-700'}`}>
                <CheckCircle2 className="w-4 h-4" />
                {result.status === 'ok'
                  ? `已写回命名图 ${result.graph}（${result.applied ?? 0} 条语句）`
                  : `预览（dry_run）· 不写库 · ${result.sparql?.length ?? 0} 条语句`}
              </div>
              {result.status === 'dry_run' && result.sparql && result.sparql.length > 0 && (
                <pre className="bg-gray-900 text-emerald-300 text-[11px] font-mono rounded-lg px-3 py-2 overflow-x-auto whitespace-pre-wrap">
                  {result.sparql.join('\n\n')}
                </pre>
              )}
              {result.result && Object.keys(result.result).length > 0 && (
                <pre className="bg-gray-50 border border-gray-200 text-gray-700 text-[11px] font-mono rounded-lg px-3 py-2 overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(result.result, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50/60">
          <button onClick={() => run(true)} disabled={busy}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 bg-white hover:bg-gray-100 disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />} 预览 (dry_run)
          </button>
          <button onClick={() => run(false)} disabled={busy}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} 执行写回
          </button>
        </div>
      </div>
    </div>
  );
}

/** 复选多选列表（分类 / 图库 / 向量库）。顶层定义以避免重挂载导致的输入抖动。 */
function MultiSelect({ label, items, selected, onToggle, empty }: {
  label: string;
  items: { id: string; name: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  empty: string;
}) {
  return (
    <div>
      <span className="text-xs font-medium text-gray-700">{label}（{selected.length}）</span>
      <div className="mt-1 border border-gray-200 rounded-lg max-h-32 overflow-y-auto divide-y divide-gray-50">
        {items.length === 0 && <div className="text-xs text-gray-400 px-3 py-2">{empty}</div>}
        {items.map((it) => (
          <label key={it.id} className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 cursor-pointer">
            <input type="checkbox" checked={selected.includes(it.id)} onChange={() => onToggle(it.id)} />
            <span className="truncate">{it.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

/** 知识包编辑器：基础信息 + 多选关联（分类/图库/向量库）+ 向量库文本灌入。 */
function PackEditor({ pack, categories, bases, onClose, onSaved }: {
  pack: KnowledgePack | null;
  categories: KbCategory[];
  bases: KnowledgeBase[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(pack?.name ?? '');
  const [description, setDescription] = useState(pack?.description ?? '');
  const [version, setVersion] = useState(pack?.version ?? '1.0.0');
  const [icon, setIcon] = useState(pack?.icon ?? 'Package');
  const [color, setColor] = useState(pack?.color ?? 'sky');
  const [categoryIds, setCategoryIds] = useState<string[]>(pack?.category_ids ?? []);
  const [graphKbIds, setGraphKbIds] = useState<string[]>(pack?.graph_kb_ids ?? []);
  const [vectorKbIds, setVectorKbIds] = useState<string[]>(pack?.vector_kb_ids ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [ingestText, setIngestText] = useState('');
  const [ingestMsg, setIngestMsg] = useState<string | null>(null);
  const [ingestBusy, setIngestBusy] = useState(false);

  const graphBases = bases.filter((b) => b.kb_type === 'graph');
  const vectorBases = bases.filter((b) => b.kb_type === 'vector');

  const toggle = (arr: string[], set: (v: string[]) => void, id: string) =>
    set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

  const save = async () => {
    if (!name.trim()) { setError('请填写知识包名称'); return; }
    setBusy(true); setError(null);
    const payload: KnowledgePackCreatePayload = {
      name: name.trim(),
      description: description.trim() || undefined,
      version: version.trim() || undefined,
      icon: icon.trim() || undefined,
      color: color.trim() || undefined,
      category_ids: categoryIds,
      graph_kb_ids: graphKbIds,
      vector_kb_ids: vectorKbIds,
    };
    try {
      if (pack) await api.updateKnowledgePack(pack.id, payload);
      else await api.createKnowledgePack(payload);
      onSaved();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally { setBusy(false); }
  };

  const doIngest = async () => {
    const text = ingestText.trim();
    if (!text) { setIngestMsg('请输入要灌入的文本'); return; }
    if (vectorKbIds.length === 0) { setIngestMsg('请先勾选至少一个向量库'); return; }
    setIngestBusy(true); setIngestMsg(null);
    try {
      let total = 0;
      for (const id of vectorKbIds) {
        const r = await api.ingestKnowledgeBase(id, { text });
        total += r.chunks;
      }
      setIngestMsg(`已灌入 ${total} 个切片到 ${vectorKbIds.length} 个向量库`);
      setIngestText('');
    } catch (e: any) {
      setIngestMsg(e?.message ?? String(e));
    } finally { setIngestBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-200">
          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600"><Package className="w-4 h-4" /></div>
          <h3 className="font-bold text-gray-900">{pack ? '编辑知识包' : '新建知识包'}</h3>
          {pack?.builtin && <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">内置</span>}
          <button onClick={onClose} className="ml-auto p-1 rounded-md text-gray-400 hover:bg-gray-100"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <label className="block">
            <span className="text-xs font-medium text-gray-700">名称 *</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-700">描述</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
          </label>
          <div className="grid grid-cols-3 gap-2">
            <label className="block"><span className="text-xs font-medium text-gray-700">版本</span>
              <input value={version} onChange={(e) => setVersion(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" /></label>
            <label className="block"><span className="text-xs font-medium text-gray-700">图标</span>
              <input value={icon} onChange={(e) => setIcon(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" /></label>
            <label className="block"><span className="text-xs font-medium text-gray-700">颜色</span>
              <input value={color} onChange={(e) => setColor(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" /></label>
          </div>

          <MultiSelect label="关联知识库分类" items={categories.map((c) => ({ id: c.id, name: c.name }))} selected={categoryIds} onToggle={(id) => toggle(categoryIds, setCategoryIds, id)} empty="暂无分类（在「记忆系统」中创建）" />
          <MultiSelect label="关联图知识库" items={graphBases.map((b) => ({ id: b.id, name: b.name }))} selected={graphKbIds} onToggle={(id) => toggle(graphKbIds, setGraphKbIds, id)} empty="暂无图知识库" />
          <MultiSelect label="关联向量知识库" items={vectorBases.map((b) => ({ id: b.id, name: b.name }))} selected={vectorKbIds} onToggle={(id) => toggle(vectorKbIds, setVectorKbIds, id)} empty="暂无向量知识库" />

          {vectorKbIds.length > 0 && (
            <div className="border border-violet-100 bg-violet-50/40 rounded-lg p-3 space-y-2">
              <span className="text-xs font-medium text-violet-700">向选中向量库灌入文本（分块 → embedding → 入库，供运行时检索）</span>
              <textarea value={ingestText} onChange={(e) => setIngestText(e.target.value)} rows={3} placeholder="粘贴文档 / FAQ 文本…" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500" />
              <div className="flex items-center gap-2">
                <button onClick={doIngest} disabled={ingestBusy} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50">
                  {ingestBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} 灌入
                </button>
                {ingestMsg && <span className="text-xs text-gray-600">{ingestMsg}</span>}
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50/60">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 bg-white hover:bg-gray-100">取消</button>
          <button onClick={save} disabled={busy} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 保存
          </button>
        </div>
      </div>
    </div>
  );
}
