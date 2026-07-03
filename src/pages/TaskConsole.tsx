import { useCallback, useEffect, useRef, useState } from 'react';
import { Terminal, Play, Square, RefreshCw, CheckCircle2, AlertTriangle, Clock, Brain, Wrench, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api, streamTask, type RealtimeStatus, type ExecutionDetails } from '../api/client';
import LiveBadge from '../components/LiveBadge';
import { useHealth } from '../api/hooks';

interface LogEntry { id: number; time: string; event: string; data: unknown }
interface ThoughtItem { agent_id?: string; thought?: string; action?: string }
interface ToolCallItem { call_id?: string; tool_name?: string; arguments?: unknown; sequence?: number; agent_id?: string; result?: string; success?: boolean }

const fmt = (d: unknown) =>
  typeof d === 'object' ? JSON.stringify(d, null, 2) : String(d ?? '');

const ts = () => new Date().toLocaleTimeString('zh-CN', { hour12: false });

export default function TaskConsole() {
  const health = useHealth();
  const [prompt, setPrompt] = useState('');
  const [userId, setUserId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [taskIri, setTaskIri] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<RealtimeStatus | null>(null);
  const [details, setDetails] = useState<ExecutionDetails | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [thoughts, setThoughts] = useState<ThoughtItem[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCallItem[]>([]);
  const [llmContent, setLlmContent] = useState('');
  const [llmReasoning, setLlmReasoning] = useState('');
  const [livePhase, setLivePhase] = useState<string | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const logId = useRef(0);
  const logEndRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((event: string, data: unknown) => {
    setLogs(prev => [...prev, { id: logId.current++, time: ts(), event, data }]);
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // 轮询状态与明细（任务运行中每 2 秒更新一次）
  useEffect(() => {
    if (!taskIri || !running) return;
    const poll = async () => {
      try {
        const [s, d] = await Promise.all([api.taskStatus(taskIri), api.taskDetails(taskIri)]);
        setStatus(s); setDetails(d);
      } catch { /* 忽略轮询错误 */ }
    };
    poll();
    const t = setInterval(poll, 2000);
    return () => clearInterval(t);
  }, [taskIri, running]);

  const startTask = async () => {
    if (!prompt.trim() || running) return;
    setLogs([]); setStatus(null); setDetails(null); setRunning(true);
    setThoughts([]); setToolCalls([]); setLlmContent(''); setLlmReasoning(''); setLivePhase(null);

    try {
      const sid = sessionId.trim() || `sess_${Date.now()}`;
      if (!sessionId.trim()) setSessionId(sid);
      const uid = userId.trim() || undefined;
      const res = await api.createTask(prompt, uid, sid);
      setTaskIri(res.task_iri);
      addLog('task_created', { task_iri: res.task_iri, user_id: uid ?? null, session_id: sid });

      const stop = streamTask(
        { prompt, task_iri: res.task_iri, include_thought: true, include_tool_calls: true },
        {
          onEvent: (name, data) => {
            addLog(name, data);
            const d = data as any;
            switch (name) {
              case 'llm_content':
                if (d?.is_reasoning) setLlmReasoning(prev => prev + (d?.delta ?? ''));
                else setLlmContent(prev => prev + (d?.delta ?? ''));
                break;
              case 'thought':
                setThoughts(prev => [...prev, { agent_id: d?.agent_id, thought: d?.thought, action: d?.action }]);
                break;
              case 'tool_call':
                setToolCalls(prev => [...prev, { call_id: d?.call_id, tool_name: d?.tool_name, arguments: d?.arguments, sequence: d?.sequence, agent_id: d?.agent_id }]);
                break;
              case 'tool_result':
                setToolCalls(prev => prev.map(t => t.call_id === d?.call_id ? { ...t, result: d?.result, success: d?.success } : t));
                break;
              case 'phase_change':
                if (d?.to_phase) setLivePhase(String(d.to_phase));
                break;
            }
            if (name === 'completion' || name === 'task_completed' || name === 'task_failed') {
              setRunning(false);
              stopRef.current = null;
            }
          },
          onError: (err) => { addLog('error', String(err)); setRunning(false); },
          onClose: () => { addLog('stream_closed', {}); setRunning(false); },
        },
      );
      stopRef.current = stop;
    } catch (err: any) {
      addLog('create_error', err?.message ?? String(err));
      setRunning(false);
    }
  };

  const stopTask = () => {
    stopRef.current?.();
    stopRef.current = null;
    setRunning(false);
    addLog('user_stopped', {});
  };

  const eventColor = (ev: string) => {
    if (ev.includes('error') || ev.includes('fail')) return 'text-red-400';
    if (ev.includes('completed')) return 'text-green-400';
    if (ev.includes('phase')) return 'text-blue-300';
    if (ev.includes('thought')) return 'text-purple-300';
    return 'text-gray-300';
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Terminal className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">任务控制台</h1>
        </div>
        <LiveBadge live={health.live} loading={health.loading} error={health.error} />
      </div>

      {/* 任务输入 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">用户标识 (user_id)</label>
            <input
              type="text"
              value={userId}
              onChange={e => setUserId(e.target.value)}
              disabled={running}
              placeholder="匿名可留空，用于会话隔离"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">会话标识 (session_id)</label>
            <input
              type="text"
              value={sessionId}
              onChange={e => setSessionId(e.target.value)}
              disabled={running}
              placeholder="留空将自动生成 sess_<时间戳>"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>
        </div>
        <label className="block text-sm font-medium text-gray-700">任务描述</label>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={3}
          disabled={running}
          placeholder="输入自然语言任务，Wild Agent OS 将自动规划并执行…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 resize-none"
        />
        <div className="flex items-center gap-3">
          <button
            onClick={startTask}
            disabled={running || !prompt.trim() || !health.live}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            <Play className="w-4 h-4" /> 执行任务
          </button>
          {running && (
            <button onClick={stopTask} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-100 text-red-600 text-sm font-medium hover:bg-red-200 transition-colors">
              <Square className="w-4 h-4" /> 停止
            </button>
          )}
          {logs.length > 0 && !running && (
            <button onClick={() => { setLogs([]); setTaskIri(null); setStatus(null); setDetails(null); setThoughts([]); setToolCalls([]); setLlmContent(''); setLlmReasoning(''); setLivePhase(null); }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors">
              <RefreshCw className="w-4 h-4" /> 清空
            </button>
          )}
          {!health.live && (
            <span className="text-sm text-amber-600 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" /> 后端未连接，请启动后端后再执行
            </span>
          )}
        </div>
      </div>

      {/* 状态卡 */}
      {(status || taskIri) && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs text-gray-500 mb-1">任务 IRI</div>
            <div className="text-xs font-mono text-gray-700 break-all">{taskIri ?? '—'}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs text-gray-500 mb-1">当前阶段</div>
            <div className="font-semibold text-blue-600">{livePhase ?? status?.current_phase ?? '—'}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs text-gray-500 mb-1">进度</div>
            <div className="flex items-center gap-2">
              {running ? <Clock className="w-4 h-4 text-blue-500 animate-spin" style={{ animationDuration: '2s' }} /> : <CheckCircle2 className="w-4 h-4 text-green-500" />}
              <span className="font-semibold">{status ? `${status.progress.percentage}%` : running ? '启动中…' : '—'}</span>
            </div>
          </div>
        </div>
      )}

      {/* 实时执行：模型逐字输出 / 思考链 / 工具调用 */}
      {(running || llmContent || llmReasoning || thoughts.length > 0 || toolCalls.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 模型输出（逐字流式） */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-semibold text-gray-800">模型输出（逐字）</span>
            </div>
            {llmReasoning && (
              <div className="mb-2 rounded-lg bg-purple-50 border border-purple-100 p-2 max-h-40 overflow-y-auto">
                <div className="text-[11px] text-purple-500 mb-1">推理过程</div>
                <div className="text-xs text-purple-800 whitespace-pre-wrap break-words">{llmReasoning}</div>
              </div>
            )}
            <div className="rounded-lg bg-gray-50 border border-gray-100 p-2 flex-1 min-h-24 max-h-60 overflow-y-auto">
              <div className="text-xs text-gray-800 whitespace-pre-wrap break-words">
                {llmContent || <span className="text-gray-400">等待模型输出…</span>}
                {running && <span className="inline-block w-1.5 h-4 align-middle bg-blue-500 ml-0.5 animate-pulse" />}
              </div>
            </div>
          </div>

          {/* 工具调用 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-gray-800">工具调用</span>
              <span className="text-xs text-gray-400">{toolCalls.length}</span>
            </div>
            <div className="flex-1 min-h-24 max-h-60 overflow-y-auto space-y-2">
              {toolCalls.length === 0 && <div className="text-xs text-gray-400 text-center py-6">暂无工具调用</div>}
              {toolCalls.map((t, i) => (
                <div key={t.call_id ?? i} className="rounded-lg border border-gray-100 bg-gray-50 p-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-amber-700">{t.tool_name}</span>
                    {t.result !== undefined ? (
                      t.success ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                    ) : <Clock className="w-3.5 h-3.5 text-blue-400 animate-spin" style={{ animationDuration: '2s' }} />}
                  </div>
                  <div className="text-[11px] font-mono text-gray-500 whitespace-pre-wrap break-all mt-1">{fmt(t.arguments)}</div>
                  {t.result !== undefined && (
                    <div className="text-[11px] font-mono text-gray-700 whitespace-pre-wrap break-all mt-1 max-h-24 overflow-y-auto border-t border-gray-100 pt-1">{String(t.result).slice(0, 800)}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 思考链 */}
          {thoughts.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 lg:col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-semibold text-gray-800">思考链</span>
                <span className="text-xs text-gray-400">{thoughts.length}</span>
              </div>
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {thoughts.map((th, i) => (
                  <div key={i} className="rounded-lg border border-purple-100 bg-purple-50/40 p-2">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px] font-mono text-purple-600">{th.agent_id}</span>
                      {th.action && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">{th.action}</span>}
                    </div>
                    <div className="text-xs text-gray-700 whitespace-pre-wrap break-words">{th.thought}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 执行日志 */}
      <div className="flex-1 bg-gray-900 rounded-xl overflow-hidden flex flex-col min-h-64">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
          <span className="text-xs text-gray-400 font-mono">执行日志</span>
          {running && <span className="flex items-center gap-1 text-xs text-green-400"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />实时流式接收</span>}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-xs">
          {logs.length === 0 && (
            <div className="text-gray-600 text-center py-8">等待任务执行…</div>
          )}
          <AnimatePresence initial={false}>
            {logs.map(log => (
              <motion.div key={log.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex gap-3">
                <span className="text-gray-500 shrink-0">{log.time}</span>
                <span className={`shrink-0 font-semibold ${eventColor(log.event)}`}>[{log.event}]</span>
                <span className="text-gray-300 whitespace-pre-wrap break-all">{fmt(log.data)}</span>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={logEndRef} />
        </div>
      </div>

      {/* 执行明细 */}
      {details && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm font-semibold text-gray-800 mb-2">执行统计</div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><span className="text-gray-500">总轮次：</span>{details.stats.total_turns}</div>
            <div><span className="text-gray-500">工具调用：</span>{details.stats.total_tool_calls}</div>
            <div><span className="text-gray-500">Token 用量：</span>{details.stats.total_tokens.toLocaleString()}</div>
          </div>
        </div>
      )}
    </div>
  );
}
