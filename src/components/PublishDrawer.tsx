import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { X, Copy, Rocket, Globe, CheckCircle2, AlertTriangle, KeyRound } from 'lucide-react';
import { api } from '../api/client';
import { getBackendBase } from '../api/config';
import { useApiClients } from '../api/hooks';

interface Props {
  agent: any;
  onClose: () => void;
  onChanged?: () => void;
}

/** Agent 对外发布抽屉：发布开关 + 调用信息(curl/OpenAI) + 授权调用方。 */
export default function PublishDrawer({ agent, onClose, onChanged }: Props) {
  const clients = useApiClients();
  const [published, setPublished] = useState<boolean>(!!agent?.published);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const base = getBackendBase() || window.location.origin;
  const id = agent?.id as string;

  const grantedClients = useMemo(
    () => (clients.data?.clients || []).filter((c) => c.granted_agent_ids.includes(id)),
    [clients.data, id],
  );

  const nativeCurl = `curl -X POST "${base}/api/v1/public/agents/${id}/chat" \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"message":"你好"}'`;

  const openaiCurl = `curl -X POST "${base}/v1/chat/completions" \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"${id}","messages":[{"role":"user","content":"你好"}]}'`;

  const togglePublish = async () => {
    setErr(null); setBusy(true);
    const next = !published;
    try {
      await api.updateAgent(id, { published: next });
      setPublished(next);
      onChanged?.();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  const copy = (text: string, tag: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(tag); setTimeout(() => setCopied(null), 1500);
    });
  };

  const CodeBlock = ({ text, tag }: { text: string; tag: string }) => (
    <div className="relative">
      <pre className="bg-gray-900 text-gray-100 text-xs rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all">{text}</pre>
      <button onClick={() => copy(text, tag)} className="absolute top-2 right-2 px-2 py-1 rounded bg-gray-700 text-white text-[11px] hover:bg-gray-600 flex items-center gap-1">
        <Copy className="w-3 h-3" /> {copied === tag ? '已复制' : '复制'}
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-2xl bg-gray-50 h-full shadow-2xl flex flex-col border-l border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-gray-900">对外发布 · {agent?.name}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-md hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-sm">
          {err && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {err}
            </div>
          )}

          {/* 发布开关 */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900 flex items-center gap-2"><Globe className="w-4 h-4 text-gray-500" /> 发布状态</div>
              <p className="text-xs text-gray-500 mt-1">开启后，被授权的调用方可通过入站 API 密钥调用此 Agent。</p>
            </div>
            <button onClick={togglePublish} disabled={busy}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${published ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {published ? '已发布（点击下线）' : '未发布（点击发布）'}
            </button>
          </div>

          {/* 调用信息 */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">调用信息</h3>
            <div className="text-xs text-gray-500 space-y-1">
              <div>Base URL：<code className="bg-gray-100 rounded px-1.5 py-0.5">{base}</code></div>
              <div>Model / Agent ID：<code className="bg-gray-100 rounded px-1.5 py-0.5">{id}</code></div>
              <div>鉴权：请求头 <code className="bg-gray-100 rounded px-1.5 py-0.5">Authorization: Bearer &lt;API_KEY&gt;</code>（在「系统设置 → API 密钥治理」签发）</div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-600 mb-1">原生接口（同步）</div>
              <CodeBlock text={nativeCurl} tag="native" />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-600 mb-1">OpenAI 兼容接口</div>
              <CodeBlock text={openaiCurl} tag="openai" />
            </div>
            <p className="text-[11px] text-gray-400">流式：原生接口用 <code>/chat/stream</code>（SSE）；OpenAI 接口在请求体加 <code>"stream": true</code>。</p>
          </div>

          {/* 授权调用方 */}
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2"><KeyRound className="w-4 h-4 text-gray-500" /> 授权调用方（{grantedClients.length}）</h3>
            {grantedClients.length === 0 ? (
              <p className="text-xs text-gray-400">尚无调用方被授权调用此 Agent。请到「系统设置 → API 密钥治理」新建调用方并勾选此 Agent。</p>
            ) : (
              <div className="space-y-1">
                {grantedClients.map((c) => (
                  <div key={c.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
                    <span className="text-sm text-gray-800">{c.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                      <CheckCircle2 className="w-3 h-3" /> {c.status === 'active' ? '启用' : '停用'} · {c.keys.length} 密钥
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
