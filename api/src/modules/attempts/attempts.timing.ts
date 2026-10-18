import { z } from 'zod';
import { prisma } from '../../db';
import { AppError } from '../../lib/errors';
import { canViewSection } from '../exam-engine/engine';
import { computeQuestionTimes } from '../exam-engine/timing';
import { loadAndSync, toRuntime } from './attempts.service';

export const viewEventSchema = z.object({
  attemptQuestionId: z.string().uuid('Invalid question id'),
});

/** The candidate opened a question. The time is taken from the server clock, not from the browser. */
export async function recordQuestionView(userId: string, attemptId: string, attemptQuestionId: string) {
  const now = new Date();
  const attempt = await loadAndSync(userId, attemptId, now);

  const item = await prisma.attemptQuestion.findFirst({
    where: { id: attemptQuestionId, attemptId },
    select: { attemptSection: { select: { position: true } } },
  });
  if (!item) throw new AppError(404, 'QUESTION_NOT_FOUND', 'Question not found in this exam.');

  const decision = canViewSection(toRuntime(attempt), item.attemptSection.position, now);
  if (!decision.allowed) {
    throw new AppError(409, decision.code, 'This question cannot be recorded right now.');
  }
  if (decision.readOnly) return { recorded: false }; // reviewing a closed section: not counted

  await prisma.attemptEvent.create({
    data: { attemptId, type: 'QUESTION_VIEW', payload: { attemptQuestionId } },
  });
  return { recorded: true };
}

/** Time spent per section and per question. Only after the exam has ended. */
export async function getTiming(userId: string, attemptId: string) {
  const attempt = await loadAndSync(userId, attemptId);
  if (attempt.status === 'IN_PROGRESS') {
    throw new AppError(409, 'ATTEMPT_IN_PROGRESS', 'Timing is available after the exam ends.');
  }

  const [items, events] = await Promise.all([
    prisma.attemptQuestion.findMany({
      where: { attemptId },
      select: { id: true, position: true, attemptSectionId: true },
    }),
    prisma.attemptEvent.findMany({
      where: { attemptId, type: 'QUESTION_VIEW' },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true, payload: true },
    }),
  ]);

  const views = events.flatMap((e) => {
    const id = (e.payload as unknown as { attemptQuestionId?: unknown } | null)?.attemptQuestionId;
    return typeof id === 'string' ? [{ attemptQuestionId: id, at: e.createdAt }] : [];
  });

  return {
    attemptId,
    sections: attempt.sections.map((s) => {
      const questions = items
        .filter((i) => i.attemptSectionId === s.id)
        .map((i) => ({ attemptQuestionId: i.id, position: i.position }));

      // A section that never started (for example, the exam was terminated earlier) has no time
      if (!s.startedAt) {
        return {
          position: s.position,
          name: s.examSection.name,
          allottedSeconds: s.examSection.durationSeconds,
          usedSeconds: 0,
          questions: questions
            .sort((a, b) => a.position - b.position)
            .map((q) => ({ position: q.position, seconds: 0, visits: 0 })),
        };
      }

      const endedAt = s.closedAt ?? s.startedAt;
      const times = computeQuestionTimes({ startedAt: s.startedAt, endedAt, questions, views });
      return {
        position: s.position,
        name: s.examSection.name,
        allottedSeconds: s.examSection.durationSeconds,
        usedSeconds: Math.max(0, Math.round((endedAt.getTime() - s.startedAt.getTime()) / 1000)),
        questions: times.map(({ position, seconds, visits }) => ({ position, seconds, visits })),
      };
    }),
  };
}