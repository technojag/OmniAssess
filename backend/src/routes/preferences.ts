import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { auth, getUser } from "../middleware/auth.js";
import { CATEGORIES, EXAMS, getExam, resolveActiveSelection } from "../engine/exams.js";

export const preferencesRouter = Router();
preferencesRouter.use(auth);

const putSchema = z.object({
  category: z.string().max(30).optional(),
  examName: z.string().max(40).optional(),
  subject: z.string().max(80).optional(),
});

function shape(profile: {
  examCategory: string | null;
  examName: string | null;
  subject: string | null;
} | null) {
  const resolved = resolveActiveSelection(profile, {});
  return {
    category: {
      categoryId: resolved.category.categoryId,
      label: resolved.category.label,
      description: resolved.category.description,
    },
    examName: resolved.exam.examName,
    examLabel: resolved.exam.label,
    examCategory: resolved.exam.examCategory,
    subject: resolved.subject,
  };
}

/** The single source of truth every module reads to stay exam-consistent. */
preferencesRouter.get("/exam", async (req, res) => {
  const userId = getUser(req).id;
  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  const active = shape(profile);
  res.json({
    active,
    categories: CATEGORIES.map((c) => ({
      categoryId: c.categoryId,
      label: c.label,
      description: c.description,
      defaultExam: c.defaultExam,
      exams: c.exams.map((e) => {
        const exam = getExam(e)!;
        return { examName: exam.examName, label: exam.label, subjects: exam.subjects };
      }),
      interviewRubric: c.interviewRubric,
      interviewFocus: c.interviewFocus,
    })),
    exams: EXAMS,
  });
});

preferencesRouter.put("/exam", async (req, res) => {
  const parsed = putSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const userId = getUser(req).id;
  const existing = await prisma.userProfile.findUnique({ where: { userId } });
  const resolved = resolveActiveSelection(existing, {
    category: parsed.data.category,
    examName: parsed.data.examName,
    subject: parsed.data.subject,
  });
  const profile = await prisma.userProfile.upsert({
    where: { userId },
    update: {
      examCategory: resolved.category.categoryId,
      examName: resolved.exam.examName,
      subject: resolved.subject,
    },
    create: {
      userId,
      examCategory: resolved.category.categoryId,
      examName: resolved.exam.examName,
      subject: resolved.subject,
    },
  });
  res.json({ ok: true, active: shape(profile) });
});