export function classifyWeakness(opts: {
  isCorrect: boolean;
  timeMs: number;
  timeLimitSec: number;
  conceptMastery: number;
  prereqWeak: boolean;
  repeatedMistakes?: number;
}): { type: string; reason: string } {
  if (opts.isCorrect) return { type: "NONE", reason: "Answered correctly." };
  if ((opts.repeatedMistakes ?? 0) >= 2) {
    return {
      type: "PERSISTENT_MISCONCEPTION",
      reason: "This concept has been missed repeatedly; a targeted remediation check is recommended.",
    };
  }
  if (opts.prereqWeak) {
    return {
      type: "PREREQUISITE_GAP",
      reason: "A prerequisite concept is still weak, which often causes this item to fail.",
    };
  }
  if (opts.timeMs > opts.timeLimitSec * 1000 * 0.9) {
    return {
      type: "TIME_PRESSURE",
      reason: "Time was nearly exhausted, suggesting speed or strategy issues rather than only content.",
    };
  }
  if (opts.conceptMastery < 0.4) {
    return {
      type: "CONCEPT_GAP",
      reason: "Low concept mastery suggests the underlying idea is not yet stable.",
    };
  }
  if (opts.conceptMastery >= 0.6) {
    return {
      type: "APPLICATION_GAP",
      reason: "Concept familiarity is moderate-high, but applying it to this item failed.",
    };
  }
  return {
    type: "CARELESS_ERROR",
    reason: "Mastery is mixed; this may be a slip, misread, or incomplete check.",
  };
}

export function dueForReview<T extends { nextReviewAt: Date | null; mastery: number }>(items: T[], limit = 4): T[] {
  const now = Date.now();
  return [...items]
    .sort((a, b) => {
      const da = a.nextReviewAt ? a.nextReviewAt.getTime() : 0;
      const db = b.nextReviewAt ? b.nextReviewAt.getTime() : 0;
      return da - db || a.mastery - b.mastery;
    })
    .filter((i) => !i.nextReviewAt || i.nextReviewAt.getTime() <= now || i.mastery < 0.55)
    .slice(0, limit);
}
