import { ArrowRight, BookOpen, CheckCircle2, FileSearch, ShieldCheck, Sparkles } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../lib/api";

const pages: Record<string, { eyebrow: string; title: string; description: string; icon: typeof BookOpen; actions: { label: string; to: string }[]; bullets: string[] }> = {
  "proctoring/integrity": {
    eyebrow: "AI Proctoring",
    title: "Integrity timeline",
    description: "Review assessment signals as evidence for investigation, never as automatic proof of misconduct.",
    icon: ShieldCheck,
    actions: [{ label: "Open dashboard", to: "/app" }],
    bullets: ["Face, hand, and tab events remain separate signals.", "Detection confidence and severity belong in human review.", "Privacy-first metadata can support a later review workflow."],
  },
  "twin/graph": {
    eyebrow: "My Learning Twin",
    title: "Knowledge graph",
    description: "Explore the concepts, mastery estimates, retention signals, and prerequisite relationships shaping your next assessment.",
    icon: Sparkles,
    actions: [{ label: "View dashboard graph", to: "/app" }, { label: "Start adaptive test", to: "/app/assessments" }],
    bullets: ["Mastery updates after every answer.", "Prerequisites help prioritize intervention.", "Confidence and retention are tracked separately from correctness."],
  },
  "twin/weaknesses": {
    eyebrow: "My Learning Twin",
    title: "Weaknesses",
    description: "See where your current knowledge state needs the most targeted practice.",
    icon: BookOpen,
    actions: [{ label: "Open error notebook", to: "/app/notebook" }, { label: "View dashboard", to: "/app" }],
    bullets: ["Weak concepts are ranked from actual attempts.", "Response time helps separate knowledge gaps from time pressure.", "Recommendations remain traceable to assessment evidence."],
  },
  "twin/misconceptions": {
    eyebrow: "My Learning Twin",
    title: "Misconceptions",
    description: "Repeated mistake patterns become learning signals for remediation rather than unexplained wrong answers.",
    icon: FileSearch,
    actions: [{ label: "Open error notebook", to: "/app/notebook" }],
    bullets: ["Persistent misses receive an explicit hypothesis.", "Similar practice items are attached to mistakes.", "Signals are transparent and can be reviewed by the learner."],
  },
  "twin/retention": {
    eyebrow: "My Learning Twin",
    title: "Retention",
    description: "Track the difference between what you learned and what you can still recall today.",
    icon: Sparkles,
    actions: [{ label: "View revision queue", to: "/app/workspace/learning/revision" }, { label: "Open dashboard", to: "/app" }],
    bullets: ["Retention decays with time since practice.", "Due review is based on the current knowledge state.", "Short retrieval tests are the next step for fading concepts."],
  },
  "learning/path": {
    eyebrow: "Learning",
    title: "Personalized path",
    description: "Follow a prerequisite-aware sequence built from your weakest concepts and available study time.",
    icon: BookOpen,
    actions: [{ label: "View dashboard plan", to: "/app" }, { label: "Start practice", to: "/app/assessments" }],
    bullets: ["Plans prioritize weak prerequisites first.", "Study time comes from your onboarding profile.", "Each recommendation is linked to assessment evidence."],
  },
  "learning/daily": {
    eyebrow: "Learning",
    title: "Daily challenge",
    description: "Keep your practice loop alive with a short challenge drawn from weak and due concepts.",
    icon: Sparkles,
    actions: [{ label: "Start quick challenge", to: "/app/assessments" }],
    bullets: ["Four-question focused session.", "Designed for retrieval and consistency.", "Progress contributes to your existing streak and activity heatmap."],
  },
  "learning/revision": {
    eyebrow: "Learning",
    title: "Revision queue",
    description: "Your due concepts are organized around spaced review and recent mistakes.",
    icon: CheckCircle2,
    actions: [{ label: "View dashboard queue", to: "/app" }, { label: "Practice now", to: "/app/assessments" }],
    bullets: ["Correct recalls lengthen the next interval.", "Mistakes bring a concept back sooner.", "The queue is derived from your stored knowledge state."],
  },
  "analytics/performance": {
    eyebrow: "Analytics",
    title: "Performance",
    description: "Understand correctness, ability estimates, response time, and readiness as separate signals.",
    icon: CheckCircle2,
    actions: [{ label: "Open dashboard", to: "/app" }],
    bullets: ["Score is not the only measurement.", "Theta and mastery provide different views of performance.", "Limitations remain visible with prototype readiness numbers."],
  },
  "analytics/growth": {
    eyebrow: "Analytics",
    title: "Skill growth",
    description: "Follow how your concept mastery changes after each interaction with the assessment engine.",
    icon: Sparkles,
    actions: [{ label: "View learning twin", to: "/app" }],
    bullets: ["Mastery transitions are persisted per concept.", "Confidence and retention are shown beside mastery.", "The graph highlights where growth needs intervention."],
  },
  "analytics/heatmap": {
    eyebrow: "Analytics",
    title: "Activity heatmap",
    description: "Your practice consistency is visible across the existing 365-day activity history.",
    icon: CheckCircle2,
    actions: [{ label: "View dashboard heatmap", to: "/app" }],
    bullets: ["Daily activity remains part of the existing gamification loop.", "Streaks and badges continue to use recorded activity.", "Practice consistency complements knowledge estimates."],
  },
  "resume/analysis": {
    eyebrow: "Resume / JD",
    title: "Resume analysis",
    description: "This workspace is ready for resume-to-skill extraction while preserving the existing assessment flow.",
    icon: FileSearch,
    actions: [{ label: "Set your target", to: "/app/onboarding" }],
    bullets: ["Resume evidence should become skill graph nodes.", "Claims can be verified through targeted assessment.", "No skill claim is treated as proof without evidence."],
  },
  "resume/verification": {
    eyebrow: "Resume / JD",
    title: "Skill verification",
    description: "Compare stated skills with demonstrated evidence from adaptive assessment performance.",
    icon: ShieldCheck,
    actions: [{ label: "Start assessment", to: "/app/assessments" }],
    bullets: ["Use the term skill evidence gap, not fraud detection.", "Verification should consider topic, difficulty, and confidence.", "Results remain explainable to the candidate."],
  },
  "resume/job-match": {
    eyebrow: "Resume / JD",
    title: "Job match",
    description: "A future job-description workspace for comparing role requirements with the candidate learning twin.",
    icon: FileSearch,
    actions: [{ label: "Open learning twin", to: "/app" }, { label: "Update profile", to: "/app/onboarding" }],
    bullets: ["Required skills can map to knowledge graph concepts.", "Missing skills should become targeted assessment topics.", "Match scores must remain evidence-based estimates."],
  },
  "achievements/all": {
    eyebrow: "Achievements",
    title: "Your progress milestones",
    description: "Keep your streaks, badges, and learning progress visible alongside the deeper learning twin.",
    icon: Sparkles,
    actions: [{ label: "View dashboard", to: "/app" }, { label: "Practice now", to: "/app/assessments" }],
    bullets: ["Streaks reflect recorded practice activity.", "Badges reward consistent learning behavior.", "Mastery growth adds context beyond points."],
  },
};

