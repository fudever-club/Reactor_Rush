# Reactor Rush — Camera Input Integration

**Status:** Optional integration beta; keyboard remains the default input.

## User flow

1. Start the app from `http://127.0.0.1` or another HTTPS origin. Camera APIs are not available from ordinary insecure network origins.
2. Choose **Set up webcam controls**. The game does not ask for camera permission on page load.
3. Read and check the camera/MediaPipe notice, then select **Enable Camera & Load Model**. The browser asks for video access only; microphone access is not requested.
4. Stand side by side in front of the camera. Keep one hand in each half of the mirrored preview: P1 Cyan on the left, P2 Pink on the right. Place each hand near the middle of its half and calibrate.
5. Move the hand left/right to move that player's robot. Pinch thumb and index finger to hold Catch. Keep hands in their own half so player assignment stays stable.
6. Stop camera input from the active HUD or results screen to resume keyboard controls. Unchecking the in-app consent before starting also stops the stream and worker. Camera denial or model failure leaves keyboard available.

## Runtime architecture

- `src/adapters/hand-input-mapper.ts` converts normalized 21-landmark hand points into the existing `InputFrame`. It accounts for the mirrored preview, requires a left/right hand pair for calibration, applies movement dead-zone/hysteresis, uses a palm-relative pinch ratio with enter/release thresholds, and returns neutral input when tracking disappears or becomes stale.
- `src/adapters/mediapipe-hand-input-adapter.ts` owns explicit camera start/stop, the stream, the worker lifecycle, calibration, and latest cached input. `read()` never runs model inference.
- `src/workers/hand-landmarker.worker.ts` runs the pinned MediaPipe Hand Landmarker with the CPU delegate and at most two hands. The main thread samples a new video frame no more often than every 85 ms and skips frames while the worker is busy. It transfers `ImageBitmap` objects to the worker and closes each after processing. Only normalized landmark coordinates return to the game; frame pixels are not sent to a server or stored.
- The model bundle is `public/mediapipe/hand_landmarker.task`, sourced from the official version-1 float16 model. Its model card lists Apache-2.0. See [model notice](../../public/mediapipe/NOTICE.md) for URL and SHA-256.
- `@mediapipe/tasks-vision` is pinned to `1.1.1`. Its matching WASM files are loaded lazily from the version-pinned jsDelivr path only after the player enables camera controls. Camera mode therefore needs network access for its first WASM load; the model file itself is served locally with the app.

## Privacy and permissions

Camera frames are processed in the browser and are not uploaded or recorded by Reactor Rush. The model and WASM downloads are separate application asset requests. Google's [MediaPipe Tasks privacy notice](https://developers.google.com/edge/mediapipe/solutions/tasks#mediapipe_tasks_privacy_notice) says the SDK may send usage/performance metrics to Google and places informed-consent responsibility on the app. The camera setup presents that notice before enabling the camera. Keyboard mode does not initialize MediaPipe or request camera access.

## Local development

```powershell
npm install
npm run dev
```

Open the Vite localhost URL. Use **Set up webcam controls**, accept the in-app notice, grant video permission in the browser, wait for the model, then calibrate. If the browser blocks camera access, confirm the page uses localhost or HTTPS; keyboard mode is still playable.

## Current verification and limits

- Unit tests cover side calibration, mirrored independent movement, dead-zone behavior, pinch hysteresis, missing/stale tracking, explicit camera startup, permission failure, cancellation while permission is pending, and stream/worker cleanup.
- `npm run build` bundles the hand-landmarker worker separately from the game entrypoint. The model and worker are only requested after the camera option is chosen.
- Automated tests use a fake camera and worker. No physical webcam has been opened by the implementation run, so live hand-detection accuracy, two-player assignment, permission behavior in Edge, inference latency, and sustained Dell Vostro FPS remain unverified.
- Mapping thresholds are initial values, not playtest-tuned settings. Hands should stay in separate camera halves. Crossing/occlusion can switch side assignment; lost tracking safely neutralizes that player's controls and releases Catch.
- The model card notes that gloves and occlusions can reduce accuracy. This is an entertainment input path, not identity recognition or surveillance.
- No OSNet, webcam recording, cloud inference, versus mode, or additional game mode is included.
