import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { auth, getUser } from "../middleware/auth.js";
import { interviewReply, summarizeInterview, type InterviewContext } from "../ai/llm.js";
import { CATEGORIES, resolveActiveSelection } from "../engine/exams.js";

export const interviewRouter = Router();
interviewRouter.use(auth);

const startSchema = z.object({
  mode: z.string().max(30).optional(),
  category: z.string().max(30).optional(),
  examName: z.string().max(40).optional(),
  subject: z.string().max(80).optional(),
});

/** Build the interview context from the active category preference. */
async function contextFor(
  userId: string,
  input: { category?: string; examName?: string; subject?: string; mode?: string }
) {
  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  const resolved = resolveActiveSelection(profile, {
    category: input.category,
    examName: input.examName,
    subject: input.subject,
  });
  const ctx: InterviewContext = {
    categoryId: resolved.category.categoryId,
    categoryLabel: resolved.category.label,
    examName: resolved.exam.examName,
    subject: resolved.subject,
    interviewerRole: resolved.category.interviewerRole,
    interviewFocus: resolved.category.interviewFocus,
    rubric: resolved.category.interviewRubric,
    openingQuestions: resolved.category.openingQuestions,
  };
  return { ctx, resolved, mode: input.mode || resolved.category.categoryId };
}

interviewRouter.get("/categories", async (req, res) => {
  const userId = getUser(req).id;
  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  res.json({
    activeCategory: profile?.examCategory || "TECHNICAL",
    categories: CATEGORIES.map((c) => ({
      categoryId: c.categoryId,
      label: c.label,
      description: c.description,
      defaultExam: c.defaultExam,
      interviewRubric: c.interviewRubric,
      interviewFocus: c.interviewFocus,
      openingQuestions: c.openingQuestions,
    })),
  });
});

interviewRouter.post("/start", async (req, res) => {
  const parsed = startSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const userId = getUser(req).id;
  const { ctx, resolved, mode } = await contextFor(userId, parsed.data);
  const session = await prisma.interviewSession.create({
    data: {
      userId,
      mode,
      examCategory: ctx.categoryId,
      examName: ctx.examName,
      subject: ctx.subject,
    },
  });
  const first = await interviewReply([], ctx);
  await prisma.interviewTurn.create({
    data: {
      sessionId: session.id,
      role: "interviewer",
      content: first.data.reply,
      evalJson: JSON.stringify(first.data.evaluation),
    },
  });
  res.json({
    session,
    turn: { role: "interviewer", content: first.data.reply },
    rubric: ctx.rubric,
    focus: ctx.interviewFocus,
    exam: {
      categoryId: ctx.categoryId,
      categoryLabel: ctx.categoryLabel,
      examName: ctx.examName,
      examLabel: resolved.exam.label,
      subject: ctx.subject,
    },
    ai: { confidence: first.confidence, source: first.source, limitations: first.limitations },
  });
});

interviewRouter.post("/:id/turn", async (req, res) => {
  const userId = getUser(req).id;
  const session = await prisma.interviewSession.findUnique({
    where: { id: req.params.id },
    include: { turns: { orderBy: { createdAt: "asc" } } },
  });
  if (!session || session.userId !== userId) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const content = String(req.body?.content || "").trim();
  if (!content) {
    res.status(400).json({ error: "Answer required" });
    return;
  }
  const { ctx } = await contextFor(userId, {
    category: session.examCategory,
    examName: session.examName || undefined,
    subject: session.subject || undefined,
    mode: session.mode,
  });
  await prisma.interviewTurn.create({ data: { sessionId: session.id, role: "user", content } });
  const history = [...session.turns.map((t) => ({ role: t.role, content: t.content })), { role: "user", content }];
  const ai = await interviewReply(history, ctx);
  await prisma.interviewTurn.create({
    data: {
      sessionId: session.id,
      role: "interviewer",
      content: ai.data.reply,
      evalJson: JSON.stringify(ai.data.evaluation),
    },
  });
  res.json({
    reply: ai.data.reply,
    evaluation: ai.data.evaluation,
    weakAreas: ai.data.weakAreas,
    suggestions: ai.data.suggestions,
    rubric: ctx.rubric,
    ai: { confidence: ai.confidence, source: ai.source, limitations: ai.limitations },
  });
});

interviewRouter.get("/:id", async (req, res) => {
  const userId = getUser(req).id;
  const session = await prisma.interviewSession.findUnique({
    where: { id: req.params.id },
    include: { turns: { orderBy: { createdAt: "asc" } } },
  });
  if (!session || session.userId !== userId) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ session });
});

/** Final verdict: rubric averages, weak areas and suggestions for this category. */
interviewRouter.get("/:id/summary", async (req, res) => {
  const userId = getUser(req).id;
  const session = await prisma.interviewSession.findUnique({
    where: { id: req.params.id },
    include: { turns: { orderBy: { createdAt: "asc" } } },
  });
  if (!session || session.userId !== userId) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const { ctx } = await contextFor(userId, {
    category: session.examCategory,
    examName: session.examName || undefined,
    subject: session.subject || undefined,
    mode: session.mode,
  });
  const evaluations = session.turns
    .filter((t) => t.role === "interviewer" && t.evalJson)
    .map((t) => {
      try {
        return { evaluation: JSON.parse(t.evalJson || "{}") as Record<string, unknown> };
      } catch {
        return { evaluation: {} as Record<string, unknown> };
      }
    });
  const summary = summarizeInterview(evaluations, ctx);
  const answered = session.turns.filter((t) => t.role === "user").length;
  await prisma.interviewSession.update({
    where: { id: session.id },
    data: { status: "COMPLETED", endedAt: new Date(), scoreJson: JSON.stringify(summary) },
  });
  res.json({
    exam: { categoryId: ctx.categoryId, categoryLabel: ctx.categoryLabel, examName: ctx.examName, subject: ctx.subject },
    answered,
    ...summary,
    suggestions: summary.weakAreas.length
      ? summary.weakAreas.map((w) => `Practise ${w.split(" (")[0].toLowerCase()} in your next ${ctx.categoryLabel} session.`)
      : [`Keep practising ${ctx.categoryLabel} to build evidence across all rubric dimensions.`],
    note: "Heuristic rubric scoring on answer text. Not a psychological or emotion assessment.",
  });
});
