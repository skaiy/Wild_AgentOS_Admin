import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Network, Database, Server, Key, Activity, Plus, X, Save } from 'lucide-react';
import { useHealth, useMcpServers } from '../api/hooks';
import { api } from '../api/client';
import LiveBadge from '../components/LiveBadge';

export default function MCPHub() {
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const health = useHealth();
  const mcpState = useMcpServers();
  const servers = mcpState.data?.servers ?? [];
  const liveMcpCount = mcpState.data?.count ?? 0;

  // 注册表单状态
  const [regName, setRegName] = useState('');
  const [regEndpoint, setRegEndpoint] = useState('');
  const [regDesc, setRegDesc] = useState('');
  const [regProto, setRegProto] = useState('sse');
  const [saving, setSaving] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!regName.trim() || !regEndpoint.trim()) return;
    setSaving(true);
    setRegError(null);
    try {
      await api.registerMcpServer(regName, regEndpoint, regDesc, regProto);
      mcpState.refresh();
      setIsRegisterOpen(false);
      setRegName(''); setRegEndpoint(''); setRegDesc('');
    } catch (err: any) {
      setRegError(err?.message ?? '注册失败，请检查端点地址或后端日志');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">MCP Hub (多模态能力枢纽)</h1>
            <p className="text-sm text-gray-500 mt-1">连接外部工具与数据源的标准接口，统一限流与熔断管理</p>
          </div>
          <LiveBadge live={health.live} loading={health.loading} error={health.error} />
        </div>
        <button 
          onClick={() => setIsRegisterOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> 注册新 MCP
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Network className="w-8 h-8" /></div>
          <div>
            <p className="text-sm text-gray-500">已注册 MCP 服务</p>
            <p className="text-2xl font-bold text-gray-900">{liveMcpCount} 个</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-xl"><Activity className="w-8 h-8" /></div>
          <div>
            <p className="text-sm text-gray-500">在线服务数</p>
            <p className="text-2xl font-bold text-gray-900">
              {servers.filter(s => s.status === 'healthy' || s.status === 'online').length} 个
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Key className="w-8 h-8" /></div>
          <div>
            <p className="text-sm text-gray-500">异常/警告服务</p>
            <p className="text-2xl font-bold text-gray-900">
              {servers.filter(s => s.status !== 'healthy' && s.status !== 'online').length} 个
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">已注册 MCP 服务</h2>
            {liveMcpCount > 0 && (
              <span className="text-xs bg-blue-600 text-white rounded-full px-2 py-0.5">{liveMcpCount}</span>
            )}
          </div>
          <div className="flex gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 px-2 py-1 rounded-md">
              <span className="w-2 h-2 rounded-full bg-green-500"></span> 正常
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 px-2 py-1 rounded-md">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> 警告
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 px-2 py-1 rounded-md">
              <span className="w-2 h-2 rounded-full bg-red-500"></span> 离线
            </span>
          </div>
        </div>

        {servers.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            {mcpState.live ? '暂无注册的 MCP 服务，点击右上角「注册新 MCP」添加' : '后端离线，无法加载 MCP 服务列表'}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {servers.map((s) => {
              const isHealthy = s.status === 'healthy' || s.status === 'online';
              const isWarning = s.status === 'warning' || s.status === 'degraded';
              const dotCls = isHealthy ? 'bg-green-500' : isWarning ? 'bg-amber-500' : 'bg-red-500';
              return (
                <div key={s.id} className="px-6 py-4 flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {s.protocol === 'http' ? <Database className="w-4 h-4 text-blue-500" /> : <Server className="w-4 h-4 text-purple-500" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{s.name}</span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s.protocol}</span>
                      </div>
                      {s.description && <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>}
                      <p className="text-xs text-gray-400 mt-0.5 font-mono">{s.endpoint}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <span className={`w-2 h-2 rounded-full ${dotCls}`}></span>
                    <span className="text-xs text-gray-500">{s.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Register MCP Modal */}
      <AnimatePresence>
        {isRegisterOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsRegisterOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden relative z-10 flex flex-col"
            >
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                <h2 className="text-lg font-bold text-gray-900">注册新 MCP 服务</h2>
                <button onClick={() => setIsRegisterOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-200 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">MCP 名称 *</label>
                    <input value={regName} onChange={e => setRegName(e.target.value)} type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="例如：CRM 客户系统" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">协议</label>
                    <select value={regProto} onChange={e => setRegProto(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value="sse">SSE</option>
                      <option value="stdio">stdio</option>
                      <option value="http">HTTP</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">服务描述</label>
                  <textarea value={regDesc} onChange={e => setRegDesc(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" rows={2} placeholder="简要描述该服务提供的能力..." />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint URL *</label>
                  <input value={regEndpoint} onChange={e => setRegEndpoint(e.target.value)} type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono" placeholder="https://api.example.com/v1/mcp" />
                </div>

                <div className="flex items-center gap-2 text-sm bg-amber-50 text-amber-800 p-3 rounded-lg border border-amber-200">
                  <Activity className="w-4 h-4 shrink-0" />
                  注册后服务器将添加到实时注册表（运行期内存，重启后清空）。
                </div>
                {regError && (
                  <div className="flex items-center gap-2 text-sm bg-red-50 text-red-700 p-3 rounded-lg border border-red-200">
                    <X className="w-4 h-4 shrink-0" />
                    {regError}
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                <button onClick={() => setIsRegisterOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                  取消
                </button>
                <button onClick={handleRegister} disabled={saving || !regName.trim() || !regEndpoint.trim()} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 flex items-center gap-2">
                  <Save className="w-4 h-4" /> {saving ? '注册中…' : '注册服务'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
