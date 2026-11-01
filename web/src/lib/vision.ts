import type { FaceDetector, HandLandmarker } from '@mediapipe/tasks-vision'

// Face and hand detection runs inside the browser. No video or picture leaves the computer.
export type Detectors = { face: FaceDetector; hands: HandLandmarker }

let loading: Promise<Detectors> | null = null

// Uses the graphics chip when possible, and the normal processor if that fails
async function withFallback<T>(make: (delegate: 'GPU' | 'CPU') => Promise<T>): Promise<T> {
  try {
    return await make('GPU')
  } catch {
    return make('CPU')
  }
}

export function loadDetectors(): Promise<Detectors> {
  loading ??= (async () => {
    const mp = await import('@mediapipe/tasks-vision')
    const vision = await mp.FilesetResolver.forVisionTasks('/mediapipe-wasm')

    const face = await withFallback((delegate) =>
      mp.FaceDetector.createFromOptions(vision, {
        baseOptions: { modelAssetPath: '/models/blaze_face_short_range.tflite', delegate },
        runningMode: 'VIDEO',
        minDetectionConfidence: 0.5,
      }),
    )
    const hands = await withFallback((delegate) =>
      mp.HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: '/models/hand_landmarker.task', delegate },
        runningMode: 'VIDEO',
        numHands: 2,
      }),
    )
    return { face, hands }
  })().catch((e) => {
    loading = null // allow another try
    throw e
  })
  return loading
}

/** How many faces and how many hands the camera sees in this video frame. */
export function analyze(d: Detectors, video: HTMLVideoElement) {
  const now = performance.now()
  const faces = d.face.detectForVideo(video, now).detections.length
  const hands = d.hands.detectForVideo(video, now).landmarks.length
  return { faces, hands }
}