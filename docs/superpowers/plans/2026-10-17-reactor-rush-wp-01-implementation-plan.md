# Reactor Rush WP-01 Implementation Plan

> **For agentic workers:** Execute only after explicit user approval of this plan. Use the `superpowers:executing-plans` workflow. This plan authorizes no WP-01 implementation yet.

**Status:** Awaiting explicit implementation-plan approval  
**Date:** 2026-10-17  
**Spec:** `docs/superpowers/specs/2026-10-17-reactor-rush-design-skills-design.md`  
**Workspace:** `C:\Users\ADMIN\_Project\Reactor Rush`

## Goal

Complete WP-01 only: reconcile the design documentation, add the two scoped design handoffs and three repo-local skills plus root instructions, and perform a read-only audit of the existing Stitch project. Preserve the approved Direction A for P1 Cyan and P2 Pink, existing rigs and animations, confirmed Energy Catch rules, and the concept-versus-production boundary.

This is a documentation-and-audit work package. It does not authorize WP-02 visual production, gameplay/runtime changes, asset or manifest changes, exports, Git writes, or Stitch writes. Stop for human review when the WP-01 report is ready.

## Architecture and working method

- `agent-chief` coordinates scope, baseline, read-only audit, integration, and reporting.
- `agent-spec` is the selected Markdown implementer for this multi-file documentation task. `agent-chief` is the other approved Markdown implementer if `agent-spec` is unavailable.
- `agent-chief` performs automated documentation checks and labels them **automated verification**.
- A distinct `agent-eval` reviews the final artifacts against the approved spec and matrix if the multi-agent tool is available. This is **independent evaluation**, reported separately. A successful validator script is never independent agent evaluation. If no distinct evaluator actually reviews the files, report `independent evaluation: not run`.
- Do not start `agent-dev` or `agent-qa`: this scope changes no code or runtime behavior. Use documentation-specific verification.
- The workspace has no Git metadata, so all project writes are sequential. Read-only source review and Stitch inspection may be performed before the documentation write phase; do not use concurrent writers.

## Exact WP-01 file scope

Modify these three existing files:

1. `DESIGN.md`
2. `ART_BIBLE.md`
3. `docs/design/visual-production-roadmap.md`

Create these six files:

4. `docs/design/screen-flow-and-round-map.md`
5. `docs/design/asset-coverage-and-handoff.md`
6. `AGENTS.md`
7. `.agents/skills/reactor-rush-stitch-design/SKILL.md`
8. `.agents/skills/reactor-rush-asset-qa/SKILL.md`
9. `.agents/skills/reactor-rush-parallel-workflow/SKILL.md`

The read-only audit evidence belongs in a compact dated section of `docs/design/visual-production-roadmap.md`; do not add another report file. The asset manifest and all other project files are read-only inputs.

## Baseline verification and backup procedure

### Current plan-preparation baseline

The following was checked on 2026-10-17 while preparing this plan. It is a planning snapshot, not a substitute for rerunning the gate immediately before WP-01 implementation:

| Check | Observed result |
|---|---|
| Workspace | `C:\Users\ADMIN\_Project\Reactor Rush` is the active local workspace designated in this task. |
| Git metadata | No `.git`; `git rev-parse --show-toplevel` returned exit 128. There is no branch, commit, or Git dirty-state evidence to report. |
| Supplied remote | Read-only GitHub fetch of `fudever-club/Reactor_Rush/README.md` returned HTTP/API 404. Local-to-remote identity and synchronization are unverified. WP-01 must remain local-only. |
| Existing WP-01 targets | `DESIGN.md`, `ART_BIBLE.md`, and `docs/design/visual-production-roadmap.md` exist. The other six scoped paths did not exist at plan preparation. |
| Plan destination | The implementation-plan file did not exist before this plan was created. |
| Approved spec snapshot before its two clarifications | `C:\Users\ADMIN\AppData\Local\Temp\reactor-rush-approved-spec-c7ed0261f67f487884a02a9e0c2b88fe.md`; SHA-256 `F2E3E029D8B9C6DFC774FC771A519D9A62C578D43CC794A979748006E9F9D4A5`. The copied snapshot matched the source at capture time. This is not a WP-01 backup of the three design documents. |
| Spec after clarification | SHA-256 `CDEC9C44BF93E39F2CDD69E6843195FA7E4015BA68FF7908DF3D88888977C59A`. |

