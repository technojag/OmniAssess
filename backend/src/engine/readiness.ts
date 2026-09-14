export const DIMENSIONS = [
  "problem_solving",
  "data_structures",
  "algorithms",
  "complexity",
  "systems",
  "communication",
] as const;

export type Dimension = (typeof DIMENSIONS)[number];

export function bandFromScore(overall: number): string {
  if (overall < 0.35) return "NOT_READY";
  if (overall < 0.5) return "DEVELOPING";
  if (overall < 0.7) return "ON_TRACK";
  if (overall < 0.85) return "READY";
  return "HIGHLY_READY";
}

export function combineReadiness(input: {
  masteryAvg: number;
  recentAccuracy: number;
  thetaNorm: number;
  consistency: number;
  activity: number;
  interview: number;
}): { overall: number; dimensions: Record<string, number>; band: string; explanation: string; limitations: string } {
  const dimensions: Record<string, number> = {
    problem_solving: clamp(0.4 * input.thetaNorm + 0.6 * input.recentAccuracy),
    data_structures: clamp(input.masteryAvg),
    algorithms: clamp(0.5 * input.masteryAvg + 0.5 * input.thetaNorm),
    complexity: clamp(0.3 * input.masteryAvg + 0.4 * input.thetaNorm + 0.3 * input.recentAccuracy),
    systems: clamp(0.5 * input.masteryAvg + 0.5 * input.activity),
    communication: clamp(input.interview || 0.4),
  };
  const overall = clamp(
    0.28 * dimensions.problem_solving +
      0.22 * dimensions.data_structures +
      0.2 * dimensions.algorithms +
      0.12 * dimensions.complexity +
      0.1 * dimensions.systems +
      0.08 * dimensions.communication
  );
  const band = bandFromScore(overall);
  return {
    overall,
    dimensions,
    band,
    explanation: `Readiness band ${band} is a weighted blend of concept mastery, recent accuracy, IRT-inspired ability, activity, and interview practice. It is a prototype score, not a hiring decision.`,
    limitations:
      "This prototype uses a transparent linear blend, not a calibrated production model. Sample sizes are small; scores will shift as you practice. Do not treat this as a guaranteed exam or interview outcome.",
  };
}

function clamp(n: number) {
  return Math.max(0, Math.min(1, n));
}

export function counterfactual(current: number, weakest: { name: string; mastery: number }[]) {
  const lifts = weakest.slice(0, 3).map((w) => {
    const delta = Math.min(0.18, (0.8 - w.mastery) * 0.25);
    return {
      action: `Raise mastery in ${w.name} toward 80%`,
      estimatedOverallLift: Number(delta.toFixed(3)),
      projected: Number(Math.min(1, current + delta).toFixed(3)),
      note: "Counterfactual estimate from a simple linear sensitivity — not a causal guarantee.",
    };
  });
  return {
    current,
    whatImprovesScore: lifts,
    limitations: "These lifts assume independent concept gains and ignore item exposure, luck, and exam-day variance.",
  };
}
