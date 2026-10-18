# Reactor Rush — Camera Input Integration

**Status:** CV-01 Booth-Ready MediaPipe Integration; keyboard remains the default input.

## User flow

1. Start the app from `http://127.0.0.1:5173` or another HTTPS origin. Camera APIs are not available from ordinary insecure network origins.
2. Choose **Set up webcam controls**. The game does not ask for camera permission on page load.
3. Select game mode: **1 PLAYER (SOLO)** or **2 PLAYERS (CO-OP)**.
4. Read and check the camera/MediaPipe privacy notice, then select **Enable Camera & Load Model**. The browser asks for video access only; microphone access is not requested.
5. In 1-player mode, hold one hand near the center. In 2-player mode, stand side by side: P1 Cyan on the left, P2 Pink on the right. Place hands near the center of each half and click **Calibrate**.
6. Move the hand left/right to move that player's robot. Pinch thumb and index finger to hold Catch. Hands crossing into the other player's half safely neutralize that player's input with an explicit warning rather than silently swapping player control.
7. Stop camera input from the active HUD or results screen to resume keyboard controls. Unchecking the in-app consent before starting also stops the stream and worker. Camera denial or model failure leaves keyboard available.

## Runtime architecture

- `src/adapters/hand-input-mapper.ts` converts normalized 21-landmark hand points into the existing `InputFrame`. It accounts for the mirrored preview, enforces calibrated player territories, applies a 0.08 minimum hand separation guard, center-deadband guard, movement deadzone/hysteresis, and a palm-relative pinch ratio. Crucially, temporal tracking against `lastKnownX` prevents silent reassignment when hands cross boundaries, neutralizing input safely and reporting ambiguity reasons.
- `src/adapters/mediapipe-hand-input-adapter.ts` owns camera start/stop, the stream, worker lifecycle, calibration, metrics tracking (`delegate`, `inferenceMs`, `fps`, `ambiguityReason`), and latest cached input. `read()` never runs model inference.
- `src/workers/hand-landmarker.worker.ts` initializes the pinned MediaPipe Hand Landmarker with WebGL `GPU` delegate (with shader pre-warmup) and falls back to `CPU` if WebGL is unavailable. Measures per-frame inference duration (`inferenceMs`) and returns landmarks and active delegate to the main thread.
- The model bundle is `public/mediapipe/hand_landmarker.task`, sourced from the official version-1 float16 model. See [model notice](../../public/mediapipe/NOTICE.md) for URL and SHA-256.
- `@mediapipe/tasks-vision` WASM binaries and loaders (`vision_wasm_internal.*`, `vision_wasm_module_internal.*`, `vision_wasm_nosimd_internal.*`) are served locally from `public/mediapipe/wasm/` (`/mediapipe/wasm`), completely removing external CDN dependencies for 100% offline booth readiness.

## Privacy and permissions

Camera frames are processed entirely on-device inside the browser worker and are never uploaded, stored, or recorded. Because WASM binaries and model weights are served locally from the app root, camera controls function in airplane mode with zero external network connectivity. Google's [MediaPipe Tasks privacy notice](https://developers.google.com/edge/mediapipe/solutions/tasks#mediapipe_tasks_privacy_notice) is presented in the consent check prior to camera activation. Keyboard mode never touches camera APIs or workers.

## Local development

```powershell
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. Use **Set up webcam controls**, choose Solo or Co-op, accept the notice, enable the camera, wait for the local model to load, calibrate, and start.

## Verification, evidence classification, and boundaries

- **Automated Verification:** 51 unit tests (`node --test tests/*.test.mjs`) pass deterministically, covering boundary crossing rejection, ambiguity neutralization, calibration recovery, local WASM serving configuration, GPU delegate reporting, latency/FPS smoothing, missing/stale tracking, and resource cleanup.
- **Automated Build Verification:** `npm run build` (`tsc --noEmit && vite build`) compiles with zero TypeScript errors and builds all WASM assets into `dist/mediapipe/wasm/`.
- **Browser Simulation:** Chromium DevTools MCP inspection confirms clean DOM transitions, 0 console errors/warnings, and operational Solo/Co-op modes.
- **Physical Hardware Tests (Dell Vostro 15 5510):** Physical tests with a real webcam and live participants are detailed in [cv-01-physical-benchmark-procedure.md](./cv-01-physical-benchmark-procedure.md) and are classified as `NOT RUN` pending on-site execution on the target booth laptop.
- No OSNet, cloud inference, face recognition, or Pose Landmarker is included.

