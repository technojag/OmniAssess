import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { auth, getUser } from "../middleware/auth.js";
import { integrityConfig, penaltyFor } from "../engine/integrity.js";

export const proctorRouter = Router();
proctorRouter.use(auth);

proctorRouter.get("/config", async (_req, res) => {
  res.json({
    startScore: integrityConfig.startScore,
    terminationThreshold: integrityConfig.terminationThreshold,
    penalties: integrityConfig.penalties,
    note: "Signals are evidence for review, not automatic proof of misconduct.",
  });
});

proctorRouter.post("/event", async (req, res) => {
  const parsed = z
    .object({
      assessmentId: z.string().optional(),
      kind: z.string().min(1).max(40),
      severity: z.enum(["LOW", "MEDIUM", "HIGH"]).default("LOW"),
      confidence: z.number().min(0).max(1).default(0.5),
      description: z.string().max(500).optional().default(""),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const userId = getUser(req).id;
  const penalty = penaltyFor(parsed.data.kind);
  const event = await prisma.proctoringEvent.create({
    data: {
      userId,
      assessmentId: parsed.data.assessmentId,
      kind: parsed.data.kind,
      severity: parsed.data.severity,
      confidence: parsed.data.confidence,
      penalty,
      metaJson: JSON.stringify({ description: parsed.data.description }),
    },
  });
  if (parsed.data.assessmentId) {
    const a = await prisma.assessment.findFirst({
      where: { id: parsed.data.assessmentId, userId },
    });
    if (a) {
      const nextScore = Math.max(
        integrityConfig.minScore,
        (a.integrityScore ?? 100) - penalty
      );
      await prisma.assessment.update({
        where: { id: a.id },
        data: { integrityScore: nextScore, warningCount: a.warningCount + 1 },
      });
      res.json({
        event,
        integrityScore: nextScore,
        terminated: nextScore < integrityConfig.terminationThreshold,
      });
      return;
    }
  }
  res.json({ event });
});

proctorRouter.get("/assessment/:id", async (req, res) => {
  const userId = getUser(req).id;
  const events = await prisma.proctoringEvent.findMany({
    where: { userId, assessmentId: req.params.id },
    orderBy: { createdAt: "asc" },
  });
  const assessment = await prisma.assessment.findFirst({
    where: { id: req.params.id, userId },
  });
  res.json({
    events: events.map((e) => ({
      ...e,
      description: (JSON.parse(e.metaJson || "{}") as { description?: string }).description || e.kind,
    })),
    integrityScore: assessment?.integrityScore ?? 100,
    warningCount: assessment?.warningCount ?? events.length,
    config: integrityConfig,
  });
});
