import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Puzzle, Search, Plus, X, GitBranch, CheckCircle2, AlertCircle, Play, Box, Shield, ShieldCheck, ShieldAlert, ShieldQuestion, Terminal, ArrowRight, Cpu, Boxes, Download, FileCode2, Loader2 } from 'lucide-react';
import { useSkills } from '../api/hooks';
import LiveBadge from '../components/LiveBadge';
import { api } from '../api/client';
import type { SkillMeta, SignatureStatus } from '../api/client';

export type SkillScope = 'system' | 'application';

/** 技能卡片的统一展示结构（后端适配与本地兜底数据共用）。 */
export interface SkillCard {
  id: string; name: string; description: string; version: string;
  status: string; author: string; lastUpdate: string; tags: string[];
  pipeline: string; scope: SkillScope;
  allowedRoles?: string[]; signatureStatus?: SignatureStatus;
  conflictMsg?: string; canaryTraffic?: string;
}

/** 依据 skill_iri 前缀判定技能层级：内核内置（iri://）为系统级，其余（skill://…）为应用级。 */
function resolveScope(skillIri: string): SkillScope {
  return skillIri.startsWith('iri://') ? 'system' : 'application';
}

/** 将后端 SkillMeta 适配为卡片所需结构。 */
function adaptSkill(s: SkillMeta): SkillCard {
  return {
    id: s.skill_iri,
    name: s.name,
    description: s.description,
    version: s.version ? (s.version.startsWith('v') ? s.version : `v${s.version}`) : 'v1.0.0',
    status: ((s as unknown as Record<string, unknown>).status ?? 'published') as string,
    author: s.category || 'core',
    lastUpdate: s.security_level || 'standard',
    tags: [s.category, s.security_level, ...(s.allowed_roles || [])].filter(Boolean) as string[],
    pipeline: ((s as unknown as Record<string, unknown>).pipeline ?? 'success') as string,
    allowedRoles: s.allowed_roles || [],
    signatureStatus: s.signature_status as SignatureStatus | undefined,
    conflictMsg: (s as unknown as Record<string, unknown>).conflictMsg as string | undefined,
    canaryTraffic: (s as unknown as Record<string, unknown>).canaryTraffic as string | undefined,
    scope: resolveScope(s.skill_iri),
  };
}

/** 技能层级徽标：系统级（内核内置）/ 应用级（业务注册）。 */
function ScopeBadge({ scope }: { scope: SkillScope }) {
  const map: Record<SkillScope, { label: string; cls: string; Icon: typeof Cpu }> = {
    system: { label: '系统级', cls: 'text-slate-600 bg-slate-50 border-slate-200', Icon: Cpu },
    application: { label: '应用级', cls: 'text-emerald-600 bg-emerald-50 border-emerald-200', Icon: Boxes },
  };
  const { label, cls, Icon } = map[scope];
  return (
    <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md border ${cls}`}>
      <Icon className="w-3.5 h-3.5" /> {label}
    </span>
  );
}

/** 渲染技能签名校验状态徽标（对应后端 Ed25519 验签结果）。 */
function SignatureBadge({ status }: { status?: SignatureStatus }) {
  if (!status) return null;
  const map: Record<SignatureStatus, { label: string; cls: string; Icon: typeof Shield }> = {
    verified: { label: '已验签', cls: 'text-green-600 bg-green-50 border-green-200', Icon: ShieldCheck },
    invalid: { label: '验签失败', cls: 'text-red-600 bg-red-50 border-red-200', Icon: ShieldAlert },
    unsigned: { label: '未签名', cls: 'text-gray-500 bg-gray-50 border-gray-200', Icon: Shield },
    no_trust_anchor: { label: '无信任锚', cls: 'text-amber-600 bg-amber-50 border-amber-200', Icon: ShieldQuestion },
  };
  const { label, cls, Icon } = map[status];
  return (
    <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md border ${cls}`}>
      <Icon className="w-3.5 h-3.5" /> {label}
    </span>
  );
}

