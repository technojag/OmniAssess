import { outcomeOf } from './result'
import type { Outcome, Review } from './result'

// Same shapes as getTiming() and getProctoringLog() in api/src/modules/attempts/
export type Timing = {
  attemptId: string
  sections: {
    position: number
    name: string
    allottedSeconds: number
    usedSeconds: number
    questions: { position: number; seconds: number; visits: number }[]
  }[]
}

export type ProctoringLog = {
  attemptId: string
  status: string
  warningCount: number
  integrityScore: number
  events: { at: string; type: string; kind?: string }[]
}

export type QuestionTime = {
  sectionPosition: number
  sectionName: string
  position: number
  seconds: number
  outcome: Outcome
}

// Joins the review (what happened to each question) with the timing (how long it took)
export function joinTimes(timing: Timing, review: Review): QuestionTime[] {
  const out: QuestionTime[] = []
  for (const sec of review.sections) {
    const timed = timing.sections.find((s) => s.position === sec.position)
    for (const q of sec.questions) {
      const seconds = timed?.questions.find((x) => x.position === q.position)?.seconds ?? 0
      out.push({
        sectionPosition: sec.position,
        sectionName: sec.name,
        position: q.position,
        seconds,
        outcome: outcomeOf(q),
      })
    }
  }
  return out
}