import { useTranslation } from 'react-i18next'

type Item = { title: string; text: string }

export default function BenefitsStrip() {
  const { t } = useTranslation()
  const items = t('benefits.items', { returnObjects: true }) as Item[]
  return (
    <div className="mx-auto mt-8 max-w-6xl px-6">
      <ul className="grid gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it) => (
          <li key={it.title} className="border-l-[3px] border-brand pl-3">
            <p className="font-semibold">{it.title}</p>
            <p className="text-sm text-muted">{it.text}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}