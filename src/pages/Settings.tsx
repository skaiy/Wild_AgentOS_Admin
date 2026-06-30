import { useMemo, useState } from 'react';
import { Save, Server, Shield, Users, Key, Database, Plus, Trash2, AlertTriangle, CheckCircle2, Copy, Upload } from 'lucide-react';
import { loadConfig, saveConfig, toEnvSnippet, toYamlSnippet, type RuntimeConfig } from '../api/config';
import { useRuntimeConfig } from '../api/hooks';
import { api } from '../api/client';
import LiveBadge from '../components/LiveBadge';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('llm');
  const [cfg, setCfg] = useState<RuntimeConfig>(() => loadConfig());
  const [saved, setSaved] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pushMsg, setPushMsg] = useState<string | null>(null);
  const backend = useRuntimeConfig();

  const g = cfg.gateway;
  const patchGateway = (p: Partial<RuntimeConfig['gateway']>) =>
    setCfg((prev) => ({ ...prev, gateway: { ...prev.gateway, ...p } }));

  /** 保存到 localStorage（本地持久化）。 */
  const handleSave = () => {
    saveConfig(cfg);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  /** 推送到后端并持久化生效。 */
  const handlePushToBackend = async () => {
    if (!backend.live) return;
    setPushing(true); setPushMsg(null);
    try {
      await api.updateConfig({
        gateway: {
          base_url: g.baseUrl,
          api_key: g.apiKey,
          default_model: g.defaultModel,
          timeout_seconds: g.timeoutSeconds,
          max_retries: g.maxRetries,
          model_mapping: g.modelMapping,
        },
      });
      backend.refresh();
      setPushMsg('已成功推送到后端并完成持久化存储');
    } catch (e: any) {
      setPushMsg(`推送失败：${e?.message ?? String(e)}`);
    } finally {
      setPushing(false);
      setTimeout(() => setPushMsg(null), 4000);
    }
  };

  const envSnippet = useMemo(() => toEnvSnippet(g), [g]);
  const yamlSnippet = useMemo(() => toYamlSnippet(g), [g]);
  const copy = (text: string) => navigator.clipboard?.writeText(text).catch(() => {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">系统设置</h1>
        <p className="text-sm text-gray-500 mt-1">全局配置、LLM网关路由、IAM集成与安全策略</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Settings Sidebar */}
        <div className="w-full md:w-64 shrink-0">
          <nav className="space-y-1">
            {[
              { id: 'llm', label: 'LLM 大模型网关', icon: Server },
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
          
          {/* Tab: LLM Gateway */}
          {activeTab === 'llm' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-gray-900">LLM 模型路由配置</h2>
                  <LiveBadge live={backend.live} loading={backend.loading} error={backend.error} />
                </div>
                <div className="flex items-center gap-2">
                  {backend.live && (
                    <button
                      onClick={handlePushToBackend}
                      disabled={pushing}
                      className="border border-blue-300 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-50 disabled:opacity-40 flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      {pushing ? '推送中…' : '推送到后端'}
                    </button>
                  )}
                  <button
                    onClick={handleSave}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
                  >
                    {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    {saved ? '已保存' : '本地保存'}
                  </button>
                </div>
              </div>
              {pushMsg && (
                <div className={`text-sm px-3 py-2 rounded-lg ${pushMsg.startsWith('推送失败') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                  {pushMsg}
                </div>
              )}

              {/* 外部 LLM 网关：开放可配置（持久化到浏览器，并生成可应用到后端的配置片段） */}
              <div className="space-y-4">
                <div className="bg-blue-50 text-blue-800 text-sm p-4 rounded-lg border border-blue-100">
                  统一的 LLM Gateway 对接多个大模型服务提供商，实现按场景的模型路由、成本控制和故障切换。
                  外部 LLM 接口保持开放可配置：以下配置保存在浏览器并用于前端调用，同时生成可落地到后端的 .env / config.yaml 片段。
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">后端 Base URL（留空走 Vite 代理）</label>
                    <input
                      value={cfg.backendBaseUrl}
                      onChange={(e) => setCfg((p) => ({ ...p, backendBaseUrl: e.target.value }))}
                      placeholder="http://localhost:8080"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">网关 Base URL</label>
                    <input
                      value={g.baseUrl}
                      onChange={(e) => patchGateway({ baseUrl: e.target.value })}
                      placeholder="https://api.deepseek.com"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                    <input
                      type="password"
                      value={g.apiKey}
                      onChange={(e) => patchGateway({ apiKey: e.target.value })}
                      placeholder="sk-..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">默认模型</label>
                    <input
                      value={g.defaultModel}
                      onChange={(e) => patchGateway({ defaultModel: e.target.value })}
                      placeholder="deepseek-v4-flash"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">超时 (秒)</label>
                      <input
                        type="number"
                        value={g.timeoutSeconds}
                        onChange={(e) => patchGateway({ timeoutSeconds: Number(e.target.value) || 0 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">最大重试</label>
                      <input
                        type="number"
                        value={g.maxRetries}
                        onChange={(e) => patchGateway({ maxRetries: Number(e.target.value) || 0 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {backend.live && backend.data && (
                  <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-3">
                    后端当前生效：<span className="font-mono text-gray-700">{backend.data.gateway.base_url}</span> ·
                    模型 <span className="font-mono text-gray-700">{backend.data.gateway.default_model}</span> ·
                    重试 {backend.data.gateway.max_retries} · 超时 {backend.data.gateway.timeout_seconds}s
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between bg-gray-50 px-3 py-2 border-b border-gray-200">
                      <span className="text-xs font-medium text-gray-700">.env 片段</span>
                      <button onClick={() => copy(envSnippet)} className="text-gray-500 hover:text-blue-600 flex items-center gap-1 text-xs">
                        <Copy className="w-3.5 h-3.5" /> 复制
                      </button>
                    </div>
                    <pre className="p-3 text-xs text-gray-700 whitespace-pre-wrap break-all">{envSnippet}</pre>
                  </div>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between bg-gray-50 px-3 py-2 border-b border-gray-200">
                      <span className="text-xs font-medium text-gray-700">config.yaml 片段</span>
                      <button onClick={() => copy(yamlSnippet)} className="text-gray-500 hover:text-blue-600 flex items-center gap-1 text-xs">
                        <Copy className="w-3.5 h-3.5" /> 复制
                      </button>
                    </div>
                    <pre className="p-3 text-xs text-gray-700 whitespace-pre-wrap break-all">{yamlSnippet}</pre>
                  </div>
                </div>

                <h3 className="text-md font-bold text-gray-900 border-l-4 border-blue-500 pl-2 pt-2">按场景模型路由</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3">使用场景</th>
                        <th className="px-4 py-3">首选模型</th>
                        <th className="px-4 py-3">备用模型</th>
                        <th className="px-4 py-3">切换条件</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-600">
                      <tr>
                        <td className="px-4 py-3 font-medium text-gray-900">CoT 复杂推理</td>
                        <td className="px-4 py-3">
                          <select className="border border-gray-300 rounded px-2 py-1 text-sm w-full outline-none focus:border-blue-500">
                            <option>Claude 3.5 Sonnet</option>
                            <option>GPT-4o</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <select className="border border-gray-300 rounded px-2 py-1 text-sm w-full outline-none focus:border-blue-500">
                            <option>Qwen2.5-72B (私有)</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">API 故障或延迟 &gt; 10s</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium text-gray-900">检测报告多模态</td>
                        <td className="px-4 py-3">
                          <select className="border border-gray-300 rounded px-2 py-1 text-sm w-full outline-none focus:border-blue-500">
                            <option>GPT-4o Vision</option>
                            <option>Claude 3.5 Sonnet</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <select className="border border-gray-300 rounded px-2 py-1 text-sm w-full outline-none focus:border-blue-500">
                            <option>Qwen-VL-72B</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">API 故障或成本超阈值</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium text-gray-900">知识问答 (RAG)</td>
                        <td className="px-4 py-3">
                          <select className="border border-gray-300 rounded px-2 py-1 text-sm w-full outline-none focus:border-blue-500">
                            <option>Qwen2.5-14B (私有)</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <select className="border border-gray-300 rounded px-2 py-1 text-sm w-full outline-none focus:border-blue-500">
                            <option>通义千问 API</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">私有服务不可用时</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium text-gray-900">代码生成 (沙箱)</td>
                        <td className="px-4 py-3">
                          <select className="border border-gray-300 rounded px-2 py-1 text-sm w-full outline-none focus:border-blue-500">
                            <option>DeepSeek-Coder-V2</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <select className="border border-gray-300 rounded px-2 py-1 text-sm w-full outline-none focus:border-blue-500">
                            <option>Claude 3.5 Haiku</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">本地模型负载 &gt; 90%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab: IAM */}
          {activeTab === 'iam' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                <h2 className="text-lg font-bold text-gray-900">IAM 身份与访问控制</h2>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
                  <Save className="w-4 h-4" /> 保存配置
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-5">
                  <h3 className="text-md font-bold text-gray-900 border-l-4 border-blue-500 pl-2">认证与 Token 策略</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Access Token 有效期</label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                      <option>1 小时</option>
                      <option selected>2 小时</option>
                      <option>4 小时</option>
                      <option>12 小时</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Refresh Token 有效期</label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                      <option>1 天</option>
                      <option>3 天</option>
                      <option selected>7 天</option>
                      <option>30 天</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div>
                      <p className="text-sm font-medium text-gray-900">高危操作二次验证 (MFA)</p>
                      <p className="text-xs text-gray-500 mt-0.5">执行删除、发布等操作时强制验证</p>
                    </div>
                    <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
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
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
                  <Save className="w-4 h-4" /> 保存配置
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-md font-bold text-gray-900 border-l-4 border-red-500 pl-2 mb-4">AI 特有安全防护 (OWASP LLM Top 10)</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div>
                        <p className="font-medium text-gray-900">提示注入防护 (LLM01)</p>
                        <p className="text-xs text-gray-500 mt-1">启用语义级注入检测与黑名单过滤，拦截绕过系统提示词的攻击</p>
                      </div>
                      <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div>
                        <p className="font-medium text-gray-900">幻觉控制阈值 (LLM09)</p>
                        <p className="text-xs text-gray-500 mt-1">NLI 一致性评分低于此值将触发拦截或转人工复核</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="number" defaultValue="0.85" step="0.01" min="0" max="1" className="border border-gray-300 rounded-lg px-3 py-1.5 w-24 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div>
                        <p className="font-medium text-gray-900">过度代理防护 (LLM08)</p>
                        <p className="text-xs text-gray-500 mt-1">单次任务最大允许工具调用次数，防止失控 Agent 发起大量副作用操作</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="number" defaultValue="20" min="1" max="100" className="border border-gray-300 rounded-lg px-3 py-1.5 w-24 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                        <span className="text-sm text-gray-500">次/任务</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-md font-bold text-gray-900 border-l-4 border-green-500 pl-2 mb-4">数据安全与隐私保护</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div>
                        <p className="font-medium text-gray-900">个人信息自动脱敏</p>
                        <p className="text-xs text-gray-500 mt-1">在进入 LLM 推理前自动替换姓名、手机号、身份证号、车架号等敏感信息</p>
                      </div>
                      <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div>
                        <p className="font-medium text-gray-900">强制 TLS 1.3 传输加密</p>
                        <p className="text-xs text-gray-500 mt-1">禁止使用 TLS 1.0/1.1 和不安全密码套件，内部 gRPC 启用 mTLS</p>
                      </div>
                      <input type="checkbox" defaultChecked disabled className="w-4 h-4 text-blue-600 rounded opacity-50 cursor-not-allowed" />
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
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
                  <Save className="w-4 h-4" /> 保存配置
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-5">
                  <h3 className="text-md font-bold text-gray-900 border-l-4 border-amber-500 pl-2">在线保留期 (TTL)</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">任务执行记录</label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                      <option>30 天</option>
                      <option selected>90 天</option>
                      <option>180 天</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">到期后归档至对象存储，保留 3 年</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">会话上下文 (Session)</label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                      <option>24 小时</option>
                      <option selected>72 小时</option>
                      <option>7 天</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">过期自动删除，不归档</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">审计日志</label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                      <option>6 个月</option>
                      <option selected>1 年</option>
                      <option>3 年</option>
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

          {/* Tab: API Keys */}
          {activeTab === 'keys' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                <h2 className="text-lg font-bold text-gray-900">API 密钥管理</h2>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
                  <Plus className="w-4 h-4" /> 创建新密钥
                </button>
              </div>

              <div className="bg-amber-50 text-amber-800 text-sm p-4 rounded-lg border border-amber-200 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>请妥善保管您的 API 密钥。密钥仅在创建时完整显示一次。如果密钥泄露，请立即撤销并重新生成。</p>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3">密钥名称</th>
                      <th className="px-4 py-3">密钥前缀</th>
                      <th className="px-4 py-3">权限范围</th>
                      <th className="px-4 py-3">最后使用时间</th>
                      <th className="px-4 py-3">状态</th>
                      <th className="px-4 py-3">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-600">
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-4 font-medium text-gray-900">DLSX 闪修系统对接</td>
                      <td className="px-4 py-4 font-mono text-xs bg-gray-100 rounded px-2 py-1 inline-block mt-2">sk-dlsx-***</td>
                      <td className="px-4 py-4">MCP Hub 调用</td>
                      <td className="px-4 py-4">10 分钟前</td>
                      <td className="px-4 py-4">
                        <span className="flex items-center gap-1 text-green-600 text-xs font-medium"><CheckCircle2 className="w-3 h-3"/> 正常</span>
                      </td>
                      <td className="px-4 py-4">
                        <button className="text-red-600 hover:text-red-800 flex items-center gap-1 text-xs font-medium">
                          <Trash2 className="w-3 h-3" /> 撤销
                        </button>
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-4 font-medium text-gray-900">外部 BI 数据拉取</td>
                      <td className="px-4 py-4 font-mono text-xs bg-gray-100 rounded px-2 py-1 inline-block mt-2">sk-bi-***</td>
                      <td className="px-4 py-4">只读查询</td>
                      <td className="px-4 py-4">2 天前</td>
                      <td className="px-4 py-4">
                        <span className="flex items-center gap-1 text-green-600 text-xs font-medium"><CheckCircle2 className="w-3 h-3"/> 正常</span>
                      </td>
                      <td className="px-4 py-4">
                        <button className="text-red-600 hover:text-red-800 flex items-center gap-1 text-xs font-medium">
                          <Trash2 className="w-3 h-3" /> 撤销
                        </button>
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-4 font-medium text-gray-900">测试环境联调 Key</td>
                      <td className="px-4 py-4 font-mono text-xs bg-gray-100 rounded px-2 py-1 inline-block mt-2">sk-test-***</td>
                      <td className="px-4 py-4">全量权限 (开发环境)</td>
                      <td className="px-4 py-4 text-gray-400">从未调用</td>
                      <td className="px-4 py-4">
                        <span className="flex items-center gap-1 text-green-600 text-xs font-medium"><CheckCircle2 className="w-3 h-3"/> 正常</span>
                      </td>
                      <td className="px-4 py-4">
                        <button className="text-red-600 hover:text-red-800 flex items-center gap-1 text-xs font-medium">
                          <Trash2 className="w-3 h-3" /> 撤销
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
