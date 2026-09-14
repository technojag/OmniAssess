import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export default function SkillGap() {
  const { data } = useQuery({ queryKey: ["dash-skill"], queryFn: () => api<any>("/api/analytics/dashboard") });
  const weak = data?.stats?.weakAreas || [];
  const strong = data?.stats?.strongAreas || [];
  const recs = data?.recommendations || [];
  return (
    <div className="max-w-4xl space-y-5">
      <h1 className="font-display text-4xl text-white">Skill Gap</h1>
      <p className="text-slate-400">Computed from real attempts: topic accuracy, repeated errors and difficulty performance.</p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-5"><h2 className="font-semibold text-rose-300">Weak topics</h2>
          {weak.map((w: any) => <div key={w.concept} className="mt-2 text-sm">{w.concept} — {(w.mastery * 100).toFixed(0)}%</div>)}
          {weak.length === 0 && <p className="text-sm text-slate-500">No weak topics yet.</p>}
        </div>
        <div className="card p-5"><h2 className="font-semibold text-mint">Strong topics</h2>
          {strong.map((w: any) => <div key={w.concept} className="mt-2 text-sm">{w.concept} — {(w.mastery * 100).toFixed(0)}%</div>)}
          {strong.length === 0 && <p className="text-sm text-slate-500">Take a test to unlock strengths.</p>}
        </div>
      </div>
      <div className="card p-5"><h2 className="font-semibold">What to study next</h2>
        <ul className="mt-2 space-y-1 text-sm">{recs.map((r: any) => <li key={r.id}>P{r.priority} — {r.title}</li>)}</ul>
      </div>
    </div>
  );
}
