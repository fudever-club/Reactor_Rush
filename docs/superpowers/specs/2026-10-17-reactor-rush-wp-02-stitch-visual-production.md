# WP-02 Specification — Stitch Visual Production

**Status:** DRAFT FOR HUMAN REVIEW ONLY — NOT IMPLEMENTATION AUTHORIZATION  
**Date:** 2026-10-17  
**Project:** Reactor Rush  
**Predecessor:** WP-01 `ACCEPTED WITH DOCUMENTED EXCEPTION`; A01 `ACCEPTED BY EXCEPTION — OFFLINE EVIDENCE`. The direct audit technical outcome remains `BLOCKED`, not `TECHNICAL PASS`.

> This document proposes a bounded visual-production scope for review. It authorizes no Stitch edits, exports, project-file changes, asset/manifest changes, gameplay changes, or publication. WP-02 may begin only after this specification and a concrete implementation plan are reviewed and the user gives separate explicit implementation approval.

## 1. Purpose

Produce a coherent, reviewable set of Stitch visual concepts for the Energy Catch MVP and the surrounding Reactor Rush experience. Close the visible design gaps identified in the offline export audit while keeping the existing game rules, approved Direction A characters, Phaser rigs, and status labels intact.

WP-02 is visual production and handoff work. A Stitch screen, static storyboard, HTML export, or PNG capture is a design artifact. None is a Phaser implementation, production-ready game asset, or accepted runtime integration by itself.

## 2. Authoritative inputs and status boundaries

Use these sources in this order for the facts they own:

1. `docs/gameplay/energy-catch-mvp.md` for controls, scoring, timer, item behavior, state transitions, and restart behavior.
2. `DESIGN.md` for product intent, approved visual direction, and screen-design principles.
3. `ART_BIBLE.md` for art construction, accessibility, and proposed shared visual tokens.
4. `docs/design/visual-production-roadmap.md`, `docs/design/screen-flow-and-round-map.md`, and `docs/design/asset-coverage-and-handoff.md` for current visual status and future-round availability labels.
5. `assets_manifest.json` for runtime asset paths, dimensions, anchors, and review status; animation reports remain authoritative for the current rig/runtime evidence.
6. The external WP-01 evidence package for what was and was not observable in Stitch and for the accepted offline audit exception.

When sources conflict, keep the conflict visible and follow the authority assigned to the fact; do not silently resolve a gameplay or approval question through visual copy.

## 3. Preserved decisions and constraints

### 3.1 Characters and animation

- Preserve selected **Direction A / Orbital Buddy** for P1 Cyan and P2 Pink. Do not redesign their silhouettes, facial identity, proportions, or colors as part of WP-02.
- Existing cutout rigs, anchors, pivots, parts, and Idle/Move/Catch/Activate definitions remain the runtime authority. The design work must not replace them with the archive's geometric robot placeholders.
- If the exact rig cannot be loaded into Stitch, keep the character area neutral or use a visibly labeled layout placeholder. Do not present a substitute robot illustration as the approved character art.
- Win and Confused remain unproduced runtime animations. A celebration storyboard may illustrate timing and composition only; it must not be called a runnable animation.

### 3.2 Gameplay

- Energy Catch is the current two-player keyboard co-op MVP, with a 60-second round. Controls and all scoring/item/timer semantics come only from `docs/gameplay/energy-catch-mvp.md`.
- Screen copy must not imply a 1v1 contest, separate competitive winner, unapproved reward, new round rule, or unsupported game mode.
- Show representative score values only when labeled as sample/mock data. Any UI field whose runtime value is not yet confirmed must be marked as a placeholder in the design handoff.
- Do not add camera, webcam, MediaPipe, OSNet, Versus, extra mini-games, or new runtime dependencies.

### 3.3 Round availability

- Energy Catch: **Playable MVP**.
- Duo Circuit and Cool the Core: **Conditional / concept** only; no mechanics, objectives, release schedule, or production maps are approved.
- Final Boss: **Future placeholder** only; no encounter, mechanics, or release commitment is approved.
- A round map is visual-only and must not imply that later rounds can currently be selected or played.

## 4. Offline audit evidence and candidate treatment

The user accepted the offline Stitch Export Audit as substitute evidence for A01 in WP-01. That decision accepts an exception for WP-01; it does not establish direct Stitch editor access, true editor-frame dimensions, or WP-02 readiness. The screenshots below are measured raster captures, not editor-frame measurements. The HTML 1280×720 declarations do not prove that the corresponding Stitch frames are 1280×720.

