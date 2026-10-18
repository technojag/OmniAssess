import { describe, expect, it } from 'vitest';
import { applyViolation, resolveRules } from './proctoring';

const T0 = new Date('2026-01-01T10:00:00Z');
const at = (s: number) => new Date(T0.getTime() + s * 1000);
const rules = resolveRules(undefined);
const fresh = { warningCount: 0, integrityScore: 100 };

describe('proctoring rules', () => {
  it('a tab switch removes integrity and adds a warning', () => {
    const d = applyViolation(fresh, 'TAB_SWITCH', at(0), null, rules);
    expect(d).toMatchObject({ counted: true, warningCount: 1, integrityScore: 75, terminate: false });
  });

  it('hands hidden removes integrity but gives no warning', () => {
    const d = applyViolation(fresh, 'HANDS_HIDDEN', at(0), null, rules);
    expect(d).toMatchObject({ counted: true, warningIssued: false, warningCount: 0, integrityScore: 90 });
  });

  it('ignores the same violation inside the cooldown and counts it again afterwards', () => {
    expect(applyViolation(fresh, 'TAB_SWITCH', at(5), at(0), rules)).toEqual({ counted: false, reason: 'COOLDOWN' });
    expect(applyViolation(fresh, 'TAB_SWITCH', at(10), at(0), rules)).toMatchObject({ counted: true });
  });

  it('terminates when the warning limit is reached', () => {
    const d = applyViolation({ warningCount: 2, integrityScore: 90 }, 'FACE_MISSING', at(0), null, rules);
    expect(d).toMatchObject({ counted: true, warningCount: 3, terminate: true, terminateReason: 'MAX_WARNINGS' });
  });

  it('terminates when integrity falls below the minimum, even with few warnings', () => {
    const d = applyViolation({ warningCount: 0, integrityScore: 45 }, 'HANDS_HIDDEN', at(0), null, rules);
    expect(d).toMatchObject({ integrityScore: 35, terminate: true, terminateReason: 'LOW_INTEGRITY' });
  });

  it('never lets integrity go below zero', () => {
    const d = applyViolation({ warningCount: 0, integrityScore: 5 }, 'MULTIPLE_FACES', at(0), null, rules);
    expect(d).toMatchObject({ counted: true, integrityScore: 0 });
  });

  it('does nothing when proctoring is switched off for the exam', () => {
    const off = resolveRules({ enabled: false });
    expect(applyViolation(fresh, 'TAB_SWITCH', at(0), null, off)).toEqual({ counted: false, reason: 'DISABLED' });
  });

  it('lets the template override some numbers and keeps defaults for the rest', () => {
    const r = resolveRules({ maxWarnings: 5, violations: { TAB_SWITCH: { penalty: 30, warning: true } } });
    expect(r.maxWarnings).toBe(5);
    expect(r.violations.TAB_SWITCH.penalty).toBe(30);
    expect(r.violations.FACE_MISSING.penalty).toBe(15);
    expect(r.cooldownSeconds).toBe(10);
  });
});