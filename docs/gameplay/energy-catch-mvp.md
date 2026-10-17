# Energy Catch — Playable MVP

## Current implementation

Energy Catch is the default local app at `/`. The previous cutout rig preview remains at `/animation-test.html`. Both pages load the same P1 Cyan and P2 Pink rig definitions and the existing Idle, Move, and Catch animations. Character artwork and animation keyframes are not regenerated or modified.

The round is a 60-second cooperative session. The playfield is split into one lane per player. Falling cyan energy is worth 100 points; each fifth consecutive energy catch raises the multiplier by 0.5×, capped at 3×. A red hazard caught by the player subtracts 50 points (score cannot go below zero) and clears that player's active combo. Missing an item has no score penalty. Each player's score, active combo, and best combo are tracked separately.

| Player | Move | Catch |
|---|---|---|
| P1 Cyan | A / D | Hold S as an item reaches the robot |
| P2 Pink | ← / → | Hold ↓ as an item reaches the robot |

Enter starts from the menu. At the end of the round, R or Enter resets both scorecards and starts a new round after a short ready beat.

Webcam motion input is an optional beta path. Keyboard remains the default and fallback. See [Camera Input Integration](camera-input-integration.md) for opt-in, calibration, mapping, runtime assets, privacy details, and current verification limits. Scoring, catch windows, timer, and restart rules remain unchanged.

## Architecture

- `src/gameplay/core.ts` contains Phaser independent types and deterministic scoring, timer, phase, restart, and keyboard mapping logic.
- `src/adapters/keyboard-input-adapter.ts` tracks window `keydown`/`keyup` state and translates it to the `InputAdapter` frame contract. It clears held keys when the window loses focus and removes its listeners when the scene shuts down. A future MediaPipe adapter can implement the same contract without changing scoring or scene rules.
- `src/main.ts` owns the 1280 × 720 Phaser scene, two existing `CutoutRig` instances, item spawning, catch windows, HUD, and phase overlays.
- `src/animation-test.ts` preserves the existing animation production preview.
- Energy and hazard items are drawn from basic Phaser shapes; no gameplay dependency or particle system is added.

## Run and verify

From the repository root:

```powershell
npm install
npm run dev
```

Open the Vite URL printed in the terminal (normally `http://127.0.0.1:5173/`). To inspect the character animation rig, open `/animation-test.html` on that same host.

```powershell
npm test
npm run build
```

The gameplay unit tests cover combo scoring, hazard penalties, timer and result transition, restart reset, and independent keyboard mapping. Existing production asset tests continue to check both rigs' dimensions, PNG alpha/crops, manifest records, and animation definitions.

## Known limits

- Keyboard co-op is implemented and remains available. Optional MediaPipe camera input is an integration beta; real camera interaction and Dell Vostro performance have not been verified in this report.
- No benchmark has been run on the Dell Vostro 15 5510. Existing production build output has a Phaser JavaScript chunk over Vite's 500 kB warning threshold; runtime frame rate on the target laptop remains unverified.
- The lane split and scoring values are first-pass balancing choices. No external playtest data is available yet.
- The project directory has no Git metadata, so change review and revert currently rely on local files rather than a Git diff.
