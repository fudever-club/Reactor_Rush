import Phaser from 'phaser';
import p1Rig from '../assets/characters/p1-cyan/rig.json';
import p1Animations from '../assets/characters/p1-cyan/animations.json';
import p2Rig from '../assets/characters/p2-pink/rig.json';
import p2Animations from '../assets/characters/p2-pink/animations.json';
import { KeyboardInputAdapter } from './adapters/keyboard-input-adapter';
import { MediaPipeHandInputAdapter, type CameraInputStatus } from './adapters/mediapipe-hand-input-adapter';
import {
  advanceGameFrame,
  applyCatch,
  canCatchFallingItem,
  createGameState,
  hasTimeAfterStep,
  isCurrentInputStep,
  requestRestart,
  startGame,
  type GameState,
  type InputAdapter,
  type InputFrame,
  type PlayerId
} from './gameplay/core';
import { getFallingItemCue } from './gameplay/accessibility-cues';
import { CutoutRig, preloadRig, type AnimationSet, type RigSpec } from './rig';
import './game-style.css';

const WIDTH = 1280;
const HEIGHT = 720;
const FLOOR_Y = 628;
const CATCH_MIN_Y = 515;
const CATCH_MAX_Y = 615;
const CATCH_DISTANCE = 68;
const MOVE_SPEED = 390;
const ITEM_CUE_INTERVAL_MS = 350;
const ITEM_CUE_LEAD_TIME_MS = 1_200;
const ITEM_CUE_AFTER_CATCH_MS = 500;
const PLAYER_HOME: Record<PlayerId, number> = { p1: 340, p2: 940 };
const PLAYER_LIMITS: Record<PlayerId, { min: number; max: number }> = {
  p1: { min: 95, max: 565 },
  p2: { min: 715, max: 1185 }
};

const CHARACTERS: Record<PlayerId, {
  id: string;
  name: string;
  color: string;
  rig: RigSpec;
  animations: AnimationSet;
}> = {
  p1: { id: 'p1-cyan', name: 'P1 CYAN', color: '#55DFFF', rig: p1Rig as RigSpec, animations: p1Animations as AnimationSet },
  p2: { id: 'p2-pink', name: 'P2 PINK', color: '#FF70B2', rig: p2Rig as RigSpec, animations: p2Animations as AnimationSet }
};

type FallingKind = 'energy' | 'hazard';
interface FallingItem {
  player: PlayerId;
  kind: FallingKind;
  x: number;
  y: number;
  speed: number;
  view: Phaser.GameObjects.Container;
}

interface RuntimeUi {
  root: HTMLElement;
  menu: HTMLElement;
  cameraSetup: HTMLElement;
  ready: HTMLElement;
  hud: HTMLElement;
  results: HTMLElement;
  startButton: HTMLButtonElement;
  chooseCameraButton: HTMLButtonElement;
  cameraConsent: HTMLInputElement;
  cameraEnableButton: HTMLButtonElement;
  cameraCalibrateButton: HTMLButtonElement;
  cameraStartButton: HTMLButtonElement;
  cameraBackButton: HTMLButtonElement;
  cameraVideo: HTMLVideoElement;
  cameraStatus: HTMLElement;
  cameraTitle: HTMLElement;
  cameraHandsStatus: HTMLElement;
  cameraStopButton: HTMLButtonElement;
  resultCameraStopButton: HTMLButtonElement;
  controlsHint: HTMLElement;
  restartButton: HTMLButtonElement;
  timer: HTMLElement;
  p1Score: HTMLElement;
  p2Score: HTMLElement;
  p1Combo: HTMLElement;
  p2Combo: HTMLElement;
  resultP1Score: HTMLElement;
  resultP2Score: HTMLElement;
  resultP1Combo: HTMLElement;
  resultP2Combo: HTMLElement;
  resultTeamTotal: HTMLElement;
  readyTitle: HTMLElement;
  resultsTitle: HTMLElement;
  gameAnnouncer: HTMLElement;
}

