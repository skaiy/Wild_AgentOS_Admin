/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Lock, User, LogIn, ShieldCheck } from 'lucide-react';
import { AUTH_STORAGE_KEY, AUTH_USER, AUTH_PASS } from '../auth';

interface LoginProps {
  onSuccess: () => void;
}

export default function Login({ onSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    // 简单本地校验（演示用）。
    setTimeout(() => {
      if (username.trim() === AUTH_USER && password === AUTH_PASS) {
        localStorage.setItem(AUTH_STORAGE_KEY, '1');
        onSuccess();
      } else {
        setError('用户名或密码错误');
        setLoading(false);
      }
    }, 300);
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-slate-800 to-blue-900 font-sans">
      <div className="w-full max-w-md rounded-2xl bg-white/95 p-8 shadow-2xl backdrop-blur">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl overflow-hidden bg-gray-50 p-2.5 shadow-sm border border-gray-100">
            <img src="/logo_transparent.png" className="h-full w-full object-contain" alt="Wild Agent OS Logo" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Wild Agent OS</h1>
          <p className="mt-1 text-sm text-gray-500">管理控制台登录</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">用户名</label>
            <div className="flex items-center rounded-lg border border-gray-300 bg-gray-50 px-3 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
              <User className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                className="w-full bg-transparent px-3 py-2.5 text-sm text-gray-800 outline-none placeholder-gray-400"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">密码</label>
            <div className="flex items-center rounded-lg border border-gray-300 bg-gray-50 px-3 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
              <Lock className="h-4 w-4 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="w-full bg-transparent px-3 py-2.5 text-sm text-gray-800 outline-none placeholder-gray-400"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            <LogIn className="h-4 w-4" />
            {loading ? '登录中...' : '登 录'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Wild Agent OS · 管理控制台
        </p>
      </div>
    </div>
  );
}
