/** IRT-inspired 2PL helpers. Deterministic. Prototype — not a certified CAT. */

export function sigmoid(x: number): number {
  if (x < -20) return 0;
  if (x > 20) return 1;
  return 1 / (1 + Math.exp(-x));
}

export function probabilityCorrect(theta: number, a: number, b: number, c = 0): number {
  return c + (1 - c) * sigmoid(a * (theta - b));
}

export function itemInformation(theta: number, a: number, b: number): number {
  const p = probabilityCorrect(theta, a, b, 0);
  const q = 1 - p;
  return a * a * p * q;
}

export function updateThetaMap(
  theta: number,
  a: number,
  b: number,
  correct: boolean,
  step = 0.35
): number {
  const p = probabilityCorrect(theta, a, b);
  const residual = (correct ? 1 : 0) - p;
  const next = theta + step * a * residual;
  return Math.max(-3, Math.min(3, next));
}

export type ItemLike = {
  id: string;
  difficulty: number;
  discrimination: number;
};

export function selectNextItem(theta: number, unseen: ItemLike[]): ItemLike | null {
  if (!unseen.length) return null;
  let best = unseen[0];
  let bestI = -Infinity;
  for (const item of unseen) {
    const i = itemInformation(theta, item.discrimination, item.difficulty);
    if (i > bestI) {
      bestI = i;
      best = item;
    }
  }
  return best;
}

export function eapTheta(
  responses: { a: number; b: number; correct: boolean }[],
  gridSize = 61
): { theta: number; se: number } {
  const thetas: number[] = [];
  const weights: number[] = [];
  for (let i = 0; i < gridSize; i++) {
    const t = -3 + (6 * i) / (gridSize - 1);
    const prior = Math.exp(-0.5 * t * t) / Math.sqrt(2 * Math.PI);
    let like = prior;
    for (const r of responses) {
      const p = probabilityCorrect(t, r.a, r.b);
      like *= r.correct ? p : 1 - p;
    }
    thetas.push(t);
    weights.push(like);
  }
  const sum = weights.reduce((s, w) => s + w, 0) || 1;
  let mean = 0;
  let m2 = 0;
  for (let i = 0; i < thetas.length; i++) {
    const w = weights[i] / sum;
    mean += w * thetas[i];
    m2 += w * thetas[i] * thetas[i];
  }
  const var_ = Math.max(0.01, m2 - mean * mean);
  return { theta: mean, se: Math.sqrt(var_) };
}
