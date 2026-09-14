import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export default function Notebook() {
  const { data } = useQuery({
    queryKey: ["notebook"],
    queryFn: () => api<any>("/api/analytics/notebook"),
  });
  const rows = data?.mistakes || [];
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Error notebook</h1>
      <p className="text-slate-400">Every miss is stored with a weakness type and similar items.</p>
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
