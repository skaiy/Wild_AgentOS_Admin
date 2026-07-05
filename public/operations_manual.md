# Wild Agent OS —— 操作手册与 Agent 开发配置手册

> 版本：v1.2（2026-07-05）　|　适用系统：Wild Agent OS 中台\
> 后端：`wild-agent-os-core/`（Rust · Axum HTTP/SSE + Tonic gRPC）　前端：`wild-agent-os-admin/`（React 19 + Vite 6 + Tailwind 4）\
> 测试环境：`http://112.45.121.74:30010`\
> 读者：**QA 测试小组**（看第 3 篇）· **Agent 开发者**（看第 4 篇）；第 1、2 篇与附录为两类读者共读。

> **📌 本版更新（v1.2 · 2026-07-05）—— 知识库数据摄取 · 知识包统一挂载**
> - **知识库数据摄取（详见 4.4）**：知识库页「新建知识库」支持两段式摄取——向量库多文件上传（`POST /api/v1/kb/bases/:id/upload`，自动分块 + 命名空间/租户标签）与图谱库结构化导入（`POST /api/v1/kb/bases/:id/import-graph`，CSV / JSONL / N-Triples → 命名图）；`stats` 精确计数，**中文实体/关系 IRI 原样保留**。
> - **知识包统一挂载**：Agent 知识来源统一为「**知识包挂载**」（`knowledge_pack_ids`）。**旧「绑定知识图谱」单值路径已下线**（方案 B）：移除 `POST /api/v1/agents/:id/graph`、卡片 🔗 图标与 RAG 中的 `knowledge_graph` 读取；存量绑定启动时**一次性幂等迁移**进知识包。

> **📌 上版更新（v1.1 · 2026-07-04）—— Agent 对外发布与入站 API 密钥治理**
> Agent 创建后可在 `#agents` 通过 🚀「对外发布」抽屉一键上线，获取稳定调用 URL、`curl` 与 **OpenAI 兼容**示例；`#settings → API 密钥管理` 升级为真实「调用方 Client + 密钥」中心（scope 授权、限流/配额、密钥签发/撤销、调用审计）。新增对外调用面 `POST /api/v1/public/agents/:id/chat`、`.../chat/stream`（SSE）与 OpenAI 兼容 `GET /v1/models`、`POST /v1/chat/completions`。

---

## 目录

