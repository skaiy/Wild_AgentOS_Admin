---
sidebar_position: 6
title: 模型注册与能力槽
---

# 模型注册与能力槽

## 1. Provider

| 字段 | 说明 |
| :-- | :-- |
| 名称 / ID | Provider 标识，模型资源通过 `provider_id` 引用 |
| `base_url` | OpenAI 兼容 API 根路径；系统会去除末尾斜杠并剥离结尾的 `/v1`，调用时统一拼接 `/v1/...` |
| `api_key` | 访问密钥，保存后不回显；留空表示沿用原值 |
| 类型 / 超时 / 启用状态 | 接入类型、请求超时（秒）与是否参与路由 |

「拉取型号」调用 `POST /api/v1/providers/models` 获取远端可用型号列表，选择后登记为模型资源。

## 2. 模型资源

| 字段 | 说明 |
| :-- | :-- |
| `provider_id` | 所属 Provider |
| 真实模型名 | 传给 Provider 的型号字符串，必须与远端一致 |
| 模态 | `chat`、`vision`、`embedding`、`audio`、`realtime` |
| 向量维度 | `embedding` 模态必填，需与向量库一致 |
| 启用 / 工具 / 推理 | 是否可路由、是否支持工具调用与推理特性 |
| 测试状态与延迟 | 最近一次连通性测试结果 |

连通性测试 `POST /api/v1/models/test` 按模态选择探测方式：`embedding` 走向量接口并回传维度；`vision` 使用极小图片走对话接口；其余走对话接口最小请求。测试结果不包含密钥。

## 3. 配置保存语义

- 更新走 `PUT /api/v1/config`，`models` 段为**集合整体替换**：提交时必须包含希望保留的全部 Provider 与模型资源。
- Provider 的 `api_key` 留空或缺失时，按 `id` 回填原有密钥。
- `gateway`、`embedding`、`admin_policies` 为深合并语义。
- 保存后先写入配置覆盖文件，再热更新模型注册表；`embedding` 变更会触发向量服务热更新，旧索引目录会以带时间戳的备份名保留。

## 4. 默认网关与 Embedding

- 默认网关模型用于 Agent 未挂载能力槽时的回退路由。
- Embedding 通过 `POST /api/v1/embedding/activate` 激活，前置条件：资源含 `embedding` 模态、维度大于 0、所属 Provider 存在且已配置 `base_url` 与密钥。
- 切换 Embedding 模型（尤其维度变化）后，历史向量数据需重新索引才能正常召回。

## 5. 能力槽挂载

1. 保存并测试模型资源。
2. 编辑 Agent，将 `model_mounts.chat`（必要时 `model_mounts.vision`）指向模型资源 ID。
3. 用 Agent 测试确认响应中的 `model` 字段为预期型号。

## 6. 排查

| 现象 | 检查项 |
| :-- | :-- |
| 测试返回 401 | 密钥无效或未绑定该型号权限 |
| 测试返回 404 | `base_url` 拼接错误（重复 `/v1`）或型号名不存在 |
| 测试超时 | 网络可达性、出口策略、超时设置 |
| 对话返回 `degraded` | 能力槽指向的资源不可用，查看模型调用错误 |
| 保存后资源丢失 | `models` 段为整体替换，提交内容需包含全部希望保留的记录 |
| 向量召回为空 | 生效的 Embedding 资源与向量库维度不一致 |
