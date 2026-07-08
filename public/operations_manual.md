# Wild Agent OS —— 操作手册与 Agent 开发配置手册

> 版本：v1.5（2026-07-08）　|　适用系统：Wild Agent OS 中台\
> 后端：`wild-agent-os-core/`（Rust · Axum HTTP/SSE + Tonic gRPC）　前端：`wild-agent-os-admin/`（React 19 + Vite 6 + Tailwind 4）\
> 测试环境：`http://112.45.121.74:30010`\
> 读者：**QA 测试小组**（看第 3 篇）· **Agent 开发者**（看第 4 篇）；第 1、2 篇与附录为两类读者共读。
# 📌 版本发布历史与说明

关于 Wild AgentOS 的详细版本演进历史，请查阅下表。平台提供生产级安全网关、多租户工作空间数据隔离，以及先进的智能体认知操作系统内核：

| 版本 | 发布日期 | 核心升级与特性说明 |
|------|----------|-------------------|
| **v1.5** | **2026-07-08** | **认知因果引擎与图治理升级**<br>• **Causal Engine 因果引擎**：新增独立因果分析子系统 `CausalEngine`、`FusionEngine`、`CausalStore` 和类型化的 `CausalFactor`。支持智能体运行的因果推理与多因素融合分析，用于根因识别、故障链传播以及决策因果图谱构建。<br>• **统一图存储后端 (Unified Graph)**：将原零散图读写接口收敛为单一、高性能的 `GraphBackend`。<br>• **图特征计算与相似度**：支持对认知快照进行度中心性、PageRank 等图特征向量计算，并比对计算认知相似度。<br>• **快照时间线 (Snapshot Timeline)**：会话级定点历史恢复与基于 diff 的版本差异回滚。<br>• **技能中心 CRUD 与系统守卫**：支持应用级（`skill://`）技能的新建、详情解析（含 Input/Output Schema）、编辑与删除；对系统级（`iri://`）内置技能执行严格的 **403 只读保护**。 |
| **v1.4** | **2026-07-06** | **统一模型注册中心与向量热桥接**<br>• **三合一收敛**：原「大模型网关」「向量/Embedding」「模型资源」Tab 合并收敛为单一的**模型注册中心**，实现统一管理。<br>• **自动拉取型号**：支持调用外部 `/v1/models` 并根据名称关键词自动对文本、VL、向量等型号进行模态预判。<br>• **向量服务热桥接**：在模型页面直接将型号「设为生效向量」，实现免重启热切换向量库并自动后台重建索引。 |
| **v1.3** | **2026-07-06** | **多模态 (VL) 支持与 Agent 多模型能力挂载**<br>• **多模态智能网关**：支持对 `ChatContent` 中包含的文本与图片（Base64/URL）进行解析，自动路由至多模态大模型。<br>• **能力槽多模型挂载**：支持在 Agent 中挂载不同的型号到对应的功能槽（例如 chat 槽挂载 DeepSeek，vision 槽挂载 Gemini）。 |
| **v1.2** | **2026-07-05** | **知识库多源摄取与统一知识包**<br>• **两阶段数据摄取**：支持向量库多文件上传自动分块与图谱库结构化三元组（CSV/N-Triples）上传到隔离命名图。<br>• **统一知识包挂载**：下线原单值图谱绑定，统一升级为多知识包挂载（`knowledge_pack_ids`），存量数据自动幂等迁移。 |
| **v1.1** | **2026-07-04** | **调用方 API 密钥治理中心与 Agent 一键发布**<br>• **密钥治理中心**：上线「调用方 Client + 密钥」管理面，支持配额限制、安全审计、Token 限制 and 权限 scope 控制。<br>• **OpenAI 兼容网关**：提供一键发布 Agent 按钮，直接生成兼容 OpenAI 格式的调用 URL (`/v1/chat/completions`) 与命令行示例，支持 SSE 流式返回。 |
| **v1.0** | **2026-07-01** | **首个正式版发布 —— 核心系统引擎与 Hyperspace 向量存储**<br>• **HyperspaceEngine 向量引擎**：嵌入式 HNSW 向量数据库，支持 WAL 与 Poincaré/Lorentz 多维空间度量。<br>• **技能图谱与四层记忆**：5W2H 语义技能图谱，带 MESI 一致性协议的 L0-L3 分层记忆缓存。<br>• **工作区监控器**：实时文件监控与 10 种主动感知触发器。 |

---


# 第 0 篇　前言

## 0.1 文档目的与读者对象

本手册为 Wild Agent OS 中台提供两类可落地的操作与开发指引：

- **QA 测试小组**：通过 `30010` Web 控制台，验证平台各功能是否可用、可靠、可追溯，并沉淀测试用例与缺陷。
- **Agent 开发者**：在控制台界面上定义与管理业务智能体（Agent）、配置挂载技能、导入与关联知识库、管理 Prompt 灰度及进行功能测试验证。

## 0.2 阅读指引

| 读者 | 建议路线 |
| :-- | :-- |
| QA 测试小组 | 第 1 篇（建立共同语言）→ 第 2 篇（登录与身份）→ **第 3 篇（逐页操作 + 端到端走查 + 用例验收）** → 附录 A/B |
| Agent 开发者 | 第 1 篇 → 第 2 篇 → **第 4 篇（界面操作与 Agent 定义）** → 附录 A/C |
| 项目/交付 | 第 1 篇 + 第 3.4 用例验收 |

---

# 第 1 篇　系统总览

## 1.1 术语与缩略语

| 术语 | 全称 / 含义 |
| :-- | :-- |
| **Agent** | 智能体。具备特定业务领域、可挂载多个 Skill 与知识库的执行主体 |
| **Skill** | 技能。以 **JSON-LD** 描述的原子/组合能力节点，进入「技能图谱」 |
| **SA/PA/DA/CA/AA** | Supervisor / Plan / Do / Check / Act Agent，五类协作角色 |
| **KG** | Knowledge Graph 知识图谱（What/概念，RDF + SPARQL） |
| **技能图谱** | Skill Graph（How/流程，5W2H 结构 + 向量检索） |
| **5W2H** | what/why/who/when/where/how/howMuch 七维技能语义模型 |
| **MOC** | Map of Content，技能图谱的导航入口节点 |
| **L0/L1/L2/L3** | 四层记忆：永久(sled)/会话(内存)/黑板(Oxigraph)/投影(SPARQL) |
| **IRI** | 全局资源标识，如 `iri://skills/diagnose_fault` |
| **JSON-LD** | Linked Data 的 JSON 表达；本平台 Skill 的标准格式 |
| **RBAC** | 基于角色的访问控制；写操作通常需 `DA` 角色 |
| **SSE** | Server-Sent Events，任务流式日志推送 |
| **MCP** | Model Context Protocol，外部工具接入协议（JSON-RPC） |

