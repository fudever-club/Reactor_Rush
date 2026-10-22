# Screen Flow and Round Map

**Status:** Local three-round campaign implementation, 21 October 2026. Field/TV/final-art acceptance is separate.
**Canvas:** 1280 × 720 (16:9).
**Gameplay authority:** [Three-round campaign](../gameplay/three-round-campaign.md); [Energy Catch rules](../gameplay/energy-catch-mvp.md).
**Verification:** [Current report](../reports/three-round-campaign-2026-10-21.md).

## Current local flow

~~~text
MENU — choose Solo / Co-op and keyboard / opt-in camera
  → ENERGY CATCH INTRO → Start Round → READY → PLAY
  → ROUND 1 RESULTS → Next Round
  → DUO CIRCUIT INTRO → Start Round → READY → PLAY
  → ROUND 2 RESULTS → Next Round
  → COOL THE CORE INTRO → Start Round → READY → PLAY
  → MISSION COMPLETE — three-row breakdown, totals, best combo, final heat
  → Play Again / R / Enter → ENERGY CATCH INTRO (fresh campaign)
~~~

Every round uses a deliberate start and runs for its specified duration. Intro/results do not award points. Snapshots survive advancing to the next round; final totals count each completed round once. Next and replay are distinct actions. A held action must be released before activation in a new round, and before another circuit socket.

| Surface | Main content/action |
|---|---|
| Menu | Three-round route, Solo/Co-op choice, controls, Start Mission and camera setup. |
| Camera setup | Existing consent, scheme, preview, calibration, readiness and keyboard fallback. Starts only after explicit opt-in; no camera recording. |
| Round intro | Round number/name, objective, three steps and input-specific controls; Start Round/Enter. |
| Ready | Short preparation beat; repeat actions cannot restart it. |
| Gameplay | Scores/timer/round indicator; Energy Catch items, circuit sockets/progress or cooling valves/heat/overload state. |
| Results 1/2 | Current-round stats; Next Round preserves accumulated history. |
| Mission complete | Each completed round, active-player totals, team total, maximum best combo and final core heat; Play Again resets the complete campaign. |

Camera mode/calibration is retained across transitions while valid and opted in; STOP CAMERA returns to keyboard and releases resources. Existing freshness/identity guards remain active. Solo hides inactive P2 UI and excludes P2 from totals. Co-op uses two independent boards/cores and a shared team score.

## Availability

| Round | Current local status |
|---|---|
| Energy Catch | Implemented, original scoring/timer rules retained. |
| Duo Circuit | Implemented from the newly confirmed three-round brief; initial balancing values are in the gameplay spec. |
| Cool the Core | Implemented from the same brief; heat feedback is distinct from points. |
| Final Boss | Future placeholder; no runtime encounter or commitment. |

## Visual and evidence boundary

Preserve Direction A robots and rig definitions, navy lab, safe margins, text/shape alongside color, system typography and reduced motion. New circuit/cooling worlds are runtime vector presentation, not exported Stitch assets or final approved production art. Scores and instructions are live text.

The older WP-01 Stitch audit was blocked on 17 October 2026. Its 1280×1024 preview versus 1280×720 content-label discrepancy remains historical/unresolved; this task did not edit, export or verify Stitch. The older concepts are not evidence that these new runtime screens were externally approved. Automated keyboard and synthetic-camera verification cannot certify physical three-round tracking or TV legibility.

## Settings and session controls — 22 October 2026

The persistent toolbar provides SETTINGS, FULLSCREEN and SOUND OFF/ON. Settings is also usable in a narrow window while the existing mission-start size guard is displayed. It temporarily replaces the camera setup modal; closing returns focus and restores that screen when appropriate. Native sliders support keyboard arrows, and Tab/Escape remain inside the active modal.

During ready/play: SETTINGS → frozen mission → RESUME → 900 ms gate → live play with fresh release required. Hidden-tab pause follows the same explicit resume flow and mutes sound. Settings contains Master/Music/Sound effects, Test SFX, volume defaults, Stop Camera, Restart Mission and Return to Menu. Unfinished-mission restart/menu actions require one inline confirmation; Cancel retains the paused state. Restart leads to round 1 intro; Menu stops resources and focuses Start Mission. Fullscreen failure is visible in text.

[Approved Settings spec](../superpowers/specs/2026-10-22-settings-controls-design.md) · [Verification report](../reports/settings-controls-2026-10-22.md).
