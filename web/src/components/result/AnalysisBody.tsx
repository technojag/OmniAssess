import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api'
import { joinTimes } from '../../lib/analysis'
import type { ProctoringLog, Timing } from '../../lib/analysis'
import type { Outcome, Review } from '../../lib/result'
import '../../i18n/result'
import '../../i18n/analysis'
import '../../i18n/cameraProctor'
import '../../i18n/cameraObjects'
import '../../i18n/cameraGaze'

type Data = { timing: Timing; review: Review; log: ProctoringLog }

// Colour AND a text label are always shown together
const OUTCOME_TEXT: Record<Outcome, string> = {
  correct: 'text-green-600',
  wrong: 'text-red-600',
  unattempted: 'text-text/70',
}

const card = 'min-w-0 rounded-xl border border-border bg-surface p-5 shadow-sm'

export default function AnalysisBody({ id }: { id: string }) {
  const { t } = useTranslation()
  const [data, setData] = useState<Data | null>(null)
  const [failed, setFailed] = useState(false)
  const [tries, setTries] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      api<Timing>('/attempts/' + id + '/timing'),
      api<Review>('/attempts/' + id + '/review'),
      api<ProctoringLog>('/attempts/' + id + '/proctoring'),
    ])
      .then(([timing, review, log]) => {
        if (!cancelled) setData({ timing, review, log })
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [id, tries])

  function retry() {
    setFailed(false)
    setData(null)
    setTries((n) => n + 1)
  }

  // "2 m 10 s" or "45 s"
  function dur(seconds: number) {
    const total = Math.round(seconds)
    const m = Math.floor(total / 60)
    const s = total % 60
    return m > 0 ? t('analysis.dur', { m, s }) : t('analysis.durS', { s })
  }

  if (failed) {
    return (
      <div role="alert">
        <p className="text-red-600">{t('analysis.loadFail')}</p>
        <button
          type="button"
          onClick={retry}
          className="mt-3 rounded-md border border-border px-4 py-2 font-semibold text-text hover:bg-brand-soft"
        >
          {t('analysis.retry')}
        </button>
      </div>
    )
  }

  if (!data) {
    return (
      <p role="status" className="text-text/70">
        {t('analysis.loading')}
      </p>
    )
  }

  const items = joinTimes(data.timing, data.review)

  // Average time per attempted question, section by section
  const sectionRows = data.review.sections.map((sec) => {
    const attempted = items.filter((i) => i.sectionPosition === sec.position && i.outcome !== 'unattempted')
    const total = attempted.reduce((sum, i) => sum + i.seconds, 0)
    return {
      position: sec.position,
      name: sec.name,
      count: attempted.length,
      avg: attempted.length > 0 ? total / attempted.length : 0,
    }
  })
  const maxAvg = Math.max(1, ...sectionRows.map((r) => r.avg))

  // The five questions that took the most time
  const longest = [...items]
    .filter((i) => i.seconds > 0)
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, 5)

  // Exam conduct
  const violations = data.log.events.filter((e) => e.type === 'PROCTOR_VIOLATION')
  const fullscreenExits = violations.filter((e) => e.kind === 'FULLSCREEN_EXIT').length
  const tabSwitches = violations.filter((e) => e.kind === 'TAB_SWITCH').length
  const faceMissing = violations.filter((e) => e.kind === 'FACE_MISSING').length
  const multiFaces = violations.filter((e) => e.kind === 'MULTIPLE_FACES').length
  const handsHidden = violations.filter((e) => e.kind === 'HANDS_HIDDEN').length
  const phonesSeen = violations.filter((e) => e.kind === 'PHONE_DETECTED').length
  const objectsSeen = violations.filter((e) => e.kind === 'OBJECT_DETECTED').length
  const gazeAway = violations.filter((e) => e.kind === 'GAZE_AWAY').length
  const clean = violations.length === 0

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <section className={card}>
          <h2 className="font-bold text-text">{t('analysis.compare')}</h2>
          <p className="mt-2 text-sm text-text/70">{t('analysis.compareSoon')}</p>
          <p className="mt-3 text-sm font-semibold text-text/70">{t('analysis.soon')}</p>
        </section>

        <section className={card}>
          <h2 className="font-bold text-text">{t('analysis.avgTitle')}</h2>
          <ul className="mt-3 space-y-3">
            {sectionRows.map((r) => (
              <li key={r.position}>
                <div className="flex justify-between text-sm text-text">
                  <span>{r.name}</span>
                  <span className="font-semibold">{r.count > 0 ? dur(r.avg) : '—'}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-border" aria-hidden="true">
                  <div className="h-full bg-brand" style={{ width: (r.avg / maxAvg) * 100 + '%' }} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className={card}>
          <h2 className="font-bold text-text">{t('analysis.longestTitle')}</h2>
          {longest.length === 0 ? (
            <p className="mt-3 text-sm text-text/70">{t('analysis.noData')}</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {longest.map((q) => (
                <li
                  key={q.sectionPosition + '-' + q.position}
                  className="flex flex-wrap items-center justify-between gap-x-3 py-2 text-sm"
                >
                  <span className="text-text">
                    {q.sectionName} · Q{q.position}
                  </span>
                  <span className={OUTCOME_TEXT[q.outcome]}>
                    {dur(q.seconds)} · {t('review.' + q.outcome)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={card}>
          <h2 className="font-bold text-text">{t('analysis.conductTitle')}</h2>
          <p className="mt-2 text-text">
            <span className="text-4xl font-bold">{data.log.warningCount}</span>{' '}
            <span className="font-semibold text-text/70">{t('analysis.warnings')}</span>
          </p>
          <p className="mt-2 text-sm text-text">{t('analysis.integrity', { n: data.log.integrityScore })}</p>
          <div className="mt-1 space-y-1 text-sm text-text/80">
            {clean ? <p>{t('analysis.conductClean')}</p> : null}
            {fullscreenExits > 0 ? <p>{t('analysis.conductFullscreen', { n: fullscreenExits })}</p> : null}
            {tabSwitches > 0 ? <p>{t('analysis.conductTab', { n: tabSwitches })}</p> : null}
            {faceMissing > 0 ? <p>{t('analysis.conductFace', { n: faceMissing })}</p> : null}
            {multiFaces > 0 ? <p>{t('analysis.conductMulti', { n: multiFaces })}</p> : null}
            {handsHidden > 0 ? <p>{t('analysis.conductHands', { n: handsHidden })}</p> : null}
            {phonesSeen > 0 ? <p>{t('analysis.conductPhone', { n: phonesSeen })}</p> : null}
            {objectsSeen > 0 ? <p>{t('analysis.conductObject', { n: objectsSeen })}</p> : null}
            {gazeAway > 0 ? <p>{t('analysis.conductGaze', { n: gazeAway })}</p> : null}
            {data.log.status === 'TERMINATED' ? (
              <p className="font-semibold text-red-600">{t('analysis.conductTerminated')}</p>
            ) : null}
          </div>
        </section>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          to={'/attempts/' + id + '/review'}
          className="rounded-md bg-brand px-8 py-3 text-center font-semibold text-white hover:bg-brand-hover"
        >
          {t('analysis.seeReview')}
        </Link>
        <Link
          to={'/attempts/' + id + '/result'}
          className="rounded-md border border-border px-6 py-3 text-center font-semibold text-text hover:bg-brand-soft"
        >
          {t('analysis.back')}
        </Link>
      </div>
    </>
  )
}