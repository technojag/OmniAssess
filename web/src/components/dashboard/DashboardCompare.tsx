import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api'
import { formatNumber } from '../../lib/result'
import '../../i18n/compare'
import '../../i18n/dashCompare'

type Snapshot = {
  score: number
  maxScore: number
  correct: number
  wrong: number
}

type Compare = {
  hasPrevious: boolean
  previousAt: string | null
  current: Snapshot
  previous: Snapshot | null
}

// Which direction is an improvement: more (up) or fewer (down)
type Better = 'up' | 'down'

// A change is always shown with an arrow and a word, never colour alone
function Change({ delta, better }: { delta: number; better: Better }) {
  const { t } = useTranslation()
  const d = Math.round(delta * 100) / 100
  let tone = 'text-text/70'
  if (d !== 0) tone = (better === 'up') === (d > 0) ? 'text-green-600' : 'text-red-600'
  const label =
    d === 0 ? t('cmp.same') : d > 0 ? t('cmp.up', { n: formatNumber(d) }) : t('cmp.down', { n: formatNumber(-d) })
  return <span className={'font-semibold ' + tone}>{label}</span>
}

const th = 'px-2 py-2 text-left text-xs font-semibold uppercase text-text/70'
const td = 'px-2 py-2 text-text'

export default function DashboardCompare({
  attemptId,
  examName,
}: {
  attemptId: string | null
  examName: string
}) {
  const { t, i18n } = useTranslation()
  const [data, setData] = useState<Compare | null>(null)
  const [failed, setFailed] = useState(false)
  const [tries, setTries] = useState(0)

  useEffect(() => {
    if (attemptId === null) return
    let cancelled = false
    api<Compare>('/attempts/' + attemptId + '/compare')
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [attemptId, tries])

  function retry() {
    setFailed(false)
    setData(null)
    setTries((n) => n + 1)
  }

  const locale = i18n.language.startsWith('hi') ? 'hi-IN' : 'en-IN'

  let body
  if (attemptId === null) {
    body = <p className="text-text/80">{t('dcmp.empty')}</p>
  } else if (failed) {
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
    const when = data.previousAt
      ? new Date(data.previousAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })
      : ''

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
    ]

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

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[18rem] text-sm">
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
      </div>
    )
  }

  return (
    <article className="min-w-0 rounded-xl border border-border bg-surface p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase text-link">{examName}</p>
      <h3 className="mb-3 mt-1 text-lg font-bold text-text">{t('cmp.title')}</h3>
      {body}
      {attemptId !== null ? (
        <Link
          to={'/attempts/' + attemptId + '/analysis'}
          className="mt-4 inline-block rounded-md border border-border px-4 py-2 font-semibold text-link hover:bg-brand-soft"
        >
          {t('dcmp.seeAnalysis')} →
        </Link>
      ) : null}
    </article>
  )
}