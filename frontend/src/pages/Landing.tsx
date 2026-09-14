import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Brain, ChartBar, School, GraduationCap, Trophy, Building2, Video, ShieldCheck, Sparkles } from "lucide-react";

const features = [
  { t: "Adaptive MCQ Engine", d: "Easy to Hard selection driven by prior performance and topic mastery.", icon: Brain },
  { t: "AI Skill-Gap Analysis", d: "Topic scores, repeated errors, and explainable next-study guidance.", icon: Sparkles },
  { t: "AI Video Interview", d: "Technical + HR practice with heuristic scoring. No fake emotion detection.", icon: Video },
  { t: "Integrity Signals", d: "Camera, tab and focus events as review evidence — never auto-cheater labels.", icon: ShieldCheck },
  { t: "Improvement Tracking", d: "Assess, find weakness, practice, re-assess loop with visible progress.", icon: ChartBar },
  { t: "Gamified Consistency", d: "Streaks, badges and 365-day heatmap from real activity only.", icon: Trophy },
];

const audiences = [
  { t: "School Students", d: "Class 10/12, CBSE / ICSE / State, subject assessments.", icon: School },
  { t: "College Students", d: "B.Tech / B.Sc / B.Com / BA, semester and domain skills.", icon: GraduationCap },
  { t: "Govt Aspirants", d: "SSC, UPSC, Banking, Railways and configurable exams.", icon: Trophy },
  { t: "Job Seekers", d: "Frontend, Backend, Full-stack, Data, HR, Sales.", icon: Building2 },
];

export default function Landing() {
  return (
    <div className="min-h-screen overflow-hidden">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between border-b border-line/70 px-5 py-5 sm:px-8">
        <span className="font-display text-xl sm:text-2xl">OmniAssess<span className="text-mint"> AI</span></span>
        <nav className="hidden items-center gap-6 text-sm text-slate-400 md:flex">
          <a href="#features" className="hover:text-white">Features</a>
          <a href="#audiences" className="hover:text-white">Who it's for</a>
          <a href="#proctoring" className="hover:text-white">How Proctoring Works</a>
          <a href="#preview" className="hover:text-white">Preview</a>
        </nav>
        <div className="flex gap-2 sm:gap-3">
          <Link className="btn-ghost" to="/login">Login</Link>
          <Link className="btn-primary" to="/register">Register</Link>
        </div>
      </header>
      <section className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="pointer-events-none absolute -right-32 top-10 h-80 w-80 rounded-full border border-mint/20 bg-mint/[0.04] blur-sm" />
        <div className="relative">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm font-semibold uppercase tracking-[0.18em] text-mint"
        >
          Adaptive assessment · From Assessment to Insight to Improvement
        </motion.p>
        <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[0.98] text-white sm:text-6xl lg:text-7xl">
          Know what you know. Fix what you don't.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">
          OmniAssess AI turns every test into candidate intelligence: what you know, what you lack,
          how trustworthy the session was, what to study next, and whether you are improving.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link className="btn-primary" to="/register">Try Free Demo</Link>
          <Link className="btn-ghost" to="/login">Demo login</Link>
        </div>
        <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-xs uppercase tracking-wider text-slate-500">
          <span>Deterministic scoring</span><span>Labeled AI assistance</span><span>Built for progress</span>
        </div>
        </div>
        <div className="relative mx-auto w-full max-w-md lg:ml-auto">
          <div className="card relative overflow-hidden p-4 sm:p-5">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div><div className="text-xs uppercase tracking-widest text-slate-500">Readiness signal</div><div className="mt-1 font-display text-3xl text-white">Developing</div></div>
              <div className="grid h-14 w-14 place-items-center rounded-full border-4 border-mint/70 text-sm font-semibold text-mint">68%</div>
            </div>
            <div className="mt-5 space-y-3">
              {[['Algorithms', '82%', 'bg-mint'], ['Systems design', '61%', 'bg-accent'], ['Communication', '47%', 'bg-amber-300']].map(([label, value, color]) => (
                <div key={label}>
                  <div className="mb-1 flex justify-between text-xs text-slate-400"><span>{label}</span><span>{value}</span></div>
                  <div className="h-2 rounded-full bg-white/10"><div className={`${color} h-2 rounded-full`} style={{ width: value }} /></div>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-xl border border-mint/20 bg-mint/[0.07] p-3 text-sm text-slate-300">Next best action: review graph traversal errors for 12 minutes.</div>
          </div>
        </div>
      </section>
      <section id="audiences" className="mx-auto max-w-7xl px-5 pb-14 sm:px-8">
        <h2 className="font-display text-3xl text-white">One platform, four journeys</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {audiences.map((a) => (
            <div key={a.t} className="card p-5">
              <a.icon size={20} className="text-mint" />
              <div className="mt-3 font-semibold text-white">{a.t}</div>
              <p className="mt-1 text-sm text-slate-400">{a.d}</p>
            </div>
          ))}
        </div>
      </section>
      <section id="features" className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-5 pb-14 sm:px-8 md:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div key={f.t} className="card p-5 transition duration-200 hover:-translate-y-1 hover:border-accent/50">
            <f.icon size={20} className="text-accent" />
            <div className="mt-3 font-semibold text-white">{f.t}</div>
            <p className="mt-2 text-sm leading-6 text-slate-400">{f.d}</p>
          </div>
        ))}
      </section>
      <section id="preview" className="mx-auto max-w-7xl px-5 pb-14 sm:px-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            ["AI Interview", "Interviewer + progress, webcam + integrity HUD, mic controls."],
            ["MCQ Assessment", "Timer, palette, difficulty badge, mark-for-review, camera PiP."],
            ["Proctoring", "Face / multi-face / tab-blur signals, score from 100%."],
            ["Analytics", "Radar, heatmap, topic breakdown, integrity timeline."],
          ].map(([t, d]) => (
            <div key={t} className="card p-5"><div className="text-xs uppercase tracking-widest text-mint">{t}</div><p className="mt-2 text-sm text-slate-400">{d}</p></div>
          ))}
        </div>
      </section>
      <section id="proctoring" className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <div className="card p-6">
          <h2 className="font-display text-2xl text-white">How Proctoring Works</h2>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm leading-6 text-slate-300">
            <li>Signals: tab visibility, window focus, face presence (camera permitted).</li>
            <li>Each event logged with timestamp, type, severity and description.</li>
            <li>Integrity score starts at 100%; backend-configured penalties apply.</li>
            <li>Responsible wording: Integrity Signal / Warning — never auto cheater labels.</li>
          </ol>
        </div>
      </section>
      <footer className="border-t border-line/70 py-8 text-center text-xs text-slate-500">
        OmniAssess AI — From Assessment to Insight to Improvement. Prototype: deterministic scoring, labeled AI assistance.
      </footer>
    </div>
  );
}
