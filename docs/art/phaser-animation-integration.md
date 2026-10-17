# Reactor Rush P0 — Phaser integration

## Production choice

Use **2D cutout animation for P0**. Each pose reuses 22 P1 or 23 P2 transparent part textures; the editable SVG remains the art source, while `animations.json` stores short transform keyframes. That is a practical fit for a 1–2 week pass on four front-facing states and makes palette, proportion, and timing changes cheaper than redrawing every frame.

Frame-by-frame sprites would give cleaner redraws for extreme squash, overlapping hands, or effects that change silhouette. They would also need many more individually authored and reviewed frames for two characters. Keep it as a later hybrid option for short impact/energy effects if the cutout joints show at game scale. The current pose-reference board is still reference art; it is not a runtime sprite sheet.

## Files

- `assets/characters/p1-cyan/source/rig.svg` and `assets/characters/p1-cyan/rig.json`
- `assets/characters/p1-cyan/animations.json` and `assets/characters/p1-cyan/parts/*.png`
- `assets/characters/p2-pink/source/rig.svg` and `assets/characters/p2-pink/rig.json`
- `assets/characters/p2-pink/animations.json` and `assets/characters/p2-pink/parts/*.png`
- `src/rig.ts` contains the shared Phaser loader and cutout runtime.
- `assets_manifest.json` lists source groups, PNG crops, pivots, animation definitions, and review status.

The SVG groups are the editable vector masters. The exported parts are PNG-32 with transparency. P1's antenna and P2's paired sensors follow their respective approved model references.

## Coordinate contract

Both rigs use a **320 × 360 authoring canvas**. Root anchor is `(160, 351)` or normalized `(0.5, 0.975)`; the shared ground baseline is `y = 351`. Each part's `bounds` are its crop in rig coordinates, and `pivot` is the joint/rotation point in the same global rig coordinates. `CutoutRig` converts that global pivot to the PNG's Phaser origin and local container position.

P1 has 22 layers and P2 has 23. P1's face states are separate transparent layers; P2 also has `face-activate`. Orb and activation-ring parts are state-specific accessories. The test scene uses root `(640, 570)` at scale `0.83` in a 1280 × 720 Phaser canvas.

## Add a rig to a Phaser scene

```ts
import Phaser from 'phaser';
import p1RigJson from '../assets/characters/p1-cyan/rig.json';
import p1AnimationJson from '../assets/characters/p1-cyan/animations.json';
import { CutoutRig, preloadRig, type RigSpec, type AnimationSet } from './rig';

class GameScene extends Phaser.Scene {
  private character?: CutoutRig;

  preload(): void {
    preloadRig(this, p1RigJson as RigSpec);
  }

  create(): void {
    this.character = new CutoutRig(
      this,
      p1RigJson as RigSpec,
      p1AnimationJson as AnimationSet,
      640, 570, 0.83
    );
    this.character.play('idle');
    this.input.keyboard?.on('keydown-C', () => this.character?.play('catch'));
    this.input.keyboard?.on('keydown-A', () => this.character?.play('activate'));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.character?.destroy());
  }
}
```

`preloadRig` resolves PNG URLs through Vite's static asset graph, so textures are emitted as hashed PNGs or embedded as data URLs in a production build. `CutoutRig.play(name)` accepts `idle`, `move`, `catch`, or `activate`. Idle and Move loop; Catch and Activate run once and return to Idle. Completion is available in `stateHistory` and through the optional state callback.

The runtime uses a Phaser Container for the part hierarchy and Phaser Tweens to interpolate authored keyframes. See the [Phaser Containers guide](https://docs.phaser.io/phaser/concepts/gameobjects/container) and [Phaser Tweens guide](https://docs.phaser.io/phaser/concepts/tweens).

## Build and run

```powershell
npm install
npm run assets:export
npm test
npm run build
npm run preview -- --port 4173
```

`assets:export` writes the PNGs and synchronizes `assets_manifest.json` with `public/assets_manifest.json`, which the demo links at runtime. The production preview is available at `http://127.0.0.1:4173/`. The interactive Energy Catch MVP is the default Vite page at `/`. The preserved cutout animation test scene is available at `/animation-test.html` on the same host.

## Scope and handoff

The P0 pack currently defines Idle and Move loops plus Catch and Activate one-shots for P1 and P2. Win and Confused remain deferred. The art is an editable vector redraw based on the approved model and pose references; it is an integration draft that still needs artist review at the final in-game scale. The pose reference image is not used as a sprite atlas.

