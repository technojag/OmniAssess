import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import AdminNav from '../components/admin/AdminNav'
import Header from '../components/Header'
import { ApiError, api } from '../lib/api'

type Status = 'APPROVED' | 'DRAFT' | 'RETIRED'
type Difficulty = 'EASY' | 'MEDIUM' | 'HARD'

// Same shape as getQuestion() in api/src/modules/admin/questions.manage.ts
type Question = {
  id: string
  stem: string
  explanation: string | null
  difficulty: Difficulty
  status: Status
  subject: { id: string; name: string }
  topic: string | null
  options: { id: string; position: number; text: string; isCorrect: boolean }[]
  usedCount: number
}

type Form = {
  stem: string
  explanation: string
  difficulty: Difficulty
  topic: string
  options: string[]
  correctIndex: number
}

function toForm(q: Question): Form {
  return {
    stem: q.stem,
    explanation: q.explanation ?? '',
    difficulty: q.difficulty,
    topic: q.topic ?? '',
    options: q.options.map((o) => o.text),
    correctIndex: Math.max(0, q.options.findIndex((o) => o.isCorrect)),
  }
}

const STATUS_LABEL: Record<Status, string> = { APPROVED: 'Approved', DRAFT: 'Draft', RETIRED: 'Retired' }
const STATUS_STYLE: Record<Status, string> = {
  APPROVED: 'bg-green-600 text-white',
  DRAFT: 'bg-gray-500 text-white',
  RETIRED: 'bg-red-600 text-white',
}

const input = 'w-full rounded-md border border-border bg-surface px-3 py-2.5 text-text focus:outline-none focus:ring-2 focus:ring-brand'
const btn = 'rounded-md border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-brand-soft disabled:opacity-50'

