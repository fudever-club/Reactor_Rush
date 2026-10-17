# REACTOR RUSH! — Art Bible

**Status:** Direction A selected; P1/P2 cutout rigs are integrated as a local review draft; final art approval and visual tokens remain open · 17 October 2026  
**Applies to:** Cartoon science-lab 2D art for a 1280×720, 16:9 Phaser experience.  
**Approval:** The user selected Direction A. This selects the mascot direction; it does not approve exact geometry, palette values, typography, or runtime assets.

## 1. Visual promise

Make a first-time player feel invited into a playful science experiment. The screen should read as an arcade game from across a STEM Fair room: one clear objective, one dominant reactor focal point, two easy-to-track player mascots, and effects that explain cause and reward. Prefer expressive shape, timing, and contrast over fine surface detail.

## 2. Palette proposal

These values are proposals from the project asset specification. They need team approval and contrast checks on the actual TV before UI use.

| Token | Hex | Proposed role |
|---|---|---|
| `lab-ink` | `#10142C` | Deep lab background, outlines, dark display glass |
| `player-1-cyan` | `#55DFFF` | P1 large shell panels and player marker |
| `player-2-pink` | `#FF78BD` | P2 large shell panels and player marker |
| `energy-yellow` | `#F6D55C` | Collectible energy, reactor charge, small highlights |
| `success-mint` | `#66E5AD` | Positive confirmation and completed-state accent |
| `danger-coral` | `#FF6574` | Hazard and error accent |
| `shell-white` | `#F4F3EE` | Ceramic shell panels and separation from the lab |
| `panel-slate` | `#252B47` | Secondary panels and subdued lab machinery |

Never communicate ownership, status, or an action with color alone. Pair player color with text (`P1` / `P2`), shape marks, position, or iconography. Reserve yellow and coral for small, high-value accents rather than large competing areas.

## 3. Selected character direction and shape language

- Use generous rounded corners and a few deliberate chamfers. Avoid thin antennae, seams, or fingers that disappear at booth distance.
- Give each mascot a large, dark face window and a small set of readable eye shapes. Expressions come from eye geometry and pose; do not add human gender cues.
- Keep neutral ceramic or dark structure between bright player-color panels so the pair remains legible against saturated effects.
- Direction A is selected: P1 is taller and tapered, with a kite-like head, one flexible antenna, narrow torso, spring-like legs, and split feet. P2 is shorter and wider, with a rounded rectangular face, two lateral sensor pods, compact torso, short segmented limbs, and broad magnetic feet.
- Keep the body height and foot baseline of both characters close enough for fair visual comparison. The antenna and sensor pods provide the intentionally different upper silhouettes; color is a secondary cue.
- Draw a stable ground contact or hover shadow as a separate layer where practical. It must not be baked into a transparent character silhouette if that prevents reuse.

## 4. Outline, light, and shadow

- Use a consistent deep-ink outline. As a starting ratio, target about 2–3% of the character’s visible height; check at the intended TV scale before locking pixel values.
- Keep one broad key light from upper-left and a restrained cool rim light. Use warm yellow only for active energy and focal indicators.
- Use a single soft contact shadow under a grounded robot. Avoid multiple hard cast shadows, glossy reflections, bloom halos, and tiny specular marks.
- Preserve a flat, high-contrast face panel. Do not let glow cover the eye shapes or their surrounding outline.

## 5. VFX and motion principles

- Use clear anticipation, a short action, readable recoil, and a quick settle. Keep loops short and avoid constant bobbing that makes screen tracking harder.
- Catch feedback should be a brief burst or ring around the caught object; it should not obscure the player or score.
- Reactor charge should grow in a few large, stable steps rather than a noisy particle cloud.
- Use a small particle budget and screen-space-safe effects. If effects have not been measured on the booth laptop, mark performance **unverified**.
- Provide a reduced-motion path for long menu loops, pulsing borders, and screen shake.

## 6. Screen hierarchy and type

For 1280×720 layouts, keep critical text and controls away from the outer 5% of each edge. Use a system sans-serif such as `Segoe UI`, `system-ui`, then a generic sans-serif fallback. This font choice is proposed; do not load an external font until tested in the target browser/offline build.

