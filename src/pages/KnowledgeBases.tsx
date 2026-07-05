import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Database, Search, Plus, X, UploadCloud, Share2, ChevronRight, Play, Tag, Pencil, Trash2, Check, Network, List } from 'lucide-react';
import { useAgents, useKbCategories, useKnowledgeBases } from '../api/hooks';
import { api, type KbCategory } from '../api/client';
import LiveBadge from '../components/LiveBadge';
import KgGraph from '../components/KgGraph';

/** ISO 时间转本地日期时间（无值返回占位符）。 */
function fmtDate(s?: string): string {
  if (!s) return '—';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString('zh-CN', { hour12: false });
}

export default function KnowledgeBases() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [kbType, setKbType] = useState<'vector' | 'graph'>('vector');
  const [kbTab, setKbTab] = useState<'vector' | 'graph'>('vector');
  const [kbSearch, setKbSearch] = useState('');
  const [viewKb, setViewKb] = useState<{ graph: string; agent: string } | null>(null);

  // 知识库分类（持久化 CRUD）与知识库（持久化）
  const categories = useKbCategories();
  const knowledgeBases = useKnowledgeBases();
  const catList = categories.data?.categories ?? [];
  const catName = (id: string) => catList.find(c => c.id === id)?.name ?? '';

  // 知识库列表：持久化知识库 + 已绑定知识图谱的智能体
  const agents = useAgents();
  const kbRows = [
    ...(knowledgeBases.data?.bases ?? []).map(b => ({
      name: b.name,
      graph: b.graph || '',
      namespace: b.vector_namespace || '',
      source: '持久化知识库',
      kbType: b.kb_type as string,
      category: catName(b.category_id),
      description: b.description || '',
      createdBy: b.created_by || '',
      createdAt: b.created_at || '',
      id: b.id,
      isGraph: b.kb_type === 'graph' && !!b.graph,
    })),
    ...(agents.data?.agents ?? [])
      .filter(a => a.knowledge_graph)
      .map(a => ({
        name: a.name,
        graph: a.knowledge_graph as string,
        namespace: '',
        source: `智能体绑定 · ${a.name}`,
        kbType: 'graph',
        category: '',
        description: '',
        createdBy: '',
        createdAt: '',
        id: '',
        isGraph: true,
      })),
  ];

  // 按 Tab（向量/图）划分，并按名称/命名空间/命名图做前端搜索过滤。
  const q = kbSearch.trim().toLowerCase();
  const activeRows = kbRows
    .filter(k => k.kbType === kbTab)
    .filter(k => !q || [k.name, k.graph, k.namespace, k.category, k.description].some(v => v?.toLowerCase().includes(q)));
  const vectorCount = kbRows.filter(k => k.kbType === 'vector').length;
  const graphCount = kbRows.filter(k => k.kbType === 'graph').length;

  // 新建知识库表单
  const [kbName, setKbName] = useState('');
  const [kbDesc, setKbDesc] = useState('');
  const [kbCategoryId, setKbCategoryId] = useState('');
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);
  // 摄取相关：向量库分块策略与文件；图谱库 schema 与文件；两段式结果
  const [chunkStrategy, setChunkStrategy] = useState('semantic');
  const [vectorFiles, setVectorFiles] = useState<File[]>([]);
  const [graphSchema, setGraphSchema] = useState('');
  const [graphFile, setGraphFile] = useState<File | null>(null);
  const [ingestMsg, setIngestMsg] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState(false);

  const resetCreateForm = () => {
    setKbName(''); setKbDesc(''); setKbCategoryId('');
    setChunkStrategy('semantic'); setVectorFiles([]); setGraphSchema(''); setGraphFile(null);
    setIngestMsg(null); setJustCreated(false); setCreateErr(null);
  };
  const closeCreate = () => { setIsCreateOpen(false); resetCreateForm(); };

  const submitCreateKb = async () => {
    if (!kbName.trim()) { setCreateErr('请填写知识库名称'); return; }
    setCreating(true); setCreateErr(null); setIngestMsg(null);
    try {
      const res = await api.createKnowledgeBase({
        name: kbName.trim(),
        description: kbDesc.trim(),
        kb_type: kbType,
        category_id: kbCategoryId || undefined,
      });
      const newId = res.id;
      // 第二段：按类型摄取（有文件/schema 才触发；失败不影响已建库）
      if (kbType === 'vector' && vectorFiles.length > 0) {
        setIngestMsg('正在上传并索引文件…');
        const up = await api.uploadKbFiles(newId, vectorFiles, { chunk_strategy: chunkStrategy });
        const skipped = up.files.filter(f => f.skipped_reason);
        let msg = `已写入 ${up.total_chunks} 个分块（应用策略：${up.chunk_strategy_applied}）`;
        if (skipped.length) {
          msg += `；${skipped.length} 个文件跳过：` +
            skipped.map(f => `${f.name}（${f.skipped_reason}）`).join('；');
        }
        setIngestMsg(msg);
      } else if (kbType === 'graph' && (graphFile || graphSchema.trim())) {
        setIngestMsg('正在导入三元组…');
        const imp = await api.importKbGraph(newId, {
          file: graphFile ?? undefined,
          schema: graphSchema.trim() || undefined,
        });
        setIngestMsg(
          `已写入 ${imp.triples_written} 条三元组（实体 ${imp.entities} · 关系 ${imp.relations}` +
          `${imp.schema_saved ? ' · schema 已保存' : ''}）${imp.note ? '；' + imp.note : ''}`,
        );
      }
      setJustCreated(true);
      knowledgeBases.refresh();
      // 无摄取步骤则直接关闭；有结果则保留弹窗供用户查看
      if (!(kbType === 'vector' && vectorFiles.length > 0) &&
          !(kbType === 'graph' && (graphFile || graphSchema.trim()))) {
        closeCreate();
      }
    } catch (e: any) {
      setCreateErr(e?.message ?? String(e));
    } finally { setCreating(false); }
  };

  // 分类管理表单
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [catBusy, setCatBusy] = useState(false);
  const [editingCat, setEditingCat] = useState<KbCategory | null>(null);

  const createCategory = async () => {
    if (!newCatName.trim()) return;
    setCatBusy(true);
    try {
      await api.createKbCategory({ name: newCatName.trim(), description: newCatDesc.trim() });
      setNewCatName(''); setNewCatDesc('');
      categories.refresh();
    } finally { setCatBusy(false); }
  };
  const saveEditCategory = async () => {
    if (!editingCat) return;
    setCatBusy(true);
    try {
      await api.updateKbCategory(editingCat.id, { name: editingCat.name, description: editingCat.description });
      setEditingCat(null);
      categories.refresh();
    } finally { setCatBusy(false); }
  };
  const removeCategory = async (id: string) => {
    setCatBusy(true);
    try { await api.deleteKbCategory(id); categories.refresh(); } finally { setCatBusy(false); }
  };
  const removeKb = async (id: string) => {
    if (!id) return;
    try { await api.deleteKnowledgeBase(id); knowledgeBases.refresh(); } catch { /* noop */ }
  };

  // 查看抽屉：按命名图实时查询三元组
  const [triples, setTriples] = useState<Record<string, string>[] | null>(null);
  const [triLoading, setTriLoading] = useState(false);
  const [triError, setTriError] = useState<string | null>(null);
  const [triView, setTriView] = useState<'graph' | 'list'>('graph');
  useEffect(() => {
    if (!viewKb) { setTriples(null); setTriError(null); return; }
    let cancelled = false;
    setTriLoading(true); setTriError(null); setTriples(null);
    api.kgQuery('SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 100', viewKb.graph)
      .then(r => { if (!cancelled) setTriples(r.results as Record<string, string>[]); })
      .catch(e => { if (!cancelled) setTriError(e?.message ?? String(e)); })
      .finally(() => { if (!cancelled) setTriLoading(false); });
    return () => { cancelled = true; };
  }, [viewKb]);

  // KG 实时查询面板
  const [sparql, setSparql] = useState('SELECT ?s ?p ?o WHERE { ?s ?p ?o . } LIMIT 10');
  const [kgResults, setKgResults] = useState<unknown[] | null>(null);
  const [kgLoading, setKgLoading] = useState(false);
  const [kgError, setKgError] = useState<string | null>(null);

  const runKgQuery = async () => {
    setKgLoading(true); setKgError(null); setKgResults(null);
    try {
      const res = await api.kgQuery(sparql);
      setKgResults(res.results);
    } catch (e: any) {
      setKgError(e?.message ?? String(e));
    } finally { setKgLoading(false); }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">知识库 (Knowledge Bases)</h1>
          <p className="text-sm text-gray-500 mt-1">向量库 / 图谱库的分类、创建与检索 (RAG)</p>
        </div>
        <LiveBadge live={knowledgeBases.live} loading={knowledgeBases.loading} error={knowledgeBases.error} />
      </div>

      {/* Knowledge Base Categories（知识库分类管理 CRUD） */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
          <Tag className="w-4 h-4 text-amber-600" />
          <h2 className="text-lg font-bold text-gray-900">知识库分类</h2>
          <span className="text-xs text-gray-500 ml-1">分类持久化 · 新建知识库时可归类</span>
          {!categories.live && <span className="text-xs text-gray-400 ml-auto">后端离线</span>}
        </div>
        <div className="p-4 space-y-4">
          {/* 新建分类表单 */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              placeholder="分类名称，如：动力电池"
              className="flex-1 min-w-[160px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <input
              value={newCatDesc}
              onChange={e => setNewCatDesc(e.target.value)}
              placeholder="分类描述（可选）"
              className="flex-1 min-w-[160px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button
              onClick={createCategory}
              disabled={catBusy || !newCatName.trim()}
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-40"
            >
              <Plus className="w-4 h-4" /> 新增分类
            </button>
          </div>
          {/* 分类列表 */}
          {catList.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-6">
              {categories.live ? '暂无知识库分类，请先新增分类' : '后端离线，无法加载分类'}
            </div>
          ) : (
            <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
              {catList.map(c => (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                  {editingCat?.id === c.id ? (
                    <>
                      <input
                        value={editingCat.name}
                        onChange={e => setEditingCat({ ...editingCat, name: e.target.value })}
                        className="flex-1 border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <input
                        value={editingCat.description}
                        onChange={e => setEditingCat({ ...editingCat, description: e.target.value })}
                        className="flex-1 border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <button onClick={saveEditCategory} disabled={catBusy} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md" title="保存">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingCat(null)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md" title="取消">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex items-center gap-2 font-medium text-gray-900">
                        <Tag className="w-4 h-4 text-amber-500" /> {c.name}
                      </span>
                      <span className="text-sm text-gray-500 flex-1 truncate">{c.description}</span>
                      <button onClick={() => setEditingCat({ ...c })} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md" title="编辑">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => removeCategory(c.id)} disabled={catBusy} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md" title="删除">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Knowledge Bases List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">核心知识库列表</h2>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={kbSearch}
                onChange={e => setKbSearch(e.target.value)}
                placeholder="搜索知识库..."
                className="pl-9 pr-4 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => { setKbType(kbTab); setIsCreateOpen(true); }}
              className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> 新建知识库
            </button>
          </div>
        </div>

        {/* Tab 切换：向量库 / 图谱库 */}
        <div className="px-6 pt-3 border-b border-gray-200 flex gap-1">
          <button
            onClick={() => setKbTab('vector')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors ${kbTab === 'vector' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Database className="w-4 h-4" /> 向量数据库
            <span className={`px-1.5 py-0.5 rounded-full text-xs ${kbTab === 'vector' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{vectorCount}</span>
          </button>
          <button
            onClick={() => setKbTab('graph')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors ${kbTab === 'graph' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Share2 className="w-4 h-4" /> 图数据库
            <span className={`px-1.5 py-0.5 rounded-full text-xs ${kbTab === 'graph' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>{graphCount}</span>
          </button>
        </div>

        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">
            <tr>
              <th className="px-6 py-3">{kbTab === 'graph' ? '命名图 (Named Graph)' : '名称'}</th>
              <th className="px-6 py-3">{kbTab === 'graph' ? '来源' : '命名空间 (Namespace)'}</th>
              <th className="px-6 py-3">分类</th>
              <th className="px-6 py-3">描述</th>
              <th className="px-6 py-3">创建时间</th>
              <th className="px-6 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {activeRows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                  {knowledgeBases.live || agents.live
                    ? (kbSearch.trim() ? '无匹配的知识库' : `暂无${kbTab === 'graph' ? '图谱' : '向量'}知识库，请点击「新建知识库」创建`)
                    : '后端离线，无法加载知识库列表'}
                </td>
              </tr>
            )}
            {activeRows.map((kb, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    {kb.kbType === 'graph' ? <Share2 className="w-4 h-4 text-purple-500 shrink-0" /> : <Database className="w-4 h-4 text-blue-500 shrink-0" />}
                    <span className={kb.kbType === 'graph' ? 'font-mono text-xs break-all' : ''}>{kb.kbType === 'graph' ? kb.graph : kb.name}</span>
                  </div>
                  {kb.createdBy && <div className="text-xs text-gray-400 mt-0.5 ml-6">创建人: {kb.createdBy}</div>}
                </td>
                <td className="px-6 py-4">
                  {kbTab === 'graph'
                    ? <span className="text-xs text-gray-500">{kb.source}</span>
                    : (kb.namespace
                        ? <span className="font-mono text-xs text-gray-500 break-all">{kb.namespace}</span>
                        : <span className="text-gray-300 text-xs">—</span>)}
                </td>
                <td className="px-6 py-4">
                  {kb.category
                    ? <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded-md text-xs flex items-center gap-1 w-fit"><Tag className="w-3 h-3" />{kb.category}</span>
                    : <span className="text-gray-300 text-xs">未分类</span>}
                </td>
                <td className="px-6 py-4">
                  {kb.description
                    ? <span className="text-xs text-gray-600 line-clamp-2 max-w-[220px]" title={kb.description}>{kb.description}</span>
                    : <span className="text-gray-300 text-xs">—</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">{fmtDate(kb.createdAt)}</td>
                <td className="px-6 py-4 text-right whitespace-nowrap">
                  {kb.isGraph && (
                    <button
                      onClick={() => setViewKb({ graph: kb.graph, agent: kb.source })}
                      className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                    >
                      查看三元组
                    </button>
                  )}
                  {kb.id && (
                    <button
                      onClick={() => removeKb(kb.id)}
                      className="text-red-500 hover:text-red-700 font-medium text-sm ml-3"
                    >
                      删除
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* View KB Drawer：实时查询命名图三元组 */}
      <AnimatePresence>
        {viewKb && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={() => setViewKb(null)}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col"
            >
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-purple-600" />
                    <span className="font-mono text-base">{viewKb.graph}</span>
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">关联智能体: {viewKb.agent}</p>
                </div>
                <div className="flex items-center gap-3">
                  {triples && triples.length > 0 && (
                    <div className="flex bg-white border border-gray-200 rounded-lg p-0.5">
                      <button
                        onClick={() => setTriView('graph')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${triView === 'graph' ? 'bg-purple-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                      >
                        <Network className="w-3.5 h-3.5" /> 图谱视图
                      </button>
                      <button
                        onClick={() => setTriView('list')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${triView === 'list' ? 'bg-purple-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                      >
                        <List className="w-3.5 h-3.5" /> 列表视图
                      </button>
                    </div>
                  )}
                  <button onClick={() => setViewKb(null)} className="text-gray-400 hover:text-gray-600 p-2 rounded-md hover:bg-gray-200 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
                <div className="bg-purple-50 text-purple-800 text-sm p-3 rounded-lg border border-purple-100 flex items-center gap-2 mb-4">
                  <Share2 className="w-4 h-4" />
                  实时查询命名图三元组 (Subject &rarr; Predicate &rarr; Object)，最多 100 条
                </div>
                {triLoading && <div className="text-sm text-gray-500 text-center py-8">查询中…</div>}
                {triError && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{triError}</div>}
                {triples !== null && triples.length === 0 && !triLoading && (
                  <div className="text-sm text-gray-400 text-center py-8">该命名图暂无三元组数据</div>
                )}
                {triples && triples.length > 0 && triView === 'graph' && (
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <KgGraph triples={triples} height={520} />
                  </div>
                )}
                {triples && triples.length > 0 && triView === 'list' && (
                  <div className="space-y-3">
                    {triples.map((t, idx) => (
                      <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex-1 bg-blue-50 text-blue-700 px-3 py-2 rounded-md border border-blue-100 text-center font-medium text-xs truncate" title={t['?s']}>
                          {t['?s']}
                        </div>
                        <div className="flex items-center w-32 shrink-0">
                          <div className="h-px bg-gray-300 flex-1"></div>
                          <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200 z-10 whitespace-nowrap truncate max-w-[90px]" title={t['?p']}>
                            {t['?p']}
                          </span>
                          <div className="h-px bg-gray-300 flex-1"></div>
                          <ChevronRight className="w-3 h-3 text-gray-400 -ml-1" />
                        </div>
                        <div className="flex-1 bg-emerald-50 text-emerald-700 px-3 py-2 rounded-md border border-emerald-100 text-center font-medium text-xs truncate" title={t['?o']}>
                          {t['?o']}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create KB Modal */}
      <AnimatePresence>
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={closeCreate}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden relative z-10 flex flex-col"
            >
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                <h2 className="text-lg font-bold text-gray-900">新建知识库</h2>
                <button onClick={closeCreate} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-200 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">知识库名称</label>
                  <input
                    type="text"
                    value={kbName}
                    onChange={e => setKbName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="例如：2026年产品手册库"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">知识库描述（可选）</label>
                  <input
                    type="text"
                    value={kbDesc}
                    onChange={e => setKbDesc(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="简要描述该知识库的用途"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">知识库分类</label>
                  <select
                    value={kbCategoryId}
                    onChange={e => setKbCategoryId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                  >
                    <option value="">未分类</option>
                    {catList.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {catList.length === 0 && (
                    <p className="text-xs text-gray-400 mt-1">暂无分类，可在上方「知识库分类」区先创建</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">知识库类型</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setKbType('vector')}
                      className={`p-4 border rounded-xl flex flex-col items-center gap-2 transition-colors ${
                        kbType === 'vector' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-blue-300 text-gray-600'
                      }`}
                    >
                      <Database className="w-8 h-8" />
                      <span className="font-medium">向量数据库 (Vector DB)</span>
                      <span className="text-xs text-center opacity-80">适用于文档、PDF、图片等多模态非结构化数据，支持语义检索。</span>
                    </button>
                    <button 
                      onClick={() => setKbType('graph')}
                      className={`p-4 border rounded-xl flex flex-col items-center gap-2 transition-colors ${
                        kbType === 'graph' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 hover:border-purple-300 text-gray-600'
                      }`}
                    >
                      <Share2 className="w-8 h-8" />
                      <span className="font-medium">图数据库 (Graph DB)</span>
                      <span className="text-xs text-center opacity-80">适用于实体关系、维修图谱、故障树等结构化关联数据。</span>
                    </button>
                  </div>
                </div>

                {kbType === 'vector' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">文档分块策略 (Chunking)</label>
                      <select
                        value={chunkStrategy}
                        onChange={e => setChunkStrategy(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      >
                        <option value="semantic">智能语义分块 (推荐)</option>
                        <option value="fixed">固定长度 (500 字符)</option>
                        <option value="heading">按段落/标题分割</option>
                      </select>
                      <p className="text-xs text-gray-400 mt-1">当前后端统一按固定长度分块，语义/标题策略将逐步启用（结果以返回的「应用策略」为准）。</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">上传文档源</label>
                      <label className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-blue-400 transition-colors cursor-pointer block">
                        <input
                          type="file"
                          multiple
                          accept=".txt,.md,.markdown,.csv,.json,.jsonl,.log"
                          className="hidden"
                          onChange={e => setVectorFiles(Array.from(e.target.files ?? []))}
                        />
                        <UploadCloud className="w-8 h-8 mb-2 text-gray-400" />
                        <p className="text-sm font-medium text-gray-700">点击选择文件</p>
                        <p className="text-xs mt-1">支持 TXT / Markdown / CSV / JSON（PDF、Word 暂不支持解析，将被跳过）</p>
                      </label>
                      {vectorFiles.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {vectorFiles.map((f, i) => (
                            <li key={i} className="flex items-center justify-between text-xs bg-gray-50 border border-gray-200 rounded-md px-2 py-1">
                              <span className="truncate">{f.name} · {(f.size / 1024).toFixed(1)} KB</span>
                              <button
                                onClick={() => setVectorFiles(vectorFiles.filter((_, j) => j !== i))}
                                className="text-gray-400 hover:text-red-500 ml-2 shrink-0"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </motion.div>
                )}

                {kbType === 'graph' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">图谱 Schema 定义（可选）</label>
                      <textarea
                        value={graphSchema}
                        onChange={e => setGraphSchema(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none font-mono"
                        rows={4}
                        placeholder="定义实体(Entity)和关系(Relation)的结构（将作为命名图元三元组保存）..."
                      ></textarea>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">导入三元组数据</label>
                      <label className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-purple-400 transition-colors cursor-pointer block">
                        <input
                          type="file"
                          accept=".csv,.jsonl,.json,.nt,.ttl,.triples"
                          className="hidden"
                          onChange={e => setGraphFile(e.target.files?.[0] ?? null)}
                        />
                        <UploadCloud className="w-8 h-8 mb-2 text-gray-400" />
                        <p className="text-sm font-medium text-gray-700">上传结构化数据文件</p>
                        <p className="text-xs mt-1">支持 CSV（subject,predicate,object[,object_type]）/ JSONL / N-Triples</p>
                      </label>
                      {graphFile && (
                        <div className="mt-2 flex items-center justify-between text-xs bg-gray-50 border border-gray-200 rounded-md px-2 py-1">
                          <span className="truncate">{graphFile.name} · {(graphFile.size / 1024).toFixed(1)} KB</span>
                          <button onClick={() => setGraphFile(null)} className="text-gray-400 hover:text-red-500 ml-2 shrink-0">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {ingestMsg && (
                  <div className={`text-sm rounded-lg px-3 py-2 border ${justCreated ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                    {ingestMsg}
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end items-center gap-3">
                {createErr && <span className="text-sm text-red-600 mr-auto">{createErr}</span>}
                {justCreated ? (
                  <button onClick={closeCreate} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg">
                    完成
                  </button>
                ) : (
                  <>
                    <button onClick={closeCreate} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                      取消
                    </button>
                    <button
                      onClick={submitCreateKb}
                      disabled={creating || !kbName.trim()}
                      className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-40 ${kbType === 'vector' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}`}
                    >
                      {creating ? '创建中…' : '创建并开始索引'}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 实时 KG SPARQL 查询面板 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
          <Share2 className="w-4 h-4 text-purple-600" />
          <h2 className="text-lg font-bold text-gray-900">知识图谱实时查询</h2>
          <span className="text-xs text-gray-500 ml-1">SPARQL → Oxigraph</span>
        </div>
        <div className="p-4 space-y-3">
          <textarea
            value={sparql}
            onChange={e => setSparql(e.target.value)}
            rows={3}
            className="w-full font-mono text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          />
          <button
            onClick={runKgQuery}
            disabled={kgLoading || !sparql.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-40 transition-colors"
          >
            <Play className="w-4 h-4" /> {kgLoading ? '查询中…' : '执行查询'}
          </button>
          {kgError && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{kgError}</div>}
          {kgResults !== null && (
            <div className="overflow-auto max-h-64 border border-gray-200 rounded-lg">
              {kgResults.length === 0
                ? <div className="text-sm text-gray-500 p-4 text-center">无结果</div>
                : <pre className="text-xs p-4 font-mono whitespace-pre-wrap">{JSON.stringify(kgResults, null, 2)}</pre>
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
