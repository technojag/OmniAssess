import { describe, expect, it } from 'vitest';
import {
  EngineError,
  resolveExpiry,
  startAttempt,
  submitAttempt,
  terminateAttempt,
  type SectionConfig,
} from './engine';
import { resolveRules } from './proctoring';
import { applyUndoWarning, reopenAttempt, resolveSubmissionRules, undoStatus } from './undo';

const T0 = new Date('2026-01-01T10:00:00Z');
const at = (s: number) => new Date(T0.getTime() + s * 1000);
const one: SectionConfig[] = [{ position: 1, durationSeconds: 900, allowReturnToPrevious: false }];
const submitted = (t: number) => submitAttempt(startAttempt(one, T0), at(t));
const rules = resolveSubmissionRules(undefined);
const ctx = (t: number, used = 0) => ({ submittedAt: at(t), undosUsed: used });
const codeOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return (e as EngineError).code;
  }
  return null;
};

describe('undo submit', () => {
  it('uses 60 seconds and 2 undos by default, and lets the template change them', () => {
    expect(rules).toEqual({ undoWindowSeconds: 60, maxUndos: 2, undoPenalty: 10 });
    expect(resolveSubmissionRules({ maxUndos: 1 })).toEqual({ undoWindowSeconds: 60, maxUndos: 1, undoPenalty: 10 });
  });

  it('is available inside the window and shows the seconds that are left', () => {
    expect(undoStatus(submitted(300), ctx(300), rules, at(330))).toEqual({
      available: true,
      reason: null,
      secondsLeft: 30,
      undosLeft: 2,
    });
  });

  it('reopens the section with the same old deadline (no extra time)', () => {
    const r = reopenAttempt(submitted(300), ctx(300), rules, at(330));
    expect(r.status).toBe('IN_PROGRESS');
    expect(r.sections[0].state).toBe('ACTIVE');
    expect(r.sections[0].deadlineAt).toEqual(at(900));
    expect(r.sections[0].closedAt).toBeNull();
    expect(r.sections[0].closeReason).toBeNull();
  });

  it('is not available once the window is over', () => {
    expect(undoStatus(submitted(300), ctx(300), rules, at(361)).reason).toBe('WINDOW_OVER');
    expect(codeOf(() => reopenAttempt(submitted(300), ctx(300), rules, at(361)))).toBe('UNDO_WINDOW_OVER');
  });

  it('is not available when time ran out and the exam submitted itself', () => {
    const auto = resolveExpiry(startAttempt(one, T0), at(900));
    expect(auto.status).toBe('SUBMITTED');
    expect(undoStatus(auto, ctx(900), rules, at(910)).reason).toBe('NOT_MANUAL_SUBMIT');
  });

  it('is not available when all undo chances are used', () => {
    const s = undoStatus(submitted(300), ctx(300, 2), rules, at(310));
    expect(s.reason).toBe('NO_UNDOS_LEFT');
    expect(s.undosLeft).toBe(0);
  });

  it('is not available once the section deadline has passed', () => {
    expect(undoStatus(submitted(880), ctx(880), rules, at(900)).reason).toBe('TIME_OVER');
  });

  it('is not available when the exam is still running or was terminated', () => {
    const running = startAttempt(one, T0);
    expect(undoStatus(running, { submittedAt: null, undosUsed: 0 }, rules, at(10)).reason).toBe('NOT_SUBMITTED');
    const ended = terminateAttempt(running, at(10));
    expect(undoStatus(ended, { submittedAt: null, undosUsed: 0 }, rules, at(20)).reason).toBe('NOT_SUBMITTED');
  });

  it('costs one warning and integrity, and says when it would use up the last warning', () => {
    const p = resolveRules(undefined);
    expect(applyUndoWarning({ warningCount: 0, integrityScore: 100 }, 10, p)).toEqual({
      warningCount: 1,
      integrityScore: 90,
      terminate: false,
    });
    expect(applyUndoWarning({ warningCount: 2, integrityScore: 90 }, 10, p).terminate).toBe(true);
    expect(applyUndoWarning({ warningCount: 0, integrityScore: 45 }, 10, p).terminate).toBe(true);
    expect(applyUndoWarning({ warningCount: 2, integrityScore: 90 }, 10, resolveRules({ enabled: false }))).toEqual({
      warningCount: 2,
      integrityScore: 90,
      terminate: false,
    });
  });
});