const SCOPE_TABS: { key: 'all' | SkillScope; label: string }[] = [
  { key: 'all', label: '全部技能' },
  { key: 'system', label: '系统级' },
  { key: 'application', label: '应用级' },
];

/** 可申请的角色（对齐后端 allowed_roles）。 */
const ROLE_OPTIONS = ['PA', 'DA', 'CA', 'AA', 'USER'] as const;

/** 新建/导入技能表单的初始值。 */
interface CreateForm {
  repo: string; ref: string; path: string;
  skill_iri: string; name: string; description: string;
  version: string; category: string; security_level: string;
  allowed_roles: string[];
  perm_network: boolean; perm_oss: boolean; perm_mcp: boolean;
}
const EMPTY_FORM: CreateForm = {
  repo: '', ref: 'main', path: '/',
  skill_iri: '', name: '', description: '',
  version: '1.0.0', category: '', security_level: 'normal',
  allowed_roles: ['DA'],
  perm_network: true, perm_oss: false, perm_mcp: false,
};

/** 从 Git 仓库地址推导缺省 skill_iri（取仓库名）。 */
function iriFromRepo(repo: string): string {
  const name = repo.trim().replace(/\.git$/i, '').split('/').filter(Boolean).pop();
  return name ? `skill://app/${name}` : '';
}

