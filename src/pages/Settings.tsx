import { useEffect, useState } from 'react';
import { Save, Shield, Users, Key, Database, Cpu } from 'lucide-react';
import ApiKeyCenter from '../components/ApiKeyCenter';
import ModelResources from '../components/ModelResources';
import TruncatedText from '../components/TruncatedText';
import { api, type AdminPolicyConfig } from '../api/client';
import { useRuntimeConfig } from '../api/hooks';

const DEFAULT_POLICIES: AdminPolicyConfig = {
  iam: { access_token_hours: 2, refresh_token_days: 7, mfa_for_sensitive_actions: true },
  security: { prompt_injection_protection: true, hallucination_threshold: 0.85, max_tool_calls: 20, pii_redaction: true },
  storage: { task_retention_days: 90, session_retention_hours: 72, audit_retention_days: 365 },
};

export default function Settings() {
  const [activeTab, setActiveTab] = useState('models');
  const backend = useRuntimeConfig();
  const [policies, setPolicies] = useState(DEFAULT_POLICIES);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (backend.data?.admin_policies) setPolicies(backend.data.admin_policies);
  }, [backend.data?.admin_policies]);

  const savePolicies = async (sectionName: string) => {
    setSaving(true);
    setSaveMessage(null);
    try {
      await api.updateConfig({ admin_policies: policies });
      await backend.refresh();
      setSaveMessage({ ok: true, text: `${sectionName}已保存并持久化` });
    } catch (error) {
      setSaveMessage({ ok: false, text: error instanceof Error ? error.message : String(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">系统设置</h1>
        <p className="text-sm text-gray-500 mt-1">模型注册中心（网关路由 / 向量 / 多模态）、IAM 集成与安全策略</p>
      </div>

      {saveMessage && (
        <div role="status" className={`rounded-lg border px-4 py-3 text-sm ${saveMessage.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          <TruncatedText as="div" text={saveMessage.text} lines={3} />
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {/* Settings Sidebar */}
        <div className="w-full md:w-64 shrink-0">
          <nav className="space-y-1">
            {[
              { id: 'models', label: '模型注册中心', icon: Cpu },
              { id: 'iam', label: 'IAM 身份与访问', icon: Users },
              { id: 'security', label: '安全与合规策略', icon: Shield },
              { id: 'storage', label: '数据存储与备份', icon: Database },
              { id: 'keys', label: 'API 密钥管理', icon: Key },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-400'}`} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm p-6 min-h-[600px]">
          
          {/* Tab: IAM */}
          {activeTab === 'iam' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                <h2 className="text-lg font-bold text-gray-900">IAM 身份与访问控制</h2>
                <button onClick={() => savePolicies('IAM 配置')} disabled={saving || !backend.live} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                  <Save className="w-4 h-4" /> {saving ? '保存中…' : '保存配置'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-5">
                  <h3 className="text-md font-bold text-gray-900 border-l-4 border-blue-500 pl-2">认证与 Token 策略</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Access Token 有效期</label>
                    <select value={policies.iam.access_token_hours} onChange={(event) => setPolicies((value) => ({ ...value, iam: { ...value.iam, access_token_hours: Number(event.target.value) } }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value={1}>1 小时</option>
                      <option value={2}>2 小时</option>
                      <option value={4}>4 小时</option>
                      <option value={12}>12 小时</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Refresh Token 有效期</label>
                    <select value={policies.iam.refresh_token_days} onChange={(event) => setPolicies((value) => ({ ...value, iam: { ...value.iam, refresh_token_days: Number(event.target.value) } }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value={1}>1 天</option>
                      <option value={3}>3 天</option>
                      <option value={7}>7 天</option>
                      <option value={30}>30 天</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">高危操作二次验证 (MFA)</p>
                      <p className="text-xs text-gray-500 mt-0.5">执行删除、发布等操作时强制验证</p>
                    </div>
                    <input type="checkbox" checked={policies.iam.mfa_for_sensitive_actions} onChange={(event) => setPolicies((value) => ({ ...value, iam: { ...value.iam, mfa_for_sensitive_actions: event.target.checked } }))} className="w-4 h-4 shrink-0 text-blue-600 rounded focus:ring-blue-500" />
                  </div>
                </div>

                <div className="space-y-5">
                  <h3 className="text-md font-bold text-gray-900 border-l-4 border-purple-500 pl-2">细粒度 RBAC 角色</h3>
                  
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <ul className="divide-y divide-gray-100 text-sm">
                      <li className="p-3 flex justify-between items-center bg-gray-50">
                        <span className="font-medium text-gray-900">平台管理员</span>
                        <span className="text-gray-500 text-xs">全量管理权限</span>
                      </li>
                      <li className="p-3 flex justify-between items-center">
                        <span className="font-medium text-gray-900">技能开发者</span>
                        <span className="text-gray-500 text-xs">技能包读写+发布权限</span>
                      </li>
                      <li className="p-3 flex justify-between items-center">
                        <span className="font-medium text-gray-900">业务操作员</span>
                        <span className="text-gray-500 text-xs">特定智能体使用权限</span>
                      </li>
                      <li className="p-3 flex justify-between items-center">
                        <span className="font-medium text-gray-900">数据分析师</span>
                        <span className="text-gray-500 text-xs">只读查询权限</span>
                      </li>
                      <li className="p-3 flex justify-between items-center">
                        <span className="font-medium text-gray-900">只读访客</span>
                        <span className="text-gray-500 text-xs">公开知识库访问</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Security */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                <h2 className="text-lg font-bold text-gray-900">安全与合规策略</h2>
                <button onClick={() => savePolicies('安全与合规策略')} disabled={saving || !backend.live} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                  <Save className="w-4 h-4" /> {saving ? '保存中…' : '保存配置'}
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-md font-bold text-gray-900 border-l-4 border-red-500 pl-2 mb-4">AI 特有安全防护 (OWASP LLM Top 10)</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900">提示注入防护 (LLM01)</p>
                        <p className="text-xs text-gray-500 mt-1">启用语义级注入检测与黑名单过滤，拦截绕过系统提示词的攻击</p>
                      </div>
                      <input type="checkbox" checked={policies.security.prompt_injection_protection} onChange={(event) => setPolicies((value) => ({ ...value, security: { ...value.security, prompt_injection_protection: event.target.checked } }))} className="w-4 h-4 shrink-0 text-blue-600 rounded focus:ring-blue-500" />
                    </div>
                    
                    <div className="flex items-center justify-between gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900">幻觉控制阈值 (LLM09)</p>
                        <p className="text-xs text-gray-500 mt-1">NLI 一致性评分低于此值将触发拦截或转人工复核</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <input type="number" value={policies.security.hallucination_threshold} onChange={(event) => setPolicies((value) => ({ ...value, security: { ...value.security, hallucination_threshold: Number(event.target.value) } }))} step="0.01" min="0" max="1" className="border border-gray-300 rounded-lg px-3 py-1.5 w-24 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900">过度代理防护 (LLM08)</p>
                        <p className="text-xs text-gray-500 mt-1">单次任务最大允许工具调用次数，防止失控 Agent 发起大量副作用操作</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <input type="number" value={policies.security.max_tool_calls} onChange={(event) => setPolicies((value) => ({ ...value, security: { ...value.security, max_tool_calls: Number(event.target.value) } }))} min="1" max="100" className="border border-gray-300 rounded-lg px-3 py-1.5 w-24 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                        <span className="text-sm text-gray-500">次/任务</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-md font-bold text-gray-900 border-l-4 border-green-500 pl-2 mb-4">数据安全与隐私保护</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900">个人信息自动脱敏</p>
                        <p className="text-xs text-gray-500 mt-1">在进入 LLM 推理前自动替换姓名、手机号、身份证号、车架号等敏感信息</p>
                      </div>
                      <input type="checkbox" checked={policies.security.pii_redaction} onChange={(event) => setPolicies((value) => ({ ...value, security: { ...value.security, pii_redaction: event.target.checked } }))} className="w-4 h-4 shrink-0 text-blue-600 rounded focus:ring-blue-500" />
                    </div>
                    
                    <div className="flex items-center justify-between gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900">强制 TLS 1.3 传输加密</p>
                        <p className="text-xs text-gray-500 mt-1">禁止使用 TLS 1.0/1.1 和不安全密码套件，内部 gRPC 启用 mTLS</p>
                      </div>
                      <input type="checkbox" defaultChecked disabled className="w-4 h-4 shrink-0 text-blue-600 rounded opacity-50 cursor-not-allowed" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Storage */}
          {activeTab === 'storage' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                <h2 className="text-lg font-bold text-gray-900">数据存储与生命周期</h2>
                <button onClick={() => savePolicies('数据存储与生命周期配置')} disabled={saving || !backend.live} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                  <Save className="w-4 h-4" /> {saving ? '保存中…' : '保存配置'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-5">
                  <h3 className="text-md font-bold text-gray-900 border-l-4 border-amber-500 pl-2">在线保留期 (TTL)</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">任务执行记录</label>
                    <select value={policies.storage.task_retention_days} onChange={(event) => setPolicies((value) => ({ ...value, storage: { ...value.storage, task_retention_days: Number(event.target.value) } }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value={30}>30 天</option>
                      <option value={90}>90 天</option>
                      <option value={180}>180 天</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">到期后归档至对象存储，保留 3 年</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">会话上下文 (Session)</label>
                    <select value={policies.storage.session_retention_hours} onChange={(event) => setPolicies((value) => ({ ...value, storage: { ...value.storage, session_retention_hours: Number(event.target.value) } }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value={24}>24 小时</option>
                      <option value={72}>72 小时</option>
                      <option value={168}>7 天</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">过期自动删除，不归档</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">审计日志</label>
                    <select value={policies.storage.audit_retention_days} onChange={(event) => setPolicies((value) => ({ ...value, storage: { ...value.storage, audit_retention_days: Number(event.target.value) } }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value={180}>6 个月</option>
                      <option value={365}>1 年</option>
                      <option value={1095}>3 年</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">合规要求不可删除，归档保留 5 年</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <h3 className="text-md font-bold text-gray-900 border-l-4 border-indigo-500 pl-2">自动备份策略</h3>
                  
                  <div className="space-y-3">
                    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex items-center gap-2 mb-1">
                        <Database className="w-4 h-4 text-blue-600" />
                        <p className="font-bold text-sm text-gray-900">PostgreSQL (结构化数据)</p>
                      </div>
                      <p className="text-xs text-gray-600">每日凌晨 02:00 全量备份，每小时增量备份。备份文件 AES-256 加密存储于异地对象存储。</p>
                    </div>
                    
                    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex items-center gap-2 mb-1">
                        <Database className="w-4 h-4 text-purple-600" />
                        <p className="font-bold text-sm text-gray-900">Milvus / Qdrant (向量数据)</p>
                      </div>
                      <p className="text-xs text-gray-600">每日快照备份，快照文件与主数据异地存储。</p>
                    </div>

                    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex items-center gap-2 mb-1">
                        <Database className="w-4 h-4 text-green-600" />
                        <p className="font-bold text-sm text-gray-900">Neo4j (图数据)</p>
                      </div>
                      <p className="text-xs text-gray-600">每日全量导出，保留最近 7 个全量备份版本。</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Model Registry */}
          {activeTab === 'models' && <ModelResources />}

          {activeTab === 'keys' && <ApiKeyCenter />}

        </div>
      </div>
    </div>
  );
}
