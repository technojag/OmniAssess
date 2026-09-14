import { prisma } from "../lib/prisma.js";

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

export async function recordDaily(userId: string, questions: number, correct: number, kind: string) {
  const date = todayStamp();
  const existing = await prisma.dailyActivity.findUnique({
    where: { userId_date_kind: { userId, date, kind } },
  });
  if (existing) {
    await prisma.dailyActivity.update({
      where: { id: existing.id },
      data: {
        questions: existing.questions + questions,
        correct: existing.correct + correct,
        minutes: existing.minutes + Math.max(5, Math.round(questions * 1.5)),
      },
    });
  } else {
    await prisma.dailyActivity.create({
      data: {
        userId,
        date,
        kind,
        questions,
        correct,
        minutes: Math.max(5, Math.round(questions * 1.5)),
      },
    });
  }
}

export async function awardActivity(userId: string) {
  const date = todayStamp();
  let streak = await prisma.streak.findUnique({ where: { userId } });
  if (!streak) streak = await prisma.streak.create({ data: { userId } });
  if (streak.lastDate !== date) {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yesterday = y.toISOString().slice(0, 10);
    const current = streak.lastDate === yesterday ? streak.current + 1 : 1;
    const longest = Math.max(streak.longest, current);
    await prisma.streak.update({
      where: { userId },
      data: { current, longest, lastDate: date },
    });
    if (current >= 7) await grant(userId, "seven-day-streak");
  }
  const states = await prisma.knowledgeState.findMany({ where: { userId } });
  if (states.some((s) => s.mastery >= 0.85)) await grant(userId, "concept-master");
  const attempts = await prisma.questionAttempt.count({ where: { userId } });
  if (attempts >= 50) await grant(userId, "fifty-attempts");
}

async function grant(userId: string, slug: string) {
  const badge = await prisma.badge.findUnique({ where: { slug } });
  if (!badge) return;
  await prisma.userBadge.upsert({
    where: { userId_badgeId: { userId, badgeId: badge.id } },
    update: {},
    create: { userId, badgeId: badge.id },
  });
}
