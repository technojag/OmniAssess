import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/context'

export default function UserMenu() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!user) return null
  const initial = user.fullName.trim().charAt(0).toUpperCase()
  const item = 'block w-full px-4 py-2 text-left text-text hover:bg-brand-soft'

  async function onLogout() {
    setOpen(false)
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('auth.menu.account')}
        className="flex items-center gap-2 rounded-full border border-border py-1 pl-1 pr-1 hover:bg-brand-soft md:pr-3"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand font-semibold text-white">
          {initial}
        </span>
        <span className="hidden max-w-32 truncate font-semibold text-text md:inline">
          {user.fullName.split(' ')[0]}
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-md border border-border bg-surface py-1 shadow-lg"
        >
          <Link to="/dashboard" role="menuitem" onClick={() => setOpen(false)} className={item}>
            {t('auth.menu.dashboard')}
          </Link>
          <Link to="/onboarding" role="menuitem" onClick={() => setOpen(false)} className={item}>
            {t('auth.menu.profile')}
          </Link>
          <button type="button" role="menuitem" onClick={onLogout} className={item}>
            {t('auth.menu.logout')}
          </button>
        </div>
      ) : null}
    </div>
  )
}