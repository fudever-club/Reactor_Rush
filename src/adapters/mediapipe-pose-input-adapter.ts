import type { InputAdapter, InputFrame, PlayerId } from '../gameplay/core';
import type { CameraInputStatus, CameraMetrics, PoseCalibrationProgress } from './mediapipe-hand-input-adapter.ts';
import {
  PoseInputMapper,
  POSE_TRACKING_STALE_MS,
  extractPoseMetrics,
  type PosePlayerState,
  type DetectedPose,
  type PoseGestureScheme
} from './pose-input-mapper.ts';
import { renderPoseOverlay, type RenderedPlayerPose } from './pose-landmarks-renderer.ts';
import type { DetectedPoseResult } from '../workers/pose-landmarker.worker.ts';

export interface MediaPipePoseInputOptions {
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
  scheme?: PoseGestureScheme;
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
  poses: DetectedPoseResult[];
  inferenceMs?: number;
  delegate?: 'GPU' | 'CPU';
}

interface WorkerErrorMessage {
  type: 'error';
  message: string;
}

type WorkerResponse = WorkerReadyMessage | WorkerResultMessage | WorkerErrorMessage;

const WASM_ROOT = '/mediapipe/wasm';
const MODEL_PATH = '/mediapipe/pose_landmarker_lite.task';
const SAMPLE_INTERVAL_MS = 65;
const MODEL_READY_TIMEOUT_MS = 30_000;
const INFERENCE_TIMEOUT_MS = 2_000;
const MAX_FRAME_CAPTURE_FAILURES = 3;

const NEUTRAL: InputFrame = {
  p1: { moveAxis: 0, catch: false },
  p2: { moveAxis: 0, catch: false }
};

function stopStream(stream?: MediaStream): void {
  if (!stream) return;
  for (const track of stream.getTracks()) track.stop();
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      return 'Camera permission was denied. Allow camera access in your browser or use keyboard controls.';
    }
    if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      return 'No camera was found on this device. Connect a camera or use keyboard controls.';
    }
    if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      return 'The camera is in use by another app or tab. Close other camera apps or use keyboard controls.';
    }
    if (error.name === 'OverconstrainedError' || error.name === 'NotSupportedError') {
      return 'This camera does not support the requested video settings. Try another camera or use keyboard controls.';
    }
    return error.message;
  }
  return String(error);
}

export class MediaPipePoseInputAdapter implements InputAdapter {
  private readonly mapper: PoseInputMapper;
  private readonly createWorker: () => Worker;
  private readonly getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  private readonly createBitmap: (video: HTMLVideoElement) => Promise<ImageBitmap>;
  private readonly now: () => number;
  private readonly requestFrame: (callback: FrameRequestCallback) => number;
  private readonly cancelFrame: (handle: number) => void;
  private readonly onStatus?: MediaPipePoseInputOptions['onStatus'];
  private readonly onDetection?: MediaPipePoseInputOptions['onDetection'];
  private readonly onMetrics?: MediaPipePoseInputOptions['onMetrics'];
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
  private modelReadyTimer?: ReturnType<typeof setTimeout>;
  private latestPoses: DetectedPose[] = [];
  private lastDetectionAt = Number.NEGATIVE_INFINITY;
  private lastSampleAgeMs?: number;
  private detectedPoseCount = 0;
  private validPoseCount = 0;
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
  private status: CameraInputStatus = 'idle';
  private startPromise?: Promise<void>;
  private sessionGeneration = 0;
  private pendingAction?: { kind: 'calibrate' | 'start'; promise: Promise<boolean>; resolve: (ready: boolean) => void; timer: ReturnType<typeof setTimeout> };
  private calibrationState: PoseCalibrationProgress['state'] = 'idle';
  private stableSamples = 0;
  private stableAnchor?: Array<{ x: number; width: number }>;
  private stableAt = Number.NEGATIVE_INFINITY;
  private readonly video: HTMLVideoElement;
  private readonly overlayCanvases: HTMLCanvasElement[];

