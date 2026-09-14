import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export default function Notebook() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["notebook"],
    queryFn: () => api<any>("/api/analytics/notebook"),
    retry: 1,
  });
  if (isLoading) return <p className="text-slate-400">Loading error notebook…</p>;
  if (error)
    return (
      <div className="space-y-3">
        <h1 className="font-display text-4xl">Error notebook</h1>
        <p className="text-sm text-rose-400">Could not load: {(error as Error).message}</p>
        <button className="btn-ghost" onClick={() => refetch()}>Retry</button>
      </div>
    );
  const rows = data?.mistakes || [];
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">Error notebook ({rows.length})</h1>
          <p className="mt-1 text-slate-400">Every miss is stored with a weakness type and similar items.</p>
        </div>
        <button className="btn-ghost" onClick={() => refetch()} disabled={isFetching}>{isFetching ? "Refreshing…" : "Refresh"}</button>
      </div>
      {rows.length === 0 && <p className="text-slate-500">No mistakes yet — take an assessment.</p>}
      {rows.map((m: any) => (
        <div key={m.id} className="card p-5 space-y-2">
          <div className="text-xs text-mint">{m.weaknessType}</div>
          <div className="font-medium">{m.question?.stem || m.stem}</div>
          <p className="text-sm text-slate-400">{m.reason}</p>
        </div>
      ))}
    </div>
  );
}
