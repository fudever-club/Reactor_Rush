# Three-round campaign — local verification, 21 October 2026

Status: local implementation, final automated verification and portable packaging complete. Independent whole-change evaluation: PASS. This report distinguishes automated execution, self-review, independent evaluation and physical acceptance.

## Delivered behavior

Energy Catch → Duo Circuit → Cool the Core, each 60,000 ms, with deliberate intro/start, a 900 ms ready beat, intermediate results, final three-row score breakdown, team totals, best combo and replay clearing the session. Solo excludes P2; Co-op retains independent player boards and cores. Each arena has its own procedural presentation. Keyboard and existing opt-in camera schemes share the move/activate contract. The [gameplay specification](../gameplay/three-round-campaign.md) owns mechanics and initial tuning; numeric defaults are not playtest conclusions.

Original Energy Catch rules/core, Direction A rigs/animations, adapters/workers, model files, manifest and dependency files remain unchanged (80/80 protected SHA-256 matches). Camera sessions stay active across round transitions; Stop selects keyboard and tears down camera resources. Scene activation requires current positive release evidence; historical input and safety-neutral camera output cannot rearm it. Valid continuous Co-op P1 must remain usable while P2 is lost.

## Source integrity and scope

Root: C:/Users/qnhat/_Project/Reactor Rush. Baseline: clean branch work, HEAD 2ab6be709923f6aaf20567d69f54ca0ea3d46dc7. Before editing, 153 source/document files were copied to an external snapshot and source/copy SHA-256 parity was verified. Writers were serialized. Source changes remain uncommitted. No dependency installation, Git metadata/remotes change, commit/push/merge, deployment, external Stitch production or art approval occurred.

Runtime additions: campaign.ts and challenges.ts pure engines; campaign-ui.ts DOM views; challenge-renderer.ts arena views; observed-release.ts positive camera evidence guard; scene integration in main.ts; updated HTML/CSS. Browser tests were adapted to deliberate intros, retaining original camera assertions. New unit/browser tests cover campaign, challenges and release safety. Documentation reconciles current runtime with historical art/Stitch status.

## Automated verification

