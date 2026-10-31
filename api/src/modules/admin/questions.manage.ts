import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../db';
import { AppError } from '../../lib/errors';

const PAGE_SIZE = 25;
const statusEnum = z.enum(['APPROVED', 'DRAFT', 'RETIRED']);

export const idParam = z.object({ id: z.string().uuid('Invalid question id') });

export const listQuery = z.object({
  subjectId: z.string().uuid().optional(),
  status: statusEnum.optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});

export const statusBody = z.object({ status: statusEnum });

export const bulkBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
  status: statusEnum,
});

const optionText = z
  .string()
  .trim()
  .min(1, 'Every option needs text')
  .max(300, 'An option is too long (max 300 characters)');

export const editBody = z.object({
  stem: z.string().trim().min(1, 'The question is empty').max(1000, 'The question is too long (max 1000 characters)'),
  explanation: z.string().trim().max(2000, 'The solution is too long (max 2000 characters)').optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  topic: z.string().trim().max(60, 'The topic is too long (max 60 characters)').optional(),
  options: z.array(z.object({ text: optionText })).length(4, 'A question needs exactly 4 options'),
  correctIndex: z.number().int().min(0).max(3),
});

// A question can go into exams only if it has at least 2 options and exactly one correct answer
const isReady = (options: { isCorrect: boolean }[]) =>
  options.length >= 2 && options.filter((o) => o.isCorrect).length === 1;

export async function listQuestions(query: z.infer<typeof listQuery>) {
  const where: Prisma.QuestionWhereInput = {
    ...(query.subjectId ? { subjectId: query.subjectId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.q ? { stem: { contains: query.q, mode: 'insensitive' } } : {}),
  };

  const [total, rows, subjects, grouped] = await Promise.all([
    prisma.question.count({ where }),
    prisma.question.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: (query.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        stem: true,
        status: true,
        difficulty: true,
        explanation: true,
        subject: { select: { name: true } },
        topic: { select: { name: true } },
      },
    }),
    prisma.subject.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.question.groupBy({ by: ['subjectId', 'status'], _count: { _all: true } }),
  ]);

  return {
    total,
    page: query.page,
    pageSize: PAGE_SIZE,
    subjects,
    counts: grouped.map((g) => ({ subjectId: g.subjectId, status: g.status, n: g._count._all })),
    items: rows.map((r) => ({
      id: r.id,
      stem: r.stem,
      status: r.status,
      difficulty: r.difficulty,
      hasSolution: !!r.explanation,
      subject: r.subject.name,
      topic: r.topic?.name ?? null,
    })),
  };
}

export async function getQuestion(id: string) {
  const q = await prisma.question.findUnique({
    where: { id },
    select: {
      id: true,
      stem: true,
      explanation: true,
      difficulty: true,
      status: true,
      subject: { select: { id: true, name: true } },
      topic: { select: { name: true } },
      options: { orderBy: { position: 'asc' }, select: { id: true, position: true, text: true, isCorrect: true } },
    },
  });
  if (!q) throw new AppError(404, 'QUESTION_NOT_FOUND', 'Question not found.');

  // How many exam attempts already contain this question
  const usedCount = await prisma.attemptQuestion.count({ where: { questionId: id } });
  return { question: { ...q, topic: q.topic?.name ?? null, usedCount } };
}

export async function setStatus(id: string, status: z.infer<typeof statusEnum>) {
  const q = await prisma.question.findUnique({ where: { id }, select: { options: { select: { isCorrect: true } } } });
  if (!q) throw new AppError(404, 'QUESTION_NOT_FOUND', 'Question not found.');

  if (status === 'APPROVED' && !isReady(q.options)) {
    throw new AppError(
      409,
      'QUESTION_INVALID',
      'This question needs at least 2 options and exactly one correct answer before it can be approved.',
    );
  }
  await prisma.question.update({ where: { id }, data: { status } });
  return { id, status };
}

export async function bulkStatus(input: z.infer<typeof bulkBody>) {
  let ids = input.ids;

  if (input.status === 'APPROVED') {
    const rows = await prisma.question.findMany({
      where: { id: { in: ids } },
      select: { id: true, options: { select: { isCorrect: true } } },
    });
    ids = rows.filter((r) => isReady(r.options)).map((r) => r.id);
  }

  const done = await prisma.question.updateMany({ where: { id: { in: ids } }, data: { status: input.status } });
  return { updated: done.count, skipped: input.ids.length - done.count };
}

export async function updateQuestion(id: string, input: z.infer<typeof editBody>) {
  const q = await prisma.question.findUnique({
    where: { id },
    select: {
      subjectId: true,
      options: { orderBy: { position: 'asc' }, select: { id: true, isCorrect: true } },
    },
  });
  if (!q) throw new AppError(404, 'QUESTION_NOT_FOUND', 'Question not found.');
  if (q.options.length !== 4) {
    throw new AppError(409, 'OPTIONS_UNSUPPORTED', 'Only questions with 4 options can be edited here.');
  }

  const texts = input.options.map((o) => o.text);
  if (new Set(texts.map((t) => t.toLowerCase())).size !== 4) {
    throw new AppError(400, 'OPTIONS_SAME', 'Two options are the same.');
  }

  // A question that is already in exam attempts keeps its correct answer, so old results never change
  const currentCorrect = q.options.findIndex((o) => o.isCorrect);
  const used = await prisma.attemptQuestion.count({ where: { questionId: id } });
  if (used > 0 && input.correctIndex !== currentCorrect) {
    throw new AppError(
      409,
      'QUESTION_IN_USE',
      'This question was already used in exams, so its correct answer cannot be changed. Retire it and import a corrected question instead.',
    );
  }

  const clash = await prisma.question.findFirst({
    where: { subjectId: q.subjectId, stem: input.stem, NOT: { id } },
    select: { id: true },
  });
  if (clash) throw new AppError(409, 'DUPLICATE_QUESTION', 'Another question in this subject has the same text.');

  let topicId: string | null = null;
  if (input.topic) {
    const found = await prisma.topic.findFirst({
      where: { subjectId: q.subjectId, name: { equals: input.topic, mode: 'insensitive' } },
      select: { id: true },
    });
    const topic =
      found ?? (await prisma.topic.create({ data: { subjectId: q.subjectId, name: input.topic }, select: { id: true } }));
    topicId = topic.id;
  }

  await prisma.$transaction([
    prisma.question.update({
      where: { id },
      data: {
        stem: input.stem,
        explanation: input.explanation ? input.explanation : null,
        difficulty: input.difficulty,
        topicId,
      },
    }),
    ...q.options.map((o, i) =>
      prisma.questionOption.update({
        where: { id: o.id },
        data: { text: texts[i], isCorrect: i === input.correctIndex },
      }),
    ),
  ]);

  return getQuestion(id);
}