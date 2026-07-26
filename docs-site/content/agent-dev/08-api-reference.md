---
sidebar_position: 8
title: API 速查
---

# API 速查

> 管理业务接口前缀为 `/api/v1`；`/health`、`/metrics` 与 `/v1/*`（OpenAI 兼容）位于根路径。

## 1. 服务与配置

| 方法 | 路径 | 用途 |
| :-- | :-- | :-- |
| GET | `/health` | 服务健康 |
| GET | `/metrics` | 运行指标 |
| GET | `/api/v1/config` | 脱敏配置快照 |
| PUT | `/api/v1/config` | 更新网关、Embedding、模型与管理策略配置 |

## 2. Agent 与任务

| 方法 | 路径 | 用途 |
| :-- | :-- | :-- |
| GET / POST | `/api/v1/agents` | 列表与创建 |
| PUT / DELETE | `/api/v1/agents/{id}` | 更新与删除 |
| POST | `/api/v1/agents/{id}/chat` | 管理端 Agent 对话 |
| POST | `/api/v1/public/agents/{id}/chat` | 对外 Agent 对话（API Key 鉴权） |
| POST | `/api/v1/images/upload` | 图片上传（多模态输入） |
| POST | `/api/v1/tasks` | 创建任务 |
| POST | `/api/v1/tasks/stream` | SSE 任务执行 |
| GET | `/api/v1/tasks/{task_iri}/status` | 任务状态 |
| GET | `/api/v1/tasks/{task_iri}/details` | 任务明细 |
| GET | `/api/v1/tasks/trends` | 任务趋势（`days` 参数） |

## 3. Skill 与 Prompt

| 方法 | 路径 | 用途 |
| :-- | :-- | :-- |
| GET / POST | `/api/v1/skills` | 列表与创建 |
| DELETE | `/api/v1/skills` | 删除（`iri` 查询参数） |
| GET | `/api/v1/skills/manifest` | 查看 Skill 清单（`iri` 查询参数） |
| POST | `/api/v1/skills/import-git` | Git 导入 |
| GET | `/api/v1/skills/pipeline-runs` | 准入流水线记录 |
| POST | `/api/v1/skills/pipeline-rerun` | 重新运行准入 |
| GET / POST | `/api/v1/prompts` | 列表与创建 |
| POST | `/api/v1/prompts/{id}/activate` | 激活版本 |
| PUT | `/api/v1/prompts/{id}/canary` | 配置灰度 |
| DELETE | `/api/v1/prompts/{id}` | 删除版本 |
| GET | `/api/v1/prompts/resolve` | 解析命中版本 |

## 4. 知识与本体

| 方法 | 路径 | 用途 |
| :-- | :-- | :-- |
| GET / POST | `/api/v1/kb/categories` | 分类列表与创建 |
| PUT / DELETE | `/api/v1/kb/categories/{id}` | 分类更新与删除 |
| GET / POST | `/api/v1/kb/bases` | 知识库列表与创建 |
| DELETE | `/api/v1/kb/bases/{id}` | 删除知识库 |
| POST | `/api/v1/kb/bases/{id}/upload` | 文档上传 |
| POST | `/api/v1/kb/bases/{id}/ingest` | 文本摄取 |
| GET | `/api/v1/kb/bases/{id}/documents` | 文档台账 |
| GET | `/api/v1/kb/bases/{id}/documents/{doc_id}/raw` | 原文预览 |
| POST | `/api/v1/kb/bases/{id}/reindex` | 重新索引 |
| POST | `/api/v1/kb/bases/{id}/import-graph` | 结构化图谱导入 |
| POST | `/api/v1/kg/query` | SPARQL 查询（`sparql`、`named_graph`） |
| GET / POST | `/api/v1/knowledge-packs` | 知识包列表与创建 |
| PUT / DELETE | `/api/v1/knowledge-packs/{id}` | 知识包更新与删除 |
| GET | `/api/v1/ontology/types` | 本体类型 |
| POST | `/api/v1/ontology/actions/{id}/invoke` | 本体动作调用 |

## 5. 模型与集成

| 方法 | 路径 | 用途 |
| :-- | :-- | :-- |
| POST | `/api/v1/providers/models` | 拉取 Provider 型号 |
| POST | `/api/v1/models/test` | 模型连通性测试 |
| POST | `/api/v1/embedding/activate` | 激活 Embedding 资源 |
| GET / POST | `/api/v1/mcp/servers` | MCP Server 列表与登记 |
| GET | `/v1/models` | OpenAI 兼容模型列表 |
| POST | `/v1/chat/completions` | OpenAI 兼容对话 |

## 6. 运维与安全

| 方法 | 路径 | 用途 |
| :-- | :-- | :-- |
| GET | `/api/v1/memory/unified-stats` | L0-L3 统一记忆指标 |
| GET | `/api/v1/blackboard/tasks` | L2 黑板任务列表 |
| GET | `/api/v1/blackboard/nodes` | L2 黑板节点（`task_iri`、`role` 等过滤） |
| GET | `/api/v1/batch/agents` | 批处理 Agent 列表 |
| POST | `/api/v1/batch/agents/{name}/control` | 批处理启停（`action` 为 `start` 或 `stop`） |
| GET | `/api/v1/guard/stats` | Guard 统计 |
| GET | `/api/v1/guard/audit` | 安全审计明细 |
| GET / POST | `/api/v1/api-clients` | 调用方列表与创建 |
| PUT / DELETE | `/api/v1/api-clients/{id}` | 调用方更新与删除 |
| POST | `/api/v1/api-clients/{id}/keys` | 签发 API Key |
| DELETE | `/api/v1/api-clients/{id}/keys/{key_id}` | 吊销 API Key |
| GET | `/api/v1/api-audit` | 调用审计 |
