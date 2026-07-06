import { useEffect, useState } from 'react';
import { Save, ChevronDown, ChevronRight } from 'lucide-react';
import { api, type RuntimeConfigInfo, type EmbeddingConfigPatch } from '../../api/client';
import type { AsyncState } from '../../api/hooks';

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

/** 高级：原始 Embedding 配置（ollama / oneapi / fallback）。用于私有/离线或不走注册表桥接的场景。 */
export default function EmbeddingAdvancedSection({ backend }: { backend: AsyncState<RuntimeConfigInfo> }) {
  const [open, setOpen] = useState(false);
  const [emb, setEmb] = useState<EmbForm>(EMB_DEFAULT);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [keyConfigured, setKeyConfigured] = useState(false);

  useEffect(() => {
    const e = backend.data?.embedding;
    if (!e || loaded) return;
    setEmb({
      enabled: e.enabled, provider: e.provider,
      ollama: { base_url: e.ollama.base_url, model: e.ollama.model, dimension: e.ollama.dimension },
      oneapi: { base_url: e.oneapi.base_url, model: e.oneapi.model, dimension: e.oneapi.dimension, api_key: '' },
      fallback: { dimension: e.fallback.dimension },
    });
    setKeyConfigured(!!e.oneapi.api_key_configured);
    setLoaded(true);
  }, [backend.data, loaded]);

  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      const patch: EmbeddingConfigPatch = {
        enabled: emb.enabled, provider: emb.provider,
        ollama: { ...emb.ollama },
        oneapi: { base_url: emb.oneapi.base_url, model: emb.oneapi.model, dimension: emb.oneapi.dimension },
        fallback: { ...emb.fallback },
      };
      if (emb.oneapi.api_key.trim()) patch.oneapi!.api_key = emb.oneapi.api_key.trim();
      const res = await api.updateConfig({ embedding: patch });
      setLoaded(false);
      await backend.refresh();
      setMsg(`✅ ${res.message ?? '已保存并即时生效。'}`);
    } catch (e: any) {
      setMsg(`❌ 保存失败：${e?.message ?? String(e)}`);
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 8000);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg">
      <button onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
        <span className="flex items-center gap-2">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          高级：原始 Embedding 配置（ollama / 内置降级）
        </span>
        <span className="text-xs text-gray-400">私有/离线场景</span>
      </button>
      {open && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          <p className="text-xs text-gray-500">
            推荐优先用上方「向量」型号 → <strong>设为生效向量</strong> 桥接。此处用于 ollama 本地嵌入或关闭嵌入（内置确定性向量降级）。保存同样<strong>免重启热切换并自动重建索引</strong>。
          </p>
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={emb.enabled} onChange={(e) => setEmb((p) => ({ ...p, enabled: e.target.checked }))} className="w-4 h-4" />
            <span className="text-sm text-gray-800">启用 Embedding（关闭则回退内置确定性向量，仅离线/降级用）</span>
          </label>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Provider</label>
            <select value={emb.provider} onChange={(e) => setEmb((p) => ({ ...p, provider: e.target.value }))} disabled={!emb.enabled}
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
                value={emb.ollama.base_url} onChange={(e) => setEmb((p) => ({ ...p, ollama: { ...p.ollama, base_url: e.target.value } }))} />
              <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="model"
                value={emb.ollama.model} onChange={(e) => setEmb((p) => ({ ...p, ollama: { ...p.ollama, model: e.target.value } }))} />
              <input type="number" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="dimension"
                value={emb.ollama.dimension} onChange={(e) => setEmb((p) => ({ ...p, ollama: { ...p.ollama, dimension: Number(e.target.value) || 0 } }))} />
            </div>
          )}
          {emb.enabled && emb.provider === 'oneapi' && (
            <div className="grid grid-cols-1 gap-3 border border-gray-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-500">OneAPI（OpenAI 兼容）</p>
              <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="base_url"
                value={emb.oneapi.base_url} onChange={(e) => setEmb((p) => ({ ...p, oneapi: { ...p.oneapi, base_url: e.target.value } }))} />
              <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="model"
                value={emb.oneapi.model} onChange={(e) => setEmb((p) => ({ ...p, oneapi: { ...p.oneapi, model: e.target.value } }))} />
              <input type="number" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="dimension"
                value={emb.oneapi.dimension} onChange={(e) => setEmb((p) => ({ ...p, oneapi: { ...p.oneapi, dimension: Number(e.target.value) || 0 } }))} />
              <input type="password" className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder={keyConfigured ? '（已配置，留空则不修改）' : 'api_key'}
                value={emb.oneapi.api_key} onChange={(e) => setEmb((p) => ({ ...p, oneapi: { ...p.oneapi, api_key: e.target.value } }))} />
            </div>
          )}
          {(!emb.enabled || emb.provider === 'fallback') && (
            <div className="grid grid-cols-1 gap-3 border border-gray-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-500">Fallback（内置确定性向量）</p>
              <input type="number" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="dimension"
                value={emb.fallback.dimension} onChange={(e) => setEmb((p) => ({ ...p, fallback: { dimension: Number(e.target.value) || 0 } }))} />
            </div>
          )}
          {msg && (
            <div className={`text-sm rounded-lg px-3 py-2 ${msg.startsWith('✅') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{msg}</div>
          )}
          <div className="flex justify-end">
            <button onClick={save} disabled={saving || !backend.live}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 flex items-center gap-2">
              <Save className="w-4 h-4" /> {saving ? '保存中…' : '保存并生效'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
