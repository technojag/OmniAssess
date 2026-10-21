import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDismiss } from '../hooks/useDismiss'
import { setLanguage, type Lang } from '../i18n'

const OPTIONS: { value: Lang; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी' },
]

export default function LanguageMenu() {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(open, () => setOpen(false), ref)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={t('header.language')}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 items-center gap-1 rounded-lg border border-border bg-surface px-3 text-text hover:bg-brand-soft"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m5 8 6 6" />
          <path d="m4 14 6-6 2-3" />
          <path d="M2 5h12" />
          <path d="M7 2h1" />
          <path d="m22 22-5-10-5 10" />
          <path d="M14 18h6" />
        </svg>
        <span aria-hidden="true" className="text-[11px]">▾</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-20 mt-2 w-40 rounded-lg border border-border bg-surface p-1.5 shadow-lg">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              role="menuitemradio"
              aria-checked={i18n.language === o.value}
              onClick={() => {
                setLanguage(o.value)
                setOpen(false)
              }}
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-brand-soft ${
                i18n.language === o.value ? 'font-semibold text-link' : 'text-text'
              }`}
            >
              {o.label}
              {i18n.language === o.value && <span aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}