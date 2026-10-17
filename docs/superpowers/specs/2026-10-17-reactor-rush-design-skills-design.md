# Reactor Rush Design System and Project Skills

**Status:** Approved with minor notes; clarified for WP-01 planning
**Date:** 2026-10-17  
**Repository:** `https://github.com/fudever-club/Reactor_Rush.git`  
**Local workspace:** `C:\Users\ADMIN\_Project\Reactor Rush`

## 1. Purpose

Bring the project's design documentation up to date and establish reusable, repo-local design and asset workflows that can coordinate independent sub-agent work. Split the work into WP-01 (documentation, skills, and a read-only Stitch audit) and WP-02 (Stitch visual production, gated by separate approval). Preserve approved character direction, existing Phaser rigs, and confirmed gameplay scope.

The outcome should let a future contributor or agent answer, without reconstructing prior chat:

- What is approved, what is already implemented, and what is still a concept?
- Which file is authoritative for game rules, art rules, and asset production status?
- How should a new Stitch screen or asset be designed, reviewed, exported, and handed to Phaser?
- Which tasks can be delegated safely, and what must the coordinating agent integrate and verify?

## 2. Grounded project state

The local workspace already contains a Phaser 4.2.1, TypeScript, and Vite project. Energy Catch is a two-player keyboard MVP. P1 Cyan and P2 Pink have editable SVG rig sources, transparent PNG parts, rig and animation definitions, and a Phaser animation preview. Idle, Move, Catch, and Activate are documented as exercised in Phaser. The main game and production status are described in `docs/gameplay/energy-catch-mvp.md`, `docs/art/animation-production-report.md`, and `docs/design/visual-production-roadmap.md`.

The existing `DESIGN.md` and the final status section in `ART_BIBLE.md` contain older production statements. They need reconciliation with the current evidence, while preserving the approved Direction A character designs and the fact that Stitch work is visual concept material unless it has been exported, integrated, and checked.

The existing Stitch project is `https://stitch.withgoogle.com/projects/7998219093435398329`. Corrected Start / Attract and Round Complete concepts and a round-environment exploration already exist. The selected Stitch Desktop frame has previously been observed at 1280×1024 while its content was labeled 1280×720; do not describe that export as verified 16:9 until checked again. The environment concepts for Duo Circuit and Cool the Core remain conditional; Final Boss remains a future placeholder without approved mechanics.

The supplied GitHub URL currently returns 404 through the connected GitHub reader, and the local directory has no `.git` metadata. For this design stage, use the supplied project URL as its identity and the current local project as the source available for inspection. Do not claim that any change has been committed, pushed, or written to GitHub. Revisit the workspace/remote binding before implementation if the user expects edits in a cloned Git checkout.

## 3. Sources of truth

Keep each fact in one authoritative home and link to it from the overview:

| Concern | Authority |
|---|---|
| High-level product intent, approved visual direction, screen design principles | Root `DESIGN.md` |
| Palette, visual construction, motion and accessibility rules | Root `ART_BIBLE.md` |
| Energy Catch mechanics and controls | `docs/gameplay/energy-catch-mvp.md` |
| Current production state, concept/production boundary, next art work | `docs/design/visual-production-roadmap.md` |
| Exact assets, paths, dimensions, source, pivots, and QA status | `assets_manifest.json` |
| Rig integration details | `docs/art/phaser-animation-integration.md` and `docs/art/animation-production-report.md` |

`DESIGN.md` must summarize and link to these sources rather than duplicate detailed score rules, per-file asset data, or runtime QA results. If these sources conflict, preserve the most specific evidence-backed record and flag the conflict for correction instead of silently inventing a status.

## 4. Proposed document and skill changes

### 4.1 Existing design documents

- Refresh `DESIGN.md` as the high-level game and visual design overview. Include the experience goals, Direction A character identity, 1280×720 target, screen inventory, round availability labels, links to authoritative details, and a concise status snapshot. Remove or correct statements that imply the current rigs and gameplay do not exist.
- Reconcile the status section of `ART_BIBLE.md` with the production report. Preserve proposed palette tokens as proposed; do not silently promote them to approved brand colors.
- Keep `docs/design/visual-production-roadmap.md` as the status/sequence record. Add links to the supplementary design documents below rather than copying its full asset table.

### 4.2 Supporting Markdown documents

