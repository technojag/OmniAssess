import { ArrowRight, BookOpen, CheckCircle2, FileSearch, ShieldCheck, Sparkles } from "lucide-react";
import { Link, useParams } from "react-router-dom";

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
  const page = pages[`${section}/${view}`] || pages["analytics/performance"];
  const Icon = page.icon;

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-mint"><Icon size={14} /> {page.eyebrow}</div>
        <h1 className="mt-3 font-display text-4xl text-white sm:text-5xl">{page.title}</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-400">{page.description}</p>
      </div>
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
