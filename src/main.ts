import Phaser from 'phaser';
import p1Rig from '../assets/characters/p1-cyan/rig.json';
import p1Animations from '../assets/characters/p1-cyan/animations.json';
import p2Rig from '../assets/characters/p2-pink/rig.json';
import p2Animations from '../assets/characters/p2-pink/animations.json';
import { KeyboardInputAdapter } from './adapters/keyboard-input-adapter';
import {
  MediaPipeHandInputAdapter,
  type CameraInputStatus,
  type CameraMetrics
} from './adapters/mediapipe-hand-input-adapter';
import { MediaPipePoseInputAdapter } from './adapters/mediapipe-pose-input-adapter';
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

const HAND_CALIBRATION_HINTS: Record<NonNullable<CameraMetrics['handCalibrationIssue']>, string> = {
  CENTER_HAND: 'Move your hand toward the center of your slot so both directions have enough space, then CALIBRATE.',
  ONE_HAND_ONLY: 'Solo uses one hand only. Keep your other hand out of the camera, then CALIBRATE.'
};

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
  cameraCanvas?: HTMLCanvasElement;
  cameraStatus: HTMLElement;
  cameraTitle: HTMLElement;
  cameraHandsStatus: HTMLElement;
  poseCalibrationChecks: HTMLElement;
  poseCameraCheck: HTMLElement;
  posePlayerCheck: HTMLElement;
  poseShoulderCheck: HTMLElement;
  posePositionCheck: HTMLElement;
  poseFreshCheck: HTMLElement;
  poseStableCheck: HTMLElement;
  handTuning: HTMLElement;
  handMoveSlider: HTMLInputElement;
  handMoveValue: HTMLElement;
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
  modeSoloButton?: HTMLButtonElement;
  modeCoopButton?: HTMLButtonElement;
  cameraModeSoloButton?: HTMLButtonElement;
  cameraModeCoopButton?: HTMLButtonElement;
  menuSubtitle?: HTMLElement;
  cameraInstructions?: HTMLElement;
  cameraCalibrationInstructions?: HTMLElement;
  cameraPreviewLabel?: HTMLElement;
  schemeHandButton?: HTMLButtonElement;
  schemePoseBothButton?: HTMLButtonElement;
  schemePoseOneButton?: HTMLButtonElement;
  hudCameraDock: HTMLElement;
  hudCameraVideo: HTMLVideoElement;
  hudCameraCanvas?: HTMLCanvasElement;
  hudCameraBadge: HTMLElement;
  hudCameraCue: HTMLElement;
  hudCameraToggle: HTMLButtonElement;
  hudCameraRecalibrate: HTMLButtonElement;
}

