import type { InputAdapter, InputFrame, PlayerId } from '../gameplay/core';
import { HAND_TRACKING_STALE_MS, HandInputMapper, type DetectedHand, type HandMovementZone, type HandCalibrationIssue } from './hand-input-mapper.ts';
import type { PosePlayerState } from './pose-input-mapper.ts';
import { renderHandOverlay } from './hand-landmarks-renderer.ts';

export type CameraInputStatus = 'idle' | 'requesting-camera' | 'loading-model' | 'ready' | 'stopped' | 'error';

export interface PoseCalibrationProgress {
  state: 'idle' | 'collecting' | 'saved' | 'cancelled' | 'timeout';
  pendingAction?: 'calibrate' | 'start';
  cameraReady: boolean;
  expectedPlayers: number;
  detectedPlayers: number;
  playersReady: boolean;
  shouldersReady: boolean;
  positionReady: boolean;
  fresh: boolean;
  stableSamples: number;
  requiredSamples: number;
}

export interface CameraMetrics {
  poseCalibration?: PoseCalibrationProgress;
  delegate: 'GPU' | 'CPU';
  inferenceMs: number;
  fps: number;
  ambiguityReason?: 'hands-crossed' | 'too-close' | 'multiple-hands' | 'in-deadband' | 'too-far' | 'association-lost' | 'tracking-lost';
  playerStates?: Record<PlayerId, PosePlayerState>;
  recalibrationRequired?: boolean;
  waitingForHand?: boolean;
  moveThreshold?: number;
  handMovementZones?: HandMovementZone[];
  handCalibrationIssue?: HandCalibrationIssue;
  freshnessMs?: number;
  sampleAgeMs?: number;
  poseCount?: number;
  posePreviewCount?: number;
  readinessReason?: 'WAITING_FOR_FRAME' | 'SLOW_FRAMES' | 'NO_POSE' | 'LOW_CONFIDENCE' | 'EXTRA_PERSON' | 'NEED_TWO_PLAYERS' | 'POSITION' | 'READY_TO_CALIBRATE' | 'ACCEPTED';
}

export interface MediaPipeHandInputOptions {
  onStatus?: (status: CameraInputStatus, message?: string) => void;
  onDetection?: (
    visiblePlayers: readonly PlayerId[],
    canCalibrate: boolean,
    calibrated: boolean,
    metrics?: CameraMetrics
  ) => void;
  onMetrics?: (metrics: CameraMetrics) => void;
  createWorker?: () => Worker;
  getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  createBitmap?: (video: HTMLVideoElement) => Promise<ImageBitmap>;
  now?: () => number;
  requestFrame?: (callback: FrameRequestCallback) => number;
  cancelFrame?: (handle: number) => void;
  soloMode?: boolean;
  moveThreshold?: number;
  overlayCanvas?: HTMLCanvasElement | HTMLCanvasElement[];
  wasmRoot?: string;
  modelPath?: string;
}

interface WorkerReadyMessage {
  type: 'ready';
  delegate?: 'GPU' | 'CPU';
}
interface WorkerResultMessage {
  type: 'result';
  timestamp: number;
  hands: Array<Array<{ x: number; y: number }>>;
  inferenceMs?: number;
  delegate?: 'GPU' | 'CPU';
}
interface WorkerErrorMessage { type: 'error'; message: string }
type WorkerResponse = WorkerReadyMessage | WorkerResultMessage | WorkerErrorMessage;

const WASM_ROOT = '/mediapipe/wasm';
const MODEL_PATH = '/mediapipe/hand_landmarker.task';
const SAMPLE_INTERVAL_MS = 85;
const MODEL_READY_TIMEOUT_MS = 30_000;
const INFERENCE_TIMEOUT_MS = 2_000;
const MAX_FRAME_CAPTURE_FAILURES = 3;
const NEUTRAL: InputFrame = {
  p1: { moveAxis: 0, catch: false },
  p2: { moveAxis: 0, catch: false }
};
const PLAYER_ID: Record<PlayerId, PlayerId> = { p1: 'p1', p2: 'p2' };

function stopStream(stream: MediaStream): void {
  for (const track of stream.getTracks()) track.stop();
}

