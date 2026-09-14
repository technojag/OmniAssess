import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

export default function Performance() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["history"],
    queryFn: () => api<any>("/api/analytics/history"),
    retry: 1,
  });
  if (isLoading) return <p className="text-slate-400">Loading performance…</p>;
  if (error)
    return (
      <div className="max-w-4xl space-y-3">
        <h1 className="font-display text-4xl text-white">Performance</h1>
        <p className="text-sm text-rose-400">Could not load: {(error as Error).message}</p>
        <button className="btn-ghost" onClick={() => refetch()}>Retry</button>
      </div>
    );
  const rows = data?.assessments || [];
  const official = rows.filter((a: any) => !a.isPractice);
  const avg = official.length ? (official.reduce((s: number, a: any) => s + (a.scorePct ?? 0), 0) / official.length).toFixed(1) : "—";
  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl text-white">Performance</h1>
          <p className="mt-1 text-slate-400">Official history ({official.length} official · avg {avg}%). Practice sessions are labeled and excluded from averages.</p>
        </div>
        <button className="btn-ghost" onClick={() => refetch()} disabled={isFetching}>{isFetching ? "Refreshing…" : "Refresh"}</button>
      </div>
      {rows.length === 0 && <p className="text-slate-500">No assessments yet — start one from Assessments.</p>}
      {rows.map((a: any) => (
        <div key={a.id} className="card flex items-center justify-between p-4">
          <div>
            <div className="font-medium text-white">{a.mode} {a.isPractice ? "(Practice)" : ""} — {a.scorePct?.toFixed?.(0) ?? "—"}%</div>
            <div className="text-xs text-slate-500">{new Date(a.startedAt).toLocaleString()} · integrity {a.integrityScore}%</div>
          </div>
          <Link className="btn-ghost" to={`/app/report/${a.id}`}>Scorecard</Link>
        </div>
      ))}
      <div><Link className="btn-primary" to="/app/assessments">New assessment</Link></div>
    </div>
  );
}
