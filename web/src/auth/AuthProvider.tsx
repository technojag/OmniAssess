import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '../lib/api'
import type { User } from '../lib/api'
import { AuthContext } from './context'
import type { AuthState } from './context'

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const started = useRef(false)

  // On page load: ask the server who is logged in (api() refreshes the token if needed)
  useEffect(() => {
    if (started.current) return
    started.current = true
    api<{ user: User }>('/auth/me')
      .then((r) => setUser(r.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const value: AuthState = {
    user,
    loading,
    async login(input) {
      const r = await api<{ user: User }>('/auth/login', { method: 'POST', body: input })
      setUser(r.user)
      return r.user
    },
    async register(input) {
      const r = await api<{ user: User }>('/auth/register', { method: 'POST', body: input })
      setUser(r.user)
      return r.user
    },
    async logout() {
      try {
        await api('/auth/logout', { method: 'POST' })
      } finally {
        setUser(null)
      }
    },
    async reload() {
      try {
        const r = await api<{ user: User }>('/auth/me')
        setUser(r.user)
        return r.user
      } catch {
        setUser(null)
        return null
      }
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}