import { prisma } from '../../db';
import { AppError } from '../../lib/errors';
import { scoreAttempt, type ScoringSection } from '../exam-engine/scoring';
import { loadAndSync } from './attempts.service';

// Shared by summary and review. Only works once the exam has ended.
async function loadScored(userId: string, attemptId: string) {
  const attempt = await loadAndSync(userId, attemptId);
  if (attempt.status === 'IN_PROGRESS') {
    throw new AppError(409, 'ATTEMPT_IN_PROGRESS', 'Results are available after the exam ends.');
  }

  const items = await prisma.attemptQuestion.findMany({
    where: { attemptId },
    orderBy: { position: 'asc' },
    select: {
      id: true,
      position: true,
      attemptSectionId: true,
      question: {
        select: {
          stem: true,
          explanation: true,
          options: { orderBy: { position: 'asc' }, select: { id: true, text: true, isCorrect: true } },
        },
      },
      response: { select: { selectedOptionId: true } },
    },
  });

  const scoringInput: ScoringSection[] = attempt.sections.map((s) => ({
    position: s.position,
    name: s.examSection.name,
    marksPerQuestion: Number(s.examSection.marksPerQuestion),
    negativeMarks: Number(s.examSection.negativeMarks),
    questions: items
      .filter((i) => i.attemptSectionId === s.id)
      .map((i) => ({
        attemptQuestionId: i.id,
        selectedOptionId: i.response?.selectedOptionId ?? null,
        correctOptionId: i.question.options.find((o) => o.isCorrect)?.id ?? null,
      })),
  }));

  const result = scoreAttempt(scoringInput);

  // Save the final score once, so lists and the dashboard can read it without recomputing
  await prisma.examAttempt.update({
    where: { id: attemptId },
    data: { score: result.score, maxScore: result.maxScore },
  });

  return { attempt, items, result };
}

/** Screen 1: score and how many questions were attempted. NO answer key in here. */
export async function getSummary(userId: string, attemptId: string) {
  const { attempt, result } = await loadScored(userId, attemptId);

  return {
    attempt: {
      id: attempt.id,
      status: attempt.status,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
    },
    score: result.score,
    maxScore: result.maxScore,
    accuracy: result.accuracy,
    totalQuestions: result.correct + result.wrong + result.unattempted,
    attempted: result.correct + result.wrong,
    correct: result.correct,
    wrong: result.wrong,
    unattempted: result.unattempted,
    sections: result.sections.map(({ outcomes: _outcomes, ...s }) => ({
      ...s,
      questionCount: s.correct + s.wrong + s.unattempted,
      attempted: s.correct + s.wrong,
    })),
  };
}

/** Screen 3: every question with the correct answer. This is the ONLY place correct answers are returned. */
export async function getReview(userId: string, attemptId: string) {
  const { attempt, items, result } = await loadScored(userId, attemptId);

  return {
    attemptId: attempt.id,
    sections: attempt.sections.map((s) => ({
      position: s.position,
      name: s.examSection.name,
      questions: items
        .filter((i) => i.attemptSectionId === s.id)
        .map((i) => ({
          position: i.position,
          stem: i.question.stem,
          explanation: i.question.explanation,
          options: i.question.options.map((o) => ({ id: o.id, text: o.text })),
          selectedOptionId: i.response?.selectedOptionId ?? null,
          correctOptionId: i.question.options.find((o) => o.isCorrect)?.id ?? null,
          outcome: result.sections.find((x) => x.position === s.position)!.outcomes[i.id],
        })),
    })),
  };
}