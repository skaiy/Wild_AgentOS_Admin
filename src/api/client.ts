/**
 * AgentOS 后端 HTTP/SSE 客户端。
 * 与 Rust 后端 (glidinghorse) src/api/http/mod.rs 的路由一一对应。
 */
import { getBackendBase } from './config';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getBackendBase();
  const res = await fetch(`${base}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  const text = await res.text();
  const body = text ? safeJson(text) : null;
  if (!res.ok) {
    const msg = (body && (body.error || body.message)) || res.statusText;
    throw new ApiError(msg || `HTTP ${res.status}`, res.status);
  }
  return body as T;
}

export function safeJson(text: string): any {
  try { return JSON.parse(text); } catch { return text; }
}

// ---------- 响应类型（镜像后端 JSON） ----------
export interface HealthResponse { status: string; version: string }
export interface MetricsResponse {
  l2_nodes: number; l2_bytes: number; events: number;
  subscribers: number; skills: number; checkpoints: number;
}
/** 签名校验状态：与后端 SignatureStatus 枚举对应。 */
export type SignatureStatus = 'verified' | 'invalid' | 'unsigned' | 'no_trust_anchor';
export interface SkillMeta {
  skill_iri: string; name: string; description: string; version: string;
  category: string; security_level: string; allowed_roles: string[];
  input_schema?: unknown; output_schema?: unknown; compiled_template?: string;
  signature?: string | null; signature_algorithm?: string | null;
  /** 后端 list 端点附带的实时验签结果（注册态不返回）。 */
  signature_status?: SignatureStatus;
}
export interface SkillsResponse { count: number; trusted_key_count?: number; skills: SkillMeta[] }
export interface SkillRegisterResponse {
  status: string; skill_iri?: string; signature_status?: SignatureStatus; error?: string;
}
export interface GuardStats {
  total_checks: number; passed_checks: number;
  failed_checks: number; pass_rate: number;
}
export interface GuardAuditEntry {
  timestamp: number;
  tool_name: string;
  agent_id: string;
  pre_injected: boolean;
  validation_passed: boolean;
  retry_count: number;
  error?: string | null;
}
export interface GuardAuditResponse { total: number; entries: GuardAuditEntry[] }
export interface CreateTaskResponse { task_iri: string; status: string }
export interface RealtimeStatus {
  task_iri: string; status: string; current_phase: string;
  current_agent: { id: string; role: string; status: string; turn: number };
  progress: { completed_steps: number; total_steps: number; percentage: number };
}
export interface ExecutionDetails {
  task_iri: string; status: string; current_phase: string;
  plan: { plan_id: string; description: string; steps: unknown[] };
  steps: unknown[]; agent_sessions: unknown[];
  stats: { total_turns: number; total_tool_calls: number; total_tokens: number };
}
export interface KgQueryResponse { status: string; results: unknown[]; count: number }
export interface RuntimeGatewayInfo {
  base_url: string; default_model: string; max_retries: number;
  timeout_seconds: number; model_mapping: Record<string, string>;
  api_key_configured?: boolean;
}
export interface RuntimeConfigInfo {
  version: string;
  gateway: RuntimeGatewayInfo;
  api: { grpc_addr: string; http_addr: string; metrics_port: number };
  memory: { l1_max_messages: number; l2_max_node_size: number };
  agents: { max_iterations: number; max_parallel_agents: number };
}
export interface AgentInfo {
  name: string; description: string; enabled: boolean; business_domain: string;
  id?: string; skills?: string[]; knowledge_graph?: string;
  source?: string; created_at?: string; updated_at?: string;
  icon?: string; color?: string;
}
export interface AgentsResponse {
  count: number; agents: AgentInfo[];
  batch_count?: number; user_count?: number;
}
export interface AgentCreatePayload {
  name: string; description?: string; business_domain?: string;
  skills?: string[]; knowledge_graph?: string; enabled?: boolean;
  icon?: string; color?: string;
}
export interface AgentChatSource { code: string; label: string; brand: string }
export interface AgentChatResponse {
  status: string; answer: string; grounded: boolean;
  sources: AgentChatSource[]; retrieved: number; model?: string; warning?: string;
}
export interface McpServer {
  id: string; name: string; description: string;
  endpoint: string; protocol: string; status: string;
}
export interface McpServersResponse { count: number; servers: McpServer[] }
export interface NodeWriteResponse { node_iri: string; accepted: boolean }
export interface ConfigUpdateResponse { status: string; message: string; config: RuntimeConfigInfo }

// ── G6' Prompt/模型灰度版本 ──
export interface PromptVersion {
  id: string;
  name: string;
  description: string;
  template: string;
  model: string;
  version: string;
  is_active: boolean;
  canary_percent: number;
  canary_tenant_ids: string[];
  canary_roles: string[];
  created_at: string;
}
export interface PromptVersionsResponse {
  count: number;
  active_id: string | null;
  versions: PromptVersion[];
}
export interface ResolvedPrompt {
  version_id: string; name: string; template: string; model: string; is_canary: boolean;
}
export interface CanaryRequest { percent: number; tenant_ids?: string[]; roles?: string[] }

// ── G5 KG 绑定 ──
export interface BindGraphRequest { graph: string; description?: string }
export interface BindGraphResponse { status: string; agent_id: string; graph: string; agent: AgentInfo; bound_by: string }

// ── 知识库分类 + 知识库 ──
export interface KbCategory {
  id: string; name: string; description: string;
  created_at: string; updated_at?: string;
}
export interface KbCategoriesResponse { count: number; categories: KbCategory[] }
export interface KbCategoryCreatePayload { name: string; description?: string }

export type KbType = 'vector' | 'graph';
export interface KnowledgeBase {
  id: string; name: string; description: string; kb_type: KbType;
  category_id: string; graph: string; tenant_id?: string;
  created_by?: string; created_at: string;
}
export interface KnowledgeBasesResponse { count: number; bases: KnowledgeBase[] }
export interface KnowledgeBaseCreatePayload {
  name: string; description?: string; kb_type: KbType; category_id?: string;
}

// ── 本体层（Ontology Layer）只读元模型 ──
/** 属性数据类型：镜像后端 PropertyType（snake_case）。 */
export type PropertyType = 'string' | 'text' | 'integer' | 'number' | 'boolean' | 'date_time' | 'enum';
/** 链接基数：镜像后端 Cardinality（snake_case）。 */
export type Cardinality = 'one_to_one' | 'one_to_many' | 'many_to_one' | 'many_to_many';
/** side-effect 类型：镜像后端 SideEffectKind（snake_case）。 */
export type SideEffectKind = 'create_object' | 'update_property' | 'create_link';

export interface PropertySpec {
  name: string; label: string; prop_type: PropertyType;
  required: boolean; description?: string; enum_values?: string[];
}
export interface ObjectType {
  id: string; iri: string; label: string; description: string;
  icon: string; color: string; primary_key: string;
  title_property: string; properties: PropertySpec[];
}
export interface LinkType {
  id: string; iri: string; label: string; description: string;
  source: string; target: string; cardinality: Cardinality;
}
export interface ActionParam {
  name: string; label: string; prop_type: PropertyType; required: boolean;
}
export interface SideEffect {
  kind: SideEffectKind; target_object_type: string; description: string;
}
export interface ActionType {
  id: string; iri: string; label: string; description: string;
  applies_to: string; parameters: ActionParam[];
  preconditions: string[]; side_effects: SideEffect[]; icon: string;
}
export interface FunctionDef {
  id: string; label: string; description: string;
  applies_to: string; returns: PropertyType; expression: string;
}
export interface OntologyCounts {
  object_types: number; link_types: number; action_types: number; functions: number;
}
export interface OntologyTypesResponse {
  domain: string; counts: OntologyCounts;
  object_types: ObjectType[]; link_types: LinkType[];
  action_types: ActionType[]; functions: FunctionDef[];
}
export interface KnowledgePack {
  id: string; name: string; description: string; version: string;
  icon: string; color: string; named_graph: string;
  vector_namespace: string; ontology_domain: string; stats: OntologyCounts;
}
export interface KnowledgePacksResponse { count: number; knowledge_packs: KnowledgePack[] }

/** 动力层动作调用请求：target=applies_to 对象主键，params=参数键值，dry_run=仅预览不写库。 */
export interface ActionInvokeRequest {
  target?: string;
  params: Record<string, string | number | boolean>;
  dry_run?: boolean;
}
/** 动作调用结果：status 为 ok / dry_run；dry_run 时返回 sparql 预览。 */
export interface ActionInvokeResult {
  status: 'ok' | 'dry_run';
  action: string;
  graph: string;
  applied?: number;
  sparql?: string[];
  result: Record<string, unknown>;
}

// ---------- 端点 ----------
export const api = {
  health: () => request<HealthResponse>('/health'),
  metrics: () => request<MetricsResponse>('/metrics'),
  config: () => request<RuntimeConfigInfo>('/api/v1/config'),
  updateConfig: (patch: { gateway?: Partial<RuntimeGatewayInfo & { api_key: string }> }) =>
    request<ConfigUpdateResponse>('/api/v1/config', {
      method: 'PUT', body: JSON.stringify(patch),
    }),
  skills: () => request<SkillsResponse>('/api/v1/skills'),
  registerSkill: (skill: SkillMeta) =>
    request<SkillRegisterResponse>('/api/v1/skills', {
      method: 'POST', body: JSON.stringify(skill),
    }),
  guardStats: () => request<GuardStats>('/api/v1/guard/stats'),
  guardAudit: () => request<GuardAuditResponse>('/api/v1/guard/audit'),
  createTask: (user_input: string, user_id?: string, session_id?: string) =>
    request<CreateTaskResponse>('/api/v1/tasks', {
      method: 'POST', body: JSON.stringify({ user_input, user_id, session_id }),
    }),
  getTask: (taskIri: string) =>
    request<any>(`/api/v1/tasks/${encodeURIComponent(taskIri)}`),
  taskStatus: (taskIri: string) =>
    request<RealtimeStatus>(`/api/v1/tasks/${encodeURIComponent(taskIri)}/status`),
  taskDetails: (taskIri: string) =>
    request<ExecutionDetails>(`/api/v1/tasks/${encodeURIComponent(taskIri)}/details`),
  emitEvent: (payload: Record<string, unknown>) =>
    request<any>('/api/v1/events', { method: 'POST', body: JSON.stringify(payload) }),
  kgQuery: (sparql: string, named_graph?: string) =>
    request<KgQueryResponse>('/api/v1/kg/query', {
      method: 'POST', body: JSON.stringify({ sparql, named_graph }),
    }),
  kgImport: (nodes: unknown[], edges: unknown[], graph: string, clear_before = true) =>
    request<{ status: string; entity_count: number; relation_count: number }>('/api/v1/kg/import', {
      method: 'POST', body: JSON.stringify({ nodes, edges, graph, clear_before }),
    }),
  writeNode: (task_iri: string, json_ld: string, created_by?: string) =>
    request<NodeWriteResponse>('/api/v1/nodes', {
      method: 'POST', body: JSON.stringify({ task_iri, json_ld, created_by }),
    }),
  readNode: (nodeIri: string) =>
    request<{ found: boolean; json_ld?: string }>(`/api/v1/nodes/${encodeURIComponent(nodeIri)}`),
  getProjection: (task_iri: string, frame_name?: string, params?: Record<string, string>) =>
    request<{ projection: unknown; frame: string; task_iri: string }>('/api/v1/projections', {
      method: 'POST', body: JSON.stringify({ task_iri, frame_name, params }),
    }),
  listAgents: () => request<AgentsResponse>('/api/v1/agents'),
  createAgent: (payload: AgentCreatePayload) =>
    request<{ id: string; status: string; agent: AgentInfo }>('/api/v1/agents', {
      method: 'POST', body: JSON.stringify(payload),
    }),
  updateAgent: (id: string, patch: Partial<AgentCreatePayload>) =>
    request<{ status: string; agent: AgentInfo }>(`/api/v1/agents/${encodeURIComponent(id)}`, {
      method: 'PUT', body: JSON.stringify(patch),
    }),
  deleteAgent: (id: string) =>
    request<{ status: string; id: string }>(`/api/v1/agents/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  listMcpServers: () => request<McpServersResponse>('/api/v1/mcp/servers'),
  registerMcpServer: (name: string, endpoint: string, description?: string, protocol?: string) =>
    request<{ id: string; status: string }>('/api/v1/mcp/servers', {
      method: 'POST', body: JSON.stringify({ name, description, endpoint, protocol }),
    }),
  // ── G5 KG 绑定 ──
  bindAgentGraph: (id: string, payload: BindGraphRequest) =>
    request<BindGraphResponse>(`/api/v1/agents/${encodeURIComponent(id)}/graph`, {
      method: 'POST', body: JSON.stringify(payload),
    }),
  // ── 智能体 RAG 问答（基于绑定知识图谱检索 + LLM 网关）──
  agentChat: (id: string, message: string) =>
    request<AgentChatResponse>(`/api/v1/agents/${encodeURIComponent(id)}/chat`, {
      method: 'POST', body: JSON.stringify({ message }),
    }),
  // ── G6' Prompt 版本管理 ──
  listPrompts: () => request<PromptVersionsResponse>('/api/v1/prompts'),
  createPrompt: (v: Omit<PromptVersion, 'id' | 'created_at' | 'is_active' | 'canary_percent' | 'canary_tenant_ids' | 'canary_roles'>) =>
    request<{ status: string; id: string }>('/api/v1/prompts', {
      method: 'POST', body: JSON.stringify(v),
    }),
  activatePrompt: (id: string) =>
    request<{ status: string; id: string }>(`/api/v1/prompts/${encodeURIComponent(id)}/activate`, {
      method: 'POST',
    }),
  setCanary: (id: string, payload: CanaryRequest) =>
    request<{ status: string; id: string; percent: number }>(`/api/v1/prompts/${encodeURIComponent(id)}/canary`, {
      method: 'PUT', body: JSON.stringify(payload),
    }),
  deletePrompt: (id: string) =>
    request<{ status: string; id: string }>(`/api/v1/prompts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  resolvePrompt: (tenant_id: string, user_id: string, role?: string) =>
    request<{ status: string; resolved: ResolvedPrompt }>(
      `/api/v1/prompts/resolve?tenant_id=${encodeURIComponent(tenant_id)}&user_id=${encodeURIComponent(user_id)}&role=${encodeURIComponent(role ?? '')}`
    ),
  // ── 知识库分类 CRUD ──
  listKbCategories: () => request<KbCategoriesResponse>('/api/v1/kb/categories'),
  createKbCategory: (payload: KbCategoryCreatePayload) =>
    request<{ id: string; status: string; category: KbCategory }>('/api/v1/kb/categories', {
      method: 'POST', body: JSON.stringify(payload),
    }),
  updateKbCategory: (id: string, patch: Partial<KbCategoryCreatePayload>) =>
    request<{ status: string; category: KbCategory }>(`/api/v1/kb/categories/${encodeURIComponent(id)}`, {
      method: 'PUT', body: JSON.stringify(patch),
    }),
  deleteKbCategory: (id: string) =>
    request<{ status: string; id: string }>(`/api/v1/kb/categories/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  // ── 知识库（向量/图）管理 ──
  listKnowledgeBases: () => request<KnowledgeBasesResponse>('/api/v1/kb/bases'),
  createKnowledgeBase: (payload: KnowledgeBaseCreatePayload) =>
    request<{ id: string; status: string; base: KnowledgeBase }>('/api/v1/kb/bases', {
      method: 'POST', body: JSON.stringify(payload),
    }),
  deleteKnowledgeBase: (id: string) =>
    request<{ status: string; id: string }>(`/api/v1/kb/bases/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  // ── 本体层（Ontology Layer）只读元模型 ──
  knowledgePacks: () => request<KnowledgePacksResponse>('/api/v1/knowledge-packs'),
  ontologyTypes: () => request<OntologyTypesResponse>('/api/v1/ontology/types'),
  // ── 动力层：执行动作（dry_run 预览 / 真正写回命名图） ──
  invokeAction: (id: string, body: ActionInvokeRequest) =>
    request<ActionInvokeResult>(`/api/v1/ontology/actions/${encodeURIComponent(id)}/invoke`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

// ---------- SSE：任务流式执行 ----------
export interface StreamHandlers {
  onEvent: (name: string, data: any) => void;
  onError?: (err: unknown) => void;
  onClose?: () => void;
}

export function streamTask(
  body: { prompt: string; task_iri?: string; include_thought?: boolean; include_tool_calls?: boolean },
  handlers: StreamHandlers,
): () => void {
  const controller = new AbortController();
  const base = getBackendBase();
  (async () => {
    try {
      const res = await fetch(`${base}/api/v1/tasks/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new ApiError(res.statusText, res.status);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const frames = buf.split('\n\n');
        buf = frames.pop() ?? '';
        for (const frame of frames) parseSseFrame(frame, handlers);
      }
      handlers.onClose?.();
    } catch (err) {
      if (!controller.signal.aborted) handlers.onError?.(err);
    }
  })();
  return () => controller.abort();
}

export function parseSseFrame(frame: string, handlers: StreamHandlers) {
  let event = 'message';
  const dataLines: string[] = [];
  for (const line of frame.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
  }
  if (!dataLines.length) return;
  const raw = dataLines.join('\n');
  handlers.onEvent(event, safeJson(raw));
}
