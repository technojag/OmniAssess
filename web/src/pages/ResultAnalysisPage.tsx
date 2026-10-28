import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import SummaryGate from '../components/result/SummaryGate'
import { formatNumber } from '../lib/result'
import '../i18n/result'

function Bar({ correct, wrong, unattempted }: { correct: number; wrong: number; unattempted: number }) {
  const total = correct + wrong + unattempted
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0)
  return (
    <div className="flex h-3 overflow-hidden rounded-full bg-border" aria-hidden="true">
      <div className="bg-green-600" style={{ width: pct(correct) + '%' }} />
      <div className="bg-red-600" style={{ width: pct(wrong) + '%' }} />
      <div className="bg-gray-400" style={{ width: pct(unattempted) + '%' }} />
    </div>
  )
}

export default function ResultAnalysisPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation()

  return (
    <SummaryGate id={id}>
      {(s) => (
        <>
          <h1 className="text-2xl font-bold text-text sm:text-3xl">{t('analysis.title')}</h1>
          <p className="mt-1 text-text/70">{t('analysis.subtitle')}</p>

          <div className="mt-6 space-y-4">
            {s.sections.map((sec) => (
              <section key={sec.position} className="rounded-xl border border-border bg-surface p-5 shadow-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-bold text-text">{sec.name}</h2>
                  <p className="text-sm text-text/70">{t('analysis.questionsN', { n: sec.questionCount })}</p>
                </div>
                {typeof sec.score === 'number' && typeof sec.maxScore === 'number' ? (
                  <p className="mt-1 text-sm font-semibold text-text">
                    {t('analysis.marks', { score: formatNumber(sec.score), max: formatNumber(sec.maxScore) })}
                  </p>
                ) : null}

                <div className="mt-3">
                  <Bar correct={sec.correct} wrong={sec.wrong} unattempted={sec.unattempted} />
                </div>
                <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-text">
                  <li>
                    <span aria-hidden="true" className="mr-1.5 inline-block h-3 w-3 rounded-sm bg-green-600" />
                    {t('result.correct')}: <span className="font-semibold">{sec.correct}</span>
                  </li>
                  <li>
                    <span aria-hidden="true" className="mr-1.5 inline-block h-3 w-3 rounded-sm bg-red-600" />
                    {t('result.wrong')}: <span className="font-semibold">{sec.wrong}</span>
                  </li>
                  <li>
                    <span aria-hidden="true" className="mr-1.5 inline-block h-3 w-3 rounded-sm bg-gray-400" />
                    {t('result.unattempted')}: <span className="font-semibold">{sec.unattempted}</span>
                  </li>
                </ul>
              </section>
            ))}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {(['compare', 'strongWeak'] as const).map((key) => (
              <div key={key} className="rounded-xl border border-dashed border-border p-5">
                <h3 className="font-semibold text-text">{t('analysis.' + key)}</h3>
                <p className="mt-1 text-sm text-text/70">{t('analysis.soon')}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to={'/attempts/' + id + '/review'}
              className="rounded-md bg-brand px-8 py-3 text-center font-semibold text-white hover:bg-brand-hover"
            >
              {t('analysis.review')}
            </Link>
            <Link
              to={'/attempts/' + id + '/result'}
              className="rounded-md border border-border px-6 py-3 text-center font-semibold text-text hover:bg-brand-soft"
            >
              {t('analysis.back')}
            </Link>
          </div>
        </>
      )}
    </SummaryGate>
  )
}