## 1.2 系统概述与产品定位

Wild Agent OS 是一套**本体论驱动的工业级 Agent 中台**。它以「知识图谱 + 技能图谱」双图谱为核心，围绕多角色协作的执行内核，提供从 Agent 定义、Skill 开发、知识库构建、Prompt 灰度到安全护栏、多租户隔离的端到端闭环。

![架构与愿景](/manual-assets/09-architecture.png)

**核心能力矩阵（均已端到端落地 ✅）**：

| 能力 | 说明 |
| :-- | :-- |
| no-code 建 Agent | 前台表单创建/编辑/删除，落盘 `data/agents.json`，重启仍在 |
| 多 Skill 聚合 | Agent 可勾选绑定多个 Skill，展示分类/安全级/角色白名单 |
| Skill 数字签名 | Ed25519 验签，四态 `SignatureStatus` |
| 专用知识库 | KG（命名图 + SPARQL）+ 向量 RAG，租户双层隔离 |
| Prompt 灰度 | 版本管理 + 激活 + 按 `hash(user_id)%100` 灰度分流 |
| 安全护栏 | ToolGuard 两阶段校验 + 审计日志 |
| 多租户隔离 | HTTP 身份 → 任务黑板 → 会话/记忆 → KG/向量全链路 |
| 流式执行 | 任务控制台 SSE 实时日志 |

## 1.3 总体架构

### 1.3.1 分层架构

```
┌─ 接入层  HTTP(Axum) / gRPC(Tonic) / SSE 流
├─ 身份层  IAM：JWT(HS256) → X-Identity(base64) → 匿名（三级降级）+ RBAC
├─ 执行层  SupervisorAgent(SA) 调度 → PA 规划 / DA 执行 / CA 审查 / AA 行动
├─ 记忆层  L0 永久(sled) · L1 会话(内存) · L2 黑板(Oxigraph) · L3 投影(SPARQL)
├─ 双图谱  知识图谱(实体/关系) ↔ 技能图谱(5W2H/链接)
└─ 工具层  ToolExecutor · Skill · MCP · Hooks(20点) · ToolGuard · 结果路由
```

### 1.3.2 各层职责

- **接入层**：对外暴露 REST 与 SSE；前端经 Vite 代理直连后端 `:8080`。
- **身份层**：解析调用者身份与租户，注入执行全链路；写端点强制角色校验。
- **执行层**：SA 接收任务并编排 PA→DA→CA→AA 的推理循环，读写任务黑板。
- **记忆层**：分层存储会话、知识与投影，支撑上下文与租户隔离。
- **双图谱**：知识图谱回答「是什么」，技能图谱回答「怎么做」，互相桥接。
- **工具层**：统一工具执行入口，含内置工具、Skill、MCP、护栏与结果路由。

## 1.4 核心概念

### 1.4.1 Agent 角色体系（SA·PA·DA·CA·AA）

| 角色 | 职责 | 工具权限（要点） |
| :-- | :-- | :-- |
| **SA** Supervisor | 接收任务、编排全流程、读写黑板 | 调度为主 |
| **PA** Plan | 规划、检索、只读分析 | 仅只读工具（file_read/search/rag/knowledge_* 查询类） |
| **DA** Do | 执行、写文件、调用技能 | 读写 + Web + Code + Skill；**写端点需 DA 角色** |
| **CA** Check | 审查、校验、质量把关 | 只读 + 知识查询 |
| **AA** Act | 对外行动、落地执行 | Core + System |

> ⚠️ RBAC 关键：技能注册、Prompt 创建/激活/灰度、KG 导入等**写操作**在严格模式下要求调用者具备 `DA` 角色（见 2.3）。

### 1.4.2 知识图谱 vs 技能图谱

| 维度 | 知识图谱（KG） | 技能图谱（Skill Graph） |
| :-- | :-- | :-- |
| 回答 | What / 概念 | How / 流程 |
| 描述 | RDF 三元组 | **5W2H 结构化（JSON-LD）** |
| 存储 | Oxigraph（命名图） | L0 sled + L2 Oxigraph |
| 发现 | SPARQL + 模糊搜索 | 5W2H 维度匹配 + 向量检索 |
| 命名图 | `graph:world` / `graph:code` | `graph:skill` |

两者互补桥接：技能 `HasSkill→` 知识实体，知识 `ApplicableIn→` 技能。

### 1.4.3 四层记忆 L0/L1/L2/L3

| 层 | 载体 | 用途 |
| :-- | :-- | :-- |
| **L0 Permanent** | sled | 永久存储，核心技能/知识 |
| **L1 Session** | 内存 | 会话级上下文，承载 `user_id`/`tenant_id` |
| **L2 Blackboard** | Oxigraph | 跨 Agent 共享黑板 |
| **L3 Projection** | SPARQL | 按需投影视图 |

### 1.4.4 任务黑板与 IRI 寻址

任务创建后以 `IRI` 唯一标识（如 `iri://tasks/...`），身份（user/session/tenant）写入黑板任务节点，并沿 PA→DA→CA→AA 全链路透传，支撑会话隔离与可追溯。

---

# 第 2 篇　环境与访问

## 2.1 演示环境与浏览器要求

- **控制台地址**：`http://112.45.121.74:30010`（最新版界面，截图来源）。
- **本地开发地址**：前端 `http://localhost:3000`（Vite），后端 `http://localhost:8080`（HTTP/SSE）+ `:50051`（gRPC）。
- **浏览器**：建议 Chrome / Edge 最新版；需允许 SSE 长连接（任务控制台流式日志依赖）。

## 2.2 身份注入：三级降级

后端 `UserIdentity` 提取器按优先级解析调用者身份（`src/api/http/iam.rs`）：

