import Phaser from 'phaser';
import p1Rig from '../assets/characters/p1-cyan/rig.json';
import p1Animations from '../assets/characters/p1-cyan/animations.json';
import p2Rig from '../assets/characters/p2-pink/rig.json';
import p2Animations from '../assets/characters/p2-pink/animations.json';
import { CutoutRig, preloadRig, type RigSpec, type AnimationSet } from './rig';
import './style.css';

const CHARACTERS = {
  'p1-cyan': { name: 'P1 Cyan', color: '#55DFFF', rig: p1Rig as RigSpec, animations: p1Animations as AnimationSet },
  'p2-pink': { name: 'P2 Pink', color: '#FF70B2', rig: p2Rig as RigSpec, animations: p2Animations as AnimationSet }
} as const;
type CharacterId = keyof typeof CHARACTERS;
let lastFpsSample = '';

function rendererLabel(game: Phaser.Game): string {
  return game.renderer.type === Phaser.WEBGL ? 'WebGLRenderer' : 'CanvasRenderer';
}

function sampleRequestAnimationFrame(): void {
  let startedAt: number | undefined;
  let frames = 0;
  const countFrame = (now: number) => {
    startedAt ??= now;
    frames += 1;
    const elapsed = now - startedAt;
    if (elapsed >= 2000) {
      lastFpsSample = `rAF ${Math.round((frames - 1) * 1000 / elapsed)} FPS / 2s sample`;
      return;
    }
    requestAnimationFrame(countFrame);
  };
  requestAnimationFrame(countFrame);
}

class AnimationTestScene extends Phaser.Scene {
  private character?: CutoutRig;
  private characterId: CharacterId = 'p1-cyan';
  private titleText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private lastCompleted = '';

  constructor() {
    super('AnimationTestScene');
  }

  preload(): void {
    for (const character of Object.values(CHARACTERS)) preloadRig(this, character.rig);
  }

