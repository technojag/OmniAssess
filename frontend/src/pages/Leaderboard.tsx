import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export default function Leaderboard() {
  const { data } = useQuery({ queryKey: ["board"], queryFn: () => api<any>("/api/analytics/leaderboard") });
  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="font-display text-4xl text-white">Leaderboard</h1>
      <p className="text-xs text-slate-500">{data?.note}</p>
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