- Add `docs/design/screen-flow-and-round-map.md`. Specify the intended information hierarchy and transitions for Start / Attract, Energy Catch gameplay, Round Complete, and the round map. Record the approved/corrected Stitch concepts, remaining visual gaps, reduced-motion expectations for celebration, and the state labels for conditional/future rounds. This is a design handoff; it does not introduce new gameplay mechanics.
- Add `docs/design/asset-coverage-and-handoff.md`. Inventory the relevant current asset families and paths, distinguish concept/reference art from runtime-integrated exports, identify remaining UI/environment/gameplay-art gaps, and state the handoff and review requirements for future Phaser assets. Use the manifest and production reports for exact dimensions and counts.

### 4.3 Project instructions and skills

- Add root `AGENTS.md` with concise repo rules: read the source-of-truth documents first, preserve existing character rigs and game rules, label proposals and unverified work, keep changes scoped, use the project-local skills for relevant tasks, and verify every sub-agent contribution before integration.
- Add `.agents/skills/reactor-rush-stitch-design/SKILL.md`. It will guide screen briefs, Stitch prompts, reuse of approved screens, screen review at the intended aspect ratio, and accurate recording of concept/export/integration status. During WP-01 it is used only for a read-only audit; it must not edit the Stitch project. Future visual production belongs to WP-02 and requires separate approval. If the project cannot be inspected, report the audit as blocked rather than implying that an edit or review occurred.
- Add `.agents/skills/reactor-rush-asset-qa/SKILL.md`. Specialize the current project's validation contract: manifest/source consistency, transparent PNG alpha, crop bounds and clipping, dimensions/pivots, character consistency, Phaser import/runtime checks, and honest reporting of asset status. It must not call a pose reference or Stitch concept a production-ready sprite sheet.
- Add `.agents/skills/reactor-rush-parallel-workflow/SKILL.md`. Encode the adapted team-agent model in Section 6, including role prompts, stage gates, task ownership, test-first handoff, bounded correction cycles, independent evaluation, and human-controlled merge/publish decisions.

Skills are project-local so they can travel with the repository. `AGENTS.md` is the short entry point and must link to skills rather than duplicate their procedures. Do not install or modify global user skills as part of this project.

## 5. Work packages and approval gates

### WP-01 — Documentation, skills, and read-only Stitch audit

WP-01 covers the following repo-local changes and checks:

- Refresh `DESIGN.md` and the status portion of `ART_BIBLE.md`; add the two supplementary design documents; update the visual roadmap links; add `AGENTS.md` and the three project-local skills listed in Section 4.
- Inspect the existing Stitch project without modifying it. Record the accessible screen names, visible frame/export dimensions where verifiable, current concept/production labels, and discrepancies relevant to the docs.
- Do not create, revise, delete, export, or publish a Stitch screen in WP-01. Do not modify gameplay/runtime code, character rigs, animations, exported assets, or the asset manifest.

### WP-02 — Stitch visual production, separately approved

WP-02 is not included in WP-01 implementation approval. It may start only after the human gives separate approval to a concrete WP-02 brief and screen list. It may extend existing corrected concepts for Start / Attract, Round Complete/VFX, environment/gameplay asset concepts, and the round map. It must preserve Direction A and must label Duo Circuit/Cool the Core as conditional and Final Boss as a future placeholder. It must not invent game mechanics or treat static concepts/storyboards as runtime assets. Any export dimensions, source ownership, manifest changes, and later Phaser integration must be reported independently.

### Baseline Verification before any project-file write

Before the first project-file write in either work package, `agent-chief` records a baseline report containing:

1. **Local path and files:** confirm the workspace root is the intended project, list the exact target files, record whether each exists, and capture hashes/status for files that may be overwritten.
2. **Git metadata:** check whether the workspace is a Git checkout; if so, record the repository root, current branch/commit, and dirty status before edits. Do not reset, clean, or overwrite existing changes.
3. **Repository access and identity:** verify that the supplied remote URL resolves and that the local project corresponds to it. Record permission/not-found/network failures explicitly. A remote failure is not evidence that the local project is clean or synchronized.
4. **Source documents:** reopen the authoritative design, art, gameplay, roadmap, manifest, and production/integration records needed by the task; record their paths and hashes or revision IDs.
5. **No Git case:** before editing any existing project file, create a recoverable snapshot of every file scheduled for overwrite. Store it outside the project tree (or in a clearly isolated backup location), record its path and hashes, and verify the snapshot matches the originals. If a reliable snapshot cannot be created, stop before the project-file write.

