export type User = {
  id: string
  email: string
  fullName: string
  role: 'CANDIDATE' | 'ADMIN'
  hasCompletedOnboarding: boolean
}

const BASE = '/api/v1'
// These calls must never trigger an automatic refresh
const NO_REFRESH = new Set(['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'])

export class ApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

async function toApiError(res: Response) {
  let code = 'UNKNOWN'
  let message = 'Something went wrong.'
  try {
    const body = await res.json()
    const e = body?.error ?? body
    if (typeof e?.code === 'string') code = e.code
    if (typeof e?.message === 'string') message = e.message
  } catch {
    // response had no JSON body
  }
  return new ApiError(res.status, code, message)
}

// If several requests get 401 together, only one refresh call is made
let refreshing: Promise<boolean> | null = null
function refreshSession() {
  refreshing ??= fetch(BASE + '/auth/refresh', { method: 'POST', credentials: 'include' })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

type Options = { method?: string; body?: unknown }

export async function api<T = unknown>(path: string, opts: Options = {}, canRetry = true): Promise<T> {
  const hasBody = opts.body !== undefined
  const res = await fetch(BASE + path, {
    method: opts.method ?? 'GET',
    credentials: 'include',
    headers: hasBody ? { 'Content-Type': 'application/json' } : undefined,
    body: hasBody ? JSON.stringify(opts.body) : undefined,
  })

  if (res.status === 401 && canRetry && !NO_REFRESH.has(path)) {
    if (await refreshSession()) return api<T>(path, opts, false)
  }
  if (!res.ok) throw await toApiError(res)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}