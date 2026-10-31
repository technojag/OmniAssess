import { randomUUID } from 'node:crypto';
import { QuestionSource, type Difficulty, type QuestionStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../db';
import { AppError } from '../../lib/errors';
import { parseCsv } from './csv';

export const importSchema = z.object({
  csv: z.string().min(1).max(1_500_000),
  status: z.enum(['APPROVED', 'DRAFT']).default('DRAFT'),
  // true = only check the file and report, write nothing
  dryRun: z.boolean().default(true),
});

const MAX_ROWS = 500;
const REQUIRED = ['subject', 'question', 'optiona', 'optionb', 'optionc', 'optiond', 'correct'];

// "Option A", "optionA" and "option_a" all become "optiona"
const normHeader = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');

type Parsed = {
  row: number;
  subject: string;
  topic: string | null;
  difficulty: Difficulty;
  stem: string;
  explanation: string | null;
  options: string[];
  correctIndex: number;
};

type Problem = { row: number; kind: 'error' | 'duplicate'; message: string };

function parseRow(cells: Record<string, string>, row: number): { ok: Parsed } | { error: string } {
  const get = (key: string) => (cells[key] ?? '').trim();

  const subject = get('subject');
  if (!subject) return { error: 'subject is empty' };

  const stem = get('question');
  if (!stem) return { error: 'question is empty' };
  if (stem.length > 1000) return { error: 'question is too long (max 1000 characters)' };

  const options = ['optiona', 'optionb', 'optionc', 'optiond'].map(get);
  if (options.some((o) => !o)) return { error: 'one or more options are empty' };
  if (options.some((o) => o.length > 300)) return { error: 'an option is too long (max 300 characters)' };
  if (new Set(options.map((o) => o.toLowerCase())).size !== 4) return { error: 'two options are the same' };

  const letter = get('correct').toUpperCase();
  const correctIndex = letter.length === 1 ? 'ABCD'.indexOf(letter) : -1;
  if (correctIndex < 0) return { error: 'correct must be A, B, C or D' };

  const difficulty = (get('difficulty').toUpperCase() || 'MEDIUM') as Difficulty;
  if (!['EASY', 'MEDIUM', 'HARD'].includes(difficulty)) return { error: 'difficulty must be EASY, MEDIUM or HARD' };

  const topic = get('topic');
  if (topic.length > 60) return { error: 'topic is too long (max 60 characters)' };

  const explanation = get('explanation');
  if (explanation.length > 2000) return { error: 'explanation is too long (max 2000 characters)' };

  return {
    ok: {
      row,
      subject,
      topic: topic || null,
      difficulty,
      stem,
      explanation: explanation || null,
      options,
      correctIndex,
    },
  };
}

export async function listSubjectNames() {
  const rows = await prisma.subject.findMany({ select: { name: true }, orderBy: { name: 'asc' } });
  return rows.map((r) => r.name);
}

export async function importQuestions(input: z.infer<typeof importSchema>) {
  const table = parseCsv(input.csv);
  if (table.length < 2) {
    throw new AppError(400, 'CSV_EMPTY', 'The file needs a header row and at least one question.');
  }

  const header = table[0].map(normHeader);
  const missing = REQUIRED.filter((h) => !header.includes(h));
  if (missing.length > 0) {
    throw new AppError(400, 'CSV_HEADER', 'Missing column(s): ' + missing.join(', ') + '.');
  }

  const body = table.slice(1);
  if (body.length > MAX_ROWS) {
    throw new AppError(400, 'CSV_TOO_BIG', 'Import at most ' + MAX_ROWS + ' questions at a time.');
  }

  const subjects = await prisma.subject.findMany({ select: { id: true, name: true } });
  const subjectByName = new Map(subjects.map((s) => [s.name.toLowerCase(), s]));

  const problems: Problem[] = [];
  const good: (Parsed & { subjectId: string })[] = [];

  body.forEach((cells, i) => {
    const row = i + 2; // row 1 is the header
    const values: Record<string, string> = {};
    header.forEach((h, c) => {
      values[h] = cells[c] ?? '';
    });

    const parsed = parseRow(values, row);
    if ('error' in parsed) {
      problems.push({ row, kind: 'error', message: parsed.error });
      return;
    }
    const subject = subjectByName.get(parsed.ok.subject.toLowerCase());
    if (!subject) {
      problems.push({
        row,
        kind: 'error',
        message: 'unknown subject "' + parsed.ok.subject + '". Use one of: ' + subjects.map((s) => s.name).join(', '),
      });
      return;
    }
    good.push({ ...parsed.ok, subjectId: subject.id });
  });

  // Skip questions that already exist (same subject and same text), also inside the file itself
  const existing =
    good.length === 0
      ? []
      : await prisma.question.findMany({
          where: {
            subjectId: { in: [...new Set(good.map((g) => g.subjectId))] },
            stem: { in: [...new Set(good.map((g) => g.stem))] },
          },
          select: { subjectId: true, stem: true },
        });
  const seen = new Set(existing.map((e) => e.subjectId + '|' + e.stem));

  const fresh: (Parsed & { subjectId: string })[] = [];
  for (const g of good) {
    const key = g.subjectId + '|' + g.stem;
    if (seen.has(key)) {
      problems.push({ row: g.row, kind: 'duplicate', message: 'this question already exists' });
      continue;
    }
    seen.add(key);
    fresh.push(g);
  }

  const bySubject: Record<string, number> = {};
  for (const g of fresh) {
    const name = subjects.find((s) => s.id === g.subjectId)!.name;
    bySubject[name] = (bySubject[name] ?? 0) + 1;
  }
  problems.sort((a, b) => a.row - b.row);

  const report = {
    dryRun: input.dryRun,
    status: input.status,
    total: body.length,
    okCount: fresh.length,
    errorCount: problems.filter((p) => p.kind === 'error').length,
    duplicateCount: problems.filter((p) => p.kind === 'duplicate').length,
    imported: 0,
    bySubject,
    problems,
  };

  if (input.dryRun || fresh.length === 0) return report;

  // Topics are created once each (a few rows), then all questions and options go in together
  const topicIds = new Map<string, string>();
  for (const g of fresh) {
    if (!g.topic) continue;
    const key = g.subjectId + '|' + g.topic.toLowerCase();
    if (topicIds.has(key)) continue;
    const found = await prisma.topic.findFirst({
      where: { subjectId: g.subjectId, name: { equals: g.topic, mode: 'insensitive' } },
      select: { id: true },
    });
    const topic = found ?? (await prisma.topic.create({ data: { subjectId: g.subjectId, name: g.topic }, select: { id: true } }));
    topicIds.set(key, topic.id);
  }

  const items = fresh.map((g) => ({ id: randomUUID(), g }));
  await prisma.$transaction([
    prisma.question.createMany({
      data: items.map(({ id, g }) => ({
        id,
        subjectId: g.subjectId,
        topicId: g.topic ? (topicIds.get(g.subjectId + '|' + g.topic.toLowerCase()) ?? null) : null,
        stem: g.stem,
        explanation: g.explanation,
        difficulty: g.difficulty,
        status: input.status as QuestionStatus,
        source: QuestionSource.MANUAL,
        language: 'en',
      })),
    }),
    prisma.questionOption.createMany({
      data: items.flatMap(({ id, g }) =>
        g.options.map((text, i) => ({ questionId: id, position: i + 1, text, isCorrect: i === g.correctIndex })),
      ),
    }),
  ]);

  return { ...report, imported: fresh.length };
}