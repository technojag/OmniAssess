import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageMenu from './LanguageMenu'
import Logo from './Logo'
import Search from './Search'
import ThemeMenu from './ThemeMenu'

const LINKS = [
  ['exams', '/#exams'],
  ['practice', '/#practice'],
  ['results', '/#results'],
  ['how', '/#how-it-works'],
] as const

export default function Header() {
  const { t } = useTranslation()
  return (
    <header className="border-b border-border bg-surface">
      <div className="flex items-center gap-6 px-6 py-2.5">
        <Link to="/" aria-label={t('header.home')}>
          <Logo height={48} />
        </Link>

        {/* flex-1 + justify-center puts the links in the middle of the space between the logo and the buttons */}
        <nav aria-label={t('header.mainNav')} className="hidden flex-1 justify-center gap-7 md:flex">
          {LINKS.map(([key, href]) => (
            <a key={key} href={href} className="whitespace-nowrap font-semibold text-text hover:text-link">
              {t(`nav.${key}`)}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2.5 md:ml-0">
          <Search />
          <LanguageMenu />
          <a href="#login" className="hidden rounded-md border border-brand px-4 py-2 font-semibold text-link hover:bg-brand-soft sm:inline-block">
            {t('header.logIn')}
          </a>
          <a href="#start" className="hidden whitespace-nowrap rounded-md bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-hover sm:inline-block">
            {t('header.getStarted')}
          </a>
          <ThemeMenu />
        </div>
      </div>
    </header>
  )
}