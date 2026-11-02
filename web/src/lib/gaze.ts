// Pure helpers for "where is the student looking". No camera and no library code in here.

export type GazeMetrics = {
  down: number // eyes looking down, 0 to 1
  up: number // eyes looking up, 0 to 1
  left: number // eyes looking to the student's left, 0 to 1
  right: number // eyes looking to the student's right, 0 to 1
  yaw: number // head turned left or right, in degrees
  pitch: number // head tilted up or down, in degrees
}

// How far from the student's own "looking at the screen" position counts as looking away.
// Change these numbers if notices come too often (make them bigger) or too rarely (make them smaller).
export const GAZE_LIMITS = { down: 0.3, side: 0.35, yaw: 25, pitch: 22 }

const KEY = 'omni.gazeBaseline'

// The baseline is only a few numbers (no picture). It lives in this browser tab until the tab is closed.
export function saveBaseline(base: GazeMetrics) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(base))
  } catch {
    // storage is not available: gaze checking stays off
  }
}

export function clearBaseline() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // nothing to clear
  }
}

export function loadBaseline(): GazeMetrics | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const b = JSON.parse(raw) as Partial<GazeMetrics>
    const ok = (['down', 'up', 'left', 'right', 'yaw', 'pitch'] as const).every((k) => typeof b[k] === 'number')
    return ok ? (b as GazeMetrics) : null
  } catch {
    return null
  }
}

/** Difference between two angles in degrees, always between -180 and 180. */
export function angleDiff(a: number, b: number) {
  return ((a - b + 540) % 360) - 180
}

export function averageMetrics(list: GazeMetrics[]): GazeMetrics {
  const n = list.length
  const mean = (pick: (m: GazeMetrics) => number) => list.reduce((sum, m) => sum + pick(m), 0) / n
  // Angles are averaged around the first sample, so a jump from 179 to -179 degrees does not break the average
  const angle = (pick: (m: GazeMetrics) => number) => {
    const first = pick(list[0])
    return first + list.reduce((sum, m) => sum + angleDiff(pick(m), first), 0) / n
  }
  return {
    down: mean((m) => m.down),
    up: mean((m) => m.up),
    left: mean((m) => m.left),
    right: mean((m) => m.right),
    yaw: angle((m) => m.yaw),
    pitch: angle((m) => m.pitch),
  }
}

/** Is the student looking away from the screen, compared with their own normal position? */
export function isLookingAway(m: GazeMetrics, base: GazeMetrics) {
  return (
    m.down - base.down > GAZE_LIMITS.down ||
    m.left - base.left > GAZE_LIMITS.side ||
    m.right - base.right > GAZE_LIMITS.side ||
    Math.abs(angleDiff(m.yaw, base.yaw)) > GAZE_LIMITS.yaw ||
    Math.abs(angleDiff(m.pitch, base.pitch)) > GAZE_LIMITS.pitch
  )
}