Plan-preparation hashes for existing WP-01 targets and authoritative inputs:

| File | SHA-256 |
|---|---|
| `DESIGN.md` | `9CC5246A84A3301AF50BDF8C197DDA1576E3CACCA40F6FE74E29377BB06B493D` |
| `ART_BIBLE.md` | `E25859CA13E4F825261A431D5203280E6234F29B620A5F4206171B3CFC7C4F88` |
| `docs/design/visual-production-roadmap.md` | `D28986F751AFBD555C446499EDF8D6FF92A9DE82A9D41D90A7266CAE1E899DC6` |
| `docs/gameplay/energy-catch-mvp.md` | `13948BF946C2758B2A5BBE1500CBD6D29877708EDE59B6620B7C5FD2FDD47F19` |
| `assets_manifest.json` | `927D74808BA2F1199E88D62E98080259469AC3327C068012B1FBA68992121905` |
| `docs/art/animation-production-report.md` | `E35BCF869273480D7A9D05A2BA08C2B75C31BCC1C24B666A5F43747ABE7BB0AF` |
| `docs/art/phaser-animation-integration.md` | `3E59B42A82683D7AB1A7397D67C3495BF2B063B7DBBCBBEF7B8283B85BC35DB8` |

### Required implementation-time gate

Immediately before the first WP-01 project-file write, `agent-chief` must rerun and record:

1. Resolve and confirm the workspace root; check all nine exact target paths for existence, size, and SHA-256. If any planned-new path now exists, stop and reconcile ownership before writing. If an existing target changed since this plan, inspect it and refresh the plan-preparation record rather than overwriting it blindly.
2. Check `.git` and run `git rev-parse --show-toplevel`. If Git metadata has appeared, record repository root, branch, commit, and dirty status; preserve unrelated changes. Do not reset, clean, or commit.
3. Recheck the supplied repository's read access and local identity. If still inaccessible or unverified, work only in the explicitly designated local workspace and report that no remote operation occurred.
4. Reopen and hash the authoritative inputs: `DESIGN.md`, `ART_BIBLE.md`, `docs/gameplay/energy-catch-mvp.md`, `docs/design/visual-production-roadmap.md`, `assets_manifest.json`, `docs/art/animation-production-report.md`, and `docs/art/phaser-animation-integration.md`. Resolve conflicts from the most specific evidence and record any unresolved conflict.
5. Because no Git checkout is currently available, copy each existing file that will be overwritten (`DESIGN.md`, `ART_BIBLE.md`, and the roadmap) to a uniquely named location outside the project tree. Record each original and snapshot SHA-256 and verify equality before editing. Do not snapshot over an earlier backup. If any copy fails or hashes differ, stop before the first WP-01 write.
6. Save the baseline record outside the WP-01 deliverable set or in the coordinator's task evidence. Do not add an unapproved tenth project deliverable.

The current snapshot above backs up only the spec before the clarifications in this plan. It must not be substituted for the implementation-time backups of the three files above.

## Ownership, dependencies, and task sequence

