import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

interface InitMessage {
  type: 'init';
  wasmRoot: string;
  modelPath: string;
  delegate?: 'GPU' | 'CPU';
}

interface FrameMessage {
  type: 'frame';
  bitmap: ImageBitmap;
  timestamp: number;
}

type WorkerRequest = InitMessage | FrameMessage | { type: 'close' };
type WorkerResponse =
  | { type: 'ready'; delegate: 'GPU' | 'CPU' }
  | {
      type: 'result';
      timestamp: number;
      hands: Array<Array<{ x: number; y: number }>>;
      inferenceMs: number;
      delegate: 'GPU' | 'CPU';
    }
  | { type: 'error'; message: string };

const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage(message: WorkerResponse): void;
};

let landmarker: HandLandmarker | undefined;
let lastTimestamp = -1;
let activeDelegate: 'GPU' | 'CPU' = 'CPU';

workerScope.onmessage = async (event) => {
  const request = event.data;
  if (request.type === 'close') {
    landmarker?.close();
    landmarker = undefined;
    return;
  }

  if (request.type === 'init') {
    try {
      const wasmPath = typeof location !== 'undefined' && location.origin && request.wasmRoot.startsWith('/')
        ? new URL(request.wasmRoot, location.origin).href
        : request.wasmRoot;
      const fileset = await FilesetResolver.forVisionTasks(wasmPath, true);
      const modelAssetPath = typeof location !== 'undefined' && location.origin
        ? new URL(request.modelPath, location.origin).href
        : request.modelPath;
      const options = {
        runningMode: 'VIDEO' as const,
        numHands: 2,
        minHandDetectionConfidence: 0.45,
        minHandPresenceConfidence: 0.45,
        minTrackingConfidence: 0.45
      };
      try {
        if (request.delegate === 'CPU') throw new Error('CPU delegate requested after GPU failure.');
        landmarker = await HandLandmarker.createFromOptions(fileset, {
          ...options,
          baseOptions: { modelAssetPath, delegate: 'GPU' }
        });
        activeDelegate = 'GPU';
      } catch {
        landmarker = await HandLandmarker.createFromOptions(fileset, {
          ...options,
          baseOptions: { modelAssetPath, delegate: 'CPU' }
        });
        activeDelegate = 'CPU';
      }
      // Parent watchdog retries stalled GPU inference in a fresh CPU worker.
      workerScope.postMessage({ type: 'ready', delegate: activeDelegate });
    } catch (error) {
      workerScope.postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) });
    }
    return;
  }

  if (!landmarker) {
    request.bitmap.close();
    workerScope.postMessage({ type: 'error', message: 'Hand Landmarker is not initialized.' });
    return;
  }

  try {
    const timestamp = Math.max(request.timestamp, lastTimestamp + 1);
    lastTimestamp = timestamp;
    const start = performance.now();
    const result = landmarker.detectForVideo(request.bitmap, timestamp);
    const inferenceMs = performance.now() - start;
    const hands = result.landmarks.map((landmarks) => landmarks.map(({ x, y }) => ({ x, y })));
    workerScope.postMessage({ type: 'result', timestamp, hands, inferenceMs, delegate: activeDelegate });
  } catch (error) {
    workerScope.postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) });
  } finally {
    request.bitmap.close();
  }
};
