import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { auth, getUser } from "../middleware/auth.js";
import { interviewReply } from "../ai/llm.js";

export const interviewRouter = Router();
interviewRouter.use(auth);

interviewRouter.post("/start", async (req, res) => {
  const mode = req.body?.mode === "HR" ? "HR" : "TECHNICAL";
  const userId = getUser(req).id;
  const session = await prisma.interviewSession.create({ data: { userId, mode } });
  const first = await interviewReply([], mode);
  await prisma.interviewTurn.create({
    data: { sessionId: session.id, role: "interviewer", content: first.data.reply, evalJson: JSON.stringify(first.data.evaluation) },
  });
  res.json({
    session,
    turn: { role: "interviewer", content: first.data.reply },
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
  await prisma.interviewTurn.create({ data: { sessionId: session.id, role: "user", content } });
  const history = [...session.turns.map((t) => ({ role: t.role, content: t.content })), { role: "user", content }];
  const ai = await interviewReply(history, session.mode);
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
