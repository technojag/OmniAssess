import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/context'
import Header from '../components/Header'
import ActivityGrid from '../components/activity/ActivityGrid'
import DailyChallenge from '../components/daily/DailyChallenge'
import DashboardCompare from '../components/dashboard/DashboardCompare'
import { api } from '../lib/api'
import { STATUS_STYLE } from '../lib/attempts'
import type { AttemptRow } from '../lib/attempts'
import { formatNumber } from '../lib/result'
import '../i18n/dashboard'
import '../i18n/history'

type ExamSection = {
  position: number
  name: string
  durationSeconds: number
  questionCount: number
}

// Same shape as listAvailableExams() in api/src/modules/exams/exams.service.ts
type ExamSummary = {
  slug: string
  name: string
  category: string
  description: string | null
  version: number
  totalDurationSeconds: number
  sections: ExamSection[]
}

type Profile = { category: string; details: Record<string, unknown> | null } | null

// Words that identify each target exam inside an exam's slug or name
const TARGET_WORDS: Record<string, string[]> = {
  UPSC: ['upsc'],
  SSC_CGL: ['ssc'],
  BANKING: ['bank'],
  RAILWAYS: ['rrb', 'railway'],
}

const PLACEHOLDERS = ['countdown'] as const

type Data = {
  exams: ExamSummary[]
  target: string | null // UPSC, SSC_CGL, BANKING, RAILWAYS or OTHER (Government exams only)
  targetName: string | null // the name the student wrote when target is OTHER
  category: string | null
  attempts: AttemptRow[] | null // null = could not be loaded
}

async function fetchData(): Promise<Data> {
  const [examsRes, profileRes, attemptsRes] = await Promise.all([
    api<{ exams: ExamSummary[] }>('/exams'),
    api<{ profile: Profile }>('/onboarding').catch(() => ({ profile: null as Profile })),
    api<{ attempts: AttemptRow[] }>('/attempts').catch(() => null),
  ])
  const p = profileRes.profile
  const isGovt = p?.category === 'GOVT_COMPETITIVE'
  const rawTarget = isGovt ? p?.details?.targetExam : null
  const rawName = isGovt ? p?.details?.targetExamOther : null
  return {
    exams: examsRes.exams,
    target: typeof rawTarget === 'string' ? rawTarget : null,
    targetName: typeof rawName === 'string' && rawName.trim() ? rawName.trim() : null,
    category: p?.category ?? null,
    attempts: attemptsRes ? attemptsRes.attempts : null,
  }
}

// A logged-in student only sees exams for their own target, or for their category if no target is set
function examsForStudent({ exams, target, category }: Data) {
  // "Other" means an exam we do not have yet: show nothing instead of some other exam
  if (target === 'OTHER') return []
  if (target) {
    const words = TARGET_WORDS[target] ?? []
    return exams.filter((e) => words.some((w) => (e.slug + ' ' + e.name).toLowerCase().includes(w)))
  }
  if (category) return exams.filter((e) => e.category === category)
  return exams
}

