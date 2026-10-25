import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/context'
import Header from '../components/Header'
import { api } from '../lib/api'

type Category = 'SCHOOL' | 'COLLEGE' | 'GOVT_COMPETITIVE' | 'CORPORATE'
type Field = {
  name: string
  kind: 'select' | 'text' | 'list'
  options?: string[]
  numeric?: boolean
  max?: number
}
type Profile = {
  category: Category
  details: Record<string, unknown> | null
  focusNotes: string | null
} | null

const CATEGORIES: Category[] = ['SCHOOL', 'COLLEGE', 'GOVT_COMPETITIVE', 'CORPORATE']
const SEMESTERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']

// Same fields and limits as api/src/modules/onboarding/onboarding.schemas.ts
const FIELDS: Record<Category, Field[]> = {
  SCHOOL: [
    { name: 'classLevel', kind: 'select', options: ['10', '12'] },
    { name: 'board', kind: 'select', options: ['CBSE', 'ICSE', 'STATE', 'OTHER'] },
    { name: 'subjects', kind: 'list' },
  ],
  COLLEGE: [
    { name: 'degree', kind: 'select', options: ['BTECH', 'BSC', 'BCOM', 'BA', 'OTHER'] },
    { name: 'semester', kind: 'select', options: SEMESTERS, numeric: true },
    { name: 'coreSubject', kind: 'text', max: 60 },
  ],
  GOVT_COMPETITIVE: [
    { name: 'targetExam', kind: 'select', options: ['UPSC', 'SSC_CGL', 'BANKING', 'RAILWAYS', 'OTHER'] },
    { name: 'section', kind: 'text', max: 40 },
  ],
  CORPORATE: [
    { name: 'targetRole', kind: 'text', max: 60 },
    {
      name: 'experienceLevel',
      kind: 'select',
      options: ['FRESHER', '0_2_YEARS', '2_5_YEARS', '5_PLUS_YEARS'],
    },
  ],
}

function buildPayload(category: Category, form: Record<string, string>) {
  const body: Record<string, unknown> = { category }
  for (const f of FIELDS[category]) {
    const raw = (form[f.name] ?? '').trim()
    if (!raw) continue
    if (f.kind === 'list') {
      body[f.name] = raw
        .split(',')
        .map((s) => s.trim().slice(0, 40))
        .filter(Boolean)
        .slice(0, 10)
    } else if (f.numeric) {
      body[f.name] = Number(raw)
    } else {
      body[f.name] = raw
    }
  }
  const notes = (form.focusNotes ?? '').trim()
  if (notes) body.focusNotes = notes
  return body
}

const inputClass =
  'w-full rounded-md border border-border bg-surface px-3 py-2.5 text-text focus:outline-none focus:ring-2 focus:ring-brand'

export default function OnboardingPage() {
  const { t } = useTranslation()
  const { reload } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<1 | 2>(1)
  const [category, setCategory] = useState<Category | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Returning users editing their profile see their old answers
  useEffect(() => {
    api<{ profile: Profile }>('/onboarding')
      .then(({ profile }) => {
        if (!profile) return
        const next: Record<string, string> = {}
        for (const [k, v] of Object.entries(profile.details ?? {})) {
          next[k] = Array.isArray(v) ? v.join(', ') : String(v)
        }
        if (profile.focusNotes) next.focusNotes = profile.focusNotes
        setCategory(profile.category)
        setForm(next)
      })
      .catch(() => {})
  }, [])

  const setField = (name: string, value: string) => setForm((prev) => ({ ...prev, [name]: value }))

  function optionLabel(field: Field, value: string) {
    if (field.name === 'classLevel') return t('onb.classN', { n: value })
    if (field.name === 'semester') return t('onb.semesterN', { n: value })
    return t('onb.opt.' + value, { defaultValue: value })
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!category || busy) return
    setError('')
    setBusy(true)
    try {
      await api('/onboarding', { method: 'POST', body: buildPayload(category, form) })
      await reload()
      navigate('/dashboard', { replace: true })
    } catch {
      setError(t('onb.err'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
        <p className="text-sm font-semibold text-link">{t('onb.step', { n: step })}</p>
        <h1 className="mt-1 text-2xl font-bold text-text sm:text-3xl">{t('onb.title')}</h1>
        <p className="mt-1 text-text/70">{t('onb.subtitle')}</p>

        {step === 1 ? (
          <section className="mt-6">
            <h2 className="mb-3 font-semibold text-text">{t('onb.pick')}</h2>
            <div role="radiogroup" aria-label={t('onb.pick')} className="grid gap-3 sm:grid-cols-2">
              {CATEGORIES.map((c) => {
                const active = category === c
                return (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setCategory(c)}
                    className={
                      'rounded-xl border p-4 text-left transition-colors ' +
                      (active ? 'border-brand bg-brand-soft ring-2 ring-brand' : 'border-border bg-surface hover:bg-brand-soft')
                    }
                  >
                    <span className="block font-semibold text-text">{t('onb.cat.' + c)}</span>
                    <span className="mt-1 block text-sm text-text/70">{t('onb.catHint.' + c)}</span>
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              disabled={!category}
              onClick={() => setStep(2)}
              className="mt-6 w-full rounded-md bg-brand px-4 py-2.5 font-semibold text-white hover:bg-brand-hover disabled:opacity-50 sm:w-auto sm:px-8"
            >
              {t('onb.next')}
            </button>
          </section>
        ) : null}

        {step === 2 && category ? (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <h2 className="font-semibold text-text">
              {t('onb.details')} <span className="font-normal text-text/70">({t('onb.optional')})</span>
            </h2>

            {FIELDS[category].map((f) => (
              <div key={f.name}>
                <label htmlFor={f.name} className="mb-1 block text-sm font-semibold text-text">
                  {t('onb.f.' + f.name)}
                </label>
                {f.kind === 'select' ? (
                  <select
                    id={f.name}
                    value={form[f.name] ?? ''}
                    onChange={(e) => setField(f.name, e.target.value)}
                    className={inputClass}
                  >
                    <option value="">{t('onb.select')}</option>
                    {f.options?.map((o) => (
                      <option key={o} value={o}>
                        {optionLabel(f, o)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={f.name}
                    type="text"
                    maxLength={f.kind === 'list' ? 300 : f.max}
                    value={form[f.name] ?? ''}
                    onChange={(e) => setField(f.name, e.target.value)}
                    className={inputClass}
                  />
                )}
              </div>
            ))}

            <div>
              <label htmlFor="focusNotes" className="mb-1 block text-sm font-semibold text-text">
                {t('onb.f.focusNotes')}
              </label>
              <textarea
                id="focusNotes"
                rows={3}
                maxLength={300}
                value={form.focusNotes ?? ''}
                onChange={(e) => setField('focusNotes', e.target.value)}
                className={inputClass}
              />
            </div>

            {error ? (
              <p role="alert" className="rounded-md border border-red-600 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            ) : null}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-md border border-border px-6 py-2.5 font-semibold text-text hover:bg-brand-soft"
              >
                {t('onb.back')}
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-brand px-8 py-2.5 font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
              >
                {busy ? t('onb.saving') : t('onb.finish')}
              </button>
            </div>
          </form>
        ) : null}
      </main>
    </>
  )
}