import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

export default function Performance() {
  const [rows, setRows] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    Promise.all([api<any>("/api/analytics/history"), api<any>("/api/preferences/exam")])
      .then(([h, p]) => {
        if (!live) return;
        setRows(h.assessments || []);
        setActive(p.active);
      })
      .catch((e: any) => {
        if (live) setError(e.message || "Could not load performance");
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);

  if (loading) return <p className="text-slate-400">Loading performance…</p>;
  if (error)
    return (
      <div className="max-w-4xl space-y-3">
        <h1 className="font-display text-4xl text-white">Performance</h1>
        <p className="text-sm text-rose-400">Could not load: {error}</p>
        <Link className="btn-ghost" to="/app">Back to dashboard</Link>
      </div>
    );

  const official = rows.filter((a: any) => !a.isPractice);
  const scoped = active ? official.filter((a: any) => a.examName === active.examName) : [];
  const avg = official.length ? (official.reduce((s: number, a: any) => s + (a.scorePct ?? 0), 0) / official.length).toFixed(1) : "—";

  // Subject-wise breakdown for the active exam only.
  const bySubject = new Map<string, { attempts: number; total: number }>();
  for (const a of scoped) {
    const key = a.subject || "General";
    const cur = bySubject.get(key) || { attempts: 0, total: 0 };
    cur.attempts += 1;
    cur.total += a.scorePct ?? 0;
    bySubject.set(key, cur);
  }

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl text-white">Performance</h1>
          <p className="mt-1 text-slate-400">
            Official history ({official.length} official · avg {avg}%). Practice sessions are labeled and excluded from averages.
          </p>
        </div>
      </div>

      {active && (
        <div className="card p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-1 text-xs text-accent">
              {active.category?.label}
            </span>
            <span className="text-sm text-slate-400">
              {active.examLabel} · {scoped.length} official assessment{scoped.length === 1 ? "" : "s"}
            </span>
          </div>
          {bySubject.size > 0 ? (
            <ul className="mt-3 space-y-1 text-sm">
              {Array.from(bySubject.entries()).map(([subject, v]) => (
                <li key={subject} className="flex items-center justify-between">
                  <span className="text-slate-200">{subject}</span>
                  <span className="text-slate-400">
                    {(v.total / v.attempts).toFixed(0)}% · {v.attempts} assessment{v.attempts === 1 ? "" : "s"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              No {active.examLabel} assessments yet — the breakdown appears once you take one.
            </p>
          )}
        </div>
      )}

      {rows.length === 0 && <p className="text-slate-500">No assessments yet — start one from Assessments.</p>}
      {rows.map((a: any) => (
        <div key={a.id} className="card flex items-center justify-between p-4">
          <div>
            <div className="font-medium text-white">
              {a.examName?.replace(/_/g, " ")} · {a.subject} · {a.mode} {a.isPractice ? "(Practice)" : ""} — {a.scorePct?.toFixed?.(0) ?? "—"}%
            </div>
            <div className="text-xs text-slate-500">
              {new Date(a.startedAt).toLocaleString()} · integrity {a.integrityScore}% · topic {a.topic} · {a.difficulty}
            </div>
          </div>
          <Link className="btn-ghost" to={`/app/report/${a.id}`}>Scorecard</Link>
        </div>
      ))}
      <div><Link className="btn-primary" to="/app/assessments">New assessment</Link></div>
    </div>
  );
}
