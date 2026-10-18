import type { InputAdapter, InputFrame, PlayerId } from '../gameplay/core';
import type { CameraInputStatus, CameraMetrics } from './mediapipe-hand-input-adapter.ts';
import {
  PoseInputMapper,
  POSE_TRACKING_STALE_MS,
  type DetectedPose,
  type PoseGestureScheme
} from './pose-input-mapper.ts';
import { renderPoseOverlay } from './pose-landmarks-renderer.ts';
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
  private latestPoses: DetectedPose[] = [];
  private lastDetectionAt = Number.NEGATIVE_INFINITY;
  private lastVideoTime = -1;
  private lastFrameSentAt = 0;
  private inFlight = false;
  private inFlightSince = Number.NEGATIVE_INFINITY;
  private frameCaptureFailures = 0;
  private detectionWasFresh = false;
  private disposed = false;
  private calibrated = false;
  private status: CameraInputStatus = 'idle';
  private startPromise?: Promise<void>;
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
    this.createBitmap = options.createBitmap ?? ((source) => createImageBitmap(source));
    this.now = options.now ?? (() => performance.now());
    this.requestFrame = options.requestFrame ?? ((callback) => requestAnimationFrame(callback));
    this.cancelFrame = options.cancelFrame ?? ((handle) => cancelAnimationFrame(handle));
    this.onStatus = options.onStatus;
    this.onDetection = options.onDetection;
    this.onMetrics = options.onMetrics;
  }

  getMetrics(): CameraMetrics {
    return {
      delegate: this.activeDelegate,
      inferenceMs: Math.round(this.smoothedInferenceMs),
      fps: Math.round(this.smoothedFps),
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
    this.soloMode = solo;
    this.mapper.setSoloMode(solo);
    this.calibrated = false;
    this.notifyDetection();
  }

  setScheme(scheme: PoseGestureScheme): void {
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
    this.disposed = false;
    this.startPromise = this.startResources();
    try {
      await this.startPromise;
    } finally {
      this.startPromise = undefined;
    }
  }

  read(): InputFrame {
    if (this.status !== 'ready' || !this.calibrated) {
      return { p1: { ...NEUTRAL.p1 }, p2: { ...NEUTRAL.p2 } };
    }
    return this.mapper.read(this.now());
  }

  canCalibrate(): boolean {
    return this.status === 'ready' && this.isDetectionFresh() && this.mapper.canCalibrate(this.latestPoses);
  }

  canStart(): boolean {
    return this.status === 'ready' && this.calibrated && this.isDetectionFresh() && this.mapper.canCalibrate(this.latestPoses);
  }

  calibrate(): boolean {
    if (!this.canCalibrate()) return false;
    this.calibrated = this.mapper.calibrate(this.latestPoses, this.now());
    this.notifyDetection();
    return this.calibrated;
  }

  stop(): void {
    if (this.disposed && !this.stream && !this.worker) return;
    this.disposed = true;
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

  private async startResources(): Promise<void> {
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
      if (this.disposed) {
        stopStream(stream);
        return;
      }
      this.stream = stream;
      for (const track of stream.getTracks()) {
        track.addEventListener('ended', this.handleTrackEnded);
      }
      this.video.srcObject = stream;
      this.video.dataset.active = 'true';
      await this.video.play();
      if (this.disposed) return;
      this.setStatus('loading-model', 'Camera connected. Loading the pose model…');
      await this.initWorker();
      if (this.disposed) return;
      this.setStatus('ready');
      this.notifyDetection();
      this.startLoop();
    } catch (error) {
      this.fail(normalizeErrorMessage(error));
      throw error;
    }
  }

  private initWorker(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.readyReject = reject;
      const worker = this.createWorker();
      this.worker = worker;
      const timer = setTimeout(() => {
        if (this.status !== 'ready' && !this.disposed) {
          this.fail('The pose model took too long to load. Using keyboard controls.');
        }
      }, MODEL_READY_TIMEOUT_MS);

      const onInitMessage = (event: MessageEvent<WorkerResponse>) => {
        if (event.data.type === 'ready') {
          clearTimeout(timer);
          this.readyReject = undefined;
          this.activeDelegate = event.data.delegate ?? 'CPU';
          worker.removeEventListener('message', onInitMessage);
          worker.addEventListener('message', this.handleWorkerMessage);
          worker.addEventListener('error', this.handleWorkerError);
          resolve();
        } else if (event.data.type === 'error') {
          clearTimeout(timer);
          this.readyReject = undefined;
          this.fail(event.data.message);
          reject(new Error(event.data.message));
        }
      };

      worker.addEventListener('message', onInitMessage);
      worker.postMessage({
        type: 'init',
        wasmRoot: this.wasmRoot,
        modelPath: this.modelPath,
        numPoses: 2
      });
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

    if (!this.worker || this.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
    if (this.inFlight) {
      if (now - this.inFlightSince > INFERENCE_TIMEOUT_MS) {
        this.fail('Pose processing stopped responding.');
      }
      return;
    }
    if (now - this.lastFrameSentAt < SAMPLE_INTERVAL_MS) return;
    if (this.video.currentTime === this.lastVideoTime && this.lastVideoTime >= 0) return;

    this.lastVideoTime = this.video.currentTime;
    this.lastFrameSentAt = now;
    this.inFlight = true;
    this.inFlightSince = now;

    this.createBitmap(this.video)
      .then((bitmap) => {
        if (this.disposed || !this.worker) {
          bitmap.close();
          this.inFlight = false;
          this.inFlightSince = Number.NEGATIVE_INFINITY;
          return;
        }
        this.frameCaptureFailures = 0;
        this.worker.postMessage({ type: 'frame', bitmap, timestamp: now }, [bitmap]);
      })
      .catch(() => {
        this.inFlight = false;
        this.inFlightSince = Number.NEGATIVE_INFINITY;
        this.frameCaptureFailures += 1;
        if (this.frameCaptureFailures >= MAX_FRAME_CAPTURE_FAILURES) {
          this.fail('Could not read video frames from camera.');
        }
      });
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
      this.latestPoses = event.data.poses.map((p) => ({ landmarks: p.landmarks }));
      this.detectionWasFresh = this.latestPoses.length > 0;
      if (this.calibrated) this.mapper.update(this.latestPoses, this.lastDetectionAt);
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
        if (this.latestPoses.length > 0) visiblePlayers.push('p1');
      } else {
        const left = this.latestPoses.some((p) => p.landmarks[11] && 1 - (p.landmarks[11].x + p.landmarks[12].x) / 2 < 0.465);
        const right = this.latestPoses.some((p) => p.landmarks[11] && 1 - (p.landmarks[11].x + p.landmarks[12].x) / 2 > 0.535);
        if (left) visiblePlayers.push('p1');
        if (right) visiblePlayers.push('p2');
      }
    }

    const renderedPoses = fresh ? this.mapper.getAssociatedPoses(this.latestPoses) : [];
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
    return this.latestPoses.length > 0 && now - this.lastDetectionAt <= POSE_TRACKING_STALE_MS;
  }

  private expireStaleDetection(now: number): void {
    if (!this.detectionWasFresh || now - this.lastDetectionAt <= POSE_TRACKING_STALE_MS) return;
    this.latestPoses = [];
    this.detectionWasFresh = false;
    this.notifyDetection();
  }

  private setStatus(status: CameraInputStatus, message?: string): void {
    this.status = status;
    this.onStatus?.(status, message);
  }
}
