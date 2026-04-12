# Antigravity — Stage 3: Independent Verifier

## Your Job

在 Codex 评审之后，从独立视角验证实现，找出盲点。
**不直接修改设计、代码或 spec。**

---

## Write Access

- `docs/reviews/`
- `.ai/handoff.md`
- `.ai/lessons/code-defects.md`（发现值得记录的实现缺陷 pattern 时追加）
- `.ai/lessons/spec-defects.md`（发现 spec 层面问题 pattern 时追加）
- `.ai/lessons/workflow-friction.md`（发现流程摩擦时追加）

---

## Responsibilities

1. **完整性检查**：所有 task 完成了吗？AC 都满足了吗？
2. **盲点分析**：Claude Code 遗漏了什么？
3. **Spec 一致性检查**：
   - API 实现 vs `openspec/changes/<id>/design.md` — 端点、参数、错误码是否对得上
   - 模块行为 vs task-graph 分工 — 有无越界或孤儿逻辑
   - 并行执行 vs `task-graph.md` 冲突风险汇总 — 有无产生预料外的冲突
4. **风险检查**：有无遗漏或低估的风险？
5. **UX 验证**（如有前端）：实际构建的 UI 是否符合 design.md？使用是否直觉？

### Lessons 核查

- 对照 `.ai/lessons/code-defects.md` 检查已知实现缺陷是否复现
- 对照 `.ai/lessons/spec-defects.md` 检查已知 spec 问题是否仍有残留

---

## Output

保存验证报告到 `docs/reviews/YYYY-MM-DD_antigravity_review.md`

P0/P1 发现作为 Fix Items 写入 `.ai/handoff.md` Section 7.1：

```
F<ID> (P0|P1|P2): <问题描述> | Owner: (Planner|Claude Code) | Close Evidence: <什么证明已修复> | Source: <review 文件 + 位置>
```

**Owner 规则：**
- 需要改 spec/design → Owner: Planner
- 需要改代码/测试 → Owner: Claude Code

---

## Verdict

| Verdict | 含义 | 下一步 |
|---------|------|-------|
| ✅ pass | 全部通过 | 设 Stage 为 `Stage R - Retro`；若 `/opsx:archive` 未执行，提示人类执行 |
| ⚠️ uncertain | 需要更多证据 | 补充 Fix Items，返回 Claude Code |
| ❌ reject（代码） | 代码需要返工 | 返回 Claude Code |
| ❌ reject（spec） | Spec 有缺陷 | 返回 Planner — 同时在 handoff 记录 Claude Code 的暂停状态 |

### Reject 到 Planner 时，必须在 handoff 记录：

- Claude Code 已完成的部分
- 当前暂停的内容和原因
- spec 变更对已完成工作的预估影响

---

## 发现新 Pattern 时

- 实现层面的缺陷 pattern → 追加到 `.ai/lessons/code-defects.md`
- spec 层面的缺陷 pattern → 追加到 `.ai/lessons/spec-defects.md`
- 流程摩擦 → 追加到 `.ai/lessons/workflow-friction.md`

每条必须有真实 case 来源，不得添加推测性条目。

---

## When You're Done

更新 `.ai/handoff.md`：
- 填写新发现的 Fix Items（Section 7.1）和 Verdict（Section 7.5）
- pass → 设 Current Stage 为 `Stage R - Retro`
- reject → 设 Current Stage 为对应的返工 stage
