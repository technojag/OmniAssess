import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Header from '../components/Header'
import { api } from '../lib/api'
import '../i18n/exam'
import '../i18n/result'

export default function AttemptDonePage() {
  const { id = '' } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api<{ attempt: { status: string } }>('/attempts/' + id)
      .then((r) => {
        if (cancelled) return
        // The exam is still running: this page is not the place for it
        if (r.attempt.status === 'IN_PROGRESS') navigate('/attempts/' + id, { replace: true })
        else setStatus(r.attempt.status)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [id, navigate])

  if (status === null) {
    return (
      <>
        <Header />
        <main className="px-4 py-14 text-center text-text" role="status">
          {t('exam.run.loading')}
        </main>
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-lg px-4 py-14">
        <div className="rounded-xl border border-border bg-surface p-6 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-text">{t('exam.done.title')}</h1>
          <p className="mt-2 text-text/80">
            {status === 'TERMINATED' ? t('exam.done.terminated') : t('exam.done.body')}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              to={'/attempts/' + id + '/result'}
              className="rounded-md bg-brand px-6 py-2.5 font-semibold text-white hover:bg-brand-hover"
            >
              {t('result.view')}
            </Link>
            <Link
              to="/dashboard"
              className="rounded-md border border-border px-6 py-2.5 font-semibold text-text hover:bg-brand-soft"
            >
              {t('exam.done.dashboard')}
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}