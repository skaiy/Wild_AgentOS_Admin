import { useEffect, useState } from 'react';
import { Upload, RefreshCw, CheckCircle2, AlertTriangle, Route } from 'lucide-react';
import { api, type RuntimeConfigInfo } from '../../api/client';
import type { AsyncState } from '../../api/hooks';

/** 路由 / 默认（原 LLM 网关）：未命中注册表型号时的兜底端点与默认模型 + model_mapping。 */
export default function GatewayRoutingSection({ backend }: { backend: AsyncState<RuntimeConfigInfo> }) {
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [defaultModel, setDefaultModel] = useState('');
  const [timeoutSeconds, setTimeoutSeconds] = useState(60);
  const [maxRetries, setMaxRetries] = useState(3);
  const [loaded, setLoaded] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const g = backend.data?.gateway;
    if (!g || loaded) return;
    setBaseUrl(g.base_url ?? '');
    setDefaultModel(g.default_model ?? '');
    setTimeoutSeconds(g.timeout_seconds ?? 60);
    setMaxRetries(g.max_retries ?? 3);
    setLoaded(true);
  }, [backend.data, loaded]);

  const g = backend.data?.gateway;
  const mapping = g?.model_mapping ?? {};

  const push = async () => {
    if (!backend.live) return;
    setPushing(true); setMsg(null);
    try {
      const patch: Record<string, unknown> = {
        base_url: baseUrl, default_model: defaultModel,
        timeout_seconds: timeoutSeconds, max_retries: maxRetries,
      };
      if (apiKey.trim()) patch.api_key = apiKey.trim();
      await api.updateConfig({ gateway: patch });
      setApiKey('');
      setLoaded(false);
      await backend.refresh();
      setMsg('✅ 已推送并即时生效（持久化到 config_override.json）');
    } catch (e: any) {
      setMsg(`❌ 推送失败：${e?.message ?? String(e)}`);
    } finally {
      setPushing(false);
      setTimeout(() => setMsg(null), 6000);
    }
  };

  return (
    <section className="space-y-3 border-t border-gray-200 pt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <Route className="w-4 h-4 text-blue-600" /> 路由 / 默认（兜底网关）
        </h3>
        <button onClick={push} disabled={pushing || !backend.live}
          className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-40 flex items-center gap-1.5">
          <Upload className="w-3.5 h-3.5" /> {pushing ? '推送中…' : '推送网关'}
        </button>
      </div>
      <p className="text-xs text-gray-500">
        当请求的模型未命中上方注册表型号时，网关回退到此默认端点与默认模型。model_mapping 为「请求模型名 → 实际部署模型」的只读映射。
      </p>

      {msg && (
        <div className={`text-sm rounded-lg px-3 py-2 ${msg.startsWith('✅') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{msg}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">网关 Base URL</label>
          <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.deepseek.com"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-2">
            API Key
            {g?.api_key_configured && (
              <span className="text-[11px] text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> 已配置（留空不改）</span>
            )}
          </label>
          <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
            placeholder={g?.api_key_configured ? '（保留后端原值）' : 'sk-...'}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">默认模型</label>
          <input value={defaultModel} onChange={(e) => setDefaultModel(e.target.value)} placeholder="deepseek-chat"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">超时(秒)</label>
            <input type="number" value={timeoutSeconds} onChange={(e) => setTimeoutSeconds(Number(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">最大重试</label>
            <input type="number" value={maxRetries} onChange={(e) => setMaxRetries(Number(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">
            <tr><th className="px-4 py-2">请求模型名</th><th className="px-4 py-2">实际路由到</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-600">
            <tr>
              <td className="px-4 py-2 font-medium text-gray-900">默认（未命中映射）</td>
              <td className="px-4 py-2 font-mono">{g?.default_model || defaultModel || '—'}</td>
            </tr>
            {Object.entries(mapping).map(([alias, target]) => (
              <tr key={alias}>
                <td className="px-4 py-2 font-mono text-gray-900">{alias}</td>
                <td className="px-4 py-2 font-mono">{String(target)}</td>
              </tr>
            ))}
            {Object.keys(mapping).length === 0 && (
              <tr><td className="px-4 py-2 text-gray-400" colSpan={2}>未配置额外映射，所有请求走默认模型。</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {!backend.live && (
        <p className="text-xs text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> 后端未连接，无法推送。</p>
      )}
    </section>
  );
}