If remote identity cannot be verified but the human has explicitly designated the local workspace as the target, work locally only and state that no remote update occurred. Do not infer a clean baseline from a failed Git command or inaccessible remote. This baseline procedure does not authorize Git writes, remote writes, or Stitch writes.

## 6. Team-agent architecture and execution model

Use the user's “Michelin Kitchen over Software Factory” principle: scale careful work through narrow ownership, specialist roles, independent verification, and explicit self-checks. The available runtime exposes generic one-off sub-agents, not persistent named agents. The roles below are a catalogue of responsibilities, not a requirement to start six agents for every task.

### 6.1 Role catalogue

| Role | Responsibility | Boundary |
|---|---|---|
| `agent-chief` | Main Codex agent; the only human-facing coordinator. Reads project context, tracks gates, integrates results, and reports evidence and blockers. | Does not present a sub-agent's claim as verified; does not perform external publish/merge actions without authorization. |
| `agent-lead` | Read-only technical/project lead. Decomposes multi-part work into atomic tasks, dependencies, interfaces, and file ownership. | Must not edit product source code. If no isolated workspace exists, gives the coordinator a plan instead of dispatching concurrent writers. |
| `agent-spec` | Drafts design/RFC documents, contracts, acceptance criteria, and domain-appropriate edge cases from the brief and repository sources. | Does not implement code or invent unapproved game rules. Architectural work waits for human review of its spec and plan. |
| `agent-dev` | Implements one approved, bounded code/asset task in its assigned files and reports commands and changed paths. | Must not change approved interfaces or expand scope without returning to `agent-lead`/`agent-chief`. |
| `agent-qa` | Derives verification cases from the accepted spec and executes the checks authorized by the task/plan when the task type needs QA execution. | Must not certify PASS from code reading alone. Documentation-only work uses documentation-specific checks and does not imply application tests. |
| `agent-eval` | When selected, independently reviews the proposed diff/artifacts against the accepted spec and applicable acceptance criteria; recommends accept/revise. | Must be a reviewer distinct from the implementer. A successful script or the implementer's self-review is not an independent agent evaluation. It cannot auto-merge, push, deploy, or override human review. |

These are role prompts/contracts, not assumptions about different models, persistent memory, credentials, or independent machines. A sub-agent receives only the task and context actually passed to it.

### 6.2 Proportionate team selection

- `agent-chief` is always the human-facing coordinator.
- For documentation-only changes, the approved Markdown implementer is `agent-spec` or `agent-chief`. Use documentation-specific verification: check local links and paths, source-of-truth consistency, required status labels, and the acceptance criteria for each document. Do not start `agent-dev` or treat application build/runtime tests as relevant when no code/runtime behavior changes.
- A small, low-risk documentation edit may use only `agent-chief` and one approved Markdown implementer; add a distinct `agent-eval` only when the change's complexity or risk warrants it.
- A multi-file design/skills change may use `agent-lead` for read-only decomposition, `agent-spec` for the draft, and an independent `agent-eval` for review. Do not start `agent-dev` or `agent-qa` when no code/runtime behavior is changing.
- Code or runtime-asset work selects only the additional roles needed for its approved scope. Use `agent-qa` when execution-based verification is required; use `agent-eval` for a separate acceptance/security review.
- Never initialize all six roles by default. If one agent performs multiple sequential roles, record that fact. Its own second pass is self-review, not independent QA or Eval.

### 6.3 Task-type workflow and handoffs

1. `agent-chief` captures the goal and source-of-truth files, classifies task type and risk, and records baseline evidence.
2. For documentation-only work, `agent-chief` or `agent-spec` is the approved Markdown implementer. Verify links and paths, consistency with authoritative sources, required concept/production/status labels, and each document's acceptance criteria. Report these as documentation checks; do not claim an application build or runtime test pass.
3. For code or runtime-asset work, select `agent-lead`, `agent-dev`, and/or `agent-qa` only as required by the approved task. Derive execution checks from the acceptance criteria, keep write scopes bounded, and use isolated workspaces for concurrent writers.
4. For multi-part tasks, `agent-lead` may propose atomic tasks, dependencies, interfaces, and non-overlapping scopes. Independent read-only audits may run in parallel. `agent-spec` prepares a required spec before implementation when the task calls for one; the human reviews the spec and implementation plan before implementation starts.
5. `agent-qa`, when applicable, reports exact commands, exit status, relevant output, failures, and checks not run. `agent-eval`, when selected, is a separate agent review against the spec and acceptance criteria, with applicable scores and blocking findings.
6. Keep evidence classes distinct in the report: automated validation commands/scripts are **automated verification**; review by a different agent is **independent evaluation**. A successful script, including a documentation link checker, never counts by itself as an independent agent review. If no distinct evaluator actually reviews the artifacts, state `independent evaluation: not run`; label the coordinator's pass as self-review.
7. `agent-chief` integrates the evidence and presents the completion report to the human.

