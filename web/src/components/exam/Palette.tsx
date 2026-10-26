import { useTranslation } from 'react-i18next'
import '../../i18n/exam'
import { questionStatus } from './paletteStatus'
import type { PaletteQuestion, Status } from './paletteStatus'

const ORDER: Status[] = ['notVisited', 'notAnswered', 'answered', 'marked', 'markedAnswered']

// Marked and answered at the same time: half green, half purple
const HALF_AND_HALF = 'linear-gradient(135deg, #16a34a 50%, #7c3aed 50%)'

const STYLE: Record<Status, string> = {
  notVisited: 'border border-border bg-surface text-text',
  notAnswered: 'bg-red-600 text-white',
  answered: 'bg-green-600 text-white',
  marked: 'bg-purple-600 text-white',
  markedAnswered: 'text-white',
}

type Props = {
  questions: PaletteQuestion[]
  currentIndex: number
  visited: Set<string>
  onSelect: (index: number) => void
}

export default function Palette({ questions, currentIndex, visited, onSelect }: Props) {
  const { t } = useTranslation()

  const statuses = questions.map((q, i) =>
    questionStatus(q, visited.has(q.attemptQuestionId) || i === currentIndex),
  )
  const count = (s: Status) => statuses.filter((x) => x === s).length

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <ul className="mb-4 space-y-2 text-sm text-text">
        {ORDER.map((s) => (
          <li key={s} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={'inline-block h-5 w-5 shrink-0 rounded ' + STYLE[s]}
              style={s === 'markedAnswered' ? { backgroundImage: HALF_AND_HALF } : undefined}
            />
            <span className="flex-1">{t('exam.status.' + s)}</span>
            <span className="font-semibold">{count(s)}</span>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-5 gap-2">
        {questions.map((q, i) => {
          const s = statuses[i]
          const label = t('exam.run.qLabel', { n: i + 1, status: t('exam.status.' + s) })
          return (
            <button
              key={q.attemptQuestionId}
              type="button"
              onClick={() => onSelect(i)}
              aria-label={label}
              title={label}
              aria-current={i === currentIndex ? 'true' : undefined}
              className={
                'grid h-10 place-items-center rounded font-semibold ' +
                STYLE[s] +
                (i === currentIndex ? ' ring-2 ring-brand ring-offset-2' : '')
              }
              style={s === 'markedAnswered' ? { backgroundImage: HALF_AND_HALF } : undefined}
            >
              {i + 1}
            </button>
          )
        })}
      </div>
    </div>
  )
}