---
name: reactor-rush-asset-qa
description: Use when checking Reactor Rush art sources, exported assets, manifest records, rig contracts, or Phaser integration evidence.
---

# Reactor Rush asset quality assurance

## Trigger and evidence inputs

Use for art/export handoffs, asset audits, manifest updates in an approved asset task, or review of rig and animation integration. Read [assets_manifest.json](../../../assets_manifest.json), [asset coverage and handoff](../../../docs/design/asset-coverage-and-handoff.md), [animation production report](../../../docs/art/animation-production-report.md), and [Phaser animation integration guide](../../../docs/art/phaser-animation-integration.md). Inspect the relevant source, rig/animation definitions, actual export files, and runtime scene when the task authorizes that level of verification.

## Checks

For every claimed asset, record manifest ID, source/revision, export path, dimensions, byte size, status, and whether the path exists. For transparent images, inspect alpha presence and bounds; check cropping, clipping of antennae/feet/hands, stray transparent margins, and visual edge quality. Compare proportions, silhouette, palette/status, shared canvas, anchor and ground baseline across P1 Cyan and P2 Pink against the existing approved Direction A references and rig contract. Read pivots and attachment points from the actual rig/manifest rather than inferring them from a concept board.

When relevant, verify animation frame/state names, references and definitions against the animation JSON. Runtime integration requires observing the named state in the actual Phaser scene or citing an execution record with scene/state details. File existence, SVG content, manifest rows, or a passing metadata script alone cannot prove animation playback.

Use the current source-of-truth values recorded by each rig and the integration guide. The known shared contract is a 320 × 360 canvas, normalized root anchor `(0.5, 0.975)`, and ground baseline `y = 351`; confirm against current files before reporting it. Do not silently change rig data during QA.

## Status vocabulary

- **Reference / concept:** visual guidance, not a production export or runtime asset.
- **Draft / In review:** retain the exact manifest status; not final art approval.
- **Export present:** file exists at the recorded path; integration is unproven.
- **Runtime observed:** named asset/state was actually exercised in the named Phaser scene, with evidence.
- **Accepted production asset:** only when the authorized acceptance process and status record say so.
- **Missing / unverified / blocked:** state exactly which file, evidence, or access is absent.

Never call a pose reference, screenshot, storyboard, or Stitch concept a production-ready sprite sheet. Never promote `Draft` or `In review` to approved status by wording. Separate automated file/metadata verification, visual self-review, runtime evidence, and any distinct independent evaluation. A script pass is not independent evaluation.

## Handoff report

List each asset family and exact paths, checks run and outputs, failures/limitations, status, and required follow-up. Include alpha/crop/clipping, consistency, canvas/pivot/anchor/baseline, file size, and runtime checks only when actually performed. Label target-device performance, display-scale readability, licensing, and visual acceptance unverified unless evidenced. Stay inside the approved file scope; do not modify art or manifest as part of a read-only review.
