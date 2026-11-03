import { prisma } from '../../db';
import { AppError } from '../../lib/errors';
import { getSummary } from './attempts.result';

type Summary = Awaited<ReturnType<typeof getSummary>>;

type Snapshot = {
  score: number;
  maxScore: number;
  attempted: number;
  correct: number;
  wrong: number;
  unattempted: number;
  total: number;
};

type SectionCounts = {
  correct: number;
  wrong: number;
  unattempted: number;
  questionCount: number;
};

function snapshot(s: Summary): Snapshot {
  return {
    score: Number(s.score),
    maxScore: Number(s.maxScore),
    attempted: s.attempted,
    correct: s.correct,
    wrong: s.wrong,
    unattempted: s.unattempted,
    total: s.totalQuestions,
  };
}

function countsFor(s: Summary, position: number): SectionCounts | null {
  const found = s.sections.find((sec) => sec.position === position);
  if (!found) return null;
  return {
    correct: found.correct,
    wrong: found.wrong,
    unattempted: found.unattempted,
    questionCount: found.questionCount,
  };
}

/**
 * Compares this attempt with the student's previous finished attempt of the SAME exam
 * (same template, same practice/real kind, started earlier). Numbers only, no answer key.
 */
export async function getComparison(userId: string, attemptId: string) {
  // Reuses the summary rules: 404 if not theirs, 409 while running, hidden during the undo window
  const currentSummary = await getSummary(userId, attemptId);

  const current = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    select: {
      startedAt: true,
      isPractice: true,
      templateVersion: { select: { templateId: true } },
      sections: {
        orderBy: { position: 'asc' },
        select: { position: true, examSection: { select: { name: true } } },
      },
    },
  });
  if (!current) throw new AppError(404, 'ATTEMPT_NOT_FOUND', 'Attempt not found.');

  const previousRow = await prisma.examAttempt.findFirst({
    where: {
      userId,
      id: { not: attemptId },
      status: { in: ['SUBMITTED', 'EXPIRED'] },
      isPractice: current.isPractice,
      startedAt: { lt: current.startedAt },
      templateVersion: { templateId: current.templateVersion.templateId },
    },
    orderBy: { startedAt: 'desc' },
    select: { id: true, startedAt: true, submittedAt: true },
  });

  const previousSummary = previousRow ? await getSummary(userId, previousRow.id) : null;

  return {
    hasPrevious: previousSummary !== null,
    previousAttemptId: previousRow?.id ?? null,
    previousAt: previousRow ? (previousRow.submittedAt ?? previousRow.startedAt) : null,
    current: snapshot(currentSummary),
    previous: previousSummary ? snapshot(previousSummary) : null,
    sections: current.sections.map((s) => ({
      position: s.position,
      name: s.examSection.name,
      current: countsFor(currentSummary, s.position),
      previous: previousSummary ? countsFor(previousSummary, s.position) : null,
    })),
  };
}