| Existing archive item | Offline evidence | Proposed WP-02 treatment (not a canonical selection) |
|---|---|---|
| `reactor_rush_start_attract_screen` | Screenshot 1600×1280 (5:4 capture); 2P co-op direction is present in the wider flow, but the capture is not an exact 16:9 frame export. | Candidate to refine as the Start / Attract screen. Verify the actual editor frame and deliver a clean 1280×720 design. |
| `reactor_rush_energy_catch_arcade_gameplay_hud` | Screenshot 1600×900 (16:9 capture); its HTML is byte-identical to `docs/design/energy-catch-hud-stitch.html`. Audit found crowded labels/numeric panels. | Candidate layout reference for one readable co-op gameplay HUD. Rework hierarchy, safe margins, and legibility; do not treat the existing capture as approved. |
| `energy_catch_official_1280x720_gameplay_hud` | Screenshot 1600×898; includes “1V1 ARCADE”, which conflicts with the co-op gameplay authority. | Do not use as the canonical gameplay concept unless its conflicting copy and layout are corrected and reviewed. Preserve it as an audited alternative. |
| `energy_catch_orbital_buddy_in_game_hud` | Portrait screenshot 640×1020 with visible overlap/cropping. | Exclude as a final layout reference. Reuse only isolated ideas that survive a fresh 16:9 design review. |
| `reactor_rush_round_complete_corrected_mvp` | Screenshot 1600×1280 (5:4 capture). Content labels results as SAMPLE DATA and celebration treatment as VFX CONCEPT. | Candidate for a corrected Round Complete design; rebuild/reframe to the verified target canvas and keep sample/VFX labels until runtime behavior exists. |
| `reactor_rush_round_complete_screen` | Screenshot 1600×907; separate alternate result concept. | Retain as an alternate/superseded candidate until the user reviews the refined result screen. Do not merge conflicting variants without review. |

WP-02 must record the canonical choice and any superseded alternatives in its completion evidence. This specification itself does not select a final Stitch frame.

## 5. Proposed production scope

The following are proposed design deliverables for a later, separately authorized WP-02 execution. Each is a visual concept or handoff unless separately approved and validated as a runtime asset.

### S01 — Start / Attract

- A 1280×720, 16:9 Start / Attract composition with the Energy Catch co-op identity, concise objective, clear Enter action, and visible P1/P2 identification.
- Preserve menu/start behavior from the gameplay source; do not add a new flow or attract-loop behavior without labeling it as a visual proposal.
- Use the current rig identity or a neutral placeholder; do not redraw the characters.

### S02 — Energy Catch gameplay HUD

- A 1280×720 co-op gameplay layout with two player lanes, central playfield, and clearly separated score, timer, combo/reactor information as supported by the current runtime.
- Use the approved gameplay authority for labels and values. Keep controls concise and consistent with P1 A/D + hold S and P2 Left/Right + hold Down.
- Resolve the crowding and clipping findings from the audit. Keep gameplay text as editable UI text rather than baked background art.
- Any score/energy values used in a static concept must be labeled sample data.

### S03 — Round Complete and celebration storyboard

- A 1280×720 result screen concept whose language is appropriate to two-player co-op. Do not assert a head-to-head winner or invent rewards.
- A short visual beat/storyboard for the existing result transition, plus a reduced-motion presentation that avoids persistent pulsing, screen shake, or high-density particles.
- Mark any illustrative values as `SAMPLE DATA` and all proposed effects as `VFX CONCEPT`. The board is not a Phaser animation or runtime feature.

### S04 — Round map

- A 1280×720 visual-only map/card composition for Energy Catch, Duo Circuit, Cool the Core, and Final Boss.
- Show the exact availability labels from Section 3.3. Make the latter three visibly unavailable/conditional and avoid button affordances that imply they launch playable modes.
- Do not add round order, progression, unlocks, goals, or other gameplay rules.

### ART-01 — Core lab environment and gameplay-art concept board

Provide a layered concept board for the Energy Catch visual space and its needed art families:

- science-lab background, reactor focal point, conduits/panels, and a small set of restrained props;
- energy orb and hazard visual directions corresponding to existing item categories;
- catch-feedback and reactor-charge visual studies consistent with the Art Bible's restrained motion and small particle budget;
- layer/occlusion notes for background, midground, gameplay items, effects, and HUD.

