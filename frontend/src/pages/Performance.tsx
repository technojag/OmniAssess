import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

export default function Performance() {
  const { data } = useQuery({ queryKey: ["history"], queryFn: () => api<any>("/api/analytics/history") });
  const rows = data?.assessments || [];
  return (
    <div className="max-w-4xl space-y-4">
      <h1 className="font-display text-4xl text-white">Performance</h1>
      <p className="text-slate-400">Official assessment history. Practice sessions are labeled and excluded from averages.</p>
      {rows.length === 0 && <p className="text-slate-500">No assessments yet.</p>}
      {rows.map((a: any) => (
        <div key={a.id} className="card flex items-center justify-between p-4">
          <div>
            <div className="font-medium text-white">{a.mode} {a.isPractice ? "(Practice)" : ""} — {a.scorePct?.toFixed?.(0) ?? "—"}%</div>
            <div className="text-xs text-slate-500">{new Date(a.startedAt).toLocaleString()} · integrity {a.integrityScore}%</div>
          </div>
          <Link className="btn-ghost" to={`/app/report/${a.id}`}>Scorecard</Link>
        </div>
      ))}
    </div>
  );
}
