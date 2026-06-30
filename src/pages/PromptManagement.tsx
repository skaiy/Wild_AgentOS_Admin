/**
 * G6' — Prompt / 模型灰度版本管理页面。
 * 功能：版本列表 / 创建版本 / 激活 / 灰度配置 / 删除。
 */
import { useState } from 'react';
import { GitBranch, Plus, Check, Radio, Trash2, ChevronRight, Zap } from 'lucide-react';
import { usePrompts } from '../api/hooks';
import { api, type PromptVersion } from '../api/client';
import LiveBadge from '../components/LiveBadge';

const EMPTY_FORM = {
  name: '', description: '', template: '', model: '', version: '',
};

export default function PromptManagement() {
  const { data, loading, error, live, refresh } = usePrompts();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [canaryId, setCanaryId] = useState<string | null>(null);
  const [canaryPct, setCanaryPct] = useState(10);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const toast = (ok: boolean, text: string) => { setMsg({ ok, text }); setTimeout(() => setMsg(null), 3000); };

  const handleCreate = async () => {
    if (!form.name || !form.template || !form.model || !form.version) {
      toast(false, '名称、模板、模型、版本号均为必填'); return;
    }
    setBusy(true);
    try {
      await api.createPrompt({ ...form });
      setForm(EMPTY_FORM); setShowCreate(false); await refresh();
      toast(true, '版本已创建');
    } catch (e: any) { toast(false, e.message); } finally { setBusy(false); }
  };

  const handleActivate = async (id: string) => {
    setBusy(true);
    try { await api.activatePrompt(id); await refresh(); toast(true, '已激活'); }
    catch (e: any) { toast(false, e.message); } finally { setBusy(false); }
  };

  const handleCanary = async (id: string) => {
    setBusy(true);
    try { await api.setCanary(id, { percent: canaryPct }); await refresh(); setCanaryId(null); toast(true, `灰度 ${canaryPct}% 已设置`); }
    catch (e: any) { toast(false, e.message); } finally { setBusy(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确认删除此版本？')) return;
    setBusy(true);
    try { await api.deletePrompt(id); await refresh(); toast(true, '已删除'); }
    catch (e: any) { toast(false, e.message); } finally { setBusy(false); }
  };

  const versions: PromptVersion[] = data?.versions ?? [];

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GitBranch className="w-6 h-6 text-gray-600" />
          <h1 className="text-xl font-semibold text-gray-900">Prompt / 模型灰度版本管理</h1>
          <LiveBadge live={live} />
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white text-sm rounded hover:bg-gray-700 transition-colors">
          <Plus className="w-4 h-4" /> 新建版本
        </button>
      </div>

      {/* 全局提示 */}
      {msg && (
        <div className={`text-sm px-4 py-2 rounded border ${msg.ok ? 'bg-gray-50 border-gray-300 text-gray-700' : 'bg-red-50 border-red-300 text-red-700'}`}>
          {msg.text}
        </div>
      )}

      {/* 创建面板 */}
      {showCreate && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-800">新建 Prompt 版本</h2>
          {(['name', 'version', 'model', 'description'] as const).map(k => (
            <div key={k} className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 capitalize">{k}</label>
              <input value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                className="border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-gray-400" />
            </div>
          ))}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">模板内容（Jinja2，支持 {`{{tenant_id}}`} 占位符）</label>
            <textarea rows={4} value={form.template} onChange={e => setForm(f => ({ ...f, template: e.target.value }))}
              className="border border-gray-200 rounded px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-gray-400 resize-none" />
          </div>
          <div className="flex gap-3">
            <button onClick={handleCreate} disabled={busy}
              className="px-4 py-1.5 bg-gray-900 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50">
              {busy ? '提交中…' : '创建'}
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-1.5 border border-gray-200 text-sm rounded hover:bg-gray-50">取消</button>
          </div>
        </div>
      )}

      {/* 版本列表 */}
      {loading && !data && <p className="text-sm text-gray-400">加载中…</p>}
      {error && !live && <p className="text-sm text-red-500">后端离线：{error}（列表为空）</p>}

      <div className="space-y-3">
        {versions.length === 0 && !loading && (
          <p className="text-sm text-gray-400">暂无版本，请点击「新建版本」创建第一个 Prompt。</p>
        )}
        {versions.map(v => (
          <div key={v.id} className={`bg-white border rounded-lg p-4 space-y-2 ${v.is_active ? 'border-gray-800' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 text-sm">{v.name}</span>
                <span className="text-xs text-gray-400 font-mono">v{v.version}</span>
                {v.is_active && <span className="text-xs px-2 py-0.5 bg-gray-900 text-white rounded">生产激活</span>}
                {v.canary_percent > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded flex items-center gap-1">
                    <Zap className="w-3 h-3" /> 灰度 {v.canary_percent}%
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleActivate(v.id)} disabled={busy || v.is_active} title="激活为生产版本"
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-30">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => { setCanaryId(v.id); setCanaryPct(v.canary_percent || 10); }} disabled={busy} title="配置灰度"
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
                  <Radio className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(v.id)} disabled={busy} title="删除"
                  className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="text-xs text-gray-500">{v.description}</div>
            <div className="text-xs text-gray-400 flex gap-3">
              <span>模型：<span className="font-mono text-gray-700">{v.model}</span></span>
              <span>创建：{new Date(v.created_at).toLocaleString('zh-CN')}</span>
            </div>
            <div className="text-xs font-mono text-gray-500 bg-gray-50 rounded px-2 py-1 truncate">{v.template.slice(0, 120)}{v.template.length > 120 ? '…' : ''}</div>

            {/* 灰度滑条 */}
            {canaryId === v.id && (
              <div className="pt-2 border-t border-gray-100 flex items-center gap-4">
                <span className="text-xs text-gray-500 w-20">灰度比例</span>
                <input type="range" min={0} max={100} value={canaryPct} onChange={e => setCanaryPct(+e.target.value)} className="flex-1 accent-gray-800" />
                <span className="text-xs font-mono w-10 text-right">{canaryPct}%</span>
                <button onClick={() => handleCanary(v.id)} disabled={busy}
                  className="px-3 py-1 bg-gray-900 text-white text-xs rounded hover:bg-gray-700 disabled:opacity-50">
                  <ChevronRight className="w-3 h-3" />
                </button>
                <button onClick={() => setCanaryId(null)} className="text-xs text-gray-400 hover:text-gray-600">取消</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
