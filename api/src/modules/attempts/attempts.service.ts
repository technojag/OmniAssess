import { Prisma, QuestionStatus, VersionStatus } from '@prisma/client';
import { prisma } from '../../db';
import { AppError } from '../../lib/errors';
import {
  EngineError,
  canSaveAnswer,
  continueToNextSection,
  resolveExpiry,
  startAttempt,
  type AttemptRuntime,
} from '../exam-engine/engine';

const attemptInclude = {
  sections: { orderBy: { position: 'asc' }, include: { examSection: true } },
} satisfies Prisma.ExamAttemptInclude;

type AttemptRow = Prisma.ExamAttemptGetPayload<{ include: typeof attemptInclude }>;

// Database row -> the plain object the engine understands
export function toRuntime(a: AttemptRow): AttemptRuntime {
  return {
    status: a.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : a.status === 'TERMINATED' ? 'TERMINATED' : 'SUBMITTED',
    sections: a.sections.map((s) => ({
      position: s.position,
      durationSeconds: s.examSection.durationSeconds,
      allowReturnToPrevious: s.examSection.allowReturnToPrevious,
      state: s.state,
      startedAt: s.startedAt,
      deadlineAt: s.deadlineAt,
      closedAt: s.closedAt,
      closeReason: s.closeReason,
    })),
  };
}

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Save whatever the engine changed (sections opened or closed, attempt auto-submitted)
export async function persist(attempt: AttemptRow, before: AttemptRuntime, after: AttemptRuntime) {
  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < after.sections.length; i++) {
      const s = after.sections[i];
      if (s === before.sections[i]) continue; // unchanged
      await tx.attemptSection.update({
        where: { id: attempt.sections[i].id },
        data: {
          state: s.state,
          startedAt: s.startedAt,
          deadlineAt: s.deadlineAt,
          closedAt: s.closedAt,
          closeReason: s.closeReason,
        },
      });
    }
    if (after.status !== before.status) {
      const lastClosed = after.sections
        .map((s) => s.closedAt)
        .filter((d): d is Date => d !== null)
        .sort((x, y) => y.getTime() - x.getTime())[0];
      await tx.examAttempt.update({
        where: { id: attempt.id },
        data: { status: after.status, submittedAt: lastClosed ?? new Date() },
      });
    }
  });
}

/** Loads the attempt (owner only), applies time-based closing, saves it, returns fresh data. */
export async function loadAndSync(userId: string, attemptId: string, now = new Date()): Promise<AttemptRow> {
  const attempt = await prisma.examAttempt.findFirst({
    where: { id: attemptId, userId },
    include: attemptInclude,
  });
  if (!attempt) throw new AppError(404, 'ATTEMPT_NOT_FOUND', 'Exam attempt not found.');

  const before = toRuntime(attempt);
  const after = resolveExpiry(before, now);
  if (after === before) return attempt;

  await persist(attempt, before, after);
  return prisma.examAttempt.findUniqueOrThrow({ where: { id: attempt.id }, include: attemptInclude });
}

export async function startOrResume(userId: string, examSlug: string, isPractice: boolean) {
  const template = await prisma.examTemplate.findUnique({
    where: { slug: examSlug },
    select: {
      id: true,
      versions: {
        where: { status: VersionStatus.PUBLISHED },
        orderBy: { version: 'desc' },
        take: 1,
        include: { sections: { orderBy: { position: 'asc' } } },
      },
    },
  });
  const version = template?.versions[0];
  if (!template || !version) throw new AppError(404, 'EXAM_NOT_FOUND', 'This exam is not available.');

  // An exam is already running: give it back instead of creating a second one
  const running = await prisma.examAttempt.findMany({
    where: { userId, isPractice, status: 'IN_PROGRESS', templateVersion: { templateId: template.id } },
    select: { id: true },
  });
  for (const r of running) {
    const synced = await loadAndSync(userId, r.id);
    if (synced.status === 'IN_PROGRESS') return { attemptId: synced.id, resumed: true };
  }

  // Pick questions for every section BEFORE opening a transaction
  const picked = new Map<number, string[]>();
  for (const s of version.sections) {
    const rows = await prisma.question.findMany({
      where: { subjectId: s.subjectId, status: QuestionStatus.APPROVED },
      select: { id: true },
    });
    if (rows.length < s.questionCount) {
      throw new AppError(422, 'NOT_ENOUGH_QUESTIONS', `Not enough approved questions for ${s.name}.`);
    }
    picked.set(s.position, shuffle(rows.map((r) => r.id)).slice(0, s.questionCount));
  }

  const runtime = startAttempt(
    version.sections.map((s) => ({
      position: s.position,
      durationSeconds: s.durationSeconds,
      allowReturnToPrevious: s.allowReturnToPrevious,
    })),
    new Date(),
  );

  // Generous timeout: the database is remote, and this makes about ten small queries
  const attemptId = await prisma.$transaction(
    async (tx) => {
      const attempt = await tx.examAttempt.create({
        data: { userId, templateVersionId: version.id, isPractice },
      });
      for (const rs of runtime.sections) {
        const cfg = version.sections.find((x) => x.position === rs.position)!;
        const section = await tx.attemptSection.create({
          data: {
            attemptId: attempt.id,
            examSectionId: cfg.id,
            position: rs.position,
            state: rs.state,
            startedAt: rs.startedAt,
            deadlineAt: rs.deadlineAt,
          },
        });
        await tx.attemptQuestion.createMany({
          data: picked.get(rs.position)!.map((questionId, i) => ({
            attemptId: attempt.id,
            attemptSectionId: section.id,
            questionId,
            position: i + 1,
          })),
        });
      }
      return attempt.id;
    },
    { timeout: 20000, maxWait: 10000 },
  );

  return { attemptId, resumed: false };
}

