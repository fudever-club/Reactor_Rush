# Reactor Rush — Visual Production Roadmap

**Status date:** 2026-10-17  
**Purpose:** Separate assets already running in the MVP from UI concepts, art references, and future-round proposals.

**WP-01 Stitch audit A01:** `BLOCKED` on 2026-10-17. The current Edge session showed Stitch's Sign In control and “Sorry, we hit a snag”; no project screens or dimensions were visible. This work package made no Stitch edits or exports. The audit evidence is kept with the external WP-01 evidence package. Do not treat earlier local observations below as freshly verified by A01.

**Work-package boundary:** WP-01 covers documentation, project skills, and this read-only Stitch audit. WP-02 covers visual production in Stitch and requires separate explicit approval before any canvas edit, export, or publish. WP-01 authorizes none of those writes.

## Current source of truth

- **Art direction:** Direction A / Orbital Buddy, navy science-lab UI, 1280×720 target. Keep approved P1 Cyan and P2 Pink designs unchanged.
- **Playable mode:** Energy Catch, 2-player keyboard co-op, 60 seconds. Current controls are P1 A/D + hold S and P2 Left/Right + hold Down.
- **Round scope:** Energy Catch is the current MVP. Duo Circuit and Cool the Core are conditional follow-ups after the G2 gate; their gameplay mechanics are not specified. Final Boss is a future concept without an approved gameplay spec.

## Asset status

| Area | Verified state | Production status |
|---|---|---|
| P1 Cyan rig | 22 transparent PNG parts, editable SVG, rig and animation definitions | Functional P0 cutout integration draft; the production report records Idle, Move, Catch and Activate Phaser observations. Manifest parts remain `In review`; not final approved art. |
| P2 Pink rig | 23 transparent PNG parts, editable SVG, rig and animation definitions | Functional P0 cutout integration draft; the production report records Idle, Move, Catch and Activate Phaser observations. Manifest parts remain `In review`; not final approved art. |
| Gameplay energy and hazard | Drawn with basic Phaser shapes | Functional placeholders, not final art exports |
| Runtime menu and round results | Energy Catch has a local menu/start flow and results phase. Local documentation records corrected Start / Attract and Round Complete concepts in Stitch. | The recorded Stitch concepts are not integrated into Phaser; result numbers are sample data; celebration art is a VFX storyboard, not runtime animation. A01 could not freshly verify the Stitch project. |
| Win and Confused | No runtime animation produced | Awaiting production |
| Lab background and environment props | No dedicated production export verified in the asset manifest | Awaiting art production or explicit acceptance of current in-game treatment |
| Other-round environments | Internal Stitch mood board for Duo Circuit, Cool the Core, and Final Boss | Visual proposals only; no production maps or gameplay specs approved |

**Canvas-size check:** prior local documentation records the environment-board content as labeled 1280×720 and the selected Stitch Desktop preview as 1280×1024. A01 could not access the project to recheck either value. Treat the board as a concept, not a verified 16:9 export, until the target frame/export is directly confirmed.

**Draft hygiene:** prior local documentation reports first Start and Round Complete drafts with unsupported labels/mechanics. A01 could not freshly verify the project contents; until a read-only review is available, do not treat those earlier drafts as approved UI or export them as approved screens.

## Round world board

The round-map design must communicate status without implying that conditional modes are already playable or scheduled:

1. **Energy Catch — Playable MVP.** Use the current lab as the established visual anchor.
2. **Duo Circuit — Conditional / concept.** A circuit-workshop visual can be explored; do not invent objectives or rules.
3. **Cool the Core — Conditional / concept.** A cooling-lab visual can be explored; do not invent objectives or rules.
4. **Final Boss — Future placeholder.** No mechanics, encounter, or release commitment is approved.

The three future locations are art-direction proposals, not game maps or feature commitments. Any player-facing selection/progression screen must be revisited when round order, availability, and mechanics are decided.

## Next production sequence

1. Review the corrected Start / Attract, Round Complete, and environment mood concepts; keep them labeled as concepts until Phaser integration.
2. Confirm a real 1280×720 export for the environment board. Prior local records report a 1280×1024 Desktop preview; A01 was unable to recheck the project or establish export dimensions.
3. Export/author lightweight lab background and gameplay item art, then test transparent edges, crop bounds, display scale, and file size.
4. Integrate menu/results and restrained reduced-motion celebration after their layouts are accepted.
5. Produce Win and Confused poses/animations only after the four gameplay states remain stable.
6. Revisit conditional rounds only after G2 and a written mechanics brief.

## Evidence references

- [Animation production report](../art/animation-production-report.md)
- [Energy Catch MVP](../gameplay/energy-catch-mvp.md)
- [Screen flow and round map](screen-flow-and-round-map.md)
- [Asset coverage and handoff](asset-coverage-and-handoff.md)
- [Current HUD concept export](energy-catch-hud-stitch.html)
- [Stitch project — UI and environment concepts](https://stitch.withgoogle.com/projects/7998219093435398329)
- Runtime character sources: `assets/characters/p1-cyan/` and `assets/characters/p2-pink/`
- Runtime manifest: `../../assets_manifest.json` (mirrored to `../../public/assets_manifest.json`)

