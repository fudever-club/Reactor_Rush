# Settings and session controls Implementation Plan

> For agentic workers: execute the approved in-chat package sequentially with test-first checks; root handles evidence and final handoff.

**Goal:** Provide settings and dependable session controls around the existing three-round game.
**Architecture:** Pure volume/preferences and pause-gate helpers; focused DOM Settings controller; scene orchestration without core/adapter/rig edits. GameAudio exposes live volumes and transient pause separately from explicit opt-in.
**Tech Stack:** ExistingTypeScript/Phaser/Vite/WebAudio/DOM; no dependencies.
**Spec:** ../specs/2026-10-22-settings-controls-design.md

## Constraints and reviewfocus
Preserve all mechanics/media/rigs; sequential productwriter; no Git/externalwrites. Check storagegetterfailures, nativeinputrouting, heldS/Down after adapterclear, stale/obscuredcamera release, timerdelta afterpause, modalreplacement/focus, fullscreen rejection and repeatedresetcleanup. All are required behavioralchecks, not just screenshots.

## Task1 — Preferences and audio
Files: new src/gameplay/game-settings.ts (volume validation andstorage), modifiedgame-audio.ts andtests/game-audio.test.mjs, newtests/game-settings.test.mjs. Interface: typed volumes0–100 with default100; GameAudio.setVolumes(values),setPaused(paused),preview(cue) (or equallyfocused documentedinterface). Consumers are scene/SettingsUI; no contextcreation fromsettings reads/writes.
- [x] MeaningfulREDtests: malformed/NaN/outofrange/storagefailure; master0silence/livegains, pausepreservesoptin, previewexplicit andnonewhenoff.
- [x] Implement smallhelpers andaudiointegration; focusedGREEN thenregressions.

## Task2 — Settings, Pause and mission/fullscreen controls
Files: index.html,src/game-style.css,src/main.ts; newfocused src/gameplay/settings-ui.ts andpause-controlhelper ifneeded; tests/camera-ui.test.mjs plusnewfocusedtests/browser/settings-smoke.mjs. Interface: controller emits open/close/resume,restart/menu/default/volume/fullscreen intents; scene owns actualmission/camera cleanup andcurrentstate. Native sliders andsingleactivemodal; no directenginemutation fromUI. Readonlyharnessmayexposepaused/settings/countdown/volumes; nomutators.
- [x] RED scene/controllerchecks forfrozenstate/gatecompletiondiscard/positivekeyup+freshcamera release; reset/cancel/cleanup andfocus.
- [x] Implement UI andsceneintegration, including visibilitypause andfullscreenfailurefeedback.
- [x] Run fullunit/typecheck/build andbrowserfocusedchecks; createonebatched1280/960/narrowvisualevidenceset.
- [x] Run real3x60normalcampaign +camera smoke asneeded, no timercheats; freezeexacthashes.

## Task3 — Independent acceptance andhandoff
Rootdocumentationownership afterruntimefreeze: appendnewcurrentcontrolrules tocampaignspec andscreenflow,roadmap,README; newdocs/reports/settings-controls-2026-10-22.md andthisplan/spec. Do not rewrite historicalapprovals. Reviewer owns externalreportonly.
- [x] Distinct code/spec/browser/visualreview; ≤3correctionbatches and≤2visualpasses.
- [x] Verifyprotectedhashes, doclinks anddiffchecks; separateautomated/selfreview/independent/physicalNOTRUN.
- [x] Package newlocalcandidate, verifyfile/HTTP hashes, openactualgame andleavepreviouscandidatepreserved.

Completed locally on 22 October 2026. Final independent PASS; three correction batches used. Final 271-unit/typecheck/build/15-group Settings checks plus production-package repeat pass. Full campaign/camera evidence predates the last menu-only guard fix as explicitly versioned in the report. No Git/remote/release action.