export default function SkillRegistry() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'create' | 'details' | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<any>(null);
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'all' | SkillScope>('all');

  const { data, live, loading, error, refresh } = useSkills();
  // 新建/导入受控表单状态
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // skill.yaml 预览状态
  const [manifestText, setManifestText] = useState<string | null>(null);
  const [manifestLoading, setManifestLoading] = useState(false);
  const [manifestError, setManifestError] = useState<string | null>(null);
  const baseList = useMemo(
    () => (live && data?.skills?.length ? data.skills.map(adaptSkill) : []),
    [live, data],
  );
  const scopeCounts = useMemo(
    () => ({
      all: baseList.length,
      system: baseList.filter((s) => s.scope === 'system').length,
      application: baseList.filter((s) => s.scope === 'application').length,
    }),
    [baseList],
  );
  // 验签真实统计：已验签技能 / 受信任公钥数 / 验签异常（未签名+失败+无信任锚）。
  const sigStats = useMemo(
    () => ({
      verified: baseList.filter((s) => s.signatureStatus === 'verified').length,
      anomalies: baseList.filter(
        (s) =>
          s.signatureStatus === 'invalid' ||
          s.signatureStatus === 'unsigned' ||
          s.signatureStatus === 'no_trust_anchor',
      ).length,
      trustedKeys: live ? data?.trusted_key_count ?? 0 : 0,
    }),
    [baseList, live, data],
  );
  const skills = useMemo(() => {
    let list = baseList;
    if (scope !== 'all') list = list.filter((s) => s.scope === scope);
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (s) => s.name.toLowerCase().includes(q) || s.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [baseList, scope, query]);
  const total = live ? data?.count ?? 0 : 0;

  const openModal = (type: 'create' | 'details', skill: any = null) => {
    setSelectedSkill(skill);
    setModalType(type);
    if (type === 'create') {
      setForm(EMPTY_FORM);
      setSubmitError(null);
    } else {
      setManifestText(null);
      setManifestError(null);
      setManifestLoading(false);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setModalType(null);
      setSelectedSkill(null);
    }, 200);
  };

  const setField = <K extends keyof CreateForm>(k: K, v: CreateForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleRole = (role: string) =>
    setForm((f) => ({
      ...f,
      allowed_roles: f.allowed_roles.includes(role)
        ? f.allowed_roles.filter((r) => r !== role)
        : [...f.allowed_roles, role],
    }));

  /** 检测是否为 Git 仓库 URL（https/http/git@）。 */
  const isGitUrl = (s: string) => /^(https?:\/\/|git@)/i.test(s.trim());

  /** 校验并提交注册，成功后刷新列表并关闭弹窗。
   *  - 若填写了 Git 仓库地址，调用 /api/v1/skills/import-git（后端 clone + 解析 skill.yaml）
   *  - 否则直接调用 /api/v1/skills（手动填写元数据注册）
   */
  const handleSubmit = async () => {
    const hasGitUrl = isGitUrl(form.repo);
    const iri = form.skill_iri.trim() || iriFromRepo(form.repo);

    // Git 导入模式：name 可选（由后端从 skill.yaml 解析）
    if (!hasGitUrl && !form.name.trim()) { setSubmitError('请填写技能名称'); return; }
    if (!hasGitUrl && !iri) { setSubmitError('请填写 Git 仓库地址或技能 IRI'); return; }
    if (form.allowed_roles.length === 0) { setSubmitError('请至少选择一个可用角色'); return; }
    const perms: string[] = [];
    if (form.perm_network) perms.push('network');
    if (form.perm_oss) perms.push('oss');
    if (form.perm_mcp) perms.push('mcp');
    const payload: SkillMeta = {
      skill_iri: iri,
      name: form.name.trim() || 'unnamed',
      description: form.description.trim(),
      version: form.version.trim() || '1.0.0',
      category: form.category.trim() || 'application',
      security_level: form.security_level,
      allowed_roles: form.allowed_roles,
      input_schema: {},
      output_schema: {},
      compiled_template: '',
      skill_types: perms,
    };
    setSubmitting(true);
    setSubmitError(null);
    try {
      let res: any;
      if (hasGitUrl) {
        // Git 导入模式：后端 clone + 解析 skill.yaml + 注册
        res = await api.importGitSkill({
          repo_url: form.repo.trim(),
          ref: form.ref.trim() || 'main',
          path: form.path.trim() || '.',
          skill_iri: iri || undefined,
          name: form.name.trim() || undefined,
          description: form.description.trim() || undefined,
          version: form.version.trim() || undefined,
          category: form.category.trim() || undefined,
          security_level: form.security_level,
          allowed_roles: form.allowed_roles,
          skill_types: perms,
        });
      } else {
        res = await api.registerSkill(payload);
      }
      if (res.status && res.status !== 'ok') throw new Error(res.error || '注册失败');
      refresh();
      closeModal();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  /** 拉取 skill.yaml 文本用于内联预览。 */
  const loadManifest = async () => {
    if (!selectedSkill?.id) return;
    setManifestLoading(true);
    setManifestError(null);
    try {
      const text = await api.skillManifest(selectedSkill.id);
      setManifestText(typeof text === 'string' ? text : JSON.stringify(text, null, 2));
    } catch (e) {
      setManifestError(e instanceof Error ? e.message : String(e));
    } finally {
      setManifestLoading(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">技能中心 (Skill Registry)</h1>
            <LiveBadge live={live} loading={loading} error={error} />
          </div>
          <p className="text-sm text-gray-500 mt-1">技能包的开发、CI/CD流水线、版本管理与分发加载</p>
        </div>
        <button 
          onClick={() => openModal('create')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> 新建/导入技能
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Puzzle className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-gray-500">已注册技能总数</p>
            <p className="text-2xl font-bold text-gray-900">{live ? total : '—'}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-xl"><ShieldCheck className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-gray-500">已验签技能</p>
            <p className="text-2xl font-bold text-gray-900">{live ? sigStats.verified : '—'}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><Shield className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-gray-500">受信任公钥数</p>
            <p className="text-2xl font-bold text-gray-900">{live ? sigStats.trustedKeys : '—'}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><ShieldAlert className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-gray-500">验签异常</p>
            <p className="text-2xl font-bold text-gray-900">{live ? sigStats.anomalies : '—'}</p>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex gap-2">
          {SCOPE_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setScope(tab.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                scope === tab.key ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              <span className={`text-xs px-1.5 rounded-full ${scope === tab.key ? 'bg-white text-gray-700' : 'bg-gray-100 text-gray-500'}`}>
                {scopeCounts[tab.key]}
              </span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} type="text" placeholder="搜索技能名称、标签..." className="w-full pl-9 pr-4 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {/* Skills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {skills.map((skill, i) => (
          <motion.div
            key={skill.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-all flex flex-col"
          >
            <div className="p-5 flex-1">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${skill.scope === 'system' ? 'bg-slate-100 text-slate-700' : 'bg-emerald-50 text-emerald-600'}`}>
                    {skill.scope === 'system' ? <Cpu className="w-5 h-5" /> : <Box className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{skill.name}</h3>
                    <p className="text-xs text-gray-500">{skill.author} · {skill.lastUpdate}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <ScopeBadge scope={skill.scope} />
                  <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded border border-gray-200">
                    {skill.version}
                  </span>
                  <SignatureBadge status={'signatureStatus' in skill ? skill.signatureStatus : undefined} />
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-4 line-clamp-2 h-10">
                {skill.description}
              </p>

              <div className="flex flex-wrap gap-2 mb-4">
                {skill.tags.map(tag => (
                  <span key={tag} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md border border-blue-100">
                    {tag}
                  </span>
                ))}
              </div>

              {skill.status === 'conflict' && (
                <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 p-2 rounded-md border border-amber-200 mb-4">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{skill.conflictMsg}</span>
                </div>
              )}
            </div>

            <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {skill.status === 'published' && <span className="flex items-center gap-1 text-xs font-medium text-green-600"><CheckCircle2 className="w-4 h-4" /> 已发布</span>}
                {skill.status === 'canary' && <span className="flex items-center gap-1 text-xs font-medium text-purple-600"><GitBranch className="w-4 h-4" /> 灰度中 ({skill.canaryTraffic})</span>}
                {skill.status === 'testing' && <span className="flex items-center gap-1 text-xs font-medium text-blue-600"><Play className="w-4 h-4" /> 测试中</span>}
                {skill.status === 'conflict' && <span className="flex items-center gap-1 text-xs font-medium text-red-600"><X className="w-4 h-4" /> 拦截</span>}
              </div>
              <button 
                onClick={() => openModal('details', skill)}
                className="text-sm text-blue-600 font-medium hover:text-blue-700"
              >
                CI/CD 详情 &rarr;
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {skills.length === 0 && (
        <div className="text-center text-gray-400 py-16 border border-dashed border-gray-200 rounded-xl bg-white">
          {live
            ? '暂无技能，点击右上角「新建/导入技能」注册第一个技能。'
            : '后端未连接，无法加载技能列表。'}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={closeModal}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden relative z-10 flex flex-col"
            >
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                <h2 className="text-lg font-bold text-gray-900">
                  {modalType === 'create' ? '新建/导入技能包' : `技能详情: ${selectedSkill?.name}`}
                </h2>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-200 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                {modalType === 'create' && (
                  <div className="space-y-5">
                    {isGitUrl(form.repo) ? (
                      <div className="bg-green-50 text-green-800 text-sm p-3 rounded-lg border border-green-200 flex items-start gap-2">
                        <span className="text-base">🔗</span>
                        <span><b>Git 导入模式</b>：后端将 <code>git clone</code> 该仓库并自动解析 <code>skill.yaml</code>，下方字段仅作覆盖用途（留空则以仓库内定义为准）。</span>
                      </div>
                    ) : (
                      <div className="bg-blue-50 text-blue-800 text-sm p-3 rounded-lg border border-blue-100 flex items-start gap-2">
                        <Terminal className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>填写 <b>Git 仓库地址</b>（https:// 或 git@）自动触发 Git 导入；或留空手动填写技能元数据直接注册。</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Git 仓库地址 <span className="text-gray-400 font-normal text-xs">（可选，填写后自动 Git 导入）</span></label>
                      <input
                        type="text" value={form.repo}
                        onChange={(e) => setField('repo', e.target.value)}
                        className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono transition-colors ${isGitUrl(form.repo) ? 'border-green-400 bg-green-50' : 'border-gray-300'}`}
                        placeholder="https://git.dianlvsd.com/ai-skills/pdf-parser.git"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">分支/Tag</label>
                        <input type="text" value={form.ref} onChange={(e) => setField('ref', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">技能目录路径</label>
                        <input type="text" value={form.path} onChange={(e) => setField('path', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          技能名称 {!isGitUrl(form.repo) && <span className="text-red-500">*</span>}
                          {isGitUrl(form.repo) && <span className="text-gray-400 font-normal text-xs">（留空则从 skill.yaml 读取）</span>}
                        </label>
                        <input type="text" value={form.name} onChange={(e) => setField('name', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="如：PDF复杂表格解析" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">版本号</label>
                        <input type="text" value={form.version} onChange={(e) => setField('version', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono" placeholder="1.0.0" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">技能描述</label>
                      <textarea value={form.description} onChange={(e) => setField('description', e.target.value)} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" placeholder="简要描述技能的能力与适用场景" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
                        <input type="text" value={form.category} onChange={(e) => setField('category', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="如：文档处理" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">安全级别</label>
                        <select value={form.security_level} onChange={(e) => setField('security_level', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                          <option value="normal">普通 (normal)</option>
                          <option value="sensitive">敏感 (sensitive)</option>
                          <option value="critical">关键 (critical)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">技能 IRI（留空则依据仓库名自动生成）</label>
                      <input type="text" value={form.skill_iri} onChange={(e) => setField('skill_iri', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono" placeholder={iriFromRepo(form.repo) || 'skill://app/your-skill'} />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">可用角色 (RBAC) <span className="text-red-500">*</span></label>
                      <div className="flex flex-wrap gap-2">
                        {ROLE_OPTIONS.map((role) => {
                          const active = form.allowed_roles.includes(role);
                          return (
                            <button
                              key={role} type="button" onClick={() => toggleRole(role)}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                                active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {role}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">权限申请</label>
                      <div className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50">
                        <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.perm_network} onChange={(e) => setField('perm_network', e.target.checked)} className="rounded text-blue-600" /> 允许访问外部网络 (白名单)</label>
                        <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.perm_oss} onChange={(e) => setField('perm_oss', e.target.checked)} className="rounded text-blue-600" /> 允许读写对象存储 (OSS)</label>
                        <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.perm_mcp} onChange={(e) => setField('perm_mcp', e.target.checked)} className="rounded text-blue-600" /> 允许调用 MCP Hub 接口</label>
                      </div>
                    </div>

                    {submitError && (
                      <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 p-3 rounded-lg border border-red-200">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{submitError}</span>
                      </div>
                    )}
                  </div>
                )}

                {modalType === 'details' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{selectedSkill?.name}</h3>
                        <p className="text-sm text-gray-500 font-mono mt-1">版本: {selectedSkill?.version} | 提交者: {selectedSkill?.author}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <button
                          onClick={loadManifest} disabled={manifestLoading}
                          className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-1.5 disabled:opacity-60"
                        >
                          {manifestLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCode2 className="w-4 h-4" />}
                          查看 skill.yaml
                        </button>
                        <a
                          href={api.skillManifestUrl(selectedSkill?.id)} download
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1.5"
                        >
                          <Download className="w-4 h-4" /> 下载 skill.yaml
                        </a>
                      </div>
                    </div>

                    {(manifestText || manifestError) && (
                      <div className="rounded-lg border border-gray-200 overflow-hidden">
                        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-600 flex items-center gap-1.5">
                          <FileCode2 className="w-3.5 h-3.5" /> skill.yaml 预览
                        </div>
                        {manifestError ? (
                          <p className="p-3 text-sm text-red-600">{manifestError}</p>
                        ) : (
                          <pre className="p-3 text-xs bg-gray-900 text-gray-100 overflow-x-auto max-h-64 whitespace-pre">{manifestText}</pre>
                        )}
                      </div>
                    )}

                    <div>
                      <h4 className="text-sm font-bold text-gray-900 mb-4">CI/CD 自动化流水线状态</h4>
                      <div className="relative">
                        {/* Pipeline Line */}
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                        
                        <div className="space-y-6 relative">
                          {/* Step 1 */}
                          <div className="flex items-start gap-4">
                            <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0 z-10 border-2 border-white">
                              <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex-1">
                              <h5 className="text-sm font-bold text-gray-900">代码静态检查 (Lint)</h5>
                              <p className="text-xs text-gray-500 mt-1">耗时: 12s | 规范符合度: 100%</p>
                            </div>
                          </div>

                          {/* Step 2 */}
                          <div className="flex items-start gap-4">
                            <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0 z-10 border-2 border-white">
                              <Shield className="w-4 h-4" />
                            </div>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex-1">
                              <h5 className="text-sm font-bold text-gray-900">安全扫描 (CVE 检查)</h5>
                              <p className="text-xs text-gray-500 mt-1">耗时: 45s | 发现高危漏洞: 0</p>
                            </div>
                          </div>

                          {/* Step 3 */}
                          <div className="flex items-start gap-4">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 border-2 border-white ${
                              selectedSkill?.pipeline === 'success' || selectedSkill?.pipeline === 'canary' ? 'bg-green-100 text-green-600' :
                              selectedSkill?.pipeline === 'running' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'
                            }`}>
                              {selectedSkill?.pipeline === 'running' ? <Play className="w-4 h-4 animate-pulse" /> : 
                               selectedSkill?.pipeline === 'failed' ? <X className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                            </div>
                            <div className={`border rounded-lg p-3 flex-1 ${
                              selectedSkill?.pipeline === 'failed' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                            }`}>
                              <h5 className="text-sm font-bold text-gray-900">单元测试 & 冲突检测</h5>
                              {selectedSkill?.pipeline === 'failed' ? (
                                <p className="text-xs text-red-600 mt-1 font-medium">{selectedSkill?.conflictMsg || '测试覆盖率不足 80%'}</p>
                              ) : (
                                <p className="text-xs text-gray-500 mt-1">覆盖率: 92% | 无接口冲突</p>
                              )}
                            </div>
                          </div>

                          {/* Step 4 */}
                          <div className="flex items-start gap-4">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 border-2 border-white ${
                              selectedSkill?.status === 'published' ? 'bg-green-100 text-green-600' :
                              selectedSkill?.status === 'canary' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'
                            }`}>
                              {selectedSkill?.status === 'published' ? <CheckCircle2 className="w-5 h-5" /> : 
                               selectedSkill?.status === 'canary' ? <GitBranch className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                            </div>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex-1">
                              <h5 className="text-sm font-bold text-gray-900">发布状态 (渐进式加载)</h5>
                              <p className="text-xs text-gray-500 mt-1">
                                {selectedSkill?.status === 'published' ? '已全量发布至生产环境' :
                                 selectedSkill?.status === 'canary' ? `金丝雀发布中，当前流量: ${selectedSkill?.canaryTraffic}` : '等待前置任务完成'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {modalType === 'create' && (
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                  <button onClick={closeModal} disabled={submitting} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60">
                    取消
                  </button>
                  <button onClick={handleSubmit} disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-60">
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {submitting ? '提交中…' : isGitUrl(form.repo) ? '🔗 Git 导入' : '提交集成'}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