| 优先级 | 方式 | 说明 |
| :-- | :-- | :-- |
| ① | `Authorization: Bearer <JWT>` | HS256 验签，claims：`sub`/`tenant_id`/`roles`/`exp` |
| ② | `X-Identity: base64(JSON)` | 开发/测试模拟：`{"user_id","tenant_id","roles":[...]}` |
| ③ | 匿名 | `user_id=anonymous`、`tenant_id=default`、`roles=[]` |

> QA 常用「② X-Identity」构造不同租户/角色进行测试（见 3.5）。例如 DA 角色：
> `X-Identity: ` + base64(`{"user_id":"qa1","tenant_id":"t1","roles":["DA"]}`)。

## 2.3 角色与权限（RBAC）

- 写端点（`POST /api/v1/skills`、`POST/PUT /api/v1/prompts*`、`POST /api/v1/kg/import` 等）调用 `identity.require_role("DA")`。
- 环境变量：
  - `AGENTOS_JWT_SECRET`：HS256 签名密钥（生产必须修改，切勿使用默认值）。
  - `AGENTOS_AUTH_STRICT=true`：生产严格模式，禁止匿名放行；开发模式下匿名可绕过角色校验以便调试。

> ⚠️ 密钥类信息（JWT secret、api_key）严禁写入截图、日志或提交到版本库。

---

# 第 3 篇　操作手册（QA 测试小组）

## 3.1 界面总览与导航地图

登录后进入控制台，左侧为主导航（11 项）+ 底部「系统设置」。各页面用途与对应后端端点如下：

| 导航项 | 页面 | 主要用途 | 对应端点 |
| :-- | :-- | :-- | :-- |
| 总览大盘 | Overview | 健康/指标/护栏概览 | `/health`·`/metrics`·`/guard/stats` |
| 智能体管理 | AgentManagement | 查看/增删改 Agent、绑技能、绑图谱 | `/agents`(GET/POST/PUT/DELETE)·`/agents/:id/graph` |
| 运行时内核 | RuntimeKernel | 运行期配置、事件计数 | `/config`·`/metrics` |
| 记忆系统 | MemorySystem | 指标 + SPARQL 查询 | `/metrics`·`/kg/query` |
| 本体层 | OntologyLayer | 本体类型/动作 | `/ontology/types`·`/ontology/actions/:id/invoke` |
| 技能中心 | SkillRegistry | Skill 列表、签名徽标、注册/详情/编辑/删除（应用级） | `/skills`(GET/POST/DELETE) |
| Prompt版本管理 | PromptManagement | 版本/激活/灰度 | `/prompts` 系列 |
| MCP枢纽 | MCPHub | MCP Server 列表/注册 | `/mcp/servers`(GET/POST) |
| 安全与合规 | Security | 护栏统计 + 审计 | `/guard/stats`·`/guard/audit` |
| 任务控制台 | TaskConsole | 建任务 + SSE 流式执行 | `/tasks` 系列 |
| 架构与愿景 | Documentation | 产品说明页 | 前端静态 |
| 系统设置 | Settings | 模型注册中心（网关路由 / 向量 / 多模态） | `/config` · `/providers/models` · `/models/test` · `/embedding/activate` |

> 提示：前端支持 URL hash 深链，如 `#agents`、`#registry`、`#prompts`，便于 QA 直达页面并在缺陷单中附链接。

## 3.2 各功能页操作详解

### 3.2.1 总览大盘

![总览大盘](/manual-assets/01-overview.png)

- **看什么**：版本/健康状态、`skills`/`l2_nodes`/`events` 指标卡、护栏 `pass_rate`。
- **正常判据**：健康为绿色/OK；指标非报错；护栏通过率显示且非 0/0。
- **离线回退**：后端不可达时页面显示回退态，QA 需据此区分「后端宕机」与「数据为空」。

### 3.2.2 业务智能体管理

![智能体管理](/manual-assets/02-agents.png)

分两个看板：**系统批处理 Agent（只读）** 与 **用户态 Agent（前台创建·已落库）**。
- **创建**：右上「创建新智能体」→ 填写 名称 / 描述 / `business_domain` / 挂载技能（多选）/ 挂载知识包（多选）→ 保存（`POST /api/v1/agents`）。列表即时刷新，重启仍在。
- **编辑 / 删除**：卡片操作（`PUT` / `DELETE /api/v1/agents/:id`），均同步落盘。
- **挂载知识包**：创建/编辑抽屉中勾选知识包（`knowledge_pack_ids`）即完成知识来源绑定；一个知识包聚合多个图谱库 + 向量库，RAG 检索自动展开其命名图与向量命名空间。⚠️ 旧「绑定知识图谱」🔗 单值入口已于 **v1.2 下线（方案 B）**，`POST /api/v1/agents/:id/graph` 端点与 RAG `knowledge_graph` 读取一并移除，存量绑定在后端启动时**幂等迁移**进知识包。
- **多模型挂载（v1.3）**：创建/编辑抽屉在「基础模型」下方新增「**多模型挂载**」区块，提供 **chat / vision 能力槽**下拉（来源为 `#settings → 模型注册中心`，按模态过滤型号），写入 `model_mounts`（如 `{"chat":"res-1","vision":"res-2"}`）。运行时网关按内容类型路由到对应型号：含图片的请求走 `vision` 槽（VL 模型），纯文本走 `chat` 槽。
- **验收点**：创建后 `GET /api/v1/agents` 返回含 `batch_count`/`user_count`；刷新页面/重启后新 Agent 仍在。

### 3.2.3 技能中心

![技能中心](/manual-assets/03-registry.png)

