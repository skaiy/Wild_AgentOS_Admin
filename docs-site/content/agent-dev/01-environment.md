---
sidebar_position: 1
title: 环境、访问与身份
---

# 环境、访问与身份

## 1. 组件与默认端口

| 组件 | 说明 | 默认端口约定 |
| :-- | :-- | :-- |
| 管理控制台 | React 19 + Vite 6 前端，静态资源由 Web 服务器托管 | `3000`（开发）/ 由部署环境映射（生产） |
| 后端 HTTP / SSE | Axum，提供 `/api/v1` 管理接口与 OpenAI 兼容层 | `8080` |
| 后端 gRPC | Tonic，提供 `SeKernelServiceServer` | `50051` |

常用探活与入口：

| 用途 | 路径 |
| :-- | :-- |
| 服务健康 | `GET /health` |
| 运行指标 | `GET /metrics` |
| 管理接口前缀 | `/api/v1` |
| OpenAI 兼容 | `GET /v1/models`、`POST /v1/chat/completions` |

实际访问地址、端口与反向代理前缀以部署环境配置为准；管理端通过同源反向代理访问后端时，前端只需请求相对路径。

## 2. 登录与身份解析

- 管理端当前提供演示登录入口，用于本地与测试环境验证；生产部署需接入正式身份体系。
- 后端按配置解析 JWT 或 `X-Identity` 请求头得到身份（租户、用户、角色）。
- 严格模式下写操作需要对应角色，例如批处理启停要求 `DA` 角色；权限不足返回 `403`。
- 对外调用（发布后的 Agent、OpenAI 兼容接口）使用调用方 API Key，以 `Authorization: Bearer <api-key>` 传递。

## 3. 敏感信息约定

- API Key、JWT、Cookie、Provider 密钥不得出现在截图、日志、工单与版本库中。
- `GET /api/v1/config` 只返回脱敏状态（例如 `api_key_configured`），不回显密钥原文。
- 配置覆盖文件 `data/config_override.json` 应限制为运行账号可读写。
- 新签发的 API Key 仅在创建响应中出现一次，需即时保存到密钥管理系统。

## 4. 常用术语

| 术语 | 含义 |
| :-- | :-- |
| Agent | 挂载模型、Skill 与知识包的业务智能体 |
| Skill | 描述输入、输出、准入角色与业务能力的技能元数据 |
| Knowledge Base | 向量库或图谱库 |
| Knowledge Pack | 分类、图谱库与向量库的组合，供 Agent 挂载 |
| Named Graph | Oxigraph 中隔离存储 RDF 数据的命名图 |
| RAG | 将图谱查询或向量召回结果加入模型上下文 |
| Model Provider | OpenAI 兼容或其他模型服务接入点 |
| Model Resource | Provider 下的具体型号及其能力描述 |
| Model Mount | Agent 的 `chat`、`vision` 等能力槽到模型资源的映射 |
| L0-L3 | 持久层、会话层、共享黑板与投影视图 |
| Guard | 工具调用与输入输出的安全校验组件 |
| RBAC | 基于角色的接口访问控制 |

## 5. 开发流程总览

1. 在模型注册中心配置 Provider 并登记模型资源，完成连通性测试。
2. 在知识中心建立分类、知识库，导入数据并组合知识包。
3. 在技能中心创建或导入 Skill，通过准入流水线。
4. 在 Prompt 版本管理创建系统提示词版本并激活。
5. 在智能体管理创建 Agent，挂载 Skill、知识包与模型能力槽。
6. 使用 Agent 测试与任务控制台验证回答、知识命中与工具调用。
7. 配置调用方与 API Key，对外发布并接入业务系统。
8. 通过运行时内核、记忆中心、批处理运维与安全与合规页面持续观察运行状态。
