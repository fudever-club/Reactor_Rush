import type { InputAdapter, InputFrame, PlayerId } from '../gameplay/core';
import { HandInputMapper, type DetectedHand } from './hand-input-mapper.ts';

export type CameraInputStatus = 'idle' | 'requesting-camera' | 'loading-model' | 'ready' | 'stopped' | 'error';

export interface MediaPipeHandInputOptions {
  onStatus?: (status: CameraInputStatus, message?: string) => void;
  onDetection?: (visiblePlayers: readonly PlayerId[], canCalibrate: boolean, calibrated: boolean) => void;
  createWorker?: () => Worker;
  getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  createBitmap?: (video: HTMLVideoElement) => Promise<ImageBitmap>;
  now?: () => number;
  requestFrame?: (callback: FrameRequestCallback) => number;
  cancelFrame?: (handle: number) => void;
}

interface WorkerReadyMessage { type: 'ready' }
interface WorkerResultMessage {
  type: 'result';
  timestamp: number;
  hands: Array<Array<{ x: number; y: number }>>;
}
interface WorkerErrorMessage { type: 'error'; message: string }
type WorkerResponse = WorkerReadyMessage | WorkerResultMessage | WorkerErrorMessage;

const WASM_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm';
const MODEL_PATH = '/mediapipe/hand_landmarker.task';
const SAMPLE_INTERVAL_MS = 85;
const MODEL_READY_TIMEOUT_MS = 30_000;
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
    return error.message;
  }
  return String(error);
}

export class MediaPipeHandInputAdapter implements InputAdapter {
  private readonly mapper = new HandInputMapper();
  private readonly createWorker: () => Worker;
  private readonly getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  private readonly createBitmap: (video: HTMLVideoElement) => Promise<ImageBitmap>;
  private readonly now: () => number;
  private readonly requestFrame: (callback: FrameRequestCallback) => number;
  private readonly cancelFrame: (handle: number) => void;
  private readonly onStatus?: MediaPipeHandInputOptions['onStatus'];
  private readonly onDetection?: MediaPipeHandInputOptions['onDetection'];
  private stream?: MediaStream;
  private worker?: Worker;
  private frameHandle?: number;
  private readyReject?: (error: Error) => void;
  private latestHands: DetectedHand[] = [];
  private lastVideoTime = -1;
  private lastFrameSentAt = 0;
  private inFlight = false;
  private disposed = false;
  private calibrated = false;
  private status: CameraInputStatus = 'idle';
  private startPromise?: Promise<void>;
  private readonly video: HTMLVideoElement;

  constructor(video: HTMLVideoElement, options: MediaPipeHandInputOptions = {}) {
    this.video = video;
    this.createWorker = options.createWorker ?? (() => new Worker(
      new URL('../workers/hand-landmarker.worker.ts', import.meta.url), { type: 'module' }
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
    this.setStatus('requesting-camera');
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
    return this.status === 'ready' && this.mapper.canCalibrate(this.latestHands);
  }

  calibrate(): boolean {
    if (!this.canCalibrate()) return false;
    this.calibrated = this.mapper.calibrate(this.latestHands, this.now());
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
    this.latestHands = [];
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

      this.setStatus('loading-model');
      this.worker = this.createWorker();
      await this.waitUntilWorkerReady(this.worker);
      if (this.disposed) return;

      if (isVideoTrackEnded(videoTrack)) throw new Error('The camera disconnected while the hand model was loading.');
      this.setStatus('ready');
      this.frameHandle = this.requestFrame(this.captureFrame);
    } catch (error) {
      if (this.disposed) return;
      const message = errorMessage(error);
      this.releaseResources();
      this.setStatus('error', message);
      throw new Error(message, { cause: error });
    }
  }

  private waitUntilWorkerReady(worker: Worker): Promise<void> {
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
      worker.postMessage({ type: 'init', wasmRoot: WASM_ROOT, modelPath: MODEL_PATH });
    });
  }

  private captureFrame: FrameRequestCallback = () => {
    if (this.disposed || this.status !== 'ready') return;
    const now = this.now();
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
      this.createBitmap(this.video).then((bitmap) => {
        if (this.disposed || !this.worker) {
          bitmap.close();
          this.inFlight = false;
          return;
        }
        try {
          this.worker.postMessage({ type: 'frame', bitmap, timestamp: now }, [bitmap]);
        } catch (error) {
          bitmap.close();
          throw error;
        }
      }).catch((error: unknown) => {
        this.inFlight = false;
        this.onStatus?.('ready', `Frame capture skipped: ${errorMessage(error)}`);
      });
    }
    this.frameHandle = this.requestFrame(this.captureFrame);
  };

  private handleWorkerMessage = (event: MessageEvent<WorkerResponse>): void => {
    if (this.disposed) return;
    if (event.data.type === 'result') {
      this.inFlight = false;
      this.latestHands = event.data.hands.map((landmarks) => ({ landmarks }));
      if (this.calibrated) this.mapper.update(this.latestHands, this.now());
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
    this.releaseResources();
    this.mapper.reset();
    this.latestHands = [];
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
    this.worker?.removeEventListener('message', this.handleWorkerMessage);
    this.worker?.removeEventListener('error', this.handleWorkerError);
    this.worker?.terminate();
    this.worker = undefined;
    this.inFlight = false;
  }

  private notifyDetection(): void {
    const visiblePlayers: PlayerId[] = [];
    if (this.latestHands.length) {
      const left = this.latestHands.some((hand) => hand.landmarks[0] && 1 - hand.landmarks[0].x < 0.465);
      const right = this.latestHands.some((hand) => hand.landmarks[0] && 1 - hand.landmarks[0].x > 0.535);
      if (left) visiblePlayers.push(PLAYER_ID.p1);
      if (right) visiblePlayers.push(PLAYER_ID.p2);
    }
    this.onDetection?.(visiblePlayers, this.canCalibrate(), this.calibrated);
  }

  private setStatus(status: CameraInputStatus, message?: string): void {
    this.status = status;
    this.onStatus?.(status, message);
  }
}
