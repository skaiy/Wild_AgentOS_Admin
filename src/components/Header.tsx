import { Bell, Search, LogOut } from 'lucide-react';
import { logout } from '../auth';

interface HeaderProps {
  onLogout?: () => void;
}

export default function Header({ onLogout }: HeaderProps) {
  const handleLogout = () => {
    logout();
    onLogout?.();
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center bg-gray-100 rounded-lg px-3 py-2 w-96">
        <Search className="w-4 h-4 text-gray-400 mr-2" />
        <input 
          type="text" 
          placeholder="搜索智能体、任务、日志..." 
          className="bg-transparent border-none outline-none text-sm w-full text-gray-700 placeholder-gray-400"
        />
      </div>
      <div className="flex items-center gap-4">
        <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>
        <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
          <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-sm">
            Admin
          </div>
          <div className="text-sm">
            <p className="font-medium text-gray-700">系统管理员</p>
          </div>
          <button
            onClick={handleLogout}
            title="退出登录"
            className="ml-2 flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <LogOut className="w-4 h-4" />
            退出
          </button>
        </div>
      </div>
    </header>
  );
}
