const ML = process.env.ML_SERVICE_URL || "http://127.0.0.1:8001";

export async function callMlTheta(
  responses: { a: number; b: number; correct: boolean }[]
): Promise<{ theta: number; se: number; source: string } | null> {
  try {
    const r = await fetch(`${ML}/estimate-theta`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        responses: responses.map((x) => ({ a: x.a, b: x.b, correct: x.correct })),
      }),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { theta: number; se: number };
    return { ...j, source: "python-ml" };
  } catch {
    return null;
  }
}

export async function callMlReadiness(payload: unknown) {
  try {
    const r = await fetch(`${ML}/readiness`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) return null;
    return r.json();
  } catch {
    return null;
  }
}
