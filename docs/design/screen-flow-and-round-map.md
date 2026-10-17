# Screen Flow and Round Map

**Status:** Design handoff; current runtime and concept status are labeled separately.  
**Canvas target:** 1280 × 720 (16:9).  
**Gameplay authority:** [`Energy Catch — Playable MVP`](../gameplay/energy-catch-mvp.md).  
**Production status:** [`Visual Production Roadmap`](visual-production-roadmap.md).

## Purpose and boundary

This document describes the screen hierarchy for the current Energy Catch MVP and the intended presentation of later-round availability. The gameplay flow below follows the local gameplay specification. Screen concepts recorded in the roadmap remain concepts unless the runtime and manifest show an integrated export. A01's current Stitch audit is blocked, so the Stitch screen list and frame dimensions were not freshly verified in this handoff.

This document does not add round rules, rewards, player modes, or transitions. Anything not already specified in the Energy Catch source is marked as a visual proposal.

## Current Energy Catch flow

```text
MENU / current start screen
  └─ Enter → PLAYING (Energy Catch, 60 seconds)
       └─ countdown ends → RESULTS
            └─ R or Enter → RESTART / short ready beat
                 └─ ready beat ends → PLAYING (new round)
```

The game source describes Enter as starting from the menu and R or Enter as resetting the scorecards and starting another round after a short ready beat. Exact scoring, controls, timer, and item rules remain authoritative in the [gameplay specification](../gameplay/energy-catch-mvp.md); they are intentionally not duplicated here.

| Screen/state | Current status | Visual hierarchy and guidance |
|---|---|---|
| Menu / Start | A menu start state is part of the current local game flow. The roadmap records a corrected Start / Attract Stitch concept, but A01 could not reopen Stitch to verify it. | State the Energy Catch objective and Enter action clearly. Keep P1 Cyan and P2 Pink identifiable by labels and silhouettes as well as color. Treat any richer attract loop or Stitch layout as concept-only until integrated. |
| Energy Catch gameplay | Playable keyboard MVP, as documented in the gameplay source. | Keep the two player lanes, falling objects, scores, timer, combo, and reactor state visually distinct. Energy and hazard shapes are current Phaser placeholders, not final art exports. |
| Round Complete / results | The runtime has a results transition. The roadmap records a corrected Round Complete concept and a celebration storyboard; A01 could not verify those screens. The concept/result numbers are not runtime evidence. | Make each player's result readable before celebration detail. Do not copy sample values from a static concept into runtime. Treat celebration artwork as a storyboard, not an animation asset. |
| Restart / ready beat | Runtime behavior is documented: R or Enter resets both scorecards and starts after a short ready beat. | Use a short, readable transition that does not obscure the score reset. This row describes presentation of existing behavior, not a new rule. |
| Round map | Visual-only proposal; no active round-map navigation is claimed. | Communicate availability labels explicitly. Do not imply that selecting a later round starts a playable mode. |

## Round availability map

| Round | Availability | Screen treatment |
|---|---|---|
| Energy Catch | **Playable MVP** | The only currently documented playable round. Use the existing science-lab playfield as the visual anchor. |
| Duo Circuit | **Conditional / concept** | May be shown as a future possibility only. No objectives, mechanics, schedule, or production map are approved. |
| Cool the Core | **Conditional / concept** | May be shown as a future possibility only. No objectives, mechanics, schedule, or production map are approved. |
| Final Boss | **Future placeholder** | Keep visibly unavailable or labeled as a future placeholder. No encounter, mechanics, or release commitment is approved. |

Any player-facing round-selection or progression layout is a visual proposal until round order, availability, and mechanics receive their own approval. Do not connect it to the current runtime flow by implication.

## Visual and motion guidance

- Preserve Direction A / Orbital Buddy for P1 Cyan and P2 Pink. Do not redesign the existing character rigs or animations.
- Keep gameplay-critical labels and controls inside the 1280 × 720 safe area and readable at a distance. The actual TV legibility and booth-hardware performance remain unverified.
- Use shape, text, and position alongside color to distinguish players and states.
- Keep the central playfield clear. Show catch feedback without covering the robot, item, or score.
- Provide a reduced-motion option for long menu loops, pulsing borders, and screen shake. Celebration VFX should remain brief and must not hide result values.
- Render gameplay text at runtime. Do not bake scores, instructions, or a logo into concept art.

See [`ART_BIBLE.md`](../../ART_BIBLE.md) for shared art and accessibility rules and [`asset-coverage-and-handoff.md`](asset-coverage-and-handoff.md) for asset status and integration handoff.

## Evidence boundary

- The local roadmap records corrected Start / Attract and Round Complete concepts and a round-environment mood board in the Stitch project. This is a report from the existing project documentation, not a fresh A01 observation.
- A01 was attempted read-only on 2026-10-17 but returned a Stitch shell with “Sign In” and “Sorry, we hit a snag.” No project screen names or dimensions were visible. See the WP-01 evidence package for the audit record.
- The roadmap's prior 1280 × 1024 Desktop preview versus 1280 × 720 content label remains unverified. Do not call the Stitch board a verified 16:9 export.
- A static concept or storyboard is not a Phaser screen, animation, or production-ready sprite sheet.
