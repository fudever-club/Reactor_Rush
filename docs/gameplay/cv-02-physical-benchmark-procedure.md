# Reactor Rush CV-02 — Physical Benchmark Procedure & Comparative Evidence Protocol

**Document Status:** Approved Procedure & Verification Protocol  
**Target Hardware:** Dell Vostro 15 5510 (Intel Core i5-11320H / Intel Iris Xe Graphics, 16 GB RAM, Windows 11 Home)  
**Target Display:** Laptop screen (1280x720 / 1080p) and External HDMI TV (1920x1080 60Hz)  
**Camera:** Integrated 720p HD Webcam (30 FPS) / Optional External USB 1080p Webcam  
**Execution Status:** `NOT RUN` (Physical hardware, live dual-player participants, and real webcam tests must be performed on the physical target laptop in the booth environment).  
**Playbook Reference:** `CV02_AUTONOMOUS_PLAYBOOK.md` §6–§8  
**Test Matrix Reference:** `CV02_TEST_MATRIX.csv` (`PO-07..09`, `FT-01..10`, `PF-01..08`)

---

## 1. Objectives & Candidate Tracking Schemes

The goal of this benchmark is to rigorously compare three input tracking schemes under real booth conditions (1.5m to 3.0m distance, 2 simultaneous standing players, ambient hall lighting):

1. **`H0` — Hand Pinch Baseline:**
   - Tracking: MediaPipe Hand Landmarker (version 1 float16).
   - Movement: Mirrored wrist X position relative to calibrated center.
   - Catch: Pinch index finger and thumb tip ($d_{\text{pinch}} < 0.065 \cdot d_{\text{palm}}$).
   - Known limitation to evaluate: Small fingers lose visual resolution at 2.5m–3.0m distance.

2. **`P1` — Pose Candidate A (Both Arms Raised):**
   - Tracking: MediaPipe Pose Landmarker Lite (local float16).
   - Movement: Scale-invariant torso lean $\frac{\text{torsoX} - \text{neutralX}}{\text{shoulderWidth}}$ (enter $\pm 0.28$, release $\pm 0.16$).
   - Catch: **Both** wrists raised above shoulders ($y_{\text{wrist}} < y_{\text{shoulder}} - 0.05 \cdot h_{\text{torso}}$).
   - Design thesis: Highly distinct, zero accidental catches during movement, natural celebratory gesture.

3. **`P2` — Pose Candidate B (One Arm Raised):**
   - Tracking: MediaPipe Pose Landmarker Lite (local float16).
   - Movement: Identical scale-invariant torso lean.
   - Catch: **Either** wrist raised above shoulder ($y_{\text{wrist}} < y_{\text{shoulder}} - 0.05 \cdot h_{\text{torso}}$).
   - Design thesis: Lower physical exertion, single-arm friendly, but higher risk of false catches during lean sway.

---

## 2. Test Environment Setup Checklist

Before initiating physical trials:
- [ ] **Power:** Dell Vostro 15 5510 plugged into AC power; Windows Power Mode set to "Best performance".
- [ ] **Network:** Airplane Mode ON (Wi-Fi OFF, Ethernet unplugged) to verify 100% offline cold-start.
- [ ] **Server:** Local preview running via `npm run preview` on `http://127.0.0.1:4173` or `npm run dev` on `http://127.0.0.1:5173`.
- [ ] **Browser:** Google Chrome (v120+) clean incognito profile with hardware acceleration enabled.
- [ ] **Floor Markings:** Tape marked on floor at:
  - 1.5m (Near boundary)
  - 2.0m (Standard booth distance)
  - 2.5m (Mid-far booth distance)
  - 3.0m (Far audience / boundary distance)
  - P1 (Left half) and P2 (Right half) player positions separated by 0.6m lateral distance.
- [ ] **Lighting:** Record ambient lux (Standard ~350 lux, Backlit with window/lamp behind players, Dim ~120 lux).
- [ ] **Display:** Duplicate or Second Screen to 1080p 60Hz HDMI TV. Check that in-game HUD camera dock does not clip and timer remains legible.

---

## 3. Quantitative Acceptance Targets

