import { GoogleGenerativeAI } from "@google/generative-ai";

const KEY = process.env.GEMINI_API_KEY || "";
const MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

export type AiEnvelope<T> = {
  data: T;
  confidence: number;
  source: "gemini" | "deterministic_fallback";
  limitations: string;
};

const LIMITATIONS =
  "LLM text is assistive, not a clinical or certified psychometric report. Scoring and item selection are deterministic and independent of this model. Confidence is heuristic, not a calibrated probability.";

function fallback<T>(data: T, extra = ""): AiEnvelope<T> {
  return {
    data,
    confidence: 0.35,
    source: "deterministic_fallback",
    limitations: `${LIMITATIONS} GEMINI_API_KEY is missing or the provider failed. ${extra}`.trim(),
  };
}

async function generateJson<T>(prompt: string, fallbackData: T): Promise<AiEnvelope<T>> {
  if (!KEY) return fallback(fallbackData, "Set GEMINI_API_KEY to enable live generation.");
  try {
    const genAI = new GoogleGenerativeAI(KEY);
    const model = genAI.getGenerativeModel({ model: MODEL });
    const result = await model.generateContent(
      `${prompt}\n\nRespond with valid JSON only. No markdown.`
    );
    const text = result.response.text().replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(text) as T;
    return { data: parsed, confidence: 0.62, source: "gemini", limitations: LIMITATIONS };
  } catch {
    return fallback(fallbackData, "Provider error; showing template diagnosis.");
  }
}

export async function explainWeaknesses(input: {
  scorePct: number;
  topics: { topic: string; accuracy: number; attempts: number }[];
  mistakes: { stem: string; weaknessType: string }[];
}) {
  const fallbackData = {
    headline: `Score ${Math.round(input.scorePct)}% — treat this as a snapshot, not a verdict.`,
    narrative: buildFallbackNarrative(input),
    actions: input.topics
      .filter((t) => t.accuracy < 0.6)
      .slice(0, 3)
      .map((t) => `Drill ${t.topic} with mixed difficulty items and explain each miss aloud.`),
  };
  return generateJson(
    `You are OmniAssess AI. Write a concise weakness diagnosis for a software/DSA learner.
Score percent: ${input.scorePct}
Topic stats: ${JSON.stringify(input.topics)}
Mistakes: ${JSON.stringify(input.mistakes.slice(0, 8))}
JSON shape: {"headline": string, "narrative": string, "actions": string[]}`,
    fallbackData
  );
}

export async function generateStudyPlan(input: {
  weakest: string[];
  minutes: number;
  target: string;
}) {
  const days = Array.from({ length: 7 }).map((_, i) => ({
    day: i + 1,
    focus: input.weakest[i % Math.max(1, input.weakest.length)] || "mixed review",
    minutes: input.minutes,
    tasks: [
      "Warm-up: 2 spaced-repetition items",
      `Deep practice on ${input.weakest[i % Math.max(1, input.weakest.length)] || "core DSA"}`,
      "Error-notebook review (5 min)",
    ],
  }));
  const fallbackData = {
    title: `7-day plan for ${input.target}`,
    summary: `Prioritize ${input.weakest.slice(0, 3).join(", ") || "foundational DSA"} with daily mixed practice.`,
    days,
  };
  return generateJson(
    `Create a 7-day study plan. Target: ${input.target}. Daily minutes: ${input.minutes}. Weak concepts: ${input.weakest.join(", ")}.
JSON: {"title": string, "summary": string, "days": [{"day": number, "focus": string, "minutes": number, "tasks": string[]}]}`,
    fallbackData
  );
}

export type ExamQuestionDraft = {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
};

export type ExamQuestionRequest = {
  examCategory: string;
  examName: string;
  subject: string;
  topic: string;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "MIXED";
};

/**
 * Exam-aware generation. The exam hierarchy is always part of the prompt so a
 * question can never drift outside its exam/subject/topic/difficulty slice.
 */
export async function generateExamQuestion(input: ExamQuestionRequest) {
  const fallbackData = buildFallbackExamQuestion(input);
  return generateJson<ExamQuestionDraft>(
    `You are OmniAssess AI, an exam question author.
Exam category: ${input.examCategory}
Exam: ${input.examName}
Subject: ${input.subject}
Topic: ${input.topic}
Difficulty: ${input.difficulty}

Write ONE single-correct-answer MCQ strictly inside this exam, subject and topic.
Return JSON only with this exact shape:
{"question": string, "options": string[4], "answerIndex": number, "explanation": string}
Rules: exactly 4 believable options, answerIndex is 0-3, the explanation justifies the correct option in one or two sentences. Do not reference other exams or subjects.`,
    fallbackData
  );
}

