import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api'
import '../../i18n/activity'

type Day = {
  date: string
  exams: number
  dailyAnswered: number
  dailyComplete: boolean
  active: boolean
}

type Activity = {
  today: string
  dailyTarget: number
  days: Day[]
  stats: {
    currentStreak: number
    longestStreak: number
    totalActiveDays: number
    last7: number
    prev7: number
    growthPercent: number | null
  }
}

function cellStyle(d: Day): string {
  if (d.active) return 'border-brand bg-brand'
  if (d.dailyAnswered > 0) return 'border-brand bg-brand-soft'
  return 'border-border bg-surface'
}

export default function ActivityGrid({ refreshKey = 0 }: { refreshKey?: number }) {
  const { t, i18n } = useTranslation()
  const [data, setData] = useState<Activity | null>(null)
  const [failed, setFailed] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api<Activity>('/activity')
      .then((d) => {
        if (!cancelled) {
          setData(d)
          setFailed(false)
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  function retry() {
    setFailed(false)
    setData(null)
    api<Activity>('/activity')
      .then(setData)
      .catch(() => setFailed(true))
  }

  const locale = i18n.language.startsWith('hi') ? 'hi-IN' : 'en-IN'
  const dayText = (key: string) =>
    new Date(key + 'T00:00:00Z').toLocaleDateString(locale, { dateStyle: 'medium', timeZone: 'UTC' })
  const daysText = (n: number) => (n === 1 ? t('act.day1') : t('act.days', { n }))

  let body
  if (data) {
    const { stats, days } = data
    const sel = days.find((d) => d.date === (selected ?? data.today)) ?? days[days.length - 1]

    // Weeks run top to bottom, Sunday first. Empty squares pad the first week.
    const pad = new Date(days[0].date + 'T00:00:00Z').getUTCDay()
    const cells: (Day | null)[] = [...Array.from({ length: pad }, () => null), ...days]

    let growth
    if (stats.growthPercent === null) {
      growth = (
        <span className="text-text/70">{stats.last7 > 0 ? t('act.growthNew') : t('act.growthNone')}</span>
      )
    } else if (stats.growthPercent > 0) {
      growth = <span className="font-semibold text-green-600">{t('act.growthUp', { n: stats.growthPercent })}</span>
    } else if (stats.growthPercent < 0) {
      growth = (
        <span className="font-semibold text-red-600">
          {t('act.growthDown', { n: Math.abs(stats.growthPercent) })}
        </span>
      )
    } else {
      growth = <span className="text-text/70">{t('act.growthSame')}</span>
    }

    const status = sel.active ? t('act.statusActive') : sel.dailyAnswered > 0 ? t('act.statusPartial') : t('act.statusNone')

    body = (
      <div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs font-semibold uppercase text-text/70">{t('act.currentStreak')}</p>
            <p className="mt-1 text-xl font-bold text-text">{daysText(stats.currentStreak)}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs font-semibold uppercase text-text/70">{t('act.longestStreak')}</p>
            <p className="mt-1 text-xl font-bold text-text">{daysText(stats.longestStreak)}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs font-semibold uppercase text-text/70">{t('act.thisWeek')}</p>
            <p className="mt-1 text-xl font-bold text-text">{t('act.activeOf7', { n: stats.last7 })}</p>
            <p className="mt-1 text-sm">{growth}</p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto pb-2">
          <div className="grid w-max grid-flow-col grid-rows-7 gap-1">
            {cells.map((d, i) =>
              d === null ? (
                <span key={'pad' + i} className="h-4 w-4" aria-hidden="true" />
              ) : (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => setSelected(d.date)}
                  title={dayText(d.date)}
                  aria-label={
                    dayText(d.date) +
                    ': ' +
                    (d.active ? t('act.statusActive') : d.dailyAnswered > 0 ? t('act.statusPartial') : t('act.statusNone'))
                  }
                  className={
                    'h-4 w-4 rounded-sm border ' +
                    cellStyle(d) +
                    (d.date === sel.date ? ' ring-2 ring-text ring-offset-1' : '')
                  }
                />
              ),
            )}
          </div>
        </div>

        <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-text/80">
          <li className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded-sm border border-brand bg-brand" aria-hidden="true" />
            {t('act.legendActive')}
          </li>
          <li className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded-sm border border-brand bg-brand-soft" aria-hidden="true" />
            {t('act.legendPartial')}
          </li>
          <li className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded-sm border border-border bg-surface" aria-hidden="true" />
            {t('act.legendNone')}
          </li>
        </ul>

        <p className="mt-3 text-sm font-semibold text-text" role="status">
          {t('act.detail', {
            date: dayText(sel.date),
            exams: sel.exams,
            done: Math.min(sel.dailyAnswered, data.dailyTarget),
            total: data.dailyTarget,
          })}{' '}
          ({status})
        </p>
        <p className="mt-1 text-xs text-text/70">{t('act.hint')}</p>
      </div>
    )
  } else if (failed) {
    body = (
      <div role="alert">
        <p className="text-red-600">{t('act.error')}</p>
        <button
          type="button"
          onClick={retry}
          className="mt-3 rounded-md border border-border px-4 py-2 font-semibold text-text hover:bg-brand-soft"
        >
          {t('act.retry')}
        </button>
      </div>
    )
  } else {
    body = (
      <p role="status" className="text-text/70">
        {t('act.loading')}
      </p>
    )
  }

  return (
    <section className="mt-6 rounded-xl border border-border bg-surface p-5 shadow-sm">
      <h2 className="text-lg font-bold text-text">{t('act.title')}</h2>
      <p className="mb-4 mt-1 text-sm text-text/70">{t('act.subtitle')}</p>
      {body}
    </section>
  )
}