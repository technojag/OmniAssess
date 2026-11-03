import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api'
import { formatNumber } from '../../lib/result'
import '../../i18n/compare'

type Snapshot = {
  score: number
  maxScore: number
  attempted: number
  correct: number
  wrong: number
  unattempted: number
  total: number
}

type SectionCounts = {
  correct: number
  wrong: number
  unattempted: number
  questionCount: number
}

type Compare = {
  hasPrevious: boolean
  previousAt: string | null
  current: Snapshot
  previous: Snapshot | null
  sections: {
    position: number
    name: string
    current: SectionCounts | null
    previous: SectionCounts | null
  }[]
}

// Which direction is an improvement: more (up), fewer (down), or neither (none)
type Better = 'up' | 'down' | 'none'

// A change is always shown with an arrow and a word, never colour alone
function Change({ delta, better }: { delta: number; better: Better }) {
  const { t } = useTranslation()
  const d = Math.round(delta * 100) / 100
  let tone = 'text-text/70'
  if (d !== 0) {
    if (better === 'none') tone = 'text-text'
    else tone = (better === 'up') === (d > 0) ? 'text-green-600' : 'text-red-600'
  }
  const label = d === 0 ? t('cmp.same') : d > 0 ? t('cmp.up', { n: formatNumber(d) }) : t('cmp.down', { n: formatNumber(-d) })
  return <span className={'font-semibold ' + tone}>{label}</span>
}

const th = 'px-2 py-2 text-left text-xs font-semibold uppercase text-text/70'
const td = 'px-2 py-2 text-text'

export default function CompareCard({ id }: { id: string }) {
  const { t, i18n } = useTranslation()
  const [data, setData] = useState<Compare | null>(null)
  const [failed, setFailed] = useState(false)
  const [tries, setTries] = useState(0)

  useEffect(() => {
    let cancelled = false
    api<Compare>('/attempts/' + id + '/compare')
      .then((d) => {
        if (!cancelled) setData(d)
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
    setData(null)
    setTries((n) => n + 1)
  }

  const locale = i18n.language.startsWith('hi') ? 'hi-IN' : 'en-IN'

  let body
  if (failed) {
    body = (
      <div role="alert">
        <p className="text-red-600">{t('cmp.error')}</p>
        <button
          type="button"
          onClick={retry}
          className="mt-3 rounded-md border border-border px-4 py-2 font-semibold text-text hover:bg-brand-soft"
        >
          {t('cmp.retry')}
        </button>
      </div>
    )
  } else if (!data) {
    body = (
      <p role="status" className="text-text/70">
        {t('cmp.loading')}
      </p>
    )
  } else if (!data.hasPrevious || !data.previous) {
    body = <p className="text-text/80">{t('cmp.first')}</p>
  } else {
    const c = data.current
    const p = data.previous
    const scoreDelta = Math.round((c.score - p.score) * 100) / 100

    const rows: { key: string; label: string; cur: string; prev: string; delta: number; better: Better }[] = [
      {
        key: 'score',
        label: t('cmp.score'),
        cur: formatNumber(c.score) + ' / ' + formatNumber(c.maxScore),
        prev: formatNumber(p.score) + ' / ' + formatNumber(p.maxScore),
        delta: c.score - p.score,
        better: 'up',
      },
      { key: 'correct', label: t('cmp.correct'), cur: String(c.correct), prev: String(p.correct), delta: c.correct - p.correct, better: 'up' },
      { key: 'wrong', label: t('cmp.wrong'), cur: String(c.wrong), prev: String(p.wrong), delta: c.wrong - p.wrong, better: 'down' },
      { key: 'attempted', label: t('cmp.attempted'), cur: String(c.attempted), prev: String(p.attempted), delta: c.attempted - p.attempted, better: 'none' },
      { key: 'skipped', label: t('cmp.skipped'), cur: String(c.unattempted), prev: String(p.unattempted), delta: c.unattempted - p.unattempted, better: 'none' },
    ]

    const when = data.previousAt
      ? new Date(data.previousAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })
      : ''

    body = (
      <div>
        <p
          className={
            'font-semibold ' + (scoreDelta > 0 ? 'text-green-600' : scoreDelta < 0 ? 'text-red-600' : 'text-text')
          }
        >
          {scoreDelta > 0
            ? '▲ ' + t('cmp.headUp', { n: formatNumber(scoreDelta) })
            : scoreDelta < 0
              ? '▼ ' + t('cmp.headDown', { n: formatNumber(-scoreDelta) })
              : '= ' + t('cmp.headSame')}
        </p>
        {when ? <p className="mt-1 text-sm text-text/70">{t('cmp.vs', { date: when })}</p> : null}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[26rem] text-sm">
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className={th}>
                  {t('cmp.colMeasure')}
                </th>
                <th scope="col" className={th}>
                  {t('cmp.colLast')}
                </th>
                <th scope="col" className={th}>
                  {t('cmp.colThis')}
                </th>
                <th scope="col" className={th}>
                  {t('cmp.colChange')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.key}>
                  <th scope="row" className={td + ' text-left font-semibold'}>
                    {r.label}
                  </th>
                  <td className={td}>{r.prev}</td>
                  <td className={td + ' font-semibold'}>{r.cur}</td>
                  <td className={td}>
                    <Change delta={r.delta} better={r.better} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="mb-2 mt-6 font-semibold text-text">{t('cmp.sectionsTitle')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[26rem] text-sm">
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className={th}>
                  {t('cmp.colSection')}
                </th>
                <th scope="col" className={th}>
                  {t('cmp.colLast')}
                </th>
                <th scope="col" className={th}>
                  {t('cmp.colThis')}
                </th>
                <th scope="col" className={th}>
                  {t('cmp.colChange')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.sections.map((s) => (
                <tr key={s.position}>
                  <th scope="row" className={td + ' text-left font-semibold'}>
                    {s.name}
                  </th>
                  <td className={td}>{s.previous ? s.previous.correct + ' / ' + s.previous.questionCount : '—'}</td>
                  <td className={td + ' font-semibold'}>
                    {s.current ? s.current.correct + ' / ' + s.current.questionCount : '—'}
                  </td>
                  <td className={td}>
                    {s.current && s.previous ? (
                      <Change delta={s.current.correct - s.previous.correct} better="up" />
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <section className="min-w-0 rounded-xl border border-border bg-surface p-5 shadow-sm md:col-span-2">
      <h2 className="mb-3 font-bold text-text">{t('cmp.title')}</h2>
      {body}
    </section>
  )
}