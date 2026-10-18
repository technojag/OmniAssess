import { z } from 'zod';
import { prisma } from '../../db';
import { AppError } from '../../lib/errors';
import { terminateAttempt } from '../exam-engine/engine';
import { VIOLATION_KINDS, applyViolation, resolveRules } from '../exam-engine/proctoring';
import { loadAndSync, persist, toRuntime } from './attempts.service';

export const violationSchema = z.object({ kind: z.enum(VIOLATION_KINDS) });

/** The browser reports what it saw. The server decides what it means. */
export async function recordViolation(
  userId: string,
  attemptId: string,
  kind: (typeof VIOLATION_KINDS)[number],
) {
  const now = new Date();
  const attempt = await loadAndSync(userId, attemptId, now);
  if (attempt.status !== 'IN_PROGRESS') {
    throw new AppError(409, 'ATTEMPT_ENDED', 'This exam has already ended.');
  }

  // Two reports can arrive at the same moment (for example blur and tab hidden),
  // so the counters are only updated if nobody changed them since we read them.
  for (let tries = 0; tries < 3; tries++) {
    const row = await prisma.examAttempt.findUniqueOrThrow({
      where: { id: attemptId },
      select: {
        status: true,
        warningCount: true,
        integrityScore: true,
        templateVersion: { select: { rules: true } },
      },
    });
    if (row.status !== 'IN_PROGRESS') throw new AppError(409, 'ATTEMPT_ENDED', 'This exam has already ended.');

    const rules = resolveRules((row.templateVersion.rules as { proctoring?: unknown } | null)?.proctoring);
    const last = await prisma.attemptEvent.findFirst({
      where: { attemptId, type: 'PROCTOR_VIOLATION', payload: { path: ['kind'], equals: kind } },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    const d = applyViolation(
      { warningCount: row.warningCount, integrityScore: row.integrityScore },
      kind,
      now,
      last?.createdAt ?? null,
      rules,
    );

    if (!d.counted) {
      return {
        counted: false,
        reason: d.reason,
        warningCount: row.warningCount,
        maxWarnings: rules.maxWarnings,
        integrityScore: row.integrityScore,
        terminated: false,
      };
    }

    const updated = await prisma.examAttempt.updateMany({
      where: {
        id: attemptId,
        status: 'IN_PROGRESS',
        warningCount: row.warningCount,
        integrityScore: row.integrityScore,
      },
      data: { warningCount: d.warningCount, integrityScore: d.integrityScore },
    });
    if (updated.count !== 1) continue; // someone else changed it, read again

    await prisma.attemptEvent.create({
      data: {
        attemptId,
        type: 'PROCTOR_VIOLATION',
        payload: { kind, penalty: d.penalty, warning: d.warningIssued },
      },
    });

    if (d.terminate) {
      const before = toRuntime(attempt);
      await persist(attempt, before, terminateAttempt(before, now));
      await prisma.attemptEvent.create({
        data: { attemptId, type: 'ATTEMPT_TERMINATED', payload: { reason: d.terminateReason } },
      });
    }

    return {
      counted: true,
      kind,
      warningIssued: d.warningIssued,
      warningCount: d.warningCount,
      maxWarnings: rules.maxWarnings,
      integrityScore: d.integrityScore,
      terminated: d.terminate,
      terminateReason: d.terminateReason,
    };
  }

  throw new AppError(409, 'BUSY', 'Please try again.');
}

export async function getProctoringLog(userId: string, attemptId: string) {
  const attempt = await loadAndSync(userId, attemptId);
  const events = await prisma.attemptEvent.findMany({
    where: { attemptId, type: { in: ['PROCTOR_VIOLATION', 'ATTEMPT_TERMINATED'] } },
    orderBy: { createdAt: 'asc' },
    select: { type: true, payload: true, createdAt: true },
  });

  return {
    attemptId,
    status: attempt.status,
    warningCount: attempt.warningCount,
    integrityScore: attempt.integrityScore,
    events: events.map((e) => ({ at: e.createdAt, type: e.type, ...(e.payload as Record<string, unknown>) })),
  };
}