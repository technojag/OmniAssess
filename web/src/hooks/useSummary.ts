import { useEffect, useState } from 'react'
import { ApiError, api } from '../lib/api'
import type { Summary } from '../lib/result'

export type SummaryState =
  | { kind: 'loading' }
  | { kind: 'waiting' } // undo window still open, the result is hidden for now
  | { kind: 'running' } // the exam has not ended yet
  | { kind: 'error' }
  | { kind: 'ready'; data: Summary }

export function useSummary(id: string): SummaryState {
  const [state, setState] = useState<SummaryState>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const run = () => {
      api<Summary>('/attempts/' + id + '/summary')
        .then((data) => {
          if (!cancelled) setState({ kind: 'ready', data })
        })
        .catch((e: unknown) => {
          if (cancelled) return
          if (e instanceof ApiError && e.code === 'UNDO_WINDOW_OPEN') {
            setState({ kind: 'waiting' })
            timer = setTimeout(run, 5000)
          } else if (e instanceof ApiError && e.code === 'ATTEMPT_IN_PROGRESS') {
            setState({ kind: 'running' })
          } else {
            setState({ kind: 'error' })
          }
        })
    }

    run()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [id])

  return state
}