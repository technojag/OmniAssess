// Pure exam rules. No database, no HTTP, no clock: the caller always passes `now`.
// The server will load state from the DB, call these functions, and save the result.

export type SectionState = 'PENDING' | 'ACTIVE' | 'CLOSED';
export type CloseReason = 'TIME_UP' | 'SUBMITTED_EARLY' | 'TERMINATED';
export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'TERMINATED';

export interface SectionConfig {
  position: number;
  durationSeconds: number;
  allowReturnToPrevious: boolean;
}

export interface SectionRuntime extends SectionConfig {
  state: SectionState;
  startedAt: Date | null;
  deadlineAt: Date | null;
  closedAt: Date | null;
  closeReason: CloseReason | null;
}

export interface AttemptRuntime {
  status: AttemptStatus;
  sections: SectionRuntime[];
}

export type Decision = { allowed: true; readOnly?: boolean } | { allowed: false; code: string };

export class EngineError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

const deny = (code: string): Decision => ({ allowed: false, code });
const addSeconds = (d: Date, s: number) => new Date(d.getTime() + s * 1000);

function activate(s: SectionRuntime, now: Date): SectionRuntime {
  return { ...s, state: 'ACTIVE', startedAt: now, deadlineAt: addSeconds(now, s.durationSeconds) };
}

/** Section 1 starts immediately. Every other section waits for the candidate to continue. */
export function startAttempt(configs: SectionConfig[], now: Date): AttemptRuntime {
  if (configs.length === 0) throw new EngineError('NO_SECTIONS', 'An exam needs at least one section.');

  const sections = [...configs]
    .sort((a, b) => a.position - b.position)
    .map((c): SectionRuntime => ({
      ...c,
      state: 'PENDING',
      startedAt: null,
      deadlineAt: null,
      closedAt: null,
      closeReason: null,
    }));

  sections[0] = activate(sections[0], now);
  return { status: 'IN_PROGRESS', sections };
}

/**
 * Closes any active section whose deadline has passed. Call this before every decision,
 * so the result is correct even if no background job has run yet.
 * When the last section ends, the whole attempt is submitted automatically.
 */
export function resolveExpiry(a: AttemptRuntime, now: Date): AttemptRuntime {
  if (a.status !== 'IN_PROGRESS') return a;

  const sections = a.sections.map((s): SectionRuntime => {
    if (s.state === 'ACTIVE' && s.deadlineAt && now.getTime() >= s.deadlineAt.getTime()) {
      return { ...s, state: 'CLOSED', closedAt: s.deadlineAt, closeReason: 'TIME_UP' };
    }
    return s;
  });

  if (!sections.some((s, i) => s !== a.sections[i])) return a;

  const allClosed = sections.every((s) => s.state === 'CLOSED');
  return { status: allClosed ? 'SUBMITTED' : 'IN_PROGRESS', sections };
}

/** Candidate pressed "Continue" on the transition screen. */
export function continueToNextSection(a: AttemptRuntime, now: Date): AttemptRuntime {
  const r = resolveExpiry(a, now);
  if (r.status !== 'IN_PROGRESS') throw new EngineError('ATTEMPT_ENDED', 'This exam has already ended.');
  if (r.sections.some((s) => s.state === 'ACTIVE')) {
    throw new EngineError('SECTION_STILL_ACTIVE', 'The current section has not ended yet.');
  }

  const next = r.sections.find((s) => s.state === 'PENDING');
  if (!next) throw new EngineError('NO_NEXT_SECTION', 'There is no next section.');

  return {
    ...r,
    sections: r.sections.map((s) => (s.position === next.position ? activate(s, now) : s)),
  };
}

/** Can an answer for this section be saved right now? */
export function canSaveAnswer(a: AttemptRuntime, position: number, now: Date): Decision {
  const r = resolveExpiry(a, now);
  if (r.status !== 'IN_PROGRESS') return deny('ATTEMPT_ENDED');

  const s = r.sections.find((x) => x.position === position);
  if (!s) return deny('SECTION_NOT_FOUND');
  if (s.state === 'PENDING') return deny('SECTION_NOT_STARTED');
  if (s.state === 'CLOSED') return deny('SECTION_LOCKED');
  return { allowed: true };
}

/** Can the candidate see this section's questions right now? */
export function canViewSection(a: AttemptRuntime, position: number, now: Date): Decision {
  const r = resolveExpiry(a, now);
  if (r.status !== 'IN_PROGRESS') return deny('ATTEMPT_ENDED');

  const s = r.sections.find((x) => x.position === position);
  if (!s) return deny('SECTION_NOT_FOUND');
  if (s.state === 'PENDING') return deny('SECTION_NOT_STARTED');
  if (s.state === 'ACTIVE') return { allowed: true };

  // Closed section: viewable (read-only) only if the section the candidate is in allows going back
  const latestStarted = [...r.sections].reverse().find((x) => x.state !== 'PENDING');
  return latestStarted?.allowReturnToPrevious ? { allowed: true, readOnly: true } : deny('SECTION_LOCKED');
}

/** Final submit. Only allowed when no section is still waiting to start. */
export function submitAttempt(a: AttemptRuntime, now: Date): AttemptRuntime {
  const r = resolveExpiry(a, now);
  if (r.status !== 'IN_PROGRESS') throw new EngineError('ATTEMPT_ENDED', 'This exam has already ended.');
  if (r.sections.some((s) => s.state === 'PENDING')) {
    throw new EngineError('SECTIONS_REMAINING', 'Finish the remaining sections before submitting.');
  }

  return {
    status: 'SUBMITTED',
    sections: r.sections.map((s): SectionRuntime =>
      s.state === 'ACTIVE' ? { ...s, state: 'CLOSED', closedAt: now, closeReason: 'SUBMITTED_EARLY' } : s,
    ),
  };
}

/** Proctoring limit reached or admin action: stop the exam immediately. */
export function terminateAttempt(a: AttemptRuntime, now: Date): AttemptRuntime {
  const r = resolveExpiry(a, now);
  if (r.status !== 'IN_PROGRESS') throw new EngineError('ATTEMPT_ENDED', 'This exam has already ended.');

  return {
    status: 'TERMINATED',
    sections: r.sections.map((s): SectionRuntime =>
      s.state === 'ACTIVE' ? { ...s, state: 'CLOSED', closedAt: now, closeReason: 'TERMINATED' } : s,
    ),
  };
}