Each handoff names its objective, allowed paths (or read-only boundary), dependencies, expected output, acceptance criteria, and evidence to return. Each agent returns changed paths/links, checks actually performed, limitations, and unresolved issues. Questions route through `agent-chief`; sub-agents do not contact the human directly.

### 6.4 Isolation, retries, rubric, and quality gate

- Do not run concurrent write agents in a shared working tree without isolated workspaces or provably disjoint paths. The current local directory has no Git metadata, so this project starts in **read-only parallel analysis / sequential writes** mode. Revisit only after a valid Git checkout or isolated workspace is available.
- Serialize changes to one shared Stitch project unless the tool provides separate canvases/branches. Parallelize independent research or audits; do not parallelize writes to one canvas.
- Allow at most three Dev→QA correction cycles for one task. If acceptance still fails, stop, preserve the failing evidence, and escalate the exact blocker through `agent-chief`.
- **Rubric provenance:** the code-review rubric and weights below are adopted from the user's pasted file, “Cấu hình Team AI Agents cho Lập trình (Lauren Tan & Grokbot Framework).” This records the user's chosen rubric; it is not a claim that the attributed framework has been independently validated.
- For applicable code changes, score correctness (40), test rigor (25), efficiency (15), security (10), and maintainability (10), using the source weights unchanged. For design, documentation, and art-only work, use the deliverable-specific acceptance matrix instead of forcing code criteria onto it.
- Mark a criterion `N/A` only with a short scope-based reason. Exclude its weight from the denominator and report the normalized score as `100 × earned applicable weighted points / applicable total weight`; never convert N/A to full credit. If no meaningful weighted criteria apply, report `N/A` for the total and use the acceptance matrix.
- **Blocking findings outrank scores:** any P0/P1 issue or failed mandatory acceptance criterion means `BLOCKED/REVISE` regardless of numeric score. P0 includes security/privacy exposure, data loss, unauthorized external writes, or a broken preserved invariant. P1 includes a failed must-have requirement, broken integration, or a source-of-truth conflict likely to cause incorrect implementation. A score of 90 or more is only a recommendation to present for human review; it cannot clear a blocker or approve a merge.
- Default trust is guarded task autonomy after the accepted spec/plan. Remote branch updates, GitHub writes, merge, release, and deployment remain human-controlled. Auto-merge and background routines are out of scope.

If the multi-agent tool is unavailable, the coordinator may apply the checklist sequentially but must label self-review as self-review. Automated checks are reported as automated verification only; they never qualify as independent agent evaluation. Independent agent evaluation is credited only when a distinct agent actually reviews the artifact against the spec and acceptance criteria without relying solely on the implementer's assertion or script output.

## 7. Non-goals and guardrails

- Do not redesign P1 Cyan or P2 Pink, regenerate character concepts, or replace existing rigs/animations.
- Do not invent game rules for Duo Circuit, Cool the Core, or Final Boss.
- Do not add webcam tracking, OSNet, Versus, new mini-games, or runtime dependencies.
- Do not represent a static Stitch board or animation storyboard as a Phaser implementation.
- Do not change gameplay code, asset exports, or the asset manifest in the documentation-and-skills implementation unless a later approved plan explicitly needs a narrowly scoped correction.
- Do not push to GitHub or create a remote commit as part of this work without a usable repository checkout and a reviewed change set.

## 8. Validation and acceptance

WP-01 passes only when the baseline gate and every applicable row below pass. WP-02 has its own later acceptance criteria and is not part of WP-01 approval.

### 8.1 Baseline gate

Before the first project-file write, the baseline report must record the intended local root, target-file existence/status and hashes, Git root/branch/commit/dirty state or confirmed absence of Git metadata, remote identity/access result, authoritative source paths and hashes/revisions, and a hash-verified pre-write snapshot for existing files when Git is absent. If baseline identity is ambiguous or the required snapshot cannot be verified, stop before writing.

### 8.2 WP-01 acceptance matrix

