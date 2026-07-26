import { motion } from 'motion/react';
import {
  Activity,
  AlertTriangle,
  Boxes,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Cpu,
  Database,
  GitBranch,
  GitGraph,
  Layers,
  Network,
  Puzzle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area, Legend } from 'recharts';
import {
  useAgents,
  useApiAudit,
  useApiClients,
  useGuardStats,
  useHealth,
  useKnowledgeBases,
  useKnowledgePacks,
  useMcpServers,
  useMetrics,
  usePrompts,
  useRuntimeConfig,
  useSkills,
  useTaskTrends,
  useUnifiedStats,
} from '../api/hooks';
import LiveBadge from '../components/LiveBadge';
import TruncatedText from '../components/TruncatedText';
import {
  Badge,
  DistributionBar,
  EmptyHint,
  KpiCard,
  Panel,
  StatRow,
} from '../components/overview/OverviewPrimitives';
import {
  formatBytes,
  formatCount,
  formatPercent,
  formatRelativeTime,
  summarizeAgents,
  summarizeAudit,
  summarizeModels,
  summarizeSkills,
  topN,
  truncateLabel,
} from '../components/overview/aggregate';

interface DomainTickProps {
  x?: number;
  y?: number;
  payload?: { value?: string };
}

function DomainTick({ x = 0, y = 0, payload }: DomainTickProps) {
  const characters = Array.from(payload?.value ?? '');
  const lines = Array.from({ length: Math.ceil(characters.length / 10) }, (_, index) =>
    characters.slice(index * 10, index * 10 + 10).join(''),
  );
  const firstLineOffset = -((lines.length - 1) * 7);

  return (
    <text x={x - 8} y={y} textAnchor="end" fill="#374151" fontSize={12}>
      {lines.map((line, index) => (
        <tspan key={`${line}-${index}`} x={x - 8} dy={index === 0 ? firstLineOffset : 14}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

export interface OverviewProps {
  /** 由 App 注入的页面跳转，用于指标卡与面板的下钻。 */
  onNavigate?: (page: string) => void;
}

export default function Overview({ onNavigate }: OverviewProps) {
  const health = useHealth();
  const metrics = useMetrics();
  const stats = useUnifiedStats();
  const guard = useGuardStats();
  const agents = useAgents();
  const skills = useSkills();
  const config = useRuntimeConfig();
  const bases = useKnowledgeBases();
  const packs = useKnowledgePacks();
  const mcp = useMcpServers();
  const prompts = usePrompts();
  const clients = useApiClients();
  const audit = useApiAudit({ limit: 20 });
  const trends = useTaskTrends(7);
  const live = metrics.live || health.live;

  const go = (page: string) => (onNavigate ? () => onNavigate(page) : undefined);

  const m = metrics.data;
  const s = stats.data;
  const g = guard.data;
  const gateway = config.data?.gateway;
  const embedding = config.data?.embedding;

  const agentSummary = summarizeAgents(agents.data?.agents ?? []);
  const skillSummary = summarizeSkills(skills.data?.skills ?? []);
  const modelSummary = summarizeModels(config.data?.models);
  const auditSummary = summarizeAudit(audit.data?.records ?? []);

  const kbList = bases.data?.bases ?? [];
  const vectorKb = kbList.filter((b) => b.kb_type === 'vector').length;
  const graphKb = kbList.filter((b) => b.kb_type === 'graph').length;
  const packCount = packs.data?.count ?? s?.knowledge_packs ?? 0;
  const ontology = s?.ontology;

  const passRate = g && g.total_checks > 0 ? formatPercent(g.pass_rate) : '—';

  // 任务执行趋势：来自后端持久化检查点按天聚合（GET /api/v1/tasks/trends）。
  const trendData = (trends.data?.trends ?? []).map((p) => ({
    date: p.date.slice(5),
    活跃任务: p.tasks,
    执行步: p.checkpoints,
    完成: p.completed,
  }));
  const trendTotals = (trends.data?.trends ?? []).reduce(
    (acc, p) => ({
      tasks: acc.tasks + p.tasks,
      checkpoints: acc.checkpoints + p.checkpoints,
      completed: acc.completed + p.completed,
    }),
    { tasks: 0, checkpoints: 0, completed: 0 },
  );

  // 业务域为用户自由输入，图表侧做 Top8 合并与标签截断，避免单条超长数据撑爆坐标轴。
  const agentUsage = topN(agentSummary.byDomain, 8).map((item) => ({
    ...item,
    name: truncateLabel(item.name, 16),
  }));
  const maxDomainLabelLines = Math.max(
    1,
    ...agentUsage.map(({ name }) => Math.ceil(Array.from(name).length / 10)),
  );
  const domainChartHeight = Math.max(288, agentUsage.length * (maxDomainLabelLines * 14 + 20));

  const kpis = [
    {
      label: '业务智能体',
      value: live ? formatCount(agentSummary.total) : '—',
      hint: live ? `已发布 ${agentSummary.published}` : '后端未连接',
      icon: Bot,
      tone: 'blue' as const,
      page: 'agents',
    },
    {
      label: '已加载技能',
      value: live ? formatCount(skillSummary.total || m?.skills) : '—',
      hint: live ? `验签通过 ${skillSummary.verified}` : '后端未连接',
      icon: Puzzle,
      tone: 'purple' as const,
      page: 'registry',
    },
    {
      label: '知识库',
      value: live ? formatCount(kbList.length || s?.knowledge_bases.total) : '—',
      hint: live ? `向量 ${vectorKb} · 图 ${graphKb}` : '后端未连接',
      icon: Layers,
      tone: 'green' as const,
      page: 'knowledge',
    },
    {
      label: '模型资源',
      value: live ? formatCount(modelSummary.resourceTotal) : '—',
      hint: live ? `Provider ${modelSummary.providerTotal}` : '后端未连接',
      icon: Sparkles,
      tone: 'amber' as const,
      page: 'settings',
    },
    {
      label: 'L2 知识节点',
      value: live ? formatCount(m?.l2_nodes ?? s?.memory_tiers.l2_blackboard.nodes) : '—',
      hint: live ? formatBytes(m?.l2_bytes) : '后端未连接',
      icon: GitGraph,
      tone: 'slate' as const,
      page: 'memory',
    },
    {
      label: '校验通过率',
      value: live ? passRate : '—',
      hint: live ? `${formatCount(g?.total_checks)} 次校验` : '后端未连接',
      icon: CheckCircle2,
      tone: (g && g.failed_checks > 0 ? 'rose' : 'green') as 'rose' | 'green',
      page: 'security',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Agent 中台总览</h1>
          <p className="mt-1 text-sm text-gray-500">
            智能体、知识、技能、模型与运行时的全平台实时视图
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${live ? 'bg-green-500' : 'bg-amber-400'}`} />
            {live ? `系统运行正常 · v${health.data?.version ?? ''}` : '后端未连接'}
          </span>
          <span className="mx-1">|</span>
          <span className="text-xs text-gray-400">
            采样 {formatRelativeTime(s?.timestamp)}
          </span>
          <LiveBadge live={live} loading={metrics.loading} error={metrics.error} />
        </div>
      </div>

      {/* 关键指标：全部取自后端实时数据，离线时显示「—」 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi, index) => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            hint={kpi.hint}
            icon={kpi.icon}
            tone={kpi.tone}
            delay={index * 0.05}
            onClick={go(kpi.page)}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 任务执行趋势：后端持久化检查点按天聚合的真实时序 */}
        <Panel
          title="任务执行趋势"
          icon={Activity}
          hint={live ? `近 7 天 · 任务 ${trendTotals.tasks} · 完成 ${trendTotals.completed}` : '近 7 天'}
          className="lg:col-span-2"
          delay={0.3}
        >
          <div className="h-72">
            {!trends.live ? (
              <EmptyHint icon={Activity} text="后端未连接" sub="连接后将展示真实任务时序趋势" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradTasks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradSteps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradDone" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="活跃任务" stroke="#3b82f6" strokeWidth={2} fill="url(#gradTasks)" />
                  <Area type="monotone" dataKey="执行步" stroke="#8b5cf6" strokeWidth={2} fill="url(#gradSteps)" />
                  <Area type="monotone" dataKey="完成" stroke="#10b981" strokeWidth={2} fill="url(#gradDone)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>

        {/* 智能体业务域分布：按真实智能体聚合 */}
        <Panel
          title="智能体业务域分布"
          icon={Bot}
          actionLabel={onNavigate ? '智能体管理' : undefined}
          onAction={go('agents')}
          delay={0.35}
        >
          <div className="h-72 overflow-y-auto">
            {agentUsage.length === 0 ? (
              <EmptyHint icon={Boxes} text={live ? '暂无智能体' : '后端未连接'} />
            ) : (
              <div style={{ height: domainChartHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={agentUsage} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                    <XAxis type="number" hide allowDecimals={false} />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={<DomainTick />} width={150} />
                    <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="value" name="智能体数" fill="#3f3f46" radius={[0, 3, 3, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 记忆分层与知识资产 */}
        <Panel
          title="记忆分层与知识资产"
          icon={Database}
          actionLabel={onNavigate ? '记忆中心' : undefined}
          onAction={go('memory')}
          delay={0.4}
        >
          {!stats.live ? (
            <EmptyHint icon={Database} text="后端未连接" />
          ) : (
            <div>
              <StatRow label="L0 长期记忆" value={formatCount(s?.memory_tiers.l0_longterm.entries)} sub="条" />
              <StatRow label="L1 会话记忆" value={formatCount(s?.memory_tiers.l1_session.sessions)} sub="会话" />
              <StatRow
                label="L2 黑板"
                value={formatCount(s?.memory_tiers.l2_blackboard.nodes)}
                sub={`${formatCount(s?.memory_tiers.l2_blackboard.tasks)} 任务 · ${formatBytes(s?.memory_tiers.l2_blackboard.bytes)}`}
              />
              <StatRow label="知识库" value={formatCount(s?.knowledge_bases.total)} sub={`向量 ${vectorKb} · 图 ${graphKb}`} />
              <StatRow label="知识包" value={formatCount(packCount)} sub="可挂载" />
              <StatRow
                label={`本体域 ${ontology?.domain ?? '—'}`}
                value={formatCount(ontology?.object_types)}
                sub={`对象 · 链接 ${ontology?.link_types ?? 0} · 动作 ${ontology?.action_types ?? 0}`}
              />
              <StatRow label="运行时检查点" value={formatCount(s?.runtime.checkpoints)} sub={`${formatCount(s?.runtime.events.total_emitted)} 事件`} />
            </div>
          )}
        </Panel>

        {/* 模型与网关 */}
        <Panel
          title="模型与网关"
          icon={Sparkles}
          actionLabel={onNavigate ? '模型注册中心' : undefined}
          onAction={go('settings')}
          delay={0.45}
        >
          {!config.live ? (
            <EmptyHint icon={Sparkles} text="后端未连接" />
          ) : (
            <div>
              <StatRow label="默认对话模型" value={gateway?.default_model || '未配置'} sub={gateway?.api_key_configured ? '密钥已配置' : '缺少密钥'} />
              <StatRow label="网关端点" value={gateway?.base_url ? new URL(gateway.base_url).host : '未配置'} sub={`超时 ${gateway?.timeout_seconds ?? '—'}s`} />
              <StatRow
                label="Provider"
                value={`${modelSummary.providerEnabled}/${modelSummary.providerTotal}`}
                sub={`已配密钥 ${modelSummary.providerKeyed}`}
              />
              <StatRow
                label="型号资源"
                value={`${modelSummary.resourceEnabled}/${modelSummary.resourceTotal}`}
                sub={modelSummary.byModality.map((x) => `${x.name} ${x.value}`).join(' · ') || '未注册'}
              />
              <StatRow
                label="生效向量服务"
                value={embedding?.provider ?? '—'}
                sub={embedding ? `${embedding.active_dimension} 维${embedding.enabled ? '' : ' · 已禁用'}` : undefined}
              />
              <div className="mt-3">
                <p className="mb-2 text-xs font-medium text-gray-400">模态覆盖</p>
                <DistributionBar items={modelSummary.byModality} total={modelSummary.byModality.reduce((sum, x) => sum + x.value, 0)} />
              </div>
            </div>
          )}
        </Panel>

        {/* 技能准入与治理 */}
        <Panel
          title="技能准入与治理"
          icon={ShieldCheck}
          actionLabel={onNavigate ? '技能中心' : undefined}
          onAction={go('registry')}
          delay={0.5}
        >
          {!skills.live ? (
            <EmptyHint icon={Puzzle} text="后端未连接" />
          ) : (
            <div>
              <StatRow label="技能总数" value={formatCount(skillSummary.total)} sub={`可信密钥 ${formatCount(skills.data?.trusted_key_count ?? 0)}`} />
              <StatRow label="验签通过" value={formatCount(skillSummary.verified)} sub={`未签名 ${skillSummary.unsigned} · 异常 ${skillSummary.untrusted}`} />
              <StatRow label="行为校验" value={passRate} sub={`拦截 ${formatCount(g?.failed_checks)}`} />
              <StatRow
                label="Prompt 版本"
                value={formatCount(prompts.data?.count)}
                sub={prompts.data?.active_id ? '已有生效版本' : '无生效版本'}
              />
              <div className="mt-3">
                <p className="mb-2 text-xs font-medium text-gray-400">技能分类分布</p>
                <DistributionBar
                  items={topN(skillSummary.byCategory, 6).map((x) => ({ ...x, name: truncateLabel(x.name, 12) }))}
                  total={skillSummary.total}
                />
              </div>
              <div className="mt-3">
                <p className="mb-2 text-xs font-medium text-gray-400">安全级别分布</p>
                <DistributionBar
                  items={skillSummary.bySecurity}
                  total={skillSummary.bySecurity.reduce((sum, x) => sum + x.value, 0)}
                  colors={['bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-slate-400']}
                />
              </div>
            </div>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 智能体清单 */}
        <Panel
          title="智能体清单"
          icon={BrainCircuit}
          hint={live ? `启用 ${agentSummary.enabled} · 挂载知识 ${agentSummary.withKnowledge}` : undefined}
          delay={0.55}
        >
          {agentSummary.total === 0 ? (
            <EmptyHint icon={Bot} text={live ? '暂无智能体' : '后端未连接'} />
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {(agents.data?.agents ?? []).slice(0, 8).map((agent) => (
                <div
                  key={agent.id ?? agent.name}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <TruncatedText as="p" text={agent.name} className="text-sm font-medium text-gray-900" />
                    <TruncatedText
                      as="p"
                      text={`${agent.business_domain || '未分类'} · 技能 ${agent.skills?.length ?? 0} · 知识包 ${agent.knowledge_pack_ids?.length ?? 0}`}
                      className="text-xs text-gray-400"
                    />
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {agent.published && <Badge label="已发布" tone="blue" />}
                    <Badge label={agent.enabled ? '启用' : '停用'} tone={agent.enabled ? 'green' : 'slate'} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* 集成与对外发布 */}
        <Panel
          title="集成与对外发布"
          icon={Network}
          actionLabel={onNavigate ? '安全与合规' : undefined}
          onAction={go('security')}
          delay={0.6}
        >
          <div>
            <StatRow label="MCP 服务" value={formatCount(mcp.data?.count)} sub={mcp.live ? '已注册' : '后端未连接'} />
            <StatRow
              label="API 调用方"
              value={formatCount(clients.data?.count)}
              sub={clients.live ? `密钥 ${(clients.data?.clients ?? []).reduce((sum, c) => sum + c.keys.length, 0)} 把` : '需管理员权限'}
            />
            <StatRow
              label="入站调用成功率"
              value={formatPercent(auditSummary.successRate)}
              sub={auditSummary.total > 0 ? `近 ${auditSummary.total} 次 · 均值 ${auditSummary.avgLatencyMs ?? '—'}ms` : '暂无调用'}
            />
            <div className="mt-3">
              <p className="mb-2 text-xs font-medium text-gray-400">最近入站调用</p>
              {auditSummary.total === 0 ? (
                <p className="py-2 text-sm text-gray-400">暂无调用记录</p>
              ) : (
                <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
                  {(audit.data?.records ?? []).slice(0, 8).map((record, index) => (
                    <div key={`${record.ts}-${index}`} className="flex items-center justify-between gap-2 text-xs">
                      <TruncatedText text={record.endpoint} className="min-w-0 flex-1 text-gray-600" />
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-gray-400">{record.latency_ms ?? '—'}ms</span>
                        <Badge
                          label={String(record.status)}
                          tone={record.status >= 200 && record.status < 400 ? 'green' : 'rose'}
                        />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Panel>
      </div>

      {/* 运行时快照 */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65 }}
        className="grid grid-cols-2 gap-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm md:grid-cols-3 xl:grid-cols-6"
      >
        {[
          { label: '事件总量', value: formatCount(m?.events), icon: Activity },
          { label: '事件订阅者', value: formatCount(m?.subscribers), icon: Network },
          { label: '检查点', value: formatCount(m?.checkpoints), icon: GitBranch },
          { label: '最大并行 Agent', value: formatCount(config.data?.agents.max_parallel_agents), icon: Cpu },
          { label: '单任务最大迭代', value: formatCount(config.data?.agents.max_iterations), icon: Sparkles },
          { label: '校验失败', value: formatCount(g?.failed_checks), icon: AlertTriangle },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <item.icon className="h-4 w-4 shrink-0 text-gray-300" />
            <div className="min-w-0">
              <p className="truncate text-xs text-gray-400">{item.label}</p>
              <p className="text-lg font-semibold text-gray-900">{live ? item.value : '—'}</p>
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
