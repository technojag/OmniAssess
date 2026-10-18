import test from "node:test";
import assert from "node:assert/strict";
import { eapTheta, itemInformation, probabilityCorrect, selectNextItem, updateThetaMap } from "./adaptive.js";
import { updateMastery } from "./knowledge.js";
import { bandFromScore, combineReadiness } from "./readiness.js";
import { classifyWeakness } from "./diagnosis.js";
import { evaluateViolation, integrityConfig, labelFor } from "./integrity.js";
import { getExam, isValidSubject, normalizeExamSelection, EXAMS } from "./exams.js";
import { CATEGORIES, categoryForExam, getCategory, resolveSelection } from "./exams.js";
import { buildExamFilter } from "./questionBank.js";

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

// ---------------- Universal exam hierarchy ----------------

test("catalog exposes exam -> subject -> topic for every exam", () => {
  assert.ok(EXAMS.length >= 5);
  for (const exam of EXAMS) {
    assert.ok(exam.subjects.length > 0, `${exam.examName} has subjects`);
    for (const subject of exam.subjects) {
      assert.ok(subject.topics.length > 0, `${exam.examName}/${subject.name} has topics`);
    }
  }
});

test("exam lookup is case insensitive and subjects are exam scoped", () => {
  assert.equal(getExam("ssc_cgl")?.examName, "SSC_CGL");
  assert.equal(isValidSubject("SSC_CGL", "Quantitative Aptitude"), true);
  assert.equal(isValidSubject("SSC_CGL", "DSA"), false);
  assert.equal(isValidSubject("BTECH", "DSA"), true);
  assert.equal(isValidSubject("BTECH", "Quantitative Aptitude"), false);
});

test("normalizeExamSelection defaults and uppercases the exam", () => {
  const scope = normalizeExamSelection({ examName: "btech", subject: "DSA", difficulty: "hard" });
  assert.equal(scope.examName, "BTECH");
  assert.equal(scope.examCategory, "COLLEGE");
  assert.equal(scope.subject, "DSA");
  assert.equal(scope.difficulty, "HARD");

  const fallback = normalizeExamSelection({});
  assert.equal(fallback.examName, "DSA");
  assert.equal(fallback.difficulty, "MIXED");
});

test("exam filter constrains retrieval to the selected slice", () => {
  const filter = buildExamFilter({ examName: "ssc_cgl", subject: "Quantitative Aptitude", topic: "Percentage", difficulty: "MEDIUM" });
  assert.equal(filter.examName, "SSC_CGL");
  assert.equal(filter.subject, "Quantitative Aptitude");
  assert.equal(filter.topic, "Percentage");
  assert.deepEqual(filter.difficulty, { gte: -0.5, lte: 0.5 });

  const mixed = buildExamFilter({ examName: "BTECH", subject: "DSA", topic: "Mixed", difficulty: "MIXED" });
  assert.equal(mixed.topic, undefined);
  assert.equal(mixed.difficulty, undefined);
});

// ---------------- Proctoring enforcement ----------------

test("low-confidence detection is logged, never punished", () => {
  const v = evaluateViolation({ kind: "PHONE_DETECTED", confidence: 0.45, warningCount: 0, severity: "MEDIUM", integrityScore: 100 });
  assert.equal(v.action, "LOG");
  assert.equal(v.confirmed, false);
  assert.equal(v.penalty, 0);
});

test("confirmed violation warns first and terminates on the third", () => {
  const first = evaluateViolation({ kind: "PHONE_DETECTED", confidence: 0.85, warningCount: 0, severity: "MEDIUM", integrityScore: 100 });
  assert.equal(first.action, "WARNING");
  assert.ok(first.penalty > 0);

  const second = evaluateViolation({ kind: "FACE_AWAY", confidence: 0.8, warningCount: 1, severity: "LOW", integrityScore: 88 });
  assert.equal(second.action, "WARNING");

  const third = evaluateViolation({ kind: "NO_FACE", confidence: 0.8, warningCount: 2, severity: "LOW", integrityScore: 86 });
  assert.equal(third.action, "TERMINATE");
  assert.match(third.reason, /Repeated suspicious activity/);
});

test("tab switch and disabled camera terminate immediately", () => {
  const tab = evaluateViolation({ kind: "TAB_SWITCH", confidence: 1, warningCount: 0, severity: "HIGH", integrityScore: 100 });
  assert.equal(tab.action, "TERMINATE");
  assert.equal(tab.severity, "HIGH");

  const cam = evaluateViolation({ kind: "CAMERA_DISABLED", confidence: 1, warningCount: 0, severity: "HIGH", integrityScore: 100 });
  assert.equal(cam.action, "TERMINATE");
});

