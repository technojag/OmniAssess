import type { ReactNode } from 'react'

type Props = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  error?: string
  hint?: string
  autoComplete?: string
  right?: ReactNode
}

export default function TextField({ id, label, value, onChange, type = 'text', error, hint, autoComplete, right }: Props) {
  const describedBy = error ? id + '-err' : hint ? id + '-hint' : undefined
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold text-text">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={
            'w-full rounded-md border bg-surface px-3 py-2.5 text-text focus:outline-none focus:ring-2 focus:ring-brand ' +
            (error ? 'border-red-600' : 'border-border') +
            (right ? ' pr-16' : '')
          }
        />
        {right ? <div className="absolute inset-y-0 right-2 flex items-center">{right}</div> : null}
      </div>
      {error ? (
        <p id={id + '-err'} role="alert" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={id + '-hint'} className="mt-1 text-sm text-text/70">
          {hint}
        </p>
      ) : null}
    </div>
  )
}