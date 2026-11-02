import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'

export type ViolationKind =
  | 'TAB_SWITCH'
  | 'FULLSCREEN_EXIT'
  | 'FACE_MISSING'
  | 'MULTIPLE_FACES'
  | 'HANDS_HIDDEN'
  | 'PHONE_DETECTED'
  | 'OBJECT_DETECTED'
  | 'GAZE_AWAY'

// Same shape as recordViolation() in api/src/modules/attempts/attempts.proctoring.ts
type ViolationResult = {
  counted: boolean
  kind?: ViolationKind
  warningIssued?: boolean
  warningCount: number
  maxWarnings: number
  integrityScore: number
  terminated: boolean
}

// issued = true when it used up one of the warnings, false when it only lowered the integrity score
export type ProctorWarning = { kind: ViolationKind; count: number; max: number; integrity: number; issued: boolean }

const CAMERA_KINDS: ViolationKind[] = [
  'FACE_MISSING',
  'MULTIPLE_FACES',
  'HANDS_HIDDEN',
  'PHONE_DETECTED',
  'OBJECT_DETECTED',
  'GAZE_AWAY',
]

// Some browsers (iPhone Safari) cannot do fullscreen for a page. There we skip that rule.
const fullscreenSupported = typeof document !== 'undefined' && !!document.documentElement.requestFullscreen

export function useProctoring(attemptId: string, enabled: boolean, onTerminated: () => void) {
  const [fullscreen, setFullscreen] = useState(() => !fullscreenSupported || !!document.fullscreenElement)
  // warning = tab and fullscreen rules (big box), notice = camera rules (banner)
  const [warning, setWarning] = useState<ProctorWarning | null>(null)
  const [notice, setNotice] = useState<ProctorWarning | null>(null)
  const wasFullscreen = useRef(!!document.fullscreenElement)
  const lastSent = useRef<Record<string, number>>({})
  const terminated = useRef(false)
  const onTerminatedRef = useRef(onTerminated)

  useEffect(() => {
    onTerminatedRef.current = onTerminated
  })

  // The browser only reports what it saw. The server decides what it means.
  const report = useCallback(
    async (kind: ViolationKind) => {
      const t = Date.now()
      if (t - (lastSent.current[kind] ?? 0) < 3000) return // blur and tab-hidden fire together
      lastSent.current[kind] = t
      try {
        const r = await api<ViolationResult>('/attempts/' + attemptId + '/events/violation', {
          method: 'POST',
          body: { kind },
        })
        if (r.counted) {
          const w: ProctorWarning = {
            kind,
            count: r.warningCount,
            max: r.maxWarnings,
            integrity: r.integrityScore,
            issued: r.warningIssued ?? true,
          }
          if (CAMERA_KINDS.includes(kind)) setNotice(w)
          else setWarning(w)
        }
        if (r.terminated && !terminated.current) {
          terminated.current = true
          onTerminatedRef.current()
        }
      } catch {
        // The exam may have ended already, or the internet dropped. Nothing to show.
      }
    },
    [attemptId],
  )

  useEffect(() => {
    if (!enabled) return

    const onHidden = () => {
      if (document.hidden) void report('TAB_SWITCH')
    }
    const onBlur = () => void report('TAB_SWITCH')
    const onFullscreen = () => {
      const inFullscreen = !!document.fullscreenElement
      setFullscreen(!fullscreenSupported || inFullscreen)
      // Only leaving fullscreen is a violation. Opening the page without it just shows the gate.
      if (wasFullscreen.current && !inFullscreen) void report('FULLSCREEN_EXIT')
      wasFullscreen.current = inFullscreen
    }

    const stop = (e: Event) => e.preventDefault()
    const onKey = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      const blocked = e.key === 'F5' || (ctrl && ['r', 'p', 's', 'u'].includes(e.key.toLowerCase()))
      if (blocked) e.preventDefault()
    }
    const onUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }

    document.addEventListener('visibilitychange', onHidden)
    window.addEventListener('blur', onBlur)
    document.addEventListener('fullscreenchange', onFullscreen)
    document.addEventListener('contextmenu', stop)
    document.addEventListener('copy', stop)
    document.addEventListener('cut', stop)
    document.addEventListener('paste', stop)
    document.addEventListener('keydown', onKey)
    window.addEventListener('beforeunload', onUnload)

    return () => {
      document.removeEventListener('visibilitychange', onHidden)
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('fullscreenchange', onFullscreen)
      document.removeEventListener('contextmenu', stop)
      document.removeEventListener('copy', stop)
      document.removeEventListener('cut', stop)
      document.removeEventListener('paste', stop)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('beforeunload', onUnload)
    }
  }, [enabled, report])

  // The camera banner hides itself after a few seconds
  useEffect(() => {
    if (!notice) return
    const id = setTimeout(() => setNotice(null), 10000)
    return () => clearTimeout(id)
  }, [notice])

  const enterFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen()
      setWarning(null)
    } catch {
      // The browser said no. The button stays, the student can try again.
    }
  }, [])

  const dismiss = useCallback(() => setWarning(null), [])
  const dismissNotice = useCallback(() => setNotice(null), [])

  return { fullscreen, warning, notice, dismiss, dismissNotice, enterFullscreen, report }
}