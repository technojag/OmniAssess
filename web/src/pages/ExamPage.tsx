import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Header from '../components/Header'
import { EXAMS } from '../data/exams'

export default function ExamPage() {
  const { slug } = useParams()
  const { t, i18n } = useTranslation()
  const exam = EXAMS.find((e) => e.slug === slug)
  const lang = i18n.language === 'hi' ? 'hi' : 'en'

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold text-brand-deep">{exam ? exam.name[lang] : t('exam.notFound')}</h1>
        <p className="mt-3 text-muted">{t('exam.soon')}</p>
      </main>
    </>
  )
}