---
sidebar_position: 7
title: 对外发布与集成
---

# 对外发布与集成

## 1. 发布链路

1. 在「系统设置 → API 密钥管理」创建调用方（Client），选择授权的 Agent。
2. 为调用方签发 API Key（`POST /api/v1/api-clients/{id}/keys`），密钥仅在创建响应中出现一次。
3. 外部系统以 `Authorization: Bearer <api-key>` 调用对外接口。
4. 通过调用审计（`GET /api/v1/api-audit`）核对调用量、成功率与延迟。

密钥可吊销（`DELETE /api/v1/api-clients/{id}/keys/{key_id}`），调用方可停用或删除。

## 2. 三类集成方式

| 方式 | 适用场景 | 入口 |
| :-- | :-- | :-- |
| 平台 REST | 业务系统需要知识命中状态、来源等结构化信息 | `POST /api/v1/public/agents/{id}/chat` |
| OpenAI 兼容 | 已有 OpenAI SDK 或第三方工具直接接入 | `POST /v1/chat/completions`，`model` 传 Agent 标识 |
| gRPC | 高性能、内部服务间调用与多节点联邦 | `SeKernelServiceServer`（`proto/pdca_core.proto`） |

流式场景使用 SSE：任务执行流 `POST /api/v1/tasks/stream`，事件类型包含思考、工具调用、工具结果、模型内容、阶段变更、状态、错误与完成。

## 3. MCP 接入

MCP 枢纽（`#mcp`）用于登记 Model Context Protocol Server（名称、描述、端点、协议）。适用于把外部工具能力以标准协议接入 Agent。登记后应实测连接状态与工具清单；是否持久化与重启恢复方式以部署后端实现为准。

## 4. 对接约定

| 约定 | 说明 |
| :-- | :-- |
| 幂等与重试 | 外部系统需自行处理超时重试，并避免重复提交同一业务请求 |
| 限流 | Provider 侧限流会以上游错误形式返回，调用方应实现退避 |
| 响应判读 | 以 `status`、`grounded`、`sources` 判断是否可直接展示给终端用户 |
| 长文本 | 大体积输入应先入知识库再引用，而非整体塞入单次请求 |
| 密钥轮换 | 按周期签发新密钥、切流后吊销旧密钥 |

## 5. 排查

| 现象 | 检查项 |
| :-- | :-- |
| 401 / 403 | 密钥是否有效、调用方是否授权该 Agent、严格模式角色是否满足 |
| 找不到 Agent | `model` 或路径中的 Agent 标识是否与管理端一致 |
| SSE 无输出 | 反向代理是否关闭缓冲、连接超时设置、任务状态是否已失败 |
| 审计无记录 | 是否走了对外接口（管理接口不计入调用方审计） |
