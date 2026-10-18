import { prisma } from "../lib/prisma.js";
import { DIFFICULTY_TO_IRT, difficultyLabelToRange, type DifficultyLabel } from "./exams.js";
import { generateExamQuestion } from "../ai/llm.js";

export interface ExamScope {
  examName: string;
  subject: string;
  topic?: string | null;
  difficulty?: string | null;
}

const cacheKey = (s: ExamScope) => `${s.examName}|${s.subject}|${s.topic || ""}|${s.difficulty || ""}`;
const generationCache = new Set<string>();

/**
 * Build the Prisma filter that keeps a query inside one exam -> subject -> topic
 * -> difficulty slice. Exam and subject are always enforced so "SSC_CGL" never
 * returns DSA items and BTECH+DSA never returns OS items.
 */
export function buildExamFilter(scope: ExamScope) {
  const where: Record<string, unknown> = {
    active: true,
    examName: scope.examName.toUpperCase(),
    subject: scope.subject,
  };
  if (scope.topic && scope.topic !== "Mixed") where.topic = scope.topic;
  const range = scope.difficulty ? difficultyLabelToRange(scope.difficulty) : null;
  if (range) where.difficulty = { gte: range.min, lte: range.max };
  return where;
}

/**
 * Ensure at least `minSize` active questions exist for the exam slice. When the
 * bank is empty for a brand-new exam/subject/topic, generate a small batch with
 * the exam metadata injected into the prompt (never a bare "generate a question").
 */
export async function ensureExamBank(scope: ExamScope, minSize = 6): Promise<number> {
  const filter = buildExamFilter({ ...scope, difficulty: undefined });
  const existing = await prisma.question.count({ where: filter });
  if (existing >= minSize) return existing;
  const key = cacheKey(scope);
  if (generationCache.has(key)) return existing;
  generationCache.add(key);

  const needed = minSize - existing;
  let concept = await prisma.knowledgeConcept.findFirst({ where: { name: scope.subject } });
  if (!concept) {
    concept = await prisma.knowledgeConcept.findFirst({ where: { domain: scope.examName } });
  }
  if (!concept) concept = await prisma.knowledgeConcept.findFirst();
  if (!concept) return existing;

  const difficulties: Exclude<DifficultyLabel, "MIXED">[] = ["EASY", "MEDIUM", "HARD"];
  for (let i = 0; i < needed; i += 1) {
    const difficulty = difficulties[i % difficulties.length];
    const ai = await generateExamQuestion({
      examCategory: scope.examName === "BTECH" || scope.examName === "DSA" ? "COLLEGE" : "GENERAL",
      examName: scope.examName,
      subject: scope.subject,
      topic: scope.topic && scope.topic !== "Mixed" ? scope.topic : scope.subject,
      difficulty,
    });
    const data = ai.data;
    if (!data || !Array.isArray(data.options) || data.options.length < 2) continue;
    const correct = Math.min(Math.max(0, data.answerIndex ?? 0), data.options.length - 1);
    const range = DIFFICULTY_TO_IRT[difficulty];
    const created = await prisma.question.create({
      data: {
        stem: data.question,
        optionsJson: JSON.stringify(data.options),
        correctIndex: correct,
        explanation: data.explanation,
        examCategory: scope.examName === "BTECH" || scope.examName === "DSA" ? "COLLEGE" : "GENERAL",
        examName: scope.examName.toUpperCase(),
        subject: scope.subject,
        topic: scope.topic && scope.topic !== "Mixed" ? scope.topic : scope.subject,
        subtopic: scope.topic && scope.topic !== "Mixed" ? scope.topic : "Generated",
        difficultyLabel: difficulty,
        conceptId: concept.id,
        difficulty: range.target,
        discrimination: 1.0,
        tagsJson: JSON.stringify([scope.examName.toUpperCase(), scope.subject]),
        source: ai.source === "gemini" ? "gemini" : "ai-fallback",
      },
    });
    await prisma.questionMetadata.create({
      data: {
        questionId: created.id,
        bloomLevel: "UNDERSTAND",
        skillType: "knowledge",
        prereqJson: JSON.stringify([]),
      },
    });
  }
  return prisma.question.count({ where: filter });
}
