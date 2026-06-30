import { motion } from 'motion/react';
import { Activity, CheckCircle2, AlertTriangle, Boxes, GitGraph } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useHealth, useMetrics, useGuardStats, useAgents } from '../api/hooks';
import LiveBadge from '../components/LiveBadge';

export default function Overview() {
  const health = useHealth();
  const metrics = useMetrics();
  const guard = useGuardStats();
  const agents = useAgents();
  const live = metrics.live || health.live;

  const m = metrics.data;
  const g = guard.data;
  const passRate = g && g.total_checks > 0 ? `${(g.pass_rate * 100).toFixed(1)}%` : '—';

  // 指标卡：全部取自后端实时数据，后端离线时显示「—」，不使用任何占位业务数据。
  const cards = [
    { label: '已加载技能数', value: live ? String(m?.skills ?? 0) : '—', change: live ? '实时' : '后端未连接', icon: Boxes, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: '校验通过率', value: live ? passRate : '—', change: live ? `${g?.total_checks ?? 0} 次` : '后端未连接', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'L2 知识节点', value: live ? String(m?.l2_nodes ?? 0) : '—', change: live ? `${m?.events ?? 0} 事件` : '后端未连接', icon: GitGraph, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: '失败校验拦截', value: live ? String(g?.failed_checks ?? 0) : '—', change: live ? '今日' : '后端未连接', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  // 智能体业务域分布：按真实智能体聚合（来自 GET /api/v1/agents），无数据则空态。
  const agentList = agents.data?.agents ?? [];
  const usageMap = new Map<string, number>();
  for (const a of agentList) {
    const key = a.business_domain || a.name || '未分类';
    usageMap.set(key, (usageMap.get(key) ?? 0) + 1);
  }
  const agentUsage = Array.from(usageMap, ([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">AI Agent 中台总览</h1>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${live ? 'bg-green-500' : 'bg-amber-400'}`}></span>
            {live ? `系统运行正常 · v${health.data?.version ?? ''}` : '后端未连接'}
          </span>
          <span className="mx-2">|</span>
          <LiveBadge live={live} loading={metrics.loading} error={metrics.error} />
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <span className="text-sm font-medium text-gray-400">
                {stat.change}
              </span>
            </div>
            <h3 className="text-gray-500 text-sm font-medium">{stat.label}</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 任务执行趋势：后端暂未提供时序指标端点，不展示任何占位数据 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">任务执行趋势</h2>
          </div>
          <div className="h-72 flex flex-col items-center justify-center text-center text-gray-400">
            <Activity className="w-10 h-10 mb-3 text-gray-300" />
            <p className="text-sm">暂无时序趋势数据</p>
            <p className="text-xs mt-1">接入后端任务时序指标端点后将展示真实数据</p>
          </div>
        </motion.div>

        {/* 智能体业务域分布：来自真实智能体聚合 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm"
        >
          <h2 className="text-lg font-bold text-gray-900 mb-6">智能体业务域分布</h2>
          <div className="h-72">
            {agentUsage.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
                <Boxes className="w-10 h-10 mb-3 text-gray-300" />
                <p className="text-sm">{live ? '暂无智能体' : '后端未连接'}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agentUsage} layout="vertical" margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                  <XAxis type="number" hide allowDecimals={false} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#374151' }} width={100} />
                  <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="value" name="智能体数" fill="#3f3f46" radius={[0, 3, 3, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
