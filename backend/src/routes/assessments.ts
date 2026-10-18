import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { auth, getUser } from "../middleware/auth.js";
import { eapTheta, itemInformation, selectNextItem, updateThetaMap } from "../engine/adaptive.js";
import { applyAttemptToKnowledge, prerequisiteWeaknesses } from "../engine/knowledge.js";
import { classifyWeakness } from "../engine/diagnosis.js";
import { explainWeaknesses, generateStudyPlan } from "../ai/llm.js";
import { combineReadiness, counterfactual } from "../engine/readiness.js";
import { awardActivity, recordDaily } from "../services/gamification.js";
import { callMlTheta } from "../services/mlClient.js";
import { ensureExamBank, buildExamFilter, type ExamScope } from "../engine/questionBank.js";
import { EXAMS, getExam, isValidSubject, normalizeExamSelection, resolveActiveSelection } from "../engine/exams.js";

export const assessmentRouter = Router();
assessmentRouter.use(auth);

const startSchema = z.object({
  mode: z.enum(["FIXED", "ADAPTIVE", "DAILY_CHALLENGE", "PRACTICE"]).default("ADAPTIVE"),
  maxQuestions: z.number().int().min(4).max(30).optional(),
  practice: z.boolean().optional().default(false),
  examName: z.string().max(40).optional(),
  category: z.string().max(30).optional(),
  subject: z.string().max(80).optional(),
  topic: z.string().max(80).optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD", "MIXED"]).optional(),
});

assessmentRouter.get("/exams", (_req, res) => {
  res.json({ exams: EXAMS, note: "Exam -> Subject -> Topic hierarchy used for all question retrieval." });
});

assessmentRouter.post("/start", async (req, res) => {
  const parsed = startSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const userId = getUser(req).id;
  const isPractice = parsed.data.mode === "PRACTICE" || parsed.data.practice === true;
  const maxQuestions = parsed.data.maxQuestions ?? (parsed.data.mode === "DAILY_CHALLENGE" ? 4 : 12);
  const durationSec = parsed.data.mode === "DAILY_CHALLENGE" ? 8 * 60 : 25 * 60;

  // Exam -> Subject -> Topic -> Difficulty. Falls back to the user's onboarding
  // context, then to the DSA default so legacy calls keep working.
  const scope = await resolveScope(userId, parsed.data);
  await ensureExamBank(scope, maxQuestions + 2);

  const assessment = await prisma.assessment.create({
    data: {
      userId,
      mode: parsed.data.mode,
      maxQuestions,
      durationSec,
      isPractice,
      examCategory: scope.examCategory,
      examName: scope.examName,
      subject: scope.subject,
      topic: scope.topic,
      difficulty: scope.difficulty,
      sessions: { create: { timeLeftSec: durationSec, theta: 0, status: "ACTIVE" } },
    },
    include: { sessions: true },
  });
  const first = await pickQuestion(assessment.id, parsed.data.mode, 0, userId, [], scope);
  res.json({
    assessment,
    question: first,
    scope,
    meta: { engine: "IRT-inspired adaptive assessment prototype", maxQuestions },
  });
});

async function resolveScope(
  userId: string,
  input: { examName?: string; category?: string; subject?: string; topic?: string; difficulty?: string }
) {
  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  const hasExplicit = Boolean(input.examName || input.category);
  if (hasExplicit || profile?.examName) {
    const r = resolveActiveSelection(profile, {
      category: input.category,
      examName: input.examName,
      subject: input.subject,
    });
    return normalizeExamSelection({
      examName: r.exam.examName,
      subject: r.subject,
      topic: input.topic,
      difficulty: input.difficulty,
    });
  }
  // Legacy path: derive the exam from the onboarding intake fields.
  const guess = profile ? mapProfileToExam(profile) : null;
  return normalizeExamSelection({
    examName: guess || undefined,
    subject: input.subject,
    topic: input.topic,
    difficulty: input.difficulty,
  });
}

