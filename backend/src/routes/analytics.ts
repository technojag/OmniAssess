import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { auth, getUser } from "../middleware/auth.js";
import { dueForReview } from "../engine/diagnosis.js";
import { combineReadiness } from "../engine/readiness.js";
import { callMlReadiness } from "../services/mlClient.js";

export const analyticsRouter = Router();
analyticsRouter.use(auth);

analyticsRouter.get("/dashboard", async (req, res) => {
  const userId = getUser(req).id;
  const [activities, streak, badges, states, readiness, recs, plans, mistakes, profile, assessments, interviews, proctorEvents, integrityReports] = await Promise.all([
    prisma.dailyActivity.findMany({ where: { userId }, orderBy: { date: "asc" } }),
    prisma.streak.findUnique({ where: { userId } }),
    prisma.userBadge.findMany({ where: { userId }, include: { badge: true } }),
    prisma.knowledgeState.findMany({ where: { userId }, include: { concept: true } }),
    prisma.readinessScore.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.learningRecommendation.findMany({ where: { userId }, orderBy: { priority: "asc" }, take: 8 }),
    prisma.studyPlan.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.mistakeRecord.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20, include: { question: true } }),
    prisma.userProfile.findUnique({ where: { userId } }),
    prisma.assessment.findMany({ where: { userId, status: "COMPLETED" }, orderBy: { completedAt: "desc" }, take: 12 }),
    prisma.interviewSession.findMany({ where: { userId }, orderBy: { startedAt: "desc" }, take: 5 }),
    prisma.proctoringEvent.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.integrityReport.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);
  const graph = await prisma.knowledgeEdge.findMany({
    include: { from: true, to: true },
  });

  const heatmap = buildYearHeatmap(activities);
  const radar = radarFromStates(states);
  const skillHeatmap = states.map((s) => ({
    concept: s.concept.name,
    dimension: s.concept.dimension,
    mastery: s.mastery,
    confidence: s.confidence,
    retention: s.retention,
    misconceptionCount: s.misconceptionCount,
    avgTimeMs: s.avgTimeMs,
    attempts: s.attempts,
  }));

  const masteryAvg = states.length ? states.reduce((s, x) => s + x.mastery, 0) / states.length : 0.3;
  const fallbackReady = combineReadiness({
    masteryAvg,
    recentAccuracy: readiness ? readiness.overall : 0.4,
    thetaNorm: readiness ? readiness.overall : 0.45,
    consistency: 0.5,
    activity: Math.min(1, activities.length / 14),
    interview: 0.4,
  });
  const mlReady = await callMlReadiness({
    mastery_avg: masteryAvg,
    recent_accuracy: fallbackReady.overall,
    theta_norm: fallbackReady.overall,
    consistency: 0.5,
    activity: Math.min(1, activities.length / 14),
    interview: 0.4,
  });

  res.json({
    heatmap,
    streak,
    badges,
    radar,
    skillHeatmap,
    profile: profile
      ? {
          ...profile,
          subjects: JSON.parse(profile.subjectsJson || "[]"),
          candidateContext: JSON.parse(profile.candidateContextJson || "{}"),
        }
      : null,
    stats: {
      totalAssessments: assessments.length,
      averageScore: assessments.length
        ? Number((assessments.reduce((s, a) => s + (a.scorePct ?? 0), 0) / assessments.length).toFixed(1))
        : 0,
      averageIntegrity: assessments.length
        ? Number((assessments.reduce((s, a) => s + (a.integrityScore ?? 100), 0) / assessments.length).toFixed(1))
        : 100,
      strongAreas: states.filter((s) => s.mastery >= 0.7).map((s) => ({ concept: s.concept.name, mastery: s.mastery })).slice(0, 5),
      weakAreas: states.filter((s) => s.mastery < 0.55).sort((a, b) => a.mastery - b.mastery).map((s) => ({ concept: s.concept.name, mastery: s.mastery })).slice(0, 5),
      improvement: assessments.slice().reverse().map((a) => ({ id: a.id, date: a.completedAt, score: a.scorePct, mode: a.mode })),
    },
    recentAssessments: assessments.map((a) => ({ id: a.id, mode: a.mode, score: a.scorePct, integrity: a.integrityScore, date: a.completedAt })),
    interviews: interviews.map((i) => ({ id: i.id, mode: i.mode, status: i.status, date: i.startedAt })),
    integrity: {
      events: proctorEvents,
      reports: integrityReports,
      average: assessments.length
        ? Number((assessments.reduce((s, a) => s + (a.integrityScore ?? 100), 0) / assessments.length).toFixed(1))
        : 100,
    },
    knowledgeGraph: {
      nodes: states.map((s) => ({ id: s.concept.id, name: s.concept.name, mastery: s.mastery, dimension: s.concept.dimension })),
      edges: graph.map((edge) => ({ from: edge.from.name, to: edge.to.name, relation: edge.relation, weight: edge.weight })),
    },
    readiness: readiness || fallbackReady,
    mlReadiness: mlReady,
    recommendations: recs,
    studyPlan: plans
      ? { ...plans, days: JSON.parse(plans.daysJson) }
      : null,
    mistakes: mistakes.map((m) => ({
      id: m.id,
      weaknessType: m.weaknessType,
      reason: m.reason,
      stem: m.question.stem,
      similar: JSON.parse(m.similarJson),
      createdAt: m.createdAt,
    })),
    dueReview: dueForReview(states, 6).map((s) => ({
      concept: s.concept.name,
      mastery: s.mastery,
      nextReviewAt: s.nextReviewAt,
    })),
  });
});

