# Arcade Identity and Feedback Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or executing-plans. User delegates choices/execution; project constraints override Git commits, external publication and parallel source writers.

**Goal:** Deliver the Mission Patch Lab identity and clearer live feedback on the working three-round campaign.
**Architecture:** Keep engines/input untouched. Add small pure presentation helpers and an optional bounded audio presenter; the existing scene dispatches actual events and current zones. Existing DOM/canvas views own visual integration and final-menu cleanup.
**Tech Stack:** Existing TypeScript/Phaser/Vite/Node, local SVG, WebAudio; no dependencies.
**Spec:** ../specs/2026-10-22-arcade-identity-feedback-design.md

## Global constraints

- Existing scoring,60000ms rounds,900ms ready,camera consent/calibration/fresh-release/identity guards, DirectionA rigs remain unchanged.
- Sequential writers in designated root;243-file hash-verified snapshot protects all prior uncommitted work. No worktree/Git metadata writes, commit/push/merge, release/deploy or Stitch production.
- Sound OFF by default, explicit toggle,4voice cap,450ms cue duration cap, no persistent preference or remote media.
- New assets editable SVG, total≤50kB, exact old manifest records retained, root/served manifests equal.

## Review focus

- Lost/stale/obscured input cannot make coaching or audio imply accepted release.
- Wrong zone must not instruct HOLD; overload must instruct RELEASE even while outside target.
- Batched socket+circuit events cannot duplicate score, announcements or unbounded voices.
- Enter on Sound/Menu controls cannot invoke global start/Next/Replay.
- Final-menu camera cleanup, hidden-document/mute audio cleanup and unsupported browser paths must be safe.

### Task1 — coherent runtime upgrade (one sequential implementer)

**Ownership:** index.html, src/game-style.css, src/main.ts; src/gameplay/campaign-ui.ts, challenge-renderer.ts; new src/gameplay/feedback.ts and game-audio.ts (or equivalently named focused presentation modules); four new assets/brand and assets/ui SVGs; original user-supplied PNG masters and derived logo/Buggy assets under assets/brand and assets/mascot; append-only assets_manifest.json and public/assets_manifest.json; focused tests/feedback.test.mjs, tests/game-audio.test.mjs, tests/camera-ui.test.mjs VM import additions/regressions, tests/browser/arcade-presentation-smoke.mjs and directly affected campaign browser assertions. No engine/adapter/rig/dependency edits. Root retains docs ownership after source freeze.

**Interfaces:** Coaching consumes CampaignState, ChallengeState/getChallengeView, actual per-player Zone and existing releaseSeen; returns strings only. Event presentation consumes event.kind/player/points or actualEnergyCatchdelta, produces bounded descriptive text and sound cue without writing stats. Audio presenter exposes explicit user toggle, present(cue), stop/mute/dispose and read-only available/enabled state; exact interfaces documented in implementer's report. Menu action is scene-owned, available only at campaign.complete, using existing Stop before reset.

- [x] Write focused failing tests for wrong-zone/release/overload priority, exact4000/6000ms phase labels and score-floor feedback; run RED before implementation.
- [x] Implement pure feedback helper and optional audio with fake-context failure/voice bounds/cleanup tests; retain RED/GREEN outputs externally.
- [x] Integrate actual event batches/current zones, live announcer, input-aware accessible labels, final Menu teardown/reset/focus; preserve original VM assertions and native-key behavior.
- [x] Author four coherent SVGs, record measured metadata and append manifests; integrate identity, apparatus diagrams, distinct arena forms, restrained completion seal and sound toggle. Preserve incumbent art direction/system font.
- [x] Run full unit/typecheck/build and focused browser for sound semantics, positive Energy Catch event, menu/action flow; preserve failures and exact changes. No browser test mutators or timer cheats.
- [x] Run real3x60s campaign and one batched visual evidence set at1280/960 Solo/Co-op. Freeze source and hand off exact hashes/commands/evidence for distinct review.

### Task2 — bounded independent QA and handoff (coordinator/reviewer)

**Ownership:** Root documentation after source freeze: PRODUCT.md, DESIGN.md datedaddendum, docs/design/visual-production-roadmap.md, docs/design/asset-coverage-and-handoff.md, docs/reports/arcade-upgrade-2026-10-22.md, this plan, new upgrade spec. Do not rewrite historicalartapprovals. Reviewer is read-only except external report.
- [x] Independently evaluate code/spec/new SVG exports, metadata/rootmanifest parity, old-record equality, screenshots and preserved source hashes; request one correction batch when needed,≤3total.
- [x] Run final Impeccable detector once and record any pinned-direction exceptions; confirm correction visuals at most once.
- [x] Reconcile docs/currentstatus/asset requests and create prioritized future roadmap with proposals labelled. Separate automated,self-review,independent and physical NOT RUN evidence.
- [x] Build separate new Downloads candidate, verify all copy/HTTP hashes, open actual game and show a screenshot. Preserve previous candidate and its server. Leave source uncommitted.

### Handoff correction3/3 — narrow menu guard

Actual default354x600 IAB pane revealed menu overlap outside the accepted landscape widths. Same sequential implementer additionally owns only the minimal handleStartRequested width guard in src/main.ts, a static menu notice in index.html, responsive CSS in src/game-style.css and one focused browser regression. Snapshot before edits; verify menu Start/body Enter cannot bypass at354px, accepted960/1280 normal, Sound/camera/non-menu controls preserved. Distinct reviewer evaluates exact delta/default-pane screenshot. No art redesign/fullscreen/engine changes; no further correction cycle after this batch.

Closure: final distinct independent PASS includes correction3 guard and portable screenshots;3/3 correction batches used. Final252unit/typecheck/build PASS;29/29 package and27/27HTTP SHA checks PASS. Physical/narrow-gameplay limits remain explicit in the report.
