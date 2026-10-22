# Reactor Rush — Settings and session controls

Date:22October2026. User approved the in-chat package and explicitly requested implementation. This is bounded extension of existing scene/audio/input flows. Local implementation and validation are authorized; this package does not newly authorize Git commit/push/merge or deployment. Root coordinates one sequential writer and distinct read-only review.

## Scope and invariants
Add Settings, master/music/SFX volume, Pause/Resume, restart whole mission, return to menu and Fullscreen. Preserve DirectionA, officiallogo/Buggy, rigs/animations, media assets, originalscoring,60000ms rounds,900ms initialready, core/challenge/campaign engines, camera consent/calibration/identity/freshness guards and no dependency changes. Practice,records,localization,newaccessibilitypresets andboothautomation remain later proposals.

## Settings and audio
Persistent Settings button beside Sound, including narrowguard and all gamephases; existing camera dialog must not create two active modal/focusloops. Settings uses labelled native sliders0–100, live percentages and master/music/SFX controls. Default each100 retains existing calibrated basegain(.18music/.28jingle/.45samples). Master multiplies both music and SFX; changing sliders affects currentlyplaying music and existingSFXgains without creating/resuming context or starting sounds. Sound enabled state remains explicit and OFF onpage load. A labelled TestSFX action is enabled only after explicit Sound activation.

Remember only finite sanitized volume preferences under a versioned local-storage key; clamp0–100, ignore malformed/unsupporteddata, and catch getter/read/write failures. Never persist camera consent/calibration, camera data, mission state or audioenabled. Restore defaults resets only volume preferences; it cannot reset points/camera or enable Sound. Native slider arrows andSpace/Enter work without gameplay shortcuts. Focus stays in the active dialog, Esc cancels confirmation before closingSettings, and focus returns coherently.

## Pause and resume
Opening Settings during timedplay or readybeat freezes game simulation BEFORE input read, advanceGameFrame, movement, items/spawn, challenges/heat/holds, scores and campaign snapshots. Preserve underlyingengine phases/state. Freeze cosmetic tweens/scene timers using saved timescales so their clocks cannot accumulate a pause-gap. Camera remains live and Stop remains available inSettings; no permission/model restart. Menu/intro/results Settings do not require a timedresume.

Resume from activepause has an independent900ms readygate, outside pausedPhaserClock. Skip the entire gatecompletion frame; no paused delta or gateoverflow enters simulation. Reset lastInputneutral and releaseSeenfalse. A physical S/Down held throughpause must never be considered released merely because keyboardadapter was recreated/cleared: capture actual actionkeydown/keyup acrossmodal or equivalent positivekeyupwitness. Camera continues the current accepted per-player release test, including visiblegesturelandmarks. Do not collect release duringpause/countdown or from stale/safetyneutral frames. Native range interactions must not feed the globallylistening keyboardadapter. Visibility loss duringactiveplay/countdown enters explicitpausedstate; returning does not advanceclock or resume sound/game automatically. Existing hidden-document SoundOFF policy remains.

Transient gamepause pauses music/stopsgameplayvoices while preserving Soundopt-in and volume values. Resume only follows explicit userResume, afterreadygate; no AudioContext.resume from a preference update or hiddenreturn. Explicit SFXpreview works whilepaused ifSoundalreadyenabled.

## Mission controls
Restart Mission clears all three-round results/currentpoints/challenge/items/positions/spawn and opens round1intro, preserving Solo/Coop and selected currentlyopted-in camera/keyboardsession; freshrelease required and no automaticStart. Return toMenu clears mission, stops camera stream/workers and audio, selectskeyboard, restoresStartfocus; volumes remain. During an unfinishedrun both actions require one explicit inlineconfirmation inSettings; Cancel preserves allstate andpause. Completed/menuactions do not needabandonconfirmation. Existing Next/Replay/finalMenu behavior remains.

## Fullscreen
Explicit button requests/exits fullscreen on the gameframe, updates onfullscreenchange, preserves16:9 letterboxing and does not alter score/timers/camera. Handle unsupported/rejectedrequests with readable status, no falsefullscreenlabel. Escape and browserexit remain valid; no permissionworkaround. Check actual supportedbrowserentry/exit and rejection paths.

## Acceptance
Baseline260unit+typecheck0. TDD volume validation/storage/zero/livegains/pause/previews and realscene gate/reset/release tests. Fullsuite,typecheck,build pass. Browser covers1280/960 layouts+narrowSettings, native sliderarrows/focus/Escape, actual frozen timer/heat/items and no catchup, heldkeyboard/camerarelease, confirmations, cameraStop, reloadpersistencewithoutautoplay, fullscreenentry/exit/rejection, mute/unavailable/storagefailures. A real3x60scampaign validatesnormalflow afternewgates withouttimercheats. Maximum3correctionbatches. Onebatchedvisualinspection then atmostoneconfirmationpass. Distinctreview;physicalcamera/TV/audibility remainNOTRUN unlessactuallytested. Separate portablecandidate andshowresult; preserve old4186.

## Implementation status — 22 October 2026

Runtime frozen after three correction batches. Final automated checks pass (271 tests, typecheck, build and 15 Settings browser groups). Distinct review found the narrow-menu Restart bypass; final correction preserves the existing 960px menu-start guard while allowing restart in an already active resized session. Final independent reevaluation and local package handoff are tracked in the [implementation report](../../reports/settings-controls-2026-10-22.md). No additional mechanics or assets are introduced.

Final independent reevaluation PASS, no open mandatory findings. Portable package and final Settings browser repeat PASS; evidence classes and physical NOT RUN limits remain explicit in the report.
