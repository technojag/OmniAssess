import type { ReactNode } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSummary } from '../../hooks/useSummary'
import type { Summary } from '../../lib/result'
import '../../i18n/result'
import Header from '../Header'

// Loads the result and shows loading, waiting and error screens. Children only see a ready result.
export default function SummaryGate({ id, children }: { id: string; children: (s: Summary) => ReactNode }) {
  const { t } = useTranslation()
  const state = useSummary(id)

  if (state.kind === 'running') return <Navigate to={'/attempts/' + id} replace />

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
        {state.kind === 'loading' ? (
          <p role="status" className="text-text/70">
            {t('result.loading')}
          </p>
        ) : state.kind === 'waiting' ? (
          <p role="status" className="text-text">
            {t('result.waiting')}
          </p>
        ) : state.kind === 'error' ? (
          <div role="alert">
            <p className="text-red-600">{t('result.loadFail')}</p>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-md border border-border px-4 py-2 font-semibold text-text hover:bg-brand-soft"
              >
                {t('result.retry')}
              </button>
              <Link to="/dashboard" className="rounded-md border border-border px-4 py-2 font-semibold text-text hover:bg-brand-soft">
                {t('result.dashboard')}
              </Link>
            </div>
          </div>
        ) : (
          children(state.data)
        )}
      </main>
    </>
  )
}