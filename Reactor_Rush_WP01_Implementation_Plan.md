# Reactor Rush — WP-01 Implementation Plan

**Plan version:** 1.0  
**Date:** 2026-10-17  
**Decision status:** PENDING HUMAN APPROVAL — planning only  
**Parent specification:** *Reactor Rush Design System and Project Skills*, 2026-10-17, status *Approved with minor notes; clarified for WP-01 planning*  
**Intended local project:** `C:\Users\ADMIN\_Project\Reactor Rush`  
**Declared remote identity:** `https://github.com/fudever-club/Reactor_Rush.git`  
**Stitch project for READ-ONLY audit:** `https://stitch.withgoogle.com/projects/7998219093435398329`

> This document is the proposed plan, not an execution report. No access to the user's Windows workspace, Git metadata, Stitch screens, or production runtime has been independently verified in preparing this plan. No WP-01 project files or remote assets have been changed by this planning step.

## 1. Objective, scope, and authorization

WP-01 will reconcile design documentation with verified local project evidence, create two handoff documents, create three repository-local agent skills, and add a compact `AGENTS.md` entry point. It also requires a read-only audit of the existing Stitch project. The authoritative gameplay, rigs, approved Direction A characters, existing exports, and game code remain unchanged.

**Approval gate:** Human approval of THIS implementation plan is required before any WP-01 project-file write or Stitch audit execution. After approval, the implementer first performs baseline verification and verified backup; a failed baseline gate blocks all project-file writes. Approval for WP-01 never authorizes WP-02 Stitch production, Git commits/pushes, publication, or changes to runtime/assets.

**Strictly excluded:** modification of `src/`, gameplay logic, `assets_manifest.json`, character rigs or PNG/SVG exports, animation definitions, `package.json`, dependencies, tests, Git metadata/remotes, and Stitch canvases/exports. Do not introduce new rules for Duo Circuit, Cool the Core, Final Boss, OSNet, webcam input, or Versus. Do not promote proposed palette values or screen concepts to approved production assets.

## 2. Exact project-file inventory

All paths below are relative to the intended local project root. Existence must be confirmed at baseline; an expected-new path found to exist is NOT overwritten blindly.

| ID | Target path | Intended action | Authorized content |
|---|---|---|---|
| D01 | `DESIGN.md` | Modify existing | High-level product/visual overview; approved Direction A; 1280x720 target; screen inventory; status labels; authoritative links; concise verified state |
| D02 | `ART_BIBLE.md` | Modify existing status section | Reconcile art/animation production claims, protect approved silhouettes, label proposed palette as proposed |
| D03 | `docs/design/visual-production-roadmap.md` | Modify existing | Preserve production-status authority; distinguish WP-01/WP-02; link new handoff docs; correct status only from evidence |
| D04 | `docs/design/screen-flow-and-round-map.md` | Create if absent | Menu/gameplay/round-complete/restart/round-map hierarchy; transitions; Stitch references and status labels; reduced-motion considerations |
| D05 | `docs/design/asset-coverage-and-handoff.md` | Create if absent | Existing/missing asset families; concept vs export vs integrated; ownership, source-to-export/Phaser handoff and QA rules |
| D06 | `AGENTS.md` | Create if absent | Brief source-of-truth routing; scope/approval gates; baseline discipline; task-type roles; evidence classification; skill links |
| D07 | `.agents/skills/reactor-rush-stitch-design/SKILL.md` | Create if absent | Stitch design/audit skill; explicit WP-01 READ-ONLY route and WP-02 approval gate; aspect ratio/status evidence |
| D08 | `.agents/skills/reactor-rush-asset-qa/SKILL.md` | Create if absent | Asset/source/manifest contract; alpha, crop, pivot, consistency, runtime evidence; honest classification |
| D09 | `.agents/skills/reactor-rush-parallel-workflow/SKILL.md` | Create if absent | Task-type delegation; role handoffs; isolation; QA/Eval distinction; rubric provenance, blockers, no autonomous publishing |

**Read-only authority/reference set, not authorized for changes:**

- `docs/gameplay/energy-catch-mvp.md`
- `docs/art/animation-production-report.md`
- `docs/art/phaser-animation-integration.md`
- `assets_manifest.json`
- Existing project files needed only to confirm inventory/identity, e.g. `package.json` and specific rig/source paths named in the manifest
- The Stitch project above, its named frames, and visible dimension/status metadata