analyticsRouter.get("/notebook", async (req, res) => {
  const userId = getUser(req).id;
  const rows = await prisma.mistakeRecord.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { question: { include: { concept: true } } },
  });
  res.json({
    mistakes: rows.map((m) => ({
      ...m,
      similar: JSON.parse(m.similarJson),
      options: JSON.parse(m.question.optionsJson),
    })),
  });
});

analyticsRouter.get("/history", async (req, res) => {
  const userId = getUser(req).id;
  const assessments = await prisma.assessment.findMany({
    where: { userId },
    orderBy: { startedAt: "desc" },
    take: 30,
  });
  res.json({ assessments });
});

analyticsRouter.get("/leaderboard", async (req, res) => {
  const userId = getUser(req).id;
  const top = await prisma.assessment.groupBy({
    by: ["userId"],
    where: { status: "COMPLETED", isPractice: false },
    _avg: { scorePct: true },
    _count: { id: true },
    orderBy: { _avg: { scorePct: "desc" } },
    take: 20,
  });
  const ids = top.map((t) => t.userId);
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
  const byId = new Map(users.map((u) => [u.id, u.name]));
  res.json({
    leaderboard: top.map((t, i) => ({
      rank: i + 1,
      name: byId.get(t.userId) || "Learner",
      isYou: t.userId === userId,
      avgScore: Number((t._avg.scorePct ?? 0).toFixed(1)),
      assessments: t._count.id,
    })),
    note: "Ranked by average completed assessment score. Practice sessions excluded.",
  });
});

analyticsRouter.post("/documents", async (req, res) => {
  const parsed = z
    .object({
      filename: z.string().min(1).max(120),
      kind: z.enum(["RESUME", "SYLLABUS"]).default("RESUME"),
      text: z.string().min(20).max(20000),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const userId = getUser(req).id;
  const text = parsed.data.text;
  const concepts = await prisma.knowledgeConcept.findMany();
  const lower = text.toLowerCase();
  const matched = concepts
    .filter((c) => lower.includes(c.name.toLowerCase()) || lower.includes(c.slug.replace("-", " ")))
    .slice(0, 8)
    .map((c) => ({ slug: c.slug, name: c.name, dimension: c.dimension }));
  const keywords = ["react", "node", "python", "sql", "dsa", "trees", "recursion", "arrays", "dbms", "os", "communication"];
  const foundKeywords = keywords.filter((k) => lower.includes(k));
  const analysis = {
    matchedConcepts: matched,
    keywords: foundKeywords,
    suggestedAssessment: matched.length
      ? `Targeted assessment on ${matched.slice(0, 3).map((m) => m.name).join(", ")}`
      : "General adaptive assessment to establish baseline",
    status: "prototype-extraction",
    limitations: "Keyword/concept matching only. No claim of verified skill proficiency without assessment evidence.",
  };
  const doc = await prisma.uploadedDocument.create({
    data: {
      userId,
      filename: parsed.data.filename,
      kind: parsed.data.kind,
      text: text.slice(0, 12000),
      analysisJson: JSON.stringify(analysis),
    },
  });
  res.json({ document: { ...doc, analysis } });
});

analyticsRouter.get("/documents", async (req, res) => {
  const userId = getUser(req).id;
  const docs = await prisma.uploadedDocument.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 10 });
  res.json({
    documents: docs.map((d) => ({ ...d, analysis: JSON.parse(d.analysisJson || "{}") })),
  });
});

analyticsRouter.get("/knowledge", async (req, res) => {
  const userId = getUser(req).id;
  const [concepts, edges, states] = await Promise.all([
    prisma.knowledgeConcept.findMany(),
    prisma.knowledgeEdge.findMany(),
    prisma.knowledgeState.findMany({ where: { userId } }),
  ]);
  res.json({ concepts, edges, states });
});

function buildYearHeatmap(activities: { date: string; questions: number; minutes: number }[]) {
  const map = new Map<string, number>();
  for (const a of activities) map.set(a.date, (map.get(a.date) || 0) + a.questions);
  const days: { date: string; count: number }[] = [];
  const start = new Date();
  start.setDate(start.getDate() - 364);
  for (let i = 0; i < 365; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, count: map.get(key) || 0 });
  }
  return days;
}

function radarFromStates(states: { mastery: number; concept: { dimension: string } }[]) {
  const dims = ["problem_solving", "data_structures", "algorithms", "complexity", "systems", "communication"];
  return dims.map((d) => {
    const subset = states.filter((s) => s.concept.dimension === d);
    const avg = subset.length ? subset.reduce((x, s) => x + s.mastery, 0) / subset.length : 0.25;
    return { dimension: d, value: Number(avg.toFixed(3)) };
  });
}
