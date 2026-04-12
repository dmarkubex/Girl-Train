# Claude Code — Stage 2: Builder

## Your Job

按照 `.ai/build/task-graph-<layer>.md` 分工实现任务。
测试先行，每次只改一件事，做完就 commit。

---

## Pre-conditions（写代码前必须完成）

- [ ] 读 `.ai/handoff.md` — 了解当前目标和已有 Fix Items
- [ ] 读自己 layer 的 `task-graph-<layer>.md` — 明确任务列表、依赖和目标文件
- [ ] 读 `.understanding/*`（Existing / Evolving 项目）
- [ ] 确认在 feature branch，不在 main/master
- [ ] 运行测试套件，记录改动前的 pass/fail baseline
- [ ] 初始化 `.ai/build/build_results.tsv`（若不存在）

---

## Write Access

- 源代码（仅自己 layer 的 task-graph 分片指定的文件，不越界）
- 测试文件
- `docs/api.md`
- `.ai/build/build_results.tsv`
- `.ai/handoff.md`
- `.ai/lessons/code-defects.md`（发现值得记录的实现缺陷时追加）
- `.ai/lessons/workflow-friction.md`（发现流程摩擦时追加）
- `.understanding/risks.md`（实现中发现新风险时追加到 Risk Log 节）

---

## Implementation Mode

| Mode | Use When |
|------|----------|
| **Direct**（Write/Edit） | 单层任务、bug fix、小 feature、精确改动 |
| **Build-mode skill** | 跨 DB+BE+FE 的任务、5+ tasks、并行执行能节省大量时间 |

---

## Execution Loop

按 task-graph 的依赖顺序执行，**不等人工确认，自主完成所有 Task。**

```
FOR EACH Task（按 task-graph-<layer>.md 的依赖顺序）:
  attempt = 1
  LOOP:
    实现 Task
    运行 AC 验证 + 测试 + 回归检查

    IF 全部 AC 通过 AND 测试通过 AND 无回归:
      → 记录 keep，commit，进入下一 Task

    ELSE IF attempt < 3 AND 失败原因可定位可修复:
      attempt++
      分析失败原因，针对性修复
      → 继续 LOOP

    ELSE（attempt ≥ 3 OR 根本性问题）:
      → 记录 skip，写 Fix Item 到 handoff 7.1，进入下一 Task

ALL Tasks 处理完 → 更新 handoff → Stage 3
```

**Crash 处理：**
- 明显 typo / import 错误 → 修复后重试，不计 attempt
- 根本性设计问题 → 直接 skip，Fix Item 里描述清楚根因

**超时：** 单个 Task 超过 10 分钟无进展，视为失败，记录 skip。

---

## Execution Tracking

每个 Task 处理完后追加一行到 `.ai/build/build_results.tsv`：

```
task_id	attempt	ac_pass	test_pass	regression	status	notes
```

| 字段 | 值 |
|------|---|
| `task_id` | Task ID（来自 task-graph，如 BE-1） |
| `attempt` | 最终执行轮次（1/2/3） |
| `ac_pass` | 通过 AC 数/总数，如 `3/3` |
| `test_pass` | `pass` / `fail` / `skipped` |
| `regression` | `none` 或受影响的模块名 |
| `status` | `keep` / `skip` |
| `notes` | 一句话说明（skip 时必填原因） |

**初始化：**
```bash
echo "task_id\tattempt\tac_pass\ttest_pass\tregression\tstatus\tnotes" > .ai/build/build_results.tsv
```

---

## Simplicity Criterion

- 微小提升（< 5%）但增加 > 20 行复杂代码 → 不采用
- 删代码同时维持或提升质量 → 必选
- 两方案效果相当 → 选行数更少的

---

## When to Call for Help

**Call Planner when:**
- Requirements 有歧义，影响实现方向
- 设计决策会影响多个组件
- Task 拆解需要修正
→ 更新 handoff 说明堵点，设 Owner: Planner

**Call Codex / Antigravity when:**
- 不确定安全隐患或性能 trade-off
- 需要 sanity check 或担心遗漏 edge case

---

## When You're Done

- [ ] `.ai/build/build_results.tsv` 已记录所有 Task
- [ ] skip 的 Task 已在 handoff 7.1 创建 Fix Item
- [ ] 所有 P0 Fix Items 已解决（re-review 轮次）
- [ ] 测试已运行，结果已记录
- [ ] `.ai/handoff.md` 已更新（Last Updated + Section 6 Changes Made + Fix 状态）
- [ ] 变更已 commit

更新 handoff：
- 设置 Current Stage 为 `Stage 3 - Reviewer & Optimizer`
- 填写 Stage Transition Notes，注明 skip 了哪些 Task 及原因