These are design proposals. Do not change the Phaser shapes, export into runtime asset paths, update either manifest, or claim production readiness in WP-02 unless a later explicit approval expands scope.

### ENV-01 — Round-environment exploration board

- Refine or annotate the existing round-environment mood-board direction for Energy Catch, Duo Circuit, Cool the Core, and Final Boss.
- Keep Duo Circuit/Cool the Core conditional and Final Boss a future placeholder. Distinguish visual setting from a playable map or mechanics specification.
- Do not invent gameplay objects or environmental hazards that imply unapproved rules.

### Out of scope for WP-02

- Phaser, TypeScript, gameplay, runtime UI, rig/animation, project config, dependency, and asset-manifest edits.
- Runtime asset exports placed under `assets/` or `public/`; runtime integration; declaring any export production-ready.
- Character redesign, new animation production, new game mechanics, mode additions, or accessibility behavior that changes gameplay.
- Git metadata/remote writes, commit, push, merge, release, or publish.
- Stitch work before the implementation plan and separate human approval are complete.

If later work needs any out-of-scope action, define it as a separate item with exact files, outputs, acceptance criteria, and explicit approval before execution.

## 6. Visual and export requirements

- **Canvas:** each canonical screen frame must be verifiably 1280×720 (16:9) in the Stitch editor before acceptance. Record the editor frame size separately from screenshot/PNG raster dimensions. Do not stretch a padded 5:4 capture into 16:9; export/crop the actual frame without distortion.
- **Safe area:** keep gameplay-critical content inside the Art Bible's 5% edge-safe area; keep the central playfield readable and uncluttered.
- **Scale/readability:** inspect at the design canvas and at a proportional 1920×1080 presentation preview. This is a visual review, not a target-TV or hardware performance certification.
- **Character identity:** use Direction A P1/P2 silhouettes, labels, and lane positions. Do not rely on color alone.
- **Palette:** the Art Bible values `#55DFFF` and `#FF78BD` remain proposals; the offline brief also proposes `#00F0FF` and `#FF4D79`. No set is approved. Resolve palette choice as an explicit human decision before final token lock. Until then, annotate the choice as provisional and keep P1/P2 distinguishable by text, shape, and position.
- **Typography and external resources:** prefer local/system font stacks consistent with the Art Bible. If a Stitch code export uses external fonts/CDNs, disclose that in the handoff and do not present the export as a self-contained runtime package.
- **Alpha and asset claims:** only request transparent PNGs for isolated asset studies where transparency is meaningful. Record dimensions and alpha behavior; a screenshot PNG is not automatically an isolated transparent asset.
- **Motion:** show storyboard timing and a reduced-motion alternative. Do not claim the storyboard was executed in Phaser.

## 7. Access, approval, and execution gates

1. **Spec review:** the user reviews this document and the proposed screen/board list. No Stitch interaction that changes state is permitted at this gate.
2. **Implementation plan:** after spec review, prepare a concrete WP-02 plan listing exact Stitch project/canvas targets, each frame, approved text/data, token choice or provisional treatment, export format/dimensions, evidence, ownership, and per-item acceptance checks. The plan must say what is a design concept versus any requested asset export.
3. **Separate implementation approval:** do not begin any Stitch create/edit/export action until the user explicitly approves the WP-02 implementation plan. Approval of WP-01's offline A01 exception is not WP-02 approval.
4. **G0 access/baseline:** after approval and before any Stitch write, verify the supplied project identity and actual accessible editor/canvas read-only. Record the baseline frame inventory, dimensions, and current state. If the editor again shows Sign In/error or the target is ambiguous, stop before edits; the WP-01 exception does not waive this WP-02 technical gate.
5. **Production and review:** execute only the approved screen list, preserve alternatives, and capture evidence before/after. Do not publish. Keep shared-canvas writes serialized.
6. **Acceptance and closeout:** report each item as accepted/revise/blocked with direct evidence. Human acceptance remains separate from automated checks and evaluator recommendations.

## 8. Proposed acceptance matrix for future WP-02 execution

