import { prisma } from "../lib/prisma.js";

/** Simple knowledge tracing (BKT-inspired prototype). */

export function updateMastery(prev: number, correct: boolean, pSlip = 0.1, pGuess = 0.2, pLearn = 0.18): number {
  const pL = prev;
  const pCorrect = pL * (1 - pSlip) + (1 - pL) * pGuess;
  let pLGivenObs: number;
  if (correct) {
    pLGivenObs = (pL * (1 - pSlip)) / Math.max(1e-6, pCorrect);
  } else {
    pLGivenObs = (pL * pSlip) / Math.max(1e-6, 1 - pCorrect);
  }
  const next = pLGivenObs + (1 - pLGivenObs) * pLearn;
  return Math.max(0.02, Math.min(0.98, next));
}

export function updateConfidence(prev: number, correct: boolean, timeMs: number, timeLimitSec = 90): number {
  const responseSignal = correct ? 1 : 0;
  const speedPenalty = timeMs > timeLimitSec * 1000 ? 0.12 : timeMs > timeLimitSec * 700 ? 0.05 : 0;
  return Math.max(0.05, Math.min(0.98, prev * 0.7 + Math.max(0, responseSignal - speedPenalty) * 0.3));
}

export function retentionScore(mastery: number, lastSeenAt: Date | null, now = new Date()): number {
  if (!lastSeenAt) return Math.max(0.1, mastery * 0.8);
  const days = Math.max(0, (now.getTime() - lastSeenAt.getTime()) / 86_400_000);
  return Math.max(0.05, Math.min(0.99, mastery * Math.exp(-days / 30)));
}

export async function applyAttemptToKnowledge(
  userId: string,
  conceptId: string,
  correct: boolean,
  timeMs = 0,
  timeLimitSec = 90,
  misconception = false,
) {
  const existing = await prisma.knowledgeState.findUnique({
    where: { userId_conceptId: { userId, conceptId } },
  });
  const masteryBefore = existing?.mastery ?? 0.3;
  const mastery = updateMastery(masteryBefore, correct, existing?.pSlip ?? 0.1, existing?.pGuess ?? 0.2, existing?.pLearn ?? 0.18);
  const attempts = (existing?.attempts ?? 0) + 1;
  const correctN = (existing?.correct ?? 0) + (correct ? 1 : 0);
  const confidence = updateConfidence(existing?.confidence ?? 0.5, correct, timeMs, timeLimitSec);
  const avgTimeMs = ((existing?.avgTimeMs ?? 0) * (attempts - 1) + timeMs) / attempts;
  const retention = retentionScore(mastery, new Date());
  const nextReview = spacedNextReview(mastery, correct);
  const state = await prisma.knowledgeState.upsert({
    where: { userId_conceptId: { userId, conceptId } },
    update: {
      mastery,
      attempts,
      correct: correctN,
      confidence,
      avgTimeMs,
      retention,
      misconceptionCount: (existing?.misconceptionCount ?? 0) + (misconception ? 1 : 0),
      lastSeenAt: new Date(),
      nextReviewAt: nextReview,
    },
    create: {
      userId,
      conceptId,
      mastery,
      attempts,
      correct: correctN,
      confidence,
      avgTimeMs,
      retention,
      misconceptionCount: misconception ? 1 : 0,
      lastSeenAt: new Date(),
      nextReviewAt: nextReview,
    },
  });
  return { state, masteryBefore, masteryAfter: mastery, confidence };
}

export function spacedNextReview(mastery: number, correct: boolean): Date {
  const days = correct ? Math.round(1 + mastery * 10) : 1;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

export async function prerequisiteWeaknesses(userId: string) {
  const edges = await prisma.knowledgeEdge.findMany({
    where: { relation: "PREREQ" },
    include: { from: true, to: true },
  });
  const states = await prisma.knowledgeState.findMany({ where: { userId } });
  const map = new Map(states.map((s) => [s.conceptId, s.mastery]));
  const flags: { concept: string; prereq: string; mastery: number; neededFor: string }[] = [];
  for (const e of edges) {
    const m = map.get(e.fromId) ?? 0.3;
    if (m < 0.45) {
      flags.push({
        concept: e.from.slug,
        prereq: e.from.name,
        mastery: m,
        neededFor: e.to.name,
      });
    }
  }
  return flags;
}
