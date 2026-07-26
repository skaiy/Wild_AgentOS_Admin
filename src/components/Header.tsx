import { FormEvent, useEffect, useRef, useState } from 'react';
import { Bell, Search, LogOut } from 'lucide-react';
import { logout } from '../auth';

interface HeaderProps {
  onLogout?: () => void;
  onSearch?: (query: string) => boolean;
}

export default function Header({ onLogout, onSearch }: HeaderProps) {
  const [query, setQuery] = useState('');
  const [searchMessage, setSearchMessage] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!notificationsRef.current?.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const handleLogout = () => {
    logout();
    onLogout?.();
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = query.trim();
    if (!value) {
      setSearchMessage('请输入搜索内容');
      return;
    }
    const found = onSearch?.(value) ?? false;
    setSearchMessage(found ? '' : `未找到“${value}”对应的页面`);
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="relative w-96">
        <form
          onSubmit={handleSearch}
          className="flex items-center bg-gray-100 rounded-lg px-3 py-2"
          role="search"
        >
          <Search className="w-4 h-4 text-gray-400 mr-2" />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSearchMessage('');
            }}
            placeholder="搜索智能体、任务、日志..."
            aria-label="全局搜索"
            className="bg-transparent border-none outline-none text-sm w-full text-gray-700 placeholder-gray-400"
          />
        </form>
        {searchMessage && (
          <div
            role="status"
            className="absolute left-0 top-11 z-30 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500 shadow-lg"
          >
            {searchMessage}
          </div>
        )}
      </div>
      <div className="flex items-center gap-4">
        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            aria-label="通知"
            aria-expanded={showNotifications}
            onClick={() => setShowNotifications((visible) => !visible)}
            className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Bell className="w-5 h-5" />
          </button>
          {showNotifications && (
            <div className="absolute right-0 top-11 z-30 w-72 rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
              <p className="font-medium text-gray-800">通知</p>
              <p className="mt-3 text-sm text-gray-500">暂无通知</p>
            </div>
          )}
        </div>
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
