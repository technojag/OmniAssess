import { VersionStatus } from '@prisma/client';
import { prisma } from '../../db';
import { resolveSubmitPolicy } from '../attempts/attempts.policy';

// Candidate-facing list. Answer keys (isCorrect) are never selected here.
export async function listAvailableExams() {
  const templates = await prisma.examTemplate.findMany({
    where: { versions: { some: { status: VersionStatus.PUBLISHED } } },
    orderBy: { name: 'asc' },
    select: {
      slug: true,
      name: true,
      category: true,
      description: true,
      versions: {
        where: { status: VersionStatus.PUBLISHED },
        orderBy: { version: 'desc' },
        take: 1,
        select: {
          version: true,
          rules: true,
          sections: {
            orderBy: { position: 'asc' },
            select: {
              position: true,
              name: true,
              durationSeconds: true,
              questionCount: true,
              marksPerQuestion: true,
              negativeMarks: true,
            },
          },
        },
      },
    },
  });

  return templates.map((t) => {
    const v = t.versions[0];
    return {
      slug: t.slug,
      name: t.name,
      category: t.category,
      description: t.description,
      version: v.version,
      allowEarlySubmit: resolveSubmitPolicy(v.rules).allowEarlySubmit,
      totalDurationSeconds: v.sections.reduce((sum, s) => sum + s.durationSeconds, 0),
      sections: v.sections.map((s) => ({
        position: s.position,
        name: s.name,
        durationSeconds: s.durationSeconds,
        questionCount: s.questionCount,
        marksPerQuestion: Number(s.marksPerQuestion),
        negativeMarks: Number(s.negativeMarks),
      })),
    };
  });
}