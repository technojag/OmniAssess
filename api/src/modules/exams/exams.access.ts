import { prisma } from '../../db';
import { AppError } from '../../lib/errors';

// Same idea as TARGET_WORDS in web/src/pages/DashboardPage.tsx:
// which words in an exam's slug or name identify it for each target exam.
// Later this should move into the exam template data, so no names live in code.
const TARGET_WORDS: Record<string, string[]> = {
  UPSC: ['upsc'],
  SSC_CGL: ['ssc'],
  BANKING: ['bank'],
  RAILWAYS: ['rrb', 'railway'],
};

type ExamLike = { slug: string; name: string; category: string };
type ProfileLike = { category: string; details: unknown } | null | undefined;

function loadUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, profile: { select: { category: true, details: true } } },
  });
}

function isAllowed(exam: ExamLike, profile: ProfileLike) {
  if (!profile) return false;

  const details = (profile.details ?? {}) as { targetExam?: unknown };
  const target =
    profile.category === 'GOVT_COMPETITIVE' && typeof details.targetExam === 'string' ? details.targetExam : null;

  // "Other" means an exam we do not have yet
  if (target === 'OTHER') return false;

  if (target) {
    const words = TARGET_WORDS[target] ?? [];
    const text = (exam.slug + ' ' + exam.name).toLowerCase();
    return words.some((w) => text.includes(w));
  }
  return exam.category === profile.category;
}

/** The exams this student may see. Admins see everything. */
export async function filterExamsForUser<T extends ExamLike>(userId: string, exams: T[]): Promise<T[]> {
  const user = await loadUser(userId);
  if (user?.role === 'ADMIN') return exams;
  return exams.filter((e) => isAllowed(e, user?.profile));
}

/** Stops a student from starting an exam that is not part of their profile. */
export async function assertCanStart(userId: string, examSlug: string) {
  const user = await loadUser(userId);
  if (user?.role === 'ADMIN') return;

  const exam = await prisma.examTemplate.findUnique({
    where: { slug: examSlug },
    select: { slug: true, name: true, category: true },
  });
  if (!exam) return; // the normal start code answers with "exam not found"

  if (!isAllowed(exam, user?.profile)) {
    throw new AppError(403, 'EXAM_NOT_ALLOWED', 'This exam is not part of your profile.');
  }
}