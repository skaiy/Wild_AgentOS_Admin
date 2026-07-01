import { LayoutDashboard, Bot, Cpu, Database, Network, ShieldCheck, Settings, Puzzle, Book, Terminal, GitBranch, Layers } from 'lucide-react';
import { motion } from 'motion/react';

const navItems = [
  { id: 'overview', label: '总览大盘', icon: LayoutDashboard },
  { id: 'agents', label: '智能体管理', icon: Bot },
  { id: 'runtime', label: '运行时内核', icon: Cpu },
  { id: 'memory', label: '记忆系统', icon: Database },
  { id: 'ontology', label: '本体层', icon: Layers },
  { id: 'registry', label: '技能中心', icon: Puzzle },
  { id: 'prompts', label: 'Prompt版本管理', icon: GitBranch },
  { id: 'mcp', label: 'MCP枢纽', icon: Network },
  { id: 'security', label: '安全与合规', icon: ShieldCheck },
  { id: 'console', label: '任务控制台', icon: Terminal },
  { id: 'documentation', label: '架构与愿景', icon: Book },
];

export default function Sidebar({ currentPage, setCurrentPage }: any) {
  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <div className="flex items-center gap-2 text-blue-600">
          <span className="text-xl font-bold tracking-tight">Wild Agent OS</span>
        </div>
      </div>
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
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
        })}
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
