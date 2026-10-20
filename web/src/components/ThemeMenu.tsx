import { useEffect, useRef, useState } from 'react'
import { applyPref, getPref, type ThemePref } from '../theme'

const OPTIONS: { value: ThemePref; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

export default function ThemeMenu() {
  const [open, setOpen] = useState(false)
  const [pref, setPref] = useState<ThemePref>(getPref())
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function choose(p: ThemePref) {
    setPref(p)
    applyPref(p)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Change theme"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-text hover:bg-brand-soft"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <circle cx="9" cy="9" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M9 1.5a7.5 7.5 0 0 1 0 15z" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-10 mt-2 w-40 rounded-lg border border-border bg-surface p-1.5 shadow-lg">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              role="menuitemradio"
              aria-checked={pref === o.value}
              onClick={() => choose(o.value)}
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-brand-soft ${
                pref === o.value ? 'font-semibold text-link' : 'text-text'
              }`}
            >
              {o.label}
              {pref === o.value && <span aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}