| Deliverable | Pass criteria | Verification evidence |
|---|---|---|
| `DESIGN.md` | Preserves Direction A; describes current project scope; links to authoritative gameplay, art, and production records; contains no claim that contradicts verified runtime status. | Link/path check plus line-by-line reconciliation against the source-of-truth table. |
| `ART_BIBLE.md` | Keeps proposed palette values labeled as proposals; preserves P1/P2 silhouettes and current rig/animation facts; separates visual rules from production status. | Status statements checked against the animation report and manifest; no unapproved design tokens promoted. |
| `docs/design/visual-production-roadmap.md` | Separates WP-01 from WP-02; keeps concept/conditional/future labels accurate; points to both new design docs; includes no claim that WP-01 changed Stitch. | Check links and reconcile status rows against the manifest, gameplay document, and production report. |
| `docs/design/screen-flow-and-round-map.md` | Defines the intended screen hierarchy/flows for menu, gameplay, results, restart, and round map; labels playable vs conditional vs future content; refers to gameplay source rather than inventing mechanics. | Every transition and control either matches `docs/gameplay/energy-catch-mvp.md` or is explicitly labeled a visual-only proposal. |
| `docs/design/asset-coverage-and-handoff.md` | Lists existing and missing asset families with valid paths or explicit planned status; separates references/concepts from runtime exports; states manifest and Phaser handoff checks. | Every existing-asset claim resolves to a file/manifest/report entry; planned items are not called production-ready. |
| Root `AGENTS.md` | Names the project source-of-truth files, baseline gate, scope boundaries, relevant skills, proportional task-type workflow, approved Markdown implementers, distinct automated-verification and independent-evaluation evidence, and human-controlled external actions. | All links resolve; docs-only work selects `agent-chief` or `agent-spec` and documentation-specific checks; a passing script is not labeled independent agent review. Instructions do not contradict this spec or the existing gameplay rules. |
| `.agents/skills/reactor-rush-stitch-design/SKILL.md` | Has a trigger, required inputs, read-only WP-01 procedure, WP-02 separate-approval boundary, dimension/status checks, and unavailable-tool fallback. | Skill header and procedure are present; WP-01 path contains no Stitch write action. |
| `.agents/skills/reactor-rush-asset-qa/SKILL.md` | Has a trigger, manifest/source/alpha/crop/pivot/runtime evidence checks, status vocabulary, and honest limitations. | Each listed check points to a real project source or observable result; concepts are never labeled production-ready. |
| `.agents/skills/reactor-rush-parallel-workflow/SKILL.md` | Uses proportionate, task-type-conditional role selection; names `agent-chief` or `agent-spec` as approved Markdown implementers; defines documentation-specific checks; distinguishes automated verification from a distinct `agent-eval` review; captures applicable spec-first/test-first handoffs, baseline, isolation, three-cycle limit, rubric provenance/N/A, blocker precedence, and human-controlled merge/publish. | Checklist can be applied to a small documentation task without starting all six roles; a successful validation script is reported as automated verification and never as independent agent evaluation; self-review is labeled accurately. |
| Read-only Stitch audit | Identifies the project, visible relevant screens, verified frame/export dimensions, and concept/production status without editing or exporting. | Record the Stitch project URL/ID and observed screen names/dimensions. If the UI is inaccessible, mark the audit `BLOCKED` with evidence; it does not pass on assumption. |

### 8.3 Scope-specific verification

WP-01 changes only Markdown/skill files and performs a read-only Stitch audit. Use documentation-specific checks for its Markdown deliverables; do not run application tests/build merely to validate documentation. Report commands/scripts as automated verification, separately from any distinct agent-eval review; a passing validator is not independent agent evaluation. Do not write Git metadata, change gameplay/runtime/assets, or write to Stitch in WP-01. If a later approved work package changes code or exports assets, use only the checks explicitly included in that approved plan and report commands, exit status, and unverified items.

## 9. Review and next gate

Current stage: **SPEC APPROVED WITH MINOR NOTES; WP-01 PLAN REVIEW**. The approved clarifications are: (1) documentation-only work uses `agent-chief` or `agent-spec` as the Markdown implementer with documentation-specific verification; and (2) automated validation is distinct from independent evaluation by a separate agent. Prepare and submit the WP-01 implementation plan; do not begin WP-01 writes until that plan is approved. WP-02 requires its own separate approval before any Stitch visual-production write. No Git writes, gameplay/runtime changes, exported-asset changes, or Stitch writes are authorized before the applicable approval gates.
