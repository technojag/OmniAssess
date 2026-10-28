import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import SummaryGate from '../components/result/SummaryGate'
import { accuracyPercent, formatNumber } from '../lib/result'
import '../i18n/result'

export default function ResultSummaryPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation()

  return (
    <SummaryGate id={id}>
      {(s) => {
        // Each tile has a colour AND a text label
        const tiles = [
          { key: 'attempted', value: s.attempted, bar: 'border-l-blue-600' },
          { key: 'correct', value: s.correct, bar: 'border-l-green-600' },
          { key: 'wrong', value: s.wrong, bar: 'border-l-red-600' },
          { key: 'unattempted', value: s.unattempted, bar: 'border-l-gray-400' },
        ]
        return (
          <>
            <h1 className="text-2xl font-bold text-text sm:text-3xl">{t('result.title')}</h1>

            {s.attempt.status === 'TERMINATED' ? (
              <p role="note" className="mt-4 rounded-md border border-red-600 px-3 py-2 text-sm text-red-600">
                {t('result.terminated')}
              </p>
            ) : null}

            <div className="mt-6 rounded-xl border border-border bg-surface p-6 text-center shadow-sm">
              <p className="text-sm font-semibold text-text/70">{t('result.score')}</p>
              <p className="mt-1 text-4xl font-bold text-text sm:text-5xl">
                {t('result.scoreOf', { score: formatNumber(s.score), max: formatNumber(s.maxScore) })}
              </p>
              <p className="mt-3 text-text">
                {t('result.accuracy')}: <span className="font-semibold">{accuracyPercent(s.correct, s.attempted)}%</span>
              </p>
              <p className="text-sm text-text/70">{t('result.accuracyNote')}</p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {tiles.map((tile) => (
                <div key={tile.key} className={'rounded-lg border border-border border-l-4 bg-surface p-4 ' + tile.bar}>
                  <p className="text-2xl font-bold text-text">{tile.value}</p>
                  <p className="text-sm text-text/80">{t('result.' + tile.key)}</p>
                </div>
              ))}
            </div>

            <h2 className="mb-2 mt-8 text-lg font-bold text-text">{t('result.sectionwise')}</h2>
            <div className="overflow-x-auto rounded-xl border border-border bg-surface">
              <table className="w-full min-w-[26rem] text-left text-sm text-text">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 font-semibold">{t('result.colSection')}</th>
                    <th className="px-4 py-3 font-semibold">{t('result.attempted')}</th>
                    <th className="px-4 py-3 font-semibold">{t('result.correct')}</th>
                    <th className="px-4 py-3 font-semibold">{t('result.wrong')}</th>
                  </tr>
                </thead>
                <tbody>
                  {s.sections.map((sec) => (
                    <tr key={sec.position} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">{sec.name}</td>
                      <td className="px-4 py-3">
                        {sec.attempted} / {sec.questionCount}
                      </td>
                      <td className="px-4 py-3">{sec.correct}</td>
                      <td className="px-4 py-3">{sec.wrong}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to={'/attempts/' + id + '/analysis'}
                className="rounded-md bg-brand px-8 py-3 text-center font-semibold text-white hover:bg-brand-hover"
              >
                {t('result.continue')}
              </Link>
              <Link
                to="/dashboard"
                className="rounded-md border border-border px-6 py-3 text-center font-semibold text-text hover:bg-brand-soft"
              >
                {t('result.dashboard')}
              </Link>
            </div>
          </>
        )
      }}
    </SummaryGate>
  )
}