test("integrity collapse below the threshold terminates", () => {
  const low = integrityConfig.terminationThreshold;
  const v = evaluateViolation({
    kind: "SUSPICIOUS_ACTIVITY",
    confidence: 0.9,
    warningCount: 0,
    severity: "HIGH",
    integrityScore: low + 1,
  });
  assert.equal(v.action, "TERMINATE");
});

test("violation kinds expose human readable labels", () => {
  assert.equal(labelFor("TAB_SWITCH"), "Tab switched away from the test");
  assert.equal(labelFor("UNKNOWN_KIND"), "unknown kind");
});

// ---------------- Central category selection ----------------

test("every category maps to exams that exist in the catalog", () => {
  assert.ok(CATEGORIES.length >= 4);
  for (const c of CATEGORIES) {
    assert.ok(c.exams.includes(c.defaultExam), `${c.categoryId} defaultExam is one of its exams`);
    for (const e of c.exams) {
      assert.ok(getExam(e), `${c.categoryId} -> ${e} exists in EXAMS`);
    }
    assert.equal(c.interviewRubric.length, 3, `${c.categoryId} has a 3-dimension rubric`);
  }
});

test("categories own distinct exam domains", () => {
  const tech = resolveSelection({ category: "TECHNICAL" });
  const ssc = resolveSelection({ category: "SSC_CGL" });
  const c10 = resolveSelection({ category: "CLASS_10" });

  assert.equal(tech.exam.examName, "BTECH");
  assert.equal(ssc.exam.examName, "SSC_CGL");
  assert.equal(c10.exam.examName, "CLASS_10");

  // No cross-contamination of subjects between categories.
  const techSubjects = tech.exam.subjects.map((s) => s.name);
  const sscSubjects = ssc.exam.subjects.map((s) => s.name);
  assert.equal(techSubjects.includes("Quantitative Aptitude"), false);
  assert.equal(sscSubjects.includes("DSA"), false);
  assert.equal(sscSubjects.includes("General Awareness"), true);
});

test("rubrics differ per category so evaluation matches the exam", () => {
  const tech = getCategory("TECHNICAL").interviewRubric.map((r) => r.key);
  const ssc = getCategory("SSC_CGL").interviewRubric.map((r) => r.key);
  const c10 = getCategory("CLASS_10").interviewRubric.map((r) => r.key);
  assert.deepEqual(tech, ["relevance", "structure", "depth"]);
  assert.deepEqual(ssc, ["awareness", "communication", "confidence"]);
  assert.deepEqual(c10, ["subjectKnowledge", "clarity", "confidence"]);
});

test("resolveSelection rejects a subject from another exam", () => {
  const r = resolveSelection({ category: "SSC_CGL", subject: "DSA" });
  assert.equal(r.exam.examName, "SSC_CGL");
  assert.notEqual(r.subject, "DSA");
  assert.equal(r.subject, sscFirstSubject());
});

function sscFirstSubject() {
  return getExam("SSC_CGL")!.subjects[0].name;
}

test("an explicit examName wins over a conflicting category", () => {
  // Skill Gap / Interview send examName directly; it must not be overridden by
  // the stored preference category.
  const r = resolveSelection({ category: "SSC_CGL", examName: "BTECH" });
  assert.equal(r.exam.examName, "BTECH");
  assert.equal(r.category.categoryId, "TECHNICAL");

  const c10 = resolveSelection({ category: "TECHNICAL", examName: "CLASS_10" });
  assert.equal(c10.exam.examName, "CLASS_10");
  assert.equal(c10.category.categoryId, "CLASS_10");
});

test("category alone falls back to its default exam", () => {
  const r = resolveSelection({ category: "SSC_CGL" });
  assert.equal(r.exam.examName, "SSC_CGL");
  const tech = resolveSelection({ category: "TECHNICAL" });
  assert.equal(tech.exam.examName, "BTECH");
});

test("an unknown examName falls back to the category default", () => {
  const r = resolveSelection({ category: "CLASS_10", examName: "NOT_AN_EXAM" });
  assert.equal(r.exam.examName, "CLASS_10");
});

test("categoryForExam maps every exam to a category", () => {
  for (const exam of EXAMS) {
    const cat = categoryForExam(exam.examName);
    assert.ok(cat.exams.includes(exam.examName), `${exam.examName} maps back to ${cat.categoryId}`);
  }
});