  constructor(video: HTMLVideoElement, options: MediaPipePoseInputOptions = {}) {
    this.video = video;
    if (Array.isArray(options.overlayCanvas)) {
      this.overlayCanvases = options.overlayCanvas;
    } else if (options.overlayCanvas) {
      this.overlayCanvases = [options.overlayCanvas];
    } else {
      this.overlayCanvases = [];
    }
    this.soloMode = options.soloMode ?? false;
    this.mapper = new PoseInputMapper({
      soloMode: this.soloMode,
      scheme: options.scheme ?? 'P1'
    });
    this.wasmRoot = options.wasmRoot ?? WASM_ROOT;
    this.modelPath = options.modelPath ?? MODEL_PATH;
    this.createWorker = options.createWorker ?? (() => new Worker(
      new URL('../workers/pose-landmarker.worker.ts', import.meta.url), { type: 'module' }
    ));
    this.getUserMedia = options.getUserMedia ?? ((constraints) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        return Promise.reject(new Error('Camera access needs localhost or HTTPS in a supported browser.'));
      }
      return navigator.mediaDevices.getUserMedia(constraints);
    });
    this.createBitmap = options.createBitmap ?? ((source) => {
      // Preserve framing/normalized coordinates while reducing CPU capture and preprocessing work.
      const width = source.videoWidth;
      const height = source.videoHeight;
      if (this.activeDelegate !== 'CPU' || !width || !height || Math.max(width, height) <= 320) {
        return createImageBitmap(source);
      }
      const scale = 320 / Math.max(width, height);
      return createImageBitmap(source, {
        resizeWidth: Math.max(1, Math.round(width * scale)),
        resizeHeight: Math.max(1, Math.round(height * scale)),
        resizeQuality: 'low'
      });
    });
    this.now = options.now ?? (() => performance.now());
    this.requestFrame = options.requestFrame ?? ((callback) => requestAnimationFrame(callback));
    this.cancelFrame = options.cancelFrame ?? ((handle) => cancelAnimationFrame(handle));
    this.onStatus = options.onStatus;
    this.onDetection = options.onDetection;
    this.onMetrics = options.onMetrics;
  }

  getMetrics(): CameraMetrics {
    return {
      poseCalibration: this.getCalibrationProgress(),
      delegate: this.activeDelegate,
      inferenceMs: Math.round(this.smoothedInferenceMs),
      fps: Math.round(this.smoothedFps),
      playerStates: this.getPlayerStates(),
      recalibrationRequired: this.recoveryNeedsCalibration || (this.calibrated && this.mapper.needsRecalibration()),
      readinessReason: this.getReadinessReason(),
      sampleAgeMs: this.lastSampleAgeMs === undefined ? undefined : Math.round(this.lastSampleAgeMs),
      poseCount: this.detectedPoseCount,
      posePreviewCount: this.isDetectionFresh() ? this.latestPoses.length : 0,
      freshnessMs: Number.isFinite(this.lastDetectionAt) ? Math.max(0, this.now() - this.lastDetectionAt) : undefined,
      ambiguityReason: this.mapper.getLastAmbiguityReason()
    };
  }

  getLatestPoses(): readonly DetectedPose[] {
    return this.isDetectionFresh() ? this.latestPoses : [];
  }

  getStream(): MediaStream | undefined {
    return this.stream;
  }

  setSoloMode(solo: boolean): void {
    if (this.soloMode === solo) return;
    this.cancelPendingAction();
    this.calibrationState = 'idle';
    this.soloMode = solo;
    this.mapper.setSoloMode(solo);
    this.calibrated = false;
    this.notifyDetection();
  }

  setScheme(scheme: PoseGestureScheme): void {
    if (scheme !== this.mapper.getScheme()) this.cancelPendingAction();
    this.mapper.setScheme(scheme);
  }

  getScheme(): PoseGestureScheme {
    return this.mapper.getScheme();
  }

  get currentStatus(): CameraInputStatus {
    return this.status;
  }

  async start(): Promise<void> {
    if (this.startPromise) return this.startPromise;
    if (!this.disposed && (this.status === 'ready' || this.status === 'loading-model')) return;
    const generation = ++this.sessionGeneration;
    this.disposed = false;
    this.cpuFallbackAttempted = false;
    this.recoveryNeedsCalibration = false;
    this.setStatus('requesting-camera');
    const starting = this.startResources(generation);
    this.startPromise = starting;
    try {
      await starting;
    } finally {
      if (this.startPromise === starting) this.startPromise = undefined;
    }
  }

  read(): InputFrame {
    if (this.status !== 'ready' || !this.calibrated || this.pendingAction?.kind === 'calibrate') {
      return { p1: { ...NEUTRAL.p1 }, p2: { ...NEUTRAL.p2 } };
    }
    return this.mapper.read(this.now());
  }

  canCalibrate(): boolean {
    return this.status === 'ready' && this.isDetectionFresh() && this.mapper.canCalibrate(this.latestPoses);
  }

  canStart(): boolean {
    return this.status === 'ready' && this.calibrated && !this.mapper.needsRecalibration() && this.isDetectionFresh() && this.mapper.canCalibrate(this.latestPoses);
  }

  calibrate(): boolean {
    if (!this.canCalibrate()) return false;
    this.calibrated = this.mapper.calibrate(this.latestPoses, this.lastDetectionAt);
    if (this.calibrated) {
      this.recoveryNeedsCalibration = false;
      this.mapper.update(this.latestPoses, this.lastDetectionAt);
    }
    this.notifyDetection();
    return this.calibrated;
  }

  requestCalibration(): Promise<boolean> {
    if (this.disposed || this.status !== 'ready') return Promise.resolve(false);
    if (this.pendingAction) return this.pendingAction.kind === 'calibrate' ? this.pendingAction.promise : Promise.resolve(false);
    this.calibrated = false;
    this.recoveryNeedsCalibration = true;
    this.mapper.reset();
    this.resetCalibrationSamples();
    this.calibrationState = 'collecting';
    return this.beginPendingAction('calibrate', 8_000);
  }

  requestStartReadiness(): Promise<boolean> {
    if (this.disposed || this.status !== 'ready' || !this.calibrated || this.mapper.needsRecalibration()) return Promise.resolve(false);
    if (this.pendingAction) return this.pendingAction.kind === 'start' ? this.pendingAction.promise : Promise.resolve(false);
    if (this.canStart()) return Promise.resolve(true);
    return this.beginPendingAction('start', 3_000);
  }

  cancelPendingAction(): void {
    if (!this.pendingAction) return;
    this.finishPendingAction(false, 'cancelled');
    this.notifyDetection();
  }

  private beginPendingAction(kind: 'calibrate' | 'start', timeoutMs: number): Promise<boolean> {
    let settle!: (ready: boolean) => void;
    const promise = new Promise<boolean>(resolve => { settle = resolve; });
    const timer = setTimeout(() => {
      this.finishPendingAction(false, 'timeout');
      this.notifyDetection();
    }, timeoutMs);
    this.pendingAction = { kind, promise, resolve: settle, timer };
    this.notifyDetection();
    return promise;
  }

  private finishPendingAction(ready: boolean, state: PoseCalibrationProgress['state'] = 'idle'): void {
    const pending = this.pendingAction;
    if (!pending) return;
    this.pendingAction = undefined;
    clearTimeout(pending.timer);
    if (pending.kind === 'calibrate') {
      this.calibrationState = ready ? 'saved' : state;
      if (!ready) this.resetCalibrationSamples();
    }
    pending.resolve(ready);
  }

  private resetCalibrationSamples(): void {
    this.stableSamples = 0;
    this.stableAnchor = undefined;
    this.stableAt = Number.NEGATIVE_INFINITY;
  }

  private processPendingAction(): void {
    if (this.pendingAction?.kind === 'start') {
      if (!this.calibrated || this.mapper.needsRecalibration()) this.finishPendingAction(false);
      else if (this.canStart()) this.finishPendingAction(true);
      return;
    }
    if (this.pendingAction?.kind !== 'calibrate') return;
    if (!this.canCalibrate()) { this.resetCalibrationSamples(); return; }
    const points = this.latestPoses.map(pose => extractPoseMetrics(pose))
      .sort((a, b) => a.screenTorsoX - b.screenTorsoX)
      .map(m => ({ x: m.screenTorsoX, width: m.shoulderWidth }));
    const stable = this.stableAnchor && this.lastDetectionAt - this.stableAt <= 1_500 &&
      points.every((p, i) => Math.abs(p.x - this.stableAnchor![i].x) <= 0.025 &&
        Math.abs(p.width / this.stableAnchor![i].width - 1) <= 0.15);
    if (!stable) { this.stableAnchor = points; this.stableAt = this.lastDetectionAt; this.stableSamples = 1; }
    else this.stableSamples += 1;
    if (this.stableSamples >= 3) this.finishPendingAction(this.calibrate());
  }

  private getCalibrationProgress(): PoseCalibrationProgress {
    const expected = this.soloMode ? 1 : 2;
    const cameraReady = this.status === 'ready';
    const saved = cameraReady && this.calibrated && !this.mapper.needsRecalibration();
    return {
      state: this.pendingAction?.kind === 'calibrate' ? 'collecting' : saved ? 'saved' : this.calibrationState === 'saved' ? 'idle' : this.calibrationState,
      pendingAction: this.pendingAction?.kind,
      cameraReady,
      expectedPlayers: expected, detectedPlayers: cameraReady ? this.detectedPoseCount : 0,
      playersReady: cameraReady && this.detectedPoseCount === expected,
      shouldersReady: cameraReady && this.detectedPoseCount === expected && this.validPoseCount === expected,
      positionReady: this.canCalibrate(),
      fresh: this.isDetectionFresh() && (this.lastSampleAgeMs ?? Infinity) < POSE_TRACKING_STALE_MS,
      stableSamples: saved ? 3 : this.pendingAction?.kind === 'calibrate' ? this.stableSamples : 0, requiredSamples: 3
    };
  }

  stop(): void {
    if (this.disposed && !this.stream && !this.worker) return;
    this.disposed = true;
    this.sessionGeneration += 1;
    this.startPromise = undefined;
    this.finishPendingAction(false, 'cancelled');
    if (this.frameHandle !== undefined) this.cancelFrame(this.frameHandle);
    this.frameHandle = undefined;
    this.readyReject?.(new Error('Camera setup cancelled.'));
    this.readyReject = undefined;
    this.releaseResources();
    this.latestPoses = [];
    this.lastDetectionAt = Number.NEGATIVE_INFINITY;
    this.detectionWasFresh = false;
    this.calibrated = false;
    this.mapper.reset();
    this.setStatus('stopped');
    this.notifyDetection();
  }

  private async startResources(generation: number): Promise<void> {
    try {
      const stream = await this.getUserMedia({
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 360 },
          frameRate: { ideal: 20, max: 24 }
        }
      });
      if (this.disposed || generation !== this.sessionGeneration) {
        stopStream(stream);
        return;
      }
      this.stream = stream;
      if (stream.getVideoTracks().some(track => track.readyState === 'ended')) {
        throw new Error('The camera stopped before the pose model finished loading.');
      }
      for (const track of stream.getTracks()) {
        track.addEventListener('ended', this.handleTrackEnded);
      }
      this.video.srcObject = stream;
      this.video.dataset.active = 'true';
      await this.video.play();
      if (this.disposed || generation !== this.sessionGeneration) return;
      this.setStatus('loading-model', 'Camera connected. Loading the pose model…');
      await this.initWorker();
      if (this.disposed || generation !== this.sessionGeneration) return;
      if (stream.getVideoTracks().some(track => track.readyState === 'ended')) {
        throw new Error('The camera disconnected while the pose model was loading.');
      }
      this.setStatus('ready');
      this.notifyDetection();
      this.startLoop();
    } catch (error) {
      if (generation !== this.sessionGeneration || this.status === 'stopped') return;
      this.fail(normalizeErrorMessage(error));
      throw new Error(normalizeErrorMessage(error), { cause: error });
    }
  }

  private initWorker(delegate: 'GPU' | 'CPU' = 'GPU'): Promise<void> {
    const generation = this.sessionGeneration;
    return new Promise((resolve, reject) => {
      const worker = this.createWorker();
      this.worker = worker;
      const active = () => !this.disposed && generation === this.sessionGeneration && this.worker === worker;
      const cleanup = () => {
        clearTimeout(timer);
        if (this.modelReadyTimer === timer) this.modelReadyTimer = undefined;
        if (this.readyReject === onReject) this.readyReject = undefined;
        worker.removeEventListener('message', onInitMessage);
        worker.removeEventListener('error', onError);
      };
      const onReject = (error: Error) => { cleanup(); reject(error); };
      const onError = (event: ErrorEvent) => {
        if (active()) onReject(new Error(event.message || 'The pose model worker failed to start.'));
      };
      const onInitMessage = (event: MessageEvent<WorkerResponse>) => {
        if (!active()) return;
        if (event.data.type === 'ready') {
          cleanup();
          this.activeDelegate = event.data.delegate ?? 'CPU';
          worker.addEventListener('message', this.handleWorkerMessage);
          worker.addEventListener('error', this.handleWorkerError);
          resolve();
        } else if (event.data.type === 'error') {
          onReject(new Error(event.data.message));
        }
      };
      const timer = this.modelReadyTimer = setTimeout(() => {
        onReject(new Error('The pose model took too long to load. Using keyboard controls.'));
      }, MODEL_READY_TIMEOUT_MS);
      this.readyReject = onReject;
      worker.addEventListener('message', onInitMessage);
      worker.addEventListener('error', onError);
      try {
        worker.postMessage({ type: 'init', wasmRoot: this.wasmRoot, modelPath: this.modelPath, numPoses: 3, delegate });
      } catch (error) {
        onReject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  private startLoop(): void {
    const loop = () => {
      if (this.disposed) return;
      this.pumpFrame();
      this.frameHandle = this.requestFrame(loop);
    };
    this.frameHandle = this.requestFrame(loop);
  }

  private pumpFrame(): void {
    const now = this.now();
    this.expireStaleDetection(now);

    if (this.status !== 'ready' || !this.worker || this.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
    if (this.inFlight) {
      if (now - this.inFlightSince > INFERENCE_TIMEOUT_MS) {
        if (this.activeDelegate === 'GPU' && !this.cpuFallbackAttempted) void this.retryWithCpu();
        else this.fail('Pose processing stopped responding on CPU. Use keyboard controls or retry camera.');
      }
      return;
    }
    if (now - this.lastFrameSentAt < SAMPLE_INTERVAL_MS) return;
    if (this.video.currentTime === this.lastVideoTime && this.lastVideoTime >= 0) return;

    this.lastVideoTime = this.video.currentTime;
    this.lastFrameSentAt = now;
    this.inFlight = true;
    this.inFlightSince = now;

    const capturedWorker = this.worker;
    let capture: Promise<ImageBitmap>;
    try { capture = this.createBitmap(this.video); }
    catch (error) { capture = Promise.reject(error); }
    capture.then((bitmap) => {
        if (this.disposed || this.worker !== capturedWorker || this.now() - now >= POSE_TRACKING_STALE_MS) {
          bitmap.close();
          if (this.worker === capturedWorker) {
            this.inFlight = false;
            this.inFlightSince = Number.NEGATIVE_INFINITY;
          }
          return;
        }
        try {
          capturedWorker.postMessage({ type: 'frame', bitmap, timestamp: now }, [bitmap]);
          this.frameCaptureFailures = 0;
        } catch (error) {
          bitmap.close();
          throw error;
        }
      })
      .catch(() => {
        if (this.disposed || this.worker !== capturedWorker) return;
        this.inFlight = false;
        this.inFlightSince = Number.NEGATIVE_INFINITY;
        this.frameCaptureFailures += 1;
        if (this.frameCaptureFailures >= MAX_FRAME_CAPTURE_FAILURES) {
          this.fail('Could not read video frames from camera.');
        }
      });
  }

  private async retryWithCpu(): Promise<void> {
    if (this.disposed || this.cpuFallbackAttempted) return;
    this.finishPendingAction(false, 'cancelled');
    const generation = this.sessionGeneration;
    this.cpuFallbackAttempted = true;
    this.worker?.removeEventListener('message', this.handleWorkerMessage);
    this.worker?.removeEventListener('error', this.handleWorkerError);
    this.worker?.terminate();
    this.worker = undefined;
    this.inFlight = false;
    this.inFlightSince = Number.NEGATIVE_INFINITY;
    this.lastVideoTime = -1;
    this.lastFrameSentAt = Number.NEGATIVE_INFINITY;
    this.lastDetectionAt = Number.NEGATIVE_INFINITY;
    this.latestPoses = [];
    this.detectionWasFresh = false;
    this.lastResultAt = 0;
    this.smoothedFps = 0;
    this.smoothedInferenceMs = 0;
    this.calibrated = false;
    this.recoveryNeedsCalibration = true;
    this.mapper.reset();
    this.setStatus('loading-model', 'Pose GPU processing stalled. Trying CPU; calibrate again when ready. Keyboard fallback remains available.');
    this.notifyDetection();
    try {
      await this.initWorker('CPU');
      if (this.disposed || generation !== this.sessionGeneration) return;
      this.setStatus('ready', 'Pose CPU fallback ready. Calibrate again; if tracking is too slow, use keyboard controls.');
      this.notifyDetection();
    } catch (error) {
      if (generation === this.sessionGeneration && !this.disposed) this.fail(normalizeErrorMessage(error));
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
      const capturedAt = event.data.timestamp;
      this.lastSampleAgeMs = Number.isFinite(capturedAt) ? now - capturedAt : undefined;
      this.detectedPoseCount = event.data.poses.length;
      this.validPoseCount = event.data.poses.filter(pose => extractPoseMetrics(pose).isValid).length;
      if (!Number.isFinite(capturedAt) || capturedAt > now || capturedAt <= this.lastDetectionAt) {
        if (this.pendingAction?.kind === 'calibrate') this.resetCalibrationSamples();
        this.expireStaleDetection(now);
        this.notifyDetection();
        return;
      }
      if (now - capturedAt >= POSE_TRACKING_STALE_MS) {
        if (this.pendingAction?.kind === 'calibrate') this.resetCalibrationSamples();
        this.expireStaleDetection(now);
        this.notifyDetection();
        return;
      }
      this.lastDetectionAt = capturedAt;
      this.latestPoses = event.data.poses.map((p) => ({ landmarks: p.landmarks }));
      this.detectionWasFresh = this.latestPoses.length > 0;
      if (this.calibrated) this.mapper.update(this.latestPoses, this.lastDetectionAt);
      this.processPendingAction();
      this.notifyDetection();
    } else if (event.data.type === 'error') {
      this.fail(event.data.message);
    }
  };

  private handleWorkerError = (event: ErrorEvent): void => {
    this.fail(event.message || 'The pose model worker stopped unexpectedly.');
  };

  private handleTrackEnded = (): void => {
    if (!this.disposed) this.fail('The camera was disconnected. Keyboard controls are available.');
  };

  private fail(message: string): void {
    if (this.disposed) return;
    this.disposed = true;
    this.finishPendingAction(false, 'cancelled');
    this.readyReject?.(new Error(message));
    this.readyReject = undefined;
    this.releaseResources();
    this.mapper.reset();
    this.latestPoses = [];
    this.lastDetectionAt = Number.NEGATIVE_INFINITY;
    this.detectionWasFresh = false;
    this.calibrated = false;
    this.setStatus('error', message);
    this.notifyDetection();
  }

  private releaseResources(): void {
    clearTimeout(this.modelReadyTimer);
    this.modelReadyTimer = undefined;
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
    this.lastVideoTime = -1;
    this.lastFrameSentAt = Number.NEGATIVE_INFINITY;
    this.lastResultAt = 0;
    this.smoothedFps = 0;
    this.smoothedInferenceMs = 0;
  }

  private getReadinessReason(): CameraMetrics['readinessReason'] {
    if (this.status !== 'ready' || this.lastSampleAgeMs === undefined) return undefined;
    if (this.lastSampleAgeMs >= POSE_TRACKING_STALE_MS) return 'SLOW_FRAMES';
    if (!this.isDetectionFresh() && this.calibrated && !this.mapper.needsRecalibration()) return 'WAITING_FOR_FRAME';
    if (!this.isDetectionFresh() || this.detectedPoseCount === 0) return 'NO_POSE';
    if (this.detectedPoseCount > (this.soloMode ? 1 : 2)) return 'EXTRA_PERSON';
    if (this.validPoseCount === 0) return 'LOW_CONFIDENCE';
    if (!this.soloMode && this.validPoseCount < 2) return 'NEED_TWO_PLAYERS';
    if (!this.mapper.canCalibrate(this.latestPoses)) return 'POSITION';
    return this.calibrated && !this.mapper.needsRecalibration() && !this.recoveryNeedsCalibration
      ? 'ACCEPTED' : 'READY_TO_CALIBRATE';
  }

  private getPlayerStates(): Record<PlayerId, PosePlayerState> {
    if (this.status === 'error' || this.status === 'stopped') return { p1: 'KEYBOARD_FALLBACK', p2: 'KEYBOARD_FALLBACK' };
    if (this.calibrated) return this.mapper.getPlayerStates(this.now());
    const states: Record<PlayerId, PosePlayerState> = { p1: 'WAITING', p2: 'WAITING' };
    if (!this.isDetectionFresh()) return states;
    if (this.latestPoses.length > (this.soloMode ? 1 : 2)) {
      return { p1: 'AMBIGUOUS', p2: this.soloMode ? 'WAITING' : 'AMBIGUOUS' };
    }
    for (const pose of this.latestPoses) {
      const metrics = extractPoseMetrics(pose);
      if (!metrics.isValid) continue;
      if (this.soloMode || metrics.screenTorsoX < 0.465) states.p1 = 'DETECTED_NOT_READY';
      else if (metrics.screenTorsoX > 0.535) states.p2 = 'DETECTED_NOT_READY';
    }
    return states;
  }

  private notifyDetection(): void {
    const fresh = this.isDetectionFresh();
    const states = this.getPlayerStates();
    const visiblePlayers = (['p1', 'p2'] as PlayerId[]).filter(player =>
      ['DETECTED_NOT_READY', 'ACCEPTED_IDLE', 'MOVE_LEFT', 'MOVE_RIGHT', 'CATCH'].includes(states[player]));

    const acceptedPoses = fresh ? this.mapper.getAssociatedPoses(this.latestPoses, this.now()) : [];
    // Preview detections even when anonymous player continuity has been lost.
    // Candidate poses never carry a player identity or accepted Catch state.
    const renderedPoses: RenderedPlayerPose[] = acceptedPoses.length > 0 ? acceptedPoses : fresh
      ? this.latestPoses.map(pose => ({ candidate: true, landmarks: [...pose.landmarks] })) : [];
    for (const canvas of this.overlayCanvases) {
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      if (this.video.videoWidth && this.video.videoHeight) {
        if (canvas.width !== this.video.videoWidth || canvas.height !== this.video.videoHeight) {
          canvas.width = this.video.videoWidth;
          canvas.height = this.video.videoHeight;
        }
      }
      renderPoseOverlay(ctx, canvas, renderedPoses, this.soloMode);
    }

    const metrics = this.getMetrics();
    this.onMetrics?.(metrics);
    this.onDetection?.(visiblePlayers, this.canCalibrate(), this.calibrated, metrics);
  }

  private isDetectionFresh(now = this.now()): boolean {
    return this.latestPoses.length > 0 && now >= this.lastDetectionAt && now - this.lastDetectionAt < POSE_TRACKING_STALE_MS;
  }

  private expireStaleDetection(now: number): void {
    if (!this.detectionWasFresh || now - this.lastDetectionAt < POSE_TRACKING_STALE_MS) return;
    this.latestPoses = [];
    this.detectionWasFresh = false;
    if (this.calibrated) this.mapper.read(now);
    this.notifyDetection();
  }

  private setStatus(status: CameraInputStatus, message?: string): void {
    this.status = status;
    this.onStatus?.(status, message);
  }
}
