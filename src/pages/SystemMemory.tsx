import { HardDrive, Clock, ClipboardList, GitBranch } from 'lucide-react';
import { useUnifiedStats } from '../api/hooks';
import LiveBadge from '../components/LiveBadge';

/** 字节转人类可读单位。 */
function fmtBytes(n: number): string {
  if (!n) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), u.length - 1);
  return `${(n / 1024 ** i).toFixed(1)} ${u[i]}`;
}

/** 数值格式化：null（当前无枚举接口）显示占位。 */
function fmtNum(n: number | null | undefined, live: boolean): string {
  if (!live) return '—';
  if (n == null) return 'N/A';
  return n.toLocaleString();
}

/** 单个层级指标卡的一行 KV。 */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="font-bold text-gray-900">{value}</span>
    </div>
  );
}

/** 系统记忆（L0–L3）实时规模指标。记忆中心「系统记忆」tab 内容，数据源 unified-stats。 */
export default function SystemMemory() {
  const stats = useUnifiedStats();
  const live = stats.live;
  const s = stats.data;
  const t = s?.memory_tiers;
  const rt = s?.runtime;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">系统记忆 (System Memory)</h1>
          <p className="text-sm text-gray-500 mt-1">L0–L3 四层记忆的实时规模与健康信号</p>
        </div>
        <LiveBadge live={live} loading={stats.loading} error={stats.error} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* L0 Permanent */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">L0 长期记忆 (Permanent)</h2>
              <p className="text-xs text-gray-500">永久沉淀存储 · redb</p>
            </div>
          </div>
          <div className="space-y-4">
            <Row label="条目总数" value={fmtNum(t?.l0_longterm.entries, live)} />
            <Row label="检查点 (Checkpoints)" value={fmtNum(rt?.checkpoints, live)} />
            <Row label="已注册技能" value={fmtNum(rt?.skills_registered, live)} />
          </div>
        </div>

        {/* L1 Session */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">L1 会话记忆 (Session)</h2>
              <p className="text-xs text-gray-500">会话上下文 · 纯内存</p>
            </div>
          </div>
          <div className="space-y-4">
            <Row label="活跃会话数" value={fmtNum(t?.l1_session.sessions, live)} />
            <Row label="事件总线消息数" value={fmtNum(rt?.events.total_emitted, live)} />
            <Row label="活跃订阅者" value={fmtNum(rt?.events.active_subscribers, live)} />
            {live && (
              <div className="text-xs text-gray-400 pt-1">L1 为进程内会话存储，暂不支持枚举（N/A）</div>
            )}
          </div>
        </div>

        {/* L2 Blackboard */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">L2 黑板 (Blackboard)</h2>
              <p className="text-xs text-gray-500">跨 Agent 共享黑板 · Oxigraph</p>
            </div>
          </div>
          <div className="space-y-4">
            <Row label="知识节点数" value={fmtNum(t?.l2_blackboard.nodes, live)} />
            <Row label="存储量" value={live && t ? fmtBytes(t.l2_blackboard.bytes) : '—'} />
            <Row label="任务数 (Tasks)" value={fmtNum(t?.l2_blackboard.tasks, live)} />
          </div>
        </div>

        {/* L3 Projection */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
              <GitBranch className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">L3 派生投影 (Projection)</h2>
              <p className="text-xs text-gray-500">按需投影视图 · SPARQL 物化缓存</p>
            </div>
          </div>
          <div className="space-y-4">
            <Row label="投影缓存数" value={fmtNum(t?.l3_projection.projections, live)} />
            {live && (
              <div className="text-xs text-gray-400 pt-1">L3 投影为派生缓存，暂未暴露统计接口（N/A）</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
