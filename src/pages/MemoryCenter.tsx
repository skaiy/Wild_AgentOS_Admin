import { useState } from 'react';
import { Database, ClipboardList } from 'lucide-react';
import SystemMemory from './SystemMemory';
import BlackboardBrowser from './BlackboardBrowser';

type MemTab = 'system' | 'blackboard';

const TABS: { id: MemTab; label: string; icon: any }[] = [
  { id: 'system', label: '系统记忆', icon: Database },
  { id: 'blackboard', label: 'L2 黑板', icon: ClipboardList },
];

/** 记忆中心：系统记忆（L0–L3）+ L2 黑板 的统一运维入口。 */
export default function MemoryCenter({ initialTab = 'system' }: { initialTab?: MemTab }) {
  const [tab, setTab] = useState<MemTab>(initialTab);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">记忆中心 (Memory Center)</h1>
        <p className="text-sm text-gray-500 mt-1">系统记忆——Agent 运行时自产的 L0–L3 四层记忆与工作黑板</p>
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

      {tab === 'system' && <SystemMemory />}
      {tab === 'blackboard' && <BlackboardBrowser />}
    </div>
  );
}
