import { describe, expect, it } from 'vitest';
import { computeQuestionTimes } from './timing';

const T0 = new Date('2026-01-01T10:00:00Z');
const at = (s: number) => new Date(T0.getTime() + s * 1000);
const qs = [1, 2, 3].map((n) => ({ attemptQuestionId: `q${n}`, position: n }));
const run = (views: { attemptQuestionId: string; at: Date }[], end = 100) =>
  computeQuestionTimes({ startedAt: T0, endedAt: at(end), questions: qs, views });

describe('time per question', () => {
  it('gives the whole section to the first question when nothing else is opened', () => {
    const r = run([]);
    expect(r.map((x) => x.seconds)).toEqual([100, 0, 0]);
    expect(r.map((x) => x.visits)).toEqual([1, 0, 0]);
  });

  it('splits time between questions and counts revisits', () => {
    const r = run([
      { attemptQuestionId: 'q2', at: at(30) },
      { attemptQuestionId: 'q1', at: at(80) },
    ]);
    expect(r.map((x) => x.seconds)).toEqual([50, 50, 0]); // q1: 30 + 20, q2: 50
    expect(r.map((x) => x.visits)).toEqual([2, 1, 0]);
  });

  it('does not count repeated events for the same question as new visits', () => {
    const r = run([
      { attemptQuestionId: 'q1', at: at(0) },
      { attemptQuestionId: 'q1', at: at(10) },
      { attemptQuestionId: 'q2', at: at(40) },
    ]);
    expect(r.map((x) => x.seconds)).toEqual([40, 60, 0]);
    expect(r.map((x) => x.visits)).toEqual([1, 1, 0]);
  });

  it('ignores events at or after the end of the section', () => {
    const r = run([{ attemptQuestionId: 'q2', at: at(120) }]);
    expect(r.map((x) => x.seconds)).toEqual([100, 0, 0]);
  });

  it('ignores unknown questions and clamps events that are earlier than the start', () => {
    const r = run([
      { attemptQuestionId: 'q9', at: at(50) },
      { attemptQuestionId: 'q2', at: at(-5) },
    ]);
    expect(r.map((x) => x.seconds)).toEqual([0, 100, 0]);
  });
});