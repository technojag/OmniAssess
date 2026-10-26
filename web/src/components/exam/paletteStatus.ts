export type PaletteQuestion = {
  attemptQuestionId: string
  selectedOptionId: string | null
  markedForReview: boolean
}

export type Status = 'notVisited' | 'notAnswered' | 'answered' | 'marked' | 'markedAnswered'

export function questionStatus(q: PaletteQuestion, seen: boolean): Status {
  const answered = q.selectedOptionId !== null
  if (q.markedForReview && answered) return 'markedAnswered'
  if (q.markedForReview) return 'marked'
  if (answered) return 'answered'
  return seen ? 'notAnswered' : 'notVisited'
}