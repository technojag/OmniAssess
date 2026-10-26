import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Header from '../components/Header'
import { api } from '../lib/api'
import { setLanguage, type Lang } from '../i18n'
import '../i18n/exam'

type Section = {
  position: number
  name: string
  durationSeconds: number
  questionCount: number
  marksPerQuestion: number
  negativeMarks: number
}

// Same shape as listAvailableExams() in api/src/modules/exams/exams.service.ts
type Exam = {
  slug: string
  name: string
  description: string | null
  totalDurationSeconds: number
  sections: Section[]
}

type StartResponse = { resumed: boolean; attempt: { id: string } }

const LANGS: { value: Lang; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी' },
]

const RULES = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'] as const

export default function ExamPage() {
  const { slug } = useParams()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  const [exam, setExam] = useState<Exam | null | undefined>(undefined) // undefined = loading, null = not found
  const [failed, setFailed] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    api<{ exams: Exam[] }>('/exams')
      .then((r) => {
        if (!cancelled) setExam(r.exams.find((e) => e.slug === slug) ?? null)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  async function start() {
    if (!exam || !agreed || busy) return
    setError('')
    setBusy(true)
    // Fullscreen can only be asked for while the click is still happening
    void document.documentElement.requestFullscreen?.().catch(() => {})
    try {
      // If an exam is already running, the server gives that same attempt back
      const r = await api<StartResponse>('/attempts', {
        method: 'POST',
        body: { examSlug: exam.slug, isPractice: false },
      })
      navigate('/attempts/' + r.attempt.id)
    } catch {
      setError(t('exam.instr.startFail'))
      setBusy(false)
      if (document.fullscreenElement) void document.exitFullscreen()
    }
  }

  const isHindi = i18n.language.startsWith('hi')
  const totalQuestions = exam ? exam.sections.reduce((sum, s) => sum + s.questionCount, 0) : 0

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
        {failed ? (
          <p role="alert" className="text-red-600">
            {t('exam.instr.loadFail')}
          </p>
        ) : exam === undefined ? (
          <p role="status" className="text-text/70">
            {t('exam.instr.loading')}
          </p>
        ) : exam === null ? (
          <div>
            <p className="text-text">{t('exam.instr.notFound')}</p>
            <Link to="/dashboard" className="mt-3 inline-block font-semibold text-link hover:underline">
              {t('exam.instr.back')}
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold text-link">{t('exam.instr.title')}</p>
            <h1 className="mt-1 text-2xl font-bold text-text sm:text-3xl">{exam.name}</h1>
            {exam.description ? <p className="mt-1 text-text/70">{exam.description}</p> : null}

            <h2 className="mb-2 mt-8 text-lg font-bold text-text">{t('exam.instr.sections')}</h2>
            <div className="overflow-x-auto rounded-xl border border-border bg-surface">
              <table className="w-full min-w-[34rem] text-left text-sm text-text">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 font-semibold">{t('exam.instr.colSection')}</th>
                    <th className="px-4 py-3 font-semibold">{t('exam.instr.colQuestions')}</th>
                    <th className="px-4 py-3 font-semibold">{t('exam.instr.colTime')}</th>
                    <th className="px-4 py-3 font-semibold">{t('exam.instr.colMarks')}</th>
                    <th className="px-4 py-3 font-semibold">{t('exam.instr.colNegative')}</th>
                  </tr>
                </thead>
                <tbody>
                  {exam.sections.map((s) => (
                    <tr key={s.position} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">{s.name}</td>
                      <td className="px-4 py-3">{s.questionCount}</td>
                      <td className="px-4 py-3">{t('exam.instr.minutesN', { n: Math.round(s.durationSeconds / 60) })}</td>
                      <td className="px-4 py-3">+{s.marksPerQuestion}</td>
                      <td className="px-4 py-3">{s.negativeMarks > 0 ? '−' + s.negativeMarks : '—'}</td>
                    </tr>
                  ))}
                  <tr className="bg-brand-soft font-semibold">
                    <td className="px-4 py-3">{t('exam.instr.total')}</td>
                    <td className="px-4 py-3">{totalQuestions}</td>
                    <td className="px-4 py-3">
                      {t('exam.instr.minutesN', { n: Math.round(exam.totalDurationSeconds / 60) })}
                    </td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3" />
                  </tr>
                </tbody>
              </table>
            </div>

            <h2 className="mb-2 mt-8 text-lg font-bold text-text">{t('exam.instr.rules')}</h2>
            <ul className="list-disc space-y-2 pl-5 text-text">
              {RULES.map((r) => (
                <li key={r}>{t('exam.instr.' + r)}</li>
              ))}
            </ul>

            <p className="mb-2 mt-8 text-sm font-semibold text-text">{t('exam.instr.language')}</p>
            <div className="flex max-w-xs overflow-hidden rounded-lg border border-border">
              {LANGS.map((l) => {
                const active = l.value === 'hi' ? isHindi : !isHindi
                return (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => setLanguage(l.value)}
                    aria-pressed={active}
                    className={
                      'flex-1 py-2.5 text-sm font-semibold ' + (active ? 'bg-brand-soft text-link' : 'text-text')
                    }
                  >
                    {l.label}
                    {active ? ' ✓' : ''}
                  </button>
                )
              })}
            </div>

            <label className="mt-8 flex items-start gap-3 text-text">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 h-5 w-5 shrink-0"
              />
              <span>{t('exam.instr.agree')}</span>
            </label>

            {error ? (
              <p role="alert" className="mt-4 rounded-md border border-red-600 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              onClick={start}
              disabled={!agreed || busy}
              className="mt-6 w-full rounded-md bg-brand px-8 py-3 font-semibold text-white hover:bg-brand-hover disabled:opacity-50 sm:w-auto"
            >
              {busy ? t('exam.instr.starting') : t('exam.instr.start')}
            </button>
          </>
        )}
      </main>
    </>
  )
}