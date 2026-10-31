import type { AttemptStatus } from '@prisma/client';
import { prisma } from '../../db';
import { loadAndSync } from './attempts.service';

/** The candidate's own attempts, newest first. Used by the dashboard. */
export async function listMyAttempts(userId: string) {
  const rows = await prisma.examAttempt.findMany({
    where: { userId, isPractice: false },
    orderBy: { startedAt: 'desc' },
    take: 20,
    select: {
      id: true,
      status: true,
      startedAt: true,
      submittedAt: true,
      score: true,
      maxScore: true,
      templateVersion: { select: { template: { select: { slug: true, name: true } } } },
    },
  });

  const out = [];
  for (const r of rows) {
    let status: AttemptStatus = r.status;
    let submittedAt = r.submittedAt;
    let current: { sectionName: string | null } | null = null;

    if (r.status === 'IN_PROGRESS') {
      // Time may have run out since the last request, so let the engine settle it first
      const synced = await loadAndSync(userId, r.id);
      status = synced.status;
      submittedAt = synced.submittedAt;
      if (synced.status === 'IN_PROGRESS') {
        const active = synced.sections.find((s) => s.state === 'ACTIVE');
        current = { sectionName: active?.examSection.name ?? null };
      }
    }

    out.push({
      id: r.id,
      status,
      startedAt: r.startedAt,
      submittedAt,
      score: r.score === null ? null : Number(r.score),
      maxScore: r.maxScore === null ? null : Number(r.maxScore),
      exam: r.templateVersion.template,
      current,
    });
  }
  return out;
}