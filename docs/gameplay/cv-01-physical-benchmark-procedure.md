# Reactor Rush CV-01 — Physical Benchmark Procedure & Evidence Template

**Document Status:** Approved Procedure & Verification Template  
**Target Hardware:** Dell Vostro 15 5510 (Intel Core i5-11320H / Intel Iris Xe Graphics, 16 GB RAM, Windows 11)  
**Target Display:** 1080p 60Hz  
**Camera:** Integrated 720p HD Webcam / USB external 1080p webcam  
**Execution Status:** `NOT RUN` (Physical hardware, live webcam, and dual-player booth participants require on-site testing on physical target laptop).

---

## 1. Test Objectives

1. Verify real-world MediaPipe Hand Landmarker inference latency with GPU delegate (WebGL) on Intel Iris Xe.
2. Confirm sustained 60 FPS Phaser canvas rendering during active webcam background worker inference.
3. Evaluate stable hand association and player identity retention during normal co-op gameplay (P1 Cyan left, P2 Pink right).
4. Verify physical boundary crossing behavior: crossing hands into opponent half must neutralize controls and display clear ambiguity cues rather than silently swapping player control.
5. Verify 1-player (Solo) mode performance and hand tracking responsiveness.
6. Verify total offline booth readiness: disconnect Wi-Fi/Ethernet, launch from `http://127.0.0.1:5173`, verify camera starts and loads model and WASM with zero network access.

---

## 2. Test Environment Setup Checklist

- [ ] Target machine: Dell Vostro 15 5510 plugged into AC power (Best Performance power mode).
- [ ] Network: Fully disconnected (Airplane Mode ON) to test offline booth readiness.
- [ ] Browser: Google Chrome (Version 120+) or Microsoft Edge (Version 120+) launched with hardware acceleration enabled.
- [ ] Lighting: Standard indoor booth ambient lighting (~300–500 lux). Avoid direct backlighting behind players.
- [ ] Camera Placement: Webcam centered at eye/chest level, tilted slightly down towards the play area (~1.2m to 1.8m distance from players).
- [ ] Participants: Two players standing side by side. P1 on camera left, P2 on camera right.

---

## 3. Physical Test Procedures

### Test Case PB-01: Offline Cold-Start & Local WASM Verification
- **Steps:**
  1. Turn off Wi-Fi and unplug Ethernet.
  2. Start the local server: `npm run preview` or `npm run dev`.
  3. Navigate to `http://127.0.0.1:5173/` in a fresh incognito browser window.
  4. Click **Set up webcam controls**.
  5. Check consent and click **Enable Camera & Load Model**.
- **Expected Result:**
  - Camera connects, local `/mediapipe/wasm/` assets load without 404 or network timeout.
  - `#camera-status` displays `Camera ready (GPU active)`.
- **Field Evidence:**
  - Execution Status: `NOT RUN`
  - Observed Delegate: `[ GPU | CPU ]`
  - Model Load Time: `_____ ms`
  - Offline Pass: `[ YES | NO ]`

---

### Test Case PB-02: GPU Delegate Inference Latency & FPS
- **Steps:**
  1. Position both hands in camera view (P1 left, P2 right).
  2. Observe the latency and FPS metrics displayed on `#camera-hands-status`.
  3. Monitor Chrome DevTools Performance monitor (CPU usage, JS heap, DOM nodes, FPS).
- **Expected Result:**
  - GPU delegate active.
  - Per-frame worker inference latency: `≤ 45 ms` (ideal `< 35 ms`).
  - Web worker sampling interval: `~85 ms` (11–12 inference FPS).
  - Main game rendering: steady `60 FPS` without stuttering or input lag.
- **Field Evidence:**
  - Execution Status: `NOT RUN`
  - Average Inference Latency: `_____ ms`
  - Worker Inference FPS: `_____ FPS`
  - Game Render FPS: `_____ FPS`
  - Sustained Stability: `[ PASS | FAIL ]`

---

### Test Case PB-03: Two-Player Hand Calibration & Neutral Hold
- **Steps:**
  1. In 2-Player Co-op mode, hold one hand in P1 half and one hand in P2 half.
  2. Click **Calibrate Both Hands**.
  3. Click **Start with Camera**.
  4. Hold hands at neutral positions without moving for 10 seconds.
- **Expected Result:**
  - Both robots remain stationary at `moveAxis = 0`.
  - No jittering or unintended drifting.
- **Field Evidence:**
  - Execution Status: `NOT RUN`
  - Robot Drift Observed: `[ NONE | MINIMAL | HIGH ]`
  - Pass: `[ YES | NO ]`

---

### Test Case PB-04: Boundary Crossing & Ambiguity Neutralization
- **Steps:**
  1. Start a round with camera controls.
  2. Player 2 moves hand across center line into Player 1's camera half.
  3. Simultaneously Player 1 drops hand below camera view.
  4. Observe whether P2's hand takes control of P1's robot.
  5. Observe HUD and status warning messages.
- **Expected Result:**
  - P1's robot MUST NOT be controlled by P2's crossed hand.
  - P1 controls neutralize (`moveAxis = 0, catch = false`).
  - Warning displayed: `HANDS CROSSED · RETURN TO YOUR HALF`.
  - Once P2 returns to P2 half and P1 returns to P1 half, normal control resumes.
- **Field Evidence:**
  - Execution Status: `NOT RUN`
  - Silent Reassignment Observed: `[ NO (PASS) | YES (FAIL) ]`
  - Neutralization Verified: `[ YES | NO ]`
  - Recovery Smoothness: `[ SMOOTH | JITTERY | FAILED ]`

---

### Test Case PB-05: 1-Player (Solo) Mode Full Round Verification
- **Steps:**
  1. Select `1 PLAYER (SOLO)` mode.
  2. Calibrate single hand in center.
  3. Play full 60-second round moving left/right and pinching to catch.
- **Expected Result:**
  - P1 robot responds smoothly to hand movement.
  - Pinch triggers Catch animation and catches energy.
  - Full 60s round completes to summary screen without crash or memory leak.
- **Field Evidence:**
  - Execution Status: `NOT RUN`
  - Final Score: `_____`
  - Best Combo: `_____`
  - Dropped Frames: `_____`
  - Pass: `[ YES | NO ]`

---

## 4. Evidence Reporting Summary Table

| Test Case | Description | Automated Unit Test | Browser Sim Test | Physical Dell Test | Status |
|---|---|---|---|---|---|
| **PB-01** | Offline local WASM loading | `PASS` (HTTP 200 via Vite) | `PASS` (Chromium headless) | Target Hardware | `NOT RUN` |
| **PB-02** | GPU delegate latency & FPS | `PASS` (mock worker / metrics) | `PASS` (DevTools console 0 errors) | Target Hardware | `NOT RUN` |
| **PB-03** | Two-player neutral hold | `PASS` (mapper deadzone tests) | `PASS` (UI state verified) | Target Hardware | `NOT RUN` |
| **PB-04** | Boundary crossing neutralization | `PASS` (red-green unit test) | `PASS` (mapper boundary logic) | Target Hardware | `NOT RUN` |
| **PB-05** | Solo mode 60s gameplay | `PASS` (solo mapper test) | `PASS` (solo UI toggle verified) | Target Hardware | `NOT RUN` |
