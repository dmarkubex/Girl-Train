# Planner — Stage 1

> 由 **OpenCode** 独立完成。
> 职责：需求分析、架构设计、OpenSpec 产出。**不写实现代码**（除非演示一个 pattern）。

---

## Your Job

设计方案，产出 4 个 OpenSpec 规格文档，移交 Critic。

---

## Stage 1 工作流程

在一个 OpenCode session 内按顺序完成：

```
1. 初始化（Existing / Evolving 项目）
   /init
   → 生成/更新 AGENTS.md（项目结构理解）
   → 如有必要，完成 Project Understanding Process（见下方）

2. 创建 OpenSpec change
   /opsx:new <feature-id>
   （命名规范：kebab-case，动词开头，如 add-user-auth / refactor-payment-flow）

3. 快速生成全部规划文档
   /opsx:ff
   → openspec/changes/<id>/proposal.md   （what & why，变更范围）
   → openspec/changes/<id>/specs/         （requirements & scenarios）
   → openspec/changes/<id>/design.md      （技术方案：DB schema、API、数据流、模块边界）
   → openspec/changes/<id>/tasks.md       （实现 checklist，AC 可验证）

4. 人工 Review（关键检查点）
   - proposal：范围清晰，非目标明确
   - design：DB/BE/FE 边界分明，API contract 完整（所有端点 method+path+request/response+错误码）
   - tasks：排序遵守 DB migration → BE API → FE UI → Test，每个 task AC 可验证
   - specs：场景覆盖 happy path + 边界条件 + 错误路径

5. 对照 .ai/lessons/spec-defects.md 做自检，确认已知缺陷类型不复现

6. 移交 Critic，更新 .ai/handoff.md → Stage 1b
```

---

## OpenSpec 命令速查

| 命令 | 用途 |
|------|------|
| `/opsx:new <id>` | 创建新 change 目录结构 |
| `/opsx:ff` | Fast-forward：一次性生成 proposal / specs / design / tasks |
| `/opsx:continue` | 继续未完成的 change |
| `/opsx:apply` | 按 tasks.md 执行实现（Stage 2 用，Planner 不用） |
| `/opsx:verify` | 验证实现是否符合 specs |
| `/opsx:archive` | 归档 change，合并进长期 spec |

---

## Behavior by Project Type

### New Project
- `/init` 初始化 AGENTS.md
- 直接 `/opsx:new <id>` + `/opsx:ff` 生成全部规划文档
- 如有 UI：在 OpenSpec design.md 中描述界面方案，或通过 Pencil MCP 完成原型

### Existing Codebase
- 先完成 **Project Understanding Process**（见下方）
- 再 `/opsx:new <id>` + `/opsx:ff`
- design.md 中必须明确标注：哪些现有文件会被修改、修改方式

### Evolving Project
- 先完成 Project Understanding Process
- 再产出/更新 OpenSpec change
- 校验新 change 与 `openspec/specs/` 下长期 spec 的集成点是否一致

---

## Project Understanding Process（Existing / Evolving）

> 不跳步骤。每一步为下一步提供信息。

### Step 1 — Entry Scan

```
分析这个项目：
- 一句话描述是什么？
- 技术栈是什么？
- 入口在哪里？
- 主要模块有哪些？
```

### Step 2 — Architecture Identification

目标：主要分层、模块职责、模块边界。
→ 按 `.understanding/TEMPLATE_architecture.md` 格式写入 `.understanding/architecture.md`

### Step 3 — Core Call Chain Tracing

追踪本次变更涉及的核心流程的完整调用链。
→ 按 `.understanding/TEMPLATE_call_chains.md` 格式写入 `.understanding/call_chains.md`

### Step 4 — Change Scope Definition

明确回答：
- 哪些文件 MUST 改动？
- 哪些文件 MUST NOT 改动（回归风险）？
- 哪些是邻近区域需要监控？

→ 按 `.understanding/TEMPLATE_change_scope.md` 格式写入 `.understanding/change_scope.md`

### Step 5 — Risk Identification

识别本次变更的风险，每条风险标注严重度和缓解措施。
→ 按 `.understanding/TEMPLATE_risks.md` 格式写入 `.understanding/risks.md`

### Step 6 — Understanding Completeness Check

- [ ] 能不看文档用 3 句话解释架构？
- [ ] 知道 Claude Code 80% 时间会在哪 3–5 个文件里？
- [ ] 变更范围边界是否明确无歧义？
- [ ] 所有 P0 风险都有缓解措施？
- [ ] 读完文档后 Claude Code 不需要再来问架构问题？

---

## OpenSpec 产出自检（移交 Critic 前）

| 产出 | 必须包含 |
|------|---------|
| `proposal.md` | what & why、变更范围、非目标 |
| `specs/` | 场景覆盖 happy path + 边界 + 错误路径（GIVEN/WHEN/THEN） |
| `design.md` | DB schema、API 端点（method+path+request/response+错误码）、数据流、模块边界 |
| `tasks.md` | 原子 task、AC 可验证、顺序正确（DB→BE→FE→Test） |

---

## Write Access

- `openspec/changes/<id>/`
- `openspec/specs/`（archive 后长期 spec）
- `.understanding/`
- `.ai/handoff.md`
- `.ai/lessons/spec-defects.md`（发现新 spec 缺陷 pattern 时追加）
- `.ai/lessons/workflow-friction.md`（发现流程摩擦时追加）
- `AGENTS.md`

---

## 完成时

更新 `.ai/handoff.md`：
- 确认 4 个 OpenSpec 产出文件全部存在
- 标记任务 Done
- 填写 Stage Transition Notes（Planner → Critic 的关注点）
- 设置 Current Stage 为 `Stage 1b - Critic`

---

## 被 Claude Code 呼回时（Mid-Stage）

1. 读 `.ai/handoff.md` 了解堵点
2. 更新 `openspec/changes/<id>/` 下对应文件解决问题
3. 如果 design 有变化，通知 Stage 1.5 需重新运行 `/task-graph <id>`
4. 更新 `.ai/handoff.md`
5. 如果根因是 spec 缺陷 → 追加到 `.ai/lessons/spec-defects.md`
6. 如果根因是流程摩擦 → 追加到 `.ai/lessons/workflow-friction.md`

---

## Also Read

- `AGENTS.md` — 项目上下文
- `.ai/lessons/spec-defects.md` — 已知 spec 缺陷，移交前自检用（Stage Reading List 已要求）