- **[第 0 篇 前言](#第-0-篇-前言)**：目的、阅读指引、约定
- **[第 1 篇 系统总览](#第-1-篇-系统总览)**：术语、产品定位、总体架构、核心概念
- **[第 2 篇 环境与访问](#第-2-篇-环境与访问)**：演示地址、身份注入、角色与权限
- **[第 3 篇 操作手册（QA）](#第-3-篇-操作手册qa-测试小组)**：导航、各页操作、端到端走查、用例验收、隔离验证、缺陷规范
- **[第 4 篇 Agent 开发配置手册](#第-4-篇-agent-开发配置手册agent-开发者)**：环境、Agent 定义、**Skill 开发规范（JSON-LD）**、知识库与数据摄取、Prompt、MCP、护栏、安全、测试、部署
- **[第 5 篇 附录](#第-5-篇-附录)**：API 速查、FAQ、Skill 模板、变更记录

---

# 第 0 篇　前言

## 0.1 文档目的与读者对象

本手册为 Wild Agent OS 中台提供两类可落地的操作与开发指引：

- **QA 测试小组**：通过 `30010` Web 控制台，验证平台各功能是否可用、可靠、可追溯，并沉淀测试用例与缺陷。
- **Agent 开发者**：在平台上定义业务智能体（Agent）、开发技能（Skill，采用 **JSON-LD 语义**而非普通 Markdown）、构建专用知识库、配置 Prompt 灰度与安全护栏，并完成测试与部署。

## 0.2 阅读指引

| 读者 | 建议路线 |
| :-- | :-- |
| QA 测试小组 | 第 1 篇（建立共同语言）→ 第 2 篇（登录与身份）→ **第 3 篇（逐页操作 + 端到端走查 + 用例验收）** → 附录 A/B |
| Agent 开发者 | 第 1 篇 → 第 2 篇 → **第 4 篇（4.3 Skill JSON-LD 为核心）** → 附录 A/C |
| 项目/交付 | 第 1 篇 + 第 3.4 用例验收 + 第 4.10 部署 |

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
| 技能中心 | SkillRegistry | Skill 列表、签名徽标、注册 | `/skills`(GET/POST) |
| Prompt版本管理 | PromptManagement | 版本/激活/灰度 | `/prompts` 系列 |
| MCP枢纽 | MCPHub | MCP Server 列表/注册 | `/mcp/servers`(GET/POST) |
| 安全与合规 | Security | 护栏统计 + 审计 | `/guard/stats`·`/guard/audit` |
| 任务控制台 | TaskConsole | 建任务 + SSE 流式执行 | `/tasks` 系列 |
| 架构与愿景 | Documentation | 产品说明页 | 前端静态 |
| 系统设置 | Settings | LLM 网关配置 | `/config`(GET/PUT) |

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
- **验收点**：创建后 `GET /api/v1/agents` 返回含 `batch_count`/`user_count`；刷新页面/重启后新 Agent 仍在。

### 3.2.3 技能中心

![技能中心](/manual-assets/03-registry.png)

- **列表**：展示每个 Skill 的 名称/版本/分类/安全级别/允许角色，及 `SignatureStatus` 徽标。
- **签名四态**：`Verified`（验签通过）/ `Unsigned`（无签名）/ `Invalid`（验签失败）/ `NoTrustAnchor`（有签名但未配置信任锚）。
- **注册新技能**：填写 名称/版本/IRI/分类/安全级别/允许角色，可选粘贴 Ed25519 签名 → 提交（`POST /api/v1/skills`，严格模式需 DA 角色）。
- **验收点**：无签名显示 `Unsigned`；粘贴错误签名显示 `Invalid`；非 DA 角色在严格模式下应被拒（403）。

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

### 3.2.10 系统设置

![系统设置](/manual-assets/10-settings.png)

- 填写 LLM 网关 `base_url`/`api_key`/`default_model`/`model_mapping` → 本地保存（localStorage）→「推送到后端」（`PUT /api/v1/config`，内存级生效）。
- **验收点**：GET 配置密钥脱敏（仅 `api_key_configured`）；⚠️ 截图勿泄露 api_key。

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

## 4.1 开发环境与配置

### 4.1.1 环境搭建与一键启动
- **前置**：可 `cargo build` 后端（Rust），可 `npm run dev` 前端（Node）。
- **一键启动**：`cd 01.wild-agent-os && ./start.sh`。脚本会：编译并启动后端（`:8080` HTTP/SSE，`:50051` gRPC）→ 轮询 `/health` 就绪 → 安装前端依赖并启动 Vite（默认 `:3000`）。
- **常用环境变量**（透传给后端）：`BACKEND_PORT`/`FRONTEND_PORT`、`AGENT_OS_GATEWAY_BASE_URL`/`_API_KEY`/`_DEFAULT_MODEL`、`RUST_LOG`、`VITE_BACKEND_URL`。
- **前端代理**：`vite.config.ts` 将 `/api/*`、`/health` 代理至后端；`VITE_BACKEND_URL` 可覆盖。

### 4.1.2 config.yaml、环境变量与 data/ 落盘
- **`config.yaml`（后端工作目录）** 关键段：`batch_agents`（批处理 Agent 定义）、`context_window`、`tool_result_compressor`、LLM 网关等。
- **身份/安全变量**：`AGENTOS_JWT_SECRET`（HS256 密钥，生产必改）、`AGENTOS_AUTH_STRICT=true`（生产严格模式）。
- **落盘文件（`data/`）**：`agents.json`（用户态 Agent）、`config_override.json`（`PUT /config` 写回，重启仍生效）。
- **Skill 目录**：`skills/<name>/skill.jsonld`，启动时自动发现加载（见 4.3.7）。

## 4.2 Agent 定义与配置

平台支持三条 Agent 定义路径，可并存（`GET /api/v1/agents` 合并返回 `batch_count`/`user_count`）：

| 路径 | 方式 | 适用 | 持久化 |
| :-- | :-- | :-- | :-- |
| A. 配置文件 | `config.yaml → batch_agents.agents` | 批处理/需完整执行引擎 | 随配置 |
| B. 前台 no-code | 智能体管理页表单 | 业务快速试验 | `data/agents.json` |
| C. API | `POST /api/v1/agents` | 自动化/集成 | `data/agents.json` |

### 4.2.1 config.yaml 批处理 Agent 字段（`BatchAgentSettings`）

```yaml
batch_agents:
  enabled: true
  default_model: deepseek-v4-flash
  agents:
    - name: battery_repair_assistant      # 唯一名
      description: 电驴新能源电池维修助手
      enabled: true
      business_domain: battery_repair      # 领域，用于知识/实体隔离
      prompt_source: HybridWithTemplate
      prompt_template_path: ./prompts/battery_repair.md
      entity_types: [故障码, 电池, 控制器, 维修方案, BOM]
      relation_types: [可能原因, 解决建议, 适配车型]
      intent_types: [故障诊断, 维修指导, 配件查询]
      model: deepseek-v4-pro               # 覆盖默认模型
      temperature: 0.3
      window_type: hybrid
      window_max_messages: 8
      window_max_seconds: 1800
```

### 4.2.2 API 创建 Agent（`POST /api/v1/agents`，请求体 `AgentCreateRequest`）

| 字段 | 类型 | 说明 |
| :-- | :-- | :-- |
| `name` | string | 必填，唯一名 |
| `description` | string? | 描述 |
| `business_domain` | string? | 业务领域（隔离键） |
| `skills` | string[] | 挂载技能 IRI/名列表 |
| `knowledge_graph` | string? | 关联命名图 |
| `knowledge_pack_ids` | string[] | 知识包 ID |
| `enabled` | bool? | 是否启用 |
| `icon` / `color` | string? | 展示用 |

> `PUT /api/v1/agents/:id` 接受同名字段的部分更新（JSON patch）；`POST /api/v1/agents/:id/graph` 体为 `{ "graph": "...", "description": "..." }`，后端自动加租户前缀。

## 4.3 Skill 开发规范（JSON-LD）★核心

> ⚠️ 本平台的 Skill **不是普通 Markdown**，而是 **JSON-LD 语义节点**。请严格遵循本节规范；可用配套校验器 `00.系统设计/手册配套/skill-validator.mjs` 校验后再提交。

### 4.3.1 为什么用 JSON-LD 而非 Markdown

Skill 需要进入「技能图谱」并被机器消费，因此必须是**结构化、可链接、可发现、可签名、可进化**的语义数据：

| 能力 | JSON-LD 如何支撑 | 普通 Markdown 的局限 |
| :-- | :-- | :-- |
| 机器可读语义 | `@context`/`@type` 定义本体，字段有明确语义 | 仅自由文本，需再解析 |
| 技能发现 | 结构化 `skill:5W2H` 支持维度匹配 + 向量检索 | 无结构化维度 |
| 技能编排 | `skill:links` 显式声明前置/组合/替代关系 | 无关系表达 |
| 安全可信 | 字段可参与 Ed25519 签名与验签 | 难以稳定签名 |
| 自动进化 | `skill:graphMeta` 承载成功率/用量，供进化引擎 | 无运行元数据 |

### 4.3.2 skill.jsonld 文件结构逐字段详解

标准落盘格式（以内核样例 `skills/test_skill/skill.jsonld` 为蓝本）：

```json
{
  "@context": {
    "schema": "https://schema.org/",
    "skill": "https://agent-harness.os/skill#"
  },
  "@id": "iri://skills/diagnose_fault",
  "@type": ["skill:Skill", "skill:Atomic"],
  "schema:name": "diagnose_fault",
  "schema:description": "根据故障码与现象给出诊断与维修建议",
  "skill:version": "1.0.0",
  "skill:maturity": "stable",
  "skill:tags": ["battery", "diagnosis"],
  "skill:5W2H": {
    "skill:what": "电池故障诊断",
    "skill:why": "缩短维修排障时间",
    "skill:who": { "skill:requiredRole": "DA", "skill:roleName": "DA" },
    "skill:when": { "skill:applicablePhase": ["Plan", "Do"], "skill:triggerCondition": null },
    "skill:how": { "skill:approach": "检索故障图谱 + LLM 归因" },
    "skill:howMuch": { "skill:avgDuration": 3, "skill:avgTokenCost": 800 }
  },
  "skill:graphMeta": { "skill:successRate": 1.0, "skill:usageCount": 0, "skill:avgTokenConsumption": 0 },
  "skill:links": [
    { "skill:targetIri": "iri://skills/query_bom", "skill:linkType": "Prerequisite", "skill:confidence": 0.9 }
  ]
}
```

| 字段 | 必填 | 说明 |
| :-- | :-- | :-- |
| `@context` | ✅ | 命名空间前缀：`schema`（schema.org）、`skill`（本平台本体） |
| `@id` | ✅ | 技能 IRI，须以 `iri://skills/` 开头 |
| `@type` | ✅ | 数组，含 `skill:Skill` + 一个节点子类型（见 4.3.4） |
| `schema:name` | ✅ | 技能名（同时兼容 `skill:name`/`name` 回退） |
| `schema:description` | ✅ | 技能描述 |
| `skill:version` | ✅ | 语义化版本 `x.y.z` |
| `skill:maturity` | 推荐 | `experimental` / `stable` / `deprecated` |
| `skill:tags` | 推荐 | 标签数组，辅助发现 |
| `skill:5W2H` | ✅ | 七维语义模型（见 4.3.3） |
| `skill:graphMeta` | 推荐 | `successRate`(0~1)/`usageCount`/`avgTokenConsumption` |
| `skill:links` | 推荐 | 技能关系数组（见 4.3.4） |

> 注：注册 API `POST /api/v1/skills` 使用较扁平的 `SkillMeta` JSON（见 4.3.5/附录 A），而 `skills/` 目录下的**落盘文件**采用上述 JSON-LD 格式；两者可通过校验器与平台互转。

### 4.3.3 5W2H 语义模型

| 维度 | 键 | 内容 | 约束 |
| :-- | :-- | :-- | :-- |
| What | `skill:what` | 技能做什么 | 字符串，必填 |
| Why | `skill:why` | 价值/动机 | 字符串，必填 |
| Who | `skill:who` | `requiredRole`/`roleName` | requiredRole ∈ {PA,DA,CA,AA,SA} |
| When | `skill:when` | `applicablePhase`/`triggerCondition` | phase ∈ {Plan,Do,Check,Act} |
| Where | `skill:where` | 适用技术栈/仓库上下文 | 可选（`targetStack`/`repoPattern`） |
| How | `skill:how` | `approach`（做法/计划） | 对象，必填 |
| HowMuch | `skill:howMuch` | `avgDuration`/`avgTokenCost` | 数值，成本画像 |

### 4.3.4 节点类型与链接类型

**节点类型（`@type` 第二元素）**：

| 类型 | 用途 |
| :-- | :-- |
| `skill:Atomic` | 原子技能（单一能力） |
| `skill:Composite` | 组合技能（编排多个技能） |
| `skill:MOC` | 导航入口（Map of Content） |
| `skill:KnowledgeFragment` | 知识碎片 |
| `skill:MCPTool` | 由 MCP 工具同步而来 |
| `skill:Bootstrap` | 自举学习产生 |

**链接类型（`skill:links[].skill:linkType`）**：`Prerequisite`（前置）/`Composition`（组成）/`Related`（相关）/`Alternative`（替代）/`Extends`（扩展）/`Generalization`（泛化）；每条链接含 `skill:targetIri` 与 `skill:confidence`(0~1)。MOC 节点用于组织技能层级，作为发现导航入口。

### 4.3.5 三级渐进式披露与 I/O Schema

平台按需向 Agent 暴露技能信息，降低上下文开销：

| 级别 | 暴露内容 | 场景 |
| :-- | :-- | :-- |
| Basic | 名称、描述 | Agent 初次扫描 |
| Schema | + 输入/输出 Schema | Agent 选择工具 |
| Full | + 依赖、签名、映射 | Agent 执行工具 |

注册用 `SkillMeta`（`POST /api/v1/skills` 请求体）关键字段：

| 字段 | 说明 |
| :-- | :-- |
| `skill_iri` / `name` / `description` / `version` | 基本标识 |
| `category` | 分类（如 `battery`） |
| `security_level` | `low`/`normal`/`high`/`critical` |
| `allowed_roles` | 角色白名单，如 `["DA"]` |
| `input_schema` / `output_schema` | JSON Schema |
| `compiled_template` | 执行模板 |
| `input_mapping` / `output_mapping` | 本地参数名 ↔ IRI 映射 |
| `skill_types` | 语义能力 IRI 数组（对应 `@type`，如 FileOperation） |
| `signature` / `signature_algorithm` | 见 4.3.6 |

### 4.3.6 数字签名与安全（Ed25519）

- **签名载荷**：`skill_iri|name|version|category|security_level|compiled_template`，用 Ed25519 私钥签名，`signature` 存 base64，`signature_algorithm="ed25519"`。
- **信任锚**：后端通过受信公钥集校验；未配置信任锚时状态为 `NoTrustAnchor`。
- **四态 `SignatureStatus`**：

| 状态 | 含义 |
| :-- | :-- |
| `Verified` | 有签名且用受信公钥验签通过 |
| `Unsigned` | 无签名 |
| `Invalid` | 有签名但验签失败 |
| `NoTrustAnchor` | 有签名但后端未配置信任公钥 |

- **RBAC**：严格模式（`AGENTOS_AUTH_STRICT=true`）下 `POST /api/v1/skills` 需 `DA` 角色；`allowed_roles` 与 `security_level` 影响运行时可调用范围（配合 SyscallGate 三层校验：JSON Schema → 签名 → 白名单）。

### 4.3.7 注册与生命周期

**四种落地方式**：

1. **放置目录**：将 `skill.jsonld` 放入 `skills/<name>/`，后端启动时自动发现加载。
2. **API 注册**：`POST /api/v1/skills`（`SkillMeta` JSON，需 DA）。
3. **SkillCreator 自然语言生成**：描述需求 → LLM 生成 JSON-LD 技能定义。
4. **Markdown 转换**：读取 `skill.md` → LLM 转换为 JSON-LD。

**校验**：内置 `jsonld_validate` 工具；开发期用配套 `skill-validator.mjs`（见附录 C）先行校验。

**进化与治理**：
- **进化引擎**基于 `graphMeta` 用量给出建议：`AddLink`/`UpdateSuccessRate`/`CreateFragment`/`Deprecate`/`Merge`/`Split`。
- **冲突检测**覆盖 6 类：`Resource`/`Dependency`/`Permission`/`Semantic`/`Temporal`/`Version`。
- **自举学习**从任务执行、错误恢复、用户反馈、代码审查、知识抽取中 `Learn`/`Reduce` 技能。

## 4.4 知识库开发

- **导入**：`POST /api/v1/kg/import`，体 `{ nodes:[...], edges:[...], graph:"命名图", clear_before:true }`（支持 JSON-LD / 三元组）。
- **写节点**：`POST /api/v1/nodes`（按 `entity_types` 写故障码、BOM 等）。
- **查询**：`POST /api/v1/kg/query`，体 `{ sparql:"...", named_graph:"..." }`。
- **命名图与租户前缀**：写入自动限定在 `graph://tenant/<id>/...`，实现 SPARQL 级隔离。
- **向量 RAG**：文档进入 `HyperspaceStore`；`HybridSearchFilter::with_tenant` 附加 `tenant:<id>` 标签实现向量级隔离。
- **本体注册**：`ontology_register` 注册自定义术语（`GET /api/v1/ontology/types`）。
- **知识库数据摄取（v1.2）**：知识库页支持在建库后直接摄取——
  - **向量库上传**：`POST /api/v1/kb/bases/:id/upload`（multipart，多文件累积），后端按固定长度 `chunk_text` 分块 → `upsert_with_metadata`（带 namespace/tenant 标签）；纯文本直接入库，PDF/Word 暂不解析将逐文件返回 `skipped_reason`。
  - **图谱库导入**：`POST /api/v1/kb/bases/:id/import-graph`（multipart），支持 CSV / JSONL / N-Triples → `RdfQuad` → 写命名图；可选 `schema`（存元三元组）与 `clear_before`（先清空）；返回 `triples_written / entities / relations`。
  - **中文 IRI 与计数**：实体/关系名原样保留 Unicode，仅对 IRIREF 语法禁用字符做 UTF-8 百分号编码，避免中文实体坍缩碰撞；`GET /api/v1/kb/bases/:id/stats` 精确回显三元组数。

## 4.5 Prompt 模板开发

- **模板**：Jinja2 系统提示词，支持 `{{tenant_id}}`/`{{user_id}}` 占位符。
- **流程**：`POST /prompts`（创建）→ `POST /prompts/:id/activate`（激活，唯一）→ `PUT /prompts/:id/canary`（灰度）→ `GET /prompts/resolve`（分流决策）。
- **灰度请求 `CanaryRequest`**：`{ percent:u8, tenant_ids:[], roles:[] }`；后端按 `hash(user_id)%100` 分流，可限定租户/角色白名单。

## 4.6 MCP 工具接入

- **注册**：`POST /api/v1/mcp/servers`，体 `{ name, description?, endpoint, protocol? }`。
- **传输**：HTTP 已实现（Stdio/SSE/WebSocket/ManagedProxy/SDK 规划中）。
- **协议**：JSON-RPC，如 `{"jsonrpc":"2.0","method":"tools/call","params":{"name":"...","arguments":{...}},"id":1}`。
- **同步**：`MCPIntegration` 将 MCP 工具自动同步为技能图谱中的 `skill:MCPTool` 节点。

## 4.7 护栏与 Hooks 配置

- **ToolGuard 两阶段**：`SkillBefore` 预注入约束（Pre-Injection）+ `SkillAfter` 结果校验（Post-Validation），违规经 `HookResult::Abort` 拦截。
- **配置 `guard_rules.json`**：`categories → {pre_injections, validations}`；`enforcement` 三级 `Must`/`Should`/`Info`；支持热重载（`start_hot_reload`）。
- **8 分类**：FileRead/FileWrite/Search/CodeExecution/KnowledgeGraph/KnowledgeExtract/HttpRequest/Meta。
- **7 内置验证器**：`file_length_check`/`search_count_check`/`exit_code_check`/`knowledge_empty_check`/`knowledge_depth_check`/`extract_empty_check`/`http_status_check`。
- **20 钩子点**：覆盖 Agent 生命周期、L0~L3 记忆、Plan/Check/Decision、System 初始化。
- **审计**：`GET /api/v1/guard/audit`、`/guard/stats`。

## 4.8 安全与多租户开发

- **IAM 三级身份**：JWT(HS256) → X-Identity(base64) → 匿名（见 2.2）。
- **RBAC**：`identity.require_role("DA")` 守护写端点；`AGENTOS_AUTH_STRICT` 控制严格度。
- **双层隔离**：KG 命名图 `graph://tenant/<id>/...` + 向量 `tenant:<id>` 标签；会话 L1Session/`tenant_sessions` 承载 `user_id`/`tenant_id` 血缘，L0/L2 归档附带租户维度。

## 4.9 测试与验证

- **后端**：`cargo test --lib`（内核单测）、`cargo build`/`cargo check`。
- **前端**：`vitest`（`src/api/__tests__/client.test.ts`）、`tsc --noEmit`、`npm run build`。
- **E2E**：`wild-agent-os-admin/_cdp_create_agent_e2e.mjs`（创建 Agent 端到端）。
- **配套（本手册）**：Skill JSON-LD 校验器单测 `node --test skill-validator.test.mjs`；后端冒烟 `smoke-test.sh`（见附录 C / 4.9）。

## 4.10 部署与运维

- **容器**：`deploy/Dockerfile.core`（后端）、`Dockerfile.admin`（前端）；构建产物见 `deploy/coreout`。
- **编排**：`deploy/k8s/` 清单；边缘接入 `deploy/nginx-edge-30010.conf`（对外 `30010`）。
- **参考**：`deploy/测试服部署手册.md`；数据目录迁移 `scripts/migrate-data-dir.sh`。
- **上线校验**：部署后先跑冒烟脚本（附录 C）确认核心端点 2xx，再执行 3.3 端到端走查。

---

# 第 5 篇　附录

## 附录 A　API 端点速查表

> 前缀 `/api/v1`（`/health`、`/metrics` 除外）。「DA」列表示严格模式下写操作需 DA 角色。

| 方法 | 路径 | 用途 | DA |
| :-- | :-- | :-- | :-- |
| GET | `/health` | 健康/版本 | |
| GET | `/metrics` | skills/l2_nodes/events 指标 | |
| GET | `/api/v1/config` | 脱敏运行期配置 | |
| PUT | `/api/v1/config` | 配置写回（`config_override.json`） | |
| GET | `/api/v1/agents` | Agent 列表（合并 batch+user） | |
| POST | `/api/v1/agents` | 创建 Agent | |
| PUT | `/api/v1/agents/:id` | 更新 Agent | |
| DELETE | `/api/v1/agents/:id` | 删除 Agent | |
| POST | `/api/v1/agents/:id/graph` | 绑定知识图谱 | |
| POST | `/api/v1/agents/:id/chat` | Agent 对话 | |
| GET | `/api/v1/skills` | 技能列表 | |
| POST | `/api/v1/skills` | 注册技能（Ed25519 验签） | ✅ |
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

- **维护约定**：本手册随内核版本同步更新；涉及 API/字段变更时，先更新附录 A 与第 4 篇，再回归冒烟脚本与校验器。
- **事实来源**：以工作区内核源码为准；界面以 `http://112.45.121.74:30010` 最新版为准，截图存 `./screenshots/`。
