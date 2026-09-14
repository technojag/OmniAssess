import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

export default function ActivityPage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["dash-activity"],
    queryFn: () => api<any>("/api/analytics/dashboard"),
    retry: 1,
  });
  if (isLoading) return <p className="text-slate-400">Loading activity…</p>;
  if (error)
    return (
      <div className="max-w-5xl space-y-3">
        <h1 className="font-display text-4xl text-white">Activity</h1>
        <p className="text-sm text-rose-400">Could not load: {(error as Error).message}</p>
        <p className="text-xs text-slate-500">Start the backend (npm run dev) then retry.</p>
        <button className="btn-ghost" onClick={() => refetch()}>Retry</button>
      </div>
    );
  const heat = (data?.heatmap || []) as { date: string; count: number }[];
  const max = Math.max(1, ...heat.map((h) => h.count));
  const activeDays = heat.filter((h) => h.count > 0);
  const totalQ = activeDays.reduce((s, h) => s + h.count, 0);
  const recent = [...activeDays].slice(-14).reverse();
  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl text-white">Activity</h1>
          <p className="mt-1 text-slate-400">365-day heatmap from real daily assessment and practice activity. Streak: {data?.streak?.current ?? 0} days (longest {data?.streak?.longest ?? 0}).</p>
        </div>
        <button className="btn-ghost" onClick={() => refetch()} disabled={isFetching}>{isFetching ? "Refreshing…" : "Refresh"}</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[["Active days", `${activeDays.length}`], ["Questions answered", `${totalQ}`], ["Best day", `${max}`]].map(([l, v]) => (
          <div key={l} className="card p-4"><div className="text-xs uppercase tracking-wider text-slate-500">{l}</div><div className="mt-1 font-display text-2xl text-white">{v}</div></div>
        ))}
      </div>
      <div className="card p-5">
        <div className="flex flex-wrap gap-[3px]">
          {heat.map((h) => (
            <div key={h.date} title={`${h.date}: ${h.count}`} className="h-[10px] w-[10px] rounded-[2px]"
              style={{ background: h.count === 0 ? "#161826" : `rgba(62,224,181,${0.25 + (h.count / max) * 0.75})` }} />
          ))}
        </div>
        {activeDays.length === 0 && <p className="mt-3 text-sm text-slate-500">No activity yet — start an assessment to light up the heatmap.</p>}
      </div>
      <div className="card p-5">
        <h2 className="font-semibold text-white">Recent active days</h2>
        {recent.length === 0
          ? <p className="mt-2 text-sm text-slate-500">Nothing recorded in the last 14 active days.</p>
          : <ul className="mt-2 space-y-1 text-sm">{recent.map((h) => <li key={h.date} className="flex justify-between"><span>{h.date}</span><span className="text-slate-400">{h.count} questions</span></li>)}</ul>}
        <div className="mt-3"><Link className="btn-primary" to="/app/assessments">Start assessment</Link></div>
      </div>
    </div>
  );
}