function isVideoTrackEnded(track: MediaStreamTrack | undefined): boolean {
  return track?.readyState === 'ended';
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      return 'Camera permission was denied. You can continue with keyboard controls.';
    }
    if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      return 'No camera was found. You can continue with keyboard controls.';
    }
    if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      return 'The camera is already in use or unavailable. Close other camera apps and try again.';
    }
    if (error.name === 'OverconstrainedError' || error.name === 'NotSupportedError') {
      return 'This camera does not support the requested video settings. Try another camera or use keyboard controls.';
    }
    return error.message;
  }
  return String(error);
}

export class MediaPipeHandInputAdapter implements InputAdapter {
  private readonly mapper: HandInputMapper;
  private readonly createWorker: () => Worker;
  private readonly getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  private readonly createBitmap: (video: HTMLVideoElement) => Promise<ImageBitmap>;
  private readonly now: () => number;
  private readonly requestFrame: (callback: FrameRequestCallback) => number;
  private readonly cancelFrame: (handle: number) => void;
  private readonly onStatus?: MediaPipeHandInputOptions['onStatus'];
  private readonly onDetection?: MediaPipeHandInputOptions['onDetection'];
  private readonly onMetrics?: MediaPipeHandInputOptions['onMetrics'];
  private readonly wasmRoot: string;
  private readonly modelPath: string;
  private activeDelegate: 'GPU' | 'CPU' = 'CPU';
  private lastResultAt = 0;
  private smoothedFps = 0;
  private smoothedInferenceMs = 0;
  private soloMode: boolean;
  private stream?: MediaStream;
  private worker?: Worker;
  private frameHandle?: number;
  private readyReject?: (error: Error) => void;
  private latestHands: DetectedHand[] = [];
  private lastDetectionAt = Number.NEGATIVE_INFINITY;
  private lastVideoTime = -1;
  private lastFrameSentAt = 0;
  private inFlight = false;
  private inFlightSince = Number.NEGATIVE_INFINITY;
  private frameCaptureFailures = 0;
  private detectionWasFresh = false;
  private disposed = false;
  private calibrated = false;
  private cpuFallbackAttempted = false;
  private recoveryNeedsCalibration = false;
  private pendingAction?: { kind: 'calibrate' | 'start'; promise: Promise<boolean>; resolve: (ready: boolean) => void; timer: ReturnType<typeof setTimeout> };
  private status: CameraInputStatus = 'idle';
  private startPromise?: Promise<void>;
  private readonly video: HTMLVideoElement;
  private readonly overlayCanvases: HTMLCanvasElement[];

