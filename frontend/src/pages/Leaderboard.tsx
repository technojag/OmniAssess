import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export default function Leaderboard() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["board"],
    queryFn: () => api<any>("/api/analytics/leaderboard"),
    retry: 1,
  });
  if (isLoading) return <p className="text-slate-400">Loading leaderboard…</p>;
  if (error)
    return (
      <div className="max-w-3xl space-y-3">
        <h1 className="font-display text-4xl text-white">Leaderboard</h1>
        <p className="text-sm text-rose-400">Could not load: {(error as Error).message}</p>
        <button className="btn-ghost" onClick={() => refetch()}>Retry</button>
      </div>
    );
  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl text-white">Leaderboard</h1>
          <p className="mt-1 text-xs text-slate-500">{data?.note}</p>
        </div>
        <button className="btn-ghost" onClick={() => refetch()} disabled={isFetching}>{isFetching ? "Refreshing…" : "Refresh"}</button>
      </div>
      {(data?.leaderboard || []).map((r: any) => (
        <div key={`${r.rank}-${r.name}`} className={`card flex justify-between p-4 ${r.isYou ? "border-mint/50" : ""}`}>
          <span>#{r.rank} {r.name} {r.isYou ? "(you)" : ""}</span>
          <span className="text-slate-400">{r.avgScore}% · {r.assessments}</span>
        </div>
      ))}
      {(data?.leaderboard || []).length === 0 && <p className="text-slate-500">No completed assessments yet.</p>}
    </div>
  );
}
