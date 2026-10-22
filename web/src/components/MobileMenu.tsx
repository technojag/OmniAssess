import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(open, () => setOpen(false), ref)

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
                onClick={() => setOpen(false)}
                className="block border-b border-border px-6 py-3.5 font-semibold text-text hover:bg-brand-soft"
              >
                {t(`nav.${key}`)}
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
                  className={`flex-1 py-2.5 text-sm font-semibold ${
                    i18n.language === l.value ? 'bg-brand-soft text-link' : 'text-text'
                  }`}
                >
                  {l.label}
                  {i18n.language === l.value && ' ✓'}
                </button>
              ))}
            </div>
            <div className="mt-4 grid gap-2.5">
              <a href="#login" className="rounded-lg border border-brand py-3 text-center font-semibold text-link hover:bg-brand-soft">
                {t('header.logIn')}
              </a>
              <a href="#start" className="rounded-lg bg-brand py-3 text-center font-semibold text-white hover:bg-brand-hover">
                {t('header.getStarted')}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}