export default function WorkspacePage() {
  const { section, view } = useParams();
  const key = `${section}/${view}`;
  const page = pages[key] || pages["analytics/performance"];
  const Icon = page.icon;
  const dash = useQuery({ queryKey: ["ws-dash", key], queryFn: () => api<any>("/api/analytics/dashboard"), retry: 1 });
  const notes = useQuery({
    queryKey: ["ws-notes", key],
    queryFn: () => api<any>("/api/analytics/notebook"),
    retry: 1,
    enabled: key.startsWith("twin/") || key === "proctoring/integrity",
  });
  const docs = useQuery({
    queryKey: ["ws-docs", key],
    queryFn: () => api<any>("/api/analytics/documents"),
    retry: 1,
    enabled: key.startsWith("resume/"),
  });
  const [docText, setDocText] = useState("React Node.js SQL Trees Recursion DBMS");
  const [docBusy, setDocBusy] = useState(false);
  const [docMsg, setDocMsg] = useState("");

  async function analyzeDoc() {
    setDocBusy(true);
    setDocMsg("");
    try {
      await api("/api/analytics/documents", {
        method: "POST",
        body: JSON.stringify({ filename: "resume.txt", kind: "RESUME", text: docText }),
      });
      setDocMsg("Analyzed — list refreshed below.");
      docs.refetch();
      dash.refetch();
    } catch (e: any) {
      setDocMsg(e.message || "Could not analyze");
    } finally {
      setDocBusy(false);
    }
  }

  const d = dash.data as any;
  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-mint"><Icon size={14} /> {page.eyebrow}</div>
        <h1 className="mt-3 font-display text-4xl text-white sm:text-5xl">{page.title}</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-400">{page.description}</p>
      </div>
      {(dash.isLoading) && <p className="text-sm text-slate-500">Loading your live learning data…</p>}
      {dash.error && (
        <div className="card space-y-2 p-5">
          <p className="text-sm text-rose-400">Could not load live data: {(dash.error as Error).message}</p>
          <button className="btn-ghost" onClick={() => dash.refetch()}>Retry</button>
        </div>
      )}
      {d && <LivePanel which={key} d={d} notes={notes.data} docs={docs.data} />}
      {(key.startsWith("resume/")) && (
        <div className="card space-y-2 p-5">
          <div className="font-semibold text-white">Analyze resume / syllabus text</div>
          <textarea className="input min-h-24" value={docText} onChange={(e) => setDocText(e.target.value)} />
          <div className="flex gap-2"><button className="btn-primary" disabled={docBusy} onClick={analyzeDoc}>{docBusy ? "Analyzing…" : "Analyze"}</button></div>
          {docMsg && <p className="text-xs text-slate-400">{docMsg}</p>}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        {page.bullets.map((bullet, index) => <div key={bullet} className="card p-5"><div className="text-xs text-accent">0{index + 1}</div><p className="mt-4 text-sm leading-6 text-slate-300">{bullet}</p></div>)}
      </div>
      <div className="card flex flex-col justify-between gap-5 p-5 sm:flex-row sm:items-center">
        <div><div className="font-semibold text-white">Continue your learning loop</div><p className="mt-1 text-sm text-slate-500">Choose an existing workflow to keep building evidence.</p></div>
        <div className="flex flex-wrap gap-2">{page.actions.map((action) => <Link key={action.to} className="btn-primary" to={action.to}>{action.label}<ArrowRight className="ml-2" size={15} /></Link>)}</div>
      </div>
    </div>
  );
}

function LivePanel({ which, d, notes, docs }: { which: string; d: any; notes: any; docs: any }) {
  if (which === "twin/graph") {
    const nodes = d.knowledgeGraph?.nodes || [];
    const edges = d.knowledgeGraph?.edges || [];
    return (
      <div className="card p-5">
        <h2 className="font-semibold text-white">Live knowledge graph ({nodes.length})</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {nodes.slice(0, 12).map((n: any) => (
            <div key={n.id} className="rounded-xl border border-line bg-ink/40 p-3 text-sm">
              <div className="flex justify-between gap-2"><span className="text-slate-200">{n.name}</span><span className="text-slate-500">{(n.mastery * 100).toFixed(0)}%</span></div>
              <div className="mt-2 h-1.5 rounded-full bg-white/10"><div className="h-1.5 rounded-full bg-accent" style={{ width: `${n.mastery * 100}%` }} /></div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">{edges.slice(0, 8).map((e: any) => <span key={`${e.from}-${e.to}`} className="rounded-full border border-line px-2 py-1">{e.from} → {e.to}</span>)}</div>
      </div>
    );
  }
  if (which === "twin/weaknesses") {
    const weak = d.stats?.weakAreas || [];
    return (
      <div className="card p-5">
        <h2 className="font-semibold text-white">Live weaknesses ({weak.length})</h2>
        {weak.length === 0
          ? <p className="mt-2 text-sm text-slate-500">No weak topics — complete an assessment.</p>
          : <ul className="mt-2 space-y-1 text-sm">{weak.map((w: any) => <li key={w.concept} className="flex justify-between"><span>{w.concept}</span><span className="text-slate-500">{(w.mastery * 100).toFixed(0)}%</span></li>)}</ul>}
      </div>
    );
  }
  if (which === "twin/misconceptions") {
    const rows = notes?.mistakes || [];
    return (
      <div className="card p-5">
        <h2 className="font-semibold text-white">Live misconceptions ({rows.length})</h2>
        {rows.length === 0
          ? <p className="mt-2 text-sm text-slate-500">No mistakes recorded yet.</p>
          : <ul className="mt-2 space-y-2 text-sm">{rows.slice(0, 5).map((m: any) => <li key={m.id} className="rounded-xl border border-line p-3"><span className="text-mint text-xs">{m.weaknessType}</span><div className="text-slate-200">{m.question?.stem || m.stem}</div></li>)}</ul>}
      </div>
    );
  }
  return <LivePanelB which={which} d={d} docs={docs} />;
}
function LivePanelB({ which, d, docs }: { which: string; d: any; docs: any }) {
  if (which === "twin/retention") {
    const heat = d.skillHeatmap || [];
    const low = [...heat].sort((a: any, b: any) => a.retention - b.retention).slice(0, 6);
    return (
      <div className="card p-5">
        <h2 className="font-semibold text-white">Lowest retention (needs recall)</h2>
        <ul className="mt-2 space-y-1 text-sm">{low.map((s: any) => <li key={s.concept} className="flex justify-between"><span>{s.concept}</span><span className="text-slate-500">{(s.retention * 100).toFixed(0)}% retained</span></li>)}</ul>
      </div>
    );
  }
  if (which === "learning/path" || which === "learning/revision" || which === "learning/daily") {
    const due = d.dueReview || [];
    const recs = d.recommendations || [];
    return (
      <div className="card p-5">
        <h2 className="font-semibold text-white">Due review ({due.length}) + study plan</h2>
        <ul className="mt-2 space-y-1 text-sm">{due.map((x: any) => <li key={x.concept} className="flex justify-between"><span>{x.concept}</span><span className="text-slate-500">{(x.mastery * 100).toFixed(0)}%</span></li>)}</ul>
        <p className="mt-2 text-sm text-slate-300">{d.studyPlan ? `${d.studyPlan.title} — ${d.studyPlan.summary}` : "Complete an assessment to generate a plan."}</p>
        <ul className="mt-2 space-y-1 text-sm">{recs.slice(0, 4).map((r: any) => <li key={r.id}>P{r.priority} — {r.title}</li>)}</ul>
      </div>
    );
  }
  if (which === "proctoring/integrity") {
    const integ = d.integrity || { score: 100, warnings: 0, events: [] };
    return (
      <div className="card p-5">
        <h2 className="font-semibold text-white">Integrity — {integ.score}% · {integ.warnings} warnings</h2>
        <ul className="mt-2 space-y-1 text-xs text-slate-400">{(integ.events || []).slice(0, 8).map((e: any) => <li key={e.id}>{new Date(e.createdAt).toLocaleString()} — {e.description || e.kind} ({e.severity})</li>)}
          {(integ.events || []).length === 0 && <li>No integrity signals recorded.</li>}</ul>
      </div>
    );
  }
  if (which.startsWith("resume/")) {
    const list = docs?.documents || [];
    return (
      <div className="card p-5">
        <h2 className="font-semibold text-white">Analyzed documents ({list.length})</h2>
        {list.length === 0
          ? <p className="mt-2 text-sm text-slate-500">Paste text above and Analyze to create the first entry.</p>
          : <ul className="mt-2 space-y-2 text-sm">{list.slice(0, 5).map((x: any) => <li key={x.id} className="rounded-xl border border-line p-3"><span className="text-white">{x.filename}</span><div className="text-xs text-slate-400">{x.analysis?.suggestedAssessment}</div></li>)}</ul>}
      </div>
    );
  }
  const recent = d.recentAssessments || [];
  return (
    <div className="card p-5">
      <h2 className="font-semibold text-white">Recent assessments ({recent.length})</h2>
      <ul className="mt-2 space-y-1 text-sm">{recent.slice(0, 5).map((a: any) => <li key={a.id} className="flex justify-between"><span>{a.mode}</span><span className="text-slate-400">{a.score?.toFixed?.(0) ?? 0}%</span></li>)}</ul>
      <p className="mt-2 text-xs text-slate-500">Streak {d.streak?.current ?? 0}/{d.streak?.longest ?? 0} · Badges {(d.badges || []).length} · {d.readiness?.band}</p>
    </div>
  );
}
