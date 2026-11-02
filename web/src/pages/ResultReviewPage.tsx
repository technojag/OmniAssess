import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Header from '../components/Header'
import { api } from '../lib/api'
import type { Timing } from '../lib/analysis'
import { outcomeOf } from '../lib/result'
import type { Outcome, Review, ReviewQuestion } from '../lib/result'
import '../i18n/result'
import '../i18n/review'
import '../i18n/revision'

type Filter = 'all' | 'wrong' | 'skipped' | 'marked'

type Item = {
  key: string
  sectionName: string
  sectionCode: string
  q: ReviewQuestion
  outcome: Outcome
  seconds: number | null // null when the timing could not be loaded
}

// Colour AND text, so the meaning never depends on colour alone
const BADGE: Record<Outcome, string> = {
  correct: 'bg-green-600 text-white',
  wrong: 'bg-red-600 text-white',
  unattempted: 'bg-gray-500 text-white',
}
const TEXT: Record<Outcome, string> = {
  correct: 'text-green-600',
  wrong: 'text-red-600',
  unattempted: 'text-text/70',
}
const LABEL: Record<Outcome, string> = {
  correct: 'review.correct',
  wrong: 'review.wrong',
  unattempted: 'review.skipped',
}

// "General Awareness" becomes "GA"
function code(name: string) {
  const letters = name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .map((w) => w[0].toUpperCase())
    .join('')
    .slice(0, 3)
  return letters || name.slice(0, 3)
}

function clock(seconds: number) {
  const total = Math.max(0, Math.round(seconds))
  const m = String(Math.floor(total / 60)).padStart(2, '0')
  const s = String(total % 60).padStart(2, '0')
  return m + ':' + s
}

function build(review: Review, timing: Timing | null): Item[] {
  const items: Item[] = []
  for (const sec of review.sections) {
    const timed = timing?.sections.find((s) => s.position === sec.position)
    for (const q of sec.questions) {
      items.push({
        key: sec.position + '-' + q.position,
        sectionName: sec.name,
        sectionCode: code(sec.name),
        q,
        outcome: outcomeOf(q),
        seconds: timed ? (timed.questions.find((x) => x.position === q.position)?.seconds ?? 0) : null,
      })
    }
  }
  return items
}

function matches(i: Item, f: Filter) {
  if (f === 'wrong') return i.outcome === 'wrong'
  if (f === 'skipped') return i.outcome === 'unattempted'
  if (f === 'marked') return i.q.markedForReview
  return true
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'review.filterAll' },
  { id: 'wrong', label: 'review.filterWrong' },
  { id: 'skipped', label: 'review.filterSkipped' },
  { id: 'marked', label: 'review.filterMarked' },
]

const smallBtn = 'rounded-md border border-border px-5 py-2.5 font-semibold text-text hover:bg-brand-soft disabled:opacity-50'

