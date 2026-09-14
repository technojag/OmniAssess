import { ArrowRight, BrainCircuit, Clock3, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

const modes = [
  {
    mode: "ADAPTIVE" as const,
    title: "Adaptive Test",
    description: "Questions respond to your mastery, speed, and recent learning signals.",
    meta: "12 questions · adaptive difficulty",
    icon: BrainCircuit,
    primary: true,
  },
  {
    mode: "DAILY_CHALLENGE" as const,
    title: "Quick Challenge",
    description: "A short retrieval session built around weak topics and due revision.",
    meta: "4 questions · 8 minutes",
    icon: Clock3,
    primary: false,
  },
];

export default function AssessmentsHub() {
  const navigate = useNavigate();

  async function start(mode: "ADAPTIVE" | "DAILY_CHALLENGE") {
    const result = await api<{ assessment: { id: string } }>("/api/assessments/start", {
      method: "POST",
      body: JSON.stringify({ mode }),
    });
    navigate(`/app/assess/${result.assessment.id}`);
  }

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-mint"><Sparkles size={14} /> Assessment studio</div>
        <h1 className="mt-3 font-display text-4xl text-white sm:text-5xl">Choose your next signal.</h1>
        <p className="mt-3 max-w-2xl text-slate-400">Every response updates your learning twin. Scores are explainable, adaptive, and labeled as prototype evidence.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {modes.map(({ mode, title, description, meta, icon: Icon, primary }) => (
          <button key={mode} onClick={() => start(mode)} className={`card group p-6 text-left transition duration-200 hover:-translate-y-1 ${primary ? "border-accent/60 bg-accent/[0.08]" : "hover:border-mint/50"}`}>
            <div className="flex items-start justify-between gap-4">
              <div className={`grid h-12 w-12 place-items-center rounded-2xl ${primary ? "bg-accent text-white" : "bg-mint/10 text-mint"}`}><Icon size={22} /></div>
              <ArrowRight className="text-slate-600 transition group-hover:translate-x-1 group-hover:text-white" size={20} />
            </div>
            <h2 className="mt-8 font-display text-2xl text-white">{title}</h2>
            <p className="mt-2 leading-6 text-slate-400">{description}</p>
            <p className="mt-6 text-xs uppercase tracking-wider text-slate-500">{meta}</p>
          </button>
        ))}
      </div>
      <div className="card p-5 text-sm text-slate-400">
        <span className="font-semibold text-white">AI Interview</span> is available from the Interview section, with transcript-based practice and feedback.
      </div>
    </div>
  );
}
