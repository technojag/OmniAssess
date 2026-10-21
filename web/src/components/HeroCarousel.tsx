import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import StepLine from './StepLine'
import imgExperience from '../assets/hero/hero-experience.webp'
import imgLostMarks from '../assets/hero/hero-lost-marks.webp'
import imgScore from '../assets/hero/hero-score.webp'

type SlideText = { before: string; highlight: string; after: string; text: string; alt: string }

// Look of each slide. The words come from the translation files.
const LOOK = [
  { accent: 'text-ok', image: imgExperience, tint: '#EBFBF2' },
  { accent: 'text-mark', image: imgLostMarks, tint: '#F0EAFE' },
  { accent: 'text-link', image: imgScore, tint: '#EDF6FD' },
]

const INTERVAL_MS = 5000

export default function HeroCarousel() {
  const { t } = useTranslation()
  const slides = t('hero.slides', { returnObjects: true }) as SlideText[]
  const count = LOOK.length
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const touchStartX = useRef<number | null>(null)

  const go = (i: number) => setIndex((i + count) % count)

  // Follow the "reduce motion" setting of the device
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Next slide every few seconds, unless paused. `index` is a dependency so the
  // timer starts again after the user changes the slide by hand.
  useEffect(() => {
    if (paused || reduced) return
    const id = setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % count)
    }, INTERVAL_MS)
    return () => clearInterval(id)
  }, [paused, reduced, count, index])

  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStartX.current
    touchStartX.current = null
    setPaused(false)
    if (start === null) return
    const dx = e.changedTouches[0].clientX - start
    if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1))
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t('hero.label')}
      className="hero-slide overflow-hidden"
      style={{ '--tint': LOOK[index].tint } as CSSProperties}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={(e) => {
        setPaused(true)
        touchStartX.current = e.touches[0].clientX
      }}
      onTouchEnd={onTouchEnd}
      onTouchCancel={() => setPaused(false)}
    >
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
        aria-live={paused ? 'polite' : 'off'}
      >
        {LOOK.map((look, i) => {
          const s = slides[i]
          const Heading = i === 0 ? 'h1' : 'h2'
          return (
            <div
              key={i}
              className="w-full shrink-0"
              role="group"
              aria-roledescription="slide"
              aria-label={t('hero.slideOf', { n: i + 1, total: count })}
              inert={i !== index}
            >
              <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-12 md:grid-cols-2 md:py-16">
                <div>
                  <Heading className="text-4xl font-bold leading-tight text-brand-deep md:text-5xl">
                    {s.before}
                    <span className={look.accent}>{s.highlight}</span>
                    {s.after}
                  </Heading>
                  <StepLine className="mt-5" />
                  <p className="mt-5 max-w-lg text-lg text-muted">{s.text}</p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <a href="#start" className="rounded-md bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-hover">
                      {t('hero.startFree')}
                    </a>
                    <a href="#how-it-works" className="rounded-md border border-brand px-6 py-3 font-semibold text-link hover:bg-brand-soft">
                      {t('hero.seeHow')}
                    </a>
                  </div>
                  <p className="mt-3 text-sm text-muted">{t('hero.works')}</p>
                </div>
                <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
                  <img src={look.image} alt={s.alt} className="block w-full" loading={i === 0 ? 'eager' : 'lazy'} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 pb-8">
        <button
          type="button"
          aria-label={t('hero.prev')}
          onClick={() => go(index - 1)}
          className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-text hover:bg-brand-soft"
        >
          ‹
        </button>
        <div className="flex items-center" role="group" aria-label={t('hero.choose')}>
          {LOOK.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={t('hero.show', { n: i + 1 })}
              aria-current={i === index}
              onClick={() => go(i)}
              className="grid h-6 place-items-center px-1"
            >
              <span className={`block h-2 rounded-full transition-all ${i === index ? 'w-7 bg-brand' : 'w-2 bg-muted/50'}`} />
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-label={t('hero.next')}
          onClick={() => go(index + 1)}
          className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-text hover:bg-brand-soft"
        >
          ›
        </button>
      </div>
    </section>
  )
}