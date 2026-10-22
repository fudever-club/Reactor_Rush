# Reactor Rush — Arcade identity and feedback upgrade

Date: 22 October 2026. Scope: first local production wave selected through three read-only discovery agents. Authorization: the user's current request explicitly delegates discovery, design choice and local development, without requiring a decision at each stage. This records that delegation; it does not authorize Git writes, release/deployment or external Stitch production.

## Intent and choice

Make the existing three-round game feel identifiable and make the next action understandable. Choose Mission Patch Lab: expand the existing navy science lab, ceramic Direction A robots and Cyan/Pink player identity with an original reactor/orbit mark, distinct apparatus shapes and action feedback. The alternative Field Notebook Lab was considered but its dense annotations are less suitable for walk-up/distant reading. Longer-term practice, saved records, new shared Co-op mechanics and cosmetics stay proposals rather than current rules.

## Visual presentation

- Give the live REACTOR RUSH title visual priority on the menu, with an original local game symbol reused as favicon/results seal. Keep the title/text live, existing system typography and local-only asset graph. This is not an official FU-DEVER logo.
- Add three editable SVG apparatus assets for energy chamber, circuit relay and cooling radiator; distinctive shape and label, not color alone. Reuse them in the existing route/intro. Keep the pack at or below 50 kB, without filters, remote references or perpetual decorative animation.
- Distinguish circuit connectors/traces from cooling valve wheels/radiator geometry in gameplay. Background landmarks stay behind the gameplay; no robot/target/camera/HUD occlusion. Static shapes can be created once, dynamic label/meter objects reused.
- Existing 1280x720 and 960x540 landscape layouts retain 5% critical safe margins. Solo excludes inactive P2 cues; Co-op shows both players. No new Win/Confused animation or altered rig silhouette.
- Intro presents three concise action steps with authored icons/diagrams and actual selected keyboard/H0/P1/P2 meanings, including release gating. Results get restrained completion treatment, no invented rank thresholds or medals.

## Coaching and event feedback

The gameplay specification remains authoritative for mechanics. A presentation helper consumes the existing challenge view, actual zone mapping and releaseSeen. For each active player, the priority is release-to-arm first; during cooling overload always RELEASE/WAIT; otherwise MOVE TO LEFT/MIDDLE/RIGHT when outside target, HOLD n% when correctly positioned. Circuit needsRelease must continue to request release. Do not infer a fresh release from neutral camera input.

Cooling phase countdown is derived from challenge.elapsedMs modulo 6000: SAFE first4000ms then OVERLOAD2000ms, displayed with words and a rounded-up remaining-seconds value. It never changes engine time and stops outside playing. Avoid per-frame DOM writes when the visible string is unchanged.

Use actual connect/circuit/cool/overload events and actual Energy Catch score deltas for concise action-specific visual/text feedback. Feedback must not award or recompute points. Coalesce an event batch per player (a circuit completion can combine socket and circuit bonus) and announce bounded event messages through the existing polite live region, never per-frame progress. Preserve actual score floors: overload may cost0 when already at0. No hidden multiplier/rank.

## Optional local audio

Add short locally synthesized WebAudio cues for those actual events and completion. Sound starts OFF. Only explicit sound-toggle activation may create/resume an AudioContext. No autoplay, music, download, permission or dependency. Sound remains supplemental and can be muted from all game phases without starting/advancing the campaign through Enter/R bubbling. Prefer no persistence in this first wave; a new page starts OFF. Unsupported/rejected AudioContext falls back silently with an honest unavailable state, gameplay unaffected. Bound voices to4, duration to450ms and cue triggers to actual events with coalescing/throttling; avoid delayed buildup. Mute, hidden document and return-to-menu stop active/queued sounds; hidden state does not cause auto-resume without an explicit toggle.

## Final navigation and accessibility

Add final-only MISSION MENU alongside Replay. It explicitly stops camera, tears down workers/streams, returns keyboard input, resets campaign/challenge and release gates and restores menu focus. Preserve Next and Replay behavior. No pause/resume or fullscreen in this wave.

