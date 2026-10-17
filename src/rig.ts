import Phaser from 'phaser';

const rigPartAssetUrls = import.meta.glob('../assets/characters/*/parts/*.png', {
  eager: true,
  query: '?url',
  import: 'default'
}) as Record<string, string>;

export interface RigPart {
  id: string;
  png: string;
  bounds: { x: number; y: number; width: number; height: number };
  pivot: { x: number; y: number };
  zIndex: number;
  defaultAlpha?: number;
}

export interface RigSpec {
  characterId: string;
  canvas: { width: number; height: number };
  anchor: { x: number; y: number };
  parts: RigPart[];
}

type Transform = Partial<{ x: number; y: number; rotation: number; scaleX: number; scaleY: number; alpha: number }>;
interface PoseKeyframe {
  atMs: number;
  root?: Transform;
  parts?: Record<string, Transform>;
}
export interface AnimationDefinition {
  durationMs: number;
  loop: boolean;
  ease?: string;
  keyframes: PoseKeyframe[];
}
export interface AnimationSet { animations: Record<string, AnimationDefinition> }

const ROOT_DEFAULT: Required<Transform> = { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, alpha: 1 };

function interpolate(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function valueAt(
  first: Transform | undefined,
  second: Transform | undefined,
  property: keyof Transform,
  t: number,
  defaultValue: number
): number {
  return interpolate(first?.[property] ?? defaultValue, second?.[property] ?? defaultValue, t);
}

export class CutoutRig {
  readonly root: Phaser.GameObjects.Container;
  readonly sprites = new Map<string, Phaser.GameObjects.Image>();
  readonly stateHistory: Array<{ state: string; event: 'started' | 'completed'; at: number }> = [];
  currentAnimation = '';
  private activeTween?: Phaser.Tweens.Tween;
  private activeProgress?: { value: number };
  private reducedMotion = false;
  private readonly partDefaults = new Map<string, Required<Transform>>();
  private readonly restPositions = new Map<string, { x: number; y: number }>();

  get playbackProgress(): number {
    return this.activeProgress?.value ?? 0;
  }

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly rig: RigSpec,
    private readonly animationSet: AnimationSet,
    anchorX: number,
    anchorY: number,
    private readonly displayScale: number,
    private readonly onState?: (state: string, event: 'started' | 'completed') => void
  ) {
    this.root = scene.add.container(anchorX, anchorY);
    this.root.setScale(displayScale);

    for (const part of [...rig.parts].sort((a, b) => a.zIndex - b.zIndex)) {
      const image = scene.add.image(0, 0, `${rig.characterId}-${part.id}`);
      image.setOrigin(
        (part.pivot.x - part.bounds.x) / part.bounds.width,
        (part.pivot.y - part.bounds.y) / part.bounds.height
      );
      const localX = part.pivot.x - rig.anchor.x * rig.canvas.width;
      const localY = part.pivot.y - rig.anchor.y * rig.canvas.height;
      image.setPosition(localX, localY);
      image.setAlpha(part.defaultAlpha ?? 1);
      this.root.add(image);
      this.sprites.set(part.id, image);
      this.restPositions.set(part.id, { x: localX, y: localY });
      this.partDefaults.set(part.id, { ...ROOT_DEFAULT, alpha: part.defaultAlpha ?? 1 });
    }
  }

  play(name: string): void {
    const definition = this.animationSet.animations[name];
    if (!definition) throw new Error(`Unknown animation "${name}" for ${this.rig.characterId}`);

    if (this.activeProgress) this.scene.tweens.killTweensOf(this.activeProgress);
    this.currentAnimation = name;
    this.emitState(name, 'started');
    this.applyPose(definition, 0);
    if (this.reducedMotion && definition.loop) {
      this.activeProgress = undefined;
      this.activeTween = undefined;
      return;
    }

    const progress = { value: 0 };
    this.activeProgress = progress;
    this.activeTween = this.scene.tweens.add({
      targets: progress,
      value: 1,
      duration: definition.durationMs,
      ease: definition.ease ?? 'Linear',
      repeat: definition.loop ? -1 : 0,
      onUpdate: () => this.applyPose(definition, progress.value),
      onComplete: () => {
        this.emitState(name, 'completed');
        if (!definition.loop && name !== 'idle') this.play('idle');
      }
    });
  }

  setReducedMotion(enabled: boolean): void {
    if (this.reducedMotion === enabled) return;
    this.reducedMotion = enabled;
    const definition = this.animationSet.animations[this.currentAnimation];
    if (!definition?.loop) return;
    if (this.activeProgress) this.scene.tweens.killTweensOf(this.activeProgress);
    this.activeProgress = undefined;
    this.activeTween = undefined;
    if (enabled) this.applyPose(definition, 0);
    else this.play(this.currentAnimation);
  }

  destroy(): void {
    if (this.activeProgress) this.scene.tweens.killTweensOf(this.activeProgress);
    this.root.destroy(true);
    this.sprites.clear();
  }

  private emitState(state: string, event: 'started' | 'completed'): void {
    this.stateHistory.push({ state, event, at: performance.now() });
    this.onState?.(state, event);
  }

  private applyPose(definition: AnimationDefinition, progress: number): void {
    const frames = definition.keyframes;
    const time = Phaser.Math.Clamp(progress, 0, 1) * definition.durationMs;
    let nextIndex = frames.findIndex((frame) => frame.atMs >= time);
    if (nextIndex < 0) nextIndex = frames.length - 1;
    const previousIndex = Math.max(0, nextIndex - 1);
    const previous = frames[previousIndex];
    const next = frames[nextIndex];
    const span = Math.max(1, next.atMs - previous.atMs);
    const localT = nextIndex === previousIndex ? 0 : Phaser.Math.Clamp((time - previous.atMs) / span, 0, 1);

    const rootTransform = {
      x: valueAt(previous.root, next.root, 'x', localT, ROOT_DEFAULT.x),
      y: valueAt(previous.root, next.root, 'y', localT, ROOT_DEFAULT.y),
      rotation: valueAt(previous.root, next.root, 'rotation', localT, ROOT_DEFAULT.rotation),
      scaleX: valueAt(previous.root, next.root, 'scaleX', localT, ROOT_DEFAULT.scaleX),
      scaleY: valueAt(previous.root, next.root, 'scaleY', localT, ROOT_DEFAULT.scaleY)
    };
    this.root.setPosition(
      this.root.x + (rootTransform.x - (this.root.getData('lastRootX') ?? 0)) * this.displayScale,
      this.root.y + (rootTransform.y - (this.root.getData('lastRootY') ?? 0)) * this.displayScale
    );
    this.root.setRotation(rootTransform.rotation);
    this.root.setScale(this.displayScale * rootTransform.scaleX, this.displayScale * rootTransform.scaleY);
    this.root.setData('lastRootX', rootTransform.x);
    this.root.setData('lastRootY', rootTransform.y);

    for (const part of this.rig.parts) {
      const image = this.sprites.get(part.id);
      const rest = this.restPositions.get(part.id);
      const defaults = this.partDefaults.get(part.id);
      if (!image || !rest || !defaults) continue;
      const a = previous.parts?.[part.id];
      const b = next.parts?.[part.id];
      image.setPosition(
        rest.x + valueAt(a, b, 'x', localT, defaults.x),
        rest.y + valueAt(a, b, 'y', localT, defaults.y)
      );
      image.setRotation(valueAt(a, b, 'rotation', localT, defaults.rotation));
      image.setScale(valueAt(a, b, 'scaleX', localT, defaults.scaleX), valueAt(a, b, 'scaleY', localT, defaults.scaleY));
      image.setAlpha(valueAt(a, b, 'alpha', localT, defaults.alpha));
    }
  }
}

export function preloadRig(scene: Phaser.Scene, rig: RigSpec): void {
  for (const part of rig.parts) {
    const modulePath = `../${part.png}`;
    const assetUrl = rigPartAssetUrls[modulePath];
    if (!assetUrl) throw new Error(`Missing bundled PNG for ${rig.characterId}/${part.id}: ${modulePath}`);
    scene.load.image(`${rig.characterId}-${part.id}`, assetUrl);
  }
}
