import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/context'
import LanguageMenu from './LanguageMenu'
import Logo from './Logo'
import MobileMenu from './MobileMenu'
import Search from './Search'
import ThemeMenu from './ThemeMenu'
import UserMenu from './UserMenu'

const LINKS = [
  ['exams', '/#exams'],
  ['practice', '/#practice'],
  ['results', '/#results'],
  ['how', '/#how-it-works'],
] as const

export default function Header() {
  const { t } = useTranslation()
  const { user, loading } = useAuth()
  return (
    <header className="relative border-b border-border bg-surface">
      <div className="flex items-center gap-3 px-4 py-2.5 sm:gap-6 sm:px-6">
        <Link to="/" aria-label={t('header.home')}>
          <span className="sm:hidden">
            <Logo height={40} />
          </span>
          <span className="hidden sm:inline">
            <Logo height={48} />
          </span>
        </Link>

        {/* flex-1 + justify-center keeps the links in the middle between the logo and the buttons */}
        <nav aria-label={t('header.mainNav')} className="hidden flex-1 justify-center gap-7 md:flex">
          {LINKS.map(([key, href]) => (
            <a key={key} href={href} className="whitespace-nowrap font-semibold text-text hover:text-link">
              {t('nav.' + key)}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-2.5 md:ml-0">
          <Search />
          <div className="hidden md:block">
            <LanguageMenu />
          </div>
          {!loading && !user ? (
            <>
              <Link
                to="/login"
                className="hidden rounded-md border border-brand px-4 py-2 font-semibold text-link hover:bg-brand-soft md:inline-block"
              >
                {t('header.logIn')}
              </Link>
              <Link
                to="/signup"
                className="hidden whitespace-nowrap rounded-md bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-hover md:inline-block"
              >
                {t('header.getStarted')}
              </Link>
            </>
          ) : null}
          {user ? <UserMenu /> : null}
          <ThemeMenu />
          <MobileMenu />
        </div>
      </div>
    </header>
  )
}