**Non-repository evidence deliverable A01:** a read-only Stitch audit report, stored with the WP-01 evidence outside the project tree. This is not a new design screen or export.

## 3. G0 — Baseline verification and recoverable backup (mandatory)

**Owner:** `agent-chief`, read-only inspection first. No writer starts until G0 is PASS.

### G0.1 Project identity and file inventory

1. Resolve the intended Windows root exactly; confirm directory exists and is the user's designated project, without inferring identity from matching filenames alone.
2. Enumerate D01–D09 and each authority/reference path. Record existence, file type, byte size, last-modified time (informational), and SHA-256 of every existing target/authority file needed for reconciliation.
3. Record unexpected pre-existing D04–D09 contents as a potential conflict. Reconcile or ask the human before selecting overwrite behavior.
4. Read the current source-of-truth documents. Record every production-status conflict with precise file/heading/line context. Treat claimed Phaser 4.2.1, keyboard MVP, tested animations, and PNG counts as *reported*, until supported by local records or runtime evidence; do not rerun application tests merely for a documentation-only task.

### G0.2 Git status and remote access

1. Check for `.git` and inspect Git **read-only** where available: repository root, branch, HEAD commit, dirty/untracked status, and configured remotes.
2. Check authorized access to the declared remote and compare project identity when possible. Distinguish inaccessible/private, unauthorized, not-found, and network errors. Do not treat a 404 as proof the repository does not exist.
3. Never run `git init`, `git clone` into/over the working directory, `reset`, `clean`, `checkout`, `commit`, `push`, or remote-update commands as part of WP-01.
4. If the remote cannot be verified but the user explicitly designates the local root as the work target, proceed **local-only** after required safeguards and record the unverified remote identity.

### G0.3 Backup and integrity verification

