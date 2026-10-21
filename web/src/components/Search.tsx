import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { searchExams, type Exam } from '../data/exams'

const SearchIcon = ({ className = '' }: { className?: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)

export default function Search() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [sent, setSent] = useState(false)
  const lang = i18n.language === 'hi' ? 'hi' : 'en'
  const results = useMemo(() => searchExams(query), [query])

  function openPanel() {
    setQuery('')
    setActive(0)
    setSent(false)
    setOpen(true)
  }

  // The native <dialog> gives us Escape, a dimmed backdrop and focus handling for free
  useEffect(() => {
    const d = dialogRef.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  // "/" or Ctrl+K opens the search from anywhere, unless the user is typing in a field
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement
      const typing = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable
      if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault()
        openPanel()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  function choose(exam: Exam) {
    if (!exam.available) return
    setOpen(false)
    navigate(`/exams/${exam.slug}`)
  }

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault()
      choose(results[active])
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openPanel}
        aria-label={t('header.search')}
        aria-haspopup="dialog"
        className="flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-text hover:bg-brand-soft"
      >
        <SearchIcon />
        <span className="hidden sm:inline">{t('header.search')}</span>
      </button>

      <dialog
        ref={dialogRef}
        aria-label={t('header.search')}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === dialogRef.current) setOpen(false) // click on the dimmed area
        }}
        className="mx-auto mb-auto mt-[76px] w-[min(600px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-border bg-surface p-0 text-text shadow-2xl backdrop:bg-[#0F2233]/40"
      >
        {open && (
          <div>
            <div className="flex items-center gap-3 border-b border-border px-4">
              <SearchIcon className="text-muted" />
              <input
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setActive(0)
                  setSent(false)
                }}
                onKeyDown={onInputKey}
                placeholder={t('search.placeholder')}
                aria-label={t('search.placeholder')}
                className="h-14 flex-1 bg-transparent text-base text-text outline-none placeholder:text-muted"
              />
              <kbd className="rounded border border-border px-2 py-0.5 text-xs text-muted">Esc</kbd>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              {results.length > 0 ? (
                <>
                  <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase text-muted">{t('search.title')}</p>
                  <ul role="listbox" aria-label={t('search.title')}>
                    {results.map((e, i) => (
                      <li
                        key={e.slug}
                        role="option"
                        aria-selected={i === active}
                        aria-disabled={!e.available}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => choose(e)}
                        className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 ${
                          i === active ? 'bg-brand-soft' : ''
                        } ${e.available ? 'cursor-pointer' : 'opacity-70'}`}
                      >
                        <div>
                          <div className="font-semibold">{e.name[lang]}</div>
                          <div className="text-xs text-muted">{e.detail[lang]}</div>
                        </div>
                        <span
                          className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            e.available ? 'bg-ok/15 text-ok' : 'bg-border text-muted'
                          }`}
                        >
                          {e.available ? t('search.available') : t('search.soon')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="px-3 py-3">
                  <p className="font-semibold">{t('search.noMatch', { q: query.trim() })}</p>
                  <p className="mt-1 text-sm text-muted">{t('search.noMatchText')}</p>
                  {sent ? (
                    <p className="mt-3 text-sm font-semibold text-ok">{t('search.thanks')}</p>
                  ) : (
                    <form
                      className="mt-3 flex gap-2"
                      onSubmit={(e) => {
                        e.preventDefault()
                        // TODO: send this request to the API once the exam-requests table exists
                        setSent(true)
                      }}
                    >
                      <input
                        name="exam"
                        defaultValue={query.trim()}
                        aria-label={t('search.examName')}
                        className="h-10 flex-1 rounded-lg border border-border bg-bg px-3 text-sm text-text"
                      />
                      <button type="submit" className="rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover">
                        {t('search.send')}
                      </button>
                    </form>
                  )}
                  <p className="mt-3 text-xs text-muted">{t('search.privacy')}</p>
                </div>
              )}
            </div>

            <p className="border-t border-border px-4 py-2 text-xs text-muted">{t('search.hint')}</p>
          </div>
        )}
      </dialog>
    </>
  )
}