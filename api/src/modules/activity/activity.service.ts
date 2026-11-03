import { prisma } from '../../db';
import { DAILY_COUNT, istDayKey } from '../daily/daily.service';

const WINDOW_DAYS = 140; // 20 weeks
const DAY_MS = 24 * 60 * 60 * 1000;

// "2026-11-03" <-> a whole number of days, so we can count days easily
function keyToIndex(key: string): number {
  const parts = key.split('-');
  return Math.round(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])) / DAY_MS);
}

function indexToKey(index: number): string {
  return new Date(index * DAY_MS).toISOString().slice(0, 10);
}

/**
 * A day is ACTIVE when the student finished at least one exam that day
 * (submitted or time up, not terminated) or answered all the daily challenge questions.
 */
export async function getActivity(userId: string) {
  const [attempts, dailyRows] = await Promise.all([
    prisma.examAttempt.findMany({
      where: { userId, status: { in: ['SUBMITTED', 'EXPIRED'] } },
      select: { submittedAt: true, startedAt: true },
    }),
    prisma.dailyAnswer.groupBy({
      by: ['day'],
      where: { userId },
      _count: { _all: true },
    }),
  ]);

  const examsByDay = new Map<string, number>();
  for (const a of attempts) {
    const key = istDayKey(a.submittedAt ?? a.startedAt);
    examsByDay.set(key, (examsByDay.get(key) ?? 0) + 1);
  }

  const dailyByDay = new Map<string, number>();
  for (const r of dailyRows) dailyByDay.set(r.day, r._count._all);

  const isActive = (key: string) =>
    (examsByDay.get(key) ?? 0) > 0 || (dailyByDay.get(key) ?? 0) >= DAILY_COUNT;

  // Every active day (all time), as day numbers
  const activeIdx = new Set<number>();
  for (const key of examsByDay.keys()) if (isActive(key)) activeIdx.add(keyToIndex(key));
  for (const key of dailyByDay.keys()) if (isActive(key)) activeIdx.add(keyToIndex(key));

  const todayKey = istDayKey();
  const todayIdx = keyToIndex(todayKey);

  // Longest run of active days in a row
  let longest = 0;
  let run = 0;
  let prev: number | null = null;
  for (const idx of Array.from(activeIdx).sort((a, b) => a - b)) {
    run = prev !== null && idx === prev + 1 ? run + 1 : 1;
    if (run > longest) longest = run;
    prev = idx;
  }

  // Current streak: if today is not done yet, the streak is not broken until the day ends
  let current = 0;
  let cursor = activeIdx.has(todayIdx) ? todayIdx : todayIdx - 1;
  while (activeIdx.has(cursor)) {
    current += 1;
    cursor -= 1;
  }

  const countActive = (fromIdx: number, toIdx: number) => {
    let n = 0;
    for (let i = fromIdx; i <= toIdx; i += 1) if (activeIdx.has(i)) n += 1;
    return n;
  };
  const last7 = countActive(todayIdx - 6, todayIdx);
  const prev7 = countActive(todayIdx - 13, todayIdx - 7);
  // Growth is only meaningful when the previous week had some activity
  const growthPercent = prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : null;

  const days: {
    date: string
    exams: number
    dailyAnswered: number
    dailyComplete: boolean
    active: boolean
  }[] = [];
  for (let i = todayIdx - WINDOW_DAYS + 1; i <= todayIdx; i += 1) {
    const key = indexToKey(i);
    const dailyAnswered = dailyByDay.get(key) ?? 0;
    days.push({
      date: key,
      exams: examsByDay.get(key) ?? 0,
      dailyAnswered,
      dailyComplete: dailyAnswered >= DAILY_COUNT,
      active: isActive(key),
    });
  }

  return {
    today: todayKey,
    dailyTarget: DAILY_COUNT,
    days,
    stats: {
      currentStreak: current,
      longestStreak: longest,
      totalActiveDays: activeIdx.size,
      last7,
      prev7,
      growthPercent,
    },
  };
}