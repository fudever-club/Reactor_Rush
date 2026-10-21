# Reactor Rush — Cloud completion work, started20October2026

**Status: local STAB fixes and FIELD-01 preparation delivered; acceptance remains OPEN. G2 is BLOCKED/REVISE.**

User request initially allocated up to six hours; the latest explicit instruction narrows ongoing execution to already-authorized STAB-01 bug fixes/regressions and FIELD-01 preparation. The reconstructed roadmap is a provisional dependency/gate reference, not the verified original and not new implementation authorization. This report separates engineering implementation, automated verification, self-review, distinct independent evaluation and human/physical acceptance. It does not convert the time budget into permission to invent later-round rules, accept artwork, modify a shared design project or publish a release.

## Baseline and preserved scope

- Root: `/workspace/Reactor_Rush`; HEAD `e027110c27014309ead783563c9b4ba7e2e0b77d` is unchanged. The actual working revision includes uncommitted changes; HEAD alone is not the test revision.
- Current application runtime SHA-256: `1ef353185942df71113b5c07cba91e76bff6cf90addaefcf27e6ee68362a347a`. Current source/config/test/document SHA-256 excluding the mutable closing evidence directory: `b4e0cdb8e280c453786d79433c84f853902796cd23c841f988a211e16dc289cc`. [Exact rebaseline/file hashes](evidence/current-checkout-baseline.json) and [machine-readable gate report](status.json) record the boundaries.
- External evidence root: `/var/tmp/reactor-rush-completion-20261020T163138Z`. All151 tracked source files copied to a verified SHA-256 snapshot before source edits. Starting Git status was clean.
- Current local instructions and the STAB implementation plan were inspected. Sequential writes; distinct reviewer read-only. No Git metadata writes.
- The77 protected files checked against baseline remain unchanged: gameplay core, main scene, rigs, character assets/animation definitions, manifests, workers, models/WASM, dependencies/lockfile, DESIGN and Art Bible. CSS pointer handling and camera adapters are the intentional runtime changes.
- Existing root WP-01/design documents describe historical baselines; their stale no-Git or earlier test-count statements are not current environment facts. Original reports are retained rather than overwritten.

## Implemented and reproduced fixes

1. Ready-state START is idempotent in both adapters, avoiding overwritten camera streams/workers.
2. Session generations prevent late permission/playback completions and cancelled CPU recovery from affecting a newly restarted session. STOP allows immediate restart while an old request settles.
3. START during CPU fallback does not allocate another camera or overwrite the fallback worker.
4. Pose synchronous bitmap exceptions stay inside the bounded capture-error path. Failed transfers close untransferred bitmaps.
5. Pose worker bootstrap errors reject promptly and clean up; already-ended tracks cannot reach ready.
6. Results-screen STOP CAMERA now receives pointer events and has a44px minimum target. Real60-second rounds exposed the original click-through bug; isolated DOM/CSS hit testing observed RED then GREEN at720p/1080p.
7. Browser harnesses can use an installed Chromium/Chrome/Edge executable through `CHROMIUM_EXECUTABLE_PATH`, without a package/browser download. SDK probes retain startup/result timing traces and failures.
8. The page uses an inline blank icon to avoid the missing favicon404 that polluted browser error checks.

**Preserved safety:** Pose capture age>=250ms is still rejected. Actual capture discontinuity still requires explicit calibration. The2-second inference watchdog, scoring,60-second timer, keyboard mapping and P1/P2 animation definitions were not loosened or changed. No physical performance claim follows from fake-worker tests.

## Operational deliverables

- [Portable package builder](../../../scripts/package-booth.mjs): refuses existing destinations and destinations inside the build, including directory aliases; copies with SHA-256 verification. A review-found path-alias recursion defect was fixed with a failing-then-passing regression before the package was produced.
- [Read-only localhost server](../../../scripts/serve-build.mjs): Node standard library only; GET/HEAD, safe path containment, correct WASM MIME, loopback binding.
- [FIELD evidence checker](../../../scripts/field-evidence.mjs): reports incomplete templates, undefined precision/recall, invalid counts, mismatched test/run/scheme and threshold failures without granting physical acceptance. Review-found CSV-header collision and evidence-correlation defects were fixed with regression tests.
- [Booth operating guide](../../operations/booth-local.md): exact build/package/browser/field commands and evidence limits.
- [WP-02 handoff proposal](../../superpowers/plans/2026-10-20-wp02-handoff-proposal.md): explicit current-camera amendment, proposed six-frame list, source/access/approval and WP-03 asset prerequisites; no external authoring or exports performed.

A53.72MiB portable technical candidate was created with26 SHA-256-verified payload files, including both models and local WASM. Node is required, but no npm install is required to run that package. This is a local candidate, not a release certification.