class EnergyCatchScene extends Phaser.Scene {
  private state: GameState = createGameState();
  private keyboardAdapter?: KeyboardInputAdapter;
  private inputAdapter?: InputAdapter;
  private cameraAdapter?: MediaPipeHandInputAdapter | MediaPipePoseInputAdapter;
  private cameraMode = false;
  private cameraSessionId = 0;
  private cameraActionVersion = 0;
  private handMoveThreshold = 0.08;
  private isSoloMode = true;
  private trackingScheme: 'H0' | 'P1' | 'P2' = 'P1';
  private cameraSetupVisible = false;
  private hudCameraMinimized = false;
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
    this.ui.handMoveSlider.addEventListener('input', this.handleHandMovementChanged);
    this.ui.cameraCalibrateButton.addEventListener('click', this.handleCameraCalibrationRequested);
    this.ui.cameraStartButton.addEventListener('click', this.handleCameraStartRequested);
    this.ui.cameraBackButton.addEventListener('click', this.handleCameraBackRequested);
    this.ui.cameraStopButton.addEventListener('click', this.handleCameraStopRequested);
    this.ui.resultCameraStopButton.addEventListener('click', this.handleCameraStopRequested);
    this.ui.hudCameraToggle.addEventListener('click', this.toggleHudCameraDock);
    this.ui.hudCameraRecalibrate.addEventListener('click', this.handleCameraCalibrationRequested);
    this.ui.modeSoloButton?.addEventListener('click', () => this.setSoloMode(true));
    this.ui.modeCoopButton?.addEventListener('click', () => this.setSoloMode(false));
    this.ui.cameraModeSoloButton?.addEventListener('click', () => this.setSoloMode(true));
    this.ui.cameraModeCoopButton?.addEventListener('click', () => this.setSoloMode(false));
    this.ui.schemeHandButton?.addEventListener('click', () => this.setTrackingScheme('H0'));
    this.ui.schemePoseBothButton?.addEventListener('click', () => this.setTrackingScheme('P1'));
    this.ui.schemePoseOneButton?.addEventListener('click', () => this.setTrackingScheme('P2'));
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
      if (!targetUsesNativeKeyboard && event.code === 'KeyV' && this.cameraMode) {
        event.preventDefault();
        this.toggleHudCameraDock();
      }
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
    this.setSoloMode(true);
    this.setTrackingScheme('P1');
    const harness = {
      ready: true,
      getState: () => ({
        phase: this.state.phase,
        timeRemainingMs: this.state.timeRemainingMs,
        players: this.state.players,
        playerX: { ...this.playerX },
        input: this.lastInput,
        fallingItems: this.items.map(({ player, kind, x, y }) => ({ player, kind, x, y })),
        cameraMode: this.cameraMode,
        trackingScheme: this.trackingScheme,
        cameraAdapter: this.cameraAdapter,
        hudCameraDockHidden: this.ui?.hudCameraDock?.hidden,
        hudCameraBadge: this.ui?.hudCameraBadge?.textContent,
        hudCameraMinimized: this.hudCameraMinimized
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
      this.ui?.handMoveSlider.removeEventListener('input', this.handleHandMovementChanged);
      this.ui?.cameraStartButton.removeEventListener('click', this.handleCameraStartRequested);
      this.ui?.cameraBackButton.removeEventListener('click', this.handleCameraBackRequested);
      this.ui?.cameraStopButton.removeEventListener('click', this.handleCameraStopRequested);
      this.ui?.resultCameraStopButton.removeEventListener('click', this.handleCameraStopRequested);
      this.ui?.hudCameraToggle.removeEventListener('click', this.toggleHudCameraDock);
      this.ui?.hudCameraRecalibrate.removeEventListener('click', this.handleCameraCalibrationRequested);
      ++this.cameraSessionId;
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
      if (this.ui?.hudCameraVideo) {
        this.ui.hudCameraVideo.pause();
        this.ui.hudCameraVideo.srcObject = null;
      }
      this.cameraMode = false;
      this.inputAdapter = this.keyboardAdapter;
      ++this.cameraSessionId;
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
    this.setCameraHandsStatus(this.isSoloMode ? 'P1: waiting' : 'P1: waiting · P2: waiting');
    this.showPhase('menu');
  };

  private handleCameraConsentChanged = (): void => {
    if (!this.ui) return;
    if (!this.ui.cameraConsent.checked && this.cameraAdapter) {
      ++this.cameraSessionId;
      const adapter = this.cameraAdapter;
      this.cameraAdapter = undefined;
      this.cameraMode = false;
      this.inputAdapter = this.keyboardAdapter;
      adapter.stop();
      if (this.ui.hudCameraVideo) {
        this.ui.hudCameraVideo.pause();
        this.ui.hudCameraVideo.srcObject = null;
      }
      this.ui.cameraCalibrateButton.disabled = true;
      this.ui.cameraStartButton.disabled = true;
      this.setCameraHandsStatus(this.isSoloMode ? 'P1: waiting' : 'P1: waiting · P2: waiting');
      this.ui.cameraEnableButton.disabled = true;
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

    const sessionId = ++this.cameraSessionId;
    this.cameraAdapter?.stop();
    let adapter: MediaPipeHandInputAdapter | MediaPipePoseInputAdapter;
    const isCurrent = () => sessionId === this.cameraSessionId && this.cameraAdapter === adapter;
    const canvases = [this.ui.cameraCanvas, this.ui.hudCameraCanvas].filter((c): c is HTMLCanvasElement => Boolean(c));
    const commonOptions = {
      soloMode: this.isSoloMode,
      overlayCanvas: canvases,
      onStatus: (status: CameraInputStatus, message?: string) => {
        if (isCurrent()) this.updateCameraStatus(status, message);
      },
      onDetection: (players: readonly PlayerId[], canCalibrate: boolean, calibrated: boolean, metrics?: CameraMetrics) =>
        { if (isCurrent()) this.updateCameraDetection(players, canCalibrate, calibrated, metrics); }
    };

    if (this.trackingScheme === 'H0') {
      adapter = new MediaPipeHandInputAdapter(this.ui.cameraVideo, { ...commonOptions, moveThreshold: this.handMoveThreshold });
    } else {
      adapter = new MediaPipePoseInputAdapter(this.ui.cameraVideo, {
        ...commonOptions,
        scheme: this.trackingScheme === 'P1' ? 'P1' : 'P2'
      });
    }

    this.cameraAdapter = adapter;
    this.ui.cameraEnableButton.disabled = true;
    try {
      await adapter.start();
    } catch {
      if (!isCurrent()) return;
      this.ui.cameraEnableButton.disabled = !this.ui.cameraConsent.checked;
      this.ui.cameraEnableButton.textContent = 'TRY CAMERA AGAIN';
    }
  };

  private handleCameraCalibrationRequested = async (): Promise<void> => {
    const adapter = this.cameraAdapter;
    const session = this.cameraSessionId;
    const actionVersion = this.cameraActionVersion;
    if (!adapter) return;
    const isPose = this.trackingScheme !== 'H0' && adapter instanceof MediaPipePoseInputAdapter;
    if (isPose && adapter.getMetrics().poseCalibration?.pendingAction === 'calibrate') {
      ++this.cameraActionVersion;
      adapter.cancelPendingAction();
      if (this.ui) this.ui.cameraStatus.textContent = 'Calibration cancelled. Press CALIBRATE when you are ready.';
      return;
    }
    const waitForHand = this.trackingScheme === 'H0' && adapter instanceof MediaPipeHandInputAdapter;
    if (waitForHand && this.ui) this.ui.cameraStatus.textContent = 'Hold one open hand steady. Waiting for a fresh detection…';
    const calibrated = waitForHand || isPose ? await adapter.requestCalibration() : adapter.calibrate();
    if (session !== this.cameraSessionId || adapter !== this.cameraAdapter || actionVersion !== this.cameraActionVersion) return;
    if (!calibrated && waitForHand && this.ui && adapter.currentStatus === 'ready') {
      const issue = adapter.getMetrics().handCalibrationIssue;
      this.ui.cameraStatus.textContent = issue ? HAND_CALIBRATION_HINTS[issue] : 'No valid hand sample yet. Keep the selected players’ hands in frame and press CALIBRATE again.';
    }
    if (!calibrated && isPose && this.ui && adapter.currentStatus === 'ready') {
      this.ui.cameraStatus.textContent = 'Calibration not saved. ' + this.poseCalibrationHint(adapter.getMetrics().poseCalibration) + ' Press CALIBRATE to retry.';
    }
    if (calibrated && this.ui) {
      const metrics = this.cameraAdapter?.getMetrics();
      const delegateTag = metrics?.delegate ? ` (${metrics.delegate} active)` : '';
      const isHand = this.trackingScheme === 'H0';
      const actionCue = isHand
        ? 'pinch thumb to index to catch'
        : (this.trackingScheme === 'P1' ? 'raise both arms to catch' : 'raise one arm to catch');
      const subject = isHand ? 'hand position' : 'body position';
      this.ui.cameraStatus.textContent = this.isSoloMode
        ? `Neutral ${subject} saved${delegateTag}. Move left/right and ${actionCue}.`
        : `Neutral ${subject}s saved${delegateTag}. Move left/right and ${actionCue}.`;
    }
  };

  private handleCameraStartRequested = async (): Promise<void> => {
    const adapter = this.cameraAdapter;
    const session = this.cameraSessionId;
    const actionVersion = this.cameraActionVersion;
    if (!adapter) return;
    if (!adapter.canStart() && (adapter instanceof MediaPipeHandInputAdapter || adapter instanceof MediaPipePoseInputAdapter)) {
      if (this.ui) this.ui.cameraStatus.textContent = 'Waiting for a fresh calibrated sample before starting…';
      const ready = await adapter.requestStartReadiness();
      if (session !== this.cameraSessionId || adapter !== this.cameraAdapter || actionVersion !== this.cameraActionVersion) return;
      if (!ready) {
        if (this.ui && adapter.currentStatus === 'ready') this.ui.cameraStatus.textContent = 'Could not start with a fresh calibrated sample. If tracking was lost, CALIBRATE again; otherwise try START again.';
        return;
      }
    }
    if (!adapter.canStart()) return;
    this.cameraMode = true;
    this.inputAdapter = this.cameraAdapter;
    this.cameraSetupVisible = false;
    if (this.ui?.hudCameraVideo && this.cameraAdapter) {
      this.ui.hudCameraVideo.srcObject = this.cameraAdapter.getStream() ?? null;
      this.ui.hudCameraVideo.play().catch(() => {});
    }
    this.beginRun();
    this.updateInputModeUi();
  };

  private handleCameraBackRequested = (): void => {
    if (this.ui?.hudCameraVideo) {
      this.ui.hudCameraVideo.pause();
      this.ui.hudCameraVideo.srcObject = null;
    }
    ++this.cameraSessionId;
    this.cameraAdapter?.stop();
    this.cameraAdapter = undefined;
    this.cameraMode = false;
    this.cameraSetupVisible = false;
    this.inputAdapter = this.keyboardAdapter;
    this.showPhase(this.state.phase);
    this.updateInputModeUi();
  };

  private handleCameraStopRequested = (): void => {
    if (this.ui?.hudCameraVideo) {
      this.ui.hudCameraVideo.pause();
      this.ui.hudCameraVideo.srcObject = null;
    }
    ++this.cameraSessionId;
    this.cameraAdapter?.stop();
    this.cameraAdapter = undefined;
    this.cameraMode = false;
    this.cameraSetupVisible = false;
    this.inputAdapter = this.keyboardAdapter;
    this.updateInputModeUi();
    this.showPhase(this.state.phase);
  };

  private toggleHudCameraDock = (): void => {
    if (!this.ui) return;
    this.hudCameraMinimized = !this.hudCameraMinimized;
    this.ui.hudCameraDock.classList.toggle('is-minimized', this.hudCameraMinimized);
    this.ui.hudCameraToggle.textContent = this.hudCameraMinimized ? 'EXPAND [V]' : 'MINIMIZE [V]';
    this.ui.hudCameraToggle.setAttribute('aria-label', this.hudCameraMinimized ? 'Expand camera dock (V)' : 'Minimize camera dock (V)');
  };

  private setSoloMode(solo: boolean): void {
    if (this.isSoloMode !== solo) ++this.cameraActionVersion;
    this.isSoloMode = solo;
    this.ui?.modeSoloButton?.classList.toggle('active', solo);
    this.ui?.modeCoopButton?.classList.toggle('active', !solo);
    this.ui?.cameraModeSoloButton?.classList.toggle('active', solo);
    this.ui?.cameraModeCoopButton?.classList.toggle('active', !solo);
    if (this.ui?.menuSubtitle) {
      this.ui.menuSubtitle.innerHTML = solo
        ? 'Single player <span aria-hidden="true">·</span> 60 seconds'
        : 'Two-player co-op <span aria-hidden="true">·</span> 60 seconds';
    }
    document.querySelector('.player-card-p2')?.classList.toggle('solo-inactive', solo);
    this.updateInstructionsForScheme();
    this.cameraAdapter?.setSoloMode(solo);
    this.rigs.p2?.root.setVisible(!solo);
    this.updateHud();
    this.setCameraHandsStatus(solo ? 'P1: waiting' : 'P1: waiting · P2: waiting');
  }

  private setTrackingScheme(scheme: 'H0' | 'P1' | 'P2'): void {
    this.trackingScheme = scheme;
    this.ui?.schemeHandButton?.classList.toggle('active', scheme === 'H0');
    this.ui?.schemePoseBothButton?.classList.toggle('active', scheme === 'P1');
    this.ui?.schemePoseOneButton?.classList.toggle('active', scheme === 'P2');
    this.updateInstructionsForScheme();

    if (this.cameraAdapter) {
      ++this.cameraSessionId;
      this.cameraAdapter.stop();
      this.cameraAdapter = undefined;
      if (this.ui?.cameraConsent.checked) {
        this.handleCameraEnableRequested();
      }
    }
  }

  private handleHandMovementChanged = (): void => {
    if (!this.ui) return;
    const value = Number(this.ui.handMoveSlider.value) / 100;
    if (!Number.isFinite(value) || value < 0.03 || value > 0.15) return;
    this.ui.handMoveValue.textContent = Math.round(value * 100) + '%';
    if (value === this.handMoveThreshold) return;
    ++this.cameraActionVersion;
    this.handMoveThreshold = value;
    if (this.trackingScheme === 'H0' && this.cameraAdapter && 'setMoveThreshold' in this.cameraAdapter) this.cameraAdapter.setMoveThreshold(value);
    this.ui.cameraStatus.textContent = 'Movement distance changed to ' + Math.round(value * 100) + '%. Center your hand and CALIBRATE again.';
  };

  private updateInstructionsForScheme(): void {
    if (!this.ui) return;
    const solo = this.isSoloMode;
    const isHand = this.trackingScheme === 'H0';
    const isBothArms = this.trackingScheme === 'P1';
    this.updatePoseCalibrationUi();
    this.ui.handTuning.hidden = !isHand;
    this.ui.handMoveSlider.value = String(Math.round(this.handMoveThreshold * 100));
    this.ui.handMoveValue.textContent = Math.round(this.handMoveThreshold * 100) + '%';

    if (this.ui.cameraInstructions) {
      if (isHand) {
        this.ui.cameraInstructions.textContent = solo
          ? 'Move one hand left or right; pinch thumb and index finger to catch.'
          : 'Stand side by side. P1 stays camera-left, P2 camera-right. Move one hand left or right; pinch thumb and index finger to catch.';
      } else if (isBothArms) {
        this.ui.cameraInstructions.textContent = solo
          ? 'Lean upper body left or right; raise BOTH arms to catch.'
          : 'Stand side by side. P1 camera-left, P2 camera-right. Lean upper body left or right; raise BOTH arms to catch.';
      } else {
        this.ui.cameraInstructions.textContent = solo
          ? 'Lean upper body left or right; raise ONE arm to catch.'
          : 'Stand side by side. P1 camera-left, P2 camera-right. Lean upper body left or right; raise ONE arm to catch.';
      }
    }

    if (this.ui.cameraCalibrationInstructions) {
      if (isHand) {
        this.ui.cameraCalibrationInstructions.textContent = solo
          ? 'Show only one hand. Hold it near the center, then calibrate.'
          : 'Hold one visible hand near the center of each half, then calibrate both players.';
      } else {
        this.ui.cameraCalibrationInstructions.textContent = solo
          ? 'Press CALIBRATE once, then keep your shoulders still. It waits up to 8 seconds for 3 stable samples.'
          : 'Center one person in each half. Press CALIBRATE once, then keep shoulders still for 3 samples (up to 8 seconds).';
      }
    }

    if (this.ui.cameraPreviewLabel) {
      this.ui.cameraPreviewLabel.textContent = solo ? 'P1 (SOLO CONTROLS)' : 'P1 LEFT · P2 RIGHT';
    }

    if (this.ui.cameraCalibrateButton) {
      this.ui.cameraCalibrateButton.textContent = isHand
        ? (solo ? 'CALIBRATE HAND' : 'CALIBRATE BOTH HANDS')
        : (solo ? 'CALIBRATE POSE' : 'CALIBRATE BOTH POSES');
    }

    this.updateControlsHintText();
  }

  private updateControlsHintText(): void {
    if (!this.ui) return;
    if (!this.cameraMode) {
      this.ui.controlsHint.textContent = 'HOLD S / ↓ TO CATCH';
      return;
    }
    if (this.cameraAdapter?.getMetrics().recalibrationRequired) {
      this.ui.controlsHint.textContent = 'TRACKING LOST · RETURN TO YOUR SLOT · CALIBRATE';
      return;
    }
    if (this.trackingScheme === 'H0') {
      this.ui.controlsHint.textContent = 'MOVE HAND LEFT/RIGHT · PINCH TO CATCH';
    } else if (this.trackingScheme === 'P1') {
      this.ui.controlsHint.textContent = 'LEAN LEFT/RIGHT · RAISE BOTH ARMS TO CATCH';
    } else {
      this.ui.controlsHint.textContent = 'LEAN LEFT/RIGHT · RAISE ONE ARM TO CATCH';
    }
  }

  private updateCameraStatus(status: CameraInputStatus, message?: string): void {
    if (!this.ui) return;
    const metrics = this.cameraAdapter?.getMetrics();
    const delegateTag = metrics?.delegate ? ` (${metrics.delegate} active)` : '';
    const modelNoun = this.trackingScheme === 'H0' ? 'hand' : 'pose';
    const fallbackMessages: Record<CameraInputStatus, string> = {
      idle: 'Camera is off. It starts only after you choose Enable Camera.',
      'requesting-camera': 'Waiting for camera permission…',
      'loading-model': `Camera connected. Loading the ${modelNoun} model…`,
      ready: this.isSoloMode
        ? `Camera ready${delegateTag}. Place one visible person in front of the camera, then calibrate.`
        : `Camera ready${delegateTag}. Place one visible person in each half, then calibrate.`,
      stopped: 'Camera stopped. Keyboard controls remain available.',
      error: 'Camera controls could not start. Keyboard controls remain available.'
    };
    this.ui.cameraStatus.textContent = message || (status === 'ready' && this.trackingScheme === 'H0'
      ? 'Camera ready' + delegateTag + '. Hold an open hand in frame and press CALIBRATE HAND.'
      : fallbackMessages[status]);
    if (status !== 'ready') {
      this.ui.cameraCalibrateButton.disabled = true;
      this.ui.cameraStartButton.disabled = true;
    } else if (this.trackingScheme === 'H0') {
      this.ui.cameraCalibrateButton.disabled = false;
    }
    if (status === 'requesting-camera' || status === 'loading-model' || status === 'ready') {
      this.ui.cameraEnableButton.disabled = true;
      this.ui.cameraEnableButton.textContent = status === 'ready' ? 'CAMERA CONNECTED' : 'CONNECTING…';
    } else {
      this.ui.cameraEnableButton.disabled = !this.ui.cameraConsent.checked;
      if (status === 'error' || status === 'stopped') this.ui.cameraEnableButton.textContent = 'TRY CAMERA AGAIN';
    }
    if (status === 'error' && this.cameraMode) {
      if (this.ui?.hudCameraVideo) {
        this.ui.hudCameraVideo.pause();
        this.ui.hudCameraVideo.srcObject = null;
      }
      this.cameraMode = false;
      this.inputAdapter = this.keyboardAdapter;
      this.updateInputModeUi();
      this.ui.controlsHint.textContent = 'CAMERA LOST · KEYBOARD CONTROLS ACTIVE';
      this.updateHudCameraStatus('is-fallback', 'KEYBOARD ACTIVE', 'CAMERA LOST · KEYBOARD ACTIVE');
    }
  }

  private poseCalibrationHint(progress?: CameraMetrics['poseCalibration']): string {
    if (!progress?.cameraReady) return 'Enable the camera first.';
    if (!progress.playersReady) return 'Keep exactly ' + progress.expectedPlayers + (progress.expectedPlayers === 1 ? ' person' : ' people') + ' in frame.';
    if (!progress.shouldersReady) return 'Face the camera with both shoulders clearly visible.';
    if (!progress.fresh) return 'Waiting for a fresh sample; if frames remain slow, try Hand Pinch.';
    if (!progress.positionReady) return 'Stand near the center of your own slot.';
    return 'Keep your shoulders still until all 3 samples are collected.';
  }

  private updatePoseCalibrationUi(progress?: CameraMetrics['poseCalibration']): void {
    if (!this.ui) return;
    const pose = this.trackingScheme !== 'H0';
    this.ui.poseCalibrationChecks.hidden = !pose;
    this.ui.cameraCalibrateButton.classList.toggle('pose-calibration-action', pose);
    this.ui.cameraStartButton.classList.toggle('pose-calibration-action', pose);
    const saved = progress?.state === 'saved';
    const expected = progress?.expectedPlayers ?? (this.isSoloMode ? 1 : 2);
    const entries: Array<[HTMLElement, string, boolean]> = [
      [this.ui.poseCameraCheck, 'Camera connected', progress?.cameraReady ?? false],
      [this.ui.posePlayerCheck, 'Players ' + (progress?.detectedPlayers ?? 0) + '/' + expected, saved || (progress?.playersReady ?? false)],
      [this.ui.poseShoulderCheck, 'Shoulders clear', saved || (progress?.shouldersReady ?? false)],
      [this.ui.posePositionCheck, 'Correct zones', saved || (progress?.positionReady ?? false)],
      [this.ui.poseFreshCheck, saved ? 'Samples verified' : 'Fresh samples', saved || (progress?.fresh ?? false)],
      [this.ui.poseStableCheck, 'Hold still ' + (progress?.stableSamples ?? 0) + '/3', saved || progress?.stableSamples === 3]
    ];
    for (const [element, text, ready] of entries) {
      element.textContent = text;
      element.setAttribute('data-ready', String(ready));
      element.setAttribute('aria-label', text + (ready ? ': ready' : ': waiting'));
    }
  }

  private updateCameraDetection(
    players: readonly PlayerId[],
    canCalibrate: boolean,
    calibrated: boolean,
    metrics?: CameraMetrics
  ): void {
    if (!this.ui) return;
    const hasP1 = players.includes('p1');
    const hasP2 = players.includes('p2');
    const ambiguity = metrics?.ambiguityReason;
    if (metrics?.playerStates) {
      const states = metrics.playerStates;
      const progress = metrics.poseCalibration;
      const pending = progress?.pendingAction;
      const poseReady = this.cameraAdapter?.currentStatus === 'ready' || canCalibrate;
      this.updatePoseCalibrationUi(progress);
      const players = this.isSoloMode ? (['p1'] as const) : (['p1', 'p2'] as const);
      const label = (player: PlayerId) => player.toUpperCase() + ': ' + states[player].replaceAll('_', ' ');
      const cue = players.map(label).join(' · ');
      const recovery = metrics.recalibrationRequired ?? false;
      const waiting = !recovery && players.some(player => states[player] === 'WAITING_FOR_FRAME');
      const unsafe = recovery || players.some(player => ['AMBIGUOUS', 'LOST', 'RECALIBRATE'].includes(states[player]));
      const diagnostics = metrics.sampleAgeMs === undefined ? '' : ' · frame ' + metrics.sampleAgeMs + 'ms · ' + metrics.poseCount + ' pose(s)';
      this.setCameraHandsStatus(cue + ' · ' + metrics.delegate + ' · inference ' + metrics.inferenceMs + 'ms · updates ' + metrics.fps + 'Hz' + diagnostics);
      const setupHints: Partial<Record<NonNullable<CameraMetrics['readinessReason']>, string>> = {
        SLOW_FRAMES: 'Frame processing too slow: ' + metrics.sampleAgeMs + 'ms (limit 250ms). Try Hand Pinch or keyboard; calibration stays locked for safety.',
        WAITING_FOR_FRAME: 'Waiting for a fresh frame. Controls are paused; calibration is still saved.',
        NO_POSE: 'Searching for a body. Face the camera with both shoulders visible; keep your upper body in frame.',
        LOW_CONFIDENCE: 'Shoulders are not clear enough. Improve lighting and face the camera with both shoulders visible.',
        EXTRA_PERSON: 'Too many people detected. Keep only the selected players in the camera frame.',
        NEED_TWO_PLAYERS: 'Co-op needs two players, one in each half of the preview. Use Solo for one person.',
        POSITION: 'Stand in the center of your slot, away from the middle boundary, with shoulders visible.',
        READY_TO_CALIBRATE: recovery
          ? 'Body detected again. Press CALIBRATE to resume controls. Yellow skeletons are previews.'
          : 'Body detected (yellow preview). Keep arms relaxed and press CALIBRATE.'
      };
      if (!this.cameraMode && metrics.readinessReason && setupHints[metrics.readinessReason]) {
        this.ui.cameraStatus.textContent = setupHints[metrics.readinessReason]!;
      }
      this.ui.cameraHandsStatus.classList.toggle('is-ambiguous', unsafe);
      this.ui.cameraHandsStatus.classList.toggle('is-ready', calibrated && !unsafe);
      this.ui.cameraCalibrateButton.disabled = !poseReady || pending === 'start';
      this.ui.cameraCalibrateButton.textContent = pending === 'calibrate' ? 'CANCEL CALIBRATION' : 'CALIBRATE POSE';
      this.ui.cameraCalibrateButton.setAttribute('aria-busy', String(pending === 'calibrate'));
      this.ui.cameraStartButton.disabled = !calibrated || unsafe || !poseReady || Boolean(pending);
      this.ui.cameraStartButton.textContent = pending === 'start' ? 'WAITING FOR FRAME…' : 'START WITH CAMERA';
      this.ui.hudCameraRecalibrate.hidden = !recovery && pending !== 'calibrate';
      this.ui.hudCameraRecalibrate.disabled = !poseReady || pending === 'start';
      this.ui.hudCameraRecalibrate.textContent = pending === 'calibrate' ? 'CANCEL' : 'CALIBRATE';
      if (!this.cameraMode && progress) {
        if (pending === 'calibrate') this.ui.cameraStatus.textContent = 'Collecting stable samples (' + progress.stableSamples + '/3). ' + this.poseCalibrationHint(progress);
        else if (pending === 'start') this.ui.cameraStatus.textContent = 'Calibration saved. Waiting for a fresh frame to start…';
        else if (progress.state === 'saved') this.ui.cameraStatus.textContent = 'Calibration saved. Press START; it will wait for a fresh frame.';
        else if (progress.state === 'timeout') this.ui.cameraStatus.textContent = 'Calibration timed out. ' + this.poseCalibrationHint(progress) + ' Press CALIBRATE to retry.';
        else if (progress.state === 'cancelled') this.ui.cameraStatus.textContent = 'Calibration cancelled. Press CALIBRATE when ready.';
      }
      if (this.cameraMode) {
        this.updateControlsHintText();
        if (pending === 'calibrate') this.ui.controlsHint.textContent = 'CALIBRATING ' + progress!.stableSamples + '/3 · KEEP SHOULDERS STILL';
        const recoveryCue = canCalibrate ? 'BODY FOUND · CALIBRATE'
          : (metrics.posePreviewCount ?? 0) > 0 ? 'BODY FOUND · CHECK SETUP'
          : metrics.readinessReason === 'SLOW_FRAMES' ? 'SLOW FRAMES · WAIT' : 'SEARCHING FOR BODY';
        this.updateHudCameraStatus(unsafe ? 'is-ambiguous' : 'is-tracking', pending === 'calibrate' ? 'CALIBRATING' : recovery ? 'CALIBRATE' : waiting ? 'WAITING' : 'POSE INPUT', pending === 'calibrate' ? 'HOLD STILL · ' + progress!.stableSamples + '/3' : recovery ? recoveryCue + ' · ' + cue : cue);
      }
      return;
    }
    this.ui.poseCalibrationChecks.hidden = true;
    this.ui.hudCameraRecalibrate.textContent = 'CALIBRATE';
    this.ui.cameraStartButton.textContent = 'START WITH CAMERA';
    const handRecovery = metrics?.recalibrationRequired ?? false;
    this.ui.hudCameraRecalibrate.hidden = this.trackingScheme !== 'H0';
    const handWaiting = metrics?.waitingForHand ?? false;
    const handReady = this.cameraAdapter?.currentStatus === 'ready' || canCalibrate;
    this.ui.hudCameraRecalibrate.disabled = !handReady || handWaiting;
    const metricsSuffix = metrics && metrics.fps > 0
      ? ` · ${metrics.delegate} (inference ${metrics.inferenceMs}ms · updates ${metrics.fps}Hz)`
      : metrics?.delegate ? ` · ${metrics.delegate}` : '';

    const entity = this.trackingScheme === 'H0' ? 'hand' : 'pose';
    let handsStatus = '';
    if (this.isSoloMode) {
      if (ambiguity === 'multiple-hands') {
        handsStatus = `P1: ambiguous (multiple ${entity}s)${metricsSuffix}`;
      } else if (hasP1) {
        handsStatus = `P1: ${entity} detected${metricsSuffix}`;
      } else {
        handsStatus = 'P1: waiting for a hand' + metricsSuffix;
      }
    } else {
      if (ambiguity === 'hands-crossed') {
        handsStatus = `P1: ambiguous (${entity}s crossed) · P2: ambiguous (${entity}s crossed)${metricsSuffix}`;
      } else if (ambiguity === 'too-close') {
        handsStatus = `P1/P2: ambiguous (${entity}s too close)${metricsSuffix}`;
      } else if (ambiguity === 'multiple-hands') {
        handsStatus = `P1: ${hasP1 ? entity + ' detected' : 'ambiguous'} · P2: ${hasP2 ? entity + ' detected' : 'ambiguous'}${metricsSuffix}`;
      } else if (hasP1 && hasP2) {
        handsStatus = `P1: ${entity} detected · P2: ${entity} detected${metricsSuffix}`;
      } else {
        handsStatus = `P1: ${hasP1 ? entity + ' detected' : 'waiting'} · P2: ${hasP2 ? entity + ' detected' : 'waiting'}${metricsSuffix}`;
      }
    }

    if (metrics?.handMovementZones?.length) {
      handsStatus = metrics.handMovementZones.map(zone => {
        const direction = zone.moveAxis < 0 ? 'LEFT' : zone.moveAxis > 0 ? 'RIGHT' : 'STOP';
        const current = zone.currentX === undefined ? 'lost' : Math.round(zone.currentX * 100) + '%';
        return zone.player.toUpperCase() + ': ' + direction + ' · hand ' + current + ' / center ' + Math.round(zone.neutralX * 100) + '%';
      }).join(' · ') + ' · distance ' + Math.round((metrics.moveThreshold ?? this.handMoveThreshold) * 100) + '%' + metricsSuffix;
    }
    this.setCameraHandsStatus(handsStatus);
    this.ui.cameraHandsStatus.classList.toggle('is-ambiguous', Boolean(ambiguity));
    this.ui.cameraHandsStatus.classList.toggle('is-ready', Boolean(!ambiguity && (this.isSoloMode ? hasP1 : (hasP1 && hasP2))));

    this.ui.cameraCalibrateButton.disabled = !handReady || handWaiting;
    this.ui.cameraStartButton.disabled = this.isSoloMode
      ? (!calibrated || !hasP1 || Boolean(ambiguity) || handWaiting)
      : (!calibrated || !hasP1 || !hasP2 || Boolean(ambiguity) || handWaiting);
    if (!this.cameraMode && !calibrated && !handWaiting && this.trackingScheme === 'H0' && handReady) {
      this.ui.cameraStatus.textContent = metrics?.handCalibrationIssue ? HAND_CALIBRATION_HINTS[metrics.handCalibrationIssue] : canCalibrate
        ? 'Hand detected. Press CALIBRATE HAND and keep it steady.'
        : 'Hold an open hand in frame, then press CALIBRATE HAND. The button waits up to 3 seconds for a valid sample.';
    }

    if (this.cameraMode) {
      this.updateControlsHintText();
      if (handWaiting) {
        this.ui.controlsHint.textContent = 'HOLD HAND STEADY · CALIBRATING';
        this.updateHudCameraStatus('is-ambiguous', 'WAIT', 'INPUT PAUSED · HOLD STEADY');
      } else if (handRecovery) {
        this.ui.controlsHint.textContent = 'HAND RECOVERED · PRESS CALIBRATE TO RESUME';
        this.updateHudCameraStatus('is-ambiguous', 'CALIBRATE', 'INPUT PAUSED · CALIBRATE');
      } else if (ambiguity === 'hands-crossed') {
        this.ui.controlsHint.textContent = `${this.trackingScheme === 'H0' ? 'HANDS' : 'POSES'} CROSSED · RETURN TO YOUR HALF`;
        this.updateHudCameraStatus('is-ambiguous', 'AMBIGUOUS', 'BODIES CROSSED · RETURN TO HALF');
      } else if (ambiguity === 'too-close') {
        this.ui.controlsHint.textContent = `${this.trackingScheme === 'H0' ? 'HANDS' : 'BODIES'} TOO CLOSE · SEPARATE`;
        this.updateHudCameraStatus('is-ambiguous', 'AMBIGUOUS', 'TOO CLOSE · SEPARATE');
      } else if (ambiguity === 'multiple-hands') {
        this.ui.controlsHint.textContent = `MULTIPLE ${this.trackingScheme === 'H0' ? 'HANDS' : 'PERSONS'} DETECTED`;
        this.updateHudCameraStatus('is-ambiguous', 'AMBIGUOUS', 'MULTIPLE DETECTED');
      } else if (!hasP1 && (!hasP2 || this.isSoloMode)) {
        this.ui.controlsHint.textContent = `${this.trackingScheme === 'H0' ? 'HAND' : 'PLAYER'} LOST · STEP INTO CAMERA FRAME`;
        this.updateHudCameraStatus('is-lost', 'LOST', 'LOST · STEP INTO FRAME');
      } else if (!this.isSoloMode && (!hasP1 || !hasP2)) {
        const missing = !hasP1 ? 'P1' : 'P2';
        this.ui.controlsHint.textContent = `${missing} LOST · RETURN TO CAMERA`;
        this.updateHudCameraStatus('is-lost', 'OUT OF FRAME', `${missing} OUT OF FRAME`);
      } else if (metrics?.handMovementZones?.length) {
        const zones = metrics.handMovementZones;
        const cue = zones.map(zone => zone.player.toUpperCase() + ': ' + (zone.moveAxis < 0 ? 'LEFT' : zone.moveAxis > 0 ? 'RIGHT' : 'STOP') + (zone.catch ? ' + PINCH' : '')).join(' · ');
        const first = zones[0];
        const badge = this.isSoloMode ? (first.catch ? 'CATCH' : first.moveAxis < 0 ? 'MOVE LEFT' : first.moveAxis > 0 ? 'MOVE RIGHT' : 'STOP') : 'HAND INPUT';
        this.updateHudCameraStatus(zones.some(z => z.moveAxis !== 0 || z.catch) ? 'is-action' : 'is-tracking', badge, cue);
      } else {
        const p1Input = this.lastInput.p1;
        const p2Input = this.lastInput.p2;
        const isCatching = p1Input.catch || (!this.isSoloMode && p2Input.catch);
        const isMoving = p1Input.moveAxis !== 0 || (!this.isSoloMode && p2Input.moveAxis !== 0);
        if (isCatching) {
          const catchCue = this.trackingScheme === 'H0'
            ? (this.isSoloMode ? 'P1 PINCH CATCH' : 'PINCH CATCH')
            : (this.trackingScheme === 'P1' ? 'BOTH ARMS RAISED' : 'ARM RAISED');
          this.updateHudCameraStatus('is-action', 'CATCH', catchCue);
        } else if (isMoving) {
          const moveDir = (p1Input.moveAxis < 0 || p2Input.moveAxis < 0) ? 'MOVE LEFT' : 'MOVE RIGHT';
          this.updateHudCameraStatus('is-action', moveDir, this.isSoloMode ? `P1: ${moveDir}` : 'MOVING');
        } else {
          this.updateHudCameraStatus('is-tracking', 'TRACKING', this.isSoloMode ? 'P1: READY' : 'P1 & P2: READY');
        }
      }
    }
  }

  private updateHudCameraStatus(stateClass: string, badgeText: string, cueText: string): void {
    if (!this.ui) return;
    this.ui.hudCameraDock.className = `hud-camera-dock ${stateClass}${this.hudCameraMinimized ? ' is-minimized' : ''}`;
    this.ui.hudCameraBadge.textContent = badgeText;
    this.ui.hudCameraCue.textContent = cueText;
  }

  private updateInputModeUi(): void {
    if (!this.ui) return;
    const isPlaying = this.state.phase === 'playing';
    this.updateControlsHintText();
    this.ui.cameraStopButton.hidden = !this.cameraMode;
    this.ui.resultCameraStopButton.hidden = !this.cameraMode;
    this.ui.hudCameraDock.hidden = !this.cameraMode || !isPlaying;
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
    const activePlayers = this.isSoloMode ? (['p1'] as const) : (['p1', 'p2'] as const);
    for (const player of activePlayers) {
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
    const player = this.isSoloMode ? 'p1' : this.spawnPlayer;
    const limits = PLAYER_LIMITS[player];
    const x = Phaser.Math.Between(limits.min + 22, limits.max - 22);
    const kind: FallingKind = Phaser.Math.Between(0, 99) < 24 ? 'hazard' : 'energy';
    const view = this.createItemView(kind, x, -34);
    const elapsed = this.state.durationMs - this.state.timeRemainingMs;
    this.items.push({ player, kind, x, y: -34, speed: 185 + elapsed / this.state.durationMs * 90, view });
    this.spawnPlayer = this.isSoloMode ? 'p1' : (player === 'p1' ? 'p2' : 'p1');
    this.spawnAfterMs = Phaser.Math.Between(650, 950);
  }

  private announceActiveItems(): void {
    if (!this.ui || this.state.phase !== 'playing') return;
    const now = performance.now();
    if (now - this.lastItemCueAt < ITEM_CUE_INTERVAL_MS) return;
    if (now - this.lastCatchAnnouncementAt < ITEM_CUE_AFTER_CATCH_MS) return;
    const activePlayers = this.isSoloMode ? (['p1'] as const) : (['p1', 'p2'] as const);
    const pendingCues = activePlayers.flatMap((player) => {
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
      cameraCanvas: (document.getElementById('camera-preview-canvas') as HTMLCanvasElement) || undefined,
      cameraStatus: get('camera-status'),
      cameraTitle: get('camera-title'),
      cameraHandsStatus: get('camera-hands-status'),
      poseCalibrationChecks: get('pose-calibration-checks'),
      poseCameraCheck: get('pose-check-camera'),
      posePlayerCheck: get('pose-check-players'),
      poseShoulderCheck: get('pose-check-shoulders'),
      posePositionCheck: get('pose-check-position'),
      poseFreshCheck: get('pose-check-fresh'),
      poseStableCheck: get('pose-check-stable'),
      handTuning: get('hand-tuning'),
      handMoveSlider: get<HTMLInputElement>('hand-move-distance'),
      handMoveValue: get('hand-move-value'),
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
      gameAnnouncer: get('game-announcer'),
      modeSoloButton: (document.getElementById('mode-solo') as HTMLButtonElement) || undefined,
      modeCoopButton: (document.getElementById('mode-coop') as HTMLButtonElement) || undefined,
      cameraModeSoloButton: (document.getElementById('camera-mode-solo') as HTMLButtonElement) || undefined,
      cameraModeCoopButton: (document.getElementById('camera-mode-coop') as HTMLButtonElement) || undefined,
      menuSubtitle: document.getElementById('menu-subtitle') || undefined,
      cameraInstructions: document.getElementById('camera-instructions') || undefined,
      cameraCalibrationInstructions: document.getElementById('camera-calibration-instructions') || undefined,
      cameraPreviewLabel: document.getElementById('camera-preview-label') || undefined,
      schemeHandButton: (document.getElementById('scheme-hand') as HTMLButtonElement) || undefined,
      schemePoseBothButton: (document.getElementById('scheme-pose-both') as HTMLButtonElement) || undefined,
      schemePoseOneButton: (document.getElementById('scheme-pose-one') as HTMLButtonElement) || undefined,
      hudCameraDock: get('hud-camera-dock'),
      hudCameraVideo: get<HTMLVideoElement>('hud-camera-preview'),
      hudCameraCanvas: (document.getElementById('hud-skeleton-overlay') as HTMLCanvasElement) || undefined,
      hudCameraBadge: get('hud-camera-badge'),
      hudCameraCue: get('hud-camera-cue'),
      hudCameraToggle: get<HTMLButtonElement>('hud-camera-toggle'),
      hudCameraRecalibrate: get<HTMLButtonElement>('hud-camera-recalibrate')
    };
  }

  private updateHud(): void {
    if (!this.ui) return;
    const p1 = this.state.players.p1;
    const p2 = this.state.players.p2;
    const time = String(Math.ceil(this.state.timeRemainingMs / 1000)).padStart(2, '0');

    if (this.isSoloMode) {
      this.ui.p2Score.parentElement?.classList.add('solo-inactive');
      this.ui.resultP2Score.parentElement?.classList.add('solo-inactive');
    } else {
      this.ui.p2Score.parentElement?.classList.remove('solo-inactive');
      this.ui.resultP2Score.parentElement?.classList.remove('solo-inactive');
    }

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
      [this.ui.resultTeamTotal, (this.isSoloMode ? p1.score : (p1.score + p2.score)).toLocaleString()]
    ];
    const signature = `${this.isSoloMode ? 'solo' : 'coop'}|${time}|${values.map(([, value]) => value).join('|')}`;
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
    this.rigs.p2?.root.setVisible(!this.isSoloMode);
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








