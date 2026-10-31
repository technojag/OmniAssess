import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Header from '../components/Header'
import { api } from '../lib/api'
import { STATUS_STYLE } from '../lib/attempts'
import type { AttemptRow } from '../lib/attempts'
import { formatNumber } from '../lib/result'
import '../i18n/dashboard'
import '../i18n/history'

export default function AttemptsHistoryPage() {
  const { t, i18n } = useTranslation()
  const [attempts, setAttempts] = useState<AttemptRow[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [tries, setTries] = useState(0)

  useEffect(() => {
    let cancelled = false
    api<{ attempts: AttemptRow[] }>('/attempts')
      .then((r) => {
        if (!cancelled) setAttempts(r.attempts)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [tries])

  function retry() {
    setFailed(false)
    setAttempts(null)
    setTries((n) => n + 1)
  }

  const locale = i18n.language.startsWith('hi') ? 'hi-IN' : 'en-IN'
  const when = (iso: string) => new Date(iso).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
        <Link to="/dashboard" className="text-sm font-semibold text-link hover:underline">
          ← {t('dash.recent.back')}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-text sm:text-3xl">{t('dash.recent.historyTitle')}</h1>

        {failed ? (
          <div role="alert" className="mt-6">
            <p className="text-red-600">{t('dash.recent.error')}</p>
            <button
              type="button"
              onClick={retry}
              className="mt-3 rounded-md border border-border px-4 py-2 font-semibold text-text hover:bg-brand-soft"
            >
              {t('dash.retry')}
            </button>
          </div>
        ) : attempts === null ? (
          <p role="status" className="mt-6 text-text/70">
            {t('dash.loading')}
          </p>
        ) : attempts.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-border p-5 text-text/80">{t('dash.recent.empty')}</p>
        ) : (
          <>
            <p className="mt-1 text-text/70">{t('dash.recent.count', { n: attempts.length })}</p>
            <ul className="mt-4 divide-y divide-border rounded-xl border border-border bg-surface">
              {attempts.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-text">{a.exam.name}</p>
                    <p className="text-sm text-text/70">{when(a.submittedAt ?? a.startedAt)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={
                        'rounded-full px-3 py-0.5 text-xs font-semibold ' + (STATUS_STYLE[a.status] ?? 'bg-gray-500 text-white')
                      }
                    >
                      {t('dash.recent.status.' + a.status)}
                    </span>
                    {a.score !== null && a.maxScore !== null ? (
                      <span className="font-semibold text-text">
                        {t('dash.recent.score', { score: formatNumber(a.score), max: formatNumber(a.maxScore) })}
                      </span>
                    ) : null}
                    {a.status === 'IN_PROGRESS' ? (
                      <Link
                        to={'/attempts/' + a.id}
                        className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
                      >
                        {t('dash.cont.resume')}
                      </Link>
                    ) : (
                      <Link
                        to={'/attempts/' + a.id + '/result'}
                        className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-link hover:bg-brand-soft"
                      >
                        {t('dash.recent.viewResult')}
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </>
  )
}