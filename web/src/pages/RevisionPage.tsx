import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Header from '../components/Header'
import { api } from '../lib/api'
import type { RevisionItem } from '../lib/revision'
import '../i18n/revision'

const btn = 'rounded-md border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-brand-soft disabled:opacity-50'

export default function RevisionPage() {
  const { t } = useTranslation()
  const [items, setItems] = useState<RevisionItem[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [tries, setTries] = useState(0)
  const [picks, setPicks] = useState<Record<string, string>>({})
  const [shown, setShown] = useState<Set<string>>(() => new Set())
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    api<{ items: RevisionItem[] }>('/revision')
      .then((r) => {
        if (!cancelled) setItems(r.items)
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
    setItems(null)
    setTries((n) => n + 1)
  }

  function toggleShown(id: string) {
    setShown((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function remove(questionId: string) {
    setError('')
    try {
      await api('/revision/' + questionId, { method: 'DELETE' })
      setItems((prev) => (prev ? prev.filter((i) => i.questionId !== questionId) : prev))
    } catch {
      setError(t('rev.fail'))
    }
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
        <Link to="/dashboard" className="text-sm font-semibold text-link hover:underline">
          ← {t('rev.back')}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-text sm:text-3xl">{t('rev.title')}</h1>
        <p className="mt-1 text-text/70">{t('rev.subtitle')}</p>

        {error ? (
          <p role="alert" className="mt-4 rounded-md border border-red-600 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        ) : null}

        {failed ? (
          <div role="alert" className="mt-6">
            <p className="text-red-600">{t('rev.loadFail')}</p>
            <button type="button" onClick={retry} className={btn + ' mt-3'}>
              {t('rev.retry')}
            </button>
          </div>
        ) : items === null ? (
          <p role="status" className="mt-6 text-text/70">
            {t('rev.loading')}
          </p>
        ) : items.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-border p-5 text-text/80">{t('rev.empty')}</p>
        ) : (
          <>
            <p className="mt-4 text-sm text-text/70">
              {t('rev.count', { n: items.length })} · {t('rev.hint')}
            </p>
            <ul className="mt-4 space-y-4">
              {items.map((q) => {
                const picked = picks[q.questionId]
                const revealed = shown.has(q.questionId) || !!picked
                return (
                  <li key={q.questionId} className="rounded-xl border border-border bg-surface p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase text-link">
                      {q.subject}
                      {q.topic ? ' · ' + q.topic : ''}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-lg font-semibold text-text">{q.stem}</p>

                    <ul className="mt-4 space-y-2">
                      {q.options.map((o, idx) => {
                        const isCorrect = o.id === q.correctOptionId
                        const isPicked = o.id === picked
                        const border = !revealed
                          ? 'border-border hover:bg-brand-soft'
                          : isCorrect
                            ? 'border-green-600 bg-green-600/10'
                            : isPicked
                              ? 'border-red-600 bg-red-600/10'
                              : 'border-border'
                        return (
                          <li key={o.id}>
                            <button
                              type="button"
                              disabled={revealed}
                              onClick={() => setPicks((prev) => ({ ...prev, [q.questionId]: o.id }))}
                              className={
                                'flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-left text-text ' +
                                border
                              }
                            >
                              <span>
                                <span className="mr-2 font-semibold">{String.fromCharCode(65 + idx)}.</span>
                                {o.text}
                              </span>
                              {revealed && (isCorrect || isPicked) ? (
                                <span className={'text-sm font-semibold ' + (isCorrect ? 'text-green-600' : 'text-red-600')}>
                                  {isPicked ? t('rev.yourChoice') : ''}
                                  {isPicked && isCorrect ? ' · ' : ''}
                                  {isCorrect ? t('rev.correctAnswer') : ''}
                                </span>
                              ) : null}
                            </button>
                          </li>
                        )
                      })}
                    </ul>

                    {revealed ? (
                      <p className="mt-4 whitespace-pre-wrap text-text">
                        <span className="font-bold">{t('rev.solution')}. </span>
                        {q.explanation ?? t('rev.noSolution')}
                      </p>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button type="button" onClick={() => toggleShown(q.questionId)} className={btn}>
                        {shown.has(q.questionId) ? t('rev.hideAnswer') : t('rev.showAnswer')}
                      </button>
                      <button type="button" onClick={() => void remove(q.questionId)} className={btn}>
                        {t('rev.removeShort')}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </main>
    </>
  )
}