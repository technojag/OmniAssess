import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import AdminNav from '../components/admin/AdminNav'
import Header from '../components/Header'
import { ApiError, api } from '../lib/api'

type Status = 'APPROVED' | 'DRAFT' | 'RETIRED'

type Item = {
  id: string
  stem: string
  status: Status
  difficulty: string
  hasSolution: boolean
  subject: string
  topic: string | null
}

// Same shape as listQuestions() in api/src/modules/admin/questions.manage.ts
type ListData = {
  total: number
  page: number
  pageSize: number
  subjects: { id: string; name: string }[]
  counts: { subjectId: string; status: Status; n: number }[]
  items: Item[]
}

const STATUS_LABEL: Record<Status, string> = { APPROVED: 'Approved', DRAFT: 'Draft', RETIRED: 'Retired' }
// Colour AND the word are always shown together
const STATUS_STYLE: Record<Status, string> = {
  APPROVED: 'bg-green-600 text-white',
  DRAFT: 'bg-gray-500 text-white',
  RETIRED: 'bg-red-600 text-white',
}

const btn = 'rounded-md border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-brand-soft disabled:opacity-50'
const field = 'rounded-md border border-border bg-surface px-3 py-2 text-text'

export default function AdminQuestionsPage() {
  const [subjectId, setSubjectId] = useState('')
  const [status, setStatus] = useState<'' | Status>('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [tries, setTries] = useState(0)
  const [result, setResult] = useState<{ key: string; data: ListData } | null>(null)
  const [failedKey, setFailedKey] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const params = new URLSearchParams()
  if (subjectId) params.set('subjectId', subjectId)
  if (status) params.set('status', status)
  if (search) params.set('q', search)
  params.set('page', String(page))
  const qs = params.toString()
  const key = qs + '#' + tries

  useEffect(() => {
    let cancelled = false
    api<ListData>('/admin/questions?' + qs)
      .then((data) => {
        if (!cancelled) setResult({ key, data })
      })
      .catch(() => {
        if (!cancelled) setFailedKey(key)
      })
    return () => {
      cancelled = true
    }
  }, [key, qs])

  const data = result?.data ?? null
  const loading = result?.key !== key && failedKey !== key
  const failed = failedKey === key
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
  const count = (sid: string, st: Status) => data?.counts.find((c) => c.subjectId === sid && c.status === st)?.n ?? 0

  function changeFilter(apply: () => void) {
    apply()
    setPage(1)
    setSelected(new Set())
  }

  function onSearch(e: FormEvent) {
    e.preventDefault()
    changeFilter(() => setSearch(searchInput.trim()))
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (!data) return
    const allOn = data.items.length > 0 && data.items.every((i) => selected.has(i.id))
    setSelected(allOn ? new Set() : new Set(data.items.map((i) => i.id)))
  }

  async function bulk(next: Status) {
    const ids = [...selected]
    if (ids.length === 0) return
    if (
      next === 'RETIRED' &&
      !window.confirm('Retire ' + ids.length + ' question(s)? They will not appear in new exams. Old results stay safe.')
    ) {
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const r = await api<{ updated: number; skipped: number }>('/admin/questions/bulk-status', {
        method: 'POST',
        body: { ids, status: next },
      })
      setMessage(
        r.updated +
          ' question(s) set to ' +
          STATUS_LABEL[next] +
          '.' +
          (r.skipped > 0 ? ' ' + r.skipped + ' skipped: they need exactly one correct answer first.' : ''),
      )
      setSelected(new Set())
      setTries((n) => n + 1)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not reach the server.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Header />
      <AdminNav />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-10">
        <h1 className="text-2xl font-bold text-text sm:text-3xl">Questions</h1>
        <p className="mt-1 text-text/70">Only Approved questions can appear in exams.</p>

        {failed ? (
          <div role="alert" className="mt-6">
            <p className="text-red-600">Could not load the questions.</p>
            <button type="button" onClick={() => setTries((n) => n + 1)} className={btn + ' mt-3'}>
              Try again
            </button>
          </div>
        ) : null}

        {data ? (
          <section className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full min-w-[26rem] text-left text-sm text-text">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 font-semibold">Subject</th>
                  <th className="px-4 py-3 font-semibold">Approved</th>
                  <th className="px-4 py-3 font-semibold">Draft</th>
                  <th className="px-4 py-3 font-semibold">Retired</th>
                </tr>
              </thead>
              <tbody>
                {data.subjects.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">{s.name}</td>
                    <td className="px-4 py-3 font-semibold">{count(s.id, 'APPROVED')}</td>
                    <td className="px-4 py-3">{count(s.id, 'DRAFT')}</td>
                    <td className="px-4 py-3">{count(s.id, 'RETIRED')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        <form onSubmit={onSearch} className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <select
            aria-label="Subject"
            value={subjectId}
            onChange={(e) => changeFilter(() => setSubjectId(e.target.value))}
            className={field}
          >
            <option value="">All subjects</option>
            {data?.subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Status"
            value={status}
            onChange={(e) => changeFilter(() => setStatus(e.target.value as '' | Status))}
            className={field}
          >
            <option value="">All statuses</option>
            <option value="APPROVED">Approved</option>
            <option value="DRAFT">Draft</option>
            <option value="RETIRED">Retired</option>
          </select>
          <input
            type="search"
            aria-label="Search in question text"
            placeholder="Search in question text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className={field + ' sm:flex-1'}
          />
          <button type="submit" className={btn}>
            Search
          </button>
        </form>

        {message ? (
          <p role="status" className="mt-4 rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white">
            {message}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-4 rounded-md border border-red-600 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        ) : null}

        {selected.size > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-brand-soft p-3">
            <span className="mr-2 text-sm font-semibold text-text">{selected.size} selected</span>
            <button type="button" disabled={busy} onClick={() => void bulk('APPROVED')} className={btn}>
              Approve
            </button>
            <button type="button" disabled={busy} onClick={() => void bulk('DRAFT')} className={btn}>
              Move to draft
            </button>
            <button type="button" disabled={busy} onClick={() => void bulk('RETIRED')} className={btn}>
              Retire
            </button>
          </div>
        ) : null}

        {loading && !data ? (
          <p role="status" className="mt-6 text-text/70">
            Loading…
          </p>
        ) : data ? (
          <>
            <div className="mt-4 flex items-center justify-between text-sm text-text/80">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={data.items.length > 0 && data.items.every((i) => selected.has(i.id))}
                  onChange={toggleAll}
                  className="h-4 w-4"
                />
                Select all on this page
              </label>
              <span>{data.total} questions</span>
            </div>

            {data.items.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-border p-5 text-text/80">No questions found.</p>
            ) : (
              <ul className={'mt-3 divide-y divide-border rounded-xl border border-border bg-surface ' + (loading ? 'opacity-60' : '')}>
                {data.items.map((i) => (
                  <li key={i.id} className="flex items-start gap-3 p-4">
                    <input
                      type="checkbox"
                      aria-label={'Select question: ' + i.stem}
                      checked={selected.has(i.id)}
                      onChange={() => toggle(i.id)}
                      className="mt-1 h-4 w-4 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className={'rounded-full px-2.5 py-0.5 font-semibold ' + STATUS_STYLE[i.status]}>
                          {STATUS_LABEL[i.status]}
                        </span>
                        <span className="text-text/70">
                          {i.subject}
                          {i.topic ? ' · ' + i.topic : ''} · {i.difficulty}
                        </span>
                        {!i.hasSolution ? <span className="font-semibold text-red-600">No solution</span> : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-text">{i.stem}</p>
                    </div>
                    <Link
                      to={'/admin/questions/' + i.id}
                      className="shrink-0 rounded-md border border-border px-3 py-1.5 text-sm font-semibold text-link hover:bg-brand-soft"
                    >
                      Edit
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => {
                  setPage((p) => p - 1)
                  setSelected(new Set())
                }}
                className={btn}
              >
                Previous
              </button>
              <span className="text-sm text-text/80">
                Page {data.page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => {
                  setPage((p) => p + 1)
                  setSelected(new Set())
                }}
                className={btn}
              >
                Next
              </button>
            </div>
          </>
        ) : null}
      </main>
    </>
  )
}