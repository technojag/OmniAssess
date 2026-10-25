import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/context'
import Header from '../components/Header'

export default function DashboardPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const name = user?.fullName.split(' ')[0] ?? ''
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold text-text sm:text-3xl">{t('dash.welcome', { name })}</h1>
        <p className="mt-2 text-text/70">{t('dash.soon')}</p>
      </main>
    </>
  )
}