## Current-revision verification

| Check | Result | Evidence class and limits |
|---|---|---|
| Node suite |173/173 PASS;0failed;0skipped | Automated; final fresh run, not physical acceptance |
| Production build/typecheck |PASS | Automated; existing large-Phaser-chunk advisory retained |
| Results STOP target |2/2 PASS | Real DOM/CSS pointer hit testing at720p/1080p;44px; not a full round by itself |
| Hand movement |2/2 PASS | Synthetic video/fake worker; actual robot displacement and tuning; not model accuracy |
| Camera lifecycle |13/13 PASS | Injected disconnect/error, consent withdrawal, late permission cleanup and keyboard blur |
| Native browser permission revoke |3/3 PASS | Native Chromium getUserMedia and CDP permission changes, built-in fake camera and fake model; no physical webcam |
| General camera matrix |10/10 PASS | H0/P1/P2 layouts/safety/keyboard fallback; synthetic worker |
| Real SDK cold starts |3/3 PASS | Actual packaged SDK/model/WASM, generated video without people; three fresh browser launches |
| Preview/recovery matrix |8/8 PASS | Both Pose schemes, Solo/Co-op,720p/1080p; synthetic worker; corrected pixel prerequisite |
| Delayed-Pose matrix,130ms worker |2PASS, then1FAIL;5not reached | Current production Co-op lost continuity after two Solo passes; remains a blocker |
| Start/stop cycles |10/10 completed | Fresh pages; synthetic camera/worker/bitmap; not ten continuous camera sessions |
| Full-round timer/results/replay |10/10 completed | Five two-round sessions using the unchanged60000ms production timer; wall times60.19–64.56s |
| FIELD templates |INCOMPLETE; expected CLI exit2 | No measured physical rows;9validator tests passed |

Raw measurements and failed attempts are retained under [evidence](evidence/current-checkout-baseline.json), including [the delayed-Pose failure](evidence/delayed-pose-failure.json), [corrected recovery results](evidence/pose-recovery.json), [endurance records](evidence/endurance.json), [native permission records](evidence/native-permission.json) and all three SDK traces.

The endurance PASS covers its asserted timer/results/replay/resource lifecycle only. **Five of the six Pose rounds ended with `recalibrationRequired=true`.** It does not establish continuous camera control or close G2. Heap samples vary with GC and are not a memory-leak certification. Ten completed production timers are not a precise wall-clock performance certification.

The initial preview fixture checked for amber pixels immediately after CALIBRATE became enabled. Current UX intentionally enables that button before detection. The corrected fixture waits for actual pixels and passed8/8. The earlier fixture failure is preserved separately, not described as a resolved physical-camera issue.

The general camera matrix captures screenshots after control assertions; capturing an image can pause software-rendered automation beyond the safety deadline. Its stall assertion verifies neutral input during WAITING_FOR_FRAME followed by bounded CPU failure to keyboard, matching the current contract. Earlier failures are retained. No application deadline was weakened to make tests pass.

SDK cold starts use actual local packaged resources with remote origins blocked, generated video and no people. Traces show GPU initialization followed by bounded CPU recovery and actual results. They establish local pipeline readiness, not body tracking, precision/recall, physical latency, target-laptop GPU performance or disconnected-Wi-Fi acceptance. Historical recorded-body full-game failures were not reproduced under equivalent input conditions here.

## Remaining Pose timing blocker

A bounded65-second Co-op diagnostic used the current production package, generated video and a fake130ms worker. The **actual browser renderer** was `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)`; the worker's GPU label was simulated and is not hardware GPU evidence.

The trace recorded389captures, six capture gaps>=250ms, a maximum capture gap365.2ms and maximum result age343.9ms. At a representative gap, the previous result was already276.4ms old when delivered and the next capture followed about2.2ms later. This does not support assuming that simply pumping another frame earlier would make the stale result safe. Main-thread long tasks overlapped the delayed delivery; maximum recorded long task225ms, maximum pump gap212.6ms and maximum notification duration6.2ms.

[Raw long trace](evidence/pose-profile-long.json) and [CPU profile](evidence/pose-coop.cpuprofile) are retained. Profiling/instrumentation can perturb timing. The CPU profile's `(program)` samples are unassigned sampled elapsed time, not measured OS CPU time or proof of a single guilty component. A preceding12-second Solo/Co-op probe did not reproduce>=250ms capture gaps; that does not erase the longer failure.

Observed result: this Cloud software-rendered execution can miss the required deadline, and input correctly neutralizes/requires calibration. The specific contributions of browser/native rendering, VM scheduling and other overhead were not fully isolated. No target-device inference is made. The250ms cutoff, capture continuity and explicit recalibration rules remain intact; no speculative architecture or timeout change was applied.

