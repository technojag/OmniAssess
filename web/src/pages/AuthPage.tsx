import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/context'
import Header from '../components/Header'
import TextField from '../components/TextField'
import { ApiError } from '../lib/api'
import { fieldErrors, loginSchema, signupSchema } from '../lib/validation'

function errorKey(err: unknown) {
  if (err instanceof ApiError) {
    if (err.code === 'EMAIL_TAKEN') return 'auth.err.emailTaken'
    if (err.code === 'INVALID_CREDENTIALS') return 'auth.err.invalid'
    if (err.status === 429) return 'auth.err.tooMany'
    return 'auth.err.generic'
  }
  return 'auth.err.network'
}

export default function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const { t } = useTranslation()
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const isSignup = mode === 'signup'

  const [values, setValues] = useState({ fullName: '', email: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [show, setShow] = useState(false)

  const set = (key: 'fullName' | 'email' | 'password') => (v: string) =>
    setValues((prev) => ({ ...prev, [key]: v }))
  const err = (key: string) => (errors[key] ? t(errors[key]) : undefined)

  async function submit(action: () => Promise<unknown>) {
    setErrors({})
    setBusy(true)
    try {
      await action()
      navigate('/dashboard', { replace: true })
    } catch (e) {
      setFormError(t(errorKey(e)))
    } finally {
      setBusy(false)
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    if (busy) return

    if (isSignup) {
      const r = signupSchema.safeParse(values)
      if (!r.success) {
        setErrors(fieldErrors(r.error))
        return
      }
      await submit(() => register(r.data))
    } else {
      const r = loginSchema.safeParse(values)
      if (!r.success) {
        setErrors(fieldErrors(r.error))
        return
      }
      await submit(() => login(r.data))
    }
  }

  const base = isSignup ? 'auth.signup' : 'auth.login'

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-md px-4 py-8 sm:py-14">
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold text-text">{t(base + '.title')}</h1>
          <p className="mt-1 text-text/70">{t(base + '.subtitle')}</p>

          <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
            {isSignup ? (
              <TextField
                id="fullName"
                label={t('auth.fields.fullName')}
                value={values.fullName}
                onChange={set('fullName')}
                autoComplete="name"
                error={err('fullName')}
              />
            ) : null}
            <TextField
              id="email"
              label={t('auth.fields.email')}
              type="email"
              value={values.email}
              onChange={set('email')}
              autoComplete="email"
              error={err('email')}
            />
            <TextField
              id="password"
              label={t('auth.fields.password')}
              type={show ? 'text' : 'password'}
              value={values.password}
              onChange={set('password')}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              error={err('password')}
              hint={isSignup ? t('auth.hint.password') : undefined}
              right={
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="rounded px-2 py-1 text-sm font-semibold text-link hover:bg-brand-soft"
                >
                  {show ? t('auth.fields.hide') : t('auth.fields.show')}
                </button>
              }
            />

            {formError ? (
              <p role="alert" className="rounded-md border border-red-600 px-3 py-2 text-sm text-red-600">
                {formError}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-brand px-4 py-2.5 font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
            >
              {busy ? t(base + '.busy') : t(base + '.submit')}
            </button>
          </form>

          <p className="mt-6 text-center text-text/70">
            {t(base + '.switchText')}{' '}
            <Link to={isSignup ? '/login' : '/signup'} className="font-semibold text-link hover:underline">
              {t(base + '.switchLink')}
            </Link>
          </p>
        </div>
      </main>
    </>
  )
}