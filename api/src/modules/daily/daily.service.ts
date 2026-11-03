import { createHash } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../../db';
import { AppError } from '../../lib/errors';

export const DAILY_COUNT = 5;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export const checkBody = z.object({
  questionId: z.string().uuid('Invalid question id'),
  optionId: z.string().uuid('Invalid option id'),
});

// The date in India time for any moment, like "2026-11-03"
export function istDayKey(date: Date = new Date()): string {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

function scoreFor(dateKey: string, questionId: string): string {
  return createHash('sha256').update(dateKey + ':' + questionId).digest('hex');
}

// Same 5 questions all day, different ones the next day.
async function pickTodayIds(dateKey: string): Promise<string[]> {
  const rows = await prisma.question.findMany({
    where: { status: 'APPROVED' },
    select: { id: true },
    orderBy: { id: 'asc' },
  });
  return rows
    .map((r) => ({ id: r.id, score: scoreFor(dateKey, r.id) }))
    .sort((a, b) => (a.score < b.score ? -1 : a.score > b.score ? 1 : 0))
    .slice(0, DAILY_COUNT)
    .map((r) => r.id);
}

/** Today's questions WITHOUT the answer key. */
export async function getDaily() {
  const date = istDayKey();
  const ids = await pickTodayIds(date);
  if (ids.length === 0) return { date, questions: [] };

  const rows = await prisma.question.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      stem: true,
      subject: { select: { name: true } },
      topic: { select: { name: true } },
      options: { orderBy: { position: 'asc' }, select: { id: true, text: true } },
    },
  });

  // keep the same order as the picked ids
  const byId = new Map(rows.map((r) => [r.id, r]));
  const questions = ids
    .map((id) => byId.get(id))
    .filter((q): q is NonNullable<typeof q> => q !== undefined)
    .map((q) => ({
      id: q.id,
      subject: q.subject.name,
      topic: q.topic?.name ?? null,
      stem: q.stem,
      options: q.options,
    }));

  return { date, questions };
}

/** Checks one answer and remembers that the student answered it today. */
export async function checkDaily(userId: string, input: z.infer<typeof checkBody>) {
  const day = istDayKey();
  const ids = await pickTodayIds(day);
  if (!ids.includes(input.questionId)) {
    throw new AppError(404, 'QUESTION_NOT_FOUND', "This question is not in today's challenge.");
  }

  const q = await prisma.question.findUnique({
    where: { id: input.questionId },
    select: {
      explanation: true,
      options: { select: { id: true, isCorrect: true } },
    },
  });
  if (!q) throw new AppError(404, 'QUESTION_NOT_FOUND', 'Question not found.');

  if (!q.options.some((o) => o.id === input.optionId)) {
    throw new AppError(400, 'INVALID_OPTION', 'That option does not belong to this question.');
  }

  const correctOptionId = q.options.find((o) => o.isCorrect)?.id ?? null;
  const correct = correctOptionId === input.optionId;

  // One row per student, day and question: checking again the same day does not count twice
  await prisma.dailyAnswer.upsert({
    where: { userId_day_questionId: { userId, day, questionId: input.questionId } },
    create: { userId, day, questionId: input.questionId, correct },
    update: {},
  });

  return { correct, correctOptionId, explanation: q.explanation };
}