import { ShieldCheck, ShieldAlert, Lock, EyeOff, FileWarning } from 'lucide-react';
import { useGuardStats, useGuardAudit } from '../api/hooks';
import LiveBadge from '../components/LiveBadge';

export default function Security() {
  const stats = useGuardStats();
  const audit = useGuardAudit();
  const live = stats.live;
  const s = stats.data;
  const entries = (audit.data?.entries ?? []) as Array<{
    timestamp: number; tool_name: string; agent_id: string;
    pre_injected: boolean; validation_passed: boolean; retry_count: number; error?: string | null;
  }>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">安全与合规 (AI Security)</h1>
          <p className="text-sm text-gray-500 mt-1">OWASP LLM Top 10 防护、数据脱敏与越权审计</p>
        </div>
        <LiveBadge live={live} loading={stats.loading} error={stats.error} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <h3 className="font-bold text-gray-900">{live ? '工具校验总数' : '提示注入拦截'}</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{live ? (s?.total_checks ?? 0) : '—'} <span className="text-sm font-normal text-gray-500">次</span></p>
          <p className="text-xs text-gray-500 mt-2">ToolGuard 实时审计</p>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <FileWarning className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-gray-900">校验通过率</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {live ? `${((s?.pass_rate ?? 1) * 100).toFixed(1)}%` : '—'}
            {live && s != null && <span className="text-sm font-normal text-green-600 ml-1">{s.passed_checks} 通过</span>}
          </p>
          <p className="text-xs text-gray-500 mt-2">工具输出 Schema 校验</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <EyeOff className="w-5 h-5 text-blue-500" />
            <h3 className="font-bold text-gray-900">敏感信息脱敏</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">— <span className="text-sm font-normal text-gray-400">暂无数据</span></p>
          <p className="text-xs text-gray-500 mt-2">姓名/手机号/VIN 脱敏（指标待接入）</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <Lock className="w-5 h-5 text-purple-500" />
            <h3 className="font-bold text-gray-900">失败校验拦截</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{live ? (s?.failed_checks ?? 0) : '—'} <span className="text-sm font-normal text-gray-500">次</span></p>
          <p className="text-xs text-gray-500 mt-2">过度代理防护 (LLM08)</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-gray-900">近期安全事件审计日志</h2>
        </div>
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">
            <tr>
              <th className="px-6 py-3">时间</th>
              <th className="px-6 py-3">事件类型</th>
              <th className="px-6 py-3">关联智能体/用户</th>
              <th className="px-6 py-3">详情描述</th>
              <th className="px-6 py-3">处理结果</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {entries.length > 0 ? (
              entries.slice(-50).reverse().map((log, i) => {
                const passed = log.validation_passed;
                return (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">工具调用校验{log.pre_injected ? ' · 预注入' : ''}</td>
                    <td className="px-6 py-4">{log.agent_id || '-'} / {log.tool_name}</td>
                    <td className="px-6 py-4">{log.error ? log.error : passed ? '校验通过' : '校验未通过'}{log.retry_count > 0 ? ` (重试 ${log.retry_count})` : ''}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {passed ? '通过' : '已拦截'}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                  {live ? '暂无安全事件记录' : '后端离线，无法加载审计日志'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
