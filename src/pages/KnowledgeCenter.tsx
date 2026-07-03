import { useState } from 'react';
import { Database, Layers } from 'lucide-react';
import KnowledgeBases from './KnowledgeBases';
import OntologyLayer from './OntologyLayer';

type KnowTab = 'bases' | 'ontology';

const TABS: { id: KnowTab; label: string; icon: any }[] = [
  { id: 'bases', label: '知识库', icon: Database },
  { id: 'ontology', label: '知识包与本体', icon: Layers },
];

/** 知识中心：知识库（向量/图谱）+ 知识包与本体层 的统一治理入口。 */
export default function KnowledgeCenter({ initialTab = 'bases' }: { initialTab?: KnowTab }) {
  const [tab, setTab] = useState<KnowTab>(initialTab);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">知识中心 (Knowledge Center)</h1>
        <p className="text-sm text-gray-500 mt-1">业务知识——向量库 / 图谱库、知识包组合体与本体层能力面</p>
      </div>

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
