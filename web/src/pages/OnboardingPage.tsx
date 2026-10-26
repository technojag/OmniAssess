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
  required: boolean
  options?: string[]
  numeric?: boolean
  max?: number
  // The field is shown (and counted) only when another field has this value
  showWhen?: { field: string; value: string }
}
type Profile = {
  category: Category
  details: Record<string, unknown> | null
  focusNotes: string | null
} | null

const CATEGORIES: Category[] = ['SCHOOL', 'COLLEGE', 'GOVT_COMPETITIVE', 'CORPORATE']

// Semesters in each fixed degree. For "Other" the count is course duration (years) x 2.
const SEMESTER_COUNT: Record<string, number> = {
  BTECH: 8,
  BSC: 6,
  BCOM: 6,
  BA: 6,
}

function semesterCount(form: Record<string, string>) {
  if (form.degree === 'OTHER') return Number(form.courseYears || 0) * 2
  return SEMESTER_COUNT[form.degree ?? ''] ?? 0
}

function semesterOptions(form: Record<string, string>) {
  return Array.from({ length: semesterCount(form) }, (_, i) => String(i + 1))
}

const PLACEHOLDER_KEY: Record<string, string> = {
  degreeOther: 'onb.phDegreeOther',
  boardOther: 'onb.phBoardOther',
  targetExamOther: 'onb.phTargetExamOther',
}

// Same fields and limits as api/src/modules/onboarding/onboarding.schemas.ts
// (the semester options are not fixed here, they depend on the course)
const FIELDS: Record<Category, Field[]> = {
  SCHOOL: [
    { name: 'classLevel', kind: 'select', required: true, options: ['10', '12'] },
    { name: 'board', kind: 'select', required: true, options: ['CBSE', 'ICSE', 'STATE', 'OTHER'] },
    { name: 'boardOther', kind: 'text', required: true, max: 60, showWhen: { field: 'board', value: 'OTHER' } },
    { name: 'subjects', kind: 'list', required: true },
  ],
  COLLEGE: [
    { name: 'degree', kind: 'select', required: true, options: ['BTECH', 'BSC', 'BCOM', 'BA', 'OTHER'] },
    { name: 'degreeOther', kind: 'text', required: true, max: 60, showWhen: { field: 'degree', value: 'OTHER' } },
    {
      name: 'courseYears',
      kind: 'select',
      required: true,
      numeric: true,
      options: ['1', '2', '3', '4', '5', '6'],
      showWhen: { field: 'degree', value: 'OTHER' },
    },
    { name: 'semester', kind: 'select', required: true, numeric: true },
    { name: 'coreSubject', kind: 'text', required: true, max: 60 },
  ],
  GOVT_COMPETITIVE: [
    { name: 'targetExam', kind: 'select', required: true, options: ['UPSC', 'SSC_CGL', 'BANKING', 'RAILWAYS', 'OTHER'] },
    {
      name: 'targetExamOther',
      kind: 'text',
      required: true,
      max: 60,
      showWhen: { field: 'targetExam', value: 'OTHER' },
    },
    { name: 'section', kind: 'text', required: false, max: 40 },
  ],
  CORPORATE: [
    { name: 'targetRole', kind: 'text', required: true, max: 60 },
    {
      name: 'experienceLevel',
      kind: 'select',
      required: true,
      options: ['FRESHER', '0_2_YEARS', '2_5_YEARS', '5_PLUS_YEARS'],
    },
  ],
}

// Fields that are on screen right now (some depend on another answer)
function visibleFields(category: Category, form: Record<string, string>) {
  return FIELDS[category].filter((f) => !f.showWhen || form[f.showWhen.field] === f.showWhen.value)
}

