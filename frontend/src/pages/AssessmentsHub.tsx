import { ArrowRight, BrainCircuit, Clock3, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

type ExamDef = {
  examName: string;
  label: string;
  examCategory: string;
  description: string;
  subjects: { name: string; topics: string[] }[];
};

const DIFFICULTIES = ["MIXED", "EASY", "MEDIUM", "HARD"] as const;

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
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [exams, setExams] = useState<ExamDef[]>([]);
  const [examName, setExamName] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("Mixed");
  const [difficulty, setDifficulty] = useState<string>("MIXED");

  useEffect(() => {
    api<{ exams: ExamDef[] }>("/api/assessments/exams")
      .then((r) => {
        setExams(r.exams);
        const first = r.exams[0];
        if (first) {
          setExamName(first.examName);
          setSubject(first.subjects[0]?.name || "");
          setTopic("Mixed");
        }
      })
      .catch((e: any) => setError(e.message || "Could not load the exam catalog. Is the backend running?"));
  }, []);

  const selectedExam = exams.find((e) => e.examName === examName);
  const subjects = selectedExam?.subjects || [];
  const topics = subjects.find((s) => s.name === subject)?.topics || [];

  function chooseExam(next: ExamDef) {
    setExamName(next.examName);
    setSubject(next.subjects[0]?.name || "");
    setTopic("Mixed");
  }

  function chooseSubject(name: string) {
    setSubject(name);
    setTopic("Mixed");
  }

  async function start(mode: "ADAPTIVE" | "DAILY_CHALLENGE") {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ assessment: { id: string } }>("/api/assessments/start", {
        method: "POST",
        body: JSON.stringify({ mode, examName, subject, topic, difficulty }),
      });
      navigate(`/app/assess/${result.assessment.id}`);
    } catch (e: any) {
      setError(e.message || "Could not start assessment. Is the backend running?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-mint"><Sparkles size={14} /> Assessment studio</div>
        <h1 className="mt-3 font-display text-4xl text-white sm:text-5xl">Choose your next signal.</h1>
        <p className="mt-3 max-w-2xl text-slate-400">Every response updates your learning twin. Scores are explainable, adaptive, and labeled as prototype evidence.</p>
        {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
      </div>
      <div className="card space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">Exam → Subject → Topic → Difficulty</h2>
          <span className="text-xs text-slate-500">Questions come only from your selected slice</span>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500">Exam</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {exams.map((e) => (
              <button
                key={e.examName}
                type="button"
                onClick={() => chooseExam(e)}
                className={`rounded-xl border px-3 py-2 text-sm transition ${examName === e.examName ? "border-accent bg-accent/15 text-white" : "border-line text-slate-400 hover:bg-white/5"}`}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs uppercase tracking-wider text-slate-500">
            Subject
            <select className="input mt-2" value={subject} onChange={(ev) => chooseSubject(ev.target.value)}>
              {subjects.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
          </label>
          <label className="text-xs uppercase tracking-wider text-slate-500">
            Topic
            <select className="input mt-2" value={topic} onChange={(ev) => setTopic(ev.target.value)}>
              <option value="Mixed">All topics</option>
              {topics.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="text-xs uppercase tracking-wider text-slate-500">
            Difficulty
            <select className="input mt-2" value={difficulty} onChange={(ev) => setDifficulty(ev.target.value)}>
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
        </div>
        <p className="text-xs text-slate-500">
          Selected: <span className="text-slate-300">{selectedExam?.label || "—"}</span> · {subject || "—"} · {topic} · {difficulty}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {modes.map(({ mode, title, description, meta, icon: Icon, primary }) => (
          <button key={mode} disabled={busy} onClick={() => start(mode)} className={`card group p-6 text-left transition duration-200 hover:-translate-y-1 disabled:opacity-60 ${primary ? "border-accent/60 bg-accent/[0.08]" : "hover:border-mint/50"}`}>
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
