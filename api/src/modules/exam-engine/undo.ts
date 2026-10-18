// Pure "undo submit" rules. No database, no HTTP, no clock: the caller passes `now`.
import { z } from 'zod';
import { EngineError, type AttemptRuntime, type SectionRuntime } from './engine';
import type { ProctorState, ProctoringRules } from './proctoring';

const rulesSchema = z.object({
  undoWindowSeconds: z.number().int().min(0).max(600).default(60),
  maxUndos: z.number().int().min(0).max(10).default(2),
  undoPenalty: z.number().int().min(0).max(100).default(10), // integrity points per undo
});
export type SubmissionRules = z.infer<typeof rulesSchema>;

/** Complete rules from whatever the template stores (or nothing). */
export function resolveSubmissionRules(raw: unknown): SubmissionRules {
  const parsed = rulesSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : rulesSchema.parse({});
}

export type UndoReason = 'NOT_SUBMITTED' | 'NOT_MANUAL_SUBMIT' | 'NO_UNDOS_LEFT' | 'WINDOW_OVER' | 'TIME_OVER';

export interface UndoStatus {
  available: boolean;
  reason: UndoReason | null;
  secondsLeft: number;
  undosLeft: number;
}

export interface UndoContext {
  submittedAt: Date | null;
  undosUsed: number;
}

const MESSAGES: Record<UndoReason, string> = {
  NOT_SUBMITTED: 'There is no submitted exam to reopen.',
  NOT_MANUAL_SUBMIT: 'This exam ended because time ran out, so it cannot be reopened.',
  NO_UNDOS_LEFT: 'You have used all your undo chances.',
  WINDOW_OVER: 'The time to undo your submission is over.',
  TIME_OVER: 'The time for this section has already ended.',
};

export function undoStatus(a: AttemptRuntime, ctx: UndoContext, rules: SubmissionRules, now: Date): UndoStatus {
  const undosLeft = Math.max(0, rules.maxUndos - ctx.undosUsed);
  const no = (reason: UndoReason): UndoStatus => ({ available: false, reason, secondsLeft: 0, undosLeft });

  if (a.status !== 'SUBMITTED') return no('NOT_SUBMITTED');

  // Only a submit made by the candidate can be undone, never an automatic time-up
  const section = a.sections.find((s) => s.closeReason === 'SUBMITTED_EARLY');
  if (!section || !ctx.submittedAt) return no('NOT_MANUAL_SUBMIT');

  if (undosLeft === 0) return no('NO_UNDOS_LEFT');

  const windowEnd = ctx.submittedAt.getTime() + rules.undoWindowSeconds * 1000;
  if (now.getTime() >= windowEnd) return no('WINDOW_OVER');

  // No extra time is ever given: the old deadline still applies
  if (!section.deadlineAt || now.getTime() >= section.deadlineAt.getTime()) return no('TIME_OVER');

  return { available: true, reason: null, secondsLeft: Math.ceil((windowEnd - now.getTime()) / 1000), undosLeft };
}

/** Reopens the section that the candidate closed by submitting. Throws if undo is not allowed. */
export function reopenAttempt(a: AttemptRuntime, ctx: UndoContext, rules: SubmissionRules, now: Date): AttemptRuntime {
  const st = undoStatus(a, ctx, rules, now);
  if (st.reason !== null) throw new EngineError(`UNDO_${st.reason}`, MESSAGES[st.reason]);

  return {
    status: 'IN_PROGRESS',
    sections: a.sections.map((s): SectionRuntime =>
      s.closeReason === 'SUBMITTED_EARLY' ? { ...s, state: 'ACTIVE', closedAt: null, closeReason: null } : s,
    ),
  };
}

/** The warning that every undo costs. Would it use up the last warning? Then `terminate` is true. */
export function applyUndoWarning(
  state: ProctorState,
  penalty: number,
  rules: ProctoringRules,
): { warningCount: number; integrityScore: number; terminate: boolean } {
  if (!rules.enabled) return { ...state, terminate: false };

  const integrityScore = Math.max(0, state.integrityScore - penalty);
  const warningCount = state.warningCount + 1;
  return {
    warningCount,
    integrityScore,
    terminate: warningCount >= rules.maxWarnings || integrityScore < rules.minIntegrity,
  };
}