function buildPayload(category: Category, form: Record<string, string>) {
  const body: Record<string, unknown> = { category }
  for (const f of visibleFields(category, form)) {
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

// Names of required fields that are still empty
function missingFields(category: Category, form: Record<string, string>) {
  return visibleFields(category, form)
    .filter((f) => {
      if (!f.required) return false
      const raw = (form[f.name] ?? '').trim()
      if (f.kind === 'list') return raw.split(',').every((s) => !s.trim())
      return !raw
    })
    .map((f) => f.name)
}

const inputBase =
  'w-full rounded-md border bg-surface px-3 py-2.5 text-text focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-60 '

export default function OnboardingPage() {
  const { t } = useTranslation()
  const { reload } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<1 | 2>(1)
  const [category, setCategory] = useState<Category | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, boolean>>({})
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

  function setField(name: string, value: string) {
    setForm((prev) => {
      const next = { ...prev, [name]: value }
      // Text boxes that belong to "Other" go away (and are emptied) when another choice is made
      if (name === 'degree' && value !== 'OTHER') {
        next.degreeOther = ''
        next.courseYears = ''
      }
      if (name === 'board' && value !== 'OTHER') next.boardOther = ''
      if (name === 'targetExam' && value !== 'OTHER') next.targetExamOther = ''
      // A semester that does not exist in the new course is cleared
      if ((name === 'degree' || name === 'courseYears') && next.semester) {
        if (Number(next.semester) > semesterCount(next)) next.semester = ''
      }
      return next
    })
    setErrors((prev) => ({ ...prev, [name]: false }))
  }

  function optionsFor(f: Field) {
    return f.name === 'semester' ? semesterOptions(form) : (f.options ?? [])
  }

  function optionLabel(field: Field, value: string) {
    if (field.name === 'classLevel') return t('onb.classN', { n: value })
    if (field.name === 'semester') return t('onb.semesterN', { n: value })
    if (field.name === 'courseYears') return t('onb.yearsN', { n: value })
    return t('onb.opt.' + value, { defaultValue: value })
  }

  // Semester stays closed until we know how many semesters the course has
  function semesterHint() {
    if (!form.degree) return t('onb.pickDegreeFirst')
    return t('onb.pickDurationFirst')
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!category || busy) return
    setError('')

    const missing = missingFields(category, form)
    if (missing.length > 0) {
      setErrors(Object.fromEntries(missing.map((m) => [m, true])))
      document.getElementById(missing[0])?.focus()
      return
    }

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
          <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
            <h2 className="font-semibold text-text">{t('onb.details')}</h2>

            {visibleFields(category, form).map((f) => {
              const semesterClosed = f.name === 'semester' && semesterCount(form) === 0
              const bad = errors[f.name]
              const cls = inputBase + (bad ? 'border-red-600' : 'border-border')
              return (
                <div key={f.name}>
                  <label htmlFor={f.name} className="mb-1 block text-sm font-semibold text-text">
                    {t('onb.f.' + f.name)}
                    {f.required ? (
                      <span aria-hidden="true" className="text-red-600">
                        {' *'}
                      </span>
                    ) : (
                      <span className="font-normal text-text/70"> ({t('onb.optional')})</span>
                    )}
                  </label>
                  {f.kind === 'select' ? (
                    <select
                      id={f.name}
                      value={form[f.name] ?? ''}
                      disabled={semesterClosed}
                      required={f.required}
                      aria-invalid={bad ? true : undefined}
                      onChange={(e) => setField(f.name, e.target.value)}
                      className={cls}
                    >
                      <option value="">{semesterClosed ? semesterHint() : t('onb.select')}</option>
                      {optionsFor(f).map((o) => (
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
                      placeholder={PLACEHOLDER_KEY[f.name] ? t(PLACEHOLDER_KEY[f.name]) : undefined}
                      required={f.required}
                      aria-invalid={bad ? true : undefined}
                      onChange={(e) => setField(f.name, e.target.value)}
                      className={cls}
                    />
                  )}
                  {bad ? (
                    <p role="alert" className="mt-1 text-sm text-red-600">
                      {t('onb.required')}
                    </p>
                  ) : null}
                </div>
              )
            })}

            <div>
              <label htmlFor="focusNotes" className="mb-1 block text-sm font-semibold text-text">
                {t('onb.f.focusNotes')} <span className="font-normal text-text/70">({t('onb.optional')})</span>
              </label>
              <textarea
                id="focusNotes"
                rows={3}
                maxLength={300}
                value={form.focusNotes ?? ''}
                onChange={(e) => setField('focusNotes', e.target.value)}
                className={inputBase + 'border-border'}
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