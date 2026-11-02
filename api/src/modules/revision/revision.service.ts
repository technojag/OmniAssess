import { z } from 'zod';
import { prisma } from '../../db';
import { AppError } from '../../lib/errors';
import { loadAndSync } from '../attempts/attempts.service';
import { assertResultsVisible } from '../attempts/attempts.undo';

export const addBody = z.object({
  attemptId: z.string().uuid('Invalid attempt id'),
  questionId: z.string().uuid('Invalid question id'),
});

export const mistakesBody = z.object({
  attemptId: z.string().uuid('Invalid attempt id'),
  includeSkipped: z.boolean().default(false),
});

export const questionParam = z.object({ questionId: z.string().uuid('Invalid question id') });

// Questions can only be saved from an attempt that belongs to this student and has ended,
// so the answer key never leaks while an exam is still running.
async function assertFinishedAttempt(userId: string, attemptId: string) {
  const attempt = await loadAndSync(userId, attemptId); // 404 if the attempt is not theirs
  if (attempt.status === 'IN_PROGRESS') {
    throw new AppError(409, 'ATTEMPT_IN_PROGRESS', 'You can save questions after the exam ends.');
  }
  await assertResultsVisible(userId, attemptId);
}

export async function addQuestion(userId: string, input: z.infer<typeof addBody>) {
  await assertFinishedAttempt(userId, input.attemptId);

  const inAttempt = await prisma.attemptQuestion.findFirst({
    where: { attemptId: input.attemptId, questionId: input.questionId },
    select: { id: true },
  });
  if (!inAttempt) throw new AppError(404, 'QUESTION_NOT_FOUND', 'This question was not in that exam.');

  await prisma.revisionItem.upsert({
    where: { userId_questionId: { userId, questionId: input.questionId } },
    create: { userId, questionId: input.questionId },
    update: {},
  });
  return { added: true };
}

/** Saves the questions the student got wrong (and, if asked, the ones left blank) in one attempt. */
export async function addMistakes(userId: string, input: z.infer<typeof mistakesBody>) {
  await assertFinishedAttempt(userId, input.attemptId);

  const items = await prisma.attemptQuestion.findMany({
    where: { attemptId: input.attemptId },
    select: {
      questionId: true,
      response: { select: { selectedOptionId: true } },
      question: { select: { options: { select: { id: true, isCorrect: true } } } },
    },
  });

  const ids = items
    .filter((i) => {
      const picked = i.response?.selectedOptionId ?? null;
      if (picked === null) return input.includeSkipped;
      return !i.question.options.some((o) => o.id === picked && o.isCorrect);
    })
    .map((i) => i.questionId);

  const done = ids.length
    ? await prisma.revisionItem.createMany({
        data: ids.map((questionId) => ({ userId, questionId })),
        skipDuplicates: true,
      })
    : { count: 0 };

  return { added: done.count, total: ids.length };
}

export async function removeQuestion(userId: string, questionId: string) {
  const done = await prisma.revisionItem.deleteMany({ where: { userId, questionId } });
  return { removed: done.count };
}

/** The student's own saved questions, with the correct answer (they have already seen it in the review). */
export async function listRevision(userId: string) {
  const rows = await prisma.revisionItem.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      createdAt: true,
      question: {
        select: {
          id: true,
          stem: true,
          explanation: true,
          subject: { select: { name: true } },
          topic: { select: { name: true } },
          options: { orderBy: { position: 'asc' }, select: { id: true, text: true, isCorrect: true } },
        },
      },
    },
  });

  return {
    items: rows.map((r) => ({
      questionId: r.question.id,
      addedAt: r.createdAt,
      subject: r.question.subject.name,
      topic: r.question.topic?.name ?? null,
      stem: r.question.stem,
      explanation: r.question.explanation,
      options: r.question.options.map((o) => ({ id: o.id, text: o.text })),
      correctOptionId: r.question.options.find((o) => o.isCorrect)?.id ?? null,
    })),
  };
}