| ID | Owner | Work and dependency | Exit condition |
|---|---|---|---|
| B0 | `agent-chief` | Run the implementation-time baseline and verified backups. Must finish before any WP-01 project-file write. | All baseline fields recorded; three snapshots hash-match; local target and file ownership are clear. If remote identity remains unverified, explicitly apply the approved local-only fallback and record it; otherwise stop. |
| A1 | `agent-chief` | Read-only review of authoritative source documents and current manifest/reports. May run alongside A2 after B0; no edits. | Fact sheet records source path, evidence, status, and conflicts for each claim needed by the nine files. |
| A2 | `agent-chief` | Read-only inspection of Stitch project `https://stitch.withgoogle.com/projects/7998219093435398329` using the available authenticated browser. May run alongside A1; no save, edit, export, duplicate, delete, or publish action. | Record visible relevant screen names and verified frame/export dimensions, or record `BLOCKED` with what was inaccessible. Previously seen 1280×1024 frame versus 1280×720 content label must be checked again, not assumed resolved. |
| W1a | `agent-spec` (or `agent-chief` if unavailable) | Update `DESIGN.md` and `ART_BIBLE.md` from A1; write sequentially. | Both file-specific acceptance rows below pass; preserve existing visual direction and proposed-token labels. |
| W1b | Same Markdown implementer | Create `docs/design/screen-flow-and-round-map.md` and `docs/design/asset-coverage-and-handoff.md` from A1; write sequentially after W1a. | Both file-specific acceptance rows below pass; no new gameplay rule or unsupported asset status is introduced. |
| W1c | Same Markdown implementer | Update `docs/design/visual-production-roadmap.md` after A2; add links and the dated audit evidence. | Roadmap and Stitch-audit acceptance rows below pass, or audit is explicitly `BLOCKED` and WP-01 cannot be accepted. |
| W1d | Same Markdown implementer | Create root `AGENTS.md` and the three `.agents/skills/.../SKILL.md` files; write one at a time after W1a–W1c. | Each file-specific acceptance row below passes; role selection and evidence labels match the spec. |
| V1 | `agent-chief` | Run documentation-specific automated checks after W1a–W1d: local Markdown links and target paths, referenced local paths, required section/status labels, and JSON parsing of the read-only asset manifest if used by the check. Compare the coordinator's exact write log and pre/post hashes against the nine allowed paths; Git diff is unavailable. | Record commands, exit status, and output. Call results automated verification, not independent agent review. Do not run app build/runtime tests. |
| E1 | Distinct `agent-eval` | Independently review all nine final files against the spec and acceptance matrix, using the actual files. Do not rely only on the implementer's summary or V1 output. Depends on W1; may run after or alongside V1 because it is read-only. | Return accept/revise recommendation, per-file findings, applicable rubric/blockers, and evidence. If a distinct evaluator/tool is unavailable, mark independent evaluation `NOT RUN`; coordinator self-review remains self-review. |
| C1 | Markdown implementer + `agent-chief`; evaluator rechecks | Resolve any E1 blocking or must-fix finding inside the same nine-file scope. Maximum three correction cycles, preserving the spec's limit. Rerun affected V1 checks and request E1 re-evaluation after each cycle. | No P0/P1 or mandatory-acceptance blocker remains, or stop after cycle three and report blocked findings. |
| R1 | `agent-chief` | Assemble evidence and completion report; hand result to human. | Report clearly separates completed checks, blocked/unavailable checks, automated verification, independent evaluation, and remaining risks. Stop for human review. |

Only read-only analysis may overlap. All Markdown writes are sequential because there is no verified isolated Git worktree. No role is a merge or publish authority.

## Per-file changes and acceptance checks

