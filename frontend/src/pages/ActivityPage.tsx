import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export default function ActivityPage() {
  const { data } = useQuery({ queryKey: ["dash-activity"], queryFn: () => api<any>("/api/analytics/dashboard") });
  const heat = (data?.heatmap || []) as { date: string; count: number }[];
  const max = Math.max(1, ...heat.map((h) => h.count));
  return (
    <div className="max-w-5xl space-y-4">
      <h1 className="font-display text-4xl text-white">Activity</h1>
      <p className="text-slate-400">365-day heatmap from real daily assessment and practice activity. Streak: {data?.streak?.current ?? 0} days (longest {data?.streak?.longest ?? 0}).</p>
      <div className="card p-5">
        <div className="flex flex-wrap gap-[3px]">
          {heat.map((h) => (
            <div key={h.date} title={`${h.date}: ${h.count}`} className="h-[10px] w-[10px] rounded-[2px]"
              style={{ background: h.count === 0 ? "#161826" : `rgba(62,224,181,${0.25 + (h.count / max) * 0.75})` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
