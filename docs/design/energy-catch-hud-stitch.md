# Energy Catch HUD — Stitch reference

- Stitch project: https://stitch.withgoogle.com/projects/7998219093435398329
- Screen: Reactor Rush: Energy Catch - Arcade Gameplay HUD
- Design canvas: 1280 × 720 (16:9), confirmed in the selected Stitch screen
- Exported: 2026-10-17
- This is a visual reference export. It does not replace or modify the Phaser HUD or approved character rigs.
- The HTML uses the generated screen styles and may load fonts or styling from external Google resources.

## Gameplay values represented

- Round: 60 seconds; preview moment shows 00:44 remaining.
- P1: score 1,840; combo 4; multiplier 1.0×; A/D move and S catch.
- P2: score 1,620; combo 3; multiplier 1.0×; Left/Right move and Down catch.
- Energy catch: +100 base; each fifth consecutive catch increases that player's multiplier by 0.5×, to 3.0× max.
- Hazard catch: −50 and that player's combo resets. Misses have no penalty.

## Review status

The current exported HTML contains the MVP values and control labels. A text audit found none of these obsolete labels: kWh, team energy, Overdrive, Stabilizer, Perfect bonus, Magnet, or −200 hazard penalty. The artboard is a static design reference; gameplay behavior remains in the Phaser application.
