import { useEffect, useRef, useState } from 'react'
import type { FaceLandmarker } from '@mediapipe/tasks-vision'
import { useTranslation } from 'react-i18next'
import { averageMetrics, clearBaseline, saveBaseline } from '../../lib/gaze'
import type { GazeMetrics } from '../../lib/gaze'
import { analyze, loadDetectors, loadGazeModel, readGaze } from '../../lib/vision'
import type { Detectors } from '../../lib/vision'
import '../../i18n/camera'
import '../../i18n/cameraGaze'

type Flags = { camera: boolean; face: boolean; voice: boolean; gaze: boolean }
const NONE: Flags = { camera: false, face: false, voice: false, gaze: false }

const TICK_MS = 300
const HOLD_MS = 1500 // a face must stay in view this long
const VOICE_MS = 900 // total time the voice must be heard
const VOICE_LEVEL = 0.03 // quiet room noise stays below this
const CALIBRATION_LOOKS = 7 // about 2 seconds of looking at the middle of the screen

const STEPS = [
  ['camera', 'stepCamera'],
  ['face', 'stepFace'],
  ['voice', 'stepVoice'],
  ['gaze', 'stepGaze'],
] as const

type Props = { onResult: (ok: boolean) => void }

export default function CameraCheck({ onResult }: Props) {
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const stopRef = useRef<(() => void) | null>(null)
  const [phase, setPhase] = useState<'idle' | 'loading' | 'running' | 'passed'>('idle')
  const [flags, setFlags] = useState<Flags>(NONE)
  const [level, setLevel] = useState(0)
  const [errorKey, setErrorKey] = useState('')

  // Leaving the page switches the camera and microphone off
  useEffect(
    () => () => {
      stopRef.current?.()
    },
    [],
  )

  function stop() {
    stopRef.current?.()
    stopRef.current = null
  }

  async function start() {
    stop()
    onResult(false)
    clearBaseline()
    setErrorKey('')
    setFlags(NONE)
    setLevel(0)
    setPhase('loading')

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorKey('errInsecure')
      setPhase('idle')
      return
    }

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: true,
      })
    } catch (e) {
      const name = (e as DOMException).name
      setErrorKey(
        name === 'NotAllowedError' || name === 'SecurityError'
          ? 'errDenied'
          : name === 'NotFoundError' || name === 'OverconstrainedError'
            ? 'errNotFound'
            : 'errOther',
      )
      setPhase('idle')
      return
    }
    const stopStream = () => stream.getTracks().forEach((track) => track.stop())

    let detectors: Detectors
    try {
      detectors = await loadDetectors()
    } catch {
      stopStream()
      setErrorKey('errChecker')
      setPhase('idle')
      return
    }
    // If the gaze model cannot load, that step passes by itself and gaze is simply not checked in the exam
    const gazeModel: FaceLandmarker | null = await loadGazeModel().catch(() => null)

    const video = videoRef.current
    if (!video) {
      stopStream()
      setPhase('idle')
      return
    }
    video.srcObject = stream
    await video.play().catch(() => {})

    // Voice: we only measure how loud the microphone signal is
    const AudioCtx =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const audio = new AudioCtx()
    void audio.resume()
    const analyser = audio.createAnalyser()
    analyser.fftSize = 1024
    audio.createMediaStreamSource(stream).connect(analyser)
    const samples = new Uint8Array(analyser.fftSize)

    let faceMs = 0
    let voiceMs = 0
    const looks: GazeMetrics[] = []
    const done: Flags = { ...NONE, camera: true, gaze: gazeModel === null }
    setPhase('running')
    setFlags({ ...done })

    const finish = () => {
      stop()
      setPhase('passed')
      onResult(true)
    }

    const timer = setInterval(() => {
      if (video.readyState >= 2) {
        try {
          const { faces } = analyze(detectors, video)
          faceMs = faces === 1 ? faceMs + TICK_MS : 0
          if (faceMs >= HOLD_MS) done.face = true

          // Calibration comes last: the student looks at the middle of the screen
          if (gazeModel && done.face && done.voice && !done.gaze && faces === 1) {
            const metrics = readGaze(gazeModel, video)
            if (metrics) looks.push(metrics)
            if (looks.length >= CALIBRATION_LOOKS) {
              saveBaseline(averageMetrics(looks))
              done.gaze = true
            }
          }
        } catch {
          // skip this frame
        }
      }

      analyser.getByteTimeDomainData(samples)
      let sum = 0
      for (const s of samples) {
        const v = (s - 128) / 128
        sum += v * v
      }
      const rms = Math.sqrt(sum / samples.length)
      setLevel(rms)
      if (rms > VOICE_LEVEL) voiceMs += TICK_MS
      if (voiceMs >= VOICE_MS) done.voice = true

      setFlags({ ...done })
      if (done.face && done.voice && done.gaze) finish()
    }, TICK_MS)

    stopRef.current = () => {
      clearInterval(timer)
      stopStream()
      void audio.close()
      video.srcObject = null
    }
  }

  const running = phase === 'running'
  // One hint at a time: the first thing that is still missing
  const hint = !flags.face ? 'hintFace' : !flags.voice ? 'hintVoice' : !flags.gaze ? 'hintGaze' : null

  return (
    <section className="mt-8 rounded-xl border border-border bg-surface p-5" aria-labelledby="cam-title">
      <h2 id="cam-title" className="text-lg font-bold text-text">
        {t('exam.cam.title')}
      </h2>
      <p className="mt-1 text-sm text-text/80">{t('exam.cam.intro')}</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <video
            ref={videoRef}
            muted
            playsInline
            className={'aspect-[4/3] w-full -scale-x-100 rounded-lg bg-black object-cover ' + (running ? '' : 'opacity-40')}
          />
          <p className="mt-2 text-xs font-semibold text-text/70">{t('exam.cam.level')}</p>
          <div
            role="progressbar"
            aria-label={t('exam.cam.level')}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(100, Math.round(level * 600))}
            className="mt-1 h-2 overflow-hidden rounded-full bg-border"
          >
            <div className="h-full bg-green-600" style={{ width: Math.min(100, level * 600) + '%' }} />
          </div>
        </div>

        <ul className="space-y-3">
          {STEPS.map(([key, label]) => (
            <li key={key} className="flex items-center gap-3 text-text">
              <span
                aria-hidden="true"
                className={
                  'grid h-6 w-6 shrink-0 place-items-center rounded-full text-sm font-bold ' +
                  (flags[key] ? 'bg-green-600 text-white' : 'border border-border text-text/50')
                }
              >
                {flags[key] ? '✓' : '○'}
              </span>
              <span className="flex-1">{t('exam.cam.' + label)}</span>
              <span className={'text-sm font-semibold ' + (flags[key] ? 'text-green-600' : 'text-text/60')}>
                {flags[key] ? t('exam.cam.done') : t('exam.cam.waiting')}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {running && hint ? (
        <p role="status" className="mt-4 rounded-md bg-brand-soft p-3 text-sm text-text">
          {t('exam.cam.' + hint)}
        </p>
      ) : null}
      {phase === 'loading' ? (
        <p role="status" className="mt-4 text-sm text-text/70">
          {t('exam.cam.loading')}
        </p>
      ) : null}
      {errorKey ? (
        <p role="alert" className="mt-4 rounded-md border border-red-600 px-3 py-2 text-sm text-red-600">
          {t('exam.cam.' + errorKey)}
        </p>
      ) : null}
      {phase === 'passed' ? (
        <p role="status" className="mt-4 rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white">
          {t('exam.cam.passed')}
        </p>
      ) : (
        <p className="mt-4 text-sm text-text/70">{t('exam.cam.needAll')}</p>
      )}

      <button
        type="button"
        onClick={() => void start()}
        disabled={phase === 'loading' || running}
        className="mt-4 rounded-md border border-brand px-6 py-2.5 font-semibold text-link hover:bg-brand-soft disabled:opacity-50"
      >
        {phase === 'passed' ? t('exam.cam.again') : t('exam.cam.start')}
      </button>
    </section>
  )
}