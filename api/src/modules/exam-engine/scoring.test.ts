import { describe, expect, it } from 'vitest';
import { scoreAttempt, type ScoringSection } from './scoring';

const section = (
  position: number,
  picks: Array<'C' | 'W' | null>,
  marks = 2,
  negative = 0.5,
): ScoringSection => ({
  position,
  name: `Section ${position}`,
  marksPerQuestion: marks,
  negativeMarks: negative,
  questions: picks.map((p, i) => ({
    attemptQuestionId: `s${position}q${i}`,
    selectedOptionId: p === null ? null : p === 'C' ? 'right' : 'wrong',
    correctOptionId: 'right',
  })),
});

describe('scoring', () => {
  it('gives full marks when everything is correct', () => {
    const r = scoreAttempt([section(1, ['C', 'C', 'C', 'C', 'C'])]);
    expect(r.score).toBe(10);
    expect(r.maxScore).toBe(10);
    expect(r.accuracy).toBe(100);
  });

  it('applies negative marking and ignores unattempted questions', () => {
    const r = scoreAttempt([section(1, ['C', 'C', 'C', 'W', null])]);
    expect(r.correct).toBe(3);
    expect(r.wrong).toBe(1);
    expect(r.unattempted).toBe(1);
    expect(r.score).toBe(5.5); // 3 x 2 - 1 x 0.5
    expect(r.maxScore).toBe(10);
    expect(r.accuracy).toBe(75);
  });

  it('can go below zero and stays exact with 0.25 negative marks', () => {
    const r = scoreAttempt([section(1, ['W', 'W', 'W'], 1, 0.25)]);
    expect(r.score).toBe(-0.75);
  });

  it('adds up several sections', () => {
    const r = scoreAttempt([section(1, ['C', 'C']), section(2, ['W', null]), section(3, [null, null])]);
    expect(r.score).toBe(3.5); // 4 - 0.5 + 0
    expect(r.maxScore).toBe(12);
    expect(r.sections.map((s) => s.score)).toEqual([4, -0.5, 0]);
  });

  it('scores an empty attempt as zero', () => {
    const r = scoreAttempt([section(1, [null, null, null, null, null])]);
    expect(r.score).toBe(0);
    expect(r.maxScore).toBe(10);
    expect(r.accuracy).toBe(0);
  });
});