1. Select a new, isolated snapshot location **outside the project tree**, for example `C:\Users\ADMIN\_Project\ReactorRush-WP01-backups\<run-id>\`. Verify it exists or can be created without replacing earlier backups. Do not use an ignored folder inside the work tree as the only backup.
2. Before editing, copy **every existing D01–D09 file intended to be written** to the snapshot, preserving its relative path. Record SHA-256 of originals and copies; require exact equality.
3. If Git is absent, this hash-verified snapshot is a **hard prerequisite** for any existing-file modification. Even if Git exists, prefer the same snapshot because the worktree may contain uncommitted changes.
4. Record which D04–D09 paths were originally absent, so only WP-01-created files can later be considered for removal during rollback.
5. Include `baseline-report.md`, `target-inventory.json`, `hashes-before.sha256`, and `backup-manifest.json` in the external evidence folder. The baseline records paths, statuses and hashes; do not store secrets or authentication tokens.
6. **STOP / BLOCKED** if project root identity is ambiguous, an intended overwrite conflicts with other work, any required source is inaccessible, a mandatory snapshot cannot be made, or copied files fail hash verification.

### G0.4 Permissions and isolation

- Default to sequential project-file writes. Parallel read-only audits are allowed. Concurrent writers need separately authorized isolated workspaces and disjoint ownership; do not assume them in the current non-Git worktree.
- Require human confirmation before any scope expansion, unexpected non-Markdown change, or attempt to write to GitHub or Stitch.

**G0 acceptance:** complete baseline record, traceable source inventory, remote/Git uncertainty explicitly categorized, and verified recoverable backup for every pre-existing target to be edited.

## 4. Execution sequence and dependencies

| Step | Work item | Owner / allowed behavior | Dependencies | Outputs and gate |
|---|---|---|---|---|
| P00 | Capture approved task boundaries; run G0 baseline and verified snapshot | `agent-chief`; inspection + external evidence/backup only | Plan approval | G0 PASS, else stop |
| P01 | Read-only Stitch audit + authority-file reconciliation | `agent-chief` or read-only `agent-lead` support | G0 PASS | A01 audit findings and source-conflict inventory; audit may be BLOCKED if inaccessible |
| P02 | Draft D04 screen flow and D05 asset handoff | `agent-spec` (or `agent-chief`) as sole Markdown writer | P01 findings and reference reads | Exact status labels, linked sources; no invented mechanics |
| P03 | Reconcile D01 DESIGN and D02 ART_BIBLE | Same approved Markdown writer, sequentially | P01; D04/D05 structure available | Current verified state, Direction A and proposed tokens preserved |
| P04 | Reconcile D03 roadmap and cross-links | Same writer, sequentially | P02/P03 | Status/source links consistent across D01–D05 |
| P05 | Author D07 Stitch skill, D08 asset QA skill, D09 workflow skill | `agent-spec` or `agent-chief`; one file writer at a time | P01–P04 | Valid project-local SKILL.md entrypoints, bounded triggers/procedures |
| P06 | Author D06 AGENTS.md **last** | Same writer | P05; final authoritative file paths known | Concise index; role rules and skill links validated |
| P07 | Automated doc/skill verification and semantic self-check | `agent-chief`; no runtime changes | P02–P06 | Verification evidence with command/status/output; repair only inside approved nine paths |
| P08 | Optional separate independent agent evaluation | Distinct `agent-eval` if available; READ-ONLY | P07 | Independent review report or explicitly `NOT RUN`; never replace by a passed script |
| P09 | Final WP-01 acceptance report and human handoff | `agent-chief` | P07/P08; A01 status known | Per-row PASS/REVISE/BLOCKED, diffs, evidence, backup location, unresolved issues |

**Write ownership:** Project documentation is implemented by `agent-spec` or `agent-chief`; `agent-dev` and runtime `agent-qa` are not started for WP-01. A separate `agent-eval` reviews the artifact only if selected and available. Running a validator produces automated evidence, not independent evaluation. A second pass by the implementer is self-review.

**Dispatch contract for any helper:** task ID; objective; read-only and write-allowed paths; dependencies; expected deliverables; acceptance criteria; evidence to return; stop conditions; explicit prohibition on remote/Stitch/gameplay writes. `agent-chief` remains the only human-facing coordinator.

## 5. Per-deliverable implementation and acceptance instructions

### D01 — `DESIGN.md`

- Reconcile with the current Energy Catch gameplay document and animation report; preserve the approved Direction A pair (P1 Cyan, P2 Pink) and target canvas 1280x720.
- Provide high-level goals, screen inventory, round status categories, and links to gameplay/art/roadmap/manifest; **do not duplicate** detailed score rules, per-part counts or exact pivots.
- Acceptance: all referenced files resolve; no claims conflict with locally corroborated runtime records; concepts are labeled concepts; no unapproved mechanic or palette promotion.

### D02 — `ART_BIBLE.md`

- Modify only outdated production/status claims plus essential cross-references; keep current art rules and approved characters intact.
- Distinguish palette *proposed* from approved. Use the current animation report/manifest as sources for production claims, with stated uncertainty where reports cannot be independently verified.
- Acceptance: no unapproved design-system changes; character silhouettes and animation identity preserved; status consistent with D01/D03.

### D03 — `docs/design/visual-production-roadmap.md`

- Keep roadmap as the production-status authority; include WP-01 vs separately gated WP-02; link D04 and D05.
- Separate approved direction, draft, reference, exported, integrated, QA-passed, conditional and future work based on actual evidence.
- Acceptance: links resolve; no claim that WP-01 modified Stitch; status aligned with reports/manifest and D01/D02.

### D04 — `docs/design/screen-flow-and-round-map.md`

- Document Start/Attract -> gameplay -> round complete/results -> restart/round map where supported by the approved gameplay source; mark any proposed navigation as **visual-only proposed** until gameplay requirements are confirmed.
- Record corrected Stitch Start/Attract and Round Complete concepts, remaining gaps, reduced-motion celebration expectations, and appropriate screen states.
- Show Duo Circuit/Cool the Core as conditional and Final Boss as future placeholder. Do not invent rules or make a screen concept appear live.
- Acceptance: each transition/control is sourced or marked proposal; no invented gameplay; approved vs concept-only distinction is unmistakable.

### D05 — `docs/design/asset-coverage-and-handoff.md`

- Inventory relevant existing character rigs, SVG sources, transparent parts, animation definitions, UI/gameplay backgrounds, and missing asset families, using **actual observed paths**.
- Define concept/reference -> editable source -> export/manifest -> Phaser integration -> runtime QA stages and responsible handoff evidence, including alpha/crop/pivots/dimensions, screen-readability and 16:9 verification.
- Acceptance: every claimed existing artifact resolves in manifest/local files; planned items carry planned/blocked status rather than a production-ready label; no changes to manifest.

### D06 — `AGENTS.md`

- Keep short and discoverable; route contributors to sources of truth and D07–D09 skills. Explain G0 backup gate, approval boundaries, sequential writes, limited role selection, source-evidence precedence, and no external/Git/Stitch write by default.
- Distinguish three classes in completion reports: automated verification, independent evaluation, and self-review.
- Acceptance: all links resolve; no duplicate mega-procedures; applicable to a simple documentation task without creating six agents.

### D07 — `.agents/skills/reactor-rush-stitch-design/SKILL.md`

- Use valid YAML frontmatter with lowercase skill `name` and an explicit `description` indicating triggers. Specify input references, output artifacts, aspect-ratio checks, and status labeling.
- For WP-01: READ-ONLY inspect and report; **no screen create/edit/delete/export/publish**. For WP-02: require separate human-approved brief and scope before any write.
- If Stitch UI is unavailable, return an evidence-based BLOCKED audit; never invent screenshot/frame dimensions.
- Acceptance: triggering, procedures and gate are inspectable, and no WP-01 pathway contains a Stitch write.

### D08 — `.agents/skills/reactor-rush-asset-qa/SKILL.md`

- Define input requirements (reference/manifest/source/export/report), alpha/crop/clipping/pivot/dimension/consistency checks, Phaser-integration/runtime distinctions, status vocabulary, evidence and blocker reporting.
- Do not certify reference art, storyboard or concept as a production-ready sprite; do not claim runtime verification from file inspection alone.
- Acceptance: contract references real sources/checks; statuses align with manifest/roadmap; no product files modified.

### D09 — `.agents/skills/reactor-rush-parallel-workflow/SKILL.md`

- Define the six *role contracts*, not six persistent background services; task-type-conditional selection and approved docs-only writers; spec/plan approval gates; task interface; isolation; three Dev->QA correction cycles when applicable.
- State code-rubric provenance as the user's supplied, **not independently validated**, source; correct N/A normalization and P0/P1 blocker precedence; prohibit auto-merge/push/publish.
- Explicitly separate automated verification scripts, independent review by a distinct agent, and self-review. Independent evaluation status must say NOT RUN if not actually executed.
- Acceptance: a dry walkthrough of a small docs change does not dispatch all six roles; no automation or merge permission inferred.

### A01 — Stitch READ-ONLY audit

- Identify the existing project and accessible approved/corrected relevant screens; record actual observed canvas/frame dimensions and whether export dimensions can be established without exporting.
- The previously reported 1280x1024 desktop frame versus 1280x720 content label remains an **unresolved discrepancy** until directly rechecked; a label is not proof of 16:9.
- Capture observation timestamp, page/project identifier, screen name, evidence source and limitations; distinguish visible screen, exported asset and Phaser integration.
- Acceptance: verifiable screen/dimension/status observations, without any create/edit/export. If access fails, classify A01 BLOCKED, preserve reason, and do NOT mark overall WP-01 PASS.

## 6. Validation, evidence, and acceptance gates

### 6.1 Automated verification (not independent evaluation)

After approved writes, collect commands, stdout/stderr summary, exit status and check scope. Use read-only checks for:

1. Existence and expected relative paths of D01–D09; no unauthorized changed path.
2. Local Markdown relative links and file references (with section-anchor checks where resolvable); flag external links as unverified if not checked.
3. YAML frontmatter syntax and required `name` / `description` for all three skill entrypoints; match skill name with folder name.
4. Required source-of-truth links and human approval guardrails in `AGENTS.md`/skills.
5. Exact old/new file-hash and diff inventory; confirm gameplay, rigs, manifest, package/dependency files, and Git metadata were not written by WP-01.
6. Stitch A01 is a separately evidenced human-readable audit; a passing Markdown validator does not satisfy it.

**Do not run application `npm test`, `npm run build`, GPU/webcam benchmarks, or Phaser runtime checks solely to pass this documentation-only plan.** If any unrelated product file changes or unexpected actions appear, STOP and investigate rather than retrofit the plan.

### 6.2 Semantic/documentation review

- Reconcile each D01–D09 row against the WP-01 acceptance matrix in the approved spec, with concrete source citations (local file/section/line or manifest entry).
- Specifically flag contradictions about the Energy Catch MVP, four available robot animation states, production vs concept Stitch status, 1280x720 target and unverified export dimensions, proposed palette, and conditional/future rounds.
- Mark individual results `PASS`, `REVISE`, `BLOCKED`, or `NOT RUN`; a relevant P0/P1 blocker or failed mandatory acceptance item overrides any numerical score.
- A distinct `agent-eval`, if actually dispatched, reviews the final diff and evidence against the spec and returns an independent report. Scripts and implementer self-checks cannot be called independent evaluation.

### 6.3 Gates

- **G0 (hard stop):** project identity + baseline + verified backup passed.
- **G1:** all nine Markdown targets satisfy their individual acceptance rows.
- **G2:** A01 Stitch audit passed with verifiable evidence. Inaccessible Stitch -> audit BLOCKED -> **overall WP-01 cannot be marked PASS**; report partial completion of other deliverables if appropriate.
- **G3:** evidence and diffs reviewed, no out-of-scope changes, blockers resolved or escalated, final report produced.
- **G4:** human acceptance of WP-01 results, distinct from any Git publish and distinct from future WP-02 approval.

## 7. Evidence package and reporting schema

Store temporary evidence and backup outside the project tree, at the run's isolated evidence root. Suggested filenames:

- `baseline-report.md` — intended workspace, authority/path inventory, timestamps, Git/remote verification, identity limitations.
- `target-inventory.json` / `hashes-before.sha256` / `backup-manifest.json` — original paths, existence, SHA-256, snapshot copy paths and parity.
- `source-conflicts.md` — specific evidence-backed status conflicts and resolutions.
- `stitch-audit.md` — observed screens, observed dimensions, concept labels, missing access, READ-ONLY declaration; **never an invented export**.
- `file-change-log.md` and `hashes-after.sha256` — changed/new paths, reason, diff size/summary, preserved files.
- `doc-validation.md` — exact checks, commands, exit codes, observed failures, NOT RUN items.
- `independent-eval.md` — only if a distinct agent conducted the review; otherwise report `independent evaluation: NOT RUN` in the final report.
- `wp01-final-report.md` — G0/G1/G2/G3 status, D01–D09 and A01 matrix, P0/P1/P2 findings, automated verification vs self-review vs independent evaluation, unresolved blockers, snapshot reference and rollback viability.

Example per-deliverable report row:

`{id, relative_path, action, original_exists, before_sha256|null, after_sha256|null, acceptance_status, evidence_refs[], blocking_findings[], verifier_type, limitations[]}`

No claim of `PASS` may be based solely on the implementing agent's assertion. No source count, dimensions, test result, or commit hash may be invented.

## 8. Rollback and recovery

**Trigger:** incorrect authority reconciliation, undesired document changes, corrupt/missing backup, unexpected out-of-scope modifications, a failed hard gate, or human rejection. Rollback is planned, not performed by this document.

1. Stop project-file writes. Preserve the partial change log, evidence, current file hashes and the reason for rollback before any restore.
2. Confirm original snapshot copy integrity against `backup-manifest.json`. Ensure no one has modified a target after the WP-01 last-write hash; if it changed, **stop** and request human reconciliation instead of overwriting their work.
3. For each D01–D09 that **existed before** WP-01, restore **only that specific file** from its verified copy; match restored SHA-256 to the original baseline.
4. For any D04–D09 that **did not exist before** WP-01, remove only the file clearly recorded as created by WP-01, and only after confirming no unrelated changes. Do not remove unrelated directories or files.
5. Restore no Git metadata, remote branches, gameplay/source/asset files or Stitch screens: none were authorized to change, and none should require recovery from WP-01.
6. Run the baseline comparison again. Produce `rollback-report.md` with restored hashes, preserved discrepancies and items intentionally not touched. Do not declare full rollback unless every original target has its exact baseline hash or unresolved differences are explicitly disclosed.

**Prohibition:** no `git reset --hard`, `git clean`, blanket directory replacement, recursive delete, or destructive restoration over new human edits.

## 9. Stop conditions and decision request

Stop without project-file writes if any of the following holds: WP-01 plan approval missing; local project identity unclear; a mandatory authority source is unavailable and prevents safe reconciliation; backup/hash parity fails; pre-existing file conflicts require resolution; or an unauthorized write is requested. If Stitch cannot be inspected, mark A01 BLOCKED with evidence; documentation work may continue only within approved scope, but overall WP-01 must not be marked PASS unless the mandatory audit is subsequently completed or the human explicitly approves a revised acceptance plan.

**Human decision requested:** Approve or revise this specific WP-01 implementation plan. Approval authorizes later execution ONLY within D01–D09 and read-only A01, conditioned on G0 and all scope boundaries above. It does **not** authorize WP-02, any external publish, Git write, runtime implementation, or changes to assets/manifest.

**Current execution status:** NOT STARTED. Baseline, snapshot, Stitch audit, document edits, verification, and independent evaluation have not been executed as part of preparing this plan.
