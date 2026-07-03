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
import Documentation from './pages/Documentation';
import OperationsManual from './pages/OperationsManual';
import TaskConsole from './pages/TaskConsole';
import PromptManagement from './pages/PromptManagement';
import Login from './pages/Login';
import { isAuthenticated } from './auth';

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
      case 'overview': return <Overview />;
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
      case 'documentation': return <Documentation />;
      case 'manual': return <OperationsManual />;
      case 'console': return <TaskConsole />;
      case 'prompts': return <PromptManagement />;
      default: return <Overview />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onLogout={() => setAuthed(false)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