Update metadata/game accessible name to three-round Reactor Rush. Derive canvas/playfield description from current round, active players and selected control meanings; Solo omits P2. Keep all original camera assertions and native-control key-routing behavior.

## Assets and provenance

Create assets/brand/reactor-rush-symbol.svg, assets/ui/round-energy.svg, round-circuit.svg and round-cooling.svg; the symbol can also serve as favicon. Source and export are the same editable SVG files with measured viewBox, dimensions, transparency and byte counts. Append records to assets_manifest.json and matching public/assets_manifest.json, leaving every pre-existing record unchanged. New status In review; authoring provenance original local vector artwork by Codex for the project, human final-art acceptance pending. No trademark/ownership/legal approval is inferred.

Official FU-DEVER dependency was resolved by the user on 22 October: original logo and Buggy directories supplied. Use the actual dark-context logo FU_DEVER_Logo_White_Layers_Red_Accent.png and celebration sticker9.png. Preserve byte-exact originals at assets/brand/source/fu-dever-dark-original.png and assets/mascot/source/buggy-celebrate-original.png. Derived runtime PNGs assets/brand/fu-dever-dark.png and assets/mascot/buggy-celebrate.png may only trim transparent outer bounds, scale proportionally and pad; no redraw/recolor/stretch. Max512px edge and combinedruntimePNG≤300000bytes. Logo is secondary menu/final club credit; Buggy appears only at campaign complete. Append two runtime manifest records with source/export hashes and transform metadata. Read FU-DEVER Orchestrator plus official repository brand-assets/rule-hierarchy guidance; brand truth is binding, poster/QR/PPTX-specific checks are N/A for this game. No API keys or remote runtime assets.

## Acceptance and evidence

1. Fresh baseline237/237 preserved; new meaningful tests prove coaching priority/zone/phase boundaries, event presentation without stats mutation, audio unavailable/rejected/voice cap/mute cleanup, final-menu reset/cleanup/focus and input-aware labels. No synthetic timer mutation.
2. Typecheck and production build pass. All previously protected adapters/workers/core/campaign/challenges/release guard/rigs/models/dependencies remain hash-identical. Existing manifest records remain byte-equivalent as objects and served manifest equals root.
3. Browser verifies explicit sound control/state without claiming audibility, actual positive Energy Catch score/feedback, full real3x60s campaign exact totals and Replay, then a second real3round campaign for the final Menu action, Solo/Co-op/landscape, and preserved camera Stop. Sound-toggle Enter cannot start/replay the game.
4. One batched visual inspection of menu/intro/three arenas/final at1280x720 and960x540 including Co-op; fix findings as a single batch, then at most one confirmation pass. Impeccable detector once after final UI implementation; triage every reported result against pinned project art direction.
5. Distinct independent code/spec/asset/visual review. At most3 Dev-to-QA correction batches; final physical webcam/TV/audible quality/performance remain NOT RUN unless actually tested.
6. Preserve the existing Downloads candidate/server4181 as reference. Deliver this wave as a separate new local candidate and show it; no Git or deployment actions.

## Handoff responsive addendum — 22 October 2026

The actual default in-app browser pane is354x600, below the960px minimum landscape acceptance width; its legacy minimum text/button sizes overlap. Use the remaining third correction batch for a functional menu-only narrow-window guard. Below960px viewport width, replace the visible/focusable menu contents with clear guidance to widen the landscape window to at least960px. Keep Sound, camera modal/Stop and non-menu phases untouched. A minimal handleStartRequested menu-width check must also prevent body Enter from bypassing a CSS-hidden Start. No fullscreen, automatic resizing, mobile gameplay, art redesign or engine/input changes. Verify354x600 blocked Start/body Enter,960x540 and1280x720 normal Start, and preservation of non-menu camera controls. This is responsive handoff verification; the completed two-pass art inspection is not reopened. Narrow-window gameplay remains unsupported.
