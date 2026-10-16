import { describe, expect, it } from 'vitest';
import {
  EngineError,
  canSaveAnswer,
  canViewSection,
  continueToNextSection,
  resolveExpiry,
  startAttempt,
  submitAttempt,
  terminateAttempt,
  type AttemptRuntime,
  type SectionConfig,
} from './engine';

const T0 = new Date('2026-01-01T10:00:00Z');
const at = (sec: number) => new Date(T0.getTime() + sec * 1000);
const cfg = (n = 4, allowReturn = false): SectionConfig[] =>
  Array.from({ length: n }, (_, i) => ({ position: i + 1, durationSeconds: 900, allowReturnToPrevious: allowReturn }));
const sec = (a: AttemptRuntime, pos: number) => a.sections.find((s) => s.position === pos)!;
const codeOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return (e as EngineError).code;
  }
  return null;
};

describe('exam engine', () => {
  it('starts with section 1 active and the rest pending', () => {
    const a = startAttempt(cfg(), T0);
    expect(a.status).toBe('IN_PROGRESS');
    expect(sec(a, 1).state).toBe('ACTIVE');
    expect(sec(a, 1).deadlineAt).toEqual(at(900));
    expect(sec(a, 2).state).toBe('PENDING');
  });

  it('keeps a section open until its deadline', () => {
    const a = resolveExpiry(startAttempt(cfg(), T0), at(899));
    expect(sec(a, 1).state).toBe('ACTIVE');
  });

  it('closes a section at its deadline and does not start the next one by itself', () => {
    const a = resolveExpiry(startAttempt(cfg(), T0), at(900));
    expect(sec(a, 1).state).toBe('CLOSED');
    expect(sec(a, 1).closeReason).toBe('TIME_UP');
    expect(sec(a, 2).state).toBe('PENDING');
    expect(a.status).toBe('IN_PROGRESS');
  });

  it('cannot continue while the current section is still running', () => {
    const a = startAttempt(cfg(), T0);
    expect(codeOf(() => continueToNextSection(a, at(100)))).toBe('SECTION_STILL_ACTIVE');
  });

  it('starts the next section with a fresh timer from the moment of Continue', () => {
    const a = continueToNextSection(startAttempt(cfg(), T0), at(1000));
    expect(sec(a, 1).state).toBe('CLOSED');
    expect(sec(a, 2).state).toBe('ACTIVE');
    expect(sec(a, 2).startedAt).toEqual(at(1000));
    expect(sec(a, 2).deadlineAt).toEqual(at(1900));
  });

  it('accepts answers for the active section', () => {
    expect(canSaveAnswer(startAttempt(cfg(), T0), 1, at(100))).toEqual({ allowed: true });
  });

  it('rejects answers for a closed section', () => {
    expect(canSaveAnswer(startAttempt(cfg(), T0), 1, at(901))).toEqual({ allowed: false, code: 'SECTION_LOCKED' });
  });

  it('rejects answers for a section that has not started', () => {
    expect(canSaveAnswer(startAttempt(cfg(), T0), 2, at(100))).toEqual({ allowed: false, code: 'SECTION_NOT_STARTED' });
  });

  it('blocks viewing a closed section when going back is not allowed', () => {
    const a = continueToNextSection(startAttempt(cfg(), T0), at(1000));
    expect(canViewSection(a, 1, at(1100))).toEqual({ allowed: false, code: 'SECTION_LOCKED' });
  });

  it('allows read-only viewing of a closed section when going back is allowed', () => {
    const a = continueToNextSection(startAttempt(cfg(4, true), T0), at(1000));
    expect(canViewSection(a, 1, at(1100))).toEqual({ allowed: true, readOnly: true });
  });

  it('does not allow submitting while sections are still pending', () => {
    expect(codeOf(() => submitAttempt(startAttempt(cfg(), T0), at(100)))).toBe('SECTIONS_REMAINING');
  });

  it('allows submitting early from the last section', () => {
    const r = submitAttempt(startAttempt(cfg(1), T0), at(300));
    expect(r.status).toBe('SUBMITTED');
    expect(sec(r, 1).closeReason).toBe('SUBMITTED_EARLY');
    expect(sec(r, 1).closedAt).toEqual(at(300));
  });

  it('runs a full 4-section exam and submits automatically at the end', () => {
    let a = startAttempt(cfg(4), T0);
    let t = 0;
    for (let i = 0; i < 3; i++) {
      t += 900;
      a = continueToNextSection(a, at(t));
    }
    a = resolveExpiry(a, at(3600));
    expect(a.status).toBe('SUBMITTED');
    expect(a.sections.every((s) => s.state === 'CLOSED' && s.closeReason === 'TIME_UP')).toBe(true);
  });

  it('terminates an attempt and rejects later answers', () => {
    const a = terminateAttempt(startAttempt(cfg(), T0), at(200));
    expect(a.status).toBe('TERMINATED');
    expect(sec(a, 1).closeReason).toBe('TERMINATED');
    expect(canSaveAnswer(a, 1, at(201))).toEqual({ allowed: false, code: 'ATTEMPT_ENDED' });
  });

  it('never changes the object it was given', () => {
    const a = startAttempt(cfg(), T0);
    const before = JSON.stringify(a);
    resolveExpiry(a, at(5000));
    expect(JSON.stringify(a)).toBe(before);
  });

  it('never reopens a closed section and never has two active sections (random sequences)', () => {
    let seed = 12345;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    for (let run = 0; run < 200; run++) {
      let a = startAttempt(cfg(4), T0);
      let now = 0;
      const closed = new Set<number>();

      for (let step = 0; step < 30; step++) {
        now += Math.floor(rnd() * 600);
        const t = at(now);
        try {
          const e = Math.floor(rnd() * 3);
          if (e === 0) a = continueToNextSection(a, t);
          else if (e === 1) a = submitAttempt(a, t);
          else a = resolveExpiry(a, t);
        } catch (err) {
          expect(err).toBeInstanceOf(EngineError);
        }

        expect(a.sections.filter((s) => s.state === 'ACTIVE').length).toBeLessThanOrEqual(1);
        for (const s of a.sections) {
          if (closed.has(s.position)) expect(s.state).toBe('CLOSED');
          if (s.state === 'CLOSED') closed.add(s.position);
        }
      }
    }
  });
});