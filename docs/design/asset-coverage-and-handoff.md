# Asset Coverage and Handoff

**Status:** Current presentation assets added 22 October 2026; the retained WP-01 inventory below is historical.

**Inventory authority:** [`assets_manifest.json`](../../assets_manifest.json).  
**Runtime handoff:** [`Phaser animation integration`](../art/phaser-animation-integration.md) and [`animation production report`](../art/animation-production-report.md).

## Status vocabulary

- **Reference / concept:** visual exploration, not an editable production master or runtime asset.
- **Draft / In review:** manifest status is still under review; do not silently promote it to approved production art.
- **Exported part:** a file exists at the manifest path. This alone does not prove it is integrated or accepted.
- **Runtime-integrated:** a local runtime path uses the asset, with evidence recorded in the integration report. This remains a separate status from final art approval.
- **Planned / missing:** not present as a verified production export; a plan is not evidence of delivery.

## Current additions — 22 October 2026

The manifest now has **64 records** (3 Draft, 61 In review). The original 58 records are unchanged; root and public manifests remain synchronized. New local presentation files are:

| Family | Source / runtime export | Status and evidence |
|---|---|---|
| Reactor Rush game symbol | assets/brand/reactor-rush-symbol.svg | Original editable vector, also used as game favicon; distinct from the club logo. |
| Round apparatus diagrams | assets/ui/round-energy.svg; round-circuit.svg; round-cooling.svg | Original editable SVGs representing actual collect/connect/cool tasks; 3,453 bytes together with the symbol. |
| Official FU-DEVER dark-context logo | assets/brand/source/fu-dever-dark-original.png → assets/brand/fu-dever-dark.png | User-supplied source retained byte-for-byte; transparent-only trim, proportional fit and padding; original shape/colors preserved. |
| Buggy celebration | assets/mascot/source/buggy-celebrate-original.png → assets/mascot/buggy-celebrate.png | User-supplied sticker 9; final campaign-complete screen only; original white outline preserved. |

All six exports are In review. Actual dimensions, source/export hashes and measured bytes belong in the manifest and [upgrade report](../reports/arcade-upgrade-2026-10-22.md). The two runtime PNGs total 267,640 bytes; originals are source masters and are not imported into the live asset graph. No rig, silhouette or animation was changed. Automated metadata/alpha checks, visual inspection and runtime evidence remain separate from human final-art acceptance.

## Historical WP-01 asset coverage

The manifest has **58 asset records**: 3 marked `Draft` and 55 marked `In review`. At the WP-01 baseline, all 58 manifest export paths resolved to local files. This inventory records that evidence; it does not re-run image, runtime, or visual QA.

| Family | Local source / output paths | Current evidence and status |
|---|---|---|
| Robot concept references | `assets/concepts/robots/direction-a-orbital-buddy.png`; `assets/concepts/robots/direction-a-refined-model-sheet.png`; `assets/concepts/robots/direction-a-action-pose-references.png`; comparison references `direction-b-vector-sprinters.png` and `direction-c-instrument-critters.png` in the same folder | Opaque 1536 × 1024 reference sheets recorded in the manifest. The pose board shows six static pose studies per character; it is not a sprite sheet or runtime animation. Direction A is selected, while production artwork remains unapproved. |
| P1 Cyan rig and parts | `assets/characters/p1-cyan/source/rig.svg`; `assets/characters/p1-cyan/rig.json`; `assets/characters/p1-cyan/animations.json`; `assets/characters/p1-cyan/parts/*.png` | 22 part PNGs and four animation definitions (Idle, Move, Catch, Activate). Manifest status is `In review`; the production report records Phaser runtime observations. Keep the existing Direction A silhouette and rig. |
| P2 Pink rig and parts | `assets/characters/p2-pink/source/rig.svg`; `assets/characters/p2-pink/rig.json`; `assets/characters/p2-pink/animations.json`; `assets/characters/p2-pink/parts/*.png` | 23 part PNGs and four animation definitions (Idle, Move, Catch, Activate). Manifest status is `In review`; the production report records Phaser runtime observations. Keep the existing Direction A silhouette and rig. |
| Shared rig contract | `assets/characters/p1-cyan/rig.json`; `assets/characters/p2-pink/rig.json`; `src/rig.ts` | Both authoring canvases are 320 × 360, with normalized anchor `(0.5, 0.975)` and ground baseline `y = 351`, as recorded by the integration guide. Do not change these values as part of a documentation handoff. |
| Runtime/demo references | `src/main.ts`; `src/animation-test.ts`; `index.html`; `animation-test.html` | The gameplay MVP and animation report identify the local runtime/demo entrypoints. Energy and hazard objects are currently drawn with Phaser shapes; they are functional placeholders rather than final exported item art. |
| HUD concept page | `docs/design/energy-catch-hud-stitch.html` | Existing local HTML concept referenced by the roadmap. It is a design preview, not the Phaser HUD or an approved production export; the local file references Google Fonts and Tailwind through external URLs. A01 could not re-open Stitch to verify the source project. |
| Manifest copies | `assets_manifest.json`; `public/assets_manifest.json` | Both files were present with matching baseline SHA-256. They are read-only inputs in this work package; no manifest record is changed. |

