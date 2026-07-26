import { LayoutDashboard, Bot, Cpu, Database, Network, ShieldCheck, Settings, Puzzle, BookOpen, Terminal, GitBranch, Layers, Layers3 } from 'lucide-react';
import { motion } from 'motion/react';

export const navGroups = [
  {
    label: '业务 Agent 开发',
    items: [
      { id: 'agents', label: '智能体管理', icon: Bot },
      { id: 'knowledge', label: '知识中心', icon: Layers },
      { id: 'registry', label: '技能中心', icon: Puzzle },
      { id: 'prompts', label: 'Prompt版本管理', icon: GitBranch },
      { id: 'mcp', label: 'MCP枢纽', icon: Network },
    ],
  },
  {
    label: '调试监控与运维',
    items: [
      { id: 'console', label: '任务控制台', icon: Terminal },
      { id: 'runtime', label: '运行时内核', icon: Cpu },
      { id: 'memory', label: '记忆中心', icon: Database },
      { id: 'batch', label: '批处理运维', icon: Layers3 },
      { id: 'security', label: '安全与合规', icon: ShieldCheck },
    ],
  },
];

export const homeNavItem = { id: 'overview', label: 'AI Agent 中台总览', icon: LayoutDashboard };

// 平台文档分组：统一由内嵌文档站（docs-site）承载项目说明、版本说明与各类手册。
export const docNavItems = [
  { id: 'docsite', label: '平台文档', icon: BookOpen },
];

export default function Sidebar({ currentPage, setCurrentPage }: any) {
  const renderItem = (item: any) => {
    const Icon = item.icon;
    const isActive = currentPage === item.id;
    return (
      <button
        key={item.id}
        onClick={() => setCurrentPage(item.id)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${
          isActive ? 'text-blue-700 bg-blue-50' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        {isActive && (
          <motion.div
            layoutId="active-nav"
            className="absolute left-0 w-1 h-6 bg-blue-600 rounded-r-full"
            initial={false}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        )}
        <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
        {item.label}
      </button>
    );
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <div className="flex items-center gap-2.5 text-blue-600">
          <img src="/logo_inverted.png" className="w-8 h-8 object-contain" alt="Wild Agent OS Logo" />
          <span className="text-xl font-bold tracking-tight">Wild Agent OS</span>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <div className="mb-4">
          {renderItem(homeNavItem)}
        </div>

        <div className="space-y-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-1 text-xs font-semibold tracking-wider text-gray-400">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map(renderItem)}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 mt-2 border-t border-gray-100">
          <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
            文档中心
          </p>
          {docNavItems.map(renderItem)}
        </div>
      </nav>
      <div className="p-4 border-t border-gray-200">
        <button 
          onClick={() => setCurrentPage('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            currentPage === 'settings' ? 'text-blue-700 bg-blue-50' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <Settings className={`w-5 h-5 ${currentPage === 'settings' ? 'text-blue-600' : 'text-gray-400'}`} />
          系统设置
        </button>
      </div>
    </div>
  );
}
