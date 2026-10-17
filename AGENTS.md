# Reactor Rush agent entrypoint

## Source of truth

- Product and visual direction: [DESIGN.md](DESIGN.md).
- Art construction, proposed tokens, and character contract: [ART_BIBLE.md](ART_BIBLE.md).
- Current rules and controls: [Energy Catch MVP](docs/gameplay/energy-catch-mvp.md).
- Asset IDs, paths, dimensions, anchors, and review status: [assets_manifest.json](assets_manifest.json).
- Rig/runtime evidence: [animation production report](docs/art/animation-production-report.md) and [Phaser integration guide](docs/art/phaser-animation-integration.md).
- Visual status and handoffs: [roadmap](docs/design/visual-production-roadmap.md), [screen flow](docs/design/screen-flow-and-round-map.md), and [asset handoff](docs/design/asset-coverage-and-handoff.md).
- Approved WP-01 design system spec: [spec](docs/superpowers/specs/2026-10-17-reactor-rush-design-skills-design.md). The root plan [Reactor_Rush_WP01_Implementation_Plan.md](Reactor_Rush_WP01_Implementation_Plan.md) records the approved WP-01 boundary; user approval controls when a plan may execute.

When sources conflict, preserve the discrepancy and prefer the source assigned authority for that fact. Do not turn a concept, manifest status, local report, or design label into stronger runtime or approval evidence.

## Before writing

For any task that writes project files, first identify the exact root, classify scope, inspect target paths and source-of-truth files, and record current hashes/status. Check Git read-only if present. If Git is absent, create an isolated snapshot outside the project and verify source/copy SHA-256 equality before overwriting existing files. Stop if identity, ownership, source, or backup integrity is unclear. Keep writes within the approved paths and preserve unrelated changes.

## Scope and approvals

- Preserve Direction A and the existing P1 Cyan/P2 Pink rigs, silhouettes, and animation definitions unless a separately approved task explicitly changes them.
- Do not invent gameplay rules for conditional or future rounds. The gameplay specification owns controls, scoring, timers, and transitions.
- Documentation/skills-only work must not change gameplay/runtime code, assets, manifests, dependencies, Git metadata/remotes, or Stitch.
- Stitch visual production, export, or publishing is a separate WP-02 action and needs its own explicit human approval. Any Git commit, push, merge, release, or deployment remains human-controlled.
- If the active plan has a narrower scope, follow that boundary. Do not perform an out-of-scope action because a tool is available.

## Task-type workflow and evidence

Use roles in proportion to task type and risk; do not initialize all six roles by default. For documentation-only changes, the approved Markdown implementer is `agent-chief` or `agent-spec`. Verify local links/paths, source consistency, required status labels, and each document's acceptance criteria; application build/runtime tests are not relevant unless code or runtime behavior is changed.

Keep evidence classes distinct: scripts and validators are **automated verification**; the implementer's own read-through is **self-review**; **independent evaluation** exists only when a distinct reviewer actually evaluates the deliverables against the approved spec and acceptance criteria. A passing script never counts as independent evaluation. State `NOT RUN` when no distinct review occurred.

For code changes, select implementation and execution-based QA roles only when needed by the approved task. Use isolated workspaces for concurrent writers; this workspace has no Git metadata at the WP-01 baseline, so writes are sequential. Apply no more than three Dev-to-QA correction cycles to a task, then stop and escalate unresolved failures.

The code-review rubric provenance is the user's supplied team-agent configuration, as recorded in the approved design system spec; its attribution is not independently validated. Use its code weights only for applicable code work. For N/A criteria, state a scope-based reason and remove the criterion from the denominator; never award full credit for N/A. P0/P1 findings or failed mandatory acceptance criteria override any score.

## Project skills

- [Stitch design and read-only audit](.agents/skills/reactor-rush-stitch-design/SKILL.md)
- [Asset quality assurance](.agents/skills/reactor-rush-asset-qa/SKILL.md)
- [Proportional multi-agent workflow](.agents/skills/reactor-rush-parallel-workflow/SKILL.md)