- **列表**：展示每个 Skill 的 名称/版本/分类/安全级别/允许角色，及 `SignatureStatus` 徽标。
- **签名四态**：`Verified`（验签通过）/ `Unsigned`（无签名）/ `Invalid`（验签失败）/ `NoTrustAnchor`（有签名但未配置信任锚）。
- **注册新技能**：填写 名称/版本/IRI/分类/安全级别/允许角色，可选粘贴 Ed25519 签名 → 提交（`POST /api/v1/skills`，严格模式需 DA 角色）。
- **查看详情**：卡片「详情」→ 弹窗「技能元数据」区回显真实字段（IRI/版本/分类/安全级别/角色/权限/描述/输入·输出 Schema）；可按需「skill.yaml 预览/下载」；CI/CD 流水线为可折叠演示区（非真实数据）。
- **编辑技能（应用级）**：`skill://` 技能在详情页「编辑」——复用注册表单并预填现有数据，**IRI 主键锁定不可改**，保存按 IRI 覆盖（`POST /api/v1/skills` upsert），`compiled_template`/`mappings` 等非 UI 字段原样保留。
- **删除技能（应用级）**：`skill://` 技能「删除」（二次确认，`DELETE /api/v1/skills?iri=...`，严格模式需 DA），内存与 `skills.json` 同步移除。
- **系统级只读**：`iri://` 内核内置技能只读，注册/删除均返回 403；「编辑/删除」按钮仅对 `skill://` 显示。
- **验收点**：无签名显示 `Unsigned`；粘贴错误签名显示 `Invalid`；非 DA 角色在严格模式下应被拒（403）。新建应用级技能后「详情」可见真实元数据；编辑后字段更新且 IRI 不变；删除后列表消失、重复删除 404；对 `iri://` 注册/删除均 403。

### 3.2.4 记忆系统

![记忆系统](/manual-assets/04-memory.png)

- **指标区**：查看记忆层节点/事件计数。
- **SPARQL 实时查询**：在「知识图谱实时查询」面板输入 SPARQL（`POST /api/v1/kg/query`）。示例：
  ```sparql
  SELECT ?fault ?cause ?fix WHERE {
    ?fault <可能原因> ?cause . ?cause <解决建议> ?fix .
  } LIMIT 20
  ```
- **验收点**：导入数据后查询有结果；空图查询返回空集（注意：空结果可能被护栏标记，见 3.2.7）。

### 3.2.5 MCP 枢纽

![MCP 枢纽](/manual-assets/05-mcp.png)

- **列表**：`GET /api/v1/mcp/servers` 动态展示已注册 MCP Server。
- **注册**：填写 名称 / 描述 / `endpoint` / `protocol`（HTTP 已支持）→ 提交（`POST /api/v1/mcp/servers`）。
- **验收点**：注册后列表即时出现该 Server。

### 3.2.6 运行时内核

![运行时内核](/manual-assets/06-runtime.png)

- 查看脱敏运行期配置（`GET /api/v1/config`，密钥仅显示 `api_key_configured: bool`）与事件计数。

### 3.2.7 安全与合规

![安全与合规](/manual-assets/07-security.png)

- **护栏统计**：`total_checks / passed_checks / failed_checks / pass_rate`。
- **审计日志**：`GET /api/v1/guard/audit` 表格逐条记录（工具、分类、结论）。
- **验收点**：触发高危/不完整工具结果时，审计出现拦截记录，`failed_checks` 增加。

### 3.2.8 任务控制台

![任务控制台](/manual-assets/08-console.png)

- **建任务**：输入 `user_input`（可选 `user_id`/`session_id`）→ `POST /api/v1/tasks`。
- **流式执行**：点执行 → SSE（`POST /api/v1/tasks/stream`）实时输出推理/工具调用日志。
- **状态/明细**：`/tasks/:iri/status`、`/tasks/:iri/details` 查看阶段、轮次、Token、工具调用统计。
- **验收点**：SSE 持续输出直至完成；状态从进行中→完成；明细含 Token 与工具统计。

### 3.2.9 Prompt 版本管理

![Prompt 版本管理](/manual-assets/09-prompts.png)

- **新建版本**：名称/版本号/绑定模型/Jinja2 系统提示词（支持 `{{tenant_id}}`/`{{user_id}}`）→ `POST /api/v1/prompts`（需 DA）。
- **激活**：✓ → `POST /api/v1/prompts/:id/activate`（同一时刻仅一个激活版）。
- **灰度**：📡 → 拖动滑条（1~100%）→ `PUT /api/v1/prompts/:id/canary`，可限定 `tenant_ids`/`roles`。
- **分流验证**：`GET /api/v1/prompts/resolve?tenant_id=t1&user_id=u1&role=DA` 返回 `resolved`（含 `is_canary`）。
- **验收点**：改灰度比例后，用不同 `user_id` 多次 resolve，命中比例大致符合设定。

### 3.2.10 系统设置 —— 模型注册中心

![模型注册中心](/manual-assets/10-settings.png)

- **一处管全部（v1.4 三合一）**：原「LLM 网关」「向量化 / Embedding」「模型资源」收敛为单一「**模型注册中心**」（`Cpu` 图标），与 IAM / 安全 / 存储 / API 密钥并列。
- **Providers（外部 API 接入点）**：名称 / `base_url`（不含 `/v1`）/ `api_key`（脱敏占位，留空=不修改）/ `kind` / `timeout` / 启用开关；「**拉取型号**」→ `POST /api/v1/providers/models` 自动列出该 Provider 可用型号并按名预判模态，勾选批量添加。
- **型号（按模态子 Tab）**：**文本(chat) / 多模态(VL·vision) / 向量(embedding) / 语音(asr·tts) / 实时(realtime)**。每个型号挂某 Provider、填**真实型号名**、勾选模态与工具/推理开关；「**连通性测试**」→ `POST /api/v1/models/test`（返回 `http_status`/`latency_ms`/`dim`）。
- **向量子 Tab（桥接 Embedding）**：型号填 `dimension` 后点「**设为生效向量**」→ `POST /api/v1/embedding/activate`，用其 Provider 端点/密钥桥接为 Embedding 服务并**免重启热切换 + 后台重建索引**；「生效中」标识当前向量。ollama / 内置降级等原始配置折叠于「高级」区。
- **路由 / 默认（兜底网关）**：页面底部配置 `base_url`/`api_key`/`default_model`/`model_mapping`——请求模型未命中注册表型号时的回退端点与默认模型；「推送网关」即时生效并落盘 `config_override.json`。
- **验收点**：GET 配置密钥全程脱敏（仅 `api_key_configured`）；保存**免重启即时生效**；⚠️ 截图勿泄露 api_key。

![模型注册中心 · 向量子 Tab（设为生效向量）](/manual-assets/11-model-resources.png)

### 3.2.11 架构与愿景页

![架构与愿景](/manual-assets/09-architecture.png)

