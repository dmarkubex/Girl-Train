# AI Index — Project Router

> Any AI tool MUST read this file first, then follow the links below.

---

## Project State

| Field | Value |
|-------|-------|
| **Project Type** | `Existing` |
| **Current Stage** | `Stage 1 - Planner` |
| **Last Updated** | 2026-04-04 |

Valid stage values:
- `Stage 0 - Guard`
- `Stage 1 - Planner`
- `Stage 1b - Critic`
- `Stage 1.5 - Task Graph`
- `Stage 2 - Build Loop`
- `Stage 3 - Reviewer & Optimizer`
- `Stage R - Retro`

---

## ⚡ Stage Reading List — 严格按需加载

> **AI 必须严格按照当前 Stage 对应行加载文件。列表以外的文件，除非 handoff.md 明确指示，否则不得主动读取。**

| Stage | 必读文件 | 禁止读取 |
|-------|---------|---------|
| **Stage 0 - Guard** | `ai-index.md` · `.ai/handoff.md` | 其他所有文件 |
| **Stage 1 - Planner** | `.ai/handoff.md` · `.ai/roles/planner-stage1.md` · `AGENTS.md` · `.ai/lessons/spec-defects.md` | `planner-stage1.5.md` · `task-graph*.md` |
| **Stage 1b - Critic** | `.ai/handoff.md` · `openspec/changes/<id>/proposal.md` · `openspec/changes/<id>/design.md` · `openspec/changes/<id>/tasks.md` · `openspec/changes/<id>/specs/` · `.ai/lessons/spec-defects.md` | `planner-stage1.5.md` · `task-graph*.md` |
| **Stage 1.5 - Task Graph** | `.ai/handoff.md` · `.ai/roles/planner-stage1.5.md` · `openspec/changes/<id>/design.md` · `openspec/changes/<id>/tasks.md` · `openspec/changes/<id>/specs/` | `planner-stage1.md` |
| **Stage 2 - Build Loop (Builder-DB)** | `.ai/handoff.md` · `.ai/build/task-graph-db.md` | `task-graph-be.md` · `task-graph-fe.md` · `task-graph-test.md` · `planner-*.md` |
| **Stage 2 - Build Loop (Builder-BE)** | `.ai/handoff.md` · `.ai/build/task-graph-be.md` | `task-graph-db.md` · `task-graph-fe.md` · `task-graph-test.md` · `planner-*.md` |
| **Stage 2 - Build Loop (Builder-FE)** | `.ai/handoff.md` · `.ai/build/task-graph-fe.md` | `task-graph-db.md` · `task-graph-be.md` · `task-graph-test.md` · `planner-*.md` |
| **Stage 2 - Build Loop (Verifier)** | `.ai/handoff.md` · `.ai/build/task-graph-test.md` | `planner-*.md` |
| **Stage 3 - Reviewer** | `.ai/handoff.md` · `.ai/lessons/code-defects.md` · `docs/reviews/` | `planner-*.md` · `task-graph*.md` |
| **Stage R - Retro** | `.ai/handoff.md` · `.ai/lessons/workflow-friction.md` · `docs/reviews/` | `planner-*.md` · `task-graph*.md` |

> **lessons/ 文件** 有新条目可追加时，对应 agent 均可写入，但不得修改已有条目。

---

## Guard — Pre-Session Checklist

Run before any substantive work. Takes < 1 min. Stop and report if any item fails.

```bash
git branch --show-current          # 确认不在 main/master 直接工作
git status --short                 # 确认无未解决冲突

# 确认 OpenSpec change 产出（Stage 1 完成后）
ls openspec/changes/*/proposal.md \
   openspec/changes/*/design.md \
   openspec/changes/*/tasks.md 2>/dev/null

# 确认 Task Graph 已生成（Stage 1.5 完成后，Stage 2 开始前）
ls .ai/build/task-graph.md 2>/dev/null
```

Record result in `.ai/handoff.md` top line:
```
[Guard] YYYY-MM-DD HH:MM — OK | branch: [name] | spec: OK/MISSING | task-graph: OK/MISSING
```

---

## Your Entry Point

**Read `.ai/handoff.md` first — it tells you the current objective and what to do next.**

Then read your role file per the Stage Reading List above.

| You are | Read this |
|---------|-----------|
| **OpenCode (Planner Stage 1)** | `.ai/roles/planner-stage1.md` + `AGENTS.md` |
| **OpenCode (Planner Stage 1.5 / Task Graph)** | `.ai/roles/planner-stage1.5.md` |
| **Claude Code** | `.ai/roles/claude-code.md` |
| **Codex** | `.ai/roles/codex.md` |
| **Antigravity** | `.ai/roles/antigravity.md` |

---

## Stage Flow

