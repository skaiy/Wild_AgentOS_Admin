import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Database, RefreshCw, X, Layers, Filter } from 'lucide-react';
import { api, type BlackboardTask, type BlackboardNode } from '../api/client';

/** 平台运维态：L2 黑板浏览器（跨租户，按 task_iri 定位）。 */
const STATUS_STYLE: Record<string, string> = {
  running: 'bg-blue-50 text-blue-700',
  completed: 'bg-emerald-50 text-emerald-700',
  failed: 'bg-red-50 text-red-700',
  unknown: 'bg-gray-100 text-gray-500',
};

export default function BlackboardBrowser() {
  const [tasks, setTasks] = useState<BlackboardTask[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<string | null>(null);
  const [nodes, setNodes] = useState<BlackboardNode[] | null>(null);
  const [nodeLoading, setNodeLoading] = useState(false);
  const [nodeError, setNodeError] = useState<string | null>(null);
  const [role, setRole] = useState('');
  const [nodeType, setNodeType] = useState('');

  const loadTasks = async () => {
    setLoading(true); setError(null);
    try {
      const r = await api.listBlackboardTasks();
      setTasks(r.tasks);
    } catch (e: any) { setError(e?.message ?? String(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadTasks(); }, []);

  const loadNodes = async (taskIri: string) => {
    setNodeLoading(true); setNodeError(null); setNodes(null);
    try {
      const r = await api.listBlackboardNodes(taskIri, {
        role: role || undefined, node_type: nodeType || undefined,
      });
      setNodes(r.nodes);
    } catch (e: any) { setNodeError(e?.message ?? String(e)); }
    finally { setNodeLoading(false); }
  };
  const openTask = (taskIri: string) => { setSelected(taskIri); loadNodes(taskIri); };

  const prettyJson = (s: string) => { try { return JSON.stringify(JSON.parse(s), null, 2); } catch { return s; } };

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">L2 黑板浏览器 (Blackboard)</h1>
          <p className="text-sm text-gray-500 mt-1">平台运维态 · 跨租户共享记忆，按任务 (task_iri) 定位</p>
        </div>
        <button onClick={loadTasks} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> 刷新
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          <h2 className="text-lg font-bold text-gray-900">任务列表</h2>
          <span className="text-xs text-gray-500 ml-1">{tasks ? `共 ${tasks.length} 个任务` : ''}</span>
        </div>
        {error && <div className="text-sm text-red-600 bg-red-50 px-6 py-3">{error}</div>}
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">
            <tr>
              <th className="px-6 py-3">Task IRI</th>
              <th className="px-6 py-3">状态</th>
              <th className="px-6 py-3">节点数</th>
              <th className="px-6 py-3">子任务</th>
              <th className="px-6 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(!tasks || tasks.length === 0) && (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                {loading ? '加载中…' : '暂无任务节点'}
              </td></tr>
            )}
            {tasks?.map(t => (
              <tr key={t.task_iri} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-mono text-xs text-gray-900">{t.task_iri}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-md text-xs ${STATUS_STYLE[t.status] ?? STATUS_STYLE.unknown}`}>{t.status}</span>
                </td>
                <td className="px-6 py-4">{t.node_count}</td>
                <td className="px-6 py-4">{t.children}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => openTask(t.task_iri)} className="text-blue-600 hover:text-blue-800 font-medium text-sm">查看节点</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSelected(null)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Database className="w-5 h-5 text-blue-600" /> 任务节点</h2>
                  <p className="text-xs text-gray-500 mt-1 font-mono">{selected}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 p-2 rounded-md hover:bg-gray-200"><X className="w-5 h-5" /></button>
              </div>
              <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2 bg-white">
                <Filter className="w-4 h-4 text-gray-400" />
                <select value={role} onChange={e => setRole(e.target.value)} className="border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white">
                  <option value="">全部角色</option>
                  <option value="PA">PA (Plan)</option><option value="DA">DA (Do)</option>
                  <option value="CA">CA (Check)</option><option value="AA">AA (Act)</option>
                </select>
                <input value={nodeType} onChange={e => setNodeType(e.target.value)} placeholder="节点类型 (可选)"
                  className="border border-gray-300 rounded-md px-2 py-1.5 text-sm w-40" />
                <button onClick={() => loadNodes(selected)} className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">应用过滤</button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50 space-y-3">
                {nodeLoading && <div className="text-sm text-gray-500 text-center py-8">加载中…</div>}
                {nodeError && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{nodeError}</div>}
                {nodes !== null && nodes.length === 0 && !nodeLoading && (
                  <div className="text-sm text-gray-400 text-center py-8">该任务下无匹配节点</div>
                )}
                {nodes?.map((n, i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="font-mono text-xs text-gray-900 truncate flex-1" title={n.iri}>{n.iri}</span>
                      {n.node_type && <span className="px-2 py-0.5 rounded-md text-xs bg-indigo-50 text-indigo-700">{n.node_type}</span>}
                      {n.created_by && <span className="text-xs text-gray-400">by {n.created_by}</span>}
                    </div>
                    <pre className="text-xs font-mono whitespace-pre-wrap bg-gray-50 rounded-md p-3 border border-gray-100 max-h-64 overflow-auto">{prettyJson(n.json_ld)}</pre>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
