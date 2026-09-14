import test from "node:test";
import assert from "node:assert/strict";
import { eapTheta, itemInformation, probabilityCorrect, selectNextItem, updateThetaMap } from "./adaptive.js";
import { updateMastery } from "./knowledge.js";
import { bandFromScore, combineReadiness } from "./readiness.js";
import { classifyWeakness } from "./diagnosis.js";

test("2PL probability is 0.5 at theta = b", () => {
  assert.ok(Math.abs(probabilityCorrect(0, 1, 0) - 0.5) < 1e-9);
});

test("information peaks near difficulty", () => {
  const i0 = itemInformation(0, 1.2, 0);
  const i2 = itemInformation(2, 1.2, 0);
  assert.ok(i0 > i2);
});

test("theta rises after correct, falls after incorrect", () => {
  const up = updateThetaMap(0, 1, 0, true);
  const down = updateThetaMap(0, 1, 0, false);
  assert.ok(up > 0);
  assert.ok(down < 0);
});

test("selects unseen item with max information", () => {
  const item = selectNextItem(0, [
    { id: "easy", difficulty: -2, discrimination: 1 },
    { id: "mid", difficulty: 0, discrimination: 1.4 },
    { id: "hard", difficulty: 2, discrimination: 1 },
  ]);
  assert.equal(item?.id, "mid");
});

test("EAP recovers positive theta for all-correct hard-ish items", () => {
  const { theta } = eapTheta([
    { a: 1, b: 0, correct: true },
    { a: 1, b: 0.5, correct: true },
    { a: 1, b: 1, correct: true },
  ]);
  assert.ok(theta > 0);
});

test("mastery increases on success", () => {
  const next = updateMastery(0.3, true);
  assert.ok(next > 0.3);
});

test("readiness bands and limitations exist", () => {
  assert.equal(bandFromScore(0.2), "NOT_READY");
  assert.equal(bandFromScore(0.9), "HIGHLY_READY");
  const r = combineReadiness({
    masteryAvg: 0.6,
    recentAccuracy: 0.7,
    thetaNorm: 0.65,
    consistency: 0.5,
    activity: 0.4,
    interview: 0.4,
  });
  assert.ok(r.limitations.includes("prototype"));
});

test("weakness classifier uses prereq flag", () => {
  const w = classifyWeakness({
    isCorrect: false,
    timeMs: 1000,
    timeLimitSec: 90,
    conceptMastery: 0.7,
    prereqWeak: true,
  });
  assert.equal(w.type, "PREREQUISITE_GAP");
});
