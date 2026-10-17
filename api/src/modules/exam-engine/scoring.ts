// Pure scoring. Marks are counted in hundredths (0.25 -> 25) so decimals never drift.

export type Outcome = 'CORRECT' | 'WRONG' | 'UNATTEMPTED';

export interface ScoringQuestion {
  attemptQuestionId: string;
  selectedOptionId: string | null;
  correctOptionId: string | null;
}

export interface ScoringSection {
  position: number;
  name: string;
  marksPerQuestion: number;
  negativeMarks: number;
  questions: ScoringQuestion[];
}

export interface SectionScore {
  position: number;
  name: string;
  correct: number;
  wrong: number;
  unattempted: number;
  score: number;
  maxScore: number;
  outcomes: Record<string, Outcome>;
}

export interface ScoreResult {
  score: number;
  maxScore: number;
  correct: number;
  wrong: number;
  unattempted: number;
  accuracy: number; // % of attempted questions that were right
  sections: SectionScore[];
}

const units = (n: number) => Math.round(n * 100);

export function scoreAttempt(sections: ScoringSection[]): ScoreResult {
  let total = 0;
  let max = 0;
  let correct = 0;
  let wrong = 0;
  let unattempted = 0;

  const out = sections.map((s): SectionScore => {
    const mark = units(s.marksPerQuestion);
    const neg = units(s.negativeMarks);
    let c = 0;
    let w = 0;
    let u = 0;
    const outcomes: Record<string, Outcome> = {};

    for (const q of s.questions) {
      let outcome: Outcome;
      if (q.selectedOptionId === null || q.correctOptionId === null) outcome = 'UNATTEMPTED';
      else outcome = q.selectedOptionId === q.correctOptionId ? 'CORRECT' : 'WRONG';
      outcomes[q.attemptQuestionId] = outcome;
      if (outcome === 'CORRECT') c++;
      else if (outcome === 'WRONG') w++;
      else u++;
    }

    const sectionScore = c * mark - w * neg;
    const sectionMax = s.questions.length * mark;
    total += sectionScore;
    max += sectionMax;
    correct += c;
    wrong += w;
    unattempted += u;

    return {
      position: s.position,
      name: s.name,
      correct: c,
      wrong: w,
      unattempted: u,
      score: sectionScore / 100,
      maxScore: sectionMax / 100,
      outcomes,
    };
  });

  return {
    score: total / 100,
    maxScore: max / 100,
    correct,
    wrong,
    unattempted,
    accuracy: correct + wrong === 0 ? 0 : Math.round((correct / (correct + wrong)) * 100),
    sections: out,
  };
}