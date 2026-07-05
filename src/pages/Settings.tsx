import { useEffect, useMemo, useRef, useState } from 'react';
import { Save, Server, Shield, Users, Key, Database, AlertTriangle, CheckCircle2, Copy, Upload, RefreshCw, Boxes } from 'lucide-react';
import { loadConfig, saveConfig, toEnvSnippet, toYamlSnippet, type RuntimeConfig } from '../api/config';
import type { EmbeddingConfigPatch } from '../api/client';
import { useRuntimeConfig } from '../api/hooks';
import { api } from '../api/client';
import LiveBadge from '../components/LiveBadge';
import ApiKeyCenter from '../components/ApiKeyCenter';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('llm');
  const [cfg, setCfg] = useState<RuntimeConfig>(() => loadConfig());
  const [saved, setSaved] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pushMsg, setPushMsg] = useState<string | null>(null);
  const backend = useRuntimeConfig();
  // 标记：是否已从后端完成首次加载（避免 30s 轮询覆盖用户编辑中的内容）
  const hasLoadedFromBackend = useRef(false);

  const g = cfg.gateway;
  const patchGateway = (p: Partial<RuntimeConfig['gateway']>) =>
    setCfg((prev) => ({ ...prev, gateway: { ...prev.gateway, ...p } }));

  /** 从后端实际生效配置同步到表单（api_key 不回填，只显示是否已配置）。*/
  const loadFromBackend = () => {
    const bg = backend.data?.gateway;
    if (!bg) return;
    setCfg((prev) => ({
      ...prev,
      gateway: {
        ...prev.gateway,
        baseUrl: bg.base_url ?? '',
        defaultModel: bg.default_model ?? '',
        timeoutSeconds: bg.timeout_seconds ?? 60,
        maxRetries: bg.max_retries ?? 3,
        modelMapping: bg.model_mapping ?? {},
        // api_key 始终保留用户当前输入（不从后端覆盖）
      },
    }));
  };

  // 首次从后端拿到数据时，自动同步到表单
  useEffect(() => {
    if (!backend.data || hasLoadedFromBackend.current) return;
    hasLoadedFromBackend.current = true;
    loadFromBackend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend.data]);

  // ── 向量化 / Embedding 配置表单 ──
  type EmbForm = {
    enabled: boolean; provider: string;
    ollama: { base_url: string; model: string; dimension: number };
    oneapi: { base_url: string; model: string; dimension: number; api_key: string };
    fallback: { dimension: number };
  };
  const EMB_DEFAULT: EmbForm = {
    enabled: true, provider: 'ollama',
    ollama: { base_url: 'http://localhost:11434', model: 'nomic-embed-text', dimension: 768 },
    oneapi: { base_url: '', model: 'text-embedding-3-small', dimension: 1536, api_key: '' },
    fallback: { dimension: 128 },
  };
  const [emb, setEmb] = useState<EmbForm>(EMB_DEFAULT);
  const [embLoaded, setEmbLoaded] = useState(false);
  const [embSaving, setEmbSaving] = useState(false);
  const [embMsg, setEmbMsg] = useState<string | null>(null);
  const [oneapiKeyConfigured, setOneapiKeyConfigured] = useState(false);
  useEffect(() => {
    const e = backend.data?.embedding;
    if (!e || embLoaded) return;
    setEmb({
      enabled: e.enabled, provider: e.provider,
      ollama: { base_url: e.ollama.base_url, model: e.ollama.model, dimension: e.ollama.dimension },
      oneapi: { base_url: e.oneapi.base_url, model: e.oneapi.model, dimension: e.oneapi.dimension, api_key: '' },
      fallback: { dimension: e.fallback.dimension },
    });
    setOneapiKeyConfigured(!!e.oneapi.api_key_configured);
    setEmbLoaded(true);
  }, [backend.data, embLoaded]);
  const activeDim = backend.data?.embedding?.active_dimension;
  const configuredDim = emb.enabled
    ? (emb.provider === 'ollama' ? emb.ollama.dimension : emb.provider === 'oneapi' ? emb.oneapi.dimension : emb.fallback.dimension)
    : emb.fallback.dimension;
  const dimMismatch = activeDim != null && configuredDim !== activeDim;
  const saveEmbedding = async () => {
    setEmbSaving(true); setEmbMsg(null);
    try {
      const patch: EmbeddingConfigPatch = {
        enabled: emb.enabled, provider: emb.provider,
        ollama: { ...emb.ollama },
        oneapi: { base_url: emb.oneapi.base_url, model: emb.oneapi.model, dimension: emb.oneapi.dimension },
        fallback: { ...emb.fallback },
      };
      if (emb.oneapi.api_key.trim()) patch.oneapi!.api_key = emb.oneapi.api_key.trim();
      await api.updateConfig({ embedding: patch });
      setEmbLoaded(false);
      await backend.refresh();
      setEmbMsg('✅ 已保存。Embedding 变更在服务重启后生效；若维度发生变化，请到「知识中心」对相关向量库执行「重建索引」。');
    } catch (e: any) {
      setEmbMsg(`❌ 保存失败：${e?.message ?? String(e)}`);
    } finally {
      setEmbSaving(false);
      setTimeout(() => setEmbMsg(null), 8000);
    }
  };

  /** 保存到 localStorage（本地持久化）。 */
  const handleSave = () => {
    saveConfig(cfg);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  /** 推送到后端并持久化生效（运行时热更新，无需重启）。 */
  const handlePushToBackend = async () => {
    if (!backend.live) return;
    setPushing(true); setPushMsg(null);
    try {
      // 仅在用户明确输入了新 Key 时才更新 api_key，留空则保留后端原值
      const gatewayPatch: Record<string, unknown> = {
        base_url: g.baseUrl,
        default_model: g.defaultModel,
        timeout_seconds: g.timeoutSeconds,
        max_retries: g.maxRetries,
        model_mapping: g.modelMapping,
      };
      if (g.apiKey.trim()) {
        gatewayPatch['api_key'] = g.apiKey.trim();
      }
      await api.updateConfig({ gateway: gatewayPatch });
      // 重置标记，下次刷新结果后回写到表单
      hasLoadedFromBackend.current = false;
      await backend.refresh();
      setPushMsg('✅ 已推送到后端，运行时立即生效并持久化（重启后仍保留）');
    } catch (e: any) {
      setPushMsg(`❌ 推送失败：${e?.message ?? String(e)}`);
    } finally {
      setPushing(false);
      setTimeout(() => setPushMsg(null), 5000);
    }
  };

  const envSnippet = useMemo(() => toEnvSnippet(g), [g]);
  const yamlSnippet = useMemo(() => toYamlSnippet(g), [g]);
  // 路由映射展示：优先后端实际生效配置，其次本地编辑值
  const routeModel = useMemo(
    () => ({
      default_model: backend.data?.gateway.default_model ?? g.defaultModel,
      model_mapping: backend.data?.gateway.model_mapping ?? g.modelMapping,
    }),
    [backend.data, g.defaultModel, g.modelMapping],
  );
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
              { id: 'embedding', label: '向量化 / Embedding', icon: Boxes },
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
                    <>
                      <button
                        onClick={() => { hasLoadedFromBackend.current = false; backend.refresh(); }}
                        className="border border-gray-300 text-gray-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2"
                        title="从后端重新加载当前生效配置到表单"
                      >
                        <RefreshCw className="w-4 h-4" />
                        从后端刷新
                      </button>
                      <button
                        onClick={handlePushToBackend}
                        disabled={pushing}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        {pushing ? '推送中…' : '推送到后端（热更新）'}
                      </button>
                    </>
                  )}
                  <button
                    onClick={handleSave}
                    className="border border-gray-300 text-gray-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2"
                  >
                    {saved ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Save className="w-4 h-4" />}
                    {saved ? '已保存' : '本地保存'}
                  </button>
                </div>
              </div>

              {pushMsg && (
                <div className={`text-sm px-4 py-3 rounded-lg font-medium ${pushMsg.startsWith('❌') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                  {pushMsg}
                </div>
              )}

              {/* 后端当前生效配置面板（只读反显） */}
              {backend.live && backend.data && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">后端当前生效配置（只读）</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-400">网关 URL</p>
                      <p className="font-mono text-gray-800 text-xs break-all">{backend.data.gateway.base_url || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">默认模型</p>
                      <p className="font-mono text-gray-800 text-xs">{backend.data.gateway.default_model || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">超时 / 重试</p>
                      <p className="font-mono text-gray-800 text-xs">{backend.data.gateway.timeout_seconds}s / {backend.data.gateway.max_retries}次</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">API Key</p>
                      <p className="text-xs">
                        {backend.data.gateway.api_key_configured
                          ? <span className="text-green-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3 inline" /> 已配置</span>
                          : <span className="text-amber-600 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3 inline" /> 未配置</span>}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 编辑表单 */}
              <div className="space-y-4">
                <div className="bg-blue-50 text-blue-800 text-sm p-4 rounded-lg border border-blue-100">
                  修改下方字段后点击「推送到后端（热更新）」即可运行时生效，无需重启服务。配置同时持久化到 <code className="font-mono bg-blue-100 px-1 rounded">data/config_override.json</code>，重启后仍保留。
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">管理后台连接地址（留空走 Nginx 代理）</label>
                    <input
                      value={cfg.backendBaseUrl}
                      onChange={(e) => setCfg((p) => ({ ...p, backendBaseUrl: e.target.value }))}
                      placeholder="留空（当前已通过 Nginx 反代连接后端）"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">LLM 网关 Base URL</label>
                    <input
                      value={g.baseUrl}
                      onChange={(e) => patchGateway({ baseUrl: e.target.value })}
                      placeholder="https://api.deepseek.com"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      API Key
                      {backend.data?.gateway.api_key_configured && (
                        <span className="text-xs text-green-600 font-normal flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> 后端已配置（留空则保留原值）
                        </span>
                      )}
                    </label>
                    <input
                      type="password"
                      value={g.apiKey}
                      onChange={(e) => patchGateway({ apiKey: e.target.value })}
                      placeholder={backend.data?.gateway.api_key_configured ? '（保留后端原值，如需更换请输入新 Key）' : 'sk-...'}
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

                <h3 className="text-md font-bold text-gray-900 border-l-4 border-blue-500 pl-2 pt-2">模型路由映射（model_mapping）</h3>
                <p className="text-xs text-gray-500 -mt-2">
                  网关按「请求模型名 → 实际部署模型」进行路由。未命中映射的请求统一走默认模型。以下为后端当前实际生效的配置。
                </p>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3">请求模型名</th>
                        <th className="px-4 py-3">实际路由到</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-600">
                      <tr>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          默认（未命中映射）
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {routeModel.default_model || '—'}
                        </td>
                      </tr>
                      {Object.entries(routeModel.model_mapping).map(([alias, target]) => (
                        <tr key={alias}>
                          <td className="px-4 py-3 font-mono text-gray-900">{alias}</td>
                          <td className="px-4 py-3 font-mono">{target}</td>
                        </tr>
                      ))}
                      {Object.keys(routeModel.model_mapping).length === 0 && (
                        <tr>
                          <td className="px-4 py-3 text-gray-400" colSpan={2}>
                            未配置额外映射，所有请求均使用默认模型。
                          </td>
                        </tr>
                      )}
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

          {/* Tab: Embedding / 向量化 */}
          {activeTab === 'embedding' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-gray-900">向量化 / Embedding 配置</h2>
                  <LiveBadge live={backend.live} loading={backend.loading} error={backend.error} />
                </div>
                <div className="flex items-center gap-2">
                  {backend.live && (
                    <button
                      onClick={() => { setEmbLoaded(false); backend.refresh(); }}
                      className="border border-gray-300 text-gray-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2"
                      title="从后端重新加载当前生效配置"
                    >
                      <RefreshCw className="w-4 h-4" /> 从后端刷新
                    </button>
                  )}
                  <button
                    onClick={saveEmbedding}
                    disabled={embSaving || !backend.live}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" /> {embSaving ? '保存中…' : '保存并生效'}
                  </button>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  Embedding 变更在服务<strong>重启后</strong>生效。若<strong>维度</strong>或 <strong>provider</strong> 变化，存量向量将与新模型不匹配，
                  须到「知识中心」对相关向量库执行<strong>「重建索引」</strong>（从原文重新分块嵌入）。
                </span>
              </div>

              {dimMismatch && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
                  当前生效维度为 <strong>{activeDim}</strong>，配置维度为 <strong>{configuredDim}</strong>：保存并重启后需重建索引。
                </div>
              )}

              <div className="space-y-5 max-w-2xl">
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={emb.enabled}
                    onChange={e => setEmb(p => ({ ...p, enabled: e.target.checked }))}
                    className="w-4 h-4" />
                  <span className="text-sm font-medium text-gray-800">启用 Embedding（关闭则回退内置确定性向量，仅用于离线/降级）</span>
                </label>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                  <select value={emb.provider}
                    onChange={e => setEmb(p => ({ ...p, provider: e.target.value }))}
                    disabled={!emb.enabled}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100">
                    <option value="ollama">ollama（本地/私有）</option>
                    <option value="oneapi">oneapi（OpenAI 兼容网关）</option>
                    <option value="fallback">fallback（内置确定性向量）</option>
                  </select>
                </div>

                {emb.enabled && emb.provider === 'ollama' && (
                  <div className="grid grid-cols-1 gap-3 border border-gray-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-gray-500">Ollama</p>
                    <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="base_url"
                      value={emb.ollama.base_url} onChange={e => setEmb(p => ({ ...p, ollama: { ...p.ollama, base_url: e.target.value } }))} />
                    <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="model"
                      value={emb.ollama.model} onChange={e => setEmb(p => ({ ...p, ollama: { ...p.ollama, model: e.target.value } }))} />
                    <input type="number" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="dimension"
                      value={emb.ollama.dimension} onChange={e => setEmb(p => ({ ...p, ollama: { ...p.ollama, dimension: Number(e.target.value) || 0 } }))} />
                  </div>
                )}

                {emb.enabled && emb.provider === 'oneapi' && (
                  <div className="grid grid-cols-1 gap-3 border border-gray-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-gray-500">OneAPI（OpenAI 兼容）</p>
                    <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="base_url"
                      value={emb.oneapi.base_url} onChange={e => setEmb(p => ({ ...p, oneapi: { ...p.oneapi, base_url: e.target.value } }))} />
                    <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="model"
                      value={emb.oneapi.model} onChange={e => setEmb(p => ({ ...p, oneapi: { ...p.oneapi, model: e.target.value } }))} />
                    <input type="number" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="dimension"
                      value={emb.oneapi.dimension} onChange={e => setEmb(p => ({ ...p, oneapi: { ...p.oneapi, dimension: Number(e.target.value) || 0 } }))} />
                    <input type="password" className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder={oneapiKeyConfigured ? '（已配置，留空则不修改）' : 'api_key'}
                      value={emb.oneapi.api_key} onChange={e => setEmb(p => ({ ...p, oneapi: { ...p.oneapi, api_key: e.target.value } }))} />
                  </div>
                )}

                {(!emb.enabled || emb.provider === 'fallback') && (
                  <div className="grid grid-cols-1 gap-3 border border-gray-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-gray-500">Fallback（内置确定性向量）</p>
                    <input type="number" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="dimension"
                      value={emb.fallback.dimension} onChange={e => setEmb(p => ({ ...p, fallback: { dimension: Number(e.target.value) || 0 } }))} />
                  </div>
                )}

                {embMsg && (
                  <div className={`text-sm rounded-lg px-3 py-2 ${embMsg.startsWith('✅') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{embMsg}</div>
                )}
              </div>
            </div>
          )}

          {/* Tab: API Keys */}
          {activeTab === 'keys' && <ApiKeyCenter />}

        </div>
      </div>
    </div>
  );
}
