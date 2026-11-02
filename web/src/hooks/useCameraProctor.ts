import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { isLookingAway, loadBaseline } from '../lib/gaze'
import { analyze, findObjects, loadDetectors, loadGazeModel, loadObjectDetector, readGaze } from '../lib/vision'
import type { ViolationKind } from './useProctoring'

// How often the camera is looked at, and how long something must last before it is reported.
// Change these numbers if the warnings come too early or too late (1000 = 1 second).
const TICK_MS = 500
const OBJECT_EVERY = 2 // phones, books and people are looked for every 2nd tick (once a second)
const GAZE_EVERY = 1 // eye direction is read every tick. Use 2 if the computer feels slow.
const FACE_MISSING_MS = 4000
const GAZE_SECONDS = 4 // looking away this long gives a notice
const MULTI_GRACE_MS = 5000 // after a "more than one person" notice, wait this long before the next
const OBJECT_GRACE_MS = 12000 // after a phone or book report, time to take it away before the next one
const GAZE_GRACE_MS = 15000 // after a gaze notice, wait this long before the next

// How many gaze looks fit in GAZE_SECONDS, and how many of them must show "away"
const GAZE_WINDOW = Math.max(2, Math.round((GAZE_SECONDS * 1000) / (TICK_MS * GAZE_EVERY)))
const GAZE_NEED = GAZE_WINDOW - 1

export type CameraProblem = 'camera' | 'checker' | null

type Options = {
  videoRef: RefObject<HTMLVideoElement | null> // the <video> element that shows the preview
  enabled: boolean
  report: (kind: ViolationKind) => void
}

// Remembers the last few looks. It reports when enough of them showed the problem,
// so one missed frame does not wipe out everything.
function makeWindow(size: number, need: number) {
  const items: boolean[] = []
  return {
    push(seen: boolean) {
      items.push(seen)
      if (items.length > size) items.shift()
    },
    hit() {
      return items.filter(Boolean).length >= need
    },
    clear() {
      items.length = 0
    },
  }
}

type Status = { faces: number; persons: number; phone: boolean; book: boolean; away: boolean }

// Watches the camera while the exam runs. Pictures stay in the browser, only the kind of warning is sent.
export function useCameraProctor({ videoRef, enabled, report }: Options) {
  const reportRef = useRef(report)
  const [problem, setProblem] = useState<CameraProblem>(null)
  const [ready, setReady] = useState(false)
  const [status, setStatus] = useState<Status>({ faces: 1, persons: 1, phone: false, book: false, away: false })
  const [restartKey, setRestartKey] = useState(0)

  useEffect(() => {
    reportRef.current = report
  })

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    let stream: MediaStream | null = null
    let timer: ReturnType<typeof setInterval> | undefined
    const video = videoRef.current

    const media = navigator.mediaDevices
    const getStream: Promise<MediaStream> = media?.getUserMedia
      ? media.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false })
      : Promise.reject(new Error('no camera'))

    getStream
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((track) => track.stop())
          return
        }
        stream = s
        s.getVideoTracks()[0]?.addEventListener('ended', () => {
          if (cancelled) return
          setReady(false)
          setProblem('camera')
        })
        if (video) {
          video.srcObject = s
          void video.play().catch(() => {})
        }

        // The phone/book/person model and the gaze model are optional: if one cannot load, the rest still works
        return Promise.all([
          loadDetectors(),
          loadObjectDetector().catch(() => null),
          loadGazeModel().catch(() => null),
        ])
          .then(([detectors, objects, gazeModel]) => {
            if (cancelled) return
            setProblem(null)
            setReady(true)

            // Gaze is only checked if the student did the "look at the middle of the screen" step
            const baseline = loadBaseline()

            const multi = makeWindow(6, 3) // 3 of the last 6 looks (about 1.5 to 3 seconds)
            const phone = makeWindow(4, 2) // 2 of the last 4 seconds
            const book = makeWindow(6, 2) // a book is harder to spot, so 2 sightings in the last 6 seconds are enough
            const gaze = makeWindow(GAZE_WINDOW, GAZE_NEED)
            const grace = { multi: 0, phone: 0, book: 0, gaze: 0 } // no new reports before this time
            let noFaceMs = 0
            let persons = 1
            let away = false
            let seen = { phone: false, book: false }
            let tick = 0

            timer = setInterval(() => {
              if (!video || video.readyState < 2 || document.hidden) return
              tick += 1
              const now = Date.now()

              let faces: number
              try {
                faces = analyze(detectors, video).faces
              } catch {
                return // skip this frame
              }

              if (objects && tick % OBJECT_EVERY === 0) {
                try {
                  const found = findObjects(objects, video)
                  persons = found.persons
                  seen = { phone: found.phone, book: found.book }
                  if (now >= grace.phone) phone.push(found.phone)
                  if (now >= grace.book) book.push(found.book)
                } catch {
                  // skip this check
                }
              }

              if (gazeModel && baseline && faces === 1 && tick % GAZE_EVERY === 0) {
                try {
                  const metrics = readGaze(gazeModel, video)
                  if (metrics) {
                    away = isLookingAway(metrics, baseline)
                    if (now >= grace.gaze) gaze.push(away)
                  }
                } catch {
                  // skip this check
                }
              } else if (faces !== 1) {
                away = false
              }

              setStatus((prev) =>
                prev.faces === faces &&
                prev.persons === persons &&
                prev.phone === seen.phone &&
                prev.book === seen.book &&
                prev.away === away
                  ? prev
                  : { faces, persons, phone: seen.phone, book: seen.book, away },
              )

              noFaceMs = faces === 0 ? noFaceMs + TICK_MS : 0
              if (now >= grace.multi) multi.push(faces >= 2 || persons >= 2)

              if (noFaceMs >= FACE_MISSING_MS) {
                reportRef.current('FACE_MISSING')
                noFaceMs = 0
              }
              if (multi.hit()) {
                reportRef.current('MULTIPLE_FACES')
                multi.clear()
                grace.multi = now + MULTI_GRACE_MS
              }
              if (phone.hit()) {
                reportRef.current('PHONE_DETECTED')
                phone.clear()
                grace.phone = now + OBJECT_GRACE_MS
              }
              if (book.hit()) {
                reportRef.current('OBJECT_DETECTED')
                book.clear()
                grace.book = now + OBJECT_GRACE_MS
              }
              if (gaze.hit()) {
                reportRef.current('GAZE_AWAY')
                gaze.clear()
                grace.gaze = now + GAZE_GRACE_MS
              }
            }, TICK_MS)
          })
          .catch(() => {
            if (!cancelled) setProblem('checker')
          })
      })
      .catch(() => {
        if (!cancelled) setProblem('camera')
      })

    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
      stream?.getTracks().forEach((track) => track.stop())
      if (video) video.srcObject = null
    }
  }, [enabled, restartKey, videoRef])

  // Called from the "Turn on camera" button
  const restart = useCallback(() => {
    setReady(false)
    setProblem(null)
    setRestartKey((k) => k + 1)
  }, [])

  return { problem, ready, status, restart }
}