import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

type Category = "SCHOOL" | "COLLEGE" | "GOVT" | "CORPORATE";

const CATEGORIES: { id: Category; title: string; desc: string }[] = [
  { id: "SCHOOL", title: "School Student", desc: "Class 10 / 12, Boards, Subjects" },
  { id: "COLLEGE", title: "College Student", desc: "Degree, Semester, Domain" },
  { id: "GOVT", title: "Govt Aspirant", desc: "SSC, UPSC, Banking, Railways" },
  { id: "CORPORATE", title: "Job Seeker", desc: "Role, Experience, Skills" },
];

export default function Onboarding() {
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [targets, setTargets] = useState<{ id: string; name: string; description: string }[]>([]);
  const [targetId, setTargetId] = useState("");
  const [category, setCategory] = useState<Category>("COLLEGE");
  const [experienceLevel, setExperienceLevel] = useState("INTERMEDIATE");
  const [dailyMinutes, setDailyMinutes] = useState(45);
  const [classLevel, setClassLevel] = useState("10");
  const [board, setBoard] = useState("CBSE");
  const [subjects, setSubjects] = useState("Maths, Science");
  const [degree, setDegree] = useState("B.Tech");
  const [semester, setSemester] = useState("5");
  const [domain, setDomain] = useState("Computer Science");
  const [govExam, setGovExam] = useState("SSC CGL");
  const [govSection, setGovSection] = useState("Quant");
  const [targetRole, setTargetRole] = useState("Frontend Developer");
  const [skillArea, setSkillArea] = useState("React, JavaScript");
  const [customFocus, setCustomFocus] = useState("");
  const [error, setError] = useState("");
  const [targetsError, setTargetsError] = useState("");

  useEffect(() => {
    setTargetsError("");
    api<{ targets: any[] }>("/api/targets")
      .then((r) => {
        setTargets(r.targets);
        setTargetId(r.targets[0]?.id || "");
      })
      .catch((e: any) => setTargetsError(e.message || "Could not load targets. Is the backend running?"));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/onboarding", {
        method: "POST",
        body: JSON.stringify({
          targetId: targetId || undefined,
          experienceLevel,
          dailyMinutes,
          category,
          classLevel,
          board,
          subjects: subjects.split(",").map((s) => s.trim()).filter(Boolean),
          degree,
          semester,
          domain,
          govExam,
          govSection,
          targetRole,
          skillArea,
          customFocus,
        }),
      });
      nav("/app");
    } catch (err: any) {
      setError(err.message || "Could not save profile");
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-mint">Step {step} of 3</div>
        <h1 className="mt-2 font-display text-4xl">Build your candidate context</h1>
      </div>
      {error && <p className="text-sm text-rose-400">{error}</p>}
      {step === 1 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {CATEGORIES.map((c) => (
            <button type="button" key={c.id} onClick={() => setCategory(c.id)}
              className={`card p-5 text-left ${category === c.id ? "border-mint/60 bg-mint/[0.06]" : ""}`}>
              <div className="font-semibold text-white">{c.title}</div>
              <div className="mt-1 text-sm text-slate-400">{c.desc}</div>
            </button>
          ))}
        </div>
      )}
      {step === 2 && (
        <div className="card space-y-3 p-5">
          {targetsError && <p className="text-sm text-rose-400">{targetsError}</p>}
          {category === "SCHOOL" && (
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm text-slate-400">Class<input className="input mt-1" value={classLevel} onChange={(e) => setClassLevel(e.target.value)} /></label>
              <label className="text-sm text-slate-400">Board<input className="input mt-1" value={board} onChange={(e) => setBoard(e.target.value)} /></label>
            </div>
          )}
          {category === "COLLEGE" && (
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm text-slate-400">Degree<input className="input mt-1" value={degree} onChange={(e) => setDegree(e.target.value)} /></label>
              <label className="text-sm text-slate-400">Semester<input className="input mt-1" value={semester} onChange={(e) => setSemester(e.target.value)} /></label>
            </div>
          )}
          {category === "GOVT" && (
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm text-slate-400">Exam<input className="input mt-1" value={govExam} onChange={(e) => setGovExam(e.target.value)} /></label>
              <label className="text-sm text-slate-400">Section<input className="input mt-1" value={govSection} onChange={(e) => setGovSection(e.target.value)} /></label>
            </div>
          )}
          {category === "CORPORATE" && (
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm text-slate-400">Target role<input className="input mt-1" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} /></label>
              <label className="text-sm text-slate-400">Skills<input className="input mt-1" value={skillArea} onChange={(e) => setSkillArea(e.target.value)} /></label>
            </div>
          )}
          <label className="text-sm text-slate-400">Subjects / Domain<input className="input mt-1" value={category === "COLLEGE" ? domain : subjects} onChange={(e) => (category === "COLLEGE" ? setDomain(e.target.value) : setSubjects(e.target.value))} /></label>
          <label className="text-sm text-slate-400">Target<select className="input mt-1" value={targetId} onChange={(e) => setTargetId(e.target.value)}>{targets.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}</select></label>
        </div>
      )}
      {step === 3 && (
        <div className="card space-y-3 p-5">
          <label className="text-sm text-slate-400">Custom focus (e.g. React Hooks, DSA Trees)<input className="input mt-1" value={customFocus} onChange={(e) => setCustomFocus(e.target.value)} placeholder="DSA Trees" /></label>
          <label className="text-sm text-slate-400">Experience<select className="input mt-1" value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)}><option value="BEGINNER">Beginner</option><option value="INTERMEDIATE">Intermediate</option><option value="ADVANCED">Advanced</option></select></label>
          <label className="block text-sm text-slate-400">Daily minutes: {dailyMinutes}<input className="mt-2 w-full" type="range" min={15} max={120} value={dailyMinutes} onChange={(e) => setDailyMinutes(Number(e.target.value))} /></label>
        </div>
      )}
      <div className="flex gap-2">
        {step > 1 && (<button type="button" className="btn-ghost" onClick={() => setStep(step - 1)}>Back</button>)}
        {step < 3 && (<button type="button" className="btn-primary" onClick={() => setStep(step + 1)}>Continue</button>)}
        {step === 3 && (<button className="btn-primary" type="submit">Save profile</button>)}
      </div>
    </form>
  );
}