- Score, timer, and reactor state are the first-read HUD items. Give each a distinct position and label, not color alone.
- Prefer short action verbs and one instruction per screen. Runtime-render game text so it remains editable and localizable.
- Use tabular numerals for scores and timers. Keep long explanatory copy off the in-game HUD.
- As an initial layout target, use 32–48 px for primary HUD values, 24–30 px for action labels, and 20–24 px for secondary labels at 1280×720. These are starting values, not verified TV legibility results.
- Keep the central playfield clear of persistent HUD panels and effects.

## 7. Character sheet and animation handoff

This is the working reference contract for the selected concept. Confirm final pixel values after a gameplay framing mockup:

- Match front, side, and back views to one shared height, eye line, foot baseline, and shell proportions.
- The existing P1 and P2 Phaser rigs use a shared 320 × 360 canvas, normalized root anchor `(0.5, 0.975)`, and ground baseline `y = 351`. Preserve this current integration contract; exact part pivots are in each rig JSON and the manifest. For a future rig change, specify the anchor and visual ground plane before export rather than silently changing existing values.
- Keep a consistent safe margin of at least 8% of character height around the silhouette. Do not crop antennae, feet, catcher hands, or VFX attachment points.
- Choose final pixel dimensions only after the gameplay camera framing is mocked up. The design brief does not establish one universal sprite size.
- Prefer named frames in a PNG atlas plus JSON metadata. Record animation name, frame IDs, FPS, pivot, and source revision. Do not infer timing from a flattened concept sheet.
- Static pose references now exist for `idle`, `move`, `catch`, `activate`, `win`, and `confused`. They are gesture guides, not animation frames; production timing and interpolation remain undefined.

## 8. Lab environment and composition

- Use a dark navy lab with large recognizable forms: reactor, conduits, panels, and a few science props. Keep decorative detail behind the gameplay layer.
- Avoid text and logos in the background artwork. Render useful prompts in the game UI.
- Separate background, midground, gameplay objects, VFX, and HUD so Phaser can control occlusion and motion independently.
- Maintain a central playfield and safe margins for 16:9 projection. No official FU-DEVER logo has been supplied; use no logo or a plainly labeled temporary placeholder only when a screen mockup requires one.

## 9. Accessibility, privacy, and production guardrails

- Differentiate P1 and P2 through shape, screen position, and labels as well as cyan and pink.
- Keep camera-consent, camera-denied, and keyboard fallback screens calm and explicit. Do not use a live person, face, recording, or biometric data in generated or packaged art.
- Use original shapes; do not reproduce recognizable commercial game characters or logos.
- The three generated sheets are concept references. Before runtime use, redraw/refine the selected design into editable source and export transparent sprites with measured dimensions and verified alpha.
- Source, license, owner, revision, frame metadata, and QA state belong in `assets_manifest.json`. A concept preview is not a `QA passed` runtime asset.

## 10. Current status

Direction A has been selected. The local project contains a playable keyboard Energy Catch MVP and a Phaser cutout integration draft for P1 Cyan and P2 Pink. The animation report records 22 and 23 transparent part exports, editable SVG sources, rig/animation definitions, and Phaser observations for Idle, Move, Catch, and Activate. Win and Confused remain unproduced as runtime animations.

This is not final approved production art: the manifest marks the selected production artwork as unapproved and the relevant rig/part records as `In review`; the animation report calls the pack a functional P0 integration draft. The refined model sheet and six-pose references remain static concept/reference art, not editable masters or sprite sheets. The runtime Energy Catch HUD and phase overlays are distinct from the corrected menu/results Stitch concepts, which the roadmap records as not integrated. A01 could not re-open Stitch during WP-01, so those screen details and dimensions were not freshly verified.

No target-laptop performance, booth-TV contrast or legibility, final-scale silhouette review, or final art acceptance is claimed. The recorded automated-browser frame-rate samples are not a target-device benchmark. See [`docs/design/visual-production-roadmap.md`](docs/design/visual-production-roadmap.md), [`docs/art/animation-production-report.md`](docs/art/animation-production-report.md), [`docs/art/phaser-animation-integration.md`](docs/art/phaser-animation-integration.md), and [`assets_manifest.json`](assets_manifest.json) for the detailed status and evidence.
