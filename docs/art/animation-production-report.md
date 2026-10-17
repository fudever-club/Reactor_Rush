# Reactor Rush P0 — animation production report

**Status:** Draft for integration review  
**Date:** 2026-10-17  
**Technique:** Editable SVG cutout parts, transparent PNG exports, Phaser Tween keyframes

## Delivered

- P1 Cyan: 22 separated PNG parts and an editable SVG source.
- P2 Pink: 23 separated PNG parts and an editable SVG source.
- Both use a 320 × 360 rig canvas, anchor `(0.5, 0.975)`, and shared ground baseline `351`.
- Each character defines Idle, Move, Catch, and Activate. Win and Confused are not produced yet.
- `assets_manifest.json` describes references, editable source groups, exports, pivots, animation data, and the Phaser test scene. The approved pose board is explicitly marked as reference art, not a production sprite sheet.
- The scene offers character and state controls, keyboard shortcuts, status/progress, and a short host-browser rAF sample.

The art parts are project-authored vector redraws based on the approved Direction A model sheet and six-pose references. They preserve the chosen designs; they are not extracted production frames from the pose board.

## Phaser runtime evidence

Tested in the local Phaser 4.2.1 scene using the WebGL renderer:

| Character | Idle | Move | Catch | Activate |
| --- | --- | --- | --- | --- |
| P1 Cyan | Loop observed | Loop observed | Completed and returned to Idle | Completed and returned to Idle |
| P2 Pink | Loop observed | Loop observed | Completed and returned to Idle | Completed and returned to Idle |

After aligning P1's feet to the shared baseline, I reloaded the scene and reran P1 Catch; the completion status reported Catch complete and returned to Idle. P2 uses the same runtime and was exercised after the P1 pipeline. These are actual local browser runs, not only animation JSON checks. Use `I`, `M`, `C`, and `A`, or the buttons, to replay states.

The optimized Vite production preview was also opened in Edge: P1 and P2 both loaded all rig textures, showed Idle, and completed Catch back to Idle. The runtime reports the renderer from Phaser's renderer type so the label remains accurate after minification.

## Export and validation

- `npm run assets:export`: 45 transparent PNG parts and 8 animation definitions.
- `npm test`: 8 checks passed. They cover both rig contracts, unique parts, shared proportions and baseline, animation keyframe order/loop behavior, transparent alpha, source-to-crop bounds, crop-edge clipping, manifest size/dimensions, face-layer state usage, and synchronized public manifest.
- `npm run build`: passed with TypeScript checking and Vite production bundling. The manifest and statically referenced PNGs are included for production preview.
- P1 PNG parts total 62,375 bytes; P2 totals 66,189 bytes; combined **128,564 bytes (~125.6 KiB)**. Individual part PNGs range from 724 to 11,003 bytes across both characters.
- Vite's Phaser app bundle is 1,527,218 bytes minified and 453.79 kB gzip. Vite reports that the chunk exceeds its 500 kB minified warning threshold; this build is functional, but bundle splitting/size work remains available.
- PNGs retain alpha; every part's visible source pixels stay inside its crop with a transparent safety border. Pivots fall within their part bounds. Both idle rigs visually meet baseline `y=351` in the test scene.

## Performance limitation

The test page's independent 2-second `requestAnimationFrame` sample reported 3 FPS in the in-app browser and 4 FPS in the Edge automation session. Those automation-host readings are inconsistent with a trustworthy target-device benchmark and may be throttled. **No target-device performance pass is claimed.** The Phaser renderer initialized as WebGL and animation states completed, but frame-time/memory benchmarks on the game's target hardware remain outstanding.

## Review limits and next work

This is a functional P0 integration draft, not final polished game art. Review joint seams, silhouette readability, and timing at the actual gameplay scale. Current rigs are front-facing; new side/back angles need separate art. Continue the same cutout pipeline for polish, then add Win and Confused after the four gameplay states are accepted. Consider frame-by-frame or hybrid redraw only where cutout deformation visibly breaks the silhouette.
