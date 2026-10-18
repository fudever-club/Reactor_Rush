import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

interface InitMessage {
  type: 'init';
  wasmRoot: string;
  modelPath: string;
}

interface FrameMessage {
  type: 'frame';
  bitmap: ImageBitmap;
  timestamp: number;
}

type WorkerRequest = InitMessage | FrameMessage | { type: 'close' };
type WorkerResponse =
  | { type: 'ready' }
  | { type: 'result'; timestamp: number; hands: Array<Array<{ x: number; y: number }>> }
  | { type: 'error'; message: string };

const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage(message: WorkerResponse): void;
};

let landmarker: HandLandmarker | undefined;
let lastTimestamp = -1;

workerScope.onmessage = async (event) => {
  const request = event.data;
  if (request.type === 'close') {
    landmarker?.close();
    landmarker = undefined;
    return;
  }

  if (request.type === 'init') {
    try {
      const fileset = await FilesetResolver.forVisionTasks(request.wasmRoot, true);
      const modelAssetPath = typeof location !== 'undefined' && location.origin
        ? new URL(request.modelPath, location.origin).href
        : request.modelPath;
      landmarker = await HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath, delegate: 'CPU' },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.55,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      workerScope.postMessage({ type: 'ready' });
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
    const result = landmarker.detectForVideo(request.bitmap, timestamp);
    const hands = result.landmarks.map((landmarks) => landmarks.map(({ x, y }) => ({ x, y })));
    workerScope.postMessage({ type: 'result', timestamp, hands });
  } catch (error) {
    workerScope.postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) });
  } finally {
    request.bitmap.close();
  }
};