- 产品说明页，供 QA 快速理解全貌，无后端交互。

## 3.3 端到端测试走查（样例：电池维修助手）

以「电池维修助手」为主线串联核心链路，每步给出预期：

| 步骤 | 操作 | 预期结果 |
| :-- | :-- | :-- |
| 1 建 Agent | 智能体管理→创建，`business_domain=battery_repair` | 用户态看板出现该 Agent，重启仍在 |
| 2 绑技能 | 编辑 Agent 勾选 `diagnose_fault` 等技能 | 保存后 Agent 详情含所选技能 |
| 3 绑知识库 | 卡片 🔗 选择「故障知识图谱」命名图 | 绑定成功，图谱含 `tenant:{id}/` 前缀 |
| 4 导入语料 | 记忆系统/接口导入故障三元组 | SPARQL 查询可召回故障→原因→方案 |
| 5 配 Prompt | Prompt 管理新建版本并激活，设 20% 灰度 | resolve 分流比例符合预期 |
| 6 跑任务 | 任务控制台输入「E05 故障码，整车无法上电，给出诊断与维修步骤」 | SSE 实时输出推理链，最终给出诊断 |
| 7 看审计 | 安全与合规查看审计/护栏统计 | 工具调用可追溯，无异常拦截或按预期拦截 |

> 该走查亦可作为**回归主用例**：每次发版后至少完整跑通一次。

## 3.4 测试用例设计与验收标准

### 3.4.1 用例模板
每条用例包含：`用例编号 / 模块 / 前置条件 / 操作步骤 / 预期结果 / 通过判据`。建议在 `00.系统设计/手册配套/冒烟测试用例.md` 基础上扩展。

### 3.4.2 功能点验收清单（对照能力矩阵）

| 功能点 | 通过判据 |
| :-- | :-- |
| Agent CRUD 持久化 | 创建/编辑/删除后刷新与重启数据一致 |
| 多 Skill 聚合 | Agent 可绑定多个 Skill 并正确展示白名单 |
| Skill 签名 | 四态徽标显示正确；非 DA 严格模式被拒 |
| 知识库绑定+查询 | 绑定含租户前缀；SPARQL 有结果 |
| Prompt 灰度 | 激活唯一；灰度分流比例大致符合 |
| 任务流式 | SSE 连续输出；状态/明细完整 |
| 安全护栏 | 高危/不完整结果被拦截并可审计 |
| 多租户隔离 | 不同租户数据互不可见（见 3.5） |
| 配置写回 | PUT 后运行期配置变化；密钥脱敏 |

### 3.4.3 通过 / 阻塞标准
- **通过**：全部 P0（Agent CRUD、任务执行、技能列表、护栏、隔离）用例通过，P1 通过率 ≥ 95%。
- **阻塞发版**：任一 P0 用例失败，或存在数据串租户、密钥泄露、护栏失效问题。

## 3.5 多租户 / 会话隔离验证

用 `X-Identity` 构造两个租户，验证数据互不串扰：

1. 以 `t1`（`{"user_id":"u1","tenant_id":"t1","roles":["DA"]}` 的 base64）导入 KG 并创建会话。
2. 以 `t2` 重复操作导入不同数据。
3. 校验：
   - **KG 隔离**：`t2` 的 SPARQL 查询看不到 `t1` 数据（命名图 `graph://tenant/<id>/...`）。
   - **向量隔离**：RAG 召回带 `tenant:<id>` 标签过滤，跨租户不召回。
   - **会话血缘**：L1Session 承载 `user_id`/`tenant_id`，任务明细可追溯到正确租户。
- **通过判据**：任一方向均无跨租户可见数据；匿名（无身份）在严格模式下被拒。

## 3.6 缺陷记录与回归规范

### 3.6.1 缺陷分级
| 级别 | 定义 |
| :-- | :-- |
| P0 阻断 | 核心链路不可用 / 数据串租户 / 密钥泄露 / 护栏失效 |
| P1 严重 | 主要功能异常但有绕过 |
| P2 一般 | 次要功能异常、体验问题 |
| P3 轻微 | 文案、样式等 |

### 3.6.2 缺陷单模板
`标题 / 级别 / 环境(地址+版本) / 身份(role,tenant) / 复现步骤 / 期望 / 实际 / 截图或SSE日志 / 关联端点`。
> ⚠️ 附日志/截图前先脱敏（api_key、JWT、cookie 一律打码）。

### 3.6.3 回归清单
每次发版回归至少覆盖：3.3 端到端走查 + 3.4.2 全部 P0 功能点 + 3.5 隔离验证 + 冒烟脚本 `smoke-test.sh` 全绿。

---

# 第 4 篇　Agent 开发配置手册（Agent 开发者）

本篇专门面向利用 **Wild AgentOS 控制台界面** 进行智能体配置与管理的开发人员。通过控制台的 no-code 可视化表单，开发者可以快速完成智能体的定义、技能绑定、知识库关联、提示词管理与测试。

## 4.1 智能体创建与定义 (Agents)

在控制台的 **「智能体管理」** 页面，开发者可以通过 no-code 可视化表单完成业务智能体的全生命周期管理，而无需编写配置文件。

### 4.1.1 用户态智能体的创建与配置
点击右上角的 **「创建新智能体」** 按钮，填写以下核心表单项：
1. **智能体名称 (Name)**：必填，智能体的唯一标识，例如 `battery_repair_assistant`。
2. **智能体描述 (Description)**：可选，简述该智能体的业务功能。
3. **业务领域 (Business Domain)**：用于知识与实体物理隔离的命名空间。通常与特定的应用场景绑定。
4. **挂载技能 (Skills)**：多选下拉框。可将已注册的系统技能或自定义应用技能绑定给该智能体，从而赋予其相应的工具调用能力。
5. **挂载知识包 (Knowledge Packs)**：多选下拉框。选择该智能体在运行 RAG 检索时允许访问的知识资源包（每个知识包可在知识库页面中单独维护）。
6. **个性化外观 (Icon & Color)**：设置该智能体在对话看板中显示的图标和卡片底色，方便区分。

