import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Palette from '../components/exam/Palette'
import ProctorLayer from '../components/exam/ProctorLayer'
import { api } from '../lib/api'
import '../i18n/exam'

type Option = { id: string; position: number; text: string }

type Question = {
  attemptQuestionId: string
  position: number
  stem: string
  options: Option[]
  selectedOptionId: string | null
  markedForReview: boolean
}

type SectionInfo = {
  position: number
  name: string
  state: 'PENDING' | 'ACTIVE' | 'CLOSED'
  durationSeconds: number
  questionCount: number
  marksPerQuestion: number
  negativeMarks: number
  deadlineAt: string | null
}

// Same shape as getAttemptView() in api/src/modules/attempts/attempts.service.ts
type View = {
  serverTime: string
  attempt: { id: string; status: 'IN_PROGRESS' | 'SUBMITTED' | 'TERMINATED' | 'EXPIRED'; isPractice: boolean }
  awaitingContinue: boolean
  sections: SectionInfo[]
  currentSection: { position: number; questions: Question[] } | null
}

type Change = { selectedOptionId?: string | null; markedForReview?: boolean }

function formatTime(ms: number) {
  const total = Math.ceil(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0')
}

const btn = 'rounded-md border border-border px-4 py-2.5 font-semibold text-text hover:bg-brand-soft disabled:opacity-50'

export default function AttemptPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [view, setView] = useState<View | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [offset, setOffset] = useState(0) // server clock minus this computer's clock
  const [now, setNow] = useState(() => Date.now())
  const [cursor, setCursor] = useState({ pos: -1, index: 0 })
  const [visited, setVisited] = useState<Set<string>>(() => new Set())
  const [showPalette, setShowPalette] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [continuing, setContinuing] = useState(false)
  const [notice, setNotice] = useState('')
  const syncing = useRef(false)

  const apply = useCallback(
    (v: View) => {
      setOffset(Date.parse(v.serverTime) - Date.now())
      setView(v)
      setLoadFailed(false)
      if (v.attempt.status !== 'IN_PROGRESS') navigate('/attempts/' + v.attempt.id + '/done', { replace: true })
    },
    [navigate],
  )

  const load = useCallback(async () => {
    try {
      apply(await api<View>('/attempts/' + id))
    } catch {
      setLoadFailed(true)
    }
  }, [id, apply])

  // First load of the exam. The fetch is written out here (not through load()) to keep the effect simple.
  useEffect(() => {
    let cancelled = false
    api<View>('/attempts/' + id)
      .then((v) => {
        if (!cancelled) apply(v)
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [id, apply])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const active = view?.sections.find((s) => s.state === 'ACTIVE')
  const section = view?.currentSection ?? null
  const questions = section?.questions ?? []
  const index = section && cursor.pos === section.position ? Math.min(cursor.index, questions.length - 1) : 0
  const current = questions[index]

  // Proctoring watches real (not practice) exams while they are running
  const proctored = !!view && view.attempt.status === 'IN_PROGRESS' && !view.attempt.isPractice

  // The deadline comes from the server. The browser clock is only used to count down.
  const deadline = active?.deadlineAt ? Date.parse(active.deadlineAt) : null
  const remainingMs = deadline === null ? null : Math.max(0, deadline - (now + offset))
  const expiredKey = remainingMs === 0 ? Math.floor(now / 2000) : -1

  // When the timer reaches zero, ask the server. It closes the section and tells us what is next.
  useEffect(() => {
    if (expiredKey < 0 || syncing.current) return
    syncing.current = true
    void load().finally(() => {
      syncing.current = false
    })
  }, [expiredKey, load])

  // Tells the server which question is on screen (used for question timing)
  const currentId = current?.attemptQuestionId
  useEffect(() => {
    if (!currentId) return
    api('/attempts/' + id + '/events/view', { method: 'POST', body: { attemptQuestionId: currentId } }).catch(() => {})
  }, [id, currentId])

  function goTo(i: number) {
    if (!section || i < 0 || i >= questions.length) return
    if (current) setVisited((prev) => new Set(prev).add(current.attemptQuestionId))
    setCursor({ pos: section.position, index: i })
    setShowPalette(false)
  }

  function patch(attemptQuestionId: string, change: Change) {
    setView((prev) =>
      prev && prev.currentSection
        ? {
            ...prev,
            currentSection: {
              ...prev.currentSection,
              questions: prev.currentSection.questions.map((q) =>
                q.attemptQuestionId === attemptQuestionId ? { ...q, ...change } : q,
              ),
            },
          }
        : prev,
    )
  }

  // Screen updates at once, then the server saves it. If saving fails, we reload the server's version.
  async function save(change: Change) {
    if (!current) return
    setNotice('')
    patch(current.attemptQuestionId, change)
    try {
      await api('/attempts/' + id + '/responses/' + current.attemptQuestionId, { method: 'PUT', body: change })
    } catch {
      setNotice(t('exam.run.saveFail'))
      await load()
    }
  }

  async function submit() {
    if (submitting) return
    setSubmitting(true)
    try {
      await api('/attempts/' + id + '/submit', { method: 'POST' })
      navigate('/attempts/' + id + '/done', { replace: true })
    } catch {
      setNotice(t('exam.run.submitFail'))
      setSubmitting(false)
      setConfirming(false)
      await load()
    }
  }

  async function nextSection() {
    if (continuing) return
    setContinuing(true)
    setNotice('')
    try {
      apply(await api<View>('/attempts/' + id + '/continue', { method: 'POST' }))
    } catch {
      setNotice(t('exam.run.continueFail'))
      await load()
    } finally {
      setContinuing(false)
    }
  }

  // ---- Screens ----

  if (!view) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-text">
        {loadFailed ? (
          <>
            <p role="alert" className="text-red-600">
              {t('exam.run.loadFail')}
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => void load()} className={btn}>
                {t('exam.run.retry')}
              </button>
              <Link to="/dashboard" className={btn}>
                {t('exam.run.goDash')}
              </Link>
            </div>
          </>
        ) : (
          <p role="status">{t('exam.run.loading')}</p>
        )}
      </main>
    )
  }

  // A section just ended: the candidate must press Continue
  if (view.awaitingContinue) {
    const closed = [...view.sections].reverse().find((s) => s.state === 'CLOSED')
    const next = view.sections.find((s) => s.state === 'PENDING')
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
        <ProctorLayer attemptId={id} enabled={proctored} />
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-text">{t('exam.run.sectionOver')}</h1>
          {closed ? <p className="mt-2 text-text/80">{t('exam.run.sectionOverBody', { name: closed.name })}</p> : null}
          {next ? (
            <div className="mt-5 rounded-lg bg-brand-soft p-4">
              <p className="text-sm font-semibold text-link">{t('exam.run.nextLabel')}</p>
              <p className="mt-1 text-lg font-bold text-text">{next.name}</p>
              <p className="mt-1 text-sm text-text/80">
                {t(next.negativeMarks > 0 ? 'exam.run.nextInfo' : 'exam.run.nextInfoNoNeg', {
                  q: next.questionCount,
                  m: Math.round(next.durationSeconds / 60),
                  plus: next.marksPerQuestion,
                  minus: next.negativeMarks,
                })}
              </p>
            </div>
          ) : null}
          {notice ? (
            <p role="alert" className="mt-4 text-sm text-red-600">
              {notice}
            </p>
          ) : null}
          <button
            type="button"
            onClick={nextSection}
            disabled={continuing}
            className="mt-6 w-full rounded-md bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {continuing ? t('exam.run.continuing') : t('exam.run.continue')}
          </button>
        </div>
      </main>
    )
  }

  if (!current || !active) {
    return (
      <main className="flex min-h-screen items-center justify-center text-text">
        <p role="status">{t('exam.run.loading')}</p>
      </main>
    )
  }

  const answeredCount = questions.filter((q) => q.selectedOptionId).length
  const markedCount = questions.filter((q) => q.markedForReview).length
  const lowTime = remainingMs !== null && remainingMs <= 60_000

  return (
    <div className="min-h-screen pb-32">
      <ProctorLayer attemptId={id} enabled={proctored} />
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-bold text-text">{active.name}</p>
          <p className="text-sm text-text/70">{t('exam.run.questionOf', { n: index + 1, total: questions.length })}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-text/70">{t('exam.run.timeLeft')}</p>
            <p
              role="timer"
              className={'text-xl font-bold tabular-nums ' + (lowTime ? 'text-red-600' : 'text-text')}
            >
              {formatTime(remainingMs ?? 0)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-md bg-brand px-4 py-2.5 font-semibold text-white hover:bg-brand-hover"
          >
            {t('exam.run.submit')}
          </button>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-4 lg:grid-cols-[1fr_20rem]">
        <section className="min-w-0">
          {notice ? (
            <p role="alert" className="mb-3 rounded-md border border-red-600 px-3 py-2 text-sm text-red-600">
              {notice}
            </p>
          ) : null}

          <article className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <p className="whitespace-pre-wrap text-lg font-semibold text-text">{current.stem}</p>
            <div role="radiogroup" aria-label={t('exam.run.questionOf', { n: index + 1, total: questions.length })} className="mt-5 space-y-3">
              {current.options.map((o, i) => {
                const picked = current.selectedOptionId === o.id
                return (
                  <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={picked}
                    onClick={() => void save({ selectedOptionId: o.id })}
                    className={
                      'w-full rounded-lg border p-4 text-left text-text transition-colors ' +
                      (picked ? 'border-brand bg-brand-soft ring-2 ring-brand' : 'border-border hover:bg-brand-soft')
                    }
                  >
                    <span className="mr-3 font-semibold">{String.fromCharCode(65 + i)}.</span>
                    {o.text}
                  </button>
                )
              })}
            </div>
          </article>
        </section>

        <aside className="min-w-0">
          <button
            type="button"
            onClick={() => setShowPalette((s) => !s)}
            aria-expanded={showPalette}
            className={btn + ' mb-3 w-full lg:hidden'}
          >
            {showPalette ? t('exam.run.hidePalette') : t('exam.run.palette')}
          </button>
          <div className={(showPalette ? 'block' : 'hidden') + ' lg:block'}>
            <Palette questions={questions} currentIndex={index} visited={visited} onSelect={goTo} />
          </div>
        </aside>
      </main>

      <div
        className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface px-3 pt-3"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-2">
          <button type="button" onClick={() => goTo(index - 1)} disabled={index === 0} className={btn}>
            {t('exam.run.prev')}
          </button>
          <button
            type="button"
            onClick={() => void save({ selectedOptionId: null })}
            disabled={current.selectedOptionId === null}
            className={btn}
          >
            {t('exam.run.clear')}
          </button>
          <button type="button" onClick={() => void save({ markedForReview: !current.markedForReview })} className={btn}>
            {current.markedForReview ? t('exam.run.unmark') : t('exam.run.mark')}
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            disabled={index >= questions.length - 1}
            className="rounded-md bg-brand px-6 py-2.5 font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
          >
            {t('exam.run.next')}
          </button>
        </div>
      </div>

      {confirming ? (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 px-4">
          <div role="dialog" aria-modal="true" aria-labelledby="submit-title" className="w-full max-w-md rounded-xl bg-surface p-6 shadow-lg">
            <h2 id="submit-title" className="text-xl font-bold text-text">
              {t('exam.run.confirmTitle')}
            </h2>
            <p className="mt-2 text-text/80">
              {t('exam.run.confirmBody', { a: answeredCount, n: questions.length - answeredCount, m: markedCount })}
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setConfirming(false)} disabled={submitting} className={btn}>
                {t('exam.run.keep')}
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={submitting}
                className="rounded-md bg-brand px-6 py-2.5 font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
              >
                {submitting ? t('exam.run.submitting') : t('exam.run.confirmYes')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}