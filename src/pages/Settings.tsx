import { useState } from 'react';
import { Save, Shield, Users, Key, Database, Cpu } from 'lucide-react';
import ApiKeyCenter from '../components/ApiKeyCenter';
import ModelResources from '../components/ModelResources';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('models');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">系统设置</h1>
        <p className="text-sm text-gray-500 mt-1">模型注册中心（网关路由 / 向量 / 多模态）、IAM 集成与安全策略</p>
      </div>

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

          {/* Tab: Model Registry */}
          {activeTab === 'models' && <ModelResources />}

          {activeTab === 'keys' && <ApiKeyCenter />}

        </div>
      </div>
    </div>
  );
}
