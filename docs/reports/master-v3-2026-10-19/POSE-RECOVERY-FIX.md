# Pose preview and control recovery

**2026-10-19: IMPLEMENTED LOCALLY;136/136 AUTOMATED PASS; BROWSER PARTIAL/FAIL; PHYSICAL CONTROL RETEST PENDING.**

The user approved amber skeletons before calibration/after loss, clear reacquisition guidance and explicit calibration before resumed control: “Duyệt, sửa theo cách này”. Their first physical retest reported **“Skeleton hiện lại nhưng chưa điều khiển tiếp được”**. The preview-only revision was therefore insufficient; the control-state correction below was applied and requires a new physical retest. No commit, push or release.

## Two reproduced causes

1. Fresh body results were hidden because rendering only received accepted player associations. A live synthetic worker returned2bodies after loss, but the renderer drew0joints; explicit calibration restored66. Fresh unassigned detections now render amber, without player identity or Catch. Accepted skeletons stay Cyan/Pink.
2. The serial capture/inference pipeline permanently latched loss during delivery waits. Example: capture100 arrives230, calibration succeeds; at350 the old observation reaches250ms age and input must be neutral. Capture240 arrives370, only130ms old and140ms after the preceding capture, but the old read() had already destroyed continuity. This occurred even with every individual result age below250ms. An independent reviewer reproduced the same timeline and the calibration-at-deadline race.

## Corrected state contract

- Input age >=250ms still returns neutral, clears held movement/Catch and hides stale skeletons. It now reports WAITING_FOR_FRAME instead of destroying track history solely because an in-flight result has not arrived yet.
- A new result can continue the existing association only when its own capture age is below250ms, timestamps advance, capture-to-capture spacing is below250ms and all original association/position/confidence rules still pass. The adapter continues rejecting stale/out-of-order results. Arrival time never replaces capture time. No automatic calibration was added.
- True missing-body observations, missing slots/re-entry, crossing, ambiguity, an actual capture gap >=250ms or invalid mapper times retain the existing explicit-calibration latch. The continuously accepted player in partial Co-op keeps the existing control/overlay.
- Setup/live UI distinguishes waiting for a frame, searching for a body, BODY FOUND · CALIBRATE and invalid setup/slow frames. Candidates are amber and never emit accepted Catch/player colors. Candidate preview clears on expiry/stop/error.

This explicitly amends the previous implementation's rule that any stale poll permanently lost identity. It preserves the250ms input deadline and bounded anonymous capture association; it does not claim biometric identity or guaranteed tracking of an undetected substitution. Models, capture sizes, scoring, rigs, art and dependencies are unchanged.

## Verification

| Class | Result | Scope and limits |
|---|---|---|
| Regression RED/GREEN |PASS | Missing preview/guidance failed7tests; serial wait failed6tests; held-state/waiting UI failed2tests. Final focused suite68/68 PASS |
| Full automated |136/136 PASS | Existing Hand/core/asset regressions included; log full-tests-corrected.log |
| Build |PASS | TypeScript included; build-corrected.log; Phaser chunk advisory remains |
| Independent evaluation |PASS;68/68 independently executed | Distinct reviewer also ran a separate timing probe: neutral/WAITING at350, fresh accepted control at370. Permanent-relatch P1 closed; physical/browser not independently validated |
| Browser final |PARTIAL/FAIL | Corrected P1 Solo1280 passes full loss→return→explicit calibration→Catch loop. P2 Solo1280 times out before initial Catch with tracking-lost and sample freshness~299ms. Remaining6cases not reached. No8/8 claim |
| Browser earlier preview revision |PARTIAL/FAIL | Initial P1/P2 Solo1280 passed; Co-op failed after screenshot/recalibration. Two later attempts failed before initial Catch. All results preserved separately |
| Physical preview |USER CONFIRMED | “Skeleton hiện lại nhưng chưa điều khiển tiếp được” on preview-only revision; not accepted as full recovery |
| Physical corrected control |PENDING | Corrected revision reopened on actual Edge. One observed UI sample reported3poses in Solo; user instructed to use correct player count. No new control PASS yet |

Known P2 usability issue: a Pose CALIBRATE click that has already expired can fail without an explicit failure message, and saved-center text may briefly overwrite WAITING guidance. Queueing explicit intent would improve this, but was not added. The permanent relatch is fixed; processing>=250ms, actual capture gaps and intermittent control availability remain performance limits.

Evidence: `C:/Users/qnhat/_Project/ReactorRush-evidence/2026-10-19-master-v3-1792379238706/pose-recovery-1792399574161`. before/ and baseline.json preserve original sources/hashes; red/green logs, processing-wait and waiting-ui logs preserve corrective evidence. browser/, browser-final/, browser-isolated/ retain failed attempts; browser-corrected/pose-recovery-results.json is the final current-source browser result. Existing broader CPU/Pose browser failures remain open in [gate report](gate-report.json).

Reproduce browser: node tests/browser/pose-recovery-smoke.mjs OUTPUT BASE_URL PLAYWRIGHT_NODE_MODULES. The final script uses synthetic video, fake bitmap capture and a fake worker; it tests UI/state only and is not an SDK/physical benchmark. Playwright is supplied externally.

## Physical retest

Select Solo with exactly1detected person, or Co-op with exactly2people. Enable camera; amber skeletons should appear before calibration. CALIBRATE → START. Step out of view and return: amber skeleton and BODY FOUND should return. CALIBRATE again, then lean/raise arms. A processing wait may briefly pause controls without losing calibration; actual body loss/capture gaps still require deliberate calibration.

Hand bilateral acceptance remains separate in [Hand report](HAND-MOVEMENT-FIX.md). Controlled FIELD-01/Co-op/TV and release gates remain open.