## Independent evaluation

A distinct read-only reviewer independently executed camera/mapper/FIELD108 focused tests at its first checkpoint. It found two FIELD P2 issues, then independently verified their9/9 corrected tests. It also found the packaging alias P1 and independently verified the corrected3/3 packaging tests, zero skips. No remaining actionable finding was reported in those reviewed camera/operations scopes. The distinct reviewer additionally inspected the CSS correction, native permission harness, launch options, documentation links and existing production artifacts. A test-JSON height-classification P2 was corrected; both saved production measurements are44px and satisfy every current condition. Final closeout consistency review: PASS for local patch/evidence only; see [independent evaluation](independent-review.md). G2 remains BLOCKED/REVISE.

Self-review and the77-file preservation audit are separate evidence; automated checks do not count as independent evaluation. Physical/browser performance was not independently certified by that reviewer.

## G0–G10 disposition

These statuses follow the available local gate record and latest user scope instruction. They do not claim independent verification of the original master archive or invent a new gate definition. Full per-gate evidence and missing items are in [status.json](status.json).

| Gate | Current disposition | Evidence or unmet condition |
|---|---|---|
| G0 |TECHNICAL PASS; original identity unverified |151-file verified pre-edit snapshot; current rebaseline;77protected files and HEAD unchanged. Historical CV02 governance note retained |
| G1 |PARTIAL |Executed Node/lifecycle/native-revoke cases passed; complete original matrix/physical and actual background-tab behavior not certified |
| G2 |BLOCKED / REVISE |Delayed production Pose failure and endurance recalibration remain despite passing other browser cases; SwiftShader timing trace retained |
| G3 |PHYSICAL NOT RUN; preparation ready |Runbook/templates/checker ready; no physical CSV measurements |
| G4 |PENDING HUMAN CHOICE |No field-evidence-based booth scheme choice made |
| G5 |BLOCKED scope/access/approval |Local proposal only; no Stitch tool/editor inventory/specific authoring acceptance; no external write |
| G6 |BLOCKED G4/G5 |Approved asset and integration prerequisites unmet; no WP03 integration |
| G7 |NOT RUN / NOT AUTHORIZED |Dependent work not executed or certified; no ARC01 runtime changes |
| G8 |BLOCKED mechanics specification |No approved mechanics for Duo Circuit,Cool the Core or Final Boss; no Round2/future code |
| G9 |NOT RUN; dependencies blocked |No later-round implementation/QA acceptance fabricated |
| G10 |NOT RELEASE CERTIFIED / NOT AUTHORIZED |Technical local package only; no release/publish/commit/push/merge/deployment |

STAB-01 local implementation/regressions and FIELD-01 preparation are the active authorized scope. WP02Stitch writes, WP03integration, ARC01runtime, future-round mechanics and release were not started. The previously prepared local package/tooling is retained as engineering preparation, not execution or acceptance of OPS-01/release.

## Reproduction

The package was independently checked against every final-build payload byte after a fresh successful build. It includes26 SHA-256-verified payload files; the verified ZIP is22.30MiB. Local candidate is not release certification. [Operating guide](../../operations/booth-local.md) lists the build/package and browser commands.

Additional native permission command, using an already installed Playwright and browser:

```sh
CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node tests/browser/native-permission-smoke.mjs OUTPUT http://127.0.0.1:4173 /existing/node_modules
```

The Cloud diagnostic source is retained as [profile-pose-long.mjs](evidence/profile-pose-long.mjs). It contains the explicit Cloud workspace/module paths and requires the local package server on4173. This is a diagnostic reproduction, not a portable physical benchmark.

Automated verification consists of commands, assertions, hashes and raw records. Self-review consists of source/scope/evidence reconciliation. Distinct independent evaluation is limited to the named reviewer's executed focused tests and read-only artifact evaluation; it does not replace browser execution by that reviewer or physical/human acceptance. Live rollback restoration rehearsal was NOT RUN; snapshot byte parity was verified.

The user supplied a Windows ZIP path and then `Reactor_Rush_Master_Roadmap_v3_RECONSTRUCTED_2026-10-20.zip` as a chat attachment. Parent and independent-agent `download_file` attempts both failed **before returning any path**, with `cannot create attachment directory: Read-only file system (os error30)`. No archive contents were read or executed. The reconstructed document therefore cannot be used as evidence of additional mechanics or historical approval; the user's subsequent explicit chat instruction is the current scope authority. The missing original archive does not authorize or require guessing mechanics. Available local records and current execution evidence remain the source for the gate report.

No Git commit/push/merge, public deployment, release, Stitch write, final art approval or physical result was performed or fabricated.

Closeout timestamp: 2026-10-21T00:22:33.056440+07:00 (Asia/Saigon).
