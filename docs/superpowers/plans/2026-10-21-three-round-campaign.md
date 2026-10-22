# Three-round campaign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement task-by-task. Project AGENTS.md overrides commits, worktree creation, concurrency and correction caps.

**Goal:** Ship a local three-round campaign with playable rounds, distinct screens, cumulative results and preserved camera controls.
**Architecture:** Pure campaign state retains round snapshots; pure challenge state drives new round mechanics. Existing Phaser scene retains input lifecycle and Energy Catch, orchestrating round-specific rendering and DOM overlays.
**Tech Stack:** Existing TypeScript, Phaser, Vite, Node test runner; no new dependency.
**Spec:** ../../gameplay/three-round-campaign.md

## Global Constraints
- Preserve Direction A, both existing rigs and animation definitions, camera consent, local processing, calibration, stale-input/identity protections, and offline assets.
- Each round lasts exactly 60,000 ms. Ready beat is 900 ms. No test-only runtime timer shortcuts.
- No Git commit/push/merge, deployment, external design publication, Stitch write, new dependency, or character asset change.
- Sequential writers in the user-designated root; verified external snapshot is available. Root coordinator does not edit product files while a worker writes.
- At most three Dev-to-QA correction cycles per task.

## Review Focus
- Repeated clicks/key events cannot duplicate a completed round or skip an intro: campaign tests and browser transitions.
- Held activation at a boundary cannot score before release: challenge tests and browser challenge check.
- Historical steps after a stall cannot manufacture a held gesture: challenge delta tests and scene integration check.
- Solo excludes P2 and replay clears all three rounds: campaign tests and final screen assertions.
- Camera remains usable across transitions, and Stop hides its button and returns input: preserved lifecycle tests plus browser DOM check.

### Task 1: Pure campaign and challenge engines
**Ownership:** Create src/gameplay/campaign.ts, src/gameplay/challenges.ts, tests/campaign.test.mjs, tests/challenges.test.mjs only. Do not edit existing core or adapters.
**Consumes:** PlayerStats, PlayerId and InputFrame from core.ts; exact rules/constants from spec.
**Produces:** The Runtime contracts section's exports; write a concise interface report for task 2 in the external evidence folder.
- [x] Write failing behavior tests for session progression, snapshots, totals, phase guards and replay.
- [x] Run and observe missing exports/module failure; implement the pure campaign engine and get tests green.
- [x] Write failing behavioral tests for circuit and cooling rules, edges and immutability; implement challenge engine.
- [x] Run new tests, then the complete Node unit suite; report exact output and any pre-existing failures. No commit.
- [x] Independent task review of spec compliance and code quality; fix findings within project cap.

### Task 2: Scene, arenas and complete screen flow
**Ownership:** src/main.ts, index.html, src/game-style.css, a new src/gameplay/challenge-renderer.ts and/or small UI module as justified; tests/browser/three-round-campaign.mjs and directly affected browser tests. Do not change adapters, rigs, assets, manifest or dependencies.
**Consumes:** Task 1 exports and interface report; existing core advanceGameFrame/keyboard/camera paths.
**Produces:** User-visible 3-round game, final score table and runtime observations.
- [x] Add a browser test that expects intro, campaign order and final breakdown; observe failure on the current single-round UI.
- [x] Integrate campaign lifecycle, explicit intro/next/replay, immutable completion and per-round stats. Preserve Energy Catch simulation.
- [x] Render circuit sockets and cooling chamber/valves with progress/heat; supply zone mapping and current-step-only action to engine. Keep renderer separate from mechanics.
- [x] Build menu/intro/HUD/results/final layouts, focus/key routing, responsive/reduced-motion behavior, solo labels and camera-stop hidden fix.
- [x] Run typecheck/build, full unit suite and browser campaign test using real timers. Save outputs/screenshots outside source; distinguish physical/synthetic evidence.
- [x] Independent task review. Fix issues within cap; do not commit.

### Task 3: Integration verification and handoff
**Ownership:** Coordinator documentation paths README.md, DESIGN.md, docs/gameplay/energy-catch-mvp.md, docs/design/screen-flow-and-round-map.md, docs/design/visual-production-roadmap.md, docs/reports/three-round-campaign-2026-10-21.md, this plan checklist; no changes to ART_BIBLE/rigs/manifest.
- [x] Reconcile actual implemented source paths and new round status; retain historical evidence labels and link the new gameplay authority.
- [x] Read test/build/browser evidence; verify changed paths and preserved asset hashes.
- [x] Whole-change independent review against spec and user intent; resolve blocking findings and record limitations.
- [x] Leave local changes uncommitted, show the local game and link result/evidence report. No release/booth certification claim.

## Completion record — 21 October 2026

Tasks 1–3 completed locally. Final 237/237 unit tests, typecheck/build exit 0, real 3 × 60-second campaign/replay and five sequential browser commands pass. Distinct whole-change review PASS after 3/3 Task 2 correction batches; no further product change. Portable 26/26 file hashes and 24/24 served hashes verified; game opened on localhost:4181. [Evidence and physical acceptance limits](../../reports/three-round-campaign-2026-10-21.md). Source remains uncommitted.
