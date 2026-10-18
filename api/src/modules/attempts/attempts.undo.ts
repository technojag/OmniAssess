import { prisma } from '../../db';
import { AppError } from '../../lib/errors';
import { EngineError, type AttemptRuntime } from '../exam-engine/engine';
import { resolveRules } from '../exam-engine/proctoring';
import { applyUndoWarning, reopenAttempt, resolveSubmissionRules, undoStatus } from '../exam-engine/undo';
import { getAttemptView, loadAndSync, toRuntime } from './attempts.service';

async function loadContext(attemptId: string) {
  const row = await prisma.examAttempt.findUniqueOrThrow({
    where: { id: attemptId },
    select: {
      submittedAt: true,
      warningCount: true,
      integrityScore: true,
      templateVersion: { select: { rules: true } },
    },
  });
  // How many undos were already used: counted from the event log, so no extra column is needed
  const undosUsed = await prisma.attemptEvent.count({ where: { attemptId, type: 'SUBMIT_UNDO' } });
  const raw = row.templateVersion.rules as { submission?: unknown; proctoring?: unknown } | null;

  return {
    row,
    undosUsed,
    submission: resolveSubmissionRules(raw?.submission),
    proctoring: resolveRules(raw?.proctoring),
  };
}

/** Is undo possible right now, and for how long? */
export async function getUndoState(userId: string, attemptId: string) {
  const now = new Date();
  const attempt = await loadAndSync(userId, attemptId, now);
  const c = await loadContext(attemptId);
  const status = undoStatus(
    toRuntime(attempt),
    { submittedAt: c.row.submittedAt, undosUsed: c.undosUsed },
    c.submission,
    now,
  );

  return {
    attempt: { id: attemptId, status: attempt.status, submittedAt: c.row.submittedAt },
    undo: { ...status, maxUndos: c.submission.maxUndos },
  };
}

/** Results stay hidden while the candidate can still undo, so nobody can peek at the score first. */
export async function assertResultsVisible(userId: string, attemptId: string) {
  const s = await getUndoState(userId, attemptId);
  if (s.undo.available) {
    throw new AppError(
      409,
      'UNDO_WINDOW_OPEN',
      `You can still undo your submission. Results open in ${s.undo.secondsLeft} seconds.`,
    );
  }
}

export async function undoSubmit(userId: string, attemptId: string) {
  const now = new Date();
  const attempt = await loadAndSync(userId, attemptId, now);
  const c = await loadContext(attemptId);
  const before = toRuntime(attempt);

  // The engine decides whether undo is allowed
  let after: AttemptRuntime;
  try {
    after = reopenAttempt(before, { submittedAt: c.row.submittedAt, undosUsed: c.undosUsed }, c.submission, now);
  } catch (e) {
    if (e instanceof EngineError) throw new AppError(409, e.code, e.message);
    throw e;
  }

  const w = applyUndoWarning(
    { warningCount: c.row.warningCount, integrityScore: c.row.integrityScore },
    c.submission.undoPenalty,
    c.proctoring,
  );
  if (w.terminate) {
    throw new AppError(409, 'UNDO_WOULD_END_EXAM', 'Undo is not possible because it would use your last warning.');
  }

  const reopened = after.sections.filter((s, i) => s !== before.sections[i]).map((s) => s.position);

  await prisma.$transaction(
    async (tx) => {
      // Only succeeds if nothing changed since we read it, so two undo clicks cannot both win
      const flipped = await tx.examAttempt.updateMany({
        where: {
          id: attemptId,
          status: 'SUBMITTED',
          warningCount: c.row.warningCount,
          integrityScore: c.row.integrityScore,
        },
        data: {
          status: 'IN_PROGRESS',
          submittedAt: null,
          score: null,
          maxScore: null,
          warningCount: w.warningCount,
          integrityScore: w.integrityScore,
        },
      });
      if (flipped.count !== 1) throw new AppError(409, 'BUSY', 'Please try again.');

      await tx.attemptSection.updateMany({
        where: { attemptId, position: { in: reopened } },
        data: { state: 'ACTIVE', closedAt: null, closeReason: null },
      });
      await tx.attemptEvent.create({
        data: {
          attemptId,
          type: 'SUBMIT_UNDO',
          payload: { warning: c.proctoring.enabled, penalty: c.proctoring.enabled ? c.submission.undoPenalty : 0 },
        },
      });
    },
    { timeout: 15000, maxWait: 10000 },
  );

  return {
    undone: true,
    undosLeft: Math.max(0, c.submission.maxUndos - c.undosUsed - 1),
    ...(await getAttemptView(userId, attemptId)),
  };
}