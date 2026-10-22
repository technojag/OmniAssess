import { useTranslation } from 'react-i18next'
import icon from '../assets/omniassess-icon.png'
import wordmarkDark from '../assets/omniassess-wordmark-dark.svg'

export default function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="bg-footer px-6 py-8 text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-sm">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-white p-1">
            <img src={icon} alt="" className="h-9 w-9" />
          </span>
          <img src={wordmarkDark} alt="OmniAssess" className="h-6" />
        </div>
        <nav aria-label={t('footer.nav')} className="flex gap-6">
          <a href="#privacy" className="hover:underline">{t('footer.privacy')}</a>
          <a href="#terms" className="hover:underline">{t('footer.terms')}</a>
          <a href="#contact" className="hover:underline">{t('footer.contact')}</a>
        </nav>
        <p className="text-white/70">{t('footer.copy')}</p>
      </div>
    </footer>
  )
}