| File | Planned changes | Acceptance check |
|---|---|---|
| `DESIGN.md` | Refresh high-level intent, approved Direction A identity, 1280×720 target, screen inventory, playable/conditional/future labels, concise evidence-based status, and links to authoritative detail. Remove stale statements that gameplay or current rigs do not exist. Do not duplicate detailed rules or asset QA tables. | Preserves both approved characters and confirmed scope; every mechanics/status claim agrees with the gameplay source and production evidence; every local link resolves; no concept is described as integrated runtime content without evidence. |
| `ART_BIBLE.md` | Reconcile production-status section with the animation report and manifest. Keep proposed palette tokens explicitly proposed. Preserve current silhouettes, rigs, animation facts, and visual/accessibility rules. | Status agrees with source reports; no proposed token becomes approved by implication; no character redesign or unsupported production claim; links and paths resolve. |
| `docs/design/visual-production-roadmap.md` | Keep as the sequence/status authority; separate WP-01 from separately gated WP-02; link both new design docs; keep conditional/future labels accurate; add a dated, compact read-only Stitch audit record. | Links resolve; audit record includes project identity, observed screen names, verified dimensions and concept/production labels, or an explicit `BLOCKED` result; no Stitch write/export is claimed. Prior frame/content dimension discrepancy is either evidenced or retained as unresolved. |
| `docs/design/screen-flow-and-round-map.md` | Document intended hierarchy and transitions for Start / Attract, Energy Catch, Round Complete, restart, and round map. Label playable, conditional, and future rounds. Note remaining visual gaps and reduced-motion expectations for celebration. Point to the gameplay source for rules. | Every gameplay transition/control matches `docs/gameplay/energy-catch-mvp.md`; anything not defined there is clearly a visual-only proposal; Duo Circuit and Cool the Core stay conditional and Final Boss stays a future placeholder. |
| `docs/design/asset-coverage-and-handoff.md` | Inventory existing asset families and exact paths using the manifest/reports; distinguish reference/concept material from transparent runtime exports and Phaser-integrated assets; list remaining visual gaps and handoff/QA expectations. | Every existing asset claim resolves to a manifest entry or production report and an existing path; missing/planned assets are labeled; no pose sheet or Stitch board is called production-ready runtime output. |
| `AGENTS.md` | Add short repository entry instructions: authoritative sources, baseline gate, preserve approved rules/rigs, narrow scope, label proposals/unverified claims, choose project-local skills, use proportional role selection, use `agent-chief` or `agent-spec` for Markdown-only implementation, distinguish automated verification from independent evaluation, and keep external actions human-controlled. | All source/skill links resolve; instructions agree with the spec; docs-only task is executable without initializing all six roles; automated script output is not called an independent agent review. |
| `.agents/skills/reactor-rush-stitch-design/SKILL.md` | Define trigger, required inputs, read-only WP-01 audit procedure, dimension/aspect-ratio and status checks, WP-02 separate-approval gate, and inaccessible-project fallback. | WP-01 instructions permit inspection only; no write/export step; verified dimensions are separated from content labels; inaccessible audit is recorded as blocked. |
| `.agents/skills/reactor-rush-asset-qa/SKILL.md` | Define trigger and checks for manifest/source consistency, PNG alpha, crop/clipping, dimensions/pivots, character consistency, Phaser import/runtime evidence when applicable, status terms, and limitations. | Checks map to real project sources or observable evidence; docs-only tasks use relevant checks; concepts/references are never mislabeled as production-ready sprites. |
| `.agents/skills/reactor-rush-parallel-workflow/SKILL.md` | Encode the approved role catalogue and task-type conditions; approved Markdown implementers; documentation-specific verification; distinct automated and independent-evaluation evidence; baseline, isolation, bounded correction cycles, rubric provenance/N/A, blocker precedence, and human-controlled merge/publish. | A documentation-only task selects only needed roles; a script pass is automated verification, never independent evaluation; role limits and all approval gates match the spec. |
| Read-only Stitch audit (evidence recorded in roadmap) | Inspect existing project `7998219093435398329`; observe only relevant visible screens, actual frame/export dimensions where available, and concept/production status. | Audit contains dated observations with no edits, exports, or publish actions. If inaccessible, record the specific limitation and `BLOCKED`; WP-01 overall cannot be reported as fully accepted while this mandatory row is blocked. |

## Documentation-specific verification and evidence