The `assets_manifest.json` record is the per-file authority for IDs, exact dimensions, alpha flag, anchor, state names, source URI, export URI, and review status. Use the relevant `RR-P1-CYAN-*` and `RR-P2-PINK-*` rows for individual parts; do not duplicate the full manifest table here.

## Known gaps and concept boundaries

- **Menu and results art:** local roadmap records corrected Start / Attract and Round Complete concepts in Stitch, but A01 could not reopen the project. The concepts are not integrated into Phaser; result values are sample data and celebration art is a storyboard according to the roadmap.
- **Environment:** no dedicated production lab-background or environment-prop export is verified in the manifest. Existing in-game treatment remains the current implementation state.
- **Gameplay items:** energy and hazard shapes are functional Phaser placeholders, not final art exports.
- **Win and Confused:** static reference poses exist, but no runtime animation is recorded as produced.
- **Later rounds at WP-01:** Duo Circuit and Cool the Core were conditional proposals. The 21 October [campaign specification](../gameplay/three-round-campaign.md) now defines and implements them; Final Boss remains a future placeholder. Historical concept status is not current availability.
- **Readability and performance:** TV contrast/legibility and target-laptop performance remain unverified. The animation report notes that its automated-browser FPS samples are not a target-device benchmark.
- **Ownership/licensing:** manifest entries ask the team to confirm individual ownership/release terms before public distribution; WP-01 does not adjudicate rights.

## Source-to-runtime handoff

1. Start from the approved Direction A reference and preserve the existing P1/P2 model, proportions, and silhouettes. A reference image is not the editable master.
2. Keep an editable vector/source file beside its rig definition. Name parts and state-specific layers consistently with the rig and animation JSON.
3. Export transparent PNG parts through the existing asset pipeline. Record exact output paths, dimensions, alpha, crop/bounds, pivots, source revision, and state usage in the manifest only when a separately approved asset task authorizes those changes.
4. Review crop bounds, clipping, alpha edges, part pivots, shared baseline, character consistency, and display scale. Distinguish file-level checks from visual review and runtime evidence.
5. Integrate via the existing Phaser `CutoutRig` / `preloadRig` contract in [`phaser-animation-integration.md`](../art/phaser-animation-integration.md). Record the exact scene and states actually exercised; do not infer integration from JSON presence.
6. Keep exported concepts and runtime-accepted assets labeled separately. A static Stitch screen, pose board, or storyboard must never be described as a production-ready sprite sheet or Phaser feature.

## Handoff evidence checklist

For a future approved asset batch, return:

- Source file and revision, owner/licensing status, and manifest IDs.
- Export paths and measured dimensions/file sizes; alpha, crop, and clipping results.
- Rig canvas, pivots/anchors, ground baseline, and any nonstandard attachment points.
- Animation names, keyframe references, loop/one-shot behavior, and runtime scene used.
- Screen-scale visual review and any unverified target hardware/readability claims.
- Automated checks, self-review, and any distinct independent evaluation as separate evidence classes.

The historical WP-01 document authorized documentation only. The user separately authorized the 22 October local asset upgrade and supplied the official sources; its scope/evidence are recorded above and in the upgrade specification/report.
