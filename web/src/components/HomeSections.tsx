import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { EXAMS } from '../data/exams'

type Item = { title: string; text: string }
type Faq = { q: string; a: string }

const card = 'rounded-xl border border-border bg-surface p-6'

export function HowItWorks() {
  const { t } = useTranslation()
  const steps = t('how.steps', { returnObjects: true }) as Item[]
  return (
    <section id="how-it-works" className="scroll-mt-4 px-6 py-16">
      <span id="practice" className="block scroll-mt-4" />
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-8 text-3xl font-bold">{t('how.title')}</h2>
        <ol className="grid gap-5 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className={card}>
              <span className="mb-4 grid h-9 w-9 place-items-center rounded-full bg-brand-soft font-bold text-link">{i + 1}</span>
              <h3 className="mb-1.5 text-lg font-semibold">{s.title}</h3>
              <p className="text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export function RealExam() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'hi' ? 'hi' : 'en'
  return (
    <section id="exams" className="scroll-mt-4 bg-bg px-6 py-16">
      <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
        <div>
          <h2 className="mb-3 text-3xl font-bold">{t('sim.title')}</h2>
          <p className="text-lg leading-relaxed text-muted">{t('sim.text')}</p>
        </div>
        <div className={card}>
          <h3 className="mb-3 font-semibold">{t('sim.available')}</h3>
          <ul className="grid gap-2">
            {EXAMS.filter((e) => e.available).map((e) => (
              <li key={e.slug}>
                <Link
                  to={`/exams/${e.slug}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 font-semibold hover:bg-brand-soft"
                >
                  <span>{e.name[lang]}</span>
                  <span className="whitespace-nowrap text-sm text-link">{t('sim.open')} →</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted">{t('sim.more')}</p>
        </div>
      </div>
    </section>
  )
}

export function AfterExam() {
  const { t } = useTranslation()
  const items = t('after.items', { returnObjects: true }) as Item[]
  return (
    <section id="results" className="scroll-mt-4 px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-8 text-3xl font-bold">{t('after.title')}</h2>
        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it, i) => (
            <li key={it.title} className={card}>
              <span className="mb-4 grid h-9 w-9 place-items-center rounded-full bg-brand-soft font-bold text-link">{i + 1}</span>
              <h3 className="mb-1.5 text-lg font-semibold">{it.title}</h3>
              <p className="text-sm text-muted">{it.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

const LEVELS = ['bg-border', 'bg-brand/25', 'bg-brand/50', 'bg-brand/75', 'bg-brand']

// A fixed pattern, so the picture looks the same on every visit. It is only an illustration.
function level(i: number) {
  const x = (Math.imul(i + 7, 2654435761) >>> 0) % 100
  return x < 45 ? 0 : x < 65 ? 1 : x < 82 ? 2 : x < 94 ? 3 : 4
}

function ActivityMap({ label }: { label: string }) {
  return (
    <div role="img" aria-label={label}>
      <div
        className="grid w-full grid-flow-col gap-[3px]"
        style={{ gridTemplateRows: 'repeat(7, auto)', gridAutoColumns: 'minmax(0, 1fr)' }}
        aria-hidden="true"
      >
        {Array.from({ length: 182 }, (_, i) => (
          <span key={i} className={`block aspect-square rounded-[2px] ${LEVELS[level(i)]}`} />
        ))}
      </div>
    </div>
  )
}

export function Improve() {
  const { t } = useTranslation()
  return (
    <section className="bg-bg px-6 py-16">
      <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
        <div>
          <h2 className="mb-3 text-3xl font-bold">{t('improve.title')}</h2>
          <p className="text-lg leading-relaxed text-muted">{t('improve.text')}</p>
        </div>
        <div className={card + ' min-w-0'}>
          <ActivityMap label={t('improve.mapLabel')} />
          <p className="mt-4 flex items-center gap-3 font-semibold">
            {t('improve.chip')}
            <span className="rounded bg-brand-soft px-2 py-0.5 text-xs font-semibold text-link">{t('improve.example')}</span>
          </p>
        </div>
      </div>
    </section>
  )
}

export function Faq() {
  const { t } = useTranslation()
  const items = t('faq.items', { returnObjects: true }) as Faq[]
  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-8 text-3xl font-bold">{t('faq.title')}</h2>
        <dl className="grid gap-5 md:grid-cols-2">
          {items.map((f) => (
            <div key={f.q} className={card}>
              <dt className="mb-1.5 font-semibold">{f.q}</dt>
              <dd className="text-muted">{f.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}