| Metric | Target / Mandatory Requirement | Criticality |
|---|---|---|
| **Silent Reassignment** | **Zero occurrences** across all tests (P1 and P2 must never swap controls) | **Mandatory P0** |
| **Fail-Safe Release** | Lost tracking neutralizes `moveAxis=0` and `catch=false` within $\le 250\text{ ms}$ | **Mandatory P0** |
| **Phaser Render Rate** | Sustained $\ge 45\text{ FPS}$ (p5), target $60\text{ FPS}$ during continuous 2P gameplay | P1 |
| **Worker Inference Latency** | WebGL GPU $\le 45\text{ ms}$ p50, $\le 65\text{ ms}$ p95 | P1 |
| **Catch Precision** | $\text{TP} / (\text{TP} + \text{FP}) \ge 90\%$ at $\ge 2.0\text{ m}$ | P1 |
| **Catch Recall** | $\text{TP} / (\text{TP} + \text{FN}) \ge 85\%$ at $\ge 2.0\text{ m}$ | P1 |
| **Movement Latency** | Physical body lean onset to robot motion onset $p95 \le 200\text{ ms}$ | P1 |
| **Recovery Latency** | Return to valid pose restores control within $\le 1.5\text{ s}$ median | P1 |
| **Offline Startup** | 100% startup without internet access or CDN fallback | **Mandatory P0** |

---

## 4. Test Procedures & Protocols

### 4.1. Pose Feasibility at Distance (`PO-07`, `PO-08`, `PO-09`)
- **PO-07 (Near, 1.5m):** Position two standing participants side-by-side at 1.5m. Verify shoulder, elbow, wrist, and hip landmark detection visibility scores ($\ge 0.70$). Verify both poses detected simultaneously.
- **PO-08 (Mid, 2.0m):** Step back to 2.0m. Check tracking stability during lean and arm raise. Measure inference latency and dropped frame rate.
- **PO-09 (Far, 3.0m):** Step back to 3.0m. Check upper-body framing in 720p FOV. Check if wrist landmark visibility remains sufficient ($\ge 0.50$) for reliable catch triggering.

### 4.2. Field Usability & Safety (`FT-01` to `FT-09`)
- **FT-01 (Boundary Crossing):** Two calibrated players. P2 steps completely into P1's side. Expected: P1 is neutralized, warning badge `CROSSING / RETURN TO HALF` appears. P2 NEVER controls P1's robot. When P2 returns to right half, control seamlessly recovers.
- **FT-02 (H0 Hand Pinch at Far Distance):** Test Hand Pinch mode at 2.5m–3.0m. Record intended catches vs recognized catches over 60 seconds. Note participant fatigue and dropouts.
- **FT-03 (P1 Both Arms at Far Distance):** Test Pose Both Arms mode at 2.5m–3.0m. Record catch precision, recall, and accidental triggers during lateral leaning.
- **FT-04 (P2 One Arm at Far Distance):** Test Pose One Arm mode at 2.5m–3.0m. Record catch precision, recall, and false catches caused by walking or leaning sway.
- **FT-05 (6-Volunteer Balanced Order Study):** 6 distinct volunteers test schemes in balanced order (Latin square: H0 $\to$ P1 $\to$ P2; P1 $\to$ P2 $\to$ H0; etc.). Record subjective ease of use (1–5 scale), physical comfort, and preferred scheme.
- **FT-06 (Simultaneous Co-op Catch):** Both players raise arms simultaneously while moving in opposite directions. Verify independent robot control without cross-talk or stuck catches.
- **FT-07 (Actionable Status Recovery):** Participant intentionally drops arms out of frame or turns sideways. Check if HUD badge (`P1 OUT OF FRAME`, `TOO CLOSE`, `AMBIGUOUS`) allows self-correction within 5 seconds without verbal coaching.
- **FT-08 (External 1080p TV Verification):** Connect HDMI TV. Verify PiP camera dock does not obstruct falling items (lanes X=117–543 and X=737–1163) or the round timer (Y=32–115).
- **FT-09 (Body Proportion Diversity):** Pair players with significant height/reach differences (e.g. 155cm vs 185cm). Confirm scale-invariant lean normalization $\frac{\Delta X}{\text{shoulderWidth}}$ works equally without recalibration.

