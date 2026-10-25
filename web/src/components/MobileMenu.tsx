import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/context'
import { useDismiss } from '../hooks/useDismiss'
import { setLanguage, type Lang } from '../i18n'

const LINKS = [
  ['exams', '/#exams'],
  ['practice', '/#practice'],
  ['results', '/#results'],
  ['how', '/#how-it-works'],
] as const

const LANGS: { value: Lang; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी' },
]

// Shown only on phones and small tablets (hidden from the "md" size up)
export default function MobileMenu() {
  const { t, i18n } = useTranslation()
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(open, () => setOpen(false), ref)

  const close = () => setOpen(false)

  async function onLogout() {
    close()
    await logout()
    navigate('/', { replace: true })
  }

  const outlineBtn = 'rounded-lg border border-brand py-3 text-center font-semibold text-link hover:bg-brand-soft'
  const solidBtn = 'rounded-lg bg-brand py-3 text-center font-semibold text-white hover:bg-brand-hover'

  return (
    <div ref={ref} className="md:hidden">
      <button
        type="button"
        aria-label={open ? t('header.closeMenu') : t('header.menu')}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-surface text-text hover:bg-brand-soft"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-20 border-b border-border bg-surface shadow-lg">
          <nav aria-label={t('header.mainNav')}>
            {LINKS.map(([key, href]) => (
              <a
                key={key}
                href={href}
                onClick={close}
                className="block border-b border-border px-6 py-3.5 font-semibold text-text hover:bg-brand-soft"
              >
                {t('nav.' + key)}
              </a>
            ))}
          </nav>
          <div className="px-6 py-4">
            <p className="mb-2 text-xs font-semibold uppercase text-muted">{t('header.language')}</p>
            <div className="flex overflow-hidden rounded-lg border border-border">
              {LANGS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setLanguage(l.value)}
                  aria-pressed={i18n.language === l.value}
                  className={
                    'flex-1 py-2.5 text-sm font-semibold ' +
                    (i18n.language === l.value ? 'bg-brand-soft text-link' : 'text-text')
                  }
                >
                  {l.label}
                  {i18n.language === l.value && ' ✓'}
                </button>
              ))}
            </div>

            {loading ? null : user ? (
              <div className="mt-4 grid gap-2.5">
                <Link to="/dashboard" onClick={close} className={solidBtn}>
                  {t('auth.menu.dashboard')}
                </Link>
                <Link to="/onboarding" onClick={close} className={outlineBtn}>
                  {t('auth.menu.profile')}
                </Link>
                <button type="button" onClick={onLogout} className={outlineBtn}>
                  {t('auth.menu.logout')}
                </button>
              </div>
            ) : (
              <div className="mt-4 grid gap-2.5">
                <Link to="/login" onClick={close} className={outlineBtn}>
                  {t('header.logIn')}
                </Link>
                <Link to="/signup" onClick={close} className={solidBtn}>
                  {t('header.getStarted')}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}