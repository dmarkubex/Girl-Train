# Handoff Template — 完整格式参考

> **本文件仅供参考，不是实例。**
> 各 stage 的 agent 进场时，从本文件取对应 section 追加到 `.ai/handoff.md`。
> 不要把本文件整个复制过去，只取当前 stage 需要的部分。

---

## 各 Stage 需要追加的 Section

| Stage | 进场时追加 |
|-------|-----------|
| Stage 1 - Planner | Section 1–5 + Section 8（Planner→Critic 部分）|
| Stage 1b - Critic | Section 8（Critic→Task Graph 部分）|
| Stage 1.5 - Task Graph | Section 8（Task Graph→Claude Code 部分）|
| Stage 2 - Claude Code | Section 6（Changes Made）+ Section 7.4（Re-Review Request）|
| Stage 3 - Codex | Section 7.1（Fix Items）+ 7.2/7.3（Test Evidence）+ 7.5（Codex Verdict）|
| Stage 3 - Antigravity | Section 7.5（Antigravity Verdict）|
| Stage R - Retro | Appendix Completion Checklist 对应部分 |

---

## Section 6 — Changes Made

> *由 Claude Code 填写，Stage 2 进场时追加*

### Files Modified

- `[file path]`: [description]

### Tests Added

- [test description]

### Behavior Changes

- **Before**: [previous behavior]
- **After**: [new behavior]
- **Impact**: [impact]

---

## Section 7 — Verification

> *由 Codex / Antigravity 填写，Stage 3 进场时追加*

### 7.1 Fix Items

| ID | Priority | Issue | Owner | Status | Close Evidence | Source |
|----|----------|-------|-------|--------|----------------|--------|
| F1 | P0 | [description] | Claude Code | Open | [what proves it's fixed] | [review file] |

> **Priority:** P0 Blocker (crash/security/data/AC failure) · P1 Important (edge cases/tests/regression) · P2 Suggestion
> **Owner:** Planner = spec change needed · Claude Code = code/test change needed

### 7.2 Test Evidence

```bash
# Run all tests
[test command]

# Run specific test
[build command]
```

**Results:**

- [ ] `[test command]` — [result]

### 7.3 Evidence Log

- **Commit**: [commit hash]
- **Branch**: [branch name]
- **Logs/Screenshots**: [description]

### 7.4 Re-Review Request

> *Claude Code 在 Stage 2 完成时填写*

**Gate checklist (all must be ✅ before requesting re-review):**

- [ ] All P0 Fix Items marked Done
- [ ] Tests run and passing
- [ ] This handoff updated (Last Updated + Fix statuses)

**Fixed Items:**

- [ ] F1: [how fixed + evidence]

**Request Time:** YYYY-MM-DD HH:MM

### 7.5 Verdicts

#### Codex

- **Status**: pass / uncertain / reject
- **Time**: YYYY-MM-DD HH:MM
- **Summary**: [one sentence]
- **Must Fix**: [P0/P1 list]

#### Antigravity

- **Status**: pass / uncertain / reject
- **Time**: YYYY-MM-DD HH:MM
- **Summary**: [one sentence]
- **New Findings**: [P0/P1 list]
- **Reject Target**: — / Planner / Claude Code
- **Claude Code Pause Status** *(if rejecting to Planner)*: [what's done / what's paused / impact of spec change]

---

## Section 8 — Stage Transition Notes（完整版）

> *各 stage agent 移交前按需填写对应部分*

**Planner → Critic:**

- OpenSpec change id: [id]
- 关注点: [design 中需要重点评审的部分]
- 风险提示: [已识别的高风险项]

**Critic → Task Graph (Stage 1.5):**

- Critic 结论: pass / 已修正
- 特别注意: [task graph 生成时需要注意的并行冲突或边界]

**Task Graph → Claude Code (Stage 2):**

- task-graph 分片路径:
  - Builder-DB: `.ai/build/task-graph-db.md`
  - Builder-BE: `.ai/build/task-graph-be.md`
  - Builder-FE: `.ai/build/task-graph-fe.md`
  - Verifier: `.ai/build/task-graph-test.md`
- Agent 分工说明: [简述 DB/BE/FE 各自负责什么]
- 并行策略: [哪些 task 可以并行，哪些必须串行]
- 冲突预案: [有文件冲突风险时的处理方式]

**Claude Code → Codex:**

- [focus areas]

**Codex → Antigravity:**

- Review report: `docs/reviews/YYYY-MM-DD_codex_review.md`
- [focus areas]

**Antigravity → Close / Return:**

- All P0 complete: YES / NO
- All tests pass: YES / NO
- OpenSpec archive 已执行: YES / NO
- Next: [close / return to Planner / return to Claude Code]

---

## Appendix — Completion Checklist（完整版）

### Planner — Stage 1 (OpenCode + OpenSpec)

- [ ] `openspec/changes/<id>/proposal.md`
- [ ] `openspec/changes/<id>/specs/`
- [ ] `openspec/changes/<id>/design.md`
- [ ] `openspec/changes/<id>/tasks.md`
- [ ] Risks identified
- [ ] Handoff updated（Sections 1–5 + Planner→Critic Transition Notes）

### Planner — Stage 1.5 (Task Graph)

- [ ] Critic 已 pass
- [ ] `/task-graph <id>` 已运行
- [ ] `.ai/build/task-graph.md` 已生成并 Review 通过
- [ ] `.ai/build/task-graph-db.md` 已生成
- [ ] `.ai/build/task-graph-be.md` 已生成
- [ ] `.ai/build/task-graph-fe.md` 已生成
- [ ] `.ai/build/task-graph-test.md` 已生成
- [ ] Handoff updated（Task Graph→Claude Code Transition Notes）
- [ ] Current Stage 设为 `Stage 2 - Build Loop`

### Claude Code — Stage 2

- [ ] 读取对应 `task-graph-<layer>.md`，按分工执行，不越界
- [ ] All changes committed
- [ ] Tests added and passing
- [ ] Handoff Section 6 updated
- [ ] Re-Review gate checklist complete (Section 7.4)

### Codex — Stage 3

- [ ] Review report saved to `docs/reviews/`
- [ ] Fix Items created in Section 7.1
- [ ] Test evidence recorded in 7.2/7.3
- [ ] Verdict written in Section 7.5

### Antigravity — Stage 3

- [ ] Verification report saved to `docs/reviews/`
- [ ] New findings added to Fix Items (7.1)
- [ ] Verdict written in Section 7.5
- [ ] If rejecting to Planner: Claude Code pause status documented
- [ ] If closing: `/opsx:archive` 已执行，长期 spec 已更新