### 4.3. Performance & Stress Profiling (`PF-01` to `PF-08`)
- **PF-01 (Phaser Scene FPS):** Run one full 60s round per scheme. Sample Phaser FPS via DevTools Performance panel. Record min, p5, p50, avg FPS.
- **PF-02 (Worker Inference Latency):** Record worker `inferenceMs` under WebGL GPU and CPU fallback.
- **PF-03 (End-to-End Latency):** Video record players and screen at 120/240 FPS (or high-speed smartphone camera). Measure elapsed frames from physical lean onset to robot pixel displacement.
- **PF-04 (Tracking Uptime vs Distance):** Measure percentage of valid frames at 1.5m, 2.0m, 2.5m, 3.0m over 60-second trials.
- **PF-05 (Camera Comparison):** Compare integrated 720p webcam against external 1080p webcam. Compare inference latency, field of view, and wrist landmark confidence.
- **PF-06 (10-Round Endurance Stress):** Run 10 back-to-back 60s camera games with restarts and mode switches. Check memory leaks (`performance.memory`), lingering workers, or WebGL context loss.
- **PF-07 (Booth Queue Visibility):** Stand 3–4m away from 1080p TV. Verify HUD status badges and skeleton overlay are legible to spectators.
- **PF-08 (Lighting Variations):** Test under standard (350 lux), backlit (window/spotlight behind players), and dim (120 lux) conditions. Record tracking dropout rates.

---

## 5. Machine-Readable Evidence CSV Schemas

### 5.1. `field-test-log.csv`
```csv
run_id,participant_pair,scheme,distance_m,lighting,intended_catches,detected_catches,false_catches,missed_catches,precision,recall,f1,silent_reassignments,notes
```

### 5.2. `benchmark.csv`
```csv
run_id,scheme,delegate,render_fps_avg,render_fps_p5,worker_latency_p50_ms,worker_latency_p95_ms,worker_hz,e2e_latency_p95_ms,memory_heap_mb
```

### 5.3. `distance-trial.csv`
```csv
scheme,distance_m,p1_uptime_pct,p2_uptime_pct,wrist_confidence_avg,lean_responsiveness_rating,status
```

### 5.4. `lighting-trial.csv`
```csv
condition,lux,scheme,dropout_rate_pct,false_catch_count,recovery_median_ms,status
```

---

## 6. Gate G6 Human Decision Record Template (`FT-10`)

When physical testing on the target Dell laptop is complete, compile the comparative scorecard and request human approval:

```markdown
### CV-02 Tracking Scheme Selection Scorecard

| Evaluation Criterion | Hand Pinch (H0) | Pose Both Arms (P1) | Pose One Arm (P2) |
|---|---|---|---|
| **Max Usable Distance** | _____ m | _____ m | _____ m |
| **Catch Precision (>=2m)** | _____ % | _____ % | _____ % |
| **Catch Recall (>=2m)** | _____ % | _____ % | _____ % |
| **False Catch Rate (per 60s)** | _____ | _____ | _____ |
| **Worker Inference Latency** | _____ ms | _____ ms | _____ ms |
| **Physical Exertion Rating (1-5)** | _____ | _____ | _____ |
| **Player Preference Votes** | _____ / 6 | _____ / 6 | _____ / 6 |
| **Silent Reassignment Occurrences** | 0 | 0 | 0 |

**Operator Recommendation:** [ P1 Both Arms | P2 One Arm | H0 Hand Pinch ]
**Human Acceptance Decision:** [ ACCEPTED / REVISED ]
**Final Booth Default Selected:** [ H0 | P1 | P2 ]
**Approved By:** _________________________  **Date:** ____________
```

## STAB-01 amendment — 2026-10-19

The earlier protocol above is retained as historical planning material; its equations and automatic recovery description do not override the implemented mapping. Current Pose thresholds are enter 0.22/release 0.12, wrist raise margin 0.2 shoulder width, and neutral input at capture age >=250ms. Lost continuity requires explicit CALIBRATE; returning to a half alone does not restore a slot. See [current input contract](camera-input-integration.md) and [FIELD-01 execution forms](../reports/master-v3-2026-10-19/FIELD-01.md).

The 16GB/Windows Home target description conflicts with older DESIGN.md 32GB and the current development host Windows Pro. Record actual booth hardware; do not substitute this development host as the Dell benchmark. The scorecard's hard-coded zero swap values are targets, not observations. Keep unmeasured cells empty/NOT RUN. Master v3 FT IDs differ from this older protocol; namespace new evidence as MASTER-V3/FT-xx. Its G3/G4 correspond to physical testing/scheme choice; the legacy CV-02 G6 label refers to that older plan.