class EnergyCatchScene extends Phaser.Scene {
  private state: GameState = createGameState();
  private keyboardAdapter?: KeyboardInputAdapter;
  private inputAdapter?: InputAdapter;
  private cameraAdapter?: MediaPipeHandInputAdapter;
  private cameraMode = false;
  private cameraSetupVisible = false;
  private ui?: RuntimeUi;
  private reducedMotionQuery?: MediaQueryList;
  private cameraSetupWasVisible = false;
  private lastItemCueAt = Number.NEGATIVE_INFINITY;
  private lastCatchAnnouncementAt = Number.NEGATIVE_INFINITY;
  private announcedItemCues = new WeakSet<FallingItem>();
  private rigs = {} as Record<PlayerId, CutoutRig>;
  private playerX: Record<PlayerId, number> = { ...PLAYER_HOME };
  private items: FallingItem[] = [];
  private spawnAfterMs = 500;
  private spawnPlayer: PlayerId = 'p1';
  private lastHudSignature = '';
  private lastInput: InputFrame = {
    p1: { moveAxis: 0, catch: false },
    p2: { moveAxis: 0, catch: false }
  };

  constructor() {
    super('EnergyCatchScene');
  }

  preload(): void {
    for (const character of Object.values(CHARACTERS)) preloadRig(this, character.rig);
  }

