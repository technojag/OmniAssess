// Pure time-per-question calculation. Every timestamp comes from the server, never from the browser.

export interface TimedQuestion {
  attemptQuestionId: string;
  position: number;
}

export interface ViewEvent {
  attemptQuestionId: string;
  at: Date;
}

export interface QuestionTime {
  attemptQuestionId: string;
  position: number;
  seconds: number;
  visits: number;
}

export function computeQuestionTimes(input: {
  startedAt: Date;
  endedAt: Date;
  questions: TimedQuestion[];
  views: ViewEvent[];
}): QuestionTime[] {
  const questions = [...input.questions].sort((a, b) => a.position - b.position);
  if (questions.length === 0) return [];

  const start = input.startedAt.getTime();
  const end = Math.max(input.endedAt.getTime(), start);
  const known = new Set(questions.map((q) => q.attemptQuestionId));

  // The first question is on screen from the moment the section starts
  const timeline: { id: string; at: number }[] = [{ id: questions[0].attemptQuestionId, at: start }];

  const events = input.views
    .filter((v) => known.has(v.attemptQuestionId) && v.at.getTime() < end)
    .map((v) => ({ id: v.attemptQuestionId, at: Math.max(v.at.getTime(), start) }))
    .sort((a, b) => a.at - b.at);

  for (const e of events) {
    // Same question again in a row is not a new visit
    if (timeline[timeline.length - 1].id !== e.id) timeline.push(e);
  }

  const ms = new Map<string, number>();
  const visits = new Map<string, number>();
  timeline.forEach((entry, i) => {
    const next = i + 1 < timeline.length ? timeline[i + 1].at : end;
    ms.set(entry.id, (ms.get(entry.id) ?? 0) + Math.max(0, next - entry.at));
    visits.set(entry.id, (visits.get(entry.id) ?? 0) + 1);
  });

  return questions.map((q) => ({
    attemptQuestionId: q.attemptQuestionId,
    position: q.position,
    seconds: Math.round((ms.get(q.attemptQuestionId) ?? 0) / 1000),
    visits: visits.get(q.attemptQuestionId) ?? 0,
  }));
}