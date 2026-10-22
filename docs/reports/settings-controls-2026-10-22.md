# Settings and session controls — 22 October 2026

Status: local implementation, independent reevaluation and portable handoff PASS. User approved the Settings/session-control package and execution in chat. Baseline Git HEAD: `e7bab6318f5124a9d2b1a82261186f96ef1359be`; this package is local and does not create a commit, remote CI run, deployment or release.

## Delivered behavior

Settings is available across menu, camera setup, intros, ready, play and results, including narrow windows. Native Master/Music/Sound effects sliders update live; only sanitized versioned volumes persist. Sound remains explicit opt-in, with Test SFX and volume-only defaults.

Opening Settings during ready/play freezes simulation and presentation clocks. Resume uses an independent 900 ms gate and discards its completion-frame delta. A held keyboard action needs a real key-up and live release; camera input retains fresh/accepted/visible-landmark checks. Tab visibility loss pauses and switches Sound Off, with no automatic resume.

Unfinished-mission Restart/Menu require inline confirmation; Cancel preserves the paused state. Restart clears the whole campaign into round 1 intro while retaining Solo/Co-op and an actually active camera. Menu stops camera/workers/audio and restores keyboard/Start focus. Camera Stop stays available in Settings. Fullscreen follows actual browser state and reports unsupported/rejected requests, preserving 16:9 letterboxing. Narrow-menu Restart obeys the existing 960px startup guard; a session already in progress may restart after resizing. Short Settings cards scroll to lower actions.

No engine, campaign/challenge rules, input adapters/workers, rigs, assets, manifests, dependencies or workflows changed. The existing 18 audio assets and Direction A robots remain intact.

## Automated verification

| Check | Result / evidence scope |
|---|---|
| Unit tests | Final 271/271 PASS; baseline 260. Meaningful RED/GREEN for preferences, audio, pause/release and narrow-menu guard. |
| Typecheck / production build | Exit 0 / 0. Existing large Phaser chunk warning remains. |
| Final Settings browser suite | PASS 15 groups; browser errors []. Native sliders/focus, storage denied/reload, opt-in/live volume/defaults, actual fullscreen enter/exit and denied/unsupported, ready/play freeze, resume/held key, confirmations, hidden-tab policy, synthetic camera lifecycle/release/Stop, narrow startup and active resize boundaries. |
| Real campaign | PASS 3×60,000 ms simulation; wall 61,739 / 63,789 / 61,690 ms including pauses. All three freeze checks include heat/items/positions/players/history; timers reach exactly zero. Exact totals, replay and Co-op UI pass; errors []. |
| Existing camera smoke | PASS 10 cases: H0/P1/P2 at 1280/1920, each Solo and permission-denied keyboard fallback. Synthetic stream/fake worker only. |
| Existing arcade regression | PASS; existing assertions unchanged, including an actual energy catch and native Sound control. |
| Protected hashes / links / diff | 304 baseline tracked files checked; changes confined to approved paths. Final runtime 11/11 hashes exact. 33 local documentation links valid; diff check exit 0. |

The full campaign, existing camera and arcade checks ran on the pre-batch3 candidate. Final batch3 changes only the narrow-menu restart guard and its disabled-button/notice UI; simulation, audio and camera code are unchanged. Final 271-unit/typecheck/build/15-group Settings checks ran after that correction. Exact pre/final hashes and preserved logs distinguish these versions. No full-timer or full-camera repeat was performed after the menu-only fix.

Initial camera smoke under simultaneous campaign render load hit tracking timeout; the unchanged standalone rerun passed all 10 cases. A terminal-stall fake worker experiment also correctly triggered existing fallback and was removed from the active-camera-preservation scenario; stale/obscured release remains directly covered by scene tests. Failed artifacts remain preserved, rather than being reported as passes.

## Self-review and independent evaluation

Three correction batches used: (1) focus recovery after disabling Camera Stop and fullscreen feedback inside the modal, (2) recovery when the browser retains a disabled activeElement through click completion, (3) independently reproduced P2 narrow-menu Restart bypass. The third correction is covered by a failing-then-passing scene test and final browser assertions. No cosmetic expansion or fourth correction cycle was performed.

Self-review: one complete six-view batch at 1280×720, 960×540 and 354×600, paused and inline confirmation; no mandatory art defect. Distinct reviewer examined code, actual visual batch and execution evidence, found the P2 above, then independently reproduced the corrected boundary and verified all 11 final hashes. Final independent verdict PASS, no open P0/P1/P2; one complete visual batch plus one scoped narrow-menu confirmation. Scripts and implementer self-review are not counted as independent evaluation.

## Portable handoff and limits

Local portable candidate: `C:/Users/qnhat/Downloads/Reactor-Rush-Settings-20261022`, served at [localhost:4188](http://127.0.0.1:4188/). All 47 package-file SHA-256 values match; all 45 served build files return HTTP 200 and exact hashes. The complete 15-group Settings browser suite also passed against this production package with zero browser errors. The in-app browser opens this candidate with Settings visible; its screenshot is `settings-handoff.png` in the evidence root. Prior audio candidate on port 4186 is preserved. Source preview runs on 4187.

Physical webcam/inference, target TV/projector, cold-start with the network physically disconnected, and subjective audio quality: NOT RUN in this package. Synthetic/browser evidence cannot certify these. Actual fullscreen was exercised in automated Edge; no in-app-browser fullscreen capability is inferred.

External evidence root: `C:/Users/qnhat/_Project/ReactorRush-development-evidence/2026-10-22-settings-controls`. Key files: `baseline.json`, `runtime-freeze.json`, `runtime-freeze-pre-batch3.json`, `task-report.md`, `independent-review.md`, `unit-results.txt`, `typecheck-results.txt`, `build-results.txt`, `settings-browser-final-guard/settings-results.json`, `real-campaign/campaign-results.json`, `camera-regression-standalone/browser-results.json`, and `arcade-regression/presentation-results.json`, `portable-http-checks.json`, `portable-settings/settings-results.json` and `settings-handoff.png`.

[Approved spec](../superpowers/specs/2026-10-22-settings-controls-design.md) · [Execution plan](../superpowers/plans/2026-10-22-settings-controls.md) · [Current gameplay](../gameplay/three-round-campaign.md) · [Screen flow](../design/screen-flow-and-round-map.md).

## Separately approved toolbar and Git follow-up — 22 October 2026

The user accepted the feature package, requested Settings/Fullscreen/Sound at the right corner, and explicitly authorized commit and push to main. The playing toolbar now sits 3% from the right edge and 22% from the top, below the P2 scorecard; menu and Settings modal retain their existing right alignment. This supersedes only the earlier package publication boundary and centered playing-toolbar placement.

Fresh automated verification: 271/271 unit tests, typecheck and production build PASS; 12 actual-browser toolbar geometry cases (keyboard/synthetic camera, Solo/Co-op, 1280/960/fullscreen) plus four modal alignment checks PASS, with zero browser errors. The toolbar avoids clock, P2 scorecard and camera dock. Self-review inspected 1280/960 camera Co-op screenshots; independent review of this one-line CSS follow-up: NOT RUN. The earlier Settings feature independent review remains versioned separately. No gameplay/audio/camera code changed in this follow-up.

Updated portable candidate: `C:/Users/qnhat/Downloads/Reactor-Rush-Settings-RightCorner-20261022`, localhost port 4189. Earlier 4188 remains intact. External evidence: `C:/Users/qnhat/_Project/ReactorRush-development-evidence/2026-10-22-toolbar-main`; Git publication and actual CI outcome are recorded there after execution. No physical-camera or TV acceptance is inferred.
