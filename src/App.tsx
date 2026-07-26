/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Overview from './pages/Overview';
import AgentManagement from './pages/AgentManagement';
import RuntimeKernel from './pages/RuntimeKernel';
import MemoryCenter from './pages/MemoryCenter';
import KnowledgeCenter from './pages/KnowledgeCenter';
import BatchManager from './pages/BatchManager';
import SkillRegistry from './pages/SkillRegistry';
import MCPHub from './pages/MCPHub';
import Security from './pages/Security';
import Settings from './pages/Settings';
import DocsSite from './pages/DocsSite';
import TaskConsole from './pages/TaskConsole';
import PromptManagement from './pages/PromptManagement';
import Login from './pages/Login';
import { isAuthenticated } from './auth';

const searchablePages = [
  { id: 'agents', terms: ['智能体', 'agent', '业务智能体'] },
  { id: 'console', terms: ['任务', 'task', '控制台', '执行记录'] },
  { id: 'runtime', terms: ['运行时', '内核', '日志', 'runtime', 'log'] },
  { id: 'overview', terms: ['总览', '大盘', '业务分布', 'overview'] },
  { id: 'memory', terms: ['记忆', 'memory', '黑板'] },
  { id: 'knowledge', terms: ['知识', '知识库', 'knowledge', 'ontology'] },
  { id: 'batch', terms: ['批处理', '运维', 'batch'] },
  { id: 'registry', terms: ['技能', 'skill', 'registry'] },
  { id: 'prompts', terms: ['prompt', '提示词', '版本'] },
  { id: 'mcp', terms: ['mcp', '枢纽'] },
  { id: 'security', terms: ['安全', '合规', 'security'] },
  { id: 'settings', terms: ['系统设置', '设置', '配置', 'settings'] },
  { id: 'docsite', terms: ['文档', '平台文档', '架构', '愿景', '操作手册', '开发手册', 'docs', 'manual'] },
];

export function findPageByQuery(query: string): string | undefined {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return undefined;
  return searchablePages.find(({ terms }) =>
    terms.some((term) => term.toLocaleLowerCase().includes(normalized) || normalized.includes(term.toLocaleLowerCase())),
  )?.id;
}

/** 从 URL hash 解析初始页面（支持深链与截图脚本直达各页）。 */
function pageFromHash(): string {
  const h = window.location.hash.replace(/^#\/?/, '').trim();
  return h || 'overview';
}

export default function App() {
  const [authed, setAuthed] = useState(isAuthenticated);
  const [currentPage, setCurrentPageState] = useState(pageFromHash);

  // 切换页面时同步写入 hash，便于分享与直达。
  const setCurrentPage = (id: string) => {
    setCurrentPageState(id);
    if (window.location.hash.replace(/^#\/?/, '') !== id) {
      window.location.hash = id;
    }
  };

  const handleSearch = (query: string) => {
    const page = findPageByQuery(query);
    if (!page) return false;
    setCurrentPage(page);
    return true;
  };

  // 响应浏览器前进/后退与外部 hash 变更。
  useEffect(() => {
    const onHashChange = () => setCurrentPageState(pageFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (!authed) {
    return <Login onSuccess={() => setAuthed(true)} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'overview': return <Overview onNavigate={setCurrentPage} />;
      case 'agents': return <AgentManagement />;
      case 'runtime': return <RuntimeKernel />;
      case 'memory': return <MemoryCenter />;
      case 'knowledge': return <KnowledgeCenter />;
      case 'blackboard': return <MemoryCenter initialTab="blackboard" />;
      case 'batch': return <BatchManager />;
      case 'ontology': return <KnowledgeCenter initialTab="ontology" />;
      case 'registry': return <SkillRegistry />;
      case 'mcp': return <MCPHub />;
      case 'security': return <Security />;
      case 'settings': return <Settings />;
      // documentation/manual 为旧文档页深链，统一由内嵌文档站承载。
      case 'docsite':
      case 'documentation':
      case 'manual': return <DocsSite />;
      case 'console': return <TaskConsole />;
      case 'prompts': return <PromptManagement />;
      default: return <Overview onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onLogout={() => setAuthed(false)} onSearch={handleSearch} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
