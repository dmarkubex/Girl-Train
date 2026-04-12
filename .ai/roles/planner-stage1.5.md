# Planner — Stage 1.5 (Task Graph)

> 由 **OpenCode** 独立完成。
> 职责：读取 OpenSpec 产出，生成 agent team 分工的 Task Graph（完整版 + 4 个分片）。
> **前置条件：Critic 已 pass。**

---

## Your Job

将 OpenSpec 的 design.md + tasks.md 转化为 agent 可直接执行的分工文件。
**不修改 OpenSpec 内容**，只做分析和分片输出。

---

## 操作步骤

```
1. 确认前置条件
   - 检查 .ai/handoff.md，确认 Critic pass
   - 确认 openspec/changes/<id>/ 下 4 个文件齐全

2. 运行 Task Graph 命令
   /task-graph <feature-id>

3. 命令自动完成：
   - 读取 design.md / tasks.md / specs/
   - 分析层级依赖和并行关系
   - 写入 .ai/build/task-graph.md（完整版）
   - 自动拆分为 4 个分片

4. 人工 Review task-graph.md（10 分钟）
   - 层级分配是否合理（DB / BE / FE / Test）
   - 同层并行 task 是否存在文件冲突
   - 依赖关系是否完整（上游未完成不能开始）
   - 每个 task 的负责 agent 和目标文件是否明确
   - 4 个分片文件是否已生成

5. 更新 .ai/handoff.md → Stage 2
```

---

## Task Graph Command 文件

位置：`.opencode/commands/task-graph.md`

```markdown
---
description: 读取 OpenSpec 产出，生成 agent team 分工的 Task Graph（完整版 + 4 分片）
agent: plan
---

**Feature ID:** $ARGUMENTS

**OpenSpec Design:**
!cat openspec/changes/$ARGUMENTS/design.md

**OpenSpec Tasks:**
!cat openspec/changes/$ARGUMENTS/tasks.md

**OpenSpec Specs:**
!cat openspec/changes/$ARGUMENTS/specs/*.md 2>/dev/null

**当前项目结构参考：**
!find . -type f \( -name "*.ts" -o -name "*.py" -o -name "*.go" -o -name "*.sql" \) \
  | grep -v node_modules | grep -v .git | grep -v dist | head -60

---

分析以上内容，将所有 task 按 DB → BE → FE → Test 四层分类。

**第一步：生成完整 Task Graph**

写入 `.ai/build/task-graph.md`：

# Task Graph — <feature-id>
生成时间: YYYY-MM-DD HH:MM

## Layer 0: DB
| Task ID | Task 描述 | Agent | 目标文件 | 依赖 | 可并行 |
|---------|-----------|-------|---------|------|--------|
| DB-1 | migration: add xxx table | Builder-DB | db/migrations/xxx.sql | — | — |

## Layer 1: BE（Layer 0 完成后解锁）
| Task ID | Task 描述 | Agent | 目标文件 | 依赖 | 可并行 |
|---------|-----------|-------|---------|------|--------|
| BE-1 | API: GET /api/xxx | Builder-BE | src/routes/xxx.ts | DB-1 | ✓ BE-2（不同文件） |
| BE-2 | API: POST /api/xxx | Builder-BE | src/routes/yyy.ts | DB-1 | ✓ BE-1（不同文件） |
| BE-3 | Service: xxx logic | Builder-BE | src/services/xxx.ts | DB-1 | ⚠️ 与 BE-1 同文件，串行 |

## Layer 2: FE（Layer 1 完成后解锁）
...

## Layer 3: Test
...

## 冲突风险汇总
- [文件路径]: 被 [Task A] 和 [Task B] 同时修改 → 建议串行或约定各自修改范围

---

**第二步：自动拆分 4 个分片**

**.ai/build/task-graph-db.md** — 包含：
- Layer 0 完整任务表
- 冲突风险汇总中涉及 DB layer 的条目

**.ai/build/task-graph-be.md** — 包含：
- Layer 1 完整任务表
- 上游解锁条件：「DB layer 全部完成后解锁」
- 冲突风险汇总中涉及 BE layer 的条目

**.ai/build/task-graph-fe.md** — 包含：
- Layer 2 完整任务表
- 上游解锁条件：「BE layer 全部完成后解锁」
- 冲突风险汇总中涉及 FE layer 的条目

**.ai/build/task-graph-test.md** — 包含：
- Layer 3 完整任务表
- 上游解锁条件：「FE layer 全部完成后解锁」
- 所有 layer 的冲突风险汇总（Verifier 需要全局视角）

每个分片文件顶部加注：
> 本文件为 task-graph.md 分片，仅包含本 agent 负责的 layer。
> 完整版见 .ai/build/task-graph.md（人工 review 用）。
```

---

## 分片文件结构

```
.ai/build/
├── task-graph.md          # 完整版（人工 review 用）
├── task-graph-db.md       # Builder-DB 专用 → 只含 Layer 0
├── task-graph-be.md       # Builder-BE 专用 → 只含 Layer 1 + 解锁条件
├── task-graph-fe.md       # Builder-FE 专用 → 只含 Layer 2 + 解锁条件
└── task-graph-test.md     # Verifier 专用 → 只含 Layer 3 + 全局冲突风险
```

---

## Write Access

- `.ai/build/task-graph.md`（完整版）
- `.ai/build/task-graph-db.md`
- `.ai/build/task-graph-be.md`
- `.ai/build/task-graph-fe.md`
- `.ai/build/task-graph-test.md`
- `.ai/handoff.md`
- `.opencode/commands/task-graph.md`（首次创建后通常不变）

---

## 完成时

更新 `.ai/handoff.md`：
- 确认 task-graph.md 及 4 个分片已生成并 Review 通过
- 填写 Stage Transition Notes（Agent 分工说明、并行策略、冲突预案）
- 注明每个 Builder 应读哪个分片文件
- 设置 Current Stage 为 `Stage 2 - Build Loop`
