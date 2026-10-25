import { createContext, useContext } from 'react'
import type { User } from '../lib/api'

export type AuthState = {
  user: User | null
  loading: boolean
  login: (input: { email: string; password: string }) => Promise<User>
  register: (input: { fullName: string; email: string; password: string }) => Promise<User>
  logout: () => Promise<void>
  reload: () => Promise<User | null>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}