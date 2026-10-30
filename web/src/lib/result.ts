// Same shapes as getSummary() and getReview() in api/src/modules/attempts/attempts.result.ts
export type SectionResult = {
  position: number
  name: string
  correct: number
  wrong: number
  unattempted: number
  questionCount: number
  attempted: number
  score?: number
  maxScore?: number
}

export type Summary = {
  attempt: { id: string; status: 'SUBMITTED' | 'TERMINATED' | 'EXPIRED'; startedAt: string; submittedAt: string | null }
  score: number
  maxScore: number
  totalQuestions: number
  attempted: number
  correct: number
  wrong: number
  unattempted: number
  sections: SectionResult[]
}

export type ReviewQuestion = {
  position: number
  stem: string
  explanation: string | null
  options: { id: string; text: string }[]
  selectedOptionId: string | null
  correctOptionId: string | null
  markedForReview: boolean
}

export type Review = {
  attemptId: string
  sections: { position: number; name: string; questions: ReviewQuestion[] }[]
}

export type Outcome = 'correct' | 'wrong' | 'unattempted'

export function outcomeOf(q: Pick<ReviewQuestion, 'selectedOptionId' | 'correctOptionId'>): Outcome {
  if (!q.selectedOptionId) return 'unattempted'
  return q.selectedOptionId === q.correctOptionId ? 'correct' : 'wrong'
}

// 7.5 stays 7.5, 7.000000001 becomes 7
export function formatNumber(n: number) {
  return String(Number(n.toFixed(2)))
}

export function accuracyPercent(correct: number, attempted: number) {
  return attempted > 0 ? Math.round((correct / attempted) * 100) : 0
}