  create(): void {
    this.game.canvas.tabIndex = 0;
    this.game.canvas.setAttribute('role', 'application');
    this.game.canvas.setAttribute('aria-label', 'Energy Catch playfield. Player 1 uses A and D to move and holds S to catch. Player 2 uses Left and Right to move and holds Down to catch.');
    this.game.canvas.focus({ preventScroll: true });
    this.drawStage();
    this.ui = this.createHud();
    this.ui.startButton.addEventListener('click', this.handleStartRequested);
    this.ui.restartButton.addEventListener('click', this.handleRestartRequested);
    this.keyboardAdapter = new KeyboardInputAdapter();
    this.inputAdapter = this.keyboardAdapter;
    this.ui.chooseCameraButton.addEventListener('click', this.handleCameraSetupRequested);
    this.ui.cameraEnableButton.addEventListener('click', this.handleCameraEnableRequested);
    this.ui.cameraConsent.addEventListener('change', this.handleCameraConsentChanged);
    this.ui.cameraCalibrateButton.addEventListener('click', this.handleCameraCalibrationRequested);
    this.ui.cameraStartButton.addEventListener('click', this.handleCameraStartRequested);
    this.ui.cameraBackButton.addEventListener('click', this.handleCameraBackRequested);
    this.ui.cameraStopButton.addEventListener('click', this.handleCameraStopRequested);
    this.ui.resultCameraStopButton.addEventListener('click', this.handleCameraStopRequested);
    const onWindowKeyDown = (event: KeyboardEvent) => {
      if (this.cameraSetupVisible) {
        if (event.code === 'Escape') {
          event.preventDefault();
          this.handleCameraBackRequested();
          return;
        }
        if (event.code === 'Tab') {
          const focusable = [...this.ui!.cameraSetup.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled])'
          )].filter((element) => element.getClientRects().length > 0);
          if (!focusable.length) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          const active = document.activeElement;
          if (event.shiftKey && (active === first || active === this.ui!.cameraTitle || active === this.ui!.cameraSetup || !this.ui!.cameraSetup.contains(active))) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && (active === last || active === this.ui!.cameraSetup || !this.ui!.cameraSetup.contains(active))) {
            event.preventDefault();
            first.focus();
          }
          return;
        }
        return;
      }
      if (event.repeat) return;
      const target = event.target;
      const targetUsesNativeKeyboard = target instanceof Element && Boolean(
        target.closest('button, input, select, textarea, a[href], [contenteditable="true"]')
      );
      if (!targetUsesNativeKeyboard && event.code === 'Enter' && (this.state.phase === 'menu' || this.state.phase === 'results')) {
        this.handleStartRequested();
      }
      if (event.code === 'KeyR') this.handleRestartRequested();
    };
    window.addEventListener('keydown', onWindowKeyDown);

    for (const player of ['p1', 'p2'] as const) {
      const character = CHARACTERS[player];
      this.rigs[player] = new CutoutRig(
        this,
        character.rig,
        character.animations,
        this.playerX[player],
        FLOOR_Y,
        0.54
      );
      this.rigs[player].play('idle');
    }
    this.reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const applyMotionPreference = (event: MediaQueryList | MediaQueryListEvent) => {
      for (const rig of Object.values(this.rigs)) rig.setReducedMotion(event.matches);
    };
    applyMotionPreference(this.reducedMotionQuery);
    this.reducedMotionQuery.addEventListener('change', applyMotionPreference);
    this.updateHud();
    this.showPhase('menu');
    const harness = {
      ready: true,
      getState: () => ({
        phase: this.state.phase,
        timeRemainingMs: this.state.timeRemainingMs,
        players: this.state.players,
        playerX: { ...this.playerX },
        input: this.lastInput,
        fallingItems: this.items.map(({ player, kind, x, y }) => ({ player, kind, x, y }))
      })
    };
    (window as typeof window & { __RR_GAME_TEST__?: typeof harness }).__RR_GAME_TEST__ = harness;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('keydown', onWindowKeyDown);
      this.reducedMotionQuery?.removeEventListener('change', applyMotionPreference);
      this.ui?.startButton.removeEventListener('click', this.handleStartRequested);
      this.ui?.restartButton.removeEventListener('click', this.handleRestartRequested);
      this.ui?.chooseCameraButton.removeEventListener('click', this.handleCameraSetupRequested);
      this.ui?.cameraEnableButton.removeEventListener('click', this.handleCameraEnableRequested);
      this.ui?.cameraConsent.removeEventListener('change', this.handleCameraConsentChanged);
      this.ui?.cameraCalibrateButton.removeEventListener('click', this.handleCameraCalibrationRequested);
      this.ui?.cameraStartButton.removeEventListener('click', this.handleCameraStartRequested);
      this.ui?.cameraBackButton.removeEventListener('click', this.handleCameraBackRequested);
      this.ui?.cameraStopButton.removeEventListener('click', this.handleCameraStopRequested);
      this.ui?.resultCameraStopButton.removeEventListener('click', this.handleCameraStopRequested);
      this.keyboardAdapter?.destroy();
      this.cameraAdapter?.stop();
      this.inputAdapter = undefined;
      this.clearItems();
      delete (window as typeof window & { __RR_GAME_TEST__?: unknown }).__RR_GAME_TEST__;
      for (const rig of Object.values(this.rigs)) rig.destroy();
    });
  }

  update(_time: number, delta: number): void {
    const frameDeltaMs = Math.max(0, Number.isFinite(delta) ? delta : 0);
    const previousInput = this.lastInput;
    const currentInput = this.inputAdapter?.read() ?? previousInput;
    const phaseBeforeFrame = this.state.phase;
    this.state = advanceGameFrame(this.state, frameDeltaMs, (state, stepMs, elapsedMs) => {
      this.state = state;
      this.lastInput = isCurrentInputStep(elapsedMs, stepMs, frameDeltaMs) ? currentInput : previousInput;
      const playerXAtStepStart = { ...this.playerX };
      this.movePlayers(stepMs);
      this.updateFallingItems(stepMs, playerXAtStepStart);
      if (hasTimeAfterStep(state, stepMs)) {
        this.spawnAfterMs -= stepMs;
        if (this.spawnAfterMs <= 0) this.spawnItem();
      }
      return this.state;
    });
    this.lastInput = currentInput;
    if (this.state.phase !== phaseBeforeFrame) {
      if (this.state.phase === 'results') this.clearItems();
      this.showPhase(this.state.phase);
    }
    this.updateHud();
    this.announceActiveItems();
  }

  private handleStartRequested = (): void => {
    if (this.state.phase === 'menu' && !this.cameraSetupVisible) {
      this.cameraMode = false;
      this.inputAdapter = this.keyboardAdapter;
      this.cameraAdapter?.stop();
      this.cameraAdapter = undefined;
      this.beginRun();
      this.updateInputModeUi();
    }
    else if (this.state.phase === 'results') this.beginRestart();
  };

  private handleCameraSetupRequested = (): void => {
    if (this.state.phase !== 'menu') return;
    this.cameraSetupVisible = true;
    this.ui!.cameraConsent.checked = false;
    this.ui!.cameraEnableButton.disabled = true;
    this.ui!.cameraEnableButton.textContent = 'ENABLE CAMERA & LOAD MODEL';
    this.ui!.cameraCalibrateButton.disabled = true;
    this.ui!.cameraStartButton.disabled = true;
    this.ui!.cameraStatus.textContent = 'Camera is off. It starts only after you choose Enable Camera.';
    this.setCameraHandsStatus('P1: waiting · P2: waiting');
    this.showPhase('menu');
  };

  private handleCameraConsentChanged = (): void => {
    if (!this.ui) return;
    if (!this.ui.cameraConsent.checked && this.cameraAdapter) {
      const adapter = this.cameraAdapter;
      this.cameraAdapter = undefined;
      this.cameraMode = false;
      this.inputAdapter = this.keyboardAdapter;
      adapter.stop();
      this.ui.cameraCalibrateButton.disabled = true;
      this.ui.cameraStartButton.disabled = true;
      this.setCameraHandsStatus('P1: waiting · P2: waiting');
      this.ui.cameraStatus.textContent = 'Consent withdrawn. Camera stream and model worker stopped.';
      this.updateInputModeUi();
      return;
    }
    const status = this.cameraAdapter?.currentStatus;
    const busy = status === 'requesting-camera' || status === 'loading-model' || status === 'ready';
    this.ui.cameraEnableButton.disabled = !this.ui.cameraConsent.checked || busy;
  };

  private handleCameraEnableRequested = async (): Promise<void> => {
    if (!this.ui?.cameraConsent.checked) {
      this.ui!.cameraStatus.textContent = 'Confirm the camera and MediaPipe notice before enabling camera controls.';
      return;
    }

    this.cameraAdapter?.stop();
    const adapter = new MediaPipeHandInputAdapter(this.ui.cameraVideo, {
      onStatus: (status, message) => this.updateCameraStatus(status, message),
      onDetection: (players, canCalibrate, calibrated) => this.updateCameraDetection(players, canCalibrate, calibrated)
    });
    this.cameraAdapter = adapter;
    this.ui.cameraEnableButton.disabled = true;
    try {
      await adapter.start();
    } catch {
      this.ui.cameraEnableButton.disabled = !this.ui.cameraConsent.checked;
      this.ui.cameraEnableButton.textContent = 'TRY CAMERA AGAIN';
    }
  };

  private handleCameraCalibrationRequested = (): void => {
    const calibrated = this.cameraAdapter?.calibrate() ?? false;
    if (calibrated && this.ui) this.ui.cameraStatus.textContent = 'Neutral hand positions saved. Move left/right and pinch thumb to index to catch.';
  };

  private handleCameraStartRequested = (): void => {
    if (!this.cameraAdapter?.canStart()) return;
    this.cameraMode = true;
    this.inputAdapter = this.cameraAdapter;
    this.cameraSetupVisible = false;
    this.beginRun();
    this.updateInputModeUi();
  };

  private handleCameraBackRequested = (): void => {
    this.cameraAdapter?.stop();
    this.cameraAdapter = undefined;
    this.cameraMode = false;
    this.cameraSetupVisible = false;
    this.inputAdapter = this.keyboardAdapter;
    this.showPhase(this.state.phase);
    this.updateInputModeUi();
  };

  private handleCameraStopRequested = (): void => {
    this.cameraAdapter?.stop();
    this.cameraAdapter = undefined;
    this.cameraMode = false;
    this.cameraSetupVisible = false;
    this.inputAdapter = this.keyboardAdapter;
    this.updateInputModeUi();
    this.showPhase(this.state.phase);
  };

  private updateCameraStatus(status: CameraInputStatus, message?: string): void {
    if (!this.ui) return;
    const fallbackMessages: Record<CameraInputStatus, string> = {
      idle: 'Camera is off. It starts only after you choose Enable Camera.',
      'requesting-camera': 'Waiting for camera permission…',
      'loading-model': 'Camera connected. Loading the hand model…',
      ready: 'Camera ready. Place one visible hand in each half, then calibrate.',
      stopped: 'Camera stopped. Keyboard controls remain available.',
      error: 'Camera controls could not start. Keyboard controls remain available.'
    };
    this.ui.cameraStatus.textContent = message || fallbackMessages[status];
    if (status === 'requesting-camera' || status === 'loading-model' || status === 'ready') {
      this.ui.cameraEnableButton.disabled = true;
      this.ui.cameraEnableButton.textContent = status === 'ready' ? 'CAMERA CONNECTED' : 'CONNECTING…';
    } else {
      this.ui.cameraEnableButton.disabled = !this.ui.cameraConsent.checked;
      if (status === 'error' || status === 'stopped') this.ui.cameraEnableButton.textContent = 'TRY CAMERA AGAIN';
    }
    if (status === 'error' && this.cameraMode) {
      this.cameraMode = false;
      this.inputAdapter = this.keyboardAdapter;
      this.updateInputModeUi();
      this.ui.controlsHint.textContent = 'CAMERA LOST · KEYBOARD CONTROLS ACTIVE';
    }
  }

  private updateCameraDetection(players: readonly PlayerId[], canCalibrate: boolean, calibrated: boolean): void {
    if (!this.ui) return;
    const hasP1 = players.includes('p1');
    const hasP2 = players.includes('p2');
    const handsStatus = `P1: ${hasP1 ? 'hand detected' : 'waiting'} · P2: ${hasP2 ? 'hand detected' : 'waiting'}`;
    this.setCameraHandsStatus(handsStatus);
    this.ui.cameraCalibrateButton.disabled = !canCalibrate;
    this.ui.cameraStartButton.disabled = !calibrated || !hasP1 || !hasP2;
  }

  private updateInputModeUi(): void {
    if (!this.ui) return;
    this.ui.controlsHint.textContent = this.cameraMode ? 'MOVE HAND LEFT/RIGHT · PINCH TO CATCH' : 'HOLD S / ↓ TO CATCH';
    this.ui.cameraStopButton.hidden = !this.cameraMode;
    this.ui.resultCameraStopButton.hidden = !this.cameraMode;
  }

  private handleRestartRequested = (): void => {
    if (this.state.phase === 'results') this.beginRestart();
  };

  private beginRun(): void {
    this.state = startGame(this.state);
    this.resetPositions();
    this.clearItems();
    this.spawnPlayer = 'p1';
    this.spawnAfterMs = 250;
    this.showPhase(this.state.phase);
  }

  private beginRestart(): void {
    this.state = requestRestart(this.state);
    this.resetPositions();
    this.clearItems();
    this.spawnPlayer = 'p1';
    this.spawnAfterMs = 450;
    this.showPhase(this.state.phase);
  }

  private movePlayers(deltaMs: number): void {
    for (const player of ['p1', 'p2'] as const) {
      const command = this.lastInput[player];
      const limits = PLAYER_LIMITS[player];
      this.playerX[player] = Phaser.Math.Clamp(
        this.playerX[player] + command.moveAxis * MOVE_SPEED * deltaMs / 1000,
        limits.min,
        limits.max
      );
      this.rigs[player].root.setX(this.playerX[player]);
      const current = this.rigs[player].currentAnimation;
      if (current === 'catch') continue;
      if (command.moveAxis !== 0 && current !== 'move') this.rigs[player].play('move');
      if (command.moveAxis === 0 && current === 'move') this.rigs[player].play('idle');
    }
  }

  private updateFallingItems(deltaMs: number, playerXAtStepStart: Record<PlayerId, number>): void {
    for (let i = this.items.length - 1; i >= 0; i -= 1) {
      const item = this.items[i];
      const previousY = item.y;
      item.y += item.speed * deltaMs / 1000;
      item.view.setY(item.y);
      const command = this.lastInput[item.player];
      if (canCatchFallingItem(
        command.catch,
        previousY,
        item.y,
        item.x,
        playerXAtStepStart[item.player],
        command.moveAxis * MOVE_SPEED * deltaMs / 1000,
        PLAYER_LIMITS[item.player].min,
        PLAYER_LIMITS[item.player].max,
        CATCH_MIN_Y,
        CATCH_MAX_Y,
        CATCH_DISTANCE
      )) {
        const previousScore = this.state.players[item.player].score;
        this.state = applyCatch(this.state, item.player, item.kind);
        const playerState = this.state.players[item.player];
        const scoreDelta = playerState.score - previousScore;
        this.announceCatch(item.player, item.kind, scoreDelta, playerState.score, playerState.combo);
        this.showCatchFeedback(item.player, item.y, scoreDelta, item.kind);
        this.rigs[item.player].play('catch');
        this.removeItem(i);
        continue;
      }
      if (item.y > FLOOR_Y + 26) this.removeItem(i);
    }
  }

  private spawnItem(): void {
    const player = this.spawnPlayer;
    const limits = PLAYER_LIMITS[player];
    const x = Phaser.Math.Between(limits.min + 22, limits.max - 22);
    const kind: FallingKind = Phaser.Math.Between(0, 99) < 24 ? 'hazard' : 'energy';
    const view = this.createItemView(kind, x, -34);
    const elapsed = this.state.durationMs - this.state.timeRemainingMs;
    this.items.push({ player, kind, x, y: -34, speed: 185 + elapsed / this.state.durationMs * 90, view });
    this.spawnPlayer = player === 'p1' ? 'p2' : 'p1';
    this.spawnAfterMs = Phaser.Math.Between(650, 950);
  }

  private announceActiveItems(): void {
    if (!this.ui || this.state.phase !== 'playing') return;
    const now = performance.now();
    if (now - this.lastItemCueAt < ITEM_CUE_INTERVAL_MS) return;
    if (now - this.lastCatchAnnouncementAt < ITEM_CUE_AFTER_CATCH_MS) return;
    const pendingCues = (['p1', 'p2'] as const).flatMap((player) => {
      const limits = PLAYER_LIMITS[player];
      const third = (limits.max - limits.min) / 3;
      return this.items
        .filter((item) => item.player === player && !this.announcedItemCues.has(item))
        .map((item) => {
          const position = item.x < limits.min + third ? 'left' : item.x > limits.max - third ? 'right' : 'center';
          const cue = getFallingItemCue({
            player,
            position,
            kind: item.kind,
            y: item.y,
            speed: item.speed,
            catchMinY: CATCH_MIN_Y,
            catchMaxY: CATCH_MAX_Y,
            leadTimeMs: ITEM_CUE_LEAD_TIME_MS
          });
          return cue ? { item, cue, timeToCatchBandMs: Math.max(0, ((CATCH_MIN_Y - item.y) / item.speed) * 1_000) } : null;
        })
        .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null)
        .sort((a, b) => a.timeToCatchBandMs - b.timeToCatchBandMs)
        .slice(0, 1);
    });
    if (!pendingCues.length) return;
    this.lastItemCueAt = now;
    for (const { item } of pendingCues) this.announcedItemCues.add(item);
    this.ui.gameAnnouncer.textContent = pendingCues.map(({ cue }) => cue).join('. ');
  }

  private setCameraHandsStatus(status: string): void {
    const handsStatus = this.ui?.cameraHandsStatus;
    if (handsStatus && handsStatus.textContent !== status) handsStatus.textContent = status;
  }

  private createItemView(kind: FallingKind, x: number, y: number): Phaser.GameObjects.Container {
    const view = this.add.container(x, y);
    if (kind === 'energy') {
      view.add(this.add.circle(0, 0, 28, 0x55dfff, 0.16));
      view.add(this.add.circle(0, 0, 19, 0x47d8f3, 1).setStrokeStyle(3, 0xc7fbff, 0.95));
      view.add(this.add.circle(-6, -7, 5, 0xffffff, 0.9));
      view.add(this.add.star(0, 0, 4, 7, 12, 0xeaffff, 0.95));
    } else {
      view.add(this.add.circle(0, 0, 27, 0xff5265, 0.13));
      view.add(this.add.star(0, 0, 6, 12, 22, 0xff5968, 1).setStrokeStyle(3, 0xffd1b2, 1));
      view.add(this.add.text(0, 0, '!', {
        fontFamily: 'Segoe UI, system-ui, sans-serif', fontSize: '22px', color: '#24101A', fontStyle: 'bold'
      }).setOrigin(0.5));
    }
    return view;
  }

  private removeItem(index: number): void {
    this.items[index].view.destroy(true);
    this.items.splice(index, 1);
  }

  private announceCatch(player: PlayerId, kind: FallingKind, scoreDelta: number, score: number, combo: number): void {
    if (!this.ui) return;
    this.lastCatchAnnouncementAt = performance.now();
    const label = player === 'p1' ? 'Player 1 Cyan' : 'Player 2 Pink';
    if (kind === 'hazard') {
      const loss = scoreDelta === 0 ? 'Score remains zero.' : `Minus ${Math.abs(scoreDelta)} points. Score ${score}.`;
      this.ui.gameAnnouncer.textContent = `${label} caught a hazard. ${loss} Combo reset.`;
      return;
    }
    this.ui.gameAnnouncer.textContent = `${label} caught energy, plus ${scoreDelta} points. Score ${score}. Combo ${combo}.`;
  }

  private showCatchFeedback(player: PlayerId, y: number, scoreDelta: number, kind: FallingKind): void {
    const color = player === 'p1' ? '#a4efff' : '#ffc2dd';
    const label = kind === 'hazard' && scoreDelta === 0
      ? 'COMBO RESET'
      : `${scoreDelta > 0 ? '+' : ''}${scoreDelta}`;
    const text = this.add.text(this.playerX[player], y - 24, label, {
      fontFamily: 'Segoe UI, system-ui, sans-serif', fontSize: '22px', fontStyle: 'bold', color,
      stroke: '#10142c', strokeThickness: 4
    }).setOrigin(0.5).setDepth(5);
    if (this.reducedMotionQuery?.matches) {
      this.time.delayedCall(900, () => text.destroy());
      return;
    }
    this.tweens.add({
      targets: text,
      y: text.y - 42,
      alpha: 0,
      duration: 620,
      ease: 'Cubic.Out',
      onComplete: () => text.destroy()
    });
  }

  private clearItems(): void {
    for (const item of this.items) item.view.destroy(true);
    this.items = [];
  }

  private resetPositions(): void {
    for (const player of ['p1', 'p2'] as const) {
      this.playerX[player] = PLAYER_HOME[player];
      this.rigs[player]?.root.setX(PLAYER_HOME[player]);
      if (this.rigs[player] && this.rigs[player].currentAnimation !== 'idle') this.rigs[player].play('idle');
    }
  }

  private createHud(): RuntimeUi {
    const get = <T extends HTMLElement>(id: string): T => {
      const element = document.getElementById(id);
      if (!element) throw new Error(`Missing runtime UI element #${id}`);
      return element as T;
    };

    return {
      root: get('runtime-ui'),
      menu: get('menu-screen'),
      cameraSetup: get('camera-setup-screen'),
      ready: get('ready-screen'),
      hud: get('active-hud'),
      results: get('results-screen'),
      startButton: get<HTMLButtonElement>('start-round'),
      chooseCameraButton: get<HTMLButtonElement>('choose-camera'),
      cameraConsent: get<HTMLInputElement>('camera-consent'),
      cameraEnableButton: get<HTMLButtonElement>('enable-camera'),
      cameraCalibrateButton: get<HTMLButtonElement>('calibrate-camera'),
      cameraStartButton: get<HTMLButtonElement>('start-camera-round'),
      cameraBackButton: get<HTMLButtonElement>('camera-to-keyboard'),
      cameraVideo: get<HTMLVideoElement>('camera-preview'),
      cameraStatus: get('camera-status'),
      cameraTitle: get('camera-title'),
      cameraHandsStatus: get('camera-hands-status'),
      cameraStopButton: get<HTMLButtonElement>('stop-camera'),
      resultCameraStopButton: get<HTMLButtonElement>('stop-camera-results'),
      controlsHint: get('hud-controls-hint'),
      restartButton: get<HTMLButtonElement>('restart-round'),
      timer: get('hud-timer'),
      p1Score: get('hud-p1-score'),
      p2Score: get('hud-p2-score'),
      p1Combo: get('hud-p1-combo'),
      p2Combo: get('hud-p2-combo'),
      resultP1Score: get('result-p1-score'),
      resultP2Score: get('result-p2-score'),
      resultP1Combo: get('result-p1-combo'),
      resultP2Combo: get('result-p2-combo'),
      resultTeamTotal: get('result-team-total'),
      readyTitle: get('ready-title'),
      resultsTitle: get('results-title'),
      gameAnnouncer: get('game-announcer')
    };
  }

  private updateHud(): void {
    if (!this.ui) return;
    const p1 = this.state.players.p1;
    const p2 = this.state.players.p2;
    const time = String(Math.ceil(this.state.timeRemainingMs / 1000)).padStart(2, '0');
    const values: Array<[HTMLElement, string]> = [
      [this.ui.timer, time],
      [this.ui.p1Score, p1.score.toLocaleString()],
      [this.ui.p2Score, p2.score.toLocaleString()],
      [this.ui.p1Combo, `COMBO ${p1.combo}  ·  BEST ${p1.bestCombo}`],
      [this.ui.p2Combo, `COMBO ${p2.combo}  ·  BEST ${p2.bestCombo}`],
      [this.ui.resultP1Score, p1.score.toLocaleString()],
      [this.ui.resultP2Score, p2.score.toLocaleString()],
      [this.ui.resultP1Combo, `BEST COMBO ${p1.bestCombo}`],
      [this.ui.resultP2Combo, `BEST COMBO ${p2.bestCombo}`],
      [this.ui.resultTeamTotal, (p1.score + p2.score).toLocaleString()]
    ];
    const signature = `${time}|${values.map(([, value]) => value).join('|')}`;
    if (signature === this.lastHudSignature) return;
    this.lastHudSignature = signature;
    for (const [element, value] of values) element.textContent = value;
    this.ui.timer.classList.toggle('is-urgent', this.state.timeRemainingMs <= 10_000);
  }

  private showPhase(phase: GameState['phase']): void {
    if (!this.ui) return;
    const showCameraDialog = phase === 'menu' && this.cameraSetupVisible;
    this.ui.root.dataset.phase = phase;
    this.ui.menu.hidden = phase !== 'menu' || this.cameraSetupVisible;
    this.ui.cameraSetup.hidden = phase !== 'menu' || !this.cameraSetupVisible;
    this.ui.ready.hidden = phase !== 'restart';
    this.ui.hud.hidden = phase !== 'playing';
    this.ui.results.hidden = phase !== 'results';
    this.updateInputModeUi();
    this.updateHud();
    if (showCameraDialog) this.ui.cameraTitle.focus({ preventScroll: true });
    else if (this.cameraSetupWasVisible && phase === 'menu') this.ui.chooseCameraButton.focus({ preventScroll: true });
    else if (phase === 'restart') this.ui.readyTitle.focus({ preventScroll: true });
    else if (phase === 'playing') this.game.canvas.focus({ preventScroll: true });
    else if (phase === 'results') this.ui.resultsTitle.focus({ preventScroll: true });
    this.cameraSetupWasVisible = showCameraDialog;
  }

  private drawStage(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x10142c, 1);
    graphics.fillRect(0, 0, WIDTH, HEIGHT);
    graphics.fillStyle(0x17203b, 0.72);
    graphics.fillRect(0, 118, WIDTH, 500);
    graphics.lineStyle(1, 0x2d3858, 0.5);
    for (let x = 40; x <= WIDTH; x += 80) {
      graphics.beginPath(); graphics.moveTo(x, 128); graphics.lineTo(x, 610); graphics.strokePath();
    }
    graphics.lineStyle(1, 0x2d3858, 0.4);
    for (let y = 150; y <= 610; y += 76) {
      graphics.beginPath(); graphics.moveTo(36, y); graphics.lineTo(1244, y); graphics.strokePath();
    }
    graphics.lineStyle(2, 0x55dfff, 0.22);
    graphics.strokeRect(34, 126, 584, 488);
    graphics.lineStyle(2, 0xff70b2, 0.22);
    graphics.strokeRect(662, 126, 584, 488);
    graphics.lineStyle(2, 0x7d8aab, 0.6);
    graphics.beginPath(); graphics.moveTo(640, 126); graphics.lineTo(640, 614); graphics.strokePath();
    graphics.fillStyle(0x202947, 1);
    graphics.fillRect(38, FLOOR_Y, 1204, 4);
    graphics.fillStyle(0x55dfff, 0.45);
    graphics.fillRect(38, FLOOR_Y, 578, 3);
    graphics.fillStyle(0xff70b2, 0.45);
    graphics.fillRect(664, FLOOR_Y, 578, 3);
    this.add.text(50, 132, 'PLAYER 1  ·  CYAN', {
      fontFamily: 'Segoe UI, system-ui, sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#55DFFF', letterSpacing: 1.5
    });
    this.add.text(1230, 132, 'PLAYER 2  ·  PINK', {
      fontFamily: 'Segoe UI, system-ui, sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#FF70B2', letterSpacing: 1.5
    }).setOrigin(1, 0);
  }
}

export const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-container',
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: '#10142C',
  antialias: true,
  pixelArt: false,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [EnergyCatchScene]
});








