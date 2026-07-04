import { useMemo, useState } from 'react';
import { Plus, Trash2, AlertTriangle, CheckCircle2, Copy, KeyRound, X, Ban, Activity } from 'lucide-react';
import { api, type ApiClientView } from '../api/client';
import { useApiClients, useAgents, useApiAudit } from '../api/hooks';
import LiveBadge from './LiveBadge';

/** 相对时间简化展示。 */
function fromNow(iso: string | null): string {
  if (!iso) return '从未调用';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return `${s} 秒前`;
  if (s < 3600) return `${Math.floor(s / 60)} 分钟前`;
  if (s < 86400) return `${Math.floor(s / 3600)} 小时前`;
  return `${Math.floor(s / 86400)} 天前`;
}

export default function ApiKeyCenter() {
  const clients = useApiClients();
  const agents = useAgents();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [issueFor, setIssueFor] = useState<ApiClientView | null>(null);
  const [issuedKey, setIssuedKey] = useState<{ plaintext: string; prefix: string } | null>(null);
  const [copied, setCopied] = useState(false);
  // 创建调用方表单
  const [form, setForm] = useState({ name: '', description: '', rpm: 60, concurrency: 4, daily: 0, monthly: 0, scope: [] as string[] });
  const [keyName, setKeyName] = useState('');

  const agentName = useMemo(() => {
    const m = new Map<string, string>();
    (agents.data?.agents || []).forEach((a) => { if (a.id) m.set(a.id, a.name); });
    return m;
  }, [agents.data]);

  const list = clients.data?.clients || [];
  const [auditFilter, setAuditFilter] = useState('');
  const audit = useApiAudit({ client_id: auditFilter || undefined, limit: 100 });
  const clientName = useMemo(() => {
    const m = new Map<string, string>();
    list.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [list]);

  const run = async (fn: () => Promise<unknown>) => {
    setErr(null); setBusy(true);
    try { await fn(); clients.refresh(); }
    catch (e: any) { setErr(e?.message ?? String(e)); }
    finally { setBusy(false); }
  };

  const submitCreate = () =>
    run(async () => {
      if (!form.name.trim()) { throw new Error('调用方名称不能为空'); }
      await api.createApiClient({
        name: form.name.trim(), description: form.description.trim(),
        granted_agent_ids: form.scope,
        rate_limit: { rpm: form.rpm, concurrency: form.concurrency },
        quota: { daily: form.daily, monthly: form.monthly },
      });
      setShowCreate(false);
      setForm({ name: '', description: '', rpm: 60, concurrency: 4, daily: 0, monthly: 0, scope: [] });
    });

  const submitIssue = () =>
    run(async () => {
      if (!issueFor) return;
      const res = await api.issueApiKey(issueFor.id, { name: keyName.trim() || '默认密钥' });
      setIssuedKey({ plaintext: res.api_key, prefix: res.key.key_prefix });
      setIssueFor(null); setKeyName('');
    });

  const toggleStatus = (c: ApiClientView) =>
    run(() => api.updateApiClient(c.id, { status: c.status === 'active' ? 'disabled' : 'active' }));

  const revoke = (c: ApiClientView, kid: string) =>
    run(() => api.revokeApiKey(c.id, kid));

  const removeClient = (c: ApiClientView) => {
    if (!window.confirm(`确认删除调用方「${c.name}」及其名下所有密钥？此操作不可恢复。`)) return;
    run(() => api.deleteApiClient(c.id));
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-gray-900">API 密钥治理</h2>
          <LiveBadge live={clients.live} />
        </div>
        <button onClick={() => setShowCreate(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
          <Plus className="w-4 h-4" /> 新建调用方
        </button>
      </div>

      <div className="bg-amber-50 text-amber-800 text-sm p-4 rounded-lg border border-amber-200 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
        <p>「调用方(Client)」是对外 API 的一等实体：授权其可调用的 Agent、配置限流/配额，并在其名下签发多把密钥。密钥明文仅在签发时显示一次，请立即妥善保存。</p>
      </div>

      {err && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {err}
        </div>
      )}

      {list.length === 0 && (
        <div className="text-center text-gray-400 py-12 border border-dashed border-gray-200 rounded-lg">
          暂无调用方。点击右上角「新建调用方」创建第一个对外 API 客户端。
        </div>
      )}

      <div className="space-y-4">
        {list.map((c) => (
          <div key={c.id} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">{c.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                  {c.status === 'active' ? '启用' : '停用'}
                </span>
                {c.description && <span className="text-xs text-gray-400">{c.description}</span>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleStatus(c)} disabled={busy} className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1">
                  <Ban className="w-3.5 h-3.5" /> {c.status === 'active' ? '停用' : '启用'}
                </button>
                <button onClick={() => setIssueFor(c)} disabled={busy} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5" /> 签发密钥
                </button>
                <button onClick={() => removeClient(c)} disabled={busy} className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1">
                  <Trash2 className="w-3.5 h-3.5" /> 删除
                </button>
              </div>
            </div>
            <div className="px-4 py-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-600 border-b border-gray-100">
              <div>
                <div className="text-gray-400 mb-1">授权 Agent（scope）</div>
                {c.granted_agent_ids.length === 0
                  ? <span className="text-gray-400">未授权任何 Agent</span>
                  : <div className="flex flex-wrap gap-1">
                      {c.granted_agent_ids.map((id) => (
                        <span key={id} className="bg-emerald-100 text-emerald-700 rounded px-1.5 py-0.5">{agentName.get(id) || id}</span>
                      ))}
                    </div>}
              </div>
              <div>
                <div className="text-gray-400 mb-1">限流 / 配额</div>
                <div>rpm {c.rate_limit.rpm || '∞'} · 并发 {c.rate_limit.concurrency || '∞'}</div>
                <div>日 {c.quota.daily || '∞'} · 月 {c.quota.monthly || '∞'}</div>
              </div>
              <div>
                <div className="text-gray-400 mb-1 flex items-center gap-1"><Activity className="w-3 h-3" /> 实时用量</div>
                <div>本分钟 {c.usage.rpm_current} · 并发 {c.usage.concurrency_current}</div>
                <div>今日 {c.usage.daily_used} · 本月 {c.usage.monthly_used}</div>
              </div>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-white text-gray-500 text-xs border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2 font-medium">密钥名称</th>
                  <th className="px-4 py-2 font-medium">前缀</th>
                  <th className="px-4 py-2 font-medium">最后使用</th>
                  <th className="px-4 py-2 font-medium">状态</th>
                  <th className="px-4 py-2 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-600">
                {c.keys.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-3 text-gray-400 text-xs">尚无密钥，点击上方「签发密钥」创建。</td></tr>
                )}
                {c.keys.map((k) => (
                  <tr key={k.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-900">{k.name || '—'}</td>
                    <td className="px-4 py-2 font-mono text-xs">{k.key_prefix}***</td>
                    <td className="px-4 py-2 text-xs">{fromNow(k.last_used_at)}</td>
                    <td className="px-4 py-2">
                      {k.status === 'active'
                        ? <span className="flex items-center gap-1 text-green-600 text-xs font-medium"><CheckCircle2 className="w-3 h-3" /> 正常</span>
                        : <span className="text-gray-400 text-xs">已撤销</span>}
                    </td>
                    <td className="px-4 py-2">
                      {k.status === 'active' && (
                        <button onClick={() => revoke(c, k.id)} disabled={busy} className="text-red-600 hover:text-red-800 flex items-center gap-1 text-xs font-medium">
                          <Trash2 className="w-3 h-3" /> 撤销
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
      {/* 调用审计 */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">调用审计（最近 100 条）</h3>
          <select value={auditFilter} onChange={(e) => setAuditFilter(e.target.value)} className="text-xs border border-gray-300 rounded px-2 py-1">
            <option value="">全部调用方</option>
            {list.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white text-gray-500 border-b border-gray-100 sticky top-0">
              <tr>
                <th className="px-4 py-2 font-medium">时间</th>
                <th className="px-4 py-2 font-medium">调用方</th>
                <th className="px-4 py-2 font-medium">Agent</th>
                <th className="px-4 py-2 font-medium">端点</th>
                <th className="px-4 py-2 font-medium">结果</th>
                <th className="px-4 py-2 font-medium">耗时</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-600">
              {(audit.data?.records || []).length === 0 && (
                <tr><td colSpan={6} className="px-4 py-3 text-gray-400">暂无调用记录。</td></tr>
              )}
              {(audit.data?.records || []).map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-1.5">{fromNow(r.ts)}</td>
                  <td className="px-4 py-1.5">{clientName.get(r.client_id) || r.key_prefix || '—'}</td>
                  <td className="px-4 py-1.5">{agentName.get(r.agent_id) || r.agent_id}</td>
                  <td className="px-4 py-1.5">{r.endpoint}</td>
                  <td className="px-4 py-1.5">
                    <span className={r.status < 400 ? 'text-green-600' : 'text-red-600'}>{r.status} {r.result}</span>
                  </td>
                  <td className="px-4 py-1.5">{r.latency_ms != null ? `${r.latency_ms}ms` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 新建调用方 */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
              <h3 className="font-bold text-gray-900">新建调用方</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <div>
                <label className="block text-gray-600 mb-1">名称 *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="如：DLSX 闪修系统对接" />
              </div>
              <div>
                <label className="block text-gray-600 mb-1">描述</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="第三方系统集成用途" />
              </div>
              <div>
                <label className="block text-gray-600 mb-1">授权可调用的 Agent（scope）</label>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                  {(agents.data?.agents || []).filter((a) => a.id).map((a) => (
                    <label key={a.id} className="flex items-center gap-2 text-gray-700">
                      <input type="checkbox" checked={form.scope.includes(a.id!)}
                        onChange={(e) => setForm({ ...form, scope: e.target.checked ? [...form.scope, a.id!] : form.scope.filter((x) => x !== a.id) })} />
                      <span>{a.name}</span>
                      {a.published ? <span className="text-[10px] text-green-600">已发布</span> : <span className="text-[10px] text-gray-400">未发布</span>}
                    </label>
                  ))}
                  {(agents.data?.agents || []).length === 0 && <span className="text-gray-400 text-xs">暂无 Agent</span>}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">仅「已发布」的 Agent 才能被外部实际调用；此处授权决定调用方可见范围。</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-gray-600 mb-1">每分钟请求(rpm，0=不限)</label>
                  <input type="number" min={0} value={form.rpm} onChange={(e) => setForm({ ...form, rpm: +e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2" /></div>
                <div><label className="block text-gray-600 mb-1">最大并发(0=不限)</label>
                  <input type="number" min={0} value={form.concurrency} onChange={(e) => setForm({ ...form, concurrency: +e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2" /></div>
                <div><label className="block text-gray-600 mb-1">日配额(0=不限)</label>
                  <input type="number" min={0} value={form.daily} onChange={(e) => setForm({ ...form, daily: +e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2" /></div>
                <div><label className="block text-gray-600 mb-1">月配额(0=不限)</label>
                  <input type="number" min={0} value={form.monthly} onChange={(e) => setForm({ ...form, monthly: +e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2" /></div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">取消</button>
              <button onClick={submitCreate} disabled={busy} className="px-4 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">创建</button>
            </div>
          </div>
        </div>
      )}

      {/* 签发密钥 */}
      {issueFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
              <h3 className="font-bold text-gray-900">为「{issueFor.name}」签发密钥</h3>
              <button onClick={() => setIssueFor(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <label className="block text-gray-600 mb-1">密钥名称</label>
              <input value={keyName} onChange={(e) => setKeyName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="如：生产环境主密钥" />
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200">
              <button onClick={() => setIssueFor(null)} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">取消</button>
              <button onClick={submitIssue} disabled={busy} className="px-4 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">签发</button>
            </div>
          </div>
        </div>
      )}

      {/* 明文一次性展示 */}
      {issuedKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
              <h3 className="font-bold text-gray-900">密钥已生成</h3>
              <button onClick={() => setIssuedKey(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="bg-amber-50 text-amber-800 p-3 rounded-lg border border-amber-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>该明文仅此一次显示，请立即复制妥善保存。关闭后将无法再次查看。</p>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-xs bg-gray-100 rounded px-3 py-2 break-all">{issuedKey.plaintext}</code>
                <button onClick={() => copy(issuedKey.plaintext)} className="px-3 py-2 rounded-lg text-sm bg-gray-800 text-white hover:bg-gray-700 flex items-center gap-1">
                  <Copy className="w-3.5 h-3.5" /> {copied ? '已复制' : '复制'}
                </button>
              </div>
            </div>
            <div className="flex justify-end px-5 py-3 border-t border-gray-200">
              <button onClick={() => setIssuedKey(null)} className="px-4 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700">我已保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
