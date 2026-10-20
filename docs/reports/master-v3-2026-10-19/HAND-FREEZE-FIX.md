# Hand freeze / calibration follow-up — 2026-10-19

**Scope:** explicit user request to fix Hand hanging and inaccessible calibration. Changes stay local; no commit/push, core rules, rigs, assets, models or dependencies changed.

## Result on the user’s actual Edge tab

After a clean reload of the revised source, selected H0 Solo and enabled the already-authorized webcam. CALIBRATE HAND reported “Neutral hand position saved (GPU active)”; START WITH CAMERA entered a round. UI samples showed approximately6updates/s and161ms smoothed inference (observations, not a benchmark). The round reached results with P1score100. The user explicitly confirmed: **“Di chuyển và bắt được”**.

This accepts the observed Solo/GPU Hand flow on this machine. It does not certify Co-op, CPU performance, Pose, offline/privacy gates or overall STAB-01 completion. Overall G2 remains open for those recorded failures and coverage gaps.

## Changes and cause traced

- A sample could expire between a button becoming enabled and its click handler. Old handlers silently returned, matching the observed START click that left the setup screen unchanged. H0 now retains explicit CALIBRATE/START intent for at most3seconds and completes only when the adapter accepts hand data; it never auto-starts without a START request.
- CALIBRATE HAND is requestable once the Hand adapter is ready, including while waiting for hands. During a request it is disabled; missing-hand timeout gives guidance. Loading/replacement clears enabled controls from the previous session. Waiting status includes delegate/inference/update metrics.
- Stop, failure, GPU retry and Solo/Co-op changes cancel pending actions. Session, adapter and action-generation guards reject obsolete UI completions, including changing away and back to the original player mode.
- CPU fallback copies pixels through a local2Dcanvas with willReadFrequently before creating the transferred bitmap, at a maximum long edge of320pixels with aspect ratio preserved. GPU capture remains native. Experimental real-SDK CPU runs with detached pixels returned results where direct capture had timed out; this reduced coupling to the source video texture but did not establish reliable CPU performance.
- Existing Hand mapper/receipt-based freshness semantics are unchanged; Pose safety and its250ms capture-age gate are untouched. No new identity or physical-latency guarantee is claimed.

## Verification

- Automated: **111/111 tests PASS**, build including typecheck PASS. Logs: external hand-freeze-2026-10-19/final-tests.log and final-build.log. Bundle-size/timing and experimental Node API advisories remain.
- Test-first regressions cover deferred calibration/start, missing-hand timeout, cancellation, CPU pixel copy/aspect ratio, startup controls and mode/action-generation races.
- Independent evaluation: **31/31 targeted tests PASS**; reviewer found the mode-change P1, author reproduced RED→GREEN, reviewer confirmed it closed. No remaining blocking code finding in this incremental scope.
- Actual webcam acceptance: **PASS for this observed Solo/GPU round**, confirmed by user. Screenshot is outside the project and contains the results UI, without webcam pixels.
- Real-SDK headless forced CPU: **FAIL on final production-source probe**, inference watchdog timeout; keep this limitation open. Earlier CPU pixel-copy experiments were inconsistent (results/partial readiness), not a certified PASS for the final revision. No unsafe watchdog extension was introduced.
- Broad current-revision browser suite: **NOT RERUN for this bounded Hand follow-up**. Its previous P2Pose recalibration timeout remains in the main report.

## Evidence

External directory: C:/Users/qnhat/_Project/ReactorRush-evidence/2026-10-19-master-v3-1792379238706/hand-freeze-2026-10-19/. Includes before/source hashes, RED/GREEN logs, real SDK diagnostics, hand-production-sdk.json and hand-live-round-result.png. Original source/video is preserved.
