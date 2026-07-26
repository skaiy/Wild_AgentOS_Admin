---
sidebar_position: 3
title: Skill 开发与准入
---

# Skill 开发与准入

## 1. Skill 层级

| 层级 | IRI 前缀 | 可维护性 |
| :-- | :-- | :-- |
| 系统级 | `iri://` | 内核内置资源，管理端只读 |
| 应用级 | `skill://` | 可在管理端创建、编辑、删除与重新导入 |

## 2. 两种创建方式

**界面创建**：填写 IRI、名称、版本、分类、安全级别、允许角色、输入输出 Schema 与模板。

**Git 导入**：`POST /api/v1/skills/import-git`，填写仓库地址、引用（分支或标签）与 `skill.yaml` 路径；导入后与界面创建的 Skill 等价。

## 3. 元数据要点

| 字段 | 说明 |
| :-- | :-- |
| `skill_iri` | 唯一标识，应用级使用 `skill://` 前缀 |
| `version` | 语义化版本，升级时保持可回溯 |
| `category` | 业务分类，用于检索与统计 |
| `security_level` | 安全级别，决定准入与调用约束 |
| `allowed_roles` | 允许调用的角色列表，配合 RBAC 生效 |
| `input_schema` / `output_schema` | JSON Schema，运行时据此校验参数与结果 |
| `skill_types` | 能力标记（如网络访问、对象存储、MCP 调用），影响安全扫描判定 |

Schema 设计建议：字段命名与 Agent 传参一致；必填项显式声明；输出结构保持稳定，便于下游 Skill 组合。

## 4. 准入流水线

| 阶段 | 检查内容 |
| :-- | :-- |
| `lint` | 静态检查：元数据完整性、Schema 合法性 |
| `security` | 安全扫描：签名校验与敏感信息检测 |
| `test` | 单元测试与冲突检测 |
| `publish` | 发布注册（Admission） |

前三阶段均无失败时视为准入通过，`publish` 才会执行；否则 `publish` 记为跳过。可在技能中心查看历史运行记录（`GET /api/v1/skills/pipeline-runs`），或重新触发（`POST /api/v1/skills/pipeline-rerun`）。

## 5. 技能图谱与依赖

Skill 之间支持前置依赖、组合、关联、替代、扩展、泛化等语义链接，内核据此构成技能图谱并提供 PageRank、社区发现与根因分析。编排多步业务能力时：

1. 将原子能力拆分为独立 Skill（单一职责、可独立测试）。
2. 用组合类 Skill 表达业务流程，依赖关系通过前置链接声明。
3. 避免形成依赖环，内核不变式检查会拒绝有环结构。

## 6. 排查

| 现象 | 检查项 |
| :-- | :-- |
| 创建失败 | IRI 是否重复、Schema 是否为合法 JSON |
| 准入未通过 | 查看对应阶段日志：签名、敏感信息、测试失败原因 |
| Agent 调用无效果 | Skill 是否启用、是否已挂载到 Agent、角色是否在 `allowed_roles` 内 |
| 系统级 Skill 无法编辑 | 预期行为，`iri://` 资源只读 |
