import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { api } from "../lib/api";
import { useAuth } from "../store/auth";

export default function Dashboard() {
  const nav = useNavigate();
  const user = useAuth((s) => s.user);
  const [actionError, setActionError] = useState("");
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["dash"],
    queryFn: () => api<any>("/api/analytics/dashboard"),
    retry: 1,
  });

  async function start(mode: "ADAPTIVE" | "FIXED" | "DAILY_CHALLENGE") {
    setActionError("");
    try {
      const r = await api<any>("/api/assessments/start", {
        method: "POST",
        body: JSON.stringify({ mode }),
      });
      nav(`/app/assess/${r.assessment.id}`);
    } catch (e: any) {
      setActionError(e.message || "Could not start assessment");
    }
  }

  if (isLoading) return <p className="text-slate-400">Loading dashboard…</p>;
  if (error)
    return (
      <div className="max-w-2xl space-y-3">
        <h1 className="font-display text-4xl text-white">Dashboard unavailable</h1>
        <p className="text-sm text-rose-400">Could not load: {(error as Error).message}</p>
        <p className="text-xs text-slate-500">Is the backend running? Run npm run dev from the repo root, then retry.</p>
        <button className="btn-ghost" onClick={() => refetch()} disabled={isFetching}>{isFetching ? "Retrying…" : "Retry"}</button>
      </div>
    );

  const heat = (data.heatmap || []) as { date: string; count: number }[];
  const max = Math.max(1, ...heat.map((h) => h.count));
  const readiness = data.readiness || {};
  const overall = typeof readiness.overall === "number" ? readiness.overall : 0;
  const band = readiness.band || "DEVELOPING";
  const stats = data.stats || { totalAssessments: 0, averageScore: 0, averageIntegrity: 100 };
  const profile = data.profile || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-mint"><span className="h-1.5 w-1.5 rounded-full bg-mint" />Candidate dashboard</div>
          <h1 className="mt-3 font-display text-4xl text-white sm:text-5xl">Welcome, {user?.name || "Learner"}</h1>
          <p className="mt-2 max-w-2xl text-slate-400">{profile.category || "Learner"} · {profile.customFocus || profile?.candidateContext?.focus || "General focus"} · Streak {data.streak?.current ?? 0}/{data.streak?.longest ?? 0} days</p>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-3">
          <button className="btn-primary" onClick={() => start("ADAPTIVE")}>Start Assessment</button>
          <button className="btn-ghost" onClick={() => nav("/app/interview")}>Start AI Interview</button>
          <button className="btn-ghost" onClick={() => nav("/app/practice")}>Practice Arena</button>
        </div>
      </div>
      {actionError && <p className="text-sm text-rose-400">{actionError}</p>}

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["Total assessments", `${stats.totalAssessments ?? 0}`, "completed"],
          ["Average score", `${stats.averageScore ?? 0}%`, "official only"],
          ["Avg integrity", `${stats.averageIntegrity ?? 100}%`, "signals reviewed"],
          ["Readiness", `${(overall * 100).toFixed(0)}/100`, band.replace("_", " ")],
        ].map(([label, value, sub]) => (
          <div key={label} className="card p-5">
            <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
            <div className="mt-2 font-display text-3xl">{value}</div>
            <div className="mt-1 text-xs text-slate-500">{sub}</div>
          </div>
        ))}
      </div>
      <div className="card p-5">
        <h2 className="font-semibold">Improvement — Assess → Practice → Re-assess</h2>
        {(stats.improvement || []).length > 0 ? (
          <div className="mt-3 h-56">
            <ResponsiveContainer>
              <LineChart data={stats.improvement}>
                <CartesianGrid stroke="#1e2233" />
                <XAxis dataKey="mode" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#3ee0b5" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">Complete two assessments to see your improvement curve.</p>
        )}
        <div className="mt-3 text-sm">
          <div className="text-xs uppercase tracking-wider text-slate-500">Recent assessments</div>
          {(data.recentAssessments || []).slice(0, 4).map((a: any) => (
            <div key={a.id}><Link className="text-accent" to={`/app/report/${a.id}`}>{a.mode} — {a.score?.toFixed?.(0) ?? 0}%</Link></div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="font-semibold mb-3">Skill radar · weak vs strong</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <RadarChart data={data.radar || []}>
                <PolarGrid stroke="#1e2233" />
                <PolarAngleAxis dataKey="dimension" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 1]} tick={false} axisLine={false} />
                <Radar dataKey="value" stroke="#7c5cff" fill="#7c5cff" fillOpacity={0.35} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-line p-2"><div className="text-mint">Strong</div>{(stats.strongAreas || []).map((s: any) => <div key={s.concept}>{s.concept} {(s.mastery * 100).toFixed(0)}%</div>)}</div>
            <div className="rounded-lg border border-line p-2"><div className="text-rose-300">Weak</div>{(stats.weakAreas || []).map((s: any) => <div key={s.concept}>{s.concept} {(s.mastery * 100).toFixed(0)}%</div>)}</div>
          </div>
        </div>
        <div className="card p-5">
          <h2 className="font-semibold mb-3">Skill heatmap</h2>
          <div className="grid grid-cols-2 gap-2 max-h-72 overflow-auto">
            {(data.skillHeatmap || []).map((s: any) => (
              <div key={s.concept} className="rounded-lg p-2 text-xs" style={{ background: masteryColor(s.mastery) }}>
                <div className="font-medium">{s.concept}</div>
                <div>{(s.mastery * 100).toFixed(0)}% · {(s.retention * 100).toFixed(0)}% retained</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <div className="text-xs uppercase tracking-widest text-accent">Candidate model</div>
            <h2 className="mt-1 font-display text-2xl">Knowledge graph</h2>
          </div>
          <p className="max-w-md text-xs leading-5 text-slate-500">Edges show prerequisite relationships. Weak nodes are prioritized for intervention.</p>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(data.knowledgeGraph?.nodes || []).map((node: any) => (
            <div key={node.id} className="relative rounded-xl border border-line bg-ink/50 p-3">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium text-white">{node.name}</span>
                <span className={`h-2.5 w-2.5 rounded-full ${node.mastery < 0.45 ? "bg-rose-300" : node.mastery < 0.7 ? "bg-amber-300" : "bg-mint"}`} />
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-white/10"><div className="h-1.5 rounded-full bg-accent" style={{ width: `${node.mastery * 100}%` }} /></div>
              <div className="mt-2 text-xs text-slate-500">{(node.mastery * 100).toFixed(0)}% mastery · {node.dimension}</div>
              {data.knowledgeGraph.edges.filter((edge: any) => edge.to === node.name).slice(0, 1).map((edge: any) => (
                <div key={`${edge.from}-${edge.to}`} className="mt-2 text-[11px] text-slate-500">← {edge.from} prerequisite</div>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
          {(data.knowledgeGraph?.edges || []).slice(0, 8).map((edge: any) => <span key={`${edge.from}-${edge.to}`} className="rounded-full border border-line px-2 py-1">{edge.from} → {edge.to}</span>)}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-3">365-day activity</h2>
        <div className="flex flex-wrap gap-[3px]">
          {heat.map((h) => (
            <div
              key={h.date}
              title={`${h.date}: ${h.count} items`}
              className="w-[10px] h-[10px] rounded-[2px]"
              style={{ background: h.count === 0 ? "#161826" : `rgba(62,224,181,${0.25 + (h.count / max) * 0.75})` }}
            />
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="font-semibold mb-3">Study plan</h2>
          {data.studyPlan ? (
            <div>
              <div className="font-medium">{data.studyPlan.title}</div>
              <p className="text-sm text-slate-400 mt-1">{data.studyPlan.summary}</p>
              <p className="text-xs text-slate-500 mt-2">{data.studyPlan.limitations}</p>
              <ul className="mt-3 space-y-1 text-sm">
                {(data.studyPlan.days || []).slice(0, 7).map((d: any) => (
                  <li key={d.day}>
                    Day {d.day}: {d.focus} ({d.minutes}m)
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-slate-400 text-sm">Complete an assessment to generate a plan.</p>
          )}
        </div>
        <div className="card p-5">
          <h2 className="font-semibold mb-3">Due for spaced review</h2>
          <ul className="space-y-2 text-sm">
            {(data.dueReview || []).map((d: any) => (
              <li key={d.concept} className="flex justify-between">
                <span>{d.concept}</span>
                <span className="text-slate-500">{(d.mastery * 100).toFixed(0)}%</span>
              </li>
            ))}
          </ul>
          <h3 className="font-semibold mt-6 mb-2">Recommendations</h3>
          <ul className="space-y-2 text-sm">
            {(data.recommendations || []).map((r: any) => (
              <li key={r.id}>
                <span className="text-mint">P{r.priority}</span> {r.title}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function masteryColor(m: number) {
  if (m < 0.4) return "rgba(244,63,94,0.25)";
  if (m < 0.7) return "rgba(250,204,21,0.22)";
  return "rgba(62,224,181,0.22)";
}
