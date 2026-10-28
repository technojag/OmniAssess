import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Header from '../components/Header'
import { api } from '../lib/api'
import { outcomeOf } from '../lib/result'
import type { Outcome, Review } from '../lib/result'
import '../i18n/result'

// Colour AND text, so the meaning never depends on colour alone
const BADGE: Record<Outcome, string> = {
  correct: 'bg-green-600 text-white',
  wrong: 'bg-red-600 text-white',
  unattempted: 'bg-gray-500 text-white',
}

export default function ResultReviewPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation()

  const [review, setReview] = useState<Review | null>(null)
  const [failed, setFailed] = useState(false)
  const [tries, setTries] = useState(0)
  const [tab, setTab] = useState(0)

  useEffect(() => {
    let cancelled = false
    api<Review>('/attempts/' + id + '/review')
      .then((r) => {
        if (!cancelled) setReview(r)
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
    setTries((n) => n + 1)
  }

  const section = review ? review.sections[Math.min(tab, review.sections.length - 1)] : null

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
        <h1 className="text-2xl font-bold text-text sm:text-3xl">{t('review.title')}</h1>

        {failed ? (
          <div role="alert" className="mt-6">
            <p className="text-red-600">{t('review.loadFail')}</p>
            <button
              type="button"
              onClick={retry}
              className="mt-3 rounded-md border border-border px-4 py-2 font-semibold text-text hover:bg-brand-soft"
            >
              {t('review.retry')}
            </button>
          </div>
        ) : !review || !section ? (
          <p role="status" className="mt-6 text-text/70">
            {t('review.loading')}
          </p>
        ) : (
          <>
            <div role="tablist" className="mt-5 flex gap-2 overflow-x-auto pb-1">
              {review.sections.map((sec, i) => (
                <button
                  key={sec.position}
                  type="button"
                  role="tab"
                  aria-selected={i === tab}
                  onClick={() => setTab(i)}
                  className={
                    'whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold ' +
                    (i === tab ? 'border-brand bg-brand-soft text-link' : 'border-border text-text hover:bg-brand-soft')
                  }
                >
                  {sec.name}
                </button>
              ))}
            </div>

            <div className="mt-5 space-y-4">
              {section.questions.map((q) => {
                const outcome = outcomeOf(q)
                return (
                  <article key={q.position} className="rounded-xl border border-border bg-surface p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-text/70">{t('review.questionN', { n: q.position })}</p>
                      <span className={'rounded-full px-3 py-0.5 text-xs font-semibold ' + BADGE[outcome]}>
                        {t('review.' + outcome)}
                      </span>
                    </div>

                    <p className="mt-2 whitespace-pre-wrap text-lg font-semibold text-text">{q.stem}</p>

                    <ul className="mt-4 space-y-2">
                      {q.options.map((o, i) => {
                        const isCorrect = o.id === q.correctOptionId
                        const isPicked = o.id === q.selectedOptionId
                        const border = isCorrect
                          ? 'border-green-600 bg-green-600/10'
                          : isPicked
                            ? 'border-red-600 bg-red-600/10'
                            : 'border-border'
                        return (
                          <li key={o.id} className={'rounded-lg border p-3 text-text ' + border}>
                            <span className="mr-2 font-semibold">{String.fromCharCode(65 + i)}.</span>
                            {o.text}
                            {isPicked || isCorrect ? (
                              <span className="mt-1 block text-sm font-semibold">
                                {isPicked ? t('review.yourAnswer') : ''}
                                {isPicked && isCorrect ? ' · ' : ''}
                                {isCorrect ? t('review.correctAnswer') : ''}
                              </span>
                            ) : null}
                          </li>
                        )
                      })}
                    </ul>

                    {q.correctOptionId === null ? <p className="mt-3 text-sm text-text/70">{t('review.noKey')}</p> : null}

                    {q.explanation ? (
                      <div className="mt-4 rounded-lg bg-brand-soft p-3">
                        <p className="text-sm font-semibold text-link">{t('review.explanation')}</p>
                        <p className="mt-1 whitespace-pre-wrap text-text">{q.explanation}</p>
                      </div>
                    ) : null}
                  </article>
                )
              })}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to={'/attempts/' + id + '/analysis'}
                className="rounded-md border border-border px-6 py-3 text-center font-semibold text-text hover:bg-brand-soft"
              >
                {t('review.backAnalysis')}
              </Link>
              <Link
                to="/dashboard"
                className="rounded-md bg-brand px-8 py-3 text-center font-semibold text-white hover:bg-brand-hover"
              >
                {t('review.dashboard')}
              </Link>
            </div>
          </>
        )}
      </main>
    </>
  )
}