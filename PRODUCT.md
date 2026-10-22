# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users and operating context

The project design brief targets walk-up STEM Fair players using a local laptop/16:9 display, in Solo or two-player Co-op. This audience/context is inherited from DESIGN.md and ART_BIBLE.md, not a new field-research conclusion. User instruction on 22 October 2026 delegates discovery and local development choices to the agents.

## Product purpose

Reactor Rush is a short arcade mission played with keyboard or optional calibrated webcam gestures. Its implemented campaign connects Energy Catch, Duo Circuit and Cool the Core, with deliberate intros, three 60-second rounds, results and replay. The goal of the current upgrade is a more recognizable and understandable game while retaining the working campaign.

## Capabilities and constraints

- Existing TypeScript, Phaser and Vite application; local-first build with bundled models. Do not add dependencies or remote runtime assets in the current wave.
- Preserve original scoring/timing, campaign state transitions, accepted-release input gates, opt-in camera consent/calibration/recovery/Stop and keyboard fallback.
- Preserve Direction A Cyan/Pink rigs, silhouettes and animation definitions. Any future character/skin work requires its own explicit contract.
- Audio is optional supplemental feedback; visuals and text must communicate every gameplay fact.
- Git commit/push/merge, release/deployment and external Stitch writes remain separate human-controlled actions.

## Brand commitments

Reactor Rush and FU-DEVER are existing project names. The game may receive an original local Reactor Rush mark. On 22 October the user supplied official logo and Buggy originals. Preserve their shape/color/proportions and source provenance. Use the dark logo as secondary club credit and celebration Buggy only on the final screen; the README remote avatar is not the adopted source. FU-DEVER Orchestrator and repository brand-assets guidance were read. Integration review does not imply final art or release approval.

## Evidence on hand

The 21 October campaign report records automated and browser evidence and independent review. Fresh 22 October baseline is 237/237 unit tests and successful typecheck, with a hash-verified snapshot of the dirty working tree. Physical three-round webcam, TV, disconnected-network and endurance acceptance remain separate and unverified.

## Product principles

- Help a first-time player understand the next action from current game state.
- Make cause, success and penalties clear without adding hidden scoring or progression.
- Keep camera safety and the keyboard route dependable.
- Make club provenance and art approval status explicit.
- Choose low-cost local presentation over runtime services.