| ID | Deliverable | Acceptance criteria | Evidence required |
|---|---|---|---|
| G0 | Stitch access and baseline | Correct project is accessible; target canvases and current frames are identifiable; no write occurs before inventory. | Project URL/ID, visible canvas/frame list, actual editor dimensions, baseline screenshots or equivalent read-only record. If inaccessible, mark blocked. |
| S01 | Start / Attract | Verified 1280×720 frame; 2P co-op message and Enter action read clearly; no unapproved mechanic; character identity preserved. | Editor frame dimensions, full-frame capture, copy review, safe-area/clipping check, chosen canonical status. |
| S02 | Gameplay HUD | Verified 1280×720 frame; co-op controls and fields match gameplay authority; no 1v1 wording; labels/numbers do not overlap/crop; center playfield remains readable. | Frame dimensions, capture at canvas scale and 1920×1080 preview, text/control parity checklist, clipping review. |
| S03 | Round Complete / VFX storyboard | Co-op-appropriate result language; no invented winner/reward; sample values and VFX concept explicitly labeled; reduced-motion beat documented. | Frame capture, copy/data provenance checklist, storyboard plus reduced-motion alternative, no-runtime-claim note. |
| S04 | Round map | All four availability states match the authoritative round map; later rounds cannot be mistaken for playable/launchable content. | Full-frame capture, label checklist, visual affordance review. |
| ART-01 | Lab/gameplay-art board | Required art families and layer/occlusion relationships are represented; item directions align with existing categories; all concepts are labeled as proposals. | Board capture, inventory of concept items, status labels, no-runtime-asset confirmation. |
| ENV-01 | Round-environment board | Energy Catch is the existing visual anchor; conditional/future labels are accurate; no map/mechanic claim is implied. | Board capture, round-label checklist, source reconciliation. |
| Cross-cutting | Canvas, palette, character, and status integrity | Actual frame dimensions are distinguished from capture dimensions; token decision is recorded; Direction A is preserved; no concept is called production/runtime-ready. | Per-frame editor measurements, token decision record, visual review notes, asset status and ownership note. |
| Handoff | Editable source and evidence | Stitch remains editable; canonical and alternate/superseded frames are named; exports and ownership/rights questions are recorded; no runtime integration is claimed. | Source project link and frame IDs, inventory with dimensions/format/hash where available, screenshots, limitations, unresolved findings. |

A passing checklist does not override a failed mandatory criterion or a P0/P1 blocker. Report `N/A` with a scope reason rather than treating it as a pass. Distinguish automated/source checks, implementer self-review, a distinct agent-eval independent review (only if actually performed), and human acceptance.

## 9. Evidence and reporting format

For each screen or board, report:

- item ID and canonical/alternate/superseded status;
- Stitch project link and frame/canvas identifier;
- measured editor frame dimensions, screenshot dimensions, and export dimensions as separate fields;
- source/editability and export format; transparency only where applicable;
- screenshot(s) at the verified frame and presentation preview;
- gameplay-source/copy parity and round-availability check;
- character/palette status, clipping/safe-area findings, and unresolved visual issues;
- ownership/license/source attribution status;
- automated checks, self-review, independent evaluation if actually performed, and final human disposition as separate evidence classes;
- explicit statement that no Phaser/runtime integration occurred in WP-02.

Do not report `TECHNICAL PASS` for a check that only has offline substitute evidence. Do not claim target hardware performance, TV legibility, or runtime behavior from static frames.

## 10. Open decisions for spec review

1. Approve, revise, or reduce the proposed six visual deliverables: S01–S04, ART-01, and ENV-01.
2. Confirm the intended palette token set, or authorize a clearly labeled provisional color treatment until a later art-token decision.
3. Confirm whether the existing candidate layouts should be treated only as references (recommended) or whether any one should be the base for a canonical screen.
4. Confirm that runtime exports and manifest updates stay out of WP-02 and are handled by a later separately scoped production/handoff task (recommended).
5. Confirm that Energy Catch result copy should stay neutral/co-op and use runtime-bound data placeholders until the gameplay source defines the displayed result fields.

These questions are included for review; reasonable defaults are stated above so the user can approve or edit the spec without blocking the current draft.

## 11. WP-02 closeout rule

WP-02 is complete only when its approved visual deliverables meet the matrix, evidence is recorded, unresolved items are explicit, and the user accepts the result. The offline A01 exception closes WP-01 only. It neither establishes direct Stitch access nor waives the WP-02 access gate. Implementation remains unapproved until the user separately approves a concrete plan.