function mapProfileToExam(profile: {
  category: string;
  govExam: string | null;
  degree: string | null;
  domain: string | null;
  classLevel: string | null;
}): string | null {
  if (profile.category === "GOVT" && profile.govExam) {
    const slug = profile.govExam.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
    if (getExam(slug)) return slug;
    if (slug.includes("SSC_CGL")) return "SSC_CGL";
  }
  if (profile.category === "COLLEGE") {
    const degree = (profile.degree || "").toLowerCase();
    const domain = (profile.domain || "").toLowerCase();
    if (degree.includes("b.tech") || degree.includes("btech") || degree.includes("b.e")) return "BTECH";
    if (domain.includes("computer") || domain.includes("it")) return "BTECH";
  }
  if (profile.category === "SCHOOL") {
    if (profile.classLevel === "10") return "CLASS_10";
    if (profile.classLevel === "12") return "CLASS_12";
  }
  return null;
}

assessmentRouter.get("/:id", async (req, res) => {
  const a = await loadOwned(req, res);
  if (!a) return;
  res.json({ assessment: a });
});

assessmentRouter.get("/:id/current", async (req, res) => {
  const a = await loadOwned(req, res);
  if (!a) return;
  const session = a.sessions[0];
  if (a.status === "TERMINATED" || session?.status === "TERMINATED") {
    res.json({
      terminated: true,
      reason: a.terminateReason || "Assessment terminated due to repeated proctoring violations.",
      assessment: a,
      session,
      question: null,
    });
    return;
  }
  const scope = scopeOf(a);
  const seen: string[] = JSON.parse(session.seenJson);
  const lastId = seen[seen.length - 1];
  const q = lastId
    ? await prisma.question.findUnique({ where: { id: lastId }, include: { concept: true, metadata: true } })
    : await pickQuestion(a.id, a.mode, session.theta, a.userId, [], scope);
  res.json({
    question: publicQuestion(q),
    session,
    scope,
    assessment: { examName: a.examName, subject: a.subject, topic: a.topic, difficulty: a.difficulty, examCategory: a.examCategory },
    progress: { answered: a.attempts.length, max: a.maxQuestions },
  });
});