Automated verification should check local Markdown links/paths and anchors where practical, verify cited asset paths and required status labels, parse the read-only JSON manifest if the check consumes it, and confirm the task's changed/created paths are exactly the nine listed above. Report each command/script, exit code, and relevant output. These checks establish only the properties they actually inspect.

Then complete a source-to-document reconciliation against the gameplay specification, asset manifest, animation report, integration guide, and approved design spec. A human or agent reading that source is a content review; a script alone cannot establish visual accuracy, gameplay truth, or independent agent evaluation. Report application build/tests as `NOT RUN — out of scope for documentation-only WP-01`, rather than treating them as failed or passed.

Independent evaluation is a separate evidence row. Credit it only if a distinct `agent-eval` actually examines the final artifacts against the spec and acceptance matrix. If the evaluator is unavailable, state that plainly; do not turn coordinator review or automated output into an independent pass.

## Evidence and completion-report format

The WP-01 report should contain:

1. **Scope and outcome:** the nine file paths; confirmation that runtime, assets/manifest, Git, and Stitch were not written; overall `PASS`, `BLOCKED`, or `REVISE` with blockers taking precedence over scores.
2. **Baseline:** workspace, target existence/hashes, Git metadata result, repository-access/identity result, source paths/hashes, and external backup paths with matching SHA-256 values.
3. **Per-file acceptance matrix:** one row per file and Stitch audit; `PASS` / `FAIL` / `BLOCKED` / `NOT RUN`; concrete evidence or unresolved issue.
4. **Automated verification:** exact command/script, exit code, summary of checks and failures. Label this section `Automated verification`.
5. **Independent evaluation:** reviewer role distinct from implementer, what files were reviewed, recommendation, blockers and applicable score. If not performed, write `NOT RUN` and why. Keep self-review separately labeled.
6. **Stitch audit:** project URL/ID, observed screen names, measured dimensions and content labels, inaccessible details, and explicit confirmation that no write/export occurred.
7. **Limitations and remaining issues:** stale/conflicting sources, unavailable evidence, or follow-up items; do not infer missing facts.
8. **Rollback evidence:** snapshot paths and hashes for overwritten files, plus hashes of newly created deliverables if rollback is requested.

Use the spec's adopted rubric only where criteria apply. Mark N/A with a scope-based reason and normalize the denominator as specified. Any P0/P1 or mandatory acceptance failure means `BLOCKED/REVISE` regardless of score. A high score is not human approval.

## Rollback strategy

Because the workspace has no Git metadata, use only the verified implementation-time snapshots of the three overwritten documents. To roll back, first recheck the destination paths and current hashes; restore each original from its matching snapshot only if the file is still the WP-01 output and no later human edit would be lost. Verify restored hashes against the baseline. Do not use `git reset`, `git clean`, or broad directory deletion.

For the six files created by WP-01, remove only an exact scoped file if its path and hash match the task's recorded output and it contains no later human contribution. If a hash differs, preserve it and request reconciliation. Keep external snapshots until the human confirms rollback is no longer needed. No Stitch rollback is expected because the audit is read-only.

## Review focus

Before implementation approval, review these likely failure points:

1. The local workspace may not correspond to the inaccessible supplied GitHub repository; all work must remain explicitly local.
2. Current source files may change between this plan and execution; baseline and source hashes must be refreshed before writes.
3. Existing concepts, pose references, and animation previews could be overstated as production-integrated assets; labels need evidence.
4. Stitch may be unavailable or may show a frame size that conflicts with its content label; record observation or block the audit rather than guessing.
5. No Git diff is available to reveal unrelated edits; preserve all non-target paths and use exact snapshots and a strict nine-path write log.

## Approval gate

This document is the WP-01 implementation plan only. Wait for the user's explicit approval before performing B0–R1. WP-02 remains separately gated and is not part of this plan. Once implementation is approved and completed, present the evidence report and stop for human review; do not merge, publish, push, or modify Stitch.