/** What the candidate's screen needs. Never contains the correct answer. */
export async function getAttemptView(userId: string, attemptId: string) {
  const now = new Date();
  const attempt = await loadAndSync(userId, attemptId, now);
  const active = attempt.sections.find((s) => s.state === 'ACTIVE');

  let currentSection = null;
  if (active) {
    const items = await prisma.attemptQuestion.findMany({
      where: { attemptSectionId: active.id },
      orderBy: { position: 'asc' },
      select: {
        id: true,
        position: true,
        question: {
          select: {
            stem: true,
            options: { orderBy: { position: 'asc' }, select: { id: true, position: true, text: true } }, // no isCorrect
          },
        },
        response: { select: { selectedOptionId: true, markedForReview: true } },
      },
    });
    currentSection = {
      position: active.position,
      questions: items.map((i) => ({
        attemptQuestionId: i.id,
        position: i.position,
        stem: i.question.stem,
        options: i.question.options,
        selectedOptionId: i.response?.selectedOptionId ?? null,
        markedForReview: i.response?.markedForReview ?? false,
      })),
    };
  }

  return {
    serverTime: now.toISOString(),
    attempt: {
      id: attempt.id,
      status: attempt.status,
      isPractice: attempt.isPractice,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
    },
    // true when a section just ended and the candidate must press Continue
    awaitingContinue: attempt.status === 'IN_PROGRESS' && !active,
    sections: attempt.sections.map((s) => ({
      position: s.position,
      name: s.examSection.name,
      state: s.state,
      durationSeconds: s.examSection.durationSeconds,
      questionCount: s.examSection.questionCount,
      marksPerQuestion: Number(s.examSection.marksPerQuestion),
      negativeMarks: Number(s.examSection.negativeMarks),
      startedAt: s.startedAt,
      deadlineAt: s.deadlineAt,
      closeReason: s.closeReason,
    })),
    currentSection,
  };
}

const BLOCK_MESSAGES: Record<string, string> = {
  SECTION_LOCKED: 'This section has ended and is locked.',
  SECTION_NOT_STARTED: 'This section has not started yet.',
  SECTION_NOT_FOUND: 'Section not found.',
  ATTEMPT_ENDED: 'This exam has already ended.',
};

export async function saveAnswer(
  userId: string,
  attemptId: string,
  attemptQuestionId: string,
  input: { selectedOptionId?: string | null; markedForReview?: boolean },
) {
  const now = new Date();
  const attempt = await loadAndSync(userId, attemptId, now);

  const item = await prisma.attemptQuestion.findFirst({
    where: { id: attemptQuestionId, attemptId },
    select: { questionId: true, attemptSection: { select: { position: true } } },
  });
  if (!item) throw new AppError(404, 'QUESTION_NOT_FOUND', 'Question not found in this exam.');

  // The engine decides. The browser's clock and the browser's buttons do not matter.
  const decision = canSaveAnswer(toRuntime(attempt), item.attemptSection.position, now);
  if (!decision.allowed) {
    throw new AppError(409, decision.code, BLOCK_MESSAGES[decision.code] ?? 'Answer cannot be saved.');
  }

  if (input.selectedOptionId) {
    const ok = await prisma.questionOption.findFirst({
      where: { id: input.selectedOptionId, questionId: item.questionId },
      select: { id: true },
    });
    if (!ok) throw new AppError(400, 'INVALID_OPTION', 'That option does not belong to this question.');
  }

  const changes: Prisma.ResponseUncheckedUpdateInput = {};
  if (input.selectedOptionId !== undefined) changes.selectedOptionId = input.selectedOptionId;
  if (input.markedForReview !== undefined) changes.markedForReview = input.markedForReview;

  const saved = await prisma.response.upsert({
    where: { attemptQuestionId },
    create: {
      attemptQuestionId,
      selectedOptionId: input.selectedOptionId ?? null,
      markedForReview: input.markedForReview ?? false,
    },
    update: changes,
    select: { savedAt: true },
  });
  return { saved: true, savedAt: saved.savedAt };
}

export async function continueSection(userId: string, attemptId: string) {
  const now = new Date();
  const attempt = await loadAndSync(userId, attemptId, now);

  const before = toRuntime(attempt);
  let after: AttemptRuntime;
  try {
    after = continueToNextSection(before, now);
  } catch (e) {
    if (e instanceof EngineError) throw new AppError(409, e.code, e.message);
    throw e;
  }
  await persist(attempt, before, after);
}