```
Stage 0 - Guard
    → Stage 1 - Planner          (OpenCode + OpenSpec → openspec/changes/<id>/)
    → Stage 1b - Critic          (评审 OpenSpec 产出)
    → Stage 1.5 - Task Graph     (OpenCode /task-graph → .ai/build/task-graph*.md)
    → Stage 2 - Build Loop       (agent team 读各自 task-graph-<layer>.md 分工并行)
    → Stage 3 - Reviewer & Optimizer
    → Stage R - Retro
```

Stage 1b（Critic）在 Stage 1 后默认触发。
Stage 1.5（Task Graph）在 Critic 通过后、Stage 2 开始前强制执行，是 agent team 分工的唯一依据。

---

## Tool Responsibilities

| Tool | Stage | 职责 |
|------|-------|------|
| **OpenCode + OpenSpec** | Stage 1 / 1b | 需求分析、架构设计、Critic 评估、任务拆解 → `openspec/changes/<id>/` |
| **OpenCode** | Stage 1.5 | 读取 OpenSpec 产出，生成 agent 分工 → `.ai/build/task-graph*.md`（完整版 + 4 个分片） |
| **Claude Code** | Stage 2 | 主力实现（Build Loop），每个 Builder 只读自己 layer 的 `task-graph-<layer>.md` |
| **OpenCode** | Stage 3 | 评审 + 优化修改（P2 直接改，P0/P1 记 Fix Item） |

OpenCode 在所有 Stage 的行为由 `AGENTS.md`（项目根目录）控制。

---

## Spec Location

### Stage 1 OpenSpec 产出（每个 feature change）

| 文件 | 内容 | 路径 |
|------|------|------|
| `proposal.md` | what & why，变更范围 | `openspec/changes/<id>/proposal.md` |
| `specs/` | requirements & scenarios（GIVEN/WHEN/THEN） | `openspec/changes/<id>/specs/` |
| `design.md` | 技术方案（架构、DB schema、API、数据流） | `openspec/changes/<id>/design.md` |
| `tasks.md` | 实现 checklist（AC 可验证） | `openspec/changes/<id>/tasks.md` |

**任何一项缺失 → Critic 必须打回 Planner 补充，不得进入 Stage 1.5。**

### Stage 1.5 Task Graph 产出

| 文件 | 内容 | 路径 |
|------|------|------|
| `task-graph.md` | 完整 agent 分工（人工 review 用） | `.ai/build/task-graph.md` |
| `task-graph-db.md` | Builder-DB 专用分片 | `.ai/build/task-graph-db.md` |
| `task-graph-be.md` | Builder-BE 专用分片 | `.ai/build/task-graph-be.md` |
| `task-graph-fe.md` | Builder-FE 专用分片 | `.ai/build/task-graph-fe.md` |
| `task-graph-test.md` | Verifier 专用分片 | `.ai/build/task-graph-test.md` |

**task-graph*.md 缺失 → Claude Code 不得开始 Stage 2。**

### 长期 Spec（OpenSpec archive 后自动累积）

| 文件 | 内容 |
|------|------|
| `openspec/specs/<domain>/spec.md` | 各领域的长期规格，每次 /opsx:archive 后自动合并 |

### Understanding 文档（Existing / Evolving 项目）

| 文件 | 内容 |
|------|------|
| `.understanding/architecture.md` | 现有架构分析 |
| `.understanding/call_chains.md` | 调用链追踪 |
| `.understanding/change_scope.md` | 变更范围定义 |
| `.understanding/risks.md` | 风险识别 |

---

## References

| File | When to read |
|------|-------------|
| `.ai/lessons/spec-defects.md` | Stage 1 Planner 必读 · Stage 1b Critic 必读 |
| `.ai/lessons/code-defects.md` | Stage 3 Reviewer 必读 |
| `.ai/lessons/workflow-friction.md` | Stage R Retro 必读 |
| `.opencode/commands/task-graph.md` | Stage 1.5 only |

## Understanding 模板

> Existing / Evolving 项目的 Planner 在 Project Understanding Process 中按对应模板格式填写。

| 模板文件 | 对应产出 | 说明 |
|---------|---------|------|
| `.understanding/TEMPLATE_architecture.md` | `.understanding/architecture.md` | 架构分层、模块清单、边界、外部依赖、数据流 |
| `.understanding/TEMPLATE_call_chains.md` | `.understanding/call_chains.md` | 核心流程调用链追踪、跨流程依赖、未映射区域 |
| `.understanding/TEMPLATE_change_scope.md` | `.understanding/change_scope.md` | In Scope / Monitor / Out of Scope 三区划分 |
| `.understanding/TEMPLATE_risks.md` | `.understanding/risks.md` | 风险清单、缓解措施、回归风险、Risk Log（实现中持续追加） |