export default function DashboardPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const name = user?.fullName.split(' ')[0] ?? ''

  const [data, setData] = useState<Data | null>(null)
  const [failed, setFailed] = useState(false)
  const [activityKey, setActivityKey] = useState(0)

  function retry() {
    setFailed(false)
    setData(null)
    fetchData().then(setData).catch(() => setFailed(true))
  }

  useEffect(() => {
    let cancelled = false
    fetchData()
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const exams = data ? examsForStudent(data) : null
  const targetLabel = !data?.target
    ? ''
    : data.target === 'OTHER'
      ? (data.targetName ?? t('onb.opt.OTHER'))
      : t('onb.opt.' + data.target, { defaultValue: data.target })

  const running = data?.attempts?.filter((a) => a.status === 'IN_PROGRESS') ?? []
  // The list is newest first, so the first finished attempt is the latest one
  const latest = data?.attempts?.find((a) => a.status !== 'IN_PROGRESS') ?? null
  const locale = i18n.language.startsWith('hi') ? 'hi-IN' : 'en-IN'
  const when = (iso: string) => new Date(iso).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-10">
        <h1 className="text-2xl font-bold text-text sm:text-3xl">{t('dash.welcome', { name })}</h1>
        <p className="mt-1 text-text/70">{t('dash.subtitle')}</p>

        {data?.target ? (
          <div className="mt-5 rounded-xl border border-border bg-brand-soft p-4">
            <p className="font-semibold text-text">{t('dash.yourTarget', { exam: targetLabel })}</p>
          </div>
        ) : null}

        {running.map((a) => (
          <section key={a.id} className="mt-5 rounded-xl border-2 border-brand bg-brand-soft p-5">
            <p className="text-sm font-semibold text-link">{t('dash.cont.title')}</p>
            <h2 className="mt-1 text-lg font-bold text-text">{a.exam.name}</h2>
            <p className="mt-1 text-sm text-text/80">
              {a.current?.sectionName
                ? t('dash.cont.section', { name: a.current.sectionName })
                : t('dash.cont.between')}
            </p>
            <Link
              to={'/attempts/' + a.id}
              className="mt-4 inline-block rounded-md bg-brand px-6 py-2.5 font-semibold text-white hover:bg-brand-hover"
            >
              {t('dash.cont.resume')}
            </Link>
          </section>
        ))}

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold text-text">{t('dash.exams')}</h2>

          {failed ? (
            <div role="alert" className="rounded-xl border border-red-600 p-4">
              <p className="text-red-600">{t('dash.error')}</p>
              <button
                type="button"
                onClick={retry}
                className="mt-3 rounded-md border border-border px-4 py-2 font-semibold text-text hover:bg-brand-soft"
              >
                {t('dash.retry')}
              </button>
            </div>
          ) : exams === null ? (
            <p role="status" className="text-text/70">
              {t('dash.loading')}
            </p>
          ) : exams.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-5 text-text/80">
              {data?.target ? t('dash.noTarget', { exam: targetLabel }) : t('dash.emptyForYou')}
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {exams.map((e) => {
                const totalQuestions = e.sections.reduce((sum, s) => sum + s.questionCount, 0)
                return (
                  <article key={e.slug} className="min-w-0 rounded-xl border border-border bg-surface p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase text-link">
                      {t('dash.cat.' + e.category, { defaultValue: e.category })}
                    </p>
                    <h3 className="mt-1 text-lg font-bold text-text">{e.name}</h3>
                    {e.description ? <p className="mt-1 text-text/70">{e.description}</p> : null}

                    <p className="mt-3 text-sm font-semibold text-text">
                      {t('dash.sectionsN', { n: e.sections.length })} ·{' '}
                      {t('dash.minutesN', { n: Math.round(e.totalDurationSeconds / 60) })} ·{' '}
                      {t('dash.questionsN', { n: totalQuestions })}
                    </p>

                    <ul className="mt-3 flex flex-wrap gap-2">
                      {e.sections.map((s) => (
                        <li
                          key={s.position}
                          className="rounded-full border border-border px-3 py-1 text-sm text-text/80"
                        >
                          {s.name}
                        </li>
                      ))}
                    </ul>

                    <Link
                      to={'/exams/' + e.slug}
                      className="mt-5 inline-block rounded-md bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-hover"
                    >
                      {t('dash.view')}
                    </Link>
                  </article>
                )
              })}

              <DashboardCompare
                key={latest?.id ?? 'none'}
                attemptId={latest?.id ?? null}
                examName={latest?.exam.name ?? ''}
              />
            </div>
          )}
        </section>

        <DailyChallenge onAnswered={() => setActivityKey((k) => k + 1)} />

        <ActivityGrid refreshKey={activityKey} />

        {data ? (
          <section className="mt-10">
            <Link
              to="/attempts"
              className="block rounded-xl border border-border bg-surface p-5 shadow-sm hover:bg-brand-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-text">{t('dash.recent.title')}</h2>
                <span className="shrink-0 text-sm font-semibold text-link">{t('dash.recent.seeAll')} →</span>
              </div>

              {data.attempts === null ? (
                <p className="mt-2 text-red-600">{t('dash.recent.error')}</p>
              ) : latest ? (
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase text-text/70">{t('dash.recent.latest')}</p>
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-text">{latest.exam.name}</p>
                      <p className="text-sm text-text/70">{when(latest.submittedAt ?? latest.startedAt)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={
                          'rounded-full px-3 py-0.5 text-xs font-semibold ' +
                          (STATUS_STYLE[latest.status] ?? 'bg-gray-500 text-white')
                        }
                      >
                        {t('dash.recent.status.' + latest.status)}
                      </span>
                      {latest.score !== null && latest.maxScore !== null ? (
                        <span className="font-semibold text-text">
                          {t('dash.recent.score', {
                            score: formatNumber(latest.score),
                            max: formatNumber(latest.maxScore),
                          })}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-text/80">{t('dash.recent.empty')}</p>
              )}
            </Link>
          </section>
        ) : null}

        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          {PLACEHOLDERS.map((key) => (
            <div key={key} className="min-w-0 rounded-xl border border-dashed border-border p-5">
              <h3 className="font-semibold text-text">{t('dash.cards.' + key)}</h3>
              <p className="mt-1 text-sm text-text/70">{t('dash.soon')}</p>
            </div>
          ))}
        </section>
      </main>
    </>
  )
}