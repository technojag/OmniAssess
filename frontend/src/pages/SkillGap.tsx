import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

export default function SkillGap() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["dash-skill"],
    queryFn: () => api<any>("/api/analytics/dashboard"),
    retry: 1,
  });
  if (isLoading) return <p className="text-slate-400">Loading skill gaps…</p>;
  if (error)
    return (
      <div className="max-w-4xl space-y-3">
        <h1 className="font-display text-4xl text-white">Skill Gap</h1>
        <p className="text-sm text-rose-400">Could not load: {(error as Error).message}</p>
        <p className="text-xs text-slate-500">Is the backend running on http://localhost:4000? Run npm run dev from repo root.</p>
        <button className="btn-ghost" onClick={() => refetch()}>Retry</button>
      </div>
    );
  const weak = data?.stats?.weakAreas || [];
  const strong = data?.stats?.strongAreas || [];
  const recs = data?.recommendations || [];
  const heat = new Map<string, any>((data?.skillHeatmap || []).map((s: any) => [s.concept, s]));
  const due = data?.dueReview || [];
  const readiness = data?.readiness || {};
  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl text-white">Skill Gap</h1>
          <p className="mt-1 text-slate-400">
            Computed from real attempts.
            {typeof readiness.overall === "number" && (
              <> Readiness {(readiness.overall * 100).toFixed(0)}/100 ({String(readiness.band || "").replace("_", " ")})</>
            )}
          </p>
        </div>
        <button className="btn-ghost" onClick={() => refetch()} disabled={isFetching}>{isFetching ? "Refreshing…" : "Refresh"}</button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-5"><h2 className="font-semibold text-rose-300">Weak topics ({weak.length})</h2>
          {weak.map((w: any) => {
            const extra = heat.get(w.concept);
            return (
              <div key={w.concept} className="mt-3 text-sm">
                <div className="flex justify-between gap-2"><span className="text-slate-200">{w.concept}</span><span className="text-slate-400">{(w.mastery * 100).toFixed(0)}%{extra ? ` · ${extra.attempts} attempts` : ""}</span></div>
                <div className="mt-1 h-1.5 rounded-full bg-white/10"><div className="h-1.5 rounded-full bg-rose-300" style={{ width: `${w.mastery * 100}%` }} /></div>
                {extra && <div className="mt-1 text-xs text-slate-500">{extra.dimension} · {(extra.retention * 100).toFixed(0)}% retained</div>}
              </div>
            );
          })}
          {weak.length === 0 && <p className="mt-2 text-sm text-slate-500">No weak topics yet — complete an assessment.</p>}
        </div>
        <div className="card p-5"><h2 className="font-semibold text-mint">Strong topics ({strong.length})</h2>
          {strong.map((w: any) => <div key={w.concept} className="mt-2 text-sm">{w.concept} — {(w.mastery * 100).toFixed(0)}%</div>)}
          {strong.length === 0 && <p className="text-sm text-slate-500">Take a test to unlock strengths.</p>}
        </div>
      </div>
      <div className="card p-5"><h2 className="font-semibold text-white">What to study next</h2>
        {recs.length === 0
          ? <p className="mt-2 text-sm text-slate-500">Complete an assessment to generate recommendations.</p>
          : <ul className="mt-2 space-y-2 text-sm">{recs.map((r: any) => <li key={r.id} className="rounded-xl border border-line bg-ink/40 p-3"><span className="text-mint">P{r.priority}</span> <span className="font-medium text-white">{r.title}</span><div className="mt-1 text-xs text-slate-400">{r.rationale}</div></li>)}</ul>}
      </div>
      <div className="card p-5"><h2 className="font-semibold text-white">Due for review ({due.length})</h2>
        {(due || []).length === 0
          ? <p className="mt-2 text-sm text-slate-500">Nothing due — spaced-repetition queue is clear.</p>
          : <ul className="mt-2 space-y-1 text-sm">{(due || []).map((d: any) => <li key={d.concept} className="flex justify-between"><span>{d.concept}</span><span className="text-slate-500">{(d.mastery * 100).toFixed(0)}%</span></li>)}</ul>}
        {readiness.limitations && <p className="mt-3 text-xs text-slate-500">{readiness.limitations}</p>}
        <div className="mt-3 flex flex-wrap gap-2"><Link className="btn-primary" to="/app/assessments">Practice weak areas</Link><Link className="btn-ghost" to="/app">Back to dashboard</Link></div>
      </div>
    </div>
  );
}
