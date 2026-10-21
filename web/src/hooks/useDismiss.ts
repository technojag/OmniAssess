import { useEffect, type RefObject } from 'react'

// Closes a small popup when the user clicks outside it or presses Escape
export function useDismiss(open: boolean, close: () => void, ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close, ref])
}