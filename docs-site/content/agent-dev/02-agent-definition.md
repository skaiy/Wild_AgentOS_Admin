---
sidebar_position: 2
title: Agent 定义与能力挂载
---

# Agent 定义与能力挂载

## 1. 创建 Agent

进入「智能体管理」（`#agents`），点击创建后配置：

1. 名称与描述。
2. `business_domain`：业务领域标识，用于分类与统计。
3. Skill 列表：从已注册 Skill 中勾选。
4. 知识包列表：`knowledge_pack_ids`，Agent 的知识来源统一由知识包提供。
5. 图标与主题色：仅影响展示。

Agent 由后端持久化，刷新页面后从 `GET /api/v1/agents` 重新加载。卡片支持编辑、删除、测试与查看发布配置。

## 2. 模型能力槽

能力槽的取值是**模型资源 ID**，不是型号名称：

```json
{
  "model_mounts": {
    "chat": "res-example-chat",
    "vision": "res-example-vision"
  }
}
```

| 槽位 | 触发条件 |
| :-- | :-- |
| `chat` | 纯文本请求 |
| `vision` | 请求包含图片 |

未挂载能力槽时，运行时回退到 Agent 的基础模型字段或网关默认模型。挂载前应确保模型资源已启用且连通性测试通过。

## 3. 请求与响应结构

对话接口：`POST /api/v1/agents/{id}/chat`

| 请求字段 | 说明 |
| :-- | :-- |
| `message` | 用户输入文本 |
| `images` | 图片列表（可选），存在时走 `vision` 槽 |

| 响应字段 | 判读 |
| :-- | :-- |
| `answer` | 模型回答 |
| `model` | 实际使用的型号，用于确认路由是否符合预期 |
| `status` | `success` 表示模型调用成功；`degraded` 表示模型调用失败后使用了知识降级回答，不能视为连通成功 |
| `grounded` | 是否命中知识 |
| `retrieved` / `vector_retrieved` | 图谱与向量召回条数 |
| `sources` | 命中来源，用于回溯知识出处 |
| `warning` / `suggested_actions` | 运行时给出的提示与后续建议 |

## 4. 能力挂载检查清单

| 检查项 | 期望 |
| :-- | :-- |
| Skill 挂载 | 需要的 Skill 均已通过准入流水线且处于启用状态 |
| 知识包挂载 | 知识包内的图谱库/向量库有数据，命名图与向量命名空间可检索 |
| 模型能力槽 | `chat`（必要时含 `vision`）指向启用的模型资源，测试延迟正常 |
| Prompt | 已激活版本的变量与运行时传入字段一致 |
| 发布配置 | 若需对外调用，已创建调用方并授权该 Agent |

## 5. 迭代与回归建议

- 修改能力挂载后，先用固定的验证问题集回归，确认 `model`、`grounded`、`retrieved` 三项与改动预期一致。
- 更换知识包或 Embedding 后需重新验证召回，必要时重建向量索引。
- 大改动前导出当前 Agent 配置（接口响应即为配置快照），便于回滚。
