/**
 * Wild Agent OS 后端 HTTP/SSE 客户端。
 * 与 Rust 后端 (wild-agent-os-core) src/api/http/mod.rs 的路由一一对应。
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

/** 生成管理台身份头（base64(JSON)），赋予 DA 角色以通过后端 G7 角色校验。 */
function adminIdentityHeader(): string {
  const claims = { user_id: 'admin', tenant_id: 'default', roles: ['DA'] };
  return btoa(JSON.stringify(claims));
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
  /** 权限/技能类型标签（对齐后端 skill_types，用于 skill.yaml permissions）。 */
  skill_types?: string[];
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
  knowledge_pack_ids?: string[];
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
  knowledge_pack_ids?: string[];
  icon?: string; color?: string;
}
export interface AgentChatSource { code: string; label: string; brand: string }
/** 决策层建议动作：将诊断意图映射到动力层 ActionType。requires_business_data=true 表示
 *  需车辆/电池等业务数据（工单系统规划中），前端仅弹窗占位。 */
export interface SuggestedAction {
  action: string; label: string; icon: string; target: string;
  requires_business_data: boolean; reason: string; note?: string;
}
export interface AgentChatResponse {
  status: string; answer: string; grounded: boolean;
  sources: AgentChatSource[]; retrieved: number; vector_retrieved?: number;
  model?: string; warning?: string;
  suggested_actions?: SuggestedAction[];
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
  category_id: string; graph: string; vector_namespace?: string; tenant_id?: string;
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
/** 对象数据归属：knowledge=沉淀于图谱；business=图谱外，未来经 MCP 对接业务库。 */
export type ObjectKind = 'knowledge' | 'business';
export interface ObjectType {
  id: string; iri: string; label: string; description: string;
  icon: string; color: string; primary_key: string;
  title_property: string; kind?: ObjectKind; properties: PropertySpec[];
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
  category_ids?: string[]; graph_kb_ids?: string[]; vector_kb_ids?: string[];
  builtin?: boolean; created_at?: string; updated_at?: string;
}
export interface KnowledgePacksResponse { count: number; knowledge_packs: KnowledgePack[] }
export interface KnowledgePackCreatePayload {
  name: string; description?: string; version?: string; icon?: string; color?: string;
  category_ids?: string[]; graph_kb_ids?: string[]; vector_kb_ids?: string[];
}

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

// ── 方案A 平台运维态：L2 黑板浏览器 + 批处理运维台 ──
export interface BlackboardTask {
  task_iri: string; status: string; node_count: number;
  parent: string | null; children: number;
}
export interface BlackboardTasksResponse { count: number; tasks: BlackboardTask[] }
export interface BlackboardNode {
  iri: string; json_ld: string; size: number; created_at: string;
  created_by?: string | null; tags: string[]; node_type?: string | null;
  dirty: boolean; parent_task?: string | null; named_graph?: string | null;
  jsonld_types: string[];
}
export interface BlackboardNodesResponse { task_iri: string; count: number; nodes: BlackboardNode[] }
export interface BlackboardNodeFilters { role?: string; node_type?: string; cycle_id?: string }

export interface BatchWindowStatus {
  entry_count: number; oldest: string | null; newest: string | null;
  has_summary: boolean; last_trigger: string | null;
}
export interface BatchAgentMetrics {
  total_extractions: number; total_entities_found: number; total_relations_found: number;
  total_tokens_consumed: number; success_count: number; failure_count: number;
  last_outcomes: boolean[];
}
export interface BatchAgentConfigSummary {
  description: string; enabled: boolean; business_domain: string; model?: string | null;
}
/** 镜像后端 BatchAgentStatus 枚举（serde 外部标签：字符串或 { Error: msg }）。 */
export type BatchAgentStatus = 'Registered' | 'Running' | 'Paused' | 'Stopped' | { Error: string };
export interface BatchAgentRow {
  name: string; status: BatchAgentStatus | null;
  window: BatchWindowStatus | null; metrics: BatchAgentMetrics | null;
  config: BatchAgentConfigSummary | null;
}
export interface BatchAgentsResponse { running: boolean; count: number; agents: BatchAgentRow[] }

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
      // 管理台以 DA 角色注册技能（严格鉴权模式下仍可用；非严格模式匿名亦放行）。
      headers: { 'X-Identity': adminIdentityHeader() },
    }),
  /** 获取指定技能的 skill.yaml 文本（后端依据元数据实时生成）。 */
  skillManifest: (iri: string) =>
    request<string>(`/api/v1/skills/manifest?iri=${encodeURIComponent(iri)}`),
  /** skill.yaml 的直连下载 URL（附件形式，带 Content-Disposition）。 */
  skillManifestUrl: (iri: string) =>
    `${getBackendBase()}/api/v1/skills/manifest?iri=${encodeURIComponent(iri)}`,
  /** 从 Git 仓库导入技能（后端 git clone + 解析 skill.yaml + 注册）。 */
  importGitSkill: (params: {
    repo_url: string; ref?: string; path?: string;
    skill_iri?: string; name?: string; description?: string;
    version?: string; category?: string; security_level?: string;
    allowed_roles?: string[]; skill_types?: string[];
  }) =>
    request<SkillRegisterResponse>('/api/v1/skills/import-git', {
      method: 'POST',
      body: JSON.stringify(params),
      headers: { 'X-Identity': adminIdentityHeader() },
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
  ingestKnowledgeBase: (id: string, payload: { texts?: string[]; text?: string }) =>
    request<{ status: string; chunks: number; namespace: string }>(`/api/v1/kb/bases/${encodeURIComponent(id)}/ingest`, {
      method: 'POST', body: JSON.stringify(payload),
    }),
  // ── 本体层（Ontology Layer）只读元模型 ──
  knowledgePacks: () => request<KnowledgePacksResponse>('/api/v1/knowledge-packs'),
  createKnowledgePack: (payload: KnowledgePackCreatePayload) =>
    request<{ id: string; status: string; knowledge_pack: KnowledgePack }>('/api/v1/knowledge-packs', {
      method: 'POST', body: JSON.stringify(payload),
    }),
  updateKnowledgePack: (id: string, patch: Partial<KnowledgePackCreatePayload>) =>
    request<{ status: string; knowledge_pack: KnowledgePack }>(`/api/v1/knowledge-packs/${encodeURIComponent(id)}`, {
      method: 'PUT', body: JSON.stringify(patch),
    }),
  deleteKnowledgePack: (id: string) =>
    request<{ status: string; id: string }>(`/api/v1/knowledge-packs/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  ontologyTypes: () => request<OntologyTypesResponse>('/api/v1/ontology/types'),
  // ── 动力层：执行动作（dry_run 预览 / 真正写回命名图） ──
  invokeAction: (id: string, body: ActionInvokeRequest) =>
    request<ActionInvokeResult>(`/api/v1/ontology/actions/${encodeURIComponent(id)}/invoke`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  // ── 方案A 平台运维态：L2 黑板浏览器（只读）──
  listBlackboardTasks: () => request<BlackboardTasksResponse>('/api/v1/blackboard/tasks'),
  listBlackboardNodes: (taskIri: string, filters?: BlackboardNodeFilters) => {
    const p = new URLSearchParams({ task_iri: taskIri });
    if (filters?.role) p.set('role', filters.role);
    if (filters?.node_type) p.set('node_type', filters.node_type);
    if (filters?.cycle_id) p.set('cycle_id', filters.cycle_id);
    return request<BlackboardNodesResponse>(`/api/v1/blackboard/nodes?${p.toString()}`);
  },
  // ── 方案A 平台运维态：批处理 Agent 运维台 ──
  listBatchAgents: () => request<BatchAgentsResponse>('/api/v1/batch/agents'),
  controlBatchAgent: (name: string, action: 'start' | 'stop') =>
    request<{ name: string; action: string; status: BatchAgentStatus }>(
      `/api/v1/batch/agents/${encodeURIComponent(name)}/control`,
      {
        method: 'POST', body: JSON.stringify({ action }),
        headers: { 'X-Identity': adminIdentityHeader() },
      },
    ),
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