export default function ResultReviewPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation()

  const [items, setItems] = useState<Item[] | null>(null)
  const [listIds, setListIds] = useState<Set<string>>(() => new Set()) // questions already in the revision list
  const [failed, setFailed] = useState(false)
  const [tries, setTries] = useState(0)
  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([
      api<Review>('/attempts/' + id + '/review'),
      api<Timing>('/attempts/' + id + '/timing').catch(() => null), // the page still works without times
      api<{ items: { questionId: string }[] }>('/revision').catch(() => null),
    ])
      .then(([review, timing, list]) => {
        if (cancelled) return
        setItems(build(review, timing))
        setListIds(new Set(list ? list.items.map((i) => i.questionId) : []))
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
    setItems(null)
    setTries((n) => n + 1)
  }

  async function toggleSaved(questionId: string) {
    if (busy) return
    setBusy(true)
    setNote('')
    try {
      if (listIds.has(questionId)) {
        await api('/revision/' + questionId, { method: 'DELETE' })
        setListIds((prev) => {
          const next = new Set(prev)
          next.delete(questionId)
          return next
        })
      } else {
        await api('/revision', { method: 'POST', body: { attemptId: id, questionId } })
        setListIds((prev) => new Set(prev).add(questionId))
      }
    } catch {
      setNote(t('rev.fail'))
    } finally {
      setBusy(false)
    }
  }

  async function addAllWrong() {
    if (busy) return
    setBusy(true)
    setNote('')
    try {
      const r = await api<{ added: number; total: number }>('/revision/mistakes', {
        method: 'POST',
        body: { attemptId: id, includeSkipped: false },
      })
      const list = await api<{ items: { questionId: string }[] }>('/revision')
      setListIds(new Set(list.items.map((i) => i.questionId)))
      setNote(r.added > 0 ? t('rev.addedN', { n: r.added }) : t('rev.nothingToAdd'))
    } catch {
      setNote(t('rev.fail'))
    } finally {
      setBusy(false)
    }
  }

  const filtered = items ? items.filter((i) => matches(i, filter)) : []
  const current = filtered.find((i) => i.key === selected) ?? filtered[0]
  const pos = current ? filtered.indexOf(current) : -1
  const count = (f: Filter) => (items ? items.filter((i) => matches(i, f)).length : 0)
  const saved = current ? listIds.has(current.q.questionId) : false

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-10">
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
        ) : !items ? (
          <p role="status" className="mt-6 text-text/70">
            {t('review.loading')}
          </p>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={filter === f.id}
                  onClick={() => setFilter(f.id)}
                  className={
                    'rounded-full border px-3 py-1 text-sm font-semibold ' +
                    (filter === f.id ? 'border-brand bg-brand text-white' : 'border-border text-text hover:bg-brand-soft')
                  }
                >
                  {t(f.label)} {count(f.id)}
                </button>
              ))}
              <span className="flex-1" />
              <button type="button" disabled={busy} onClick={() => void addAllWrong()} className={smallBtn + ' !px-4 !py-1.5 text-sm'}>
                {t('rev.addAllWrong')}
              </button>
            </div>

            {note ? (
              <p role="status" className="mt-3 rounded-md bg-brand-soft px-3 py-2 text-sm text-text">
                {note}{' '}
                <Link to="/revision" className="font-semibold text-link hover:underline">
                  {t('rev.openList', { n: listIds.size })}
                </Link>
              </p>
            ) : null}

            {!current ? (
              <p className="mt-6 rounded-xl border border-dashed border-border p-5 text-text/80">{t('review.empty')}</p>
            ) : (
              <div className="mt-4 grid gap-4 lg:grid-cols-[16rem_1fr]">
                <nav aria-label={t('review.listLabel')} className="min-w-0">
                  <ul className="max-h-56 divide-y divide-border overflow-y-auto rounded-xl border border-border bg-surface lg:max-h-[32rem]">
                    {filtered.map((i) => (
                      <li key={i.key}>
                        <button
                          type="button"
                          onClick={() => setSelected(i.key)}
                          aria-current={i.key === current.key ? 'true' : undefined}
                          className={
                            'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm ' +
                            (i.key === current.key ? 'bg-brand-soft' : 'hover:bg-brand-soft')
                          }
                        >
                          <span className="text-text">
                            {i.sectionCode} · Q{i.q.position}
                          </span>
                          <span className={'text-right font-semibold ' + TEXT[i.outcome]}>
                            {t(LABEL[i.outcome])}
                            {i.q.markedForReview ? ', ' + t('review.markedShort') : ''}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </nav>

                <article className="min-w-0 rounded-xl border border-border bg-surface p-5 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={'rounded-full px-3 py-0.5 text-xs font-semibold ' + BADGE[current.outcome]}>
                      {t(LABEL[current.outcome])}
                    </span>
                    {current.q.markedForReview ? (
                      <span className="rounded-full bg-purple-600 px-3 py-0.5 text-xs font-semibold text-white">
                        {t('review.marked')}
                      </span>
                    ) : null}
                    {current.seconds !== null ? (
                      <span className="rounded-full border border-border px-3 py-0.5 text-xs font-semibold text-text">
                        {t('review.time', { t: clock(current.seconds) })}
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-3 text-sm text-text/70">
                    {t('review.questionOfSection', { section: current.sectionName, n: current.q.position })}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-lg font-semibold text-text">{current.q.stem}</p>

                  <ul className="mt-4 space-y-2">
                    {current.q.options.map((o, idx) => {
                      const isCorrect = o.id === current.q.correctOptionId
                      const isPicked = o.id === current.q.selectedOptionId
                      const border = isCorrect
                        ? 'border-green-600 bg-green-600/10'
                        : isPicked
                          ? 'border-red-600 bg-red-600/10'
                          : 'border-border'
                      return (
                        <li
                          key={o.id}
                          className={'flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-text ' + border}
                        >
                          <span>
                            <span className="mr-2 font-semibold">{String.fromCharCode(65 + idx)}.</span>
                            {o.text}
                          </span>
                          {isPicked || isCorrect ? (
                            <span className={'text-sm font-semibold ' + (isCorrect ? 'text-green-600' : 'text-red-600')}>
                              {isPicked ? t('review.yourAnswer') : ''}
                              {isPicked && isCorrect ? ' · ' : ''}
                              {isCorrect ? t('review.correctAnswer') : ''}
                            </span>
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>

                  {current.q.correctOptionId === null ? (
                    <p className="mt-3 text-sm text-text/70">{t('review.noKey')}</p>
                  ) : null}

                  {current.q.explanation ? (
                    <p className="mt-4 whitespace-pre-wrap text-text">
                      <span className="font-bold">{t('review.solution')}. </span>
                      {current.q.explanation}
                    </p>
                  ) : (
                    <p className="mt-4 text-text/70">
                      <span className="font-bold">{t('review.solution')}. </span>
                      {t('review.noSolution')}
                    </p>
                  )}

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={pos <= 0}
                      onClick={() => setSelected(filtered[pos - 1].key)}
                      className={smallBtn}
                    >
                      {t('review.prev')}
                    </button>
                    <button
                      type="button"
                      disabled={pos >= filtered.length - 1}
                      onClick={() => setSelected(filtered[pos + 1].key)}
                      className={smallBtn}
                    >
                      {t('review.next')}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void toggleSaved(current.q.questionId)}
                      className={
                        saved
                          ? smallBtn
                          : 'rounded-md bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-hover disabled:opacity-50'
                      }
                    >
                      {saved ? t('rev.remove') : t('rev.add')}
                    </button>
                  </div>
                </article>
              </div>
            )}

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