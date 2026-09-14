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

export async function interviewReply(history: { role: string; content: string }[], mode: string) {
  const last = history.filter((h) => h.role === "user").slice(-1)[0]?.content || "";
  const fallbackQ =
    mode === "HR"
      ? "Tell me about a time you disagreed with a teammate and how you resolved it."
      : "How would you detect a cycle in a linked list, and what is the time/space tradeoff?";
  const evalFallback = {
    relevance: last ? 0.55 : 0.2,
    structure: last ? 0.5 : 0.2,
    depth: last ? 0.45 : 0.2,
    notes: "Heuristic evaluation without a live LLM.",
  };
  const fb = {
    reply: history.length < 2 ? `Let's begin this ${mode} interview. ${fallbackQ}` : `Follow-up: can you add complexity analysis or an example? (${fallbackQ})`,
    evaluation: evalFallback,
  };
  return generateJson(
    `You are an interviewer in ${mode} mode for a software developer role.
Conversation: ${JSON.stringify(history.slice(-8))}
JSON: {"reply": string, "evaluation": {"relevance": number, "structure": number, "depth": number, "notes": string}}
Scores 0-1.`,
    fb
  );
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