Runtime used bundled Node.js 24.19.0: node --test with every tests/*.test.mjs file explicitly enumerated, node node_modules/typescript/bin/tsc --noEmit, and node node_modules/vite/bin/vite.js build. Evidence is stored outside the project in C:/Users/qnhat/_Project/ReactorRush-development-evidence/2026-10-21-three-rounds-58b653e3.

- Pure engines: full suite 216/216 passed after 25 new tests; task-1-report.md and task-1-review.md.
- Final correction3: full suite 237/237 passed, zero failures/skips, typecheck/build exit 0; task-2-unit-fix3.log, task-2-typecheck-fix3.log, task-2-build-fix3.log. Build completed 2026-10-21T08:30:18.366Z.
- Final frozen-source correction3 real-timer keyboard Solo campaign: PASS, exit 0; actual round wall times 60,269 / 62,414 / 60,018 ms; ordered results, ready/intros, held-action/stall socket regression, replay and Solo/Co-op UI checked; scores 0 + 5,600 + 2,200 = 7,800, best combo 34; errors empty. This run proves full flow and exact accumulation; its Energy Catch score 0 is not new positive-catching evidence. task-2-browser/fix3-final/campaign-results.json and screenshots; task-2-fix3-browser-checks.json.
- Final correction3 sequential synthetic checks: camera smoke 10/10, Hand movement 2/2 and Solo/Co-op Pose recovery 6/6, each exit 0 and errors empty. task-2-fix3-browser-checks.json retains complete stdout/stderr and timestamps. Earlier lifecycle 13/13, calibration 8/8, recovery 8/8 and results-pointer 2/2 passed on earlier source snapshots, as labeled in task-2-report.md and task-2-camera-counts.json; these were not all rerun after the helper-only correction. Final real-60s camera boundary check PASS, exit 0: accepted release observed during play; results → round-2 intro reuse one camera request and one active worker; Stop ends every stream track and worker. The legacy filename task-2-camera-boundary-fix2.mjs / task-2-browser/camera-boundary-fix2.json executes the accepted correction3 source; timestamps and exit appear as the fifth final sequential entry. No real frame/landmark recordings are stored.
- Existing Vite >500 kB chunk warning and Node experimental TypeScript stripping warning remain. No new dependency or chunking change was made.

## Correction history and distinct evaluation

Task1 pure engines: distinct review_engines approved specification compliance and code/test quality, zero corrections.

Task2 correction1 supplied missing final cooling heat feedback and Solo labels. Distinct review_campaign_ui inspected actual 1280×720 and 960×540 final/arena/Co-op screenshots and exact score JSON: PASS, finding closed. Heat is feedback only and does not change scores.

Whole-change review found the scene could mistake camera WAITING_FOR_FRAME neutral input for released arms. Correction2 added current accepted, fresh, visible gesture evidence, with actual PoseInputMapper/scene regression tests for expiry and obscured wrists plus Hand pinch/geometry checks. The reviewer then reproduced a narrow Co-op case: an invalid-present P2 torso should be filtered like the unchanged mapper while accepted P1 remains usable. Correction3 filters invalid torso candidates consistently with the unchanged mapper while retaining raw extra-body limits, requested-player accepted state, ambiguity checks and own-gesture visibility. Actual mapper/scene tests failed before the fix and pass after it. Distinct whole_campaign_review verified all nine frozen/working file hashes and seven edge cases: final code/spec PASS, both required findings resolved, no remaining material code findings. Task2 used 3/3 correction batches; The distinct reviewer also read the final correction3 campaign JSON and inspected both final screenshots: exact totals and layout PASS. The distinct reviewer read all five final sequential execution entries, the actual boundary script/PASS JSON, final screenshots and package/source evidence: FINAL WHOLE-CHANGE PASS, no remaining actionable material finding. Final independent record: external whole-change-review.md.

Automated scripts are execution evidence. Implementer/coordinator visual and semantic inspection is self-review. The named distinct reviewers actually read source/spec/evidence; their findings and final decisions are independent evaluation. No score replaces a mandatory acceptance criterion.

## Retained failures and harness adjustments

The first full campaign driver waited for a movement target after the real round had ended; it was corrected to stop waiting when play ends, with no runtime timer shortcut. The unit VM loader needed the new scene imports injected; original camera assertions were retained. An initial concurrent Solo recovery timeout passed on isolated rerun with unchanged assertions; concurrency as a cause was not established. The Hand movement fixture was recalibrated before its intended x sample arrived; the fix waits for read-only currentX to match the sample before calibration, preserving assertions. Initial logs and superseded packages are retained externally.

## Documentation and source checks

All 47 checked local Markdown links resolve. Read-only git diff --check exits 0; baseline HEAD remains unchanged. Final source SHA-256 matches all nine correction3 snapshot entries. Protected adapters/workers/core/rigs/assets/models/manifest/dependency files remain 80/80 unchanged. Evidence: documentation-links.json, final-diff-check.json, final-source-parity.json and protected-final.json.

## Portable handoff

Final correction3 build was copied to C:/Users/qnhat/Downloads/Reactor-Rush-Three-Round-Candidate-20261021: all 26 manifest file hashes match; all 24 served runtime files return HTTP 200 with matching SHA-256. Evidence: portable-final-packaging.json and portable-final-http-checks.json. Local server: http://127.0.0.1:4181/ (PID26656). Coordinator opened that exact build in Edge and inspected the menu, with camera off; final-portable-menu-edge.png. Package status is LOCAL_TECHNICAL_CANDIDATE, releaseCertified=false. The initial package is preserved externally as superseded-candidate-initial. The original Downloads diagnostics folder and its earlier physical test are preserved.

## Acceptance limits

NOT RUN for the new three-round build: physical webcam/body Solo or Co-op playthrough, target-TV/across-room legibility, cold start with the actual network disconnected, ten-minute endurance, physical tracking accuracy or motion-to-TV latency. Synthetic workers/streams do not prove real inference or physical performance. Native-permission and performance benchmark scripts were adapted but not rerun. Prior physical diagnostics evidence applies only to that earlier portable build. Final art, booth and release acceptance remain open.