### 4.1.2 智能体的高级多模型挂载 (Model Mounts)
控制台支持为单个智能体挂载不同的模型到对应的功能槽（能力槽），以实现多模型协作并优化 Token 预算：
- **配置入口**：创建/编辑抽屉中的「多模型挂载」区块。
- **能力槽设置**：
  - **chat 能力槽**：挂载处理文本对话与复杂逻辑推理的文本模型（如 `DeepSeek`）。
  - **vision 能力槽**：挂载多模态视觉模型（如 `Gemini`），当用户上传图片时，系统会自动路由至此模型。
- **关联数据**：下拉菜单中的可选型号均在 `#settings → 模型注册中心` 中定义。

---

## 4.2 技能绑定与管理 (Skills)

智能体通过绑定“技能”来获取与外部系统交互的能力。技能本身以标准的 **JSON-LD 语义格式** 进行描述，进入系统的「技能图谱」。

### 4.2.1 技能在线注册与编辑
在控制台的 **「技能中心」** 页面，您可以直接管理和维护技能：
- **注册新技能**：点击「注册新技能」表单，填写名称、版本号、技能唯一标识 IRI（必须以 `iri://skills/` 开头）、分类、安全级别、允许角色等信息，并定义输入/输出 JSON Schema 与执行模板（`compiled_template`）。
- **查看与预览**：点击任意技能卡片的「详情」，可以直观预览该技能的输入输出格式，并一键下载或预览其 `skill.yaml` 配置文件。
- **修改应用技能**：对于应用级自定义技能（`skill://` 开头），可在详情页中点击 **「编辑」** 按钮进行就地修改。IRI 主键在此过程中会被锁定以确保一致性。
- **删除与下线**：确认不再需要的应用技能可以直接点击 **「删除」** 进行二次确认下线。
- **内置只读守卫**：系统内置的 `iri://` 技能（如基础系统操作）带有只读保护，控制台上不会提供「编辑」与「删除」按钮，任何写尝试均会返回 403。

### 4.2.2 技能的 JSON-LD 语义核心字段
当您在界面上导入、编辑或通过 `SkillCreator` 自动生成技能定义时，以下 JSON-LD 核心字段对语义图谱编排至关重要：
- **`@id`**：唯一的技能 IRI 路径。
- **`@type`**：定义节点子类型（例如原子技能 `Atomic`，或用于多技能编排的组合技能 `Composite`）。
- **`skill:5W2H`**：定义该技能的业务属性，包含执行角色约束（`who: requiredRole`，例如需 `DA` 角色）、适用生命周期阶段（`when: applicablePhase`，如 `Plan`/`Do`）、实现手段（`how`）以及预计消耗成本（`howMuch`）。
- **`skill:links`**：声明技能的前置依赖关系（`Prerequisite`），使智能体在规划阶段能自动构建依赖链路。
- **`security_level`** 与 **`allowed_roles`**：设置安全护栏和准入角色，非授权角色调用该技能会被安全模块拦截。

---

## 4.3 知识库与数据管理 (Knowledge)

知识库是智能体进行检索增强生成 (RAG) 的数据底座。开发者可在控制台的 **「知识库」** 页面进行可视化的数据配置与维护：

### 4.3.1 向量数据摄取 (Vector Ingestion)
在对应的知识库项中，支持多文件并发上传。
- 开发者可直接将多份业务文本文件拖入上传区域，系统会自动完成文本分块（Chunking）与向量化计算，并自动附加对应的 namespace/tenant 租户隔离标签，写入向量存储库。

### 4.3.2 图谱数据导入 (Graph Ingestion)
支持结构化的关系型图谱数据导入，以供智能体进行精准实体与关系推理。
- **导入入口**：知识库详情页的「图谱库导入」控制区。
- **数据格式**：支持上传带有实体关系的 CSV、JSONL 或 N-Triples 数据包。
- **注意项**：导入时可勾选 `clear_before` 以便在导入新数据前清空旧的命名图谱。中文实体与关系名在导入过程中会被原样保留。

---

## 4.4 提示词模板与灰度管理 (Prompts)

控制台提供完整的 **Prompt 版本管理与发布面**，免去了手动修改代码的步骤。

### 4.4.1 提示词版本新建与激活
在 **「Prompt 版本管理」** 页面中：
1. **新建 Prompt 版本**：绑定模型、编写 Jinja2 系统提示词（支持在提示词中使用 `{{tenant_id}}` 和 `{{user_id}}` 作为动态变量），保存为新版本。
2. **一键激活**：在列表中选中指定的 Prompt 版本，点击 **「激活版本」** 即可实时切换生效，所有的 Agent 文本生成路由将立即启用该套提示词模板。

### 4.4.2 灰度发布分流 (Canary Release)
为保障生产环境平稳过渡，可在激活的 Prompt 卡片上配置 **「设置灰度」**：
- **百分比分流**：例如设置 20% 的流量，系统将基于用户的 `hash(user_id)%100` 决定哪些用户匹配新版提示词。
- **白名单限制**：可限制特定租户 ID（`tenant_ids`）或角色（`roles`）白名单参与测试，其余用户自动降级至老版本。

---

## 4.5 MCP 外部工具集成 (Settings)

当智能体需要使用控制台之外的第三方开发工具（如浏览器自动化、Git 管理等）时，可以通过 **Model Context Protocol (MCP)** 在前台界面进行挂载：
- **注册外部 Server**：前往控制台 **「设置 → MCP Server 注册」**，填写服务商的名称、简述及通信端点（例如 `http://localhost:3000/sse`）。
- **工具自动同步**：保存注册后，系统的 `MCPIntegration` 服务将自动建立连接，拉取该 Server 提供的全部工具，并自动将其生成为技能中心中的 `skill:MCPTool` 节点，智能体创建时可直接勾选挂载。

---

## 4.6 安全护栏与审计追踪 (Security)

开发者可以通过控制台的 **「安全与合规」** 页面，对智能体的行为边界 and 技能调用执行可视化安全审计。

- **行为护栏看板**：实时显示当前智能体的 **安全护栏通过率 (Pass Rate)** 与被拦截请求的分类占比（如非合规文件写操作、超预算 Token 消耗、非授权 API 请求等）。
- **审计日志追踪**：逐条记录智能体的工具调用详情（Audit Logs），包含请求用户、触发时间、使用的技能 IRI、参数以及拦截状态。当发生意外拦截时，可作为排障的重要依据。

