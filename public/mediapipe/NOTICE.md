MediaPipe Vision Models

## Hand Landmarker
- Model: hand_landmarker.task (float16, version 1)
- Source: https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task
- Model card: https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Hand%20Tracking%20%28Lite_Full%29%20with%20Fairness%20Oct%202021.pdf
- License: Apache License 2.0
- Size: 9,067,613 bytes
- SHA-256: FBC2A30080C3C557093B5DDFC334698132EB341044CCEE322CCF8BCF3607CDE1

## Pose Landmarker Lite
- Model: pose_landmarker_lite.task (float16, latest)
- Source: https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task
- Model card: https://developers.google.com/mediapipe/solutions/vision/pose_landmarker
- License: Apache License 2.0
- Size: 5,777,746 bytes
- SHA-256: 59929E1D1EE95287735DDD833B19CF4AC46D29BC7AFDDBBF6753C459690D574A

The MediaPipe Tasks Vision JavaScript package is pinned in package.json. Its WASM runtime and task models are loaded locally or on demand from versioned paths; camera frames are processed on-device and are never uploaded or included in network requests by this app.