assessmentRouter.post("/:id/answer", async (req, res) => {
  const a = await loadOwned(req, res);
  if (!a) return;
  if (a.status !== "IN_PROGRESS") {
    res.status(409).json({
      error: a.status === "TERMINATED" ? "Assessment was terminated by proctoring" : "Assessment already completed",
      terminated: a.status === "TERMINATED",
      reason: a.terminateReason || null,
    });
    return;
  }
  const parsed = z
    .object({
      questionId: z.string(),
      selectedIndex: z.number().int(),
      timeMs: z.number().int().min(0),
      selfConfidence: z.number().min(0.25).max(1).optional(),
      markForReview: z.boolean().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const q = await prisma.question.findUnique({ where: { id: parsed.data.questionId }, include: { concept: true, metadata: true } });
  if (!q) {
    res.status(404).json({ error: "Question not found" });
    return;
  }
  const session = a.sessions[0];
  const isCorrect = parsed.data.selectedIndex === q.correctIndex;
  const thetaBefore = session.theta;
  const thetaAfter = updateThetaMap(thetaBefore, q.discrimination, q.difficulty, isCorrect);
  const info = itemInformation(thetaBefore, q.discrimination, q.difficulty);

  const attempt = await prisma.questionAttempt.create({
    data: {
      assessmentId: a.id,
      questionId: q.id,
      userId: a.userId,
      selectedIndex: parsed.data.selectedIndex,
      isCorrect,
      timeMs: parsed.data.timeMs,
      thetaBefore,
      thetaAfter,
      information: info,
      selfConfidence: parsed.data.selfConfidence,
    },
  });

  const seen: string[] = JSON.parse(session.seenJson);
  if (!seen.includes(q.id)) seen.push(q.id);
  const marked: string[] = JSON.parse(session.markedJson);
  if (parsed.data.markForReview && !marked.includes(q.id)) marked.push(q.id);

  const palette = JSON.parse(session.paletteJson) as Record<string, string>;
  palette[q.id] = isCorrect ? "answered" : "answered";

  await prisma.assessmentSession.update({
    where: { id: session.id },
    data: {
      theta: thetaAfter,
      seenJson: JSON.stringify(seen),
      markedJson: JSON.stringify(marked),
      paletteJson: JSON.stringify(palette),
      currentIndex: seen.length,
    },
  });

  const previousState = await prisma.knowledgeState.findUnique({
    where: { userId_conceptId: { userId: a.userId, conceptId: q.conceptId } },
  });
  const previousMistakes = await prisma.mistakeRecord.count({
    where: { userId: a.userId, question: { conceptId: q.conceptId } },
  });

  const prereqs = await prerequisiteWeaknesses(a.userId);
  const state = await prisma.knowledgeState.findUnique({
    where: { userId_conceptId: { userId: a.userId, conceptId: q.conceptId } },
  });
  const diagnosis = classifyWeakness({
    isCorrect,
    timeMs: parsed.data.timeMs,
    timeLimitSec: q.timeLimitSec,
    conceptMastery: state?.mastery ?? 0.3,
    prereqWeak: prereqs.some((p) => p.neededFor === q.concept.name || p.concept === q.concept.slug),
    repeatedMistakes: previousMistakes,
  });

  const knowledge = await applyAttemptToKnowledge(
    a.userId,
    q.conceptId,
    isCorrect,
    parsed.data.timeMs,
    q.timeLimitSec,
    diagnosis.type === "PERSISTENT_MISCONCEPTION",
  );
  await prisma.questionAttempt.update({
    where: { id: attempt.id },
    data: {
      masteryBefore: knowledge.masteryBefore,
      masteryAfter: knowledge.masteryAfter,
      confidence: knowledge.confidence,
    },
  });

  if (!isCorrect) {
    const similar = await prisma.question.findMany({
      where: { conceptId: q.conceptId, id: { not: q.id }, active: true },
      take: 3,
      select: { id: true, stem: true },
    });
    await prisma.mistakeRecord.create({
      data: {
        userId: a.userId,
        questionId: q.id,
        assessmentId: a.id,
        weaknessType: diagnosis.type,
        reason: diagnosis.reason,
        similarJson: JSON.stringify(similar),
      },
    });
  }

  const done = seen.length >= a.maxQuestions;
  let next = null;
  if (!done) next = await pickQuestion(a.id, a.mode, thetaAfter, a.userId, seen, scopeOf(a));

  res.json({
    isCorrect,
    correctIndex: q.correctIndex,
    explanation: q.explanation,
    theta: { before: thetaBefore, after: thetaAfter, label: "IRT-inspired ability estimate (prototype)" },
    knowledge: {
      concept: q.concept.name,
      masteryBefore: knowledge.masteryBefore,
      masteryAfter: knowledge.masteryAfter,
      confidence: knowledge.confidence,
      explanation: isCorrect
        ? "Mastery increased from a correct response; confidence also reflects response speed."
        : "Mastery decreased after this response; repeated misses are tracked as a possible misconception.",
    },
    diagnosis,
    next: publicQuestion(next),
    done,
    progress: { answered: seen.length, max: a.maxQuestions },
  });
});

assessmentRouter.post("/:id/complete", async (req, res) => {
  const a = await loadOwned(req, res);
  if (!a) return;
  if (a.status === "TERMINATED") {
    res.status(409).json({ error: "Assessment was terminated by proctoring", terminated: true, reason: a.terminateReason });
    return;
  }
  const attempts = await prisma.questionAttempt.findMany({
    where: { assessmentId: a.id },
    include: { question: { include: { concept: true } } },
  });
  const scored = attempts.filter((x) => x.isCorrect !== null);
  const correct = scored.filter((x) => x.isCorrect).length;
  const scorePct = scored.length ? (100 * correct) / scored.length : 0;
  const responses = attempts
    .filter((x) => x.isCorrect !== null)
    .map((x) => ({
      a: x.question.discrimination,
      b: x.question.difficulty,
      correct: Boolean(x.isCorrect),
    }));
  const local = eapTheta(responses);
  const ml = await callMlTheta(responses);

  const topicMap = new Map<string, { attempts: number; correct: number }>();
  for (const at of attempts) {
    const t = at.question.topic;
    const cur = topicMap.get(t) || { attempts: 0, correct: 0 };
    cur.attempts += 1;
    if (at.isCorrect) cur.correct += 1;
    topicMap.set(t, cur);
  }
  const topics = [...topicMap.entries()].map(([topic, v]) => ({
    topic,
    attempts: v.attempts,
    accuracy: v.attempts ? v.correct / v.attempts : 0,
  }));

  const mistakes = await prisma.mistakeRecord.findMany({
    where: { assessmentId: a.id },
    include: { question: true },
  });

  const ai = await explainWeaknesses({
    scorePct,
    topics,
    mistakes: mistakes.map((m) => ({ stem: m.question.stem, weaknessType: m.weaknessType })),
  });

  const states = await prisma.knowledgeState.findMany({
    where: { userId: a.userId },
    include: { concept: true },
  });
  const weakest = states
    .slice()
    .sort((x, y) => x.mastery - y.mastery)
    .slice(0, 5)
    .map((s) => ({ name: s.concept.name, mastery: s.mastery, slug: s.concept.slug }));

  const thetaNorm = ( (ml?.theta ?? local.theta) + 3) / 6;
  const recentAccuracy = scorePct / 100;
  const masteryAvg = states.length ? states.reduce((s, x) => s + x.mastery, 0) / states.length : 0.3;
  const readiness = combineReadiness({
    masteryAvg,
    recentAccuracy,
    thetaNorm,
    consistency: 0.6,
    activity: 0.5,
    interview: 0.4,
  });
  const cf = counterfactual(readiness.overall, weakest);

  await prisma.assessment.update({
    where: { id: a.id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      scorePct,
      thetaEnd: ml?.theta ?? local.theta,
    },
  });
  await prisma.assessmentSession.updateMany({
    where: { assessmentId: a.id },
    data: { status: "COMPLETED" },
  });

  const report = await prisma.intelligenceReport.create({
    data: {
      assessmentId: a.id,
      summary: ai.data.narrative,
      weaknessesJson: JSON.stringify({ headline: ai.data.headline, actions: ai.data.actions, mistakes }),
      topicJson: JSON.stringify(topics),
      confidence: ai.confidence,
      limitations: ai.limitations,
      counterfactualJson: JSON.stringify(cf),
    },
  });

  await prisma.readinessScore.create({
    data: {
      userId: a.userId,
      overall: readiness.overall,
      band: readiness.band,
      dimensionsJson: JSON.stringify(readiness.dimensions),
      explanation: readiness.explanation,
      limitations: readiness.limitations,
      flagged: readiness.overall < 0.4,
      flagReason: readiness.overall < 0.4 ? "Overall readiness below 0.40 on the prototype scale." : null,
    },
  });

  const recs = weakest.map((w, i) => ({
    userId: a.userId,
    title: `Strengthen ${w.name}`,
    rationale: `Mastery is ${(w.mastery * 100).toFixed(0)}%. Ranked by current knowledge state.`,
    conceptSlug: w.slug,
    priority: i + 1,
  }));
  await prisma.learningRecommendation.createMany({ data: recs });

  const profile = await prisma.userProfile.findUnique({ where: { userId: a.userId } });
  const target = await prisma.userTarget.findFirst({ where: { userId: a.userId }, include: { target: true } });
  const planAi = await generateStudyPlan({
    weakest: weakest.map((w) => w.name),
    minutes: profile?.dailyMinutes ?? 45,
    target: target?.target.name ?? "Software Developer / DSA",
  });
  await prisma.studyPlan.create({
    data: {
      userId: a.userId,
      title: planAi.data.title,
      summary: planAi.data.summary,
      daysJson: JSON.stringify(planAi.data.days),
      confidence: planAi.confidence,
      limitations: planAi.limitations,
    },
  });

  // Practice Arena sessions are safe sandboxes: do not pollute official stats.
  if (!a.isPractice) {
    await recordDaily(a.userId, scored.length, correct, a.mode === "DAILY_CHALLENGE" ? "DAILY_CHALLENGE" : "ASSESSMENT");
    await awardActivity(a.userId);
  }

  const proctorEvents = await prisma.proctoringEvent.findMany({
    where: { assessmentId: a.id },
    orderBy: { createdAt: "asc" },
  });

  res.json({
    scorePct,
    exam: {
      examCategory: a.examCategory,
      examName: a.examName,
      subject: a.subject,
      topic: a.topic,
      difficulty: a.difficulty,
    },
    theta: { local, ml, label: "IRT-inspired EAP estimate (prototype)" },
    topics,
    report: {
      ...report,
      aiSource: ai.source,
      headline: ai.data.headline,
      actions: ai.data.actions,
    },
    readiness,
    counterfactual: cf,
    recommendations: recs,
    integrity: {
      score: a.integrityScore ?? 100,
      warnings: a.warningCount ?? proctorEvents.length,
      events: proctorEvents,
      note: "Integrity signals are evidence for review, not automatic proof of misconduct.",
    },
  });
});

assessmentRouter.get("/:id/report", async (req, res) => {
  const a = await loadOwned(req, res);
  if (!a) return;
  const report = await prisma.intelligenceReport.findFirst({
    where: { assessmentId: a.id },
    orderBy: { createdAt: "desc" },
  });
  const events = await prisma.proctoringEvent.findMany({
    where: { assessmentId: a.id },
    orderBy: { createdAt: "asc" },
  });
  const attempts = await prisma.questionAttempt.findMany({
    where: { assessmentId: a.id },
    include: { question: { include: { concept: true } } },
    orderBy: { createdAt: "asc" },
  });
  const difficultyPerf = [0, 1, 2].map((bucket) => {
    const inBucket = attempts.filter((x) => {
      const d = x.question.difficulty;
      if (bucket === 0) return d < -0.5;
      if (bucket === 1) return d >= -0.5 && d <= 0.5;
      return d > 0.5;
    });
    const ok = inBucket.filter((x) => x.isCorrect).length;
    return {
      level: bucket === 0 ? "Easy" : bucket === 1 ? "Medium" : "Hard",
      attempts: inBucket.length,
      accuracy: inBucket.length ? ok / inBucket.length : 0,
      avgTimeMs: inBucket.length ? Math.round(inBucket.reduce((s, x) => s + (x.timeMs || 0), 0) / inBucket.length) : 0,
    };
  });
  const totalTimeMs = attempts.reduce((s, x) => s + (x.timeMs || 0), 0);
  const strong = difficultyPerf.length ? undefined : undefined;
  res.json({
    assessment: a,
    report,
    integrity: {
      score: a.integrityScore ?? 100,
      warnings: a.warningCount ?? events.length,
      events: events.map((e) => ({
        ...e,
        description: (JSON.parse(e.metaJson || "{}") as { description?: string }).description || e.kind,
      })),
    },
    skillAnalysis: {
      technical: scorePctOf(attempts),
      timeManagement: timeScore(attempts),
      problemSolving: scorePctOf(attempts.filter((x) => (x.question.difficulty ?? 0) > 0)),
      accuracy: scorePctOf(attempts),
      totalTimeMs,
      difficultyPerf,
    },
    attempts: attempts.map((x) => ({
      id: x.id,
      stem: x.question.stem,
      topic: x.question.topic,
      concept: x.question.concept?.name,
      isCorrect: x.isCorrect,
      timeMs: x.timeMs,
      difficulty: x.question.difficulty,
    })),
    _note: strong,
  });
});

function scorePctOf(rows: { isCorrect: boolean | null }[]) {
  const s = rows.filter((x) => x.isCorrect !== null);
  if (!s.length) return 0;
  return Math.round((100 * s.filter((x) => x.isCorrect).length) / s.length);
}

function timeScore(rows: { timeMs: number | null }[]) {
  if (!rows.length) return 0;
  const avg = rows.reduce((sum, x) => sum + (x.timeMs || 0), 0) / rows.length;
  if (avg <= 45000) return 90;
  if (avg <= 75000) return 75;
  if (avg <= 110000) return 60;
  return 45;
}

async function loadOwned(req: Parameters<typeof auth>[0] extends never ? never : any, res: any) {
  const userId = getUser(req).id;
  const a = await prisma.assessment.findUnique({
    where: { id: req.params.id },
    include: { sessions: true, attempts: true },
  });
  if (!a || a.userId !== userId) {
    res.status(404).json({ error: "Not found" });
    return null;
  }
  return a;
}

/** Extract the persisted exam slice from an assessment row. */
function scopeOf(a: {
  examName: string;
  subject: string;
  topic: string;
  difficulty: string;
  examCategory: string;
}): ExamScope {
  return {
    examCategory: a.examCategory,
    examName: a.examName,
    subject: a.subject,
    topic: a.topic,
    difficulty: a.difficulty,
  } as ExamScope;
}

async function pickQuestion(
  assessmentId: string,
  mode: string,
  theta: number,
  userId: string,
  seen: string[] = [],
  scope?: ExamScope
) {
  const scopeFilter = scope ? buildExamFilter(scope) : { active: true };

  if (mode === "DAILY_CHALLENGE") {
    const states = await prisma.knowledgeState.findMany({
      where: { userId },
      orderBy: { mastery: "asc" },
      take: 6,
    });
    const conceptIds = states.map((s) => s.conceptId);
    const pool = await prisma.question.findMany({
      where: {
        ...scopeFilter,
        conceptId: { in: conceptIds.length ? conceptIds : undefined },
        id: { notIn: seen },
      },
      include: { concept: true, metadata: true },
    });
    const scoped = pool.length ? pool : await scopedPool(scopeFilter, seen);
    return scoped[Math.floor(Math.random() * scoped.length)] || scoped[0] || null;
  }

  const pool = await scopedPool(scopeFilter, seen);
  if (mode === "FIXED") {
    return pool.sort((a, b) => a.difficulty - b.difficulty)[seen.length] || pool[0] || null;
  }
  const states = await prisma.knowledgeState.findMany({ where: { userId } });
  const stateMap = new Map(states.map((s) => [s.conceptId, s]));
  const selected = pool
    .map((item) => {
      const state = stateMap.get(item.conceptId);
      const mastery = state?.mastery ?? 0.3;
      const dueBonus = state?.nextReviewAt && state.nextReviewAt <= new Date() ? 0.35 : 0;
      const targetDifficulty = Math.max(-2, Math.min(2, (mastery - 0.5) * 4 + theta));
      const information = itemInformation(theta, item.discrimination, item.difficulty);
      const masteryFocus = (1 - mastery) * 0.45;
      const difficultyFit = 0.35 / (1 + Math.abs(item.difficulty - targetDifficulty));
      return { item, score: information + masteryFocus + difficultyFit + dueBonus };
    })
    .sort((a, b) => b.score - a.score)[0]?.item;
  return selected || pool[0] || null;
}

/** Exam-scoped pool, relaxing the difficulty filter if it would return nothing. */
async function scopedPool(filter: Record<string, unknown>, seen: string[]) {
  const strict = await prisma.question.findMany({
    where: { ...filter, id: { notIn: seen } },
    include: { concept: true, metadata: true },
  });
  if (strict.length) return strict;
  const relaxed = { ...filter };
  delete (relaxed as { difficulty?: unknown }).difficulty;
  return prisma.question.findMany({
    where: { ...relaxed, id: { notIn: seen } },
    include: { concept: true, metadata: true },
  });
}

function publicQuestion(q: any) {
  if (!q) return null;
  return {
    id: q.id,
    stem: q.stem,
    options: JSON.parse(q.optionsJson),
    examName: q.examName,
    examCategory: q.examCategory,
    subject: q.subject,
    topic: q.topic,
    subtopic: q.subtopic,
    difficultyLabel: q.difficultyLabel,
    difficulty: q.difficulty,
    bloomLevel: q.metadata?.bloomLevel || "UNDERSTAND",
    skillType: q.metadata?.skillType || q.type,
    timeLimitSec: q.timeLimitSec,
    concept: q.concept,
    engineNote: "Adaptive selection weighs ability, mastery, review urgency, and question difficulty inside your selected exam.",
  };
}
