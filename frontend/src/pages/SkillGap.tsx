import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import ExamPicker, { type ExamSelection } from "../components/ExamPicker";

type Topic = {
  topic: string;
  attempts: number;
  correct: number;
  accuracy: number | null;
  avgTimeMs: number | null;
  status: "WEAK" | "OK" | "STRONG" | "MISSING";
};
type SubjectRow = {
  subject: string;
  attempts: number;
  accuracy: number | null;
  covered: boolean;
  topics: Topic[];
  weakTopics: string[];
  strongTopics: string[];
  missingTopics: string[];
};

export default function SkillGap() {
  const nav = useNavigate();
  const [selection, setSelection] = useState<ExamSelection>({
    categoryId: "TECHNICAL",
    examName: "BTECH",
    subject: "DSA",
    topic: "Mixed",
    difficulty: "MIXED",
  });
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Start from the persisted selection so every module agrees.
  useEffect(() => {
    api<{ active: any }>("/api/preferences/exam")
      .then((r) => {
        setSelection((s) => ({
          ...s,
          categoryId: r.active.category.categoryId,
          examName: r.active.examName,
          subject: r.active.subject,
        }));
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    let live = true;
    setLoading(true);
    setError("");
    const qs = new URLSearchParams({ examName: selection.examName, category: selection.categoryId });
    api<any>(`/api/analytics/skill-gap?${qs.toString()}`)
      .then((r) => {
        if (live) setData(r);
      })
      .catch((e: any) => {
        if (live) setError(e.message || "Could not load skill gap");
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [ready, selection.examName, selection.categoryId]);

  if (error && !data)
    return (
      <div className="max-w-4xl space-y-3">
        <h1 className="font-display text-4xl text-white">Skill Gap</h1>
        <p className="text-sm text-rose-400">Could not load: {error}</p>
        <button className="btn-ghost" onClick={() => nav("/app")}>Back to dashboard</button>
      </div>
    );

  const exam = data?.exam;
  const summary = data?.summary;
  const subjects: SubjectRow[] = data?.subjects || [];
  const recs = data?.recommendations || [];
  const dataAvailable = Boolean(data?.dataAvailable);
  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <h1 className="font-display text-4xl text-white">Skill Gap</h1>
        <p className="mt-1 text-slate-400">
          {exam ? (
            <>
              {exam.examLabel} · {exam.categoryLabel}
              {summary && summary.accuracy !== null && summary.accuracy !== undefined && (
                <> · {(summary.accuracy * 100).toFixed(0)}% across {summary.totalAttempts} attempts</>
              )}
            </>
          ) : (
            "Loading…"
          )}
        </p>
      </div>

      <ExamPicker value={selection} onChange={setSelection} onPersist={() => setSelection((s) => ({ ...s }))} />

      {loading && <p className="text-slate-400">Analysing your {exam?.examLabel} performance…</p>}

      {!loading && !dataAvailable && (
        <div className="card border-accent/30 bg-accent/[0.05] p-5">
          <h2 className="font-semibold text-white">No {exam?.examLabel} assessment data yet</h2>
          <p className="mt-2 text-sm text-slate-400">{data?.emptyMessage}</p>
          <p className="mt-2 text-xs text-slate-500">
            Skill gaps are computed from your real attempts only — nothing is estimated or invented.
          </p>
          <div className="mt-3 flex gap-2">
            <button className="btn-primary" onClick={() => nav("/app/assessments")}>Take a {exam?.examLabel} assessment</button>
            <button className="btn-ghost" onClick={() => nav("/app/practice")}>Go to Practice Arena</button>
          </div>
        </div>
      )}

      {dataAvailable && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="card p-5">
              <div className="text-xs uppercase tracking-wider text-slate-500">Overall accuracy</div>
              <div className="mt-2 font-display text-4xl text-white">{((summary?.accuracy ?? 0) * 100).toFixed(0)}%</div>
              <div className="mt-1 text-xs text-slate-400">{summary?.totalCorrect}/{summary?.totalAttempts} correct</div>
            </div>
            <div className="card p-5">
              <div className="text-xs uppercase tracking-wider text-slate-500">Syllabus coverage</div>
              <div className="mt-2 font-display text-4xl text-white">{summary?.subjectsCovered}/{summary?.subjectsTotal}</div>
              <div className="mt-1 text-xs text-slate-400">subjects attempted</div>
            </div>
            <div className="card p-5">
              <div className="text-xs uppercase tracking-wider text-slate-500">Avg response time</div>
              <div className="mt-2 font-display text-4xl text-white">{((summary?.avgTimeMs ?? 0) / 1000).toFixed(0)}s</div>
              <div className="mt-1 text-xs text-slate-400">per answered question</div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card p-5">
              <h2 className="font-semibold text-rose-300">Weak subjects</h2>
              {(data.weakSubjects || []).length === 0
                ? <p className="mt-2 text-sm text-slate-500">No subject below 60% yet.</p>
                : (
                  <ul className="mt-2 space-y-2 text-sm">
                    {data.weakSubjects.map((w: any) => (
                      <li key={w.subject} className="rounded-xl border border-line p-3">
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-200">{w.subject}</span>
                          <span className="text-slate-400">{(w.accuracy * 100).toFixed(0)}% · {w.attempts} attempts</span>
                        </div>
                        {w.weakTopics?.length > 0 && <div className="mt-1 text-xs text-rose-300">Weak topics: {w.weakTopics.join(", ")}</div>}
                      </li>
                    ))}
                  </ul>
                )}
            </div>
            <div className="card p-5">
              <h2 className="font-semibold text-mint">Strong subjects</h2>
              {(data.strongSubjects || []).length === 0
                ? <p className="mt-2 text-sm text-slate-500">No subject at 75%+ yet.</p>
                : (
                  <ul className="mt-2 space-y-2 text-sm">
                    {data.strongSubjects.map((w: any) => (
                      <li key={w.subject} className="rounded-xl border border-line p-3">
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-200">{w.subject}</span>
                          <span className="text-slate-400">{(w.accuracy * 100).toFixed(0)}% · {w.attempts} attempts</span>
                        </div>
                        {w.strongTopics?.length > 0 && <div className="mt-1 text-xs text-mint">Strong topics: {w.strongTopics.join(", ")}</div>}
                      </li>
                    ))}
                  </ul>
                )}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="font-display text-2xl text-white">Subject &amp; topic breakdown</h2>
            {subjects.map((s) => (
              <div key={s.subject} className="card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-white">{s.subject}</h3>
                  <span className="text-xs text-slate-400">
                    {s.covered ? `${(s.accuracy! * 100).toFixed(0)}% · ${s.attempts} attempts` : "Not attempted yet"}
                  </span>
                </div>
                <ul className="mt-3 space-y-1 text-sm">
                  {s.topics.map((t) => (
                    <li key={t.topic} className="flex flex-wrap items-center justify-between gap-2">
                      <span className={
                        t.status === "WEAK" ? "text-rose-300"
                        : t.status === "STRONG" ? "text-mint"
                        : t.status === "MISSING" ? "text-slate-500"
                        : "text-slate-300"
                      }>
                        {t.topic}
                      </span>
                      <span className="text-xs text-slate-500">
                        {t.status === "MISSING"
                          ? "not attempted"
                          : `${(t.accuracy! * 100).toFixed(0)}% (${t.correct}/${t.attempts})`}
                        {t.status !== "MISSING" && t.avgTimeMs ? ` · ${(t.avgTimeMs / 1000).toFixed(0)}s` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="card p-5">
            <h2 className="font-semibold text-white">Personalised improvement plan</h2>
            {recs.length === 0
              ? <p className="mt-2 text-sm text-slate-500">No weak or missing topics detected — attempt more items to refine this.</p>
              : (
                <ul className="mt-2 space-y-2 text-sm">
                  {recs.map((r: any, i: number) => (
                    <li key={`${r.subject}-${r.topic}-${i}`} className="rounded-xl border border-line bg-ink/40 p-3">
                      <span className="text-mint">P{r.priority}</span>{" "}
                      <span className="font-medium text-white">{r.subject} · {r.topic}</span>
                      <div className="mt-1 text-xs text-slate-400">{r.rationale}</div>
                    </li>
                  ))}
                </ul>
              )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Link className="btn-primary" to="/app/assessments">Practise weak areas</Link>
            <Link className="btn-ghost" to="/app/practice">Practice Arena</Link>
            <Link className="btn-ghost" to="/app">Back to dashboard</Link>
          </div>
          <p className="text-xs text-slate-500">{data.note}</p>
        </>
      )}
    </div>
  );
}
