import { z } from 'zod'

// Messages are i18n keys, they are translated when shown
const email = z.string().trim().toLowerCase().email('auth.err.email')

export const signupSchema = z.object({
  fullName: z.string().trim().min(2, 'auth.err.name').max(80, 'auth.err.nameLong'),
  email,
  password: z.string().min(8, 'auth.err.passwordShort').max(128, 'auth.err.passwordLong'),
})

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'auth.err.passwordRequired').max(128, 'auth.err.passwordLong'),
})

// First error message for each field
export function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '')
    if (key && !out[key]) out[key] = issue.message
  }
  return out
}