---

## 4.7 多租户与角色测试切换

由于多智能体中台采用严格的 RBAC 角色准入及数据隔离，控制台在右上角为开发者提供了模拟测试工具：
- **租户/角色切换器**：在页面右上角，您可以临时将当前测试身份切换为 `SA`(Supervisor)、`DA`(Doer) 或 `QA` 等。
- **测试 RBAC 越权**：切换为非 `DA` 角色时，您可以尝试编辑技能或调用高敏感度工具，以验证前端按钮状态是否变更为置灰只读，以及接口返回的 403 拦截表现。
- **数据隔离验证**：切换不同测试租户，确认前台列表和知识库文档是否已按租户物理隔离。

---

## 4.8 智能体功能测试验证

创建好智能体、挂载技能与知识库后，开发者可以直接在控制台进行端到端的闭环测试：

### 4.8.1 🚀 对外发布与一键体验
- 在 **「智能体管理」** 列表中，找到您的自定义 Agent，点击卡片操作中的 **🚀「对外发布」**。
- 系统会弹出一个一键体验对话抽屉，您可以直接在网页中与该 Agent 进行实时对话测试。
- 发布抽屉中还会提供当前智能体兼容 OpenAI 规范的 API 调用 URL（`/v1/chat/completions`）以及 `curl` 命令示例，方便您复制到第三方客户端调试。

### 4.8.2 任务执行树实时审计 (Task Console)
- 智能体被外部调用或运行复杂任务时，会产生对应的任务流。
- 前往 **「任务控制台」** 页面，您可以实时查阅任务的执行链路。系统会以树状拓扑（Task Execution Tree）清晰渲染出智能体如何通过 PDCA（规划-执行-检查-改进）循环逐步拆解、调用绑定的各类 Skills、获取 RAG 知识，直至任务最终完成的完整链路。

---

# 第 5 篇　附录

## 附录 A　API 端点速查表

> 前缀 `/api/v1`（`/health`、`/metrics` 除外）。「DA」列表示严格模式下写操作需 DA 角色。

| 方法 | 路径 | 用途 | DA |
| :-- | :-- | :-- | :-- |
| GET | `/health` | 健康/版本 | |
| GET | `/metrics` | skills/l2_nodes/events 指标 | |
| GET | `/api/v1/config` | 脱敏运行期配置（含 `gateway`/`embedding`/`models` 快照，密钥仅 `api_key_configured`） | |
| PUT | `/api/v1/config` | 配置写回（`gateway`/`embedding`/`models` 补丁 → `config_override.json`） | |
| POST | `/api/v1/models/test` | 型号连通性测试（返回 `http_status`/`latency_ms`/`dim`） | ✅ |
| POST | `/api/v1/providers/models` | 自动拉取 Provider 的 `/v1/models` 型号列表（不回显 api_key） | ✅ |
| POST | `/api/v1/embedding/activate` | 将某向量型号桥接为生效 Embedding（热切换 + 重建索引） | ✅ |
| POST | `/api/v1/images/upload` | 图片上传（多模态入口） | |
| GET | `/api/v1/agents` | Agent 列表（合并 batch+user） | |
| POST | `/api/v1/agents` | 创建 Agent | |
| PUT | `/api/v1/agents/:id` | 更新 Agent | |
| DELETE | `/api/v1/agents/:id` | 删除 Agent | |
| POST | `/api/v1/agents/:id/graph` | 绑定知识图谱 | |
| POST | `/api/v1/agents/:id/chat` | Agent 对话 | |
| GET | `/api/v1/skills` | 技能列表 | |
| POST | `/api/v1/skills` | 注册/编辑技能（Ed25519 验签；按 IRI upsert） | ✅ |
| DELETE | `/api/v1/skills` | 删除应用级技能（`?iri=`；`iri://` 只读 403） | ✅ |
| GET | `/api/v1/skills/manifest` | 技能清单 | |
| POST | `/api/v1/skills/import-git` | 从 Git 导入技能 | |
| GET | `/api/v1/prompts` | 版本列表 | |
| POST | `/api/v1/prompts` | 创建版本 | ✅ |
| GET | `/api/v1/prompts/resolve` | 分流决策 | |
| POST | `/api/v1/prompts/:id/activate` | 激活版本 | ✅ |
| PUT | `/api/v1/prompts/:id/canary` | 设置灰度 | ✅ |
| DELETE | `/api/v1/prompts/:id` | 删除版本 | ✅ |
| POST | `/api/v1/kg/import` | 知识图谱导入 | ✅ |
| POST | `/api/v1/kg/query` | SPARQL 查询 | |
| POST | `/api/v1/nodes` | 写知识节点 | |
| GET | `/api/v1/nodes/:iri` | 读知识节点 | |
| POST | `/api/v1/projections` | 投影查询 | |
| GET | `/api/v1/mcp/servers` | MCP 列表 | |
| POST | `/api/v1/mcp/servers` | 注册 MCP Server | |
| POST | `/api/v1/tasks` | 创建任务 | |
| GET | `/api/v1/tasks/:iri` | 查询任务 | |
| POST | `/api/v1/tasks/stream` | 任务流式执行(SSE) | |
| GET | `/api/v1/tasks/:iri/status` | 实时状态 | |
| GET | `/api/v1/tasks/:iri/details` | 执行明细 | |
| POST | `/api/v1/events` | 事件投递 | |
| GET | `/api/v1/batch/events` | 批量事件流(SSE) | |
| GET | `/api/v1/guard/stats` | 护栏统计 | |
| GET | `/api/v1/guard/audit` | 护栏审计日志 | |
| GET/POST/PUT/DELETE | `/api/v1/knowledge-packs*` | 知识包管理 | |
| GET/POST/PUT/DELETE | `/api/v1/kb/categories*` `/kb/bases*` | 知识库分类/库管理 | |
| GET/POST | `/api/v1/ontology/types` · `/ontology/actions/:id/invoke` | 本体类型/动作 | |

## 附录 B　故障排查 FAQ

