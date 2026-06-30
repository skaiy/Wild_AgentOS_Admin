import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Puzzle, Search, Plus, X, GitBranch, CheckCircle2, AlertCircle, Play, Box, Shield, ShieldCheck, ShieldAlert, ShieldQuestion, Terminal, ArrowRight, Cpu, Boxes } from 'lucide-react';
import { useSkills } from '../api/hooks';
import LiveBadge from '../components/LiveBadge';
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

const mockSkills: SkillCard[] = [
  {
    id: 'sk-001',
    name: 'PDF复杂表格解析',
    description: '基于多模态大模型的PDF复杂表格提取技能，支持跨页表格合并与表头识别。',
    version: 'v2.1.0',
    status: 'published',
    author: 'AI算法组',
    lastUpdate: '2小时前',
    tags: ['多模态', '文档处理'],
    pipeline: 'success'
  },
  {
    id: 'sk-002',
    name: 'VIN码合规校验',
    description: '校验车辆VIN码的规则合法性，并解析出产地、年份、车型等基础信息。',
    version: 'v1.0.4',
    status: 'canary',
    author: '业务研发部',
    lastUpdate: '5小时前',
    tags: ['规则引擎', '车辆业务'],
    pipeline: 'success',
    canaryTraffic: '5%'
  },
  {
    id: 'sk-003',
    name: 'ERP财务对账查询',
    description: '封装金蝶ERP财务对账接口，提供自然语言转SQL的对账单查询能力。',
    version: 'v1.2.0-rc.1',
    status: 'testing',
    author: '财务产研',
    lastUpdate: '10分钟前',
    tags: ['ERP集成', '数据查询'],
    pipeline: 'running'
  },
  {
    id: 'sk-004',
    name: '电池SOH衰减预测',
    description: '基于历史充放电时序数据，预测两轮车电池SOH健康度衰减曲线。',
    version: 'v0.9.0',
    status: 'conflict',
    author: 'IoT数据组',
    lastUpdate: '1天前',
    tags: ['机器学习', 'IoT'],
    pipeline: 'failed',
    conflictMsg: '检测到软冲突：与"电池寿命评估"技能功能重叠',
    scope: 'application' as SkillScope,
  }
].map((s) => ({ ...s, scope: (s as { scope?: SkillScope }).scope ?? resolveScope(s.id) }));

const SCOPE_TABS: { key: 'all' | SkillScope; label: string }[] = [
  { key: 'all', label: '全部技能' },
  { key: 'system', label: '系统级' },
  { key: 'application', label: '应用级' },
];

export default function SkillRegistry() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'create' | 'details' | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<any>(null);
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'all' | SkillScope>('all');

  const { data, live, loading, error } = useSkills();
  const baseList = useMemo(
    () => (live && data?.skills?.length ? data.skills.map(adaptSkill) : mockSkills),
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
  const skills = useMemo(() => {
    let list = baseList;
    if (scope !== 'all') list = list.filter((s) => s.scope === scope);
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (s) => s.name.toLowerCase().includes(q) || s.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [baseList, scope, query]);
  const total = live ? data?.count ?? 0 : 128;

  const openModal = (type: 'create' | 'details', skill: any = null) => {
    setSelectedSkill(skill);
    setModalType(type);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setModalType(null);
      setSelectedSkill(null);
    }, 200);
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
            <p className="text-2xl font-bold text-gray-900">{total}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-xl"><CheckCircle2 className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-gray-500">生产环境发布</p>
            <p className="text-2xl font-bold text-gray-900">105</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><GitBranch className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-gray-500">灰度/金丝雀中</p>
            <p className="text-2xl font-bold text-gray-900">8</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><AlertCircle className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-gray-500">冲突/异常拦截</p>
            <p className="text-2xl font-bold text-gray-900">3</p>
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
                    <div className="bg-blue-50 text-blue-800 text-sm p-4 rounded-lg border border-blue-100 flex items-start gap-3">
                      <Terminal className="w-5 h-5 shrink-0 mt-0.5" />
                      <p>技能包须遵循标准化结构（Git仓库形式），包含 <code>skill.yaml</code>（输入输出Schema、权限需求）、实现代码及单元测试（覆盖率≥80%）。</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Git 仓库地址</label>
                      <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono" placeholder="https://git.dianlvsd.com/ai-skills/pdf-parser.git" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">分支/Tag</label>
                        <input type="text" defaultValue="main" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">技能目录路径</label>
                        <input type="text" defaultValue="/" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">权限申请 (RBAC)</label>
                      <div className="border border-gray-200 rounded-lg p-3 space-y-2 max-h-32 overflow-y-auto bg-gray-50">
                        <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" defaultChecked className="rounded text-blue-600" /> 允许访问外部网络 (白名单)</label>
                        <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" className="rounded text-blue-600" /> 允许读写对象存储 (OSS)</label>
                        <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" className="rounded text-blue-600" /> 允许调用 MCP Hub 接口</label>
                      </div>
                    </div>
                  </div>
                )}

                {modalType === 'details' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{selectedSkill?.name}</h3>
                        <p className="text-sm text-gray-500 font-mono mt-1">版本: {selectedSkill?.version} | 提交者: {selectedSkill?.author}</p>
                      </div>
                      <button className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
                        查看 skill.yaml
                      </button>
                    </div>

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
                  <button onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                    取消
                  </button>
                  <button onClick={closeModal} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                    提交集成
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
