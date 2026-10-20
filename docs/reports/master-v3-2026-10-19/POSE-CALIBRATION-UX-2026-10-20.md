# Pose calibration UX — 20October2026

**IMPLEMENTED LOCALLY;147/147 tests and build PASS;8/8 UI browser cases PASS; physical acceptance NOT RUN for this revision.**

User approval: “được rồi, mình chấp nhận những điều kiện của bạn”. The approved narrow scope was one click to collect calibration conditions,3stable samples, an8second cancellable wait, and requestable saved START. DirectionA, scoring, rigs/art, models, dependencies and the250ms input deadline remain unchanged. No Git commit/push/release.

## Delivered interaction

CALIBRATE becomes available as soon as the Pose camera/model is ready. It records explicit intent instead of requiring a click inside a short freshness window. Checklist conditions update during collection: camera connected, correct player count, clear shoulders, correct zones, fresh samples and stable count. A second click cancels. Success saves the latest sample after3stable fresh observations; the live dock also shows CALIBRATING n/3 and CANCEL.

Stability compares each sorted shoulder-center observation to an anchor: center displacement<=0.025preview width, width variation<=15%, and an anchor span<=1.5seconds. Invalid/confidence/position/count failures, stale or out-of-order frames reset the sample sequence. Collection expires at8seconds; cancellation/timeout cannot complete in another mode, worker or camera session. No full-body, elbow or arm-raise requirement was added.

Saved START remains requestable during a delivery wait and waits at most3seconds for a fresh calibrated sample. It never calibrates automatically after actual loss. Camera-off checklist marks/counts clear. Samples verified is explicitly historical validation; current progress.fresh still reports live freshness.

## Verification evidence

| Class | Result | Scope and limits |
|---|---|---|
| Automated full suite |147/147 PASS | full-tests-final.log; prior Hand/core/asset coverage included |
| Automated build |PASS | build-final.log includes TypeScript; existing Phaser chunk advisory retained |
| Independent evaluation |PASS;55/55 focused independently executed | Distinct reviewer checked lifecycle, START safety, stability, stale interruptions and stopped checklist. No open actionable findings; browser/physical not independently certified |
| Final UI browser |8/8 PASS | Solo/Co-op × both Pose schemes at1280×720 and1920×1080; request before detection, cancel, collect/save3,44px targets, viewport bounds, START enters round and teardown |
| Broader browser |PARTIAL/FAIL | First real-server run passed all4full720p start/Catch/loss/live-calibration/Catch cases, then1080pSoloP1 timed out waiting post-start Catch with freshness~323ms. Remaining3cases not reached. This failure is preserved; UI-only PASS does not clear it |
| Environment startup |NOT A PRODUCT RESULT | Initial browser run hit connection-refused because dev server was off; restarted local server and retained log |
| Self-review |DONE | Batched720p/1080p captures read once, final confirmation once. Checklist and controls fit the viewport; camera buttons44px. No field/TV legibility measurement |
| UI detector |WARN / DEGRADED | One run found2pre-existing side-border warnings atCSS178/179, unchanged from snapshot. HTML parser unavailable; regex fallback does not evaluate computed contrast. No clean-detector or complete accessibility claim |
| Physical webcam |NOT RUN for this revision | Previous user reply “Vẫn không điều khiển tiếp được” belongs to the preceding recovery revision and remains an unresolved historical physical failure. Current new-button flow requires separate user acceptance |

Evidence: `C:/Users/qnhat/_Project/ReactorRush-evidence/2026-10-20-pose-calibration-1792469490678`. before/ and baseline.json record root/head/status and SHA-256 parity. RED/GREEN, correction logs, final test/build/detector logs, browser-ready/ failed broader attempt and browser-ui-final/ UI-only result/captures are separate. Edge is left open on setup without starting the camera.

Reproduce: node tests/browser/pose-calibration-smoke.mjs OUTPUT BASE_URL PLAYWRIGHT_NODE_MODULES --ui-only. Omit the flag for the broader in-game Catch/recovery probe. Both fixtures use synthetic video, fake bitmap capture and a fake worker with130ms result delay; neither certifies actual SDK performance or webcam accuracy.

## Remaining acceptance

Try the one-click flow with the correct number of people. If any checkbox remains incomplete, follow its specific instruction; no precise click timing is needed. Physical Pose performance, real CPU/SDK stalls, broad browser/Co-op/TV and full FIELD-01 remain open in [gate report](gate-report.json). [Hand bilateral acceptance](HAND-MOVEMENT-FIX.md) remains separate.