| 现象 | 可能原因 | 处置 |
| :-- | :-- | :-- |
| 写操作返回 403 | 严格模式且无 DA 角色 | 用带 `roles:["DA"]` 的身份；或核对 `AGENTOS_AUTH_STRICT` |
| 匿名请求被拒 | `AGENTOS_AUTH_STRICT=true` | 提供 JWT 或 X-Identity |
| Skill 徽标 `Invalid` | 签名与载荷不匹配 | 用正确私钥对 `iri|name|version|category|security_level|template` 重签 |
| Skill 徽标 `NoTrustAnchor` | 未配置受信公钥 | 后端添加信任锚公钥 |
| SPARQL 空结果被拦截 | 护栏 `knowledge_empty_check` | 确认命名图/租户前缀正确，或调整护栏规则 |
| SSE 无输出 | 代理未透传/连接被缓冲 | 检查 nginx SSE 配置、`VITE_BACKEND_URL` |
| LLM 调用 401 | 网关 api_key 错误 | 系统设置重填并推送；勿泄露密钥 |
| 新建 Agent 重启丢失 | 未落盘/工作目录不对 | 确认 `data/agents.json` 可写、后端工作目录正确 |
| 跨租户看到他人数据 | 身份缺 tenant_id | 检查 X-Identity/JWT 的 `tenant_id`，复现后按 P0 上报 |

## 附录 C　Skill JSON-LD 模板与配套脚本

**最小骨架**（复制后按 4.3 填写）：

```json
{
  "@context": { "schema": "https://schema.org/", "skill": "https://agent-harness.os/skill#" },
  "@id": "iri://skills/<name>",
  "@type": ["skill:Skill", "skill:Atomic"],
  "schema:name": "<name>",
  "schema:description": "<描述>",
  "skill:version": "1.0.0",
  "skill:maturity": "experimental",
  "skill:tags": [],
  "skill:5W2H": {
    "skill:what": "", "skill:why": "",
    "skill:who": { "skill:requiredRole": "DA", "skill:roleName": "DA" },
    "skill:when": { "skill:applicablePhase": ["Plan", "Do"], "skill:triggerCondition": null },
    "skill:how": { "skill:approach": "" },
    "skill:howMuch": { "skill:avgDuration": 0, "skill:avgTokenCost": 0 }
  },
  "skill:graphMeta": { "skill:successRate": 1.0, "skill:usageCount": 0, "skill:avgTokenConsumption": 0 },
  "skill:links": []
}
```

**配套脚本（`00.系统设计/手册配套/`）**：

| 文件 | 用途 | 运行 |
| :-- | :-- | :-- |
| `skill-validator.mjs` | 校验 Skill JSON-LD（CLI + 模块） | `node skill-validator.mjs <path>` |
| `skill-validator.test.mjs` | 校验器单元测试（10 用例） | `cd 手册配套 && node --test skill-validator.test.mjs` |
| `samples/valid-skill.jsonld` | 合法样例 | — |
| `samples/invalid-skill.jsonld` | 非法样例（触发 6 类错误） | — |
| `smoke-test.sh` | 后端端点冒烟（curl，仅取状态码） | `BASE_URL=... bash smoke-test.sh` |
| `冒烟测试用例.md` | 16 条冒烟用例 | — |

> 校验器规则与 4.3 完全对齐：`@id` 前缀、`@type` 含 `skill:Skill`、语义化版本、`requiredRole`/`applicablePhase`/`maturity` 枚举、`successRate ∈ [0,1]` 等。

## 附录 D　变更记录与维护约定

| 版本 | 日期 | 说明 |
| :-- | :-- | :-- |
| v1.0 | 2026-07-02 | 首版：QA 操作手册 + Agent 开发配置手册 + 配套校验/冒烟 |
| v1.1 | 2026-07-04 | 新增 **Agent 对外发布**与**入站 API 密钥治理**（调用方 & 密钥中心、scope 授权、限流/配额/审计、OpenAI 兼容层、SSE 流式） |
| v1.2 | 2026-07-05 | 新增**知识库数据摄取**（向量多文件上传 + 图谱 CSV/JSONL/N-Triples 导入、中文 IRI 保留、stats 精确计数）；Agent 知识来源统一为**知识包挂载**，**下线旧「绑定知识图谱」**（方案 B：移除 `/agents/:id/graph`、RAG `knowledge_graph` 读取、卡片入口，存量启动幂等迁移）；在线手册目录支持**页内锚点跳转** |
| v1.3 | 2026-07-06 | 新增**模型资源注册表**（`#settings → 模型资源`：Provider + Resource 两级注册、连通性测试 `POST /api/v1/models/test`、密钥脱敏回填）；**多模态（VL）**（网关按 `ChatContent` 路由、`/v1/chat/completions` 提取 `image_url`、`POST /api/v1/images/upload`）；**Agent 多模型挂载**（`model_mounts` chat/vision 能力槽）；新增 3.2.10（模型资源）/ 3.2.2（多模型挂载）/ 4.2.2（`model_mounts`）章节 |
| v1.4 | 2026-07-06 | **模型注册中心（三合一收敛）**：原「LLM 网关」「向量化 / Embedding」「模型资源」并为单一 `#settings → 模型注册中心`；**型号按模态子 Tab**（文本/多模态/向量/语音/实时）；**自动拉取型号** `POST /api/v1/providers/models`（关键词预判模态）；**向量桥接** `POST /api/v1/embedding/activate`（设为生效向量→热切换+重建）；`ModelResource` 增 `dimension` 字段 |
| v1.5 | 2026-07-06 | **技能中心 CRUD**：技能详情弹窗新增「技能元数据」区回显真实字段（IRI/版本/分类/安全级/角色/权限/Schema），CI/CD 降为可折叠演示区；应用级（`skill://`）支持**编辑**（复用表单、锁定 IRI 主键、按 upsert 覆盖、保留模板/映射）与**删除**（`DELETE /api/v1/skills?iri=...`，需 DA）；**系统级（`iri://`）只读守卫**注册/删除均 403；`SkillRegistry` 增 `remove_skill`；更新 3.2.3、附录 A；线上端到端（新建/详情/编辑/删除/只读）验证通过 |

- **维护约定**：本手册随内核版本同步更新；涉及 API/字段变更时，先更新附录 A 与第 4 篇，再回归冒烟脚本与校验器。
- **事实来源**：以工作区内核源码为准；界面以 `http://112.45.121.74:30010` 最新版为准，截图存 `./screenshots/`。