  create(): void {
    this.drawTestStage();
    this.titleText = this.add.text(640, 78, '', {
      fontFamily: 'Segoe UI, system-ui, sans-serif', fontSize: '24px', color: '#55DFFF',
      fontStyle: 'bold', letterSpacing: 3
    }).setOrigin(0.5);
    this.add.text(640, 114, 'Idle  ·  Move  ·  Catch  ·  Activate  ·  Shared cutout runtime', {
      fontFamily: 'Segoe UI, system-ui, sans-serif', fontSize: '18px', color: '#D8DFEF'
    }).setOrigin(0.5);
    this.add.ellipse(640, 579, 236, 33, 0x050817, 0.55);
    this.add.ellipse(640, 577, 166, 16, 0x55dfff, 0.1);
    this.statusText = this.add.text(640, 652, '', {
      fontFamily: 'Segoe UI, system-ui, sans-serif', fontSize: '20px', color: '#F4F3EE',
      backgroundColor: '#191F3B', padding: { x: 18, y: 10 }
    }).setOrigin(0.5);
    this.selectCharacter('p1-cyan');

    const play = (event: Event) => {
      const name = (event as CustomEvent<{ name: string }>).detail?.name;
      if (name && this.character) this.character.play(name);
    };
    const select = (event: Event) => {
      const id = (event as CustomEvent<{ id: string }>).detail?.id;
      if (id && id in CHARACTERS) this.selectCharacter(id as CharacterId);
    };
    window.addEventListener('reactor-rush-animation', play);
    window.addEventListener('reactor-rush-character', select);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('reactor-rush-animation', play);
      window.removeEventListener('reactor-rush-character', select);
    });

    const harness = {
      ready: true,
      play: (name: string) => this.character?.play(name),
      select: (id: CharacterId) => this.selectCharacter(id),
      getState: () => ({
        ready: true,
        characterId: this.characterId,
        currentAnimation: this.character?.currentAnimation ?? '',
        progress: this.character?.playbackProgress ?? 0,
        history: this.character?.stateHistory ?? [],
        partCount: CHARACTERS[this.characterId].rig.parts.length,
        renderer: rendererLabel(this.game)
      })
    };
    (window as typeof window & { __RR_TEST__?: typeof harness }).__RR_TEST__ = harness;
    window.dispatchEvent(new CustomEvent('reactor-rush-ready'));
  }

  update(): void {
    if (!this.character) return;
    const config = CHARACTERS[this.characterId];
    const current = this.character.currentAnimation;
    const progress = Math.round(this.character.playbackProgress * 100);
    const renderer = rendererLabel(this.game);
    const detail = this.lastCompleted ? ` · last: ${this.lastCompleted} completed` : '';
    const sample = lastFpsSample ? ` · ${lastFpsSample}` : '';
    const status = `${config.name} · ${current} ${progress}% · ${config.rig.parts.length} parts · ${renderer}${detail}${sample}`;
    const pageStatus = document.querySelector<HTMLElement>('#page-status');
    if (pageStatus && pageStatus.textContent !== status) pageStatus.textContent = status;
  }

  private selectCharacter(id: CharacterId): void {
    this.character?.destroy();
    this.characterId = id;
    this.lastCompleted = '';
    const config = CHARACTERS[id];
    this.titleText?.setText(`${config.name.toUpperCase()}  /  CUTOUT RIG TEST`);
    this.titleText?.setColor(config.color);
    this.character = new CutoutRig(
      this, config.rig, config.animations, 640, 570, 0.83,
      (state, event) => this.updateStatus(id, state, event)
    );
    this.character.play('idle');
    this.updateStatus(id, 'idle', 'started');
  }

  private updateStatus(id: CharacterId, state: string, event: 'started' | 'completed'): void {
    if (id !== this.characterId) return;
    const config = CHARACTERS[id];
    const label = state[0].toUpperCase() + state.slice(1);
    if (event === 'started') this.statusText?.setText(`${config.name} · ${label} running`);
    if (event === 'completed') this.lastCompleted = label;
  }

  private drawTestStage(): void {
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x10142c, 0x10142c, 0x1b2443, 0x1b2443, 1);
    graphics.fillRect(0, 0, 1280, 720);
    graphics.lineStyle(2, 0x35405f, 0.8);
    graphics.strokeCircle(640, 372, 240);
    graphics.lineStyle(2, 0x263150, 0.85);
    graphics.strokeCircle(640, 372, 194);
    graphics.lineStyle(3, 0x55dfff, 0.4);
    graphics.beginPath();
    graphics.moveTo(240, 570);
    graphics.lineTo(1040, 570);
    graphics.strokePath();
    graphics.fillStyle(0x55dfff, 0.08);
    graphics.fillCircle(640, 370, 172);
    graphics.lineStyle(1, 0x35405f, 0.45);
    for (let x = 80; x < 1280; x += 80) {
      graphics.beginPath(); graphics.moveTo(x, 620); graphics.lineTo(x, 720); graphics.strokePath();
    }
  }
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 1280,
  height: 720,
  backgroundColor: '#10142C',
  antialias: true,
  pixelArt: false,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [AnimationTestScene]
});

window.addEventListener('reactor-rush-ready', () => {
  document.querySelector<HTMLElement>('#page-status')?.setAttribute('data-ready', 'true');
});
document.querySelectorAll<HTMLButtonElement>('[data-animation]').forEach((button) => {
  button.addEventListener('click', () => {
    const name = button.dataset.animation;
    if (name) window.dispatchEvent(new CustomEvent('reactor-rush-animation', { detail: { name } }));
  });
});
document.querySelectorAll<HTMLButtonElement>('[data-character]').forEach((button) => {
  button.addEventListener('click', () => {
    const id = button.dataset.character;
    if (!id) return;
    document.querySelectorAll<HTMLButtonElement>('[data-character]').forEach((option) => {
      const active = option.dataset.character === id;
      option.classList.toggle('selected', active);
      option.setAttribute('aria-pressed', String(active));
    });
    window.dispatchEvent(new CustomEvent('reactor-rush-character', { detail: { id } }));
  });
});
window.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key.toLowerCase() === 'f') {
    sampleRequestAnimationFrame();
    return;
  }
  const name = ({ i: 'idle', m: 'move', c: 'catch', a: 'activate' } as Record<string, string>)[event.key.toLowerCase()];
  if (name) window.dispatchEvent(new CustomEvent('reactor-rush-animation', { detail: { name } }));
});

export { game };
