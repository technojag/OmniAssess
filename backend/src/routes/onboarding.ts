import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { auth, getUser } from "../middleware/auth.js";

export const onboardingRouter = Router();

onboardingRouter.get("/targets", async (_req, res) => {
  const targets = await prisma.target.findMany({ orderBy: { name: "asc" } });
  res.json({ targets });
});

const onboardingSchema = z.object({
  targetId: z.string().optional(),
  experienceLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).default("INTERMEDIATE"),
  dailyMinutes: z.number().int().min(15).max(180).default(45),
  category: z.enum(["SCHOOL", "COLLEGE", "GOVT", "CORPORATE"]).default("COLLEGE"),
  classLevel: z.string().optional().default(""),
  board: z.string().optional().default(""),
  subjects: z.array(z.string()).optional().default([]),
  degree: z.string().optional().default(""),
  semester: z.string().optional().default(""),
  domain: z.string().optional().default(""),
  govExam: z.string().optional().default(""),
  govSection: z.string().optional().default(""),
  targetRole: z.string().optional().default(""),
  skillArea: z.string().optional().default(""),
  customFocus: z.string().max(200).optional().default(""),
});

function buildContext(parsed: z.infer<typeof onboardingSchema>, targetName: string) {
  const parts: string[] = [];
  parts.push(`Category: ${parsed.category}`);
  if (parsed.category === "SCHOOL") parts.push(`Class ${parsed.classLevel} ${parsed.board} subjects: ${parsed.subjects.join(", ")}`);
  if (parsed.category === "COLLEGE") parts.push(`${parsed.degree} sem ${parsed.semester} domain ${parsed.domain} subjects: ${parsed.subjects.join(", ")}`);
  if (parsed.category === "GOVT") parts.push(`${parsed.govExam} section ${parsed.govSection}`);
  if (parsed.category === "CORPORATE") parts.push(`${parsed.targetRole} (${parsed.experienceLevel}) skills: ${parsed.skillArea}`);
  if (parsed.customFocus) parts.push(`Focus: ${parsed.customFocus}`);
  parts.push(`Target: ${targetName}`);
  return {
    summary: parts.join(" | "),
    category: parsed.category,
    focus: parsed.customFocus || parsed.skillArea || parsed.govSection || parsed.subjects[0] || targetName,
    generatedAt: new Date().toISOString(),
    source: "onboarding-intake",
  };
}

onboardingRouter.get("/onboarding/status", auth, async (req, res) => {
  const userId = getUser(req).id;
  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  res.json({
    has_completed_onboarding: Boolean(profile?.hasCompletedOnboarding && profile?.onboardedAt),
    profile,
  });
});

onboardingRouter.post("/onboarding", auth, async (req, res) => {
  const parsed = onboardingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const userId = getUser(req).id;
  const data = parsed.data;
  let targetId = data.targetId;
  if (!targetId) {
    const first = await prisma.target.findFirst({ orderBy: { name: "asc" } });
    targetId = first?.id;
  }
  if (!targetId) {
    res.status(400).json({ error: "No target available. Run seed." });
    return;
  }
  const target = await prisma.target.findUnique({ where: { id: targetId } });
  const context = buildContext(data, target?.name || "General");
  await prisma.userProfile.upsert({
    where: { userId },
    update: {
      experienceLevel: data.experienceLevel,
      dailyMinutes: data.dailyMinutes,
      onboardedAt: new Date(),
      hasCompletedOnboarding: true,
      category: data.category,
      classLevel: data.classLevel || null,
      board: data.board || null,
      subjectsJson: JSON.stringify(data.subjects || []),
      degree: data.degree || null,
      semester: data.semester || null,
      domain: data.domain || null,
      govExam: data.govExam || null,
      govSection: data.govSection || null,
      targetRole: data.targetRole || null,
      skillArea: data.skillArea || null,
      customFocus: data.customFocus || "",
      candidateContextJson: JSON.stringify(context),
    },
    create: {
      userId,
      experienceLevel: data.experienceLevel,
      dailyMinutes: data.dailyMinutes,
      onboardedAt: new Date(),
      hasCompletedOnboarding: true,
      category: data.category,
      classLevel: data.classLevel || null,
      board: data.board || null,
      subjectsJson: JSON.stringify(data.subjects || []),
      degree: data.degree || null,
      semester: data.semester || null,
      domain: data.domain || null,
      govExam: data.govExam || null,
      govSection: data.govSection || null,
      targetRole: data.targetRole || null,
      skillArea: data.skillArea || null,
      customFocus: data.customFocus || "",
      candidateContextJson: JSON.stringify(context),
    },
  });
  await prisma.userTarget.deleteMany({ where: { userId } });
  await prisma.userTarget.create({
    data: { userId, targetId, isPrimary: true },
  });
  const concepts = await prisma.knowledgeConcept.findMany();
  for (const c of concepts) {
    await prisma.knowledgeState.upsert({
      where: { userId_conceptId: { userId, conceptId: c.id } },
      update: {},
      create: { userId, conceptId: c.id, mastery: 0.3 },
    });
  }
  res.json({ ok: true, has_completed_onboarding: true, context });
});