  constructor(video: HTMLVideoElement, options: MediaPipeHandInputOptions = {}) {
    this.video = video;
    if (Array.isArray(options.overlayCanvas)) {
      this.overlayCanvases = options.overlayCanvas;
    } else if (options.overlayCanvas) {
      this.overlayCanvases = [options.overlayCanvas];
    } else {
      this.overlayCanvases = [];
    }
    this.soloMode = options.soloMode ?? false;
    this.mapper = new HandInputMapper({ soloMode: this.soloMode, moveEnterThreshold: options.moveThreshold });
    this.wasmRoot = options.wasmRoot ?? WASM_ROOT;
    this.modelPath = options.modelPath ?? MODEL_PATH;
    this.createWorker = options.createWorker ?? (() => new Worker(
      new URL('../workers/hand-landmarker.worker.ts', import.meta.url), { type: 'module' }
    ));
    this.getUserMedia = options.getUserMedia ?? ((constraints) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        return Promise.reject(new Error('Camera access needs localhost or HTTPS in a supported browser.'));
      }
      return navigator.mediaDevices.getUserMedia(constraints);
    });
    this.createBitmap = options.createBitmap ?? (async (source) => {
      if (this.activeDelegate !== 'CPU') return createImageBitmap(source);
      // Detach pixels from the video/GPU resource before a CPU fallback worker reads them.
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 320 / Math.max(source.videoWidth, source.videoHeight));
      canvas.width = Math.max(1, Math.round(source.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(source.videoHeight * scale));
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Could not copy camera pixels for CPU tracking.');
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
      return createImageBitmap(ctx.getImageData(0, 0, canvas.width, canvas.height));
    });
    this.now = options.now ?? (() => performance.now());
    this.requestFrame = options.requestFrame ?? ((callback) => requestAnimationFrame(callback));
    this.cancelFrame = options.cancelFrame ?? ((handle) => cancelAnimationFrame(handle));
    this.onStatus = options.onStatus;
    this.onDetection = options.onDetection;
    this.onMetrics = options.onMetrics;
  }

  getMetrics(): CameraMetrics {
    const issue = this.isDetectionFresh() ? this.mapper.getCalibrationIssue(this.latestHands) : undefined;
    return {
      delegate: this.activeDelegate,
      inferenceMs: Math.round(this.smoothedInferenceMs),
      fps: Math.round(this.smoothedFps),
      recalibrationRequired: this.recoveryNeedsCalibration,
      waitingForHand: Boolean(this.pendingAction),
      moveThreshold: this.mapper.getMoveThreshold(),
      handMovementZones: this.calibrated && this.pendingAction?.kind !== 'calibrate' ? this.mapper.getMovementZones(this.now()) : [],
      handCalibrationIssue: issue,
      ambiguityReason: this.mapper.getLastAmbiguityReason()
    };
  }

  getLatestHands(): readonly DetectedHand[] {
    return this.isDetectionFresh() ? this.latestHands : [];
  }

  getStream(): MediaStream | undefined {
    return this.stream;
  }

  setSoloMode(solo: boolean): void {
    if (this.soloMode === solo) return;
    this.finishFreshAction(false);
    this.soloMode = solo;
    this.mapper.setSoloMode(solo);
    this.calibrated = false;
    this.notifyDetection();
  }

  setMoveThreshold(threshold: number): void {
    if (threshold === this.mapper.getMoveThreshold()) return;
    this.mapper.setMoveThreshold(threshold);
    this.finishFreshAction(false);
    this.calibrated = false;
    this.recoveryNeedsCalibration = true;
    this.notifyDetection();
  }

  isSoloMode(): boolean {
    return this.soloMode;
  }

  get currentStatus(): CameraInputStatus {
    return this.status;
  }

  get isCalibrated(): boolean {
    return this.calibrated;
  }

  async start(): Promise<void> {
    if (this.startPromise) return this.startPromise;
    this.disposed = false;
    this.cpuFallbackAttempted = false;
    this.recoveryNeedsCalibration = false;
    this.setStatus('requesting-camera');
    this.startPromise = this.startResources();
    try {
      await this.startPromise;
    } finally {
      this.startPromise = undefined;
    }
  }

  read(): InputFrame {
    if (this.status !== 'ready' || !this.calibrated || this.pendingAction?.kind === 'calibrate') {
      return { p1: { ...NEUTRAL.p1 }, p2: { ...NEUTRAL.p2 } };
    }
    return this.mapper.read(this.now());
  }

  canCalibrate(): boolean {
    return this.status === 'ready' && this.isDetectionFresh() && this.mapper.canCalibrate(this.latestHands);
  }

  canStart(): boolean {
    return this.status === 'ready' && this.calibrated && this.isDetectionFresh() && this.mapper.canTrack(this.latestHands);
  }

  calibrate(): boolean {
    if (!this.canCalibrate()) return false;
    this.calibrated = this.mapper.calibrate(this.latestHands, this.now());
    if (this.calibrated) this.recoveryNeedsCalibration = false;
    this.notifyDetection();
    return this.calibrated;
  }

  requestCalibration(): Promise<boolean> {
    return this.requestFreshAction('calibrate');
  }

  requestStartReadiness(): Promise<boolean> {
    return this.requestFreshAction('start');
  }

  private requestFreshAction(kind: 'calibrate' | 'start'): Promise<boolean> {
    if (this.disposed || this.status !== 'ready' || (kind === 'start' && !this.calibrated)) return Promise.resolve(false);
    if (this.pendingAction) return this.pendingAction.kind === kind ? this.pendingAction.promise : Promise.resolve(false);
    if (kind === 'calibrate' ? this.calibrate() : this.canStart()) return Promise.resolve(true);
    let settle!: (ready: boolean) => void;
    const promise = new Promise<boolean>(resolve => { settle = resolve; });
    const timer = setTimeout(() => {
      this.finishFreshAction(false);
      this.notifyDetection();
    }, 3_000);
    this.pendingAction = { kind, promise, resolve: settle, timer };
    this.notifyDetection();
    return promise;
  }

  private finishFreshAction(ready: boolean): void {
    const pending = this.pendingAction;
    if (!pending) return;
    this.pendingAction = undefined;
    clearTimeout(pending.timer);
    pending.resolve(ready);
  }

  stop(): void {
    if (this.disposed && !this.stream && !this.worker) return;
    this.disposed = true;
    this.finishFreshAction(false);
    if (this.frameHandle !== undefined) this.cancelFrame(this.frameHandle);
    this.frameHandle = undefined;
    this.readyReject?.(new Error('Camera setup cancelled.'));
    this.readyReject = undefined;
    this.releaseResources();
    this.latestHands = [];
    this.lastDetectionAt = Number.NEGATIVE_INFINITY;
    this.detectionWasFresh = false;
    this.calibrated = false;
    this.mapper.reset();
    this.setStatus('stopped');
    this.notifyDetection();
  }

  private async startResources(): Promise<void> {
    try {
      const stream = await this.getUserMedia({
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 360 },
          frameRate: { ideal: 15, max: 20 }
        }
      });
      if (this.disposed) {
        stopStream(stream);
        return;
      }
      this.stream = stream;
      const videoTrack = stream.getVideoTracks()[0];
      videoTrack?.addEventListener('ended', this.handleTrackEnded);
      if (isVideoTrackEnded(videoTrack)) throw new Error('The camera stopped before the hand model finished loading.');
      this.video.srcObject = stream;
      this.video.muted = true;
      this.video.playsInline = true;
      await this.video.play();
      if (this.disposed) return;
      this.video.dataset.active = 'true';

      this.setStatus('loading-model');
      this.worker = this.createWorker();
      await this.waitUntilWorkerReady(this.worker);
      if (this.disposed) return;

      if (isVideoTrackEnded(videoTrack)) throw new Error('The camera disconnected while the hand model was loading.');
      this.setStatus('ready');
      this.frameHandle = this.requestFrame(this.captureFrame);
    } catch (error) {
      if (this.disposed) {
        if (this.status === 'error') throw error instanceof Error ? error : new Error(errorMessage(error));
        return;
      }
      const message = errorMessage(error);
      this.releaseResources();
      this.setStatus('error', message);
      throw new Error(message, { cause: error });
    }
  }

  private waitUntilWorkerReady(worker: Worker, delegate: 'GPU' | 'CPU' = 'GPU'): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('The hand model did not finish loading in time.'));
      }, MODEL_READY_TIMEOUT_MS);
      const cleanup = () => {
        clearTimeout(timeout);
        this.readyReject = undefined;
        worker.removeEventListener('message', onMessage);
        worker.removeEventListener('error', onError);
      };
      const onError = (event: ErrorEvent) => {
        cleanup();
        reject(new Error(event.message || 'The hand model worker failed to start.'));
      };
      const onMessage = (event: MessageEvent<WorkerResponse>) => {
        if (event.data.type === 'ready') {
          if (event.data.delegate) {
            this.activeDelegate = event.data.delegate;
          }
          cleanup();
          worker.addEventListener('message', this.handleWorkerMessage);
          worker.addEventListener('error', this.handleWorkerError);
          resolve();
        } else if (event.data.type === 'error') {
          cleanup();
          reject(new Error(event.data.message));
        }
      };
      this.readyReject = (error) => {
        cleanup();
        reject(error);
      };
      worker.addEventListener('message', onMessage);
      worker.addEventListener('error', onError);
      worker.postMessage({ type: 'init', wasmRoot: this.wasmRoot, modelPath: this.modelPath, delegate });
    });
  }

  private captureFrame: FrameRequestCallback = () => {
    if (this.disposed || this.status !== 'ready') return;
    const now = this.now();
    this.expireStaleDetection(now);
    if (this.inFlight && now - this.inFlightSince > INFERENCE_TIMEOUT_MS) {
      if (this.activeDelegate === 'GPU' && !this.cpuFallbackAttempted) void this.retryWithCpu();
      else this.fail('The hand model stopped responding on CPU. Camera controls were stopped; keyboard controls remain available.');
      return;
    }
    if (
      !this.inFlight &&
      this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
      this.video.currentTime !== this.lastVideoTime &&
      now - this.lastFrameSentAt >= SAMPLE_INTERVAL_MS &&
      this.worker
    ) {
      this.lastVideoTime = this.video.currentTime;
      this.lastFrameSentAt = now;
      this.inFlight = true;
      this.inFlightSince = now;
      const capturedWorker = this.worker;
      Promise.resolve().then(() => this.createBitmap(this.video)).then((bitmap) => {
        if (this.disposed || this.worker !== capturedWorker) {
          bitmap.close();
          return;
        }
        try {
          capturedWorker.postMessage({ type: 'frame', bitmap, timestamp: now }, [bitmap]);
          this.frameCaptureFailures = 0;
        } catch (error) {
          bitmap.close();
          throw error;
        }
      }).catch((error: unknown) => {
        if (this.disposed || this.worker !== capturedWorker) return;
        this.inFlight = false;
        this.inFlightSince = Number.NEGATIVE_INFINITY;
        this.frameCaptureFailures += 1;
        const message = `Camera frame capture failed (${this.frameCaptureFailures}/${MAX_FRAME_CAPTURE_FAILURES}): ${errorMessage(error)}`;
        if (this.frameCaptureFailures >= MAX_FRAME_CAPTURE_FAILURES) this.fail(`${message} Camera controls were stopped.`);
        else this.onStatus?.('ready', message);
      });
    }
    this.frameHandle = this.requestFrame(this.captureFrame);
  };

  private async retryWithCpu(): Promise<void> {
    if (this.disposed || this.cpuFallbackAttempted) return;
    this.cpuFallbackAttempted = true;
    this.finishFreshAction(false);
    this.worker?.removeEventListener('message', this.handleWorkerMessage);
    this.worker?.removeEventListener('error', this.handleWorkerError);
    this.worker?.terminate();
    this.worker = undefined;
    this.inFlight = false;
    this.inFlightSince = Number.NEGATIVE_INFINITY;
    this.lastVideoTime = -1;
    this.lastFrameSentAt = Number.NEGATIVE_INFINITY;
    this.lastDetectionAt = Number.NEGATIVE_INFINITY;
    this.latestHands = [];
    this.detectionWasFresh = false;
    this.lastResultAt = 0;
    this.smoothedFps = 0;
    this.smoothedInferenceMs = 0;
    this.calibrated = false;
    this.mapper.reset();
    this.recoveryNeedsCalibration = true;
    this.setStatus('loading-model', 'Hand GPU processing stalled. Trying CPU; calibrate again when ready.');
    this.notifyDetection();
    try {
      const worker = this.createWorker();
      this.worker = worker;
      await this.waitUntilWorkerReady(worker, 'CPU');
      if (this.disposed) return;
      this.setStatus('ready', 'Hand CPU fallback ready. Calibrate again before starting.');
      this.notifyDetection();
      this.frameHandle = this.requestFrame(this.captureFrame);
    } catch (error) {
      if (!this.disposed) this.fail(errorMessage(error));
    }
  }

  private handleWorkerMessage = (event: MessageEvent<WorkerResponse>): void => {
    if (this.disposed) return;
    if (event.data.type === 'result') {
      this.inFlight = false;
      this.inFlightSince = Number.NEGATIVE_INFINITY;
      const now = this.now();
      if (this.lastResultAt > 0) {
        const dt = now - this.lastResultAt;
        if (dt > 0) {
          const instantFps = 1000 / dt;
          this.smoothedFps = this.smoothedFps === 0 ? instantFps : this.smoothedFps * 0.8 + instantFps * 0.2;
        }
      }
      this.lastResultAt = now;
      if (typeof event.data.inferenceMs === 'number') {
        this.smoothedInferenceMs = this.smoothedInferenceMs === 0
          ? event.data.inferenceMs
          : this.smoothedInferenceMs * 0.8 + event.data.inferenceMs * 0.2;
      }
      if (event.data.delegate) {
        this.activeDelegate = event.data.delegate;
      }
      this.lastDetectionAt = now;
      this.latestHands = event.data.hands.map((landmarks) => ({ landmarks }));
      this.detectionWasFresh = this.latestHands.length > 0;
      if (this.calibrated) this.mapper.update(this.latestHands, this.lastDetectionAt);
      if (this.pendingAction) {
        const ready = this.pendingAction.kind === 'calibrate' ? this.calibrate() : this.canStart();
        if (ready) this.finishFreshAction(true);
      }
      this.notifyDetection();
    } else if (event.data.type === 'error') {
      this.fail(event.data.message);
    }
  };

  private handleWorkerError = (event: ErrorEvent): void => {
    this.fail(event.message || 'The hand model worker stopped unexpectedly.');
  };

  private handleTrackEnded = (): void => {
    if (!this.disposed) this.fail('The camera was disconnected. Keyboard controls are available.');
  };

  private fail(message: string): void {
    if (this.disposed) return;
    this.disposed = true;
    this.finishFreshAction(false);
    this.readyReject?.(new Error(message));
    this.readyReject = undefined;
    this.releaseResources();
    this.mapper.reset();
    this.latestHands = [];
    this.lastDetectionAt = Number.NEGATIVE_INFINITY;
    this.detectionWasFresh = false;
    this.calibrated = false;
    this.setStatus('error', message);
    this.notifyDetection();
  }

  private releaseResources(): void {
    if (this.frameHandle !== undefined) this.cancelFrame(this.frameHandle);
    this.frameHandle = undefined;
    const stream = this.stream;
    this.stream = undefined;
    if (stream) {
      for (const track of stream.getTracks()) {
        track.removeEventListener('ended', this.handleTrackEnded);
        track.stop();
      }
    }
    this.video.pause();
    this.video.srcObject = null;
    delete this.video.dataset.active;
    for (const canvas of this.overlayCanvases) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    this.worker?.removeEventListener('message', this.handleWorkerMessage);
    this.worker?.removeEventListener('error', this.handleWorkerError);
    this.worker?.terminate();
    this.worker = undefined;
    this.inFlight = false;
    this.inFlightSince = Number.NEGATIVE_INFINITY;
    this.frameCaptureFailures = 0;
    this.lastResultAt = 0;
    this.smoothedFps = 0;
    this.smoothedInferenceMs = 0;
  }

  private notifyDetection(): void {
    const visiblePlayers: PlayerId[] = [];
    const fresh = this.isDetectionFresh();
    if (fresh) {
      if (this.soloMode) {
        if (this.latestHands.length > 0) visiblePlayers.push(PLAYER_ID.p1);
      } else {
        const left = this.latestHands.some((hand) => hand.landmarks[0] && 1 - hand.landmarks[0].x < 0.465);
        const right = this.latestHands.some((hand) => hand.landmarks[0] && 1 - hand.landmarks[0].x > 0.535);
        if (left) visiblePlayers.push(PLAYER_ID.p1);
        if (right) visiblePlayers.push(PLAYER_ID.p2);
      }
    }
    const metrics = this.getMetrics();
    for (const canvas of this.overlayCanvases) {
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      if (this.video.videoWidth && this.video.videoHeight) {
        if (canvas.width !== this.video.videoWidth || canvas.height !== this.video.videoHeight) {
          canvas.width = this.video.videoWidth;
          canvas.height = this.video.videoHeight;
        }
      }
      renderHandOverlay(ctx, canvas, fresh ? this.latestHands : [], this.soloMode, metrics.handMovementZones);
    }
    this.onMetrics?.(metrics);
    this.onDetection?.(visiblePlayers, this.canCalibrate(), this.calibrated, metrics);
  }

  private isDetectionFresh(now = this.now()): boolean {
    return this.latestHands.length > 0 && now - this.lastDetectionAt <= HAND_TRACKING_STALE_MS;
  }

  private expireStaleDetection(now: number): void {
    if (!this.detectionWasFresh || now - this.lastDetectionAt <= HAND_TRACKING_STALE_MS) return;
    this.latestHands = [];
    this.detectionWasFresh = false;
    this.notifyDetection();
  }

  private setStatus(status: CameraInputStatus, message?: string): void {
    this.status = status;
    this.onStatus?.(status, message);
  }
}
