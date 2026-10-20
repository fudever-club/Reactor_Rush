# Hand movement — sensitivity, zones and recenter

**Status (2026-10-19): IMPLEMENTED LOCALLY / AUTOMATED PASS / PHYSICAL BILATERAL PASS — USER CONFIRMED.** User approved this bounded change with “Duyệt, triển khai cách này”. No commit, push or release.

## Problem and evidence

The user reported continuous MOVE LEFT and no MOVE RIGHT. The previous mapper accepted Solo neutral x=0.92 with an entry distance of0.10, putting the right trigger at1.02 outside the camera image. Replaying the actual mapper reproduces an unreachable right direction; a centered neutral supports both directions. The user's historical neutral was not measured, so this is a demonstrated failure mechanism rather than proof of the exact physical cause. Solo also previously chose among multiple detected hands, allowing an unintended controller.

## Delivered behavior

- MOVE DISTANCE defaults to8%, adjustable3–15% of the full preview width. Smaller means more sensitive hand travel; robot speed is unchanged. Release is55% of entry distance (default4.4%). Slider changes cancel queued actions and require fresh calibration.
- Calibration requires enough space for entry distance plus2% margin on both sides within the player's slot. Edge positions receive CENTER HAND guidance. Solo requires exactly one detected hand; multiple hands give ONE HAND ONLY guidance and neutral input. Co-op slot/identity behavior otherwise stays as before.
- LEFT–STOP–RIGHT overlay shows outer entry lines, a smaller inner STOP box, calibrated center and current accepted hand cursor. Both rendered directions and HUD labels use canonical accepted mapper state, including stale-input neutralization. Mirrored video/canvas geometry and readable text are preserved.
- H0 CALIBRATE is available throughout a live round. It recenters the current movement distance and neutralizes input while waiting. Existing bounded3-second calibration/start intent and lifecycle cancellation remain.
- Symmetric boundary comparisons avoid decimal rounding causing one side to activate differently. Scoring, Catch mapping, round duration, rigs, art, dependencies, models and Git metadata are unchanged. Hand receipt-time freshness remains separate from Pose capture-time freshness.

## Verification

| Evidence class | Result | Scope and limits |
|---|---|---|
| Automated unit/integration | **121/121 PASS** | Full npm test; mapper boundaries/edge calibration/multi-hand Solo, slider and queued actions, scene/HUD and existing regressions |
| Automated build | **PASS** | npm run build includes TypeScript; Phaser chunk-size advisory remains |
| Automated browser | **2/2 PASS** | 1280×720 at3% and1920×1080 at15%; edge and two-hand guidance, slider, actual robot left/right displacement, STOP, live recenter and both directions, dock geometry, teardown. Synthetic video/fake GPU worker, no SDK or physical accuracy claim |
| Self-review | **DONE** | Setup and live screenshots read visually; labels and STOP geometry visible; TV readability not measured |
| Independent evaluation | **PASS** | Distinct reviewer compared preserved snapshot and ran50/50 targeted mapper/adapter/scene tests; no actionable P0/P1. Physical/browser/TV checks not performed by reviewer |
| Physical bilateral retest | **PASS — USER CONFIRMED** | User confirmed “Đã đi trái/phải và dừng đúng” on2026-10-19 after the new Edge/Solo Hand retest. This confirms left/right/STOP functionality; no controlled performance or live-recenter acceptance claimed |

The earlier user response “Di chuyển và bắt được” and100-point result belong to the previous Hand calibration/freeze fix; they do not certify the new two-direction behavior. See [previous Hand acceptance](HAND-FREEZE-FIX.md). Pose slow frames, real-SDK full-game CPU timeouts and broader Co-op/browser gates remain open in [gate report](gate-report.json).

Evidence is outside the project at:

`C:/Users/qnhat/_Project/ReactorRush-evidence/2026-10-19-master-v3-1792379238706/hand-movement-2026-10-19-1792385393945`

Files include baseline.json and before/ snapshot with SHA-256 parity; mapper-red.log, ui-adapter-red.log and start-range-red.log; full-tests.log and build.log; browser/hand-movement-results.json and setup/right screenshots. Source files and tests remain in the project. Browser reproduction command is documented in [camera integration](../../gameplay/camera-input-integration.md).

## Recorded user acceptance

On2026-10-19 (Asia/Saigon), the user answered the requested Edge/Solo Hand left → right → STOP retest: **“Đã đi trái/phải và dừng đúng”**. The reported one-direction issue is closed for this tested flow. Source and scope are recorded in user-bilateral-acceptance/user-confirmation.json under the evidence directory above. Broad FIELD-01 and Pose/CPU/Co-op gates remain open. Documentation follow-up independent review: NOT RUN; this update records direct user evidence only.

## Repeat test procedure

1. Select Solo and HAND PINCH [H0]. Keep only one hand visible near the preview center. Start with8%; try5–6% for less hand travel.
2. CALIBRATE HAND, then START WITH CAMERA. Move across RIGHT and LEFT lines and check the robot goes both ways.
3. Return into STOP and check movement stops. Hold a new center and use live CALIBRATE to recenter if needed.
4. Record both directions and STOP separately; controlled FIELD-01 timing/Co-op/TV checks remain separate.
