import { Cpu, GitMerge, RefreshCw, UserCheck, Database, Activity, Boxes, Server, Bot, User, Smartphone, Monitor, Wrench, Car, Zap, FileText, Headset, Battery, Shield } from 'lucide-react';
import { useRuntimeConfig, useMetrics, useAgents } from '../api/hooks';
import LiveBadge from '../components/LiveBadge';

const ICONS: Record<string, any> = { Bot, User, Smartphone, Monitor, Wrench, Car, Zap, FileText, Activity, Headset, Battery, Shield };

export default function RuntimeKernel() {
  const cfg = useRuntimeConfig();
  const metrics = useMetrics();
  const agents = useAgents();
  const live = cfg.live;
  const c = cfg.data;
  const m = metrics.data;
  const agentList = agents.data?.agents ?? [];
  const enabledCount = agentList.filter((a) => a.enabled).length;
  const fmt = (n?: number) => (typeof n === 'number' ? n.toLocaleString() : '—');

  const metricCards = [
    { label: '事件总线事件数', value: m?.events, icon: Activity, color: 'text-blue-600' },
    { label: '事件订阅者', value: m?.subscribers, icon: UserCheck, color: 'text-emerald-600' },
    { label: 'L2 黑板节点', value: m?.l2_nodes, icon: Boxes, color: 'text-indigo-600' },
    { label: 'L2 字节数', value: m?.l2_bytes, icon: Database, color: 'text-slate-600' },
    { label: '检查点', value: m?.checkpoints, icon: RefreshCw, color: 'text-amber-600' },
    { label: '注册技能', value: m?.skills, icon: Cpu, color: 'text-purple-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Runtime Kernel (运行时内核)</h1>
          <p className="text-sm text-gray-500 mt-1">语义内核运行时指标、内核配置与业务智能体概览（实时）</p>
        </div>
        <LiveBadge live={live} loading={cfg.loading} error={cfg.error} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左：运行时实时指标 + 业务智能体概览 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <GitMerge className="w-5 h-5 text-blue-600" />
                语义内核运行时指标
              </h2>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${metrics.live ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                {metrics.live ? '实时 · 每 5s 刷新' : '后端离线'}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {metricCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="border border-gray-100 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`w-4 h-4 ${card.color}`} />
                      <span className="text-xs text-gray-500">{card.label}</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 tabular-nums">
                      {metrics.live ? fmt(card.value) : '—'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 业务智能体概览（真实，来自 /api/v1/agents） */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Server className="w-5 h-5 text-emerald-600" />
                业务智能体概览
              </h2>
              <span className="text-xs text-gray-500">
                共 {agentList.length} 个 · 启用 {enabledCount}
              </span>
            </div>
            {!agents.live && (
              <div className="text-sm text-gray-400 text-center py-6">后端离线，智能体列表不可用</div>
            )}
            {agents.live && agentList.length === 0 && (
              <div className="text-sm text-gray-400 text-center py-6">暂无已注册智能体</div>
            )}
            {agents.live && agentList.length > 0 && (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {agentList.map((a, i) => (
                  <div key={a.id ?? i} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2.5 bg-gray-50">
                    <div className="flex items-center gap-2 min-w-0">
                      {(() => {
                        const AgentIcon = ICONS[a.icon] || Bot;
                        return (
                          <div className={`w-5 h-5 rounded flex items-center justify-center text-white ${a.color || 'bg-gray-400'} shrink-0 relative`}>
                            <AgentIcon className="w-3 h-3" />
                            <span className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-white ${a.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                          </div>
                        );
                      })()}
                      <span className="text-sm font-medium text-gray-800 truncate">{a.name}</span>
                      <span className="text-xs text-gray-400 truncate">{a.business_domain || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {Array.isArray(a.skills) && a.skills.length > 0 && (
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{a.skills.length} 技能</span>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${a.source === 'user' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                        {a.source === 'user' ? '用户态' : '批处理'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 右：内核配置（真实，来自 /api/v1/config） */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
              <Cpu className="w-5 h-5 text-purple-600" />
              内核配置
            </h2>
            {!live && <div className="text-sm text-gray-400 text-center py-4">后端离线，配置不可用</div>}
            {live && (
              <dl className="space-y-3 text-sm">
                {[
                  ['推理模型', c?.gateway.default_model],
                  ['网关地址', c?.gateway.base_url],
                  ['最大重试', c?.gateway.max_retries],
                  ['超时(秒)', c?.gateway.timeout_seconds],
                  ['最大并行 Agent', c?.agents.max_parallel_agents],
                  ['最大迭代次数', c?.agents.max_iterations],
                  ['L1 最大消息数', c?.memory.l1_max_messages],
                  ['L2 最大节点字节', c?.memory.l2_max_node_size],
                ].map(([k, v]) => (
                  <div key={String(k)} className="flex items-center justify-between gap-3">
                    <dt className="text-gray-500 shrink-0">{k}</dt>
                    <dd className="text-gray-900 font-medium truncate text-right">{v ?? '—'}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">内核特性状态</h2>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm">
                <RefreshCw className="w-4 h-4 text-green-500" />
                <span className="text-gray-700">事件总线在线（{live ? `${fmt(m?.subscribers)} 订阅者` : '—'}）</span>
              </li>
              <li className="flex items-center gap-3 text-sm">
                <UserCheck className="w-4 h-4 text-green-500" />
                <span className="text-gray-700">最大并行 Agent（{live ? c?.agents.max_parallel_agents ?? '—' : '—'}）</span>
              </li>
              <li className="flex items-center gap-3 text-sm">
                <Cpu className="w-4 h-4 text-green-500" />
                <span className="text-gray-700">{live ? `推理模型: ${c?.gateway.default_model ?? '—'}` : 'CoT 推理规划引擎'}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
