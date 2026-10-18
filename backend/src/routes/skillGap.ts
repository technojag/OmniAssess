import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { auth, getUser } from "../middleware/auth.js";
import { resolveActiveSelection } from "../engine/exams.js";

/**
 * Exam-scoped skill gap. Everything is derived from the user's own attempts on
 * questions belonging to the selected exam, so DSA never leaks into SSC CGL and
 * nothing is invented when there is no data.
 */
export const skillGapRouter = Router();
skillGapRouter.use(auth);

skillGapRouter.get("/", async (req, res) => {
  const userId = getUser(req).id;
  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  const resolved = resolveActiveSelection(profile, {
    category: req.query.category as string,
    examName: req.query.examName as string,
    subject: req.query.subject as string,
  });
  const { category, exam, subject: activeSubject } = resolved;

  const attempts = await prisma.questionAttempt.findMany({
    where: {
      userId,
      isCorrect: { not: null },
      question: { examName: exam.examName },
    },
    include: {
      question: { select: { subject: true, topic: true, difficultyLabel: true, difficulty: true, subtopic: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const subjectFilter = (req.query.subject as string) || "";
  const relevant = subjectFilter ? attempts.filter((a) => a.question.subject === subjectFilter) : attempts;

  const totalAttempts = relevant.length;
  const totalCorrect = relevant.filter((a) => a.isCorrect).length;
  const avgTimeMs = totalAttempts ? Math.round(relevant.reduce((s, a) => s + (a.timeMs || 0), 0) / totalAttempts) : 0;

  type Bucket = { attempts: number; correct: number; timeMs: number };
  const bySubject = new Map<string, Map<string, Bucket>>();
  for (const a of relevant) {
    const subject = a.question.subject;
    const topic = a.question.topic || a.question.subtopic || "General";
    if (!bySubject.has(subject)) bySubject.set(subject, new Map());
    const topics = bySubject.get(subject)!;
    const b = topics.get(topic) || { attempts: 0, correct: 0, timeMs: 0 };
    b.attempts += 1;
    b.correct += a.isCorrect ? 1 : 0;
    b.timeMs += a.timeMs || 0;
    topics.set(topic, b);
  }

  const subjects = exam.subjects.map((s) => {
    const observed = bySubject.get(s.name) || new Map<string, Bucket>();
    const topicNames = Array.from(new Set([...s.topics, ...observed.keys()]));
    const topics = topicNames.map((name) => {
      const b = observed.get(name);
      const attemptsN = b?.attempts ?? 0;
      const accuracy = attemptsN ? (b!.correct / attemptsN) : null;
      const avgTime = attemptsN ? Math.round(b!.timeMs / attemptsN) : null;
      return {
        topic: name,
        attempts: attemptsN,
        correct: b?.correct ?? 0,
        accuracy,
        avgTimeMs: avgTime,
        mastery: accuracy === null ? null : Math.min(0.98, Math.max(0.05, accuracy)),
        status: accuracy === null ? "MISSING" : accuracy >= 0.75 ? "STRONG" : accuracy >= 0.6 ? "OK" : "WEAK",
      };
    });
    const sAttempts = topics.reduce((n, t) => n + t.attempts, 0);
    const sCorrect = topics.reduce((n, t) => n + t.correct, 0);
    return {
      subject: s.name,
      attempts: sAttempts,
      accuracy: sAttempts ? Number((sCorrect / sAttempts).toFixed(3)) : null,
      covered: sAttempts > 0,
      topics,
      weakTopics: topics.filter((t) => t.status === "WEAK").map((t) => t.topic),
      strongTopics: topics.filter((t) => t.status === "STRONG").map((t) => t.topic),
      missingTopics: topics.filter((t) => t.status === "MISSING").map((t) => t.topic),
    };
  });

  const assessed = subjects.filter((s) => s.attempts > 0);
  const weakSubjects = assessed.filter((s) => (s.accuracy ?? 1) < 0.6).sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0));
  const strongSubjects = assessed.filter((s) => (s.accuracy ?? 0) >= 0.75).sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0));
  const recommendations: { subject: string; topic: string; priority: number; rationale: string }[] = [];
  for (const s of subjects) {
    for (const t of s.topics) {
      if (t.status === "WEAK") {
        recommendations.push({
          subject: s.subject,
          topic: t.topic,
          priority: 1,
          rationale: `${t.correct}/${t.attempts} correct (${((t.accuracy || 0) * 100).toFixed(0)}%) in ${s.subject} · ${t.topic}${t.avgTimeMs ? ` · avg ${(t.avgTimeMs / 1000).toFixed(0)}s` : ""}. Drill this topic with mixed difficulty items.`,
        });
      } else if (t.status === "MISSING") {
        recommendations.push({
          subject: s.subject,
          topic: t.topic,
          priority: 2,
          rationale: `${t.topic} is in the ${exam.label} syllabus but you have not attempted it yet. Start with an easy item to establish a baseline.`,
        });
      }
    }
  }
  recommendations.sort((a, b) => a.priority - b.priority);

  res.json({
    exam: {
      examName: exam.examName,
      examLabel: exam.label,
      examCategory: exam.examCategory,
      categoryId: category.categoryId,
      categoryLabel: category.label,
      subject: activeSubject,
      subjects: exam.subjects.map((s) => ({ name: s.name, topics: s.topics })),
    },
    dataAvailable: totalAttempts > 0,
    emptyMessage:
      totalAttempts > 0
        ? null
        : `No ${exam.label} attempts found yet. Take a ${exam.label} assessment to generate your real skill-gap analysis.`,
    summary: {
      totalAttempts,
      totalCorrect,
      accuracy: totalAttempts ? Number((totalCorrect / totalAttempts).toFixed(3)) : null,
      avgTimeMs,
      subjectsCovered: assessed.length,
      subjectsTotal: exam.subjects.length,
    },
    subjects,
    weakSubjects: weakSubjects.map((s) => ({ subject: s.subject, accuracy: s.accuracy, attempts: s.attempts, weakTopics: s.weakTopics })),
    strongSubjects: strongSubjects.map((s) => ({ subject: s.subject, accuracy: s.accuracy, attempts: s.attempts, strongTopics: s.strongTopics })),
    recommendations: recommendations.slice(0, 12),
    note: "Computed only from your own attempts on this exam's questions. No estimated or invented scores.",
  });
});