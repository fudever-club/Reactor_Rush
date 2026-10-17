---
name: reactor-rush-parallel-workflow
description: Use when planning or coordinating Reactor Rush work that may benefit from task-type-appropriate agent roles or parallel review.
---

# Reactor Rush proportional agent workflow

## Role contracts

- `agent-chief`: human-facing coordinator; classifies scope, records baseline, controls handoffs, integrates evidence, and reports blockers. It does not turn another role's claim into verification.
- `agent-lead`: optional read-only decomposition of a multi-part task, dependencies, interfaces, and ownership. Without workspace isolation, it recommends sequential writes.
- `agent-spec`: drafts/updates approved specifications and documentation from project sources; does not invent gameplay rules or implement code.
- `agent-dev`: implements a bounded, approved code or asset task and reports changed paths and commands.
- `agent-qa`: derives and executes the verification authorized for a task type; it does not certify runtime behavior from reading files alone.
- `agent-eval`: optional distinct reviewer of final artifacts against the approved spec and acceptance criteria; cannot merge, publish, or replace human acceptance.

These are task roles, not six required agents, persistent processes, or claims of separate models/credentials. Select only the roles the task needs. `agent-chief` always coordinates.

## Choose workflow by task type

- **Documentation only:** `agent-chief` or `agent-spec` is the approved Markdown implementer. Verify paths and local links, source-of-truth consistency, required status labels, and each document's explicit acceptance criteria. Record these as documentation-specific checks. Do not start `agent-dev`; do not claim application build/runtime tests when product behavior did not change. A compact task can be handled by the coordinator and one Markdown implementer; a separate `agent-eval` is optional when risk/complexity warrants it.
- **Code or runtime asset:** choose `agent-lead`, `agent-dev`, and `agent-qa` only as warranted by decomposition and execution needs. Apply test-first when implementation/test scope calls for it, and run only approved checks. Add `agent-eval` for a genuinely separate acceptance/security review when useful.
- **Multi-part work:** decompose tasks with explicit allowed paths, inputs, dependencies, output, acceptance criteria, and returned evidence. Parallelize read-only independent analysis. Concurrent writers require isolated workspaces and non-overlapping ownership; otherwise serialize writes.
- Never initialize all six roles by default. One agent may perform multiple sequential roles, but its own review is self-review, not independent evaluation.

## Gates, evidence, and correction limit

Before any write, identify the exact project root, read authoritative sources, inspect target existence and current state, and capture hashes/status. Check Git read-only if available. When Git metadata is absent or cannot protect existing work, make an external, hash-verified backup of every existing target before overwriting. Stop on ambiguous identity, conflicting ownership, missing required sources, or failed backup parity.

Require a human-reviewed spec and implementation plan when the task's approved workflow has those gates. Keep implementation inside the approved paths. Limit a task to three Dev-to-QA correction cycles; after the third unsuccessful cycle, stop, preserve evidence, and escalate the exact failure.

Label evidence separately:

1. **Automated verification:** commands/scripts, exact scope, result, and limitations. It can prove only what the checks observe.
2. **Self-review:** the implementer's/coordinator's own semantic inspection, with source references.
3. **Independent evaluation:** a distinct reviewer actually reads the final artifacts and evaluates them against the approved spec and criteria. A passing script or the implementer's read-through never counts.

If no distinct evaluator performed that review, state `independent evaluation: NOT RUN`. Do not infer QA execution or runtime evidence from a static inspection.

## Rubric and blocking findings

The code-review rubric provenance is the user's supplied pasted configuration, “Cấu hình Team AI Agents cho Lập trình (Lauren Tan & Grokbot Framework),” as recorded in the approved design-system spec. This records the user's chosen rubric; it does not independently validate the named framework. For applicable code work, preserve the source weights: correctness 40, test rigor 25, efficiency 15, security 10, maintainability 10. For documentation, design, or art-only tasks, use the applicable deliverable acceptance matrix instead of forcing code weights onto it.

Mark a criterion `N/A` only with a short reason tied to task scope; exclude its weight from the denominator and report `100 × earned applicable weighted points / applicable total weight`. Never award full credit for N/A. If no weighted criteria meaningfully apply, report the numeric total as N/A and use the acceptance matrix.

Blocking findings outrank scores. Any P0/P1 finding or failed mandatory acceptance criterion results in `BLOCKED/REVISE` regardless of score. P0 covers security/privacy exposure, data loss, unauthorized external writes, or a broken preserved invariant. P1 covers a failed must-have, broken integration, or source conflict likely to cause incorrect implementation. A high score recommends human review; it cannot clear a blocker or approve a merge.

## Human-controlled actions

No role may auto-merge, commit, push, publish, release, deploy, or write to a shared external design project based on role assignment alone. Stitch audit is read-only unless a distinct work package has separate explicit human approval for its specific production writes. Git metadata/remotes and external services stay outside scope unless the approved plan explicitly authorizes them. Human acceptance remains separate from all automated checks and agent recommendations.
