import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { auth, getUser } from "../middleware/auth.js";
import {
  evaluateViolation,
  integrityConfig,
  confidenceThresholds,
  criticalKinds,
  kindLabels,
} from "../engine/integrity.js";

export const proctorRouter = Router();
proctorRouter.use(auth);

proctorRouter.get("/config", async (_req, res) => {
  res.json({
    startScore: integrityConfig.startScore,
    terminationThreshold: integrityConfig.terminationThreshold,
    maxWarnings: integrityConfig.maxWarnings,
    penalties: integrityConfig.penalties,
    confidenceThresholds,
    zeroTolerance: [...criticalKinds],
    note: "Signals are evidence for review. Only confirmed violations (confidence above threshold) count toward warning/termination.",
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
      durationMs: z.number().int().min(0).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const userId = getUser(req).id;
  const kind = parsed.data.kind.toUpperCase();

  const assessment = parsed.data.assessmentId
    ? await prisma.assessment.findFirst({
        where: { id: parsed.data.assessmentId, userId },
        include: { sessions: true },
      })
    : null;

  // Idempotent: a terminated test stays terminated and the client is re-told.
  if (assessment && assessment.status === "TERMINATED") {
    res.json({
      action: "TERMINATE",
      reason: assessment.terminateReason || "Assessment already terminated.",
      violationCount: assessment.warningCount,
      integrityScore: assessment.integrityScore,
      terminated: true,
    });
    return;
  }

  const session = assessment?.sessions[0];
  const verdict = evaluateViolation({
    kind,
    confidence: parsed.data.confidence,
    warningCount: assessment?.warningCount ?? 0,
    severity: parsed.data.severity,
    integrityScore: assessment?.integrityScore ?? integrityConfig.startScore,
  });

  const event = await prisma.proctoringEvent.create({
    data: {
      userId,
      assessmentId: assessment?.id,
      kind,
      severity: verdict.severity,
      confidence: parsed.data.confidence,
      penalty: verdict.action === "LOG" ? 0 : verdict.penalty,
      metaJson: JSON.stringify({
        description: parsed.data.description || kindLabels[kind] || kind,
        action: verdict.action,
        confirmed: verdict.confirmed,
        threshold: verdict.threshold,
        durationMs: parsed.data.durationMs ?? null,
      }),
    },
  });

  if (!assessment) {
    res.json({ event, action: verdict.action, reason: verdict.reason, confirmed: verdict.confirmed });
    return;
  }

  if (verdict.action === "LOG") {
    // Below threshold: recorded as evidence only. No warning, no score change.
    res.json({
      event,
      action: "LOG",
      confirmed: false,
      reason: verdict.reason,
      violationCount: assessment.warningCount,
      integrityScore: assessment.integrityScore,
    });
    return;
  }

  const nextScore = Math.max(integrityConfig.minScore, assessment.integrityScore - verdict.penalty);
  const nextWarnings = assessment.warningCount + 1;
  const terminated = verdict.action === "TERMINATE";

  await prisma.assessment.update({
    where: { id: assessment.id },
    data: {
      integrityScore: nextScore,
      warningCount: nextWarnings,
      status: terminated ? "TERMINATED" : assessment.status,
      terminateReason: terminated ? verdict.reason : assessment.terminateReason,
      terminatedAt: terminated ? new Date() : assessment.terminatedAt,
      completedAt: terminated ? new Date() : assessment.completedAt,
    },
  });

  if (session) {
    await prisma.assessmentSession.update({
      where: { id: session.id },
      data: {
        status: terminated ? "TERMINATED" : "WARNING",
        warningLevel: nextWarnings,
      },
    });
  }

  if (terminated) {
    // Write the integrity report up front so the learner still gets a report.
    await prisma.integrityReport
      .create({
        data: {
          userId,
          summary: verdict.reason,
          score: nextScore,
        },
      })
      .catch(() => undefined);
  }

  res.json({
    event,
    action: verdict.action,
    confirmed: true,
    reason: verdict.reason,
    violationCount: nextWarnings,
    maxWarnings: integrityConfig.maxWarnings,
    integrityScore: nextScore,
    terminated,
  });
});

proctorRouter.get("/assessment/:id", async (req, res) => {
  const userId = getUser(req).id;
  const events = await prisma.proctoringEvent.findMany({
    where: { userId, assessmentId: req.params.id },
    orderBy: { createdAt: "asc" },
  });
  const assessment = await prisma.assessment.findFirst({
    where: { id: req.params.id, userId },
    include: { sessions: true },
  });
  res.json({
    events: events.map((e) => {
      const meta = JSON.parse(e.metaJson || "{}") as { description?: string; action?: string; confirmed?: boolean };
      return {
        ...e,
        description: meta.description || kindLabels[e.kind] || e.kind,
        action: meta.action || (e.penalty > 0 ? "WARNING" : "LOG"),
        confirmed: Boolean(meta.confirmed),
      };
    }),
    status: assessment?.status ?? "UNKNOWN",
    sessionStatus: assessment?.sessions[0]?.status ?? "ACTIVE",
    terminateReason: assessment?.terminateReason ?? null,
    integrityScore: assessment?.integrityScore ?? integrityConfig.startScore,
    warningCount: assessment?.warningCount ?? 0,
    maxWarnings: integrityConfig.maxWarnings,
    config: integrityConfig,
  });
});

