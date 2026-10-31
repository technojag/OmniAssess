import { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import AdminNav from '../components/admin/AdminNav'
import { ApiError, api } from '../lib/api'

type Problem = { row: number; kind: 'error' | 'duplicate'; message: string }

// Same shape as importQuestions() in api/src/modules/admin/questions.import.ts
type Report = {
  dryRun: boolean
  status: string
  total: number
  okCount: number
  errorCount: number
  duplicateCount: number
  imported: number
  bySubject: Record<string, number>
  problems: Problem[]
}

const btn = 'rounded-md border border-border px-4 py-2.5 font-semibold text-text hover:bg-brand-soft disabled:opacity-50'

export default function AdminImportPage() {
  const [subjects, setSubjects] = useState<string[]>([])
  const [fileName, setFileName] = useState('')
  const [csv, setCsv] = useState('')
  const [status, setStatus] = useState<'APPROVED' | 'DRAFT'>('APPROVED')
  const [report, setReport] = useState<Report | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    api<{ subjects: string[] }>('/admin/subjects')
      .then((r) => {
        if (!cancelled) setSubjects(r.subjects)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    setReport(null)
    setError('')
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 1_400_000) {
      setError('This file is too big (limit about 1.4 MB). Split it into smaller files.')
      return
    }
    setFileName(file.name)
    setCsv(await file.text())
  }

  async function run(dryRun: boolean) {
    setBusy(true)
    setError('')
    try {
      setReport(await api<Report>('/admin/questions/import', { method: 'POST', body: { csv, status, dryRun } }))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not reach the server.')
    } finally {
      setBusy(false)
    }
  }

  const canImport = !!report && report.dryRun && report.okCount > 0
  const done = !!report && !report.dryRun

  return (
    <>
      <Header />
      <AdminNav />
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
        <h1 className="text-2xl font-bold text-text sm:text-3xl">Import questions</h1>
        <p className="mt-1 text-text/70">Upload a CSV file. First check it, then import.</p>

        <section className="mt-6 rounded-xl border border-border bg-surface p-5">
          <h2 className="font-bold text-text">File format</h2>
          <p className="mt-2 text-sm text-text/80">The first row must have these column names:</p>
          <p className="mt-1 break-words rounded-md bg-brand-soft p-3 text-sm text-text">
            subject, topic, difficulty, question, optionA, optionB, optionC, optionD, correct, explanation
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-text/80">
            <li>
              <span className="font-semibold">subject</span> must be one of: {subjects.length ? subjects.join(', ') : '…'}
            </li>
            <li>
              <span className="font-semibold">difficulty</span>: EASY, MEDIUM or HARD (empty means MEDIUM)
            </li>
            <li>
              <span className="font-semibold">correct</span>: A, B, C or D
            </li>
            <li>topic and explanation can be empty. Save from Excel as "CSV UTF-8 (Comma delimited)".</li>
          </ul>
        </section>

        <section className="mt-5 rounded-xl border border-border bg-surface p-5">
          <label htmlFor="csv-file" className="block text-sm font-semibold text-text">
            CSV file
          </label>
          <input id="csv-file" type="file" accept=".csv,text/csv" onChange={onFile} className="mt-2 block w-full text-text" />
          {fileName ? <p className="mt-1 text-sm text-text/70">Selected: {fileName}</p> : null}

          <label htmlFor="status" className="mt-4 block text-sm font-semibold text-text">
            Save the questions as
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as 'APPROVED' | 'DRAFT')
              setReport(null)
            }}
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2.5 text-text"
          >
            <option value="APPROVED">Approved (they can appear in exams)</option>
            <option value="DRAFT">Draft (hidden until approved)</option>
          </select>

          {error ? (
            <p role="alert" className="mt-4 rounded-md border border-red-600 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          ) : null}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => void run(true)} disabled={!csv || busy} className={btn}>
              {busy && !canImport ? 'Checking…' : 'Check file'}
            </button>
            <button
              type="button"
              onClick={() => void run(false)}
              disabled={!canImport || busy}
              className="rounded-md bg-brand px-6 py-2.5 font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
            >
              {report && canImport ? 'Import ' + report.okCount + ' questions' : 'Import'}
            </button>
          </div>
        </section>

        {report ? (
          <section className="mt-5 rounded-xl border border-border bg-surface p-5" aria-live="polite">
            {done ? (
              <p className="rounded-md bg-green-600 px-3 py-2 font-semibold text-white">
                Imported {report.imported} questions ({report.status === 'APPROVED' ? 'approved' : 'draft'}).
              </p>
            ) : (
              <h2 className="font-bold text-text">Check result</h2>
            )}

            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['Rows in file', report.total],
                ['Ready to import', report.okCount],
                ['Errors', report.errorCount],
                ['Already exist', report.duplicateCount],
              ].map(([label, n]) => (
                <li key={label} className="rounded-lg border border-border p-3">
                  <p className="text-2xl font-bold text-text">{n}</p>
                  <p className="text-sm text-text/80">{label}</p>
                </li>
              ))}
            </ul>

            {Object.keys(report.bySubject).length > 0 ? (
              <p className="mt-3 text-sm text-text">
                {report.dryRun ? 'Will be added: ' : 'Added: '}
                {Object.entries(report.bySubject)
                  .map(([name, n]) => name + ' ' + n)
                  .join(' · ')}
              </p>
            ) : null}

            {report.problems.length > 0 ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[26rem] text-left text-sm text-text">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-2 pr-3 font-semibold">Row</th>
                      <th className="py-2 pr-3 font-semibold">Type</th>
                      <th className="py-2 font-semibold">What to fix</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.problems.map((p) => (
                      <tr key={p.row + p.kind} className="border-b border-border last:border-0">
                        <td className="py-2 pr-3">{p.row}</td>
                        <td className={'py-2 pr-3 font-semibold ' + (p.kind === 'error' ? 'text-red-600' : 'text-text/70')}>
                          {p.kind === 'error' ? 'Error' : 'Already exists'}
                        </td>
                        <td className="py-2">{p.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-xs text-text/70">Row 1 is the header, so the first question is row 2.</p>
              </div>
            ) : null}
          </section>
        ) : null}

        <div className="mt-8">
          <Link to="/dashboard" className="font-semibold text-link hover:underline">
            Back to dashboard
          </Link>
        </div>
      </main>
    </>
  )
}