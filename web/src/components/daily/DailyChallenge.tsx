import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api'
import '../../i18n/daily'

type DailyQuestion = {
  id: string
  subject: string
  topic: string | null
  stem: string
  options: { id: string; text: string }[]
}

type DailyData = { date: string; questions: DailyQuestion[] }

type CheckResponse = {
  correct: boolean
  correctOptionId: string | null
  explanation: string | null
}

type Checked = CheckResponse & { optionId: string }

export default function DailyChallenge({ onAnswered }: { onAnswered?: () => void }) {
  const { t } = useTranslation()
  const [data, setData] = useState<DailyData | null>(null)
  const [failed, setFailed] = useState(false)
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, Checked>>({})
  const [checking, setChecking] = useState(false)
  const [checkError, setCheckError] = useState(false)

  useEffect(() => {
    let cancelled = false
    api<DailyData>('/daily')
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

  function retry() {
    setFailed(false)
    setData(null)
    api<DailyData>('/daily')
      .then(setData)
      .catch(() => setFailed(true))
  }

  function check(q: DailyQuestion) {
    if (selected === null || checking) return
    const optionId = selected
    setChecking(true)
    setCheckError(false)
    api<CheckResponse>('/daily/check', {
      method: 'POST',
      body: { questionId: q.id, optionId },
    })
      .then((r) => {
        setResults((prev) => ({ ...prev, [q.id]: { ...r, optionId } }))
        onAnswered?.()
      })
      .catch(() => setCheckError(true))
      .finally(() => setChecking(false))
  }

  function next() {
    setIndex((i) => i + 1)
    setSelected(null)
    setCheckError(false)
  }

  const questions = data?.questions ?? []
  const total = questions.length
  const finished = total > 0 && index >= total
  const score = Object.values(results).filter((r) => r.correct).length

  let body
  if (failed) {
    body = (
      <div role="alert">
        <p className="text-red-600">{t('daily.error')}</p>
        <button
          type="button"
          onClick={retry}
          className="mt-3 rounded-md border border-border px-4 py-2 font-semibold text-text hover:bg-brand-soft"
        >
          {t('daily.retry')}
        </button>
      </div>
    )
  } else if (data === null) {
    body = (
      <p role="status" className="text-text/70">
        {t('daily.loading')}
      </p>
    )
  } else if (total === 0) {
    body = <p className="text-text/80">{t('daily.empty')}</p>
  } else if (finished) {
    body = (
      <div>
        <p className="text-lg font-bold text-text">{t('daily.done')}</p>
        <p className="mt-1 font-semibold text-text">{t('daily.score', { score, total })}</p>
        <p className="mt-1 text-sm text-text/70">{t('daily.comeBack')}</p>
      </div>
    )
  } else {
    const q = questions[index]
    const result = results[q.id]
    const isLast = index === total - 1

    body = (
      <div>
        <p className="text-xs font-semibold uppercase text-link">
          {t('daily.questionN', { n: index + 1, total })} · {q.subject}
          {q.topic ? ' · ' + q.topic : ''}
        </p>
        <p className="mt-2 text-base font-semibold text-text">{q.stem}</p>

        <ul className="mt-4 grid gap-2">
          {q.options.map((o) => {
            const isCorrect = result !== undefined && o.id === result.correctOptionId
            const isWrongPick = result !== undefined && o.id === result.optionId && !isCorrect
            let style = 'border-border hover:bg-brand-soft'
            if (result === undefined && selected === o.id) style = 'border-brand bg-brand-soft'
            if (isCorrect) style = 'border-green-600'
            if (isWrongPick) style = 'border-red-600'

            return (
              <li key={o.id}>
                <button
                  type="button"
                  disabled={result !== undefined}
                  aria-pressed={selected === o.id}
                  onClick={() => setSelected(o.id)}
                  className={
                    'flex w-full items-center justify-between gap-3 rounded-lg border-2 px-4 py-3 text-left text-text ' +
                    style
                  }
                >
                  <span>{o.text}</span>
                  {isCorrect ? (
                    <span className="shrink-0 text-sm font-semibold text-green-600">
                      ✓ {t('daily.correctLabel')}
                    </span>
                  ) : null}
                  {isWrongPick ? (
                    <span className="shrink-0 text-sm font-semibold text-red-600">
                      ✗ {t('daily.yourLabel')}
                    </span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>

        {result !== undefined ? (
          <div className="mt-4">
            <p className={'font-semibold ' + (result.correct ? 'text-green-600' : 'text-red-600')}>
              {result.correct ? '✓ ' + t('daily.correctMsg') : '✗ ' + t('daily.wrongMsg')}
            </p>
            {result.explanation ? (
              <p className="mt-2 text-sm text-text/80">
                <span className="font-semibold text-text">{t('daily.explanation')}: </span>
                {result.explanation}
              </p>
            ) : null}
            <button
              type="button"
              onClick={next}
              className="mt-4 rounded-md bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-hover"
            >
              {isLast ? t('daily.seeResult') : t('daily.next')}
            </button>
          </div>
        ) : (
          <div className="mt-4">
            <button
              type="button"
              disabled={selected === null || checking}
              onClick={() => check(q)}
              className="rounded-md bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {checking ? t('daily.checking') : t('daily.check')}
            </button>
            {checkError ? (
              <p role="alert" className="mt-2 text-sm text-red-600">
                {t('daily.checkError')}
              </p>
            ) : null}
          </div>
        )}
      </div>
    )
  }

  return (
    <section className="mt-6 rounded-xl border border-border bg-surface p-5 shadow-sm">
      <h2 className="text-lg font-bold text-text">{t('daily.title')}</h2>
      <p className="mb-4 mt-1 text-sm text-text/70">{t('daily.subtitle')}</p>
      {body}
    </section>
  )
}