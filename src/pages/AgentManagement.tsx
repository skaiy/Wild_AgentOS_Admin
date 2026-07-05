import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, X, Plus, Save, Send, Bot, User, Smartphone, Monitor, MessageSquare, Trash2, Shield, Tag, Wrench, Car, Zap, FileText, Activity, Headset, Battery, MessageCirclePlus, Sparkles, Rocket } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useHealth, useAgents, useSkills, useMcpServers, useRuntimeConfig, useKnowledgePacks } from '../api/hooks';
import { api, type SuggestedAction } from '../api/client';
import LiveBadge from '../components/LiveBadge';
import PublishDrawer from '../components/PublishDrawer';

const ICONS: Record<string, any> = { Bot, User, Smartphone, Monitor, Wrench, Car, Zap, FileText, Activity, Headset, Battery, Shield, MessageCirclePlus, Sparkles };
const COLORS = ['bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-emerald-500', 'bg-indigo-500', 'bg-rose-500', 'bg-slate-800'];






export default function AgentManagement() {
  const [modalType, setModalType] = useState<'create' | 'edit' | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [testingAgent, setTestingAgent] = useState<any>(null);
  const [publishAgent, setPublishAgent] = useState<any>(null);
  // skills 改为 string[] 存储选中的 skill_iri 列表
  const [form, setForm] = useState({ name: '', description: '', business_domain: '', skills: [] as string[], knowledge_pack_ids: [] as string[], icon: 'Bot', color: 'bg-blue-500', version: 'v1.0.0', model: '' });
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  // 测试对话：基于该 Agent 挂载知识包的检索增强问答（POST /api/v1/agents/:id/chat）
  const [chat, setChat] = useState<{ role: 'user' | 'agent' | 'system'; content: string; actions?: SuggestedAction[] }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  // 决策层（Phase 4）：点击建议动作后弹出的占位提示（工单系统规划中）
  const [pendingAction, setPendingAction] = useState<SuggestedAction | null>(null);

  const openModal = (type: 'create' | 'edit', agent: any = null) => {
    setSelectedAgent(agent);
    setActionError(null);
    if (type === 'create') {
      setForm({ name: '', description: '', business_domain: '', skills: [], knowledge_pack_ids: [], icon: 'Bot', color: 'bg-blue-500', version: 'v1.0.0', model: '' });
    } else if (type === 'edit') {
      setForm({
        name: agent?.name ?? '',
        description: agent?.description ?? '',
        business_domain: agent?.business_domain ?? '',
        skills: Array.isArray(agent?.skills) ? agent.skills : [],
        knowledge_pack_ids: Array.isArray(agent?.knowledge_pack_ids) ? agent.knowledge_pack_ids : [],
        icon: agent?.icon ?? 'Bot',
        color: agent?.color ?? 'bg-blue-500',
        version: agent?.version ?? 'v1.0.0',
        model: agent?.model ?? '',
      });
    }
    setModalType(type);
  };

  const toggleSkill = (iri: string) => {
    setForm(f => ({
      ...f,
      skills: f.skills.includes(iri) ? f.skills.filter(s => s !== iri) : [...f.skills, iri],
    }));
  };

  const togglePack = (id: string) => {
    setForm(f => ({
      ...f,
      knowledge_pack_ids: f.knowledge_pack_ids.includes(id)
        ? f.knowledge_pack_ids.filter(x => x !== id)
        : [...f.knowledge_pack_ids, id],
    }));
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedAgent(null);
  };

  const health = useHealth();
  const agentsState = useAgents();
  const skillsState = useSkills();
  const mcpState = useMcpServers();
  const cfgState = useRuntimeConfig();
  const packsState = useKnowledgePacks();
  // 基础模型下拉：来自网关实际配置（默认模型 + model_mapping 别名），不再硬编码
  const gw = cfgState.data?.gateway;
  const availableModels = Array.from(
    new Set([gw?.default_model, ...Object.keys(gw?.model_mapping ?? {})].filter((m): m is string => !!m)),
  );
  const allAgents = agentsState.data?.agents ?? [];
  const batchAgents = allAgents.filter((a) => a.source !== 'user');
  const userAgents = allAgents.filter((a) => a.source === 'user');

  // 切换测试对象时重置对话
  useEffect(() => {
    setStreaming(false);
    setChat([]);
    setChatInput('');
    setPendingAction(null);
  }, [testingAgent]);

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || streaming || !testingAgent?.id) return;
    setChat((c) => [...c, { role: 'user', content: text }]);
    setChatInput('');
    setStreaming(true);
    try {
      const res = await api.agentChat(testingAgent.id, text);
      setChat((c) => [...c, { role: 'agent', content: res.answer || '（无回复）', actions: res.suggested_actions }]);
      if (res.sources && res.sources.length > 0) {
        const src = res.sources.map((s) => s.code + (s.brand ? `·${s.brand}` : '')).join('、');
        setChat((c) => [...c, { role: 'system', content: `引用故障码：${src}（命中 ${res.retrieved} 条）` }]);
      } else if (!res.grounded) {
        setChat((c) => [...c, { role: 'system', content: '未命中知识图谱记录，回答基于通用知识' }]);
      }
      if (res.vector_retrieved && res.vector_retrieved > 0) {
        setChat((c) => [...c, { role: 'system', content: `向量知识库命中 ${res.vector_retrieved} 条并已注入上下文` }]);
      }
      if (res.warning) {
        setChat((c) => [...c, { role: 'system', content: res.warning }]);
      }
    } catch (e) {
      setChat((c) => [...c, { role: 'system', content: `请求失败：${e instanceof Error ? e.message : String(e)}` }]);
    } finally {
      setStreaming(false);
    }
  };

  const handleSaveAgent = async () => {
    if (!form.name.trim()) { setActionError('请填写智能体名称'); return; }
    setSaving(true);
    setActionError(null);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        business_domain: form.business_domain.trim() || undefined,
        knowledge_pack_ids: form.knowledge_pack_ids,
        skills: form.skills,
        icon: form.icon,
        color: form.color,
      };
      if (modalType === 'edit' && selectedAgent?.id && selectedAgent?.source === 'user') {
        await api.updateAgent(selectedAgent.id, payload);
      } else {
        await api.createAgent(payload);
      }
      agentsState.refresh();
      closeModal();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAgent = async (id?: string) => {
    if (!id) return;
    setActionError(null);
    try {
      await api.deleteAgent(id);
      agentsState.refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">业务智能体管理</h1>
            <p className="text-sm text-gray-500 mt-1">管理和监控企业级核心业务智能体</p>
          </div>
          <LiveBadge live={health.live} loading={health.loading} error={health.error} />
        </div>
        <button 
          onClick={() => openModal('create')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> 创建新智能体
        </button>
      </div>

      {/* 后端批处理 Agent 实时列表 */}
      {agentsState.live && batchAgents.length > 0 && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bot className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-800">系统批处理 Agent（实时）</span>
            <span className="text-xs bg-blue-600 text-white rounded-full px-2 py-0.5">{batchAgents.length}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {batchAgents.map((a, i) => (
              <div key={i} className="bg-white rounded-lg p-3 border border-blue-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`w-2 h-2 rounded-full ${a.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <span className="text-xs font-medium text-gray-800 truncate">{a.name}</span>
                </div>
                <div className="text-xs text-gray-500 truncate">{a.business_domain}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 用户态 Agent（前台创建，已落库） */}
      {userAgents.length > 0 && (
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bot className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-800">用户态智能体</span>
            <span className="text-xs bg-emerald-600 text-white rounded-full px-2 py-0.5">{userAgents.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {userAgents.map((a) => (
              <div key={a.id} className="bg-white rounded-lg p-3 border border-emerald-100">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {(() => {
                      const AgentIcon = ICONS[a.icon] || Bot;
                      return (
                        <div className={`w-6 h-6 rounded flex items-center justify-center text-white ${a.color || 'bg-blue-500'} shrink-0 relative`}>
                          <AgentIcon className="w-3.5 h-3.5" />
                          <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${a.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                        </div>
                      );
                    })()}
                    <span className="text-sm font-medium text-gray-800 truncate">{a.name}</span>
                    {a.published && (
                      <span className="text-[10px] bg-blue-100 text-blue-700 rounded px-1.5 py-0.5 shrink-0" title="已对外发布">已发布</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setTestingAgent(a)} className="text-gray-400 hover:text-gray-700 p-1 rounded hover:bg-gray-100" title="测试对话">
                      <MessageSquare className="w-4 h-4" />
                    </button>
                    <button onClick={() => setPublishAgent(a)} className={`p-1 rounded hover:bg-gray-100 ${a.published ? 'text-blue-600' : 'text-gray-400 hover:text-blue-600'}`} title="对外发布">
                      <Rocket className="w-4 h-4" />
                    </button>
                    <button onClick={() => openModal('edit', a)} className="text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-gray-100" title="编辑">
                      <Settings className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteAgent(a.id)} className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-gray-100" title="删除">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1 truncate">{a.description || a.business_domain || '—'}</div>
                {Array.isArray(a.skills) && a.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {a.skills.slice(0, 4).map((s, j) => (
                      <span key={j} className="text-[10px] bg-emerald-100 text-emerald-700 rounded px-1.5 py-0.5">{s}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 无任何智能体时的空状态 */}
      {agentsState.live && batchAgents.length === 0 && userAgents.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center text-center">
          <Bot className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">暂无智能体</p>
          <p className="text-xs text-gray-400 mt-1">点击右上角「创建新智能体」开始</p>
        </div>
      )}

      {/* 后端离线提示 */}
      {!agentsState.live && !agentsState.loading && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center text-center">
          <Bot className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">后端未连接</p>
          <p className="text-xs text-gray-400 mt-1">启动后端服务后将展示真实智能体列表</p>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {modalType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={closeModal}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden relative z-10 flex flex-col"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                <h2 className="text-lg font-bold text-gray-900">
                  {modalType === 'create' ? '创建新智能体' : `编辑智能体: ${selectedAgent?.name}`}
                </h2>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-200 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1">
                {(modalType === 'create' || modalType === 'edit') && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">智能体头像 / 图标主题</label>
                      <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-white ${form.color} shadow-sm shrink-0`}>
                          {(() => {
                            const IconComp = ICONS[form.icon] || Bot;
                            return <IconComp className="w-8 h-8" />;
                          })()}
                        </div>
                        <div className="flex-1 space-y-3 min-w-0">
                          <div className="flex gap-2">
                            {COLORS.map(color => (
                              <button key={color} onClick={() => setForm({ ...form, color })} className={`w-6 h-6 rounded-full ${color} ${form.color === color ? 'ring-2 ring-offset-2 ring-blue-500' : 'hover:scale-110 transition-transform'}`} />
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {Object.keys(ICONS).map(iconName => {
                              const IconComp = ICONS[iconName];
                              return (
                                <button key={iconName} onClick={() => setForm({ ...form, icon: iconName })} className={`p-1.5 rounded-lg border ${form.icon === iconName ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'} transition-colors`}>
                                  <IconComp className="w-4 h-4" />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">智能体名称</label>
                      <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="例如：新能源电池维修助手" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                      <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" rows={3} placeholder="描述智能体的功能和使用场景..."></textarea>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">业务领域 (business_domain)</label>
                      <input type="text" value={form.business_domain} onChange={(e) => setForm({ ...form, business_domain: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="例如：battery_repair" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">关联知识包 (Knowledge Packs)</label>
                      <div className="border border-gray-300 rounded-lg max-h-40 overflow-y-auto divide-y divide-gray-50">
                        {(packsState.data?.knowledge_packs ?? []).length === 0 && (
                          <div className="text-xs text-gray-400 px-3 py-2">暂无知识包，请先在「本体层」创建</div>
                        )}
                        {(packsState.data?.knowledge_packs ?? []).map((p) => (
                          <label key={p.id} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                            <input type="checkbox" checked={form.knowledge_pack_ids.includes(p.id)} onChange={() => togglePack(p.id)} />
                            <span className="font-medium text-gray-800 truncate">{p.name}</span>
                            <span className="text-[11px] text-gray-400">v{p.version}</span>
                            <span className="ml-auto text-[11px] text-gray-400">分类{p.category_ids?.length ?? 0}·图{p.graph_kb_ids?.length ?? 0}·向量{p.vector_kb_ids?.length ?? 0}</span>
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Agent 运行时将检索所选知识包关联的图谱与向量库并注入回答。</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">版本号</label>
                      <input type="text" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="v1.0.0" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">基础模型 (LLM)</label>
                      <select value={form.model || (availableModels[0] ?? '')} onChange={(e) => setForm({ ...form, model: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                        {availableModels.length > 0 ? (
                          availableModels.map((m) => (
                            <option key={m} value={m}>{m === gw?.default_model ? `${m}（网关默认）` : m}</option>
                          ))
                        ) : (
                          <option value="">（网关未配置模型）</option>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">已注册 MCP 工具（实时）</label>
                      <div className="border border-gray-200 rounded-lg p-3 space-y-2 max-h-32 overflow-y-auto bg-gray-50">
                        {!mcpState.live && <div className="text-xs text-gray-400 text-center py-2">后端离线，MCP 列表不可用</div>}
                        {mcpState.live && (mcpState.data?.servers ?? []).length === 0 && <div className="text-xs text-gray-400 text-center py-2">暂无已注册 MCP 服务</div>}
                        {(mcpState.data?.servers ?? []).map((s) => (
                          <div key={s.id} className="flex items-center justify-between text-sm text-gray-700">
                            <span className="truncate">{s.name}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${s.status === 'online' || s.status === 'connected' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>{s.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* G2: 动态 Skill 编排绑定（来自 GET /api/v1/skills） */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-gray-700">挂载技能 Skills（实时注册表）</label>
                        {form.skills.length > 0 && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                            已选 {form.skills.length} 个
                          </span>
                        )}
                      </div>
                      <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                        {skillsState.loading && (
                          <div className="px-3 py-4 text-xs text-gray-400 text-center">加载技能列表…</div>
                        )}
                        {!skillsState.loading && !skillsState.live && (
                          <div className="px-3 py-4 text-xs text-amber-600 text-center">后端离线，技能列表不可用</div>
                        )}
                        {skillsState.live && (skillsState.data?.skills ?? []).length === 0 && (
                          <div className="px-3 py-4 text-xs text-gray-400 text-center">暂无已注册技能</div>
                        )}
                        {skillsState.live && (skillsState.data?.skills ?? []).length > 0 && (
                          <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
                            {(skillsState.data!.skills).map((skill) => {
                              const checked = form.skills.includes(skill.skill_iri);
                              const secColor =
                                skill.security_level === 'critical' ? 'text-red-600 bg-red-50' :
                                skill.security_level === 'high' ? 'text-amber-600 bg-amber-50' :
                                'text-green-600 bg-green-50';
                              return (
                                <label
                                  key={skill.skill_iri}
                                  className={`flex items-start gap-3 px-3 py-2.5 cursor-pointer transition-colors ${checked ? 'bg-blue-50' : 'hover:bg-gray-100'}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleSkill(skill.skill_iri)}
                                    className="mt-0.5 rounded text-blue-600 shrink-0"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-sm font-medium text-gray-800">{skill.name}</span>
                                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded flex items-center gap-0.5 ${secColor}`}>
                                        <Shield className="w-2.5 h-2.5" />{skill.security_level}
                                      </span>
                                      <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                        <Tag className="w-2.5 h-2.5" />{skill.category}
                                      </span>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-0.5 truncate">{skill.description}</div>
                                    {skill.allowed_roles.length > 0 && (
                                      <div className="flex gap-1 mt-1 flex-wrap">
                                        {skill.allowed_roles.map(r => (
                                          <span key={r} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">{r}</span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Modal Footer */}
              {(modalType === 'create' || modalType === 'edit') && (
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
                  {actionError && <span className="text-xs text-red-600 mr-auto">{actionError}</span>}
                  <button onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                    取消
                  </button>
                  <button
                    onClick={handleSaveAgent}
                    disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-60"
                  >
                    <Save className="w-4 h-4" /> {saving ? '保存中…' : modalType === 'edit' ? '更新智能体' : '创建智能体'}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Testing Drawer */}
      <AnimatePresence>
        {testingAgent && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={() => setTestingAgent(null)}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-2xl bg-gray-50 h-full shadow-2xl flex flex-col border-l border-gray-200"
            >
              {/* Drawer Header */}
              <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-3">
                  {(() => {
                    const AgentIcon = ICONS[testingAgent.icon] || Bot;
                    return (
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${testingAgent.color || 'bg-gray-900'} shadow-sm`}>
                        <AgentIcon className="w-5 h-5" />
                      </div>
                    );
                  })()}
                  <div>
                    <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      {testingAgent.name}
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    </h2>
                  </div>
                </div>
                <button onClick={() => setTestingAgent(null)} className="text-gray-400 hover:text-gray-600 p-2 rounded-md hover:bg-gray-100 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Chat Area：真实流式执行日志 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chat.length === 0 && (
                  <div className="text-center text-xs text-gray-400 mt-8">
                    输入消息，基于该智能体绑定的知识图谱进行检索增强问答（RAG）
                  </div>
                )}
                {chat.map((msg, idx) => (
                  <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {msg.role !== 'system' && (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-blue-100 text-blue-600' : (testingAgent?.color || 'bg-gray-900')} text-white`}>
                        {msg.role === 'user' ? (
                          <User className="w-4 h-4" />
                        ) : (() => {
                          const AgentIcon = ICONS[testingAgent?.icon] || Bot;
                          return <AgentIcon className="w-4 h-4" />;
                        })()}
                      </div>
                    )}
                    {msg.role === 'system' ? (
                      <div className="w-full text-center">
                        <span className="inline-block text-[11px] text-gray-500 bg-gray-100 border border-gray-200 rounded px-2 py-1 font-mono">{msg.content}</span>
                      </div>
                    ) : (
                      <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm overflow-hidden ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-sm'}`}>
                          {msg.role === 'user' ? (
                            <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          ) : (
                            <div className="prose prose-sm prose-zinc max-w-none">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {msg.content}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>
                        {/* 决策层（Phase 4）：诊断 → 建议动作（一键执行工单等） */}
                        {msg.role === 'agent' && msg.actions && msg.actions.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] text-gray-400 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />建议动作
                            </span>
                            {msg.actions.map((act) => {
                              const ActIcon = ICONS[act.icon] || Sparkles;
                              return (
                                <button
                                  key={act.action}
                                  onClick={() => setPendingAction(act)}
                                  title={act.reason}
                                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                                >
                                  <ActIcon className="w-3.5 h-3.5" />
                                  {act.label}
                                  {act.requires_business_data && (
                                    <span className="text-[10px] text-amber-600 font-normal">· 规划中</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {streaming && (
                  <div className="text-center text-xs text-gray-400">检索知识图谱并生成回答中…</div>
                )}
              </div>

              {/* Input Area */}
              <div className="p-4 bg-white border-t border-gray-200">
                <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-xl p-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                  <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                    className="w-full bg-transparent border-none outline-none resize-none max-h-32 min-h-[40px] text-sm py-2 text-gray-700 placeholder-gray-400"
                    placeholder="输入消息，回车发送..."
                    rows={1}
                  ></textarea>
                  <button onClick={sendChat} disabled={streaming || !chatInput.trim()} className="p-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors shrink-0 shadow-sm disabled:opacity-50">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex justify-center mt-2 gap-4 text-[10px] text-gray-400">
                  <span>知识图谱检索 + LLM 问答</span>
                  <span>Shift + Enter 换行</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 对外发布抽屉 */}
      <AnimatePresence>
        {publishAgent && (
          <PublishDrawer
            key={publishAgent.id}
            agent={publishAgent}
            onClose={() => setPublishAgent(null)}
            onChanged={() => agentsState.refresh()}
          />
        )}
      </AnimatePresence>

      {/* 决策层（Phase 4）：建议动作执行占位弹窗（工单系统规划中，暂不落库） */}
      <AnimatePresence>
        {pendingAction && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {(() => {
                    const ActIcon = ICONS[pendingAction.icon] || Sparkles;
                    return <ActIcon className="w-5 h-5 text-blue-600" />;
                  })()}
                  <h2 className="font-semibold text-gray-900">{pendingAction.label}</h2>
                </div>
                <button onClick={() => setPendingAction(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="text-sm text-gray-600">
                {pendingAction.reason}
              </div>
              <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-3 py-2 font-mono">
                决策层映射 · ActionType = <span className="text-gray-800">{pendingAction.action}</span>
                {pendingAction.target && <> · target = <span className="text-gray-800">{pendingAction.target}</span></>}
              </div>
              {pendingAction.requires_business_data ? (
                <div className="text-sm px-3 py-2 rounded border bg-amber-50 border-amber-200 text-amber-700">
                  ⚠️ {pendingAction.note || '该动作依赖车辆等业务数据'}。工单系统尚未接入（规划中），此处为决策层占位演示，暂不写回。未来业务库经 MCP 对接后即可一键落单。
                </div>
              ) : (
                <div className="text-sm px-3 py-2 rounded border bg-sky-50 border-sky-200 text-sky-700">
                  该动作可在「本体层 → 动作类型」的执行器中填写参数后写回知识图谱（dry_run 预览 / 真正写回）。
                </div>
              )}
              <div className="flex justify-end pt-1">
                <button onClick={() => setPendingAction(null)}
                  className="px-4 py-2 bg-gray-900 text-white text-sm rounded hover:bg-gray-700 transition-colors">
                  知道了
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
