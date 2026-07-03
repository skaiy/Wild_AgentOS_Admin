import { useState } from 'react';
import { Database, Layers, Package, Boxes, Link2, Zap } from 'lucide-react';
import KnowledgeBases from './KnowledgeBases';
import OntologyLayer from './OntologyLayer';
import { useUnifiedStats } from '../api/hooks';
import LiveBadge from '../components/LiveBadge';

type KnowTab = 'bases' | 'ontology';

const TABS: { id: KnowTab; label: string; icon: any }[] = [
  { id: 'bases', label: '知识库', icon: Database },
  { id: 'ontology', label: '知识包与本体', icon: Layers },
];

/** 数值格式化：非 live 时占位。 */
function fmtNum(n: number | null | undefined, live: boolean): string {
  if (!live) return '—';
  if (n == null) return 'N/A';
  return n.toLocaleString();
}

/** 单个汇总统计块。 */
function Stat({ icon: Icon, tone, label, value, sub }: {
  icon: any; tone: string; label: string; value: string; sub?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className={`p-2 rounded-lg ${tone}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xl font-bold text-gray-900 leading-tight">{value}</div>
        <div className="text-xs text-gray-500 truncate">{label}</div>
        {sub && <div className="text-[11px] text-gray-400 truncate">{sub}</div>}
      </div>
    </div>
  );
}

/** 知识中心顶部汇总统计条，数据源 unified-stats 的 knowledge_bases / knowledge_packs / ontology 段。 */
function KnowledgeStatsBar() {
  const stats = useUnifiedStats();
  const live = stats.live;
  const s = stats.data;
  const kb = s?.knowledge_bases;
  const ont = s?.ontology;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-500">业务知识总览</span>
        <LiveBadge live={live} loading={stats.loading} error={stats.error} />
        {live && ont?.domain && (
          <span className="text-[11px] text-gray-400">本体域：{ont.domain}</span>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Stat icon={Database} tone="bg-blue-50 text-blue-600" label="知识库总数"
          value={fmtNum(kb?.total, live)}
          sub={live && kb ? `向量 ${kb.by_type.vector} · 图谱 ${kb.by_type.graph}` : undefined} />
        <Stat icon={Package} tone="bg-indigo-50 text-indigo-600" label="知识包"
          value={fmtNum(s?.knowledge_packs, live)} />
        <Stat icon={Boxes} tone="bg-purple-50 text-purple-600" label="本体对象类型"
          value={fmtNum(ont?.object_types, live)} />
        <Stat icon={Link2} tone="bg-teal-50 text-teal-600" label="本体链接类型"
          value={fmtNum(ont?.link_types, live)} />
        <Stat icon={Zap} tone="bg-amber-50 text-amber-600" label="动作类型"
          value={fmtNum(ont?.action_types, live)} />
        <Stat icon={Layers} tone="bg-rose-50 text-rose-600" label="派生函数"
          value={fmtNum(ont?.functions, live)} />
      </div>
    </div>
  );
}

/** 知识中心：知识库（向量/图谱）+ 知识包与本体层 的统一治理入口。 */
export default function KnowledgeCenter({ initialTab = 'bases' }: { initialTab?: KnowTab }) {
  const [tab, setTab] = useState<KnowTab>(initialTab);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">知识中心 (Knowledge Center)</h1>
        <p className="text-sm text-gray-500 mt-1">业务知识——向量库 / 图谱库、知识包组合体与本体层能力面</p>
      </div>

      <KnowledgeStatsBar />

      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors ${
                active ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'bases' && <KnowledgeBases />}
      {tab === 'ontology' && <OntologyLayer />}
    </div>
  );
}
