# REACTOR RUSH! — Design Direction

**Status:** Direction A selected; current Energy Catch MVP and P1/P2 animation integration are documented locally; final art approval remains open · 17 October 2026  
**Scope:** Product and visual-design overview for the current local prototype.  
**Background brief:** [Reactor Rush | Development, Design & MCP Integration Plan v2.0 (Draft)](https://docs.google.com/document/d/1nOhByNppJMz84ysqzSAEF9rjdyVT6E0Z6292bCk_-xQ/edit). The linked brief is a draft and is not the authority for current runtime status.

This document summarizes the approved visual direction and reported local project state. It does not claim that this WP-01 run executed the game, reran tests, measured target hardware, or verified Stitch access. Detailed gameplay, production and per-asset evidence stay in their linked source documents.

## Grounded project brief

| Item | Current evidence | Design consequence |
|---|---|---|
| Game | The local prototype uses Phaser 4.2.1, TypeScript and Vite. | Keep the presentation 2D-first and use the current runtime asset pipeline. |
| Display | The gameplay scene is documented at 1280 × 720 (16:9). | Prioritize large silhouettes, short labels, broad contrast and safe margins. |
| Current playable mode | Energy Catch is documented as a 60-second, two-player keyboard co-op MVP. | Design the current HUD and playfield around two player lanes. The gameplay document owns controls, scoring and timer rules. |
| Other rounds | Duo Circuit and Cool the Core are conditional; Final Boss is a future placeholder. Their mechanics are not specified. | Keep their visuals labeled as concepts; do not imply availability or invent rules. |
| Inputs | Keyboard remains the default. An optional webcam beta uses MediaPipe Hand Landmarker for two-player motion input; camera permissions and metrics disclosure are shown before activation. | Keep keyboard playable as fallback. Do not request camera access until the player opts in. Keep raw frames local and do not record them. |
| Characters and animation | P1 Cyan and P2 Pink use the selected Direction A design. Local production reports record transparent cutout parts, editable SVG sources and Phaser observations for Idle, Move, Catch and Activate. Win and Confused are not produced as runtime animations. | Preserve the existing rigs and silhouette identities. The animation pack remains a functional integration draft under review, not final approved art. Per-character part counts and file metadata belong in the manifest and asset handoff. |
| Asset status | The manifest contains 58 records; 3 are `Draft` and 55 are `In review`. Pose references are explicitly reference-only. | Keep concept, export, integration and approval status separate. Use the manifest for exact asset metadata. |
| Hardware | The booth target is described as a Dell Vostro 15 5510, i5-11320H, 32 GB RAM, without a discrete GPU. No trustworthy target-device benchmark is recorded. | Keep effects inexpensive and label performance and TV legibility unverified until measured on the target setup. |

The runtime and animation statements above summarize [`Energy Catch — Playable MVP`](docs/gameplay/energy-catch-mvp.md) and the [`animation production report`](docs/art/animation-production-report.md). They are recorded local evidence; they were not re-executed during this documentation task.

## User brief and visual principles

- Make the arcade experience welcoming and readable from across a STEM Fair room.
- P1 reads as cyan and P2 as pink, with silhouette, labels and position providing additional distinction.
- Keep the pair non-gendered and preserve the approved robot identities.
- Reserve the central playfield for the reactor, falling objects and player action. Keep long explanations off the HUD.
- Use reduced-motion paths for long loops, pulsing borders and screen shake.
- Do not invent or imitate an official FU-DEVER logo; no authorized logo file is present in the local source set.

## Selected direction: A — Orbital Buddy

The user selected Direction A on 17 October 2026. P1 Cyan has a taller, tapered kite-like head and one flexible antenna; P2 Pink is shorter and wider, with two round side sensors and broad feet. Preserve these approved silhouettes and the existing rigs. The other direction boards remain comparison references, not active production directions.

The model sheet and six-pose board are visual references. The pose board is one static opaque image, not a production sprite sheet. Current cutout parts are editable-source exports, but the manifest and production report still mark the pack as in review / integration draft. Do not treat the concept approval as final production-art approval.

## Visual system proposal

The palette tokens, typography, outlines, lighting, accessibility and motion guidance live in [`ART_BIBLE.md`](ART_BIBLE.md). Its hex values and type choices remain **proposed** until approved and checked at the target display scale. Do not promote them to brand standards by repetition.

## Screen and round direction

The current runtime flow is documented in [`docs/gameplay/energy-catch-mvp.md`](docs/gameplay/energy-catch-mvp.md). A visual handoff for menu, gameplay, results, restart and round availability is in [`screen-flow-and-round-map.md`](docs/design/screen-flow-and-round-map.md). Production sequencing and current concept/runtime labels are maintained in the [`visual production roadmap`](docs/design/visual-production-roadmap.md).

Any proposed round map must show Energy Catch as the playable MVP, Duo Circuit and Cool the Core as conditional, and Final Boss as a future placeholder. It must not imply unapproved round mechanics or a playable transition.

## Sources of truth and related files

- [`ART_BIBLE.md`](ART_BIBLE.md) — visual construction, palette proposal, motion and accessibility rules.
- [`docs/gameplay/energy-catch-mvp.md`](docs/gameplay/energy-catch-mvp.md) — current game behavior and keyboard controls.
- [`docs/design/visual-production-roadmap.md`](docs/design/visual-production-roadmap.md) — current concept, integration and production status.
- [`docs/design/screen-flow-and-round-map.md`](docs/design/screen-flow-and-round-map.md) — screen hierarchy and round availability labels.
- [`docs/design/asset-coverage-and-handoff.md`](docs/design/asset-coverage-and-handoff.md) — asset-family inventory and future handoff contract.
- [`assets_manifest.json`](assets_manifest.json) — exact asset paths, dimensions, anchors and review status.
- [`docs/art/animation-production-report.md`](docs/art/animation-production-report.md) and [`docs/art/phaser-animation-integration.md`](docs/art/phaser-animation-integration.md) — existing rig/runtime evidence and integration contract.
- [`assets/concepts/robots/`](assets/concepts/robots/) — static concept references; not runtime sheets.
