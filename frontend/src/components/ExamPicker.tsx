import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

type Subject = { name: string; topics: string[] };
type ExamOption = { examName: string; label: string; subjects: Subject[] };
type Category = {
  categoryId: string;
  label: string;
  description: string;
  defaultExam: string;
  exams: ExamOption[];
};

export type ExamSelection = {
  categoryId: string;
  examName: string;
  subject: string;
  topic: string;
  difficulty: string;
};

const DIFFICULTIES = ["MIXED", "EASY", "MEDIUM", "HARD"];

/**
 * Centralized exam/category selector. Persists to /api/preferences/exam so
 * Skill Gap, AI Interview, Practice Arena and assessments all stay consistent.
 */
export default function ExamPicker({
  value,
  onChange,
  showTopic = false,
  showDifficulty = false,
  onPersist,
  compact = false,
}: {
  value: ExamSelection;
  onChange: (next: ExamSelection) => void;
  showTopic?: boolean;
  showDifficulty?: boolean;
  onPersist?: () => void;
  compact?: boolean;
}) {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    api<{ categories: Category[] }>("/api/preferences/exam")
      .then((r) => setCategories(r.categories))
      .catch(() => setCategories([]));
  }, []);

  const category = useMemo(
    () => categories.find((c) => c.categoryId === value.categoryId) || categories[0],
    [categories, value.categoryId]
  );
  const exam = useMemo(
    () => category?.exams.find((e) => e.examName === value.examName) || category?.exams[0],
    [category, value.examName]
  );
  const topics = exam?.subjects.find((s) => s.name === value.subject)?.topics || [];

  function pickCategory(categoryId: string) {
    const next = categories.find((c) => c.categoryId === categoryId);
    if (!next) return;
    const firstExam = next.exams[0];
    onChange({
      categoryId,
      examName: firstExam.examName,
      subject: firstExam.subjects[0]?.name || "",
      topic: "Mixed",
      difficulty: value.difficulty,
    });
    persist({ categoryId, examName: firstExam.examName, subject: firstExam.subjects[0]?.name || "" });
  }

  function pickExam(examName: string) {
    const target = category?.exams.find((e) => e.examName === examName);
    const subject = target?.subjects[0]?.name || "";
    onChange({ ...value, examName, subject, topic: "Mixed" });
    persist({ categoryId: value.categoryId, examName, subject });
  }

  function pickSubject(subject: string) {
    onChange({ ...value, subject, topic: "Mixed" });
    persist({ categoryId: value.categoryId, examName: value.examName, subject });
  }

  async function persist(next: { categoryId: string; examName: string; subject: string }) {
    try {
      await api("/api/preferences/exam", {
        method: "PUT",
        body: JSON.stringify(next),
      });
      onPersist?.();
    } catch {
      // Selection still works locally if persistence fails.
    }
  }

  return (
    <div className={`card space-y-3 ${compact ? "p-4" : "p-5"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-white">Exam / Category</h2>
        <span className="text-xs text-slate-500">Drives Skill Gap, Interview, Practice & assessments</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c.categoryId}
            type="button"
            onClick={() => pickCategory(c.categoryId)}
            title={c.description}
            className={`rounded-xl border px-3 py-2 text-sm transition ${
              value.categoryId === c.categoryId
                ? "border-accent bg-accent/15 text-white"
                : "border-line text-slate-400 hover:bg-white/5"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {category && <p className="text-xs text-slate-500">{category.description}</p>}

      <div className={`grid gap-3 ${showTopic || showDifficulty ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        {category && category.exams.length > 1 && (
          <label className="text-xs uppercase tracking-wider text-slate-500">
            Exam
            <select className="input mt-2" value={exam?.examName || ""} onChange={(e) => pickExam(e.target.value)}>
              {category.exams.map((e) => (
                <option key={e.examName} value={e.examName}>{e.label}</option>
              ))}
            </select>
          </label>
        )}
        <label className="text-xs uppercase tracking-wider text-slate-500">
          Subject
          <select className="input mt-2" value={value.subject} onChange={(e) => pickSubject(e.target.value)}>
            {(exam?.subjects || []).map((s) => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>
        </label>
        {showTopic && (
          <label className="text-xs uppercase tracking-wider text-slate-500">
            Topic
            <select className="input mt-2" value={value.topic} onChange={(e) => onChange({ ...value, topic: e.target.value })}>
              <option value="Mixed">All topics</option>
              {topics.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
        )}
        {showDifficulty && (
          <label className="text-xs uppercase tracking-wider text-slate-500">
            Difficulty
            <select className="input mt-2" value={value.difficulty} onChange={(e) => onChange({ ...value, difficulty: e.target.value })}>
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
        )}
      </div>
    </div>
  );
}