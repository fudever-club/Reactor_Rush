# REACTOR RUSH! — Design Direction

**Status:** Direction A preserved; local three-round campaign and Mission Patch Lab presentation added 21–22 October 2026; final art/field/release acceptance remains open

**Scope:** Product and visual-design overview for the current local prototype.  
**Background brief:** [Reactor Rush | Development, Design & MCP Integration Plan v2.0 (Draft)](https://docs.google.com/document/d/1nOhByNppJMz84ysqzSAEF9rjdyVT6E0Z6292bCk_-xQ/edit). The linked brief is a draft and is not the authority for current runtime status.

This document summarizes the approved visual direction and local project state. Earlier WP-01 documentation did not execute the game or verify Stitch access. The 21 October campaign work has separate automated/browser evidence in the [campaign report](docs/reports/three-round-campaign-2026-10-21.md); target hardware and final release acceptance remain separate.

## Grounded project brief

| Item | Current evidence | Design consequence |
|---|---|---|
| Game | The local prototype uses Phaser 4.2.1, TypeScript and Vite. | Keep the presentation 2D-first and use the current runtime asset pipeline. |
| Display | The gameplay scene is documented at 1280 × 720 (16:9). | Prioritize large silhouettes, short labels, broad contrast and safe margins. |
| Current playable mode | A local Solo/Co-op campaign connects Energy Catch, Duo Circuit and Cool the Core with intros, per-round results and a final breakdown. | Use the [campaign gameplay spec](docs/gameplay/three-round-campaign.md) for rules and [current test report](docs/reports/three-round-campaign-2026-10-21.md) for verification scope. |
| Round scope | The user confirmed Energy Catch → Duo Circuit → Cool the Core on 21 October 2026. Their local mechanics are now specified and implemented; Final Boss remains a future placeholder. | Distinguish this new local runtime from older Stitch concepts and final art/booth approval. |
| Inputs | Keyboard remains available. Optional camera schemes include default Pose Both Arms P1, Hand Pinch H0 and Pose One Arm P2; consent and calibration remain explicit. | Preserve the shared move/activate contract, camera opt-in, stale/identity guards and local frames. |
| Characters and animation | P1 Cyan and P2 Pink use the selected Direction A design. Local production reports record transparent cutout parts, editable SVG sources and Phaser observations for Idle, Move, Catch and Activate. Win and Confused are not produced as runtime animations. | Preserve the existing rigs and silhouette identities. The animation pack remains a functional integration draft under review, not final approved art. Per-character part counts and file metadata belong in the manifest and asset handoff. |
| Asset status | The manifest contains 64 records; 3 are `Draft` and 61 are `In review`, including six new game/club presentation assets. Pose references are explicitly reference-only. | Keep concept, export, integration and approval status separate. Use the manifest for exact asset metadata. |
| Hardware | The booth target is described as a Dell Vostro 15 5510, i5-11320H, 32 GB RAM, without a discrete GPU. No trustworthy target-device benchmark is recorded. | Keep effects inexpensive and label performance and TV legibility unverified until measured on the target setup. |

Current campaign behavior and verification are recorded in the [campaign spec](docs/gameplay/three-round-campaign.md) and [campaign report](docs/reports/three-round-campaign-2026-10-21.md). Existing animation evidence remains in the [`animation production report`](docs/art/animation-production-report.md); this campaign task preserves those rigs and definitions.

## User brief and visual principles

- Make the arcade experience welcoming and readable from across a STEM Fair room.
- P1 reads as cyan and P2 as pink, with silhouette, labels and position providing additional distinction.
- Keep the pair non-gendered and preserve the approved robot identities.
- Reserve the central playfield for the reactor, falling objects and player action. Keep long explanations off the HUD.
- Use reduced-motion paths for long loops, pulsing borders and screen shake.
- Use the original FU-DEVER logo and Buggy sources supplied by the user on 22 October. Preserve their proportions, colors and provenance; do not redraw the club logo or substitute it with the original Reactor Rush game mark.

## Selected direction: A — Orbital Buddy

The user selected Direction A on 17 October 2026. P1 Cyan has a taller, tapered kite-like head and one flexible antenna; P2 Pink is shorter and wider, with two round side sensors and broad feet. Preserve these approved silhouettes and the existing rigs. The other direction boards remain comparison references, not active production directions.

The model sheet and six-pose board are visual references. The pose board is one static opaque image, not a production sprite sheet. Current cutout parts are editable-source exports, but the manifest and production report still mark the pack as in review / integration draft. Do not treat the concept approval as final production-art approval.

## Visual system proposal

The palette tokens, typography, outlines, lighting, accessibility and motion guidance live in [`ART_BIBLE.md`](ART_BIBLE.md). Its hex values and type choices remain **proposed** until approved and checked at the target display scale. Do not promote them to brand standards by repetition.

## Screen and round direction

The current campaign flow is documented in [`three-round-campaign.md`](docs/gameplay/three-round-campaign.md); [`energy-catch-mvp.md`](docs/gameplay/energy-catch-mvp.md) retains the unchanged first-round rules. A visual handoff for menu, gameplay, results, restart and round availability is in [`screen-flow-and-round-map.md`](docs/design/screen-flow-and-round-map.md). Production sequencing and current concept/runtime labels are maintained in the [`visual production roadmap`](docs/design/visual-production-roadmap.md).

The current campaign route shows Energy Catch → Duo Circuit → Cool the Core. The [campaign spec](docs/gameplay/three-round-campaign.md) owns the new round mechanics and transitions; [verification report](docs/reports/three-round-campaign-2026-10-21.md) owns test claims. Final Boss remains outside scope. Older WP-01/WP-02 conditional labels are historical evidence, not current campaign availability.

## Mission Patch Lab expansion — 22 October 2026

The selected local upgrade expands Direction A with an original Reactor Rush symbol, three editable SVG apparatus diagrams, situation-aware MOVE/HOLD/RELEASE coaching, event-specific feedback, optional local sound and final Mission Menu. Existing scoring, timers, rig definitions and accepted-release guards are preserved. The [upgrade specification](docs/superpowers/specs/2026-10-22-arcade-identity-feedback-design.md) records the delegated decision and exact limits; [verification report](docs/reports/arcade-upgrade-2026-10-22.md) records actual execution and remaining acceptance.

The user supplied official club assets. Use the white/red dark-context logo for secondary menu/results credit; celebration Buggy appears only at campaign completion. Exact originals remain beside proportionally resized runtime exports. The manifest keeps these records In review; integration is separate from final art/release approval. Earlier ART_BIBLE/asset-handoff statements about missing club assets describe the 17 October baseline and are superseded by this dated input. System typography and game-specific navy/Cyan/Pink identities remain in place.

## Sources of truth and related files

- [`ART_BIBLE.md`](ART_BIBLE.md) — visual construction, palette proposal, motion and accessibility rules.
- [`docs/gameplay/energy-catch-mvp.md`](docs/gameplay/energy-catch-mvp.md) — unchanged first-round behavior and controls.
- [`docs/design/visual-production-roadmap.md`](docs/design/visual-production-roadmap.md) — current concept, integration and production status.
- [`docs/design/screen-flow-and-round-map.md`](docs/design/screen-flow-and-round-map.md) — screen hierarchy and round availability labels.
- [`docs/design/asset-coverage-and-handoff.md`](docs/design/asset-coverage-and-handoff.md) — asset-family inventory and future handoff contract.
- [`assets_manifest.json`](assets_manifest.json) — exact asset paths, dimensions, anchors and review status.
- [`docs/art/animation-production-report.md`](docs/art/animation-production-report.md) and [`docs/art/phaser-animation-integration.md`](docs/art/phaser-animation-integration.md) — existing rig/runtime evidence and integration contract.
- [`assets/concepts/robots/`](assets/concepts/robots/) — static concept references; not runtime sheets.