export default function AdminQuestionEditPage() {
  const { id = '' } = useParams()
  const [question, setQuestion] = useState<Question | null>(null)
  const [form, setForm] = useState<Form | null>(null)
  const [failed, setFailed] = useState(false)
  const [tries, setTries] = useState(0)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    api<{ question: Question }>('/admin/questions/' + id)
      .then((r) => {
        if (cancelled) return
        setQuestion(r.question)
        setForm(toForm(r.question))
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [id, tries])

  function retry() {
    setFailed(false)
    setTries((n) => n + 1)
  }

  function set<K extends keyof Form>(name: K, value: Form[K]) {
    setForm((prev) => (prev ? { ...prev, [name]: value } : prev))
    setMessage('')
  }

  function setOption(index: number, text: string) {
    setForm((prev) => (prev ? { ...prev, options: prev.options.map((o, i) => (i === index ? text : o)) } : prev))
    setMessage('')
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!form || busy) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const r = await api<{ question: Question }>('/admin/questions/' + id, {
        method: 'PUT',
        body: {
          stem: form.stem,
          explanation: form.explanation,
          difficulty: form.difficulty,
          topic: form.topic,
          options: form.options.map((text) => ({ text })),
          correctIndex: form.correctIndex,
        },
      })
      setQuestion(r.question)
      setForm(toForm(r.question))
      setMessage('Saved.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server.')
    } finally {
      setBusy(false)
    }
  }

  async function changeStatus(status: Status) {
    if (busy) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await api('/admin/questions/' + id + '/status', { method: 'PATCH', body: { status } })
      setQuestion((prev) => (prev ? { ...prev, status } : prev))
      setMessage('Status changed to ' + STATUS_LABEL[status] + '.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server.')
    } finally {
      setBusy(false)
    }
  }

  const locked = (question?.usedCount ?? 0) > 0
  const editable = question?.options.length === 4

  return (
    <>
      <Header />
      <AdminNav />
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
        <Link to="/admin/questions" className="text-sm font-semibold text-link hover:underline">
          ← Back to questions
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-text sm:text-3xl">Edit question</h1>

        {failed ? (
          <div role="alert" className="mt-6">
            <p className="text-red-600">Could not load this question.</p>
            <button type="button" onClick={retry} className={btn + ' mt-3'}>
              Try again
            </button>
          </div>
        ) : !question || !form ? (
          <p role="status" className="mt-6 text-text/70">
            Loading…
          </p>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-4">
              <span className={'rounded-full px-3 py-0.5 text-sm font-semibold ' + STATUS_STYLE[question.status]}>
                {STATUS_LABEL[question.status]}
              </span>
              <span className="text-sm text-text/70">{question.subject.name}</span>
              <div className="flex flex-wrap gap-2 sm:ml-auto">
                {(['APPROVED', 'DRAFT', 'RETIRED'] as Status[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={busy || question.status === s}
                    onClick={() => void changeStatus(s)}
                    className={btn}
                  >
                    {s === 'APPROVED' ? 'Approve' : s === 'DRAFT' ? 'Move to draft' : 'Retire'}
                  </button>
                ))}
              </div>
            </div>

            {locked ? (
              <p role="note" className="mt-4 rounded-md bg-brand-soft p-3 text-sm text-text">
                This question is already in {question.usedCount} exam attempt(s), so its correct answer is locked. You can still fix
                typos and the solution.
              </p>
            ) : null}
            {!editable ? (
              <p role="note" className="mt-4 rounded-md border border-red-600 p-3 text-sm text-red-600">
                This question has {question.options.length} options. Only questions with 4 options can be edited here.
              </p>
            ) : null}

            <form onSubmit={save} className="mt-5 space-y-4">
              <div>
                <label htmlFor="stem" className="mb-1 block text-sm font-semibold text-text">
                  Question
                </label>
                <textarea
                  id="stem"
                  rows={3}
                  maxLength={1000}
                  value={form.stem}
                  onChange={(e) => set('stem', e.target.value)}
                  className={input}
                />
              </div>

              <fieldset>
                <legend className="mb-1 block text-sm font-semibold text-text">Options (choose the correct one)</legend>
                <div className="space-y-2">
                  {form.options.map((text, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="correct"
                        aria-label={'Option ' + String.fromCharCode(65 + i) + ' is correct'}
                        checked={form.correctIndex === i}
                        disabled={locked}
                        onChange={() => set('correctIndex', i)}
                        className="h-4 w-4 shrink-0"
                      />
                      <span className="font-semibold text-text">{String.fromCharCode(65 + i)}.</span>
                      <input
                        type="text"
                        aria-label={'Option ' + String.fromCharCode(65 + i)}
                        maxLength={300}
                        value={text}
                        onChange={(e) => setOption(i, e.target.value)}
                        className={input}
                      />
                    </div>
                  ))}
                </div>
              </fieldset>

              <div>
                <label htmlFor="explanation" className="mb-1 block text-sm font-semibold text-text">
                  Solution (shown in the review)
                </label>
                <textarea
                  id="explanation"
                  rows={4}
                  maxLength={2000}
                  value={form.explanation}
                  onChange={(e) => set('explanation', e.target.value)}
                  className={input}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="topic" className="mb-1 block text-sm font-semibold text-text">
                    Topic
                  </label>
                  <input
                    id="topic"
                    type="text"
                    maxLength={60}
                    value={form.topic}
                    onChange={(e) => set('topic', e.target.value)}
                    className={input}
                  />
                </div>
                <div>
                  <label htmlFor="difficulty" className="mb-1 block text-sm font-semibold text-text">
                    Difficulty
                  </label>
                  <select
                    id="difficulty"
                    value={form.difficulty}
                    onChange={(e) => set('difficulty', e.target.value as Difficulty)}
                    className={input}
                  >
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                  </select>
                </div>
              </div>

              {message ? (
                <p role="status" className="rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white">
                  {message}
                </p>
              ) : null}
              {error ? (
                <p role="alert" className="rounded-md border border-red-600 px-3 py-2 text-sm text-red-600">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={busy || !editable}
                className="rounded-md bg-brand px-8 py-2.5 font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
              >
                {busy ? 'Saving…' : 'Save changes'}
              </button>
            </form>
          </>
        )}
      </main>
    </>
  )
}