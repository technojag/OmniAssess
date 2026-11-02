import type { FaceDetector, FaceLandmarker, ObjectDetector } from '@mediapipe/tasks-vision'
import type { GazeMetrics } from './gaze'

// Everything here runs inside the browser. No video or picture leaves the computer.
export type Detectors = { face: FaceDetector }

// The library and its helper files are loaded once and shared
async function loadVision() {
  const mp = await import('@mediapipe/tasks-vision')
  const vision = await mp.FilesetResolver.forVisionTasks('/mediapipe-wasm')
  return { mp, vision }
}
let visionPromise: ReturnType<typeof loadVision> | null = null
function sharedVision() {
  visionPromise ??= loadVision().catch((e) => {
    visionPromise = null // allow another try
    throw e
  })
  return visionPromise
}

// Uses the graphics chip when possible, and the normal processor if that fails
async function withFallback<T>(make: (delegate: 'GPU' | 'CPU') => Promise<T>): Promise<T> {
  try {
    return await make('GPU')
  } catch {
    return make('CPU')
  }
}

let loading: Promise<Detectors> | null = null

export function loadDetectors(): Promise<Detectors> {
  loading ??= (async () => {
    const { mp, vision } = await sharedVision()
    const face = await withFallback((delegate) =>
      mp.FaceDetector.createFromOptions(vision, {
        baseOptions: { modelAssetPath: '/models/blaze_face_short_range.tflite', delegate },
        runningMode: 'VIDEO',
        minDetectionConfidence: 0.3, // lower than before, so a second face is not missed
      }),
    )
    return { face }
  })().catch((e) => {
    loading = null // allow another try
    throw e
  })
  return loading
}

/** How many faces the camera sees in this video frame. */
export function analyze(d: Detectors, video: HTMLVideoElement) {
  const faces = d.face.detectForVideo(video, performance.now()).detections.length
  return { faces }
}

// ---- Phones, books and people (only loaded during the exam) ----

// How sure the model must be before we count something. Lower = catches more, but more wrong alarms.
const MIN_SCORE = { phone: 0.35, book: 0.2, person: 0.5 }

let loadingObjects: Promise<ObjectDetector> | null = null

export function loadObjectDetector(): Promise<ObjectDetector> {
  loadingObjects ??= (async () => {
    const { mp, vision } = await sharedVision()
    return withFallback((delegate) =>
      mp.ObjectDetector.createFromOptions(vision, {
        baseOptions: { modelAssetPath: '/models/efficientdet_lite0.tflite', delegate },
        runningMode: 'VIDEO',
        scoreThreshold: 0.2, // the real limits per kind are applied below in MIN_SCORE
        maxResults: 10,
        categoryAllowlist: ['cell phone', 'book', 'person'],
      }),
    )
  })().catch((e) => {
    loadingObjects = null // allow another try
    throw e
  })
  return loadingObjects
}

/** Is a phone or a book visible, and how many people are in this video frame? */
export function findObjects(detector: ObjectDetector, video: HTMLVideoElement) {
  let phone = false
  let book = false
  let persons = 0
  for (const d of detector.detectForVideo(video, performance.now()).detections) {
    const c = d.categories[0]
    if (!c) continue
    if (c.categoryName === 'cell phone' && c.score >= MIN_SCORE.phone) phone = true
    else if (c.categoryName === 'book' && c.score >= MIN_SCORE.book) book = true
    else if (c.categoryName === 'person' && c.score >= MIN_SCORE.person) persons += 1
  }
  return { phone, book, persons }
}

// ---- Where the student is looking ----

let loadingGaze: Promise<FaceLandmarker> | null = null

export function loadGazeModel(): Promise<FaceLandmarker> {
  loadingGaze ??= (async () => {
    const { mp, vision } = await sharedVision()
    return withFallback((delegate) =>
      mp.FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: '/models/face_landmarker.task', delegate },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
      }),
    )
  })().catch((e) => {
    loadingGaze = null // allow another try
    throw e
  })
  return loadingGaze
}

/** Eye and head direction of the student in this video frame, or null if no face was measured. */
export function readGaze(model: FaceLandmarker, video: HTMLVideoElement): GazeMetrics | null {
  const result = model.detectForVideo(video, performance.now())
  const shapes = result.faceBlendshapes?.[0]?.categories
  const matrix = result.facialTransformationMatrixes?.[0]?.data
  if (!shapes || !matrix || matrix.length < 16) return null

  const score = (name: string) => shapes.find((c) => c.categoryName === name)?.score ?? 0

  // The head turn comes from the rotation part of the face matrix (third column)
  const size = Math.hypot(matrix[8], matrix[9], matrix[10]) || 1
  const yaw = (Math.asin(Math.max(-1, Math.min(1, matrix[8] / size))) * 180) / Math.PI
  const pitch = (Math.atan2(-matrix[9] / size, matrix[10] / size) * 180) / Math.PI

  return {
    down: (score('eyeLookDownLeft') + score('eyeLookDownRight')) / 2,
    up: (score('eyeLookUpLeft') + score('eyeLookUpRight')) / 2,
    right: (score('eyeLookInLeft') + score('eyeLookOutRight')) / 2,
    left: (score('eyeLookOutLeft') + score('eyeLookInRight')) / 2,
    yaw,
    pitch,
  }
}