function buildFallbackExamQuestion(input: ExamQuestionRequest): ExamQuestionDraft {
  const topic = input.topic || input.subject;
  return {
    question: `[${input.examName} · ${input.subject} · ${topic} · ${input.difficulty}] Which statement is most accurate about "${topic}"?`,
    options: [
      `It is a core concept of ${topic} within ${input.subject}.`,
      `It belongs to an unrelated subject and is not assessed in ${input.examName}.`,
      "It has no measurable definition in this syllabus.",
      "It is only relevant outside the exam syllabus.",
    ],
    answerIndex: 0,
    explanation: `Deterministic fallback: "${topic}" is part of the ${input.subject} syllabus for ${input.examName}. Set GEMINI_API_KEY for a real, exam-specific item.`,
  };
}

export type InterviewContext = {
  categoryId: string;
  categoryLabel: string;
  examName: string;
  subject: string;
  interviewerRole: string;
  interviewFocus: string[];
  rubric: { key: string; label: string; hint: string }[];
  openingQuestions: string[];
};

/**
 * Category-aware interview. Questions, follow-ups and the evaluation rubric all
 * come from the selected category, so technical and SSC CGL sessions never mix.
 */
export async function interviewReply(history: { role: string; content: string }[], ctx: InterviewContext) {
  const rubricJson = ctx.rubric.map((r) => `"${r.key}": number`).join(", ");
  const focus = ctx.interviewFocus.join("; ");
  const opening = ctx.openingQuestions[0];
  const isFirst = history.filter((h) => h.role === "user").length === 0;

  const fallbackQ = isFirst ? opening : `Follow-up: can you go deeper on that, with a concrete example? (${opening})`;
  const baseScore = Math.min(0.85, 0.25 + history.filter((h) => h.role === "user").length * 0.12);
  const evalFallback: Record<string, number> = {};
  for (const r of ctx.rubric) evalFallback[r.key] = Number(baseScore.toFixed(2));

  const fb = {
    reply: isFirst
      ? `Welcome to your ${ctx.categoryLabel} interview. Let's begin. ${fallbackQ}`
      : `Thank you. ${fallbackQ}`,
    evaluation: evalFallback,
    weakAreas: [],
    suggestions: [`Answered ${history.filter((h) => h.role === "user").length + 1} question(s) in ${ctx.categoryLabel}. Add a concrete example to each point.`],
  };

  return generateJson<{
    reply: string;
    evaluation: Record<string, number | string>;
    weakAreas: string[];
    suggestions: string[];
  }>(
    `You are ${ctx.interviewerRole}.
Category: ${ctx.categoryLabel} (exam ${ctx.examName}${ctx.subject ? `, subject ${ctx.subject}` : ""}).
Assess ONLY these areas: ${focus}

Conversation so far: ${JSON.stringify(history.slice(-8))}

Ask ONE next question that stays strictly inside this category${ctx.subject ? ` and subject (${ctx.subject})` : ""}. Do not ask about other exams or unrelated domains.
Return JSON only:
{"reply": string, "evaluation": {${rubricJson}, "notes": string}, "weakAreas": string[], "suggestions": string[]}
All score values are 0-1. weakAreas and suggestions must reference this category only.`,
    fb
  );
}

/** Aggregate rubric scores across turns into a final interview verdict. */
export function summarizeInterview(
  evaluations: { evaluation: Record<string, unknown> }[],
  ctx: InterviewContext
) {
  const dims = ctx.rubric.map((r) => {
    const values = evaluations
      .map((e) => e.evaluation[r.key])
      .filter((v): v is number => typeof v === "number");
    const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    return { key: r.key, label: r.label, hint: r.hint, score: Number(avg.toFixed(2)), samples: values.length };
  });
  const overall = dims.length
    ? Number((dims.reduce((s, d) => s + d.score, 0) / dims.length).toFixed(2))
    : 0;
  const weakAreas = dims
    .filter((d) => d.samples > 0 && d.score < 0.6)
    .map((d) => `${d.label} (${(d.score * 100).toFixed(0)}%)`);
  const strongAreas = dims.filter((d) => d.samples > 0 && d.score >= 0.75).map((d) => d.label);
  return { overall, dimensions: dims, weakAreas, strongAreas, rubric: ctx.rubric };
}

function buildFallbackNarrative(input: {
  scorePct: number;
  topics: { topic: string; accuracy: number }[];
  mistakes: { weaknessType: string }[];
}) {
  const weak = input.topics.filter((t) => t.accuracy < 0.6).map((t) => t.topic);
  const types = [...new Set(input.mistakes.map((m) => m.weaknessType))];
  return `Weakest topics: ${weak.join(", ") || "none flagged"}. Dominant miss patterns: ${types.join(", ") || "n/a"}. Practice should mix retrieval (recall) with worked examples.`;
}
