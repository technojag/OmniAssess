import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCameraProctor } from '../../hooks/useCameraProctor'
import { useProctoring } from '../../hooks/useProctoring'
import type { ViolationKind } from '../../hooks/useProctoring'
import '../../i18n/proctor'
import '../../i18n/cameraProctor'
import '../../i18n/cameraObjects'
import '../../i18n/cameraLive'
import '../../i18n/cameraGaze'

type Props = { attemptId: string; enabled: boolean; cameraRequired: boolean }

const MESSAGE: Record<ViolationKind, string> = {
  TAB_SWITCH: 'warnTab',
  FULLSCREEN_EXIT: 'warnFullscreen',
  FACE_MISSING: 'warnFace',
  MULTIPLE_FACES: 'warnMulti',
  HANDS_HIDDEN: 'warnHands',
  PHONE_DETECTED: 'warnPhone',
  OBJECT_DETECTED: 'warnObject',
  GAZE_AWAY: 'warnGaze',
}

// Watches the exam and covers the screen with a message when something is wrong
export default function ProctorLayer({ attemptId, enabled, cameraRequired }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const p = useProctoring(attemptId, enabled, () => navigate('/attempts/' + attemptId + '/done', { replace: true }))
  const cameraOn = enabled && cameraRequired
  const videoRef = useRef<HTMLVideoElement>(null)
  const cam = useCameraProctor({ videoRef, enabled: cameraOn, report: p.report })

  if (!enabled) return null

  const cameraProblem = cameraOn ? cam.problem : null
  const w = p.warning
  const n = p.notice
  const showModal = !cameraProblem && (!!w || !p.fullscreen)

  // What the camera sees right now, shown under the preview so the student can fix it before a warning
  const s = cam.status
  const badFrame = s.faces !== 1 || s.persons > 1 || s.phone || s.book || s.away
  const seenItems = [
    s.phone ? t('exam.proctor.camPhone') : '',
    s.book ? t('exam.proctor.camBook') : '',
    s.away ? t('exam.proctor.camAway') : '',
  ]
    .filter(Boolean)
    .join(', ')
  const liveText =
    t('exam.proctor.camLive', { f: s.faces, p: s.persons }) + (seenItems ? ' · ' + seenItems : '')

  return (
    <>
      {cameraOn ? (
        <div className="fixed bottom-24 left-3 z-30 w-28 sm:w-40">
          <video
            ref={videoRef}
            muted
            playsInline
            aria-label={t('exam.proctor.camLabel')}
            className="aspect-[4/3] w-full -scale-x-100 rounded-lg border border-border bg-black object-cover"
          />
          <p
            className={
              'mt-1 rounded px-2 py-0.5 text-center text-xs font-semibold text-white ' +
              (cam.ready && !badFrame ? 'bg-black/70' : 'bg-red-600')
            }
          >
            {cam.ready ? liveText : t('exam.proctor.camStarting')}
          </p>
        </div>
      ) : null}

      {n ? (
        <div
          role="alert"
          className="fixed inset-x-0 top-16 z-40 mx-auto w-[min(32rem,calc(100vw-1.5rem))] rounded-lg border-2 border-red-600 bg-surface p-4 shadow-lg"
        >
          <p className="font-bold text-red-600">{t('exam.proctor.warnTitle')}</p>
          <p className="mt-1 text-text">{t('exam.proctor.' + MESSAGE[n.kind])}</p>
          <p className="mt-1 text-sm font-semibold text-text">
            {n.issued ? t('exam.proctor.count', { n: n.count, max: n.max }) : t('exam.proctor.noticeOnly')}
          </p>
          <p className="text-sm text-text/70">{t('exam.proctor.integrity', { n: n.integrity })}</p>
          <button
            type="button"
            onClick={p.dismissNotice}
            className="mt-3 rounded-md border border-border px-4 py-1.5 text-sm font-semibold text-text hover:bg-brand-soft"
          >
            OK
          </button>
        </div>
      ) : null}

      {cameraProblem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="camera-gate-title"
            className="w-full max-w-md rounded-xl bg-surface p-6 shadow-lg"
          >
            <h2 id="camera-gate-title" className="text-xl font-bold text-red-600">
              {t('exam.proctor.camGateTitle')}
            </h2>
            <p className="mt-3 text-text">
              {cameraProblem === 'camera' ? t('exam.proctor.camGateCamera') : t('exam.proctor.camGateChecker')}
            </p>
            <p className="mt-2 text-sm text-text/70">{t('exam.proctor.camGateHelp')}</p>
            <button
              type="button"
              onClick={cam.restart}
              className="mt-6 w-full rounded-md bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-hover"
            >
              {t('exam.proctor.camGateButton')}
            </button>
          </div>
        </div>
      ) : null}

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="proctor-title"
            className="w-full max-w-md rounded-xl bg-surface p-6 shadow-lg"
          >
            <h2 id="proctor-title" className={'text-xl font-bold ' + (w ? 'text-red-600' : 'text-text')}>
              {w ? t('exam.proctor.warnTitle') : t('exam.proctor.gateTitle')}
            </h2>

            {w ? (
              <div className="mt-3 space-y-2 text-text">
                <p>{t('exam.proctor.' + MESSAGE[w.kind])}</p>
                <p className="font-semibold">{t('exam.proctor.count', { n: w.count, max: w.max })}</p>
                {w.count < w.max ? <p>{t('exam.proctor.left', { n: w.max - w.count })}</p> : null}
                <p className="text-sm text-text/70">{t('exam.proctor.integrity', { n: w.integrity })}</p>
              </div>
            ) : (
              <p className="mt-3 text-text">{t('exam.proctor.gateBody')}</p>
            )}

            <button
              type="button"
              onClick={p.fullscreen ? p.dismiss : () => void p.enterFullscreen()}
              className="mt-6 w-full rounded-md bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-hover"
            >
              {p.fullscreen ? t('exam.proctor.ok') : w ? t('exam.proctor.back') : t('exam.proctor.enter')}
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}