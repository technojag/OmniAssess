import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AnalysisBody from '../components/result/AnalysisBody'
import SummaryGate from '../components/result/SummaryGate'
import '../i18n/result'

export default function ResultAnalysisPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation()

  return (
    <SummaryGate id={id}>
      {() => (
        <>
          <h1 className="text-2xl font-bold text-text sm:text-3xl">{t('analysis.title')}</h1>
          <div className="mt-6">
            <AnalysisBody id={id} />
          </div>
        </>
      )}
    </SummaryGate>
  )
}