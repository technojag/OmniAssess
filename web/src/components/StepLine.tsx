import { useTranslation } from 'react-i18next'

// Colours are darker than in the banner images so white numbers stay readable
const STEPS = [
  ['learn', '#0E7C7B'],
  ['practice', '#1E7B45'],
  ['review', '#0166FC'],
  ['improve', '#6B46C1'],
  ['succeed', '#B45309'],
] as const

export default function StepLine({ className = '' }: { className?: string }) {
  const { t } = useTranslation()
  return (
    <ol className={`flex flex-wrap items-center gap-x-2 gap-y-2 ${className}`} aria-label={t('journey.label')}>
      {STEPS.map(([key, color], i) => (
        <li key={key} className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full text-xs font-bold text-white" style={{ background: color }}>
            {i + 1}
          </span>
          <span className="text-sm font-semibold text-text">{t(`journey.${key}`)}</span>
          {i < STEPS.length - 1 && (
            <span aria-hidden="true" className="text-muted">
              →
            </span>
          )}
        </li>
      ))}
    </ol>
  )
}