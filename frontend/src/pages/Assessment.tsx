import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import ProctorPanel from "../components/ProctorPanel";

function difficultyLabel(d: number) {
  if (d < -0.5) return "Easy";
  if (d <= 0.5) return "Medium";
  return "Hard";
}

export default function Assessment() {
  const { id } = useParams();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const isPractice = params.get("practice") === "1";
  const [q, setQ] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [progress, setProgress] = useState({ answered: 0, max: 12 });
  const [choice, setChoice] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<any>(null);
  const [started, setStarted] = useState(Date.now());
  const [marked, setMarked] = useState(false);
  const [selfConfidence, setSelfConfidence] = useState(0.75);
  const [timeLeft, setTimeLeft] = useState(25 * 60);

  useEffect(() => {
    api<any>(`/api/assessments/${id}/current`).then((r) => {
      setQ(r.question);
      setSession(r.session);
      setProgress(r.progress);
      setStarted(Date.now());
      if (r.session?.timeLeftSec) setTimeLeft(r.session.timeLeftSec);
    });
  }, [id]);

  useEffect(() => {
    const t = setInterval(() => setTimeLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  async function submit() {
    if (choice === null || !q) return;
    const r = await api<any>(`/api/assessments/${id}/answer`, {
      method: "POST",
      body: JSON.stringify({
        questionId: q.id,
        selectedIndex: choice,
        timeMs: Date.now() - started,
        selfConfidence,
        markForReview: marked,
      }),
    });
    setFeedback(r);
    if (r.done) {
      await api(`/api/assessments/${id}/complete`, { method: "POST", body: "{}" });
      nav(`/app/report/${id}`);
      return;
    }
  }

  function nextQ() {
    setQ(feedback.next);
    setFeedback(null);
    setChoice(null);
    setMarked(false);
    setSelfConfidence(0.75);
    setStarted(Date.now());
    setProgress((p) => ({ ...p, answered: p.answered + 1 }));
  }

  if (!q) return <p>Loading item…</p>;
  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div className="max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-400">
        <span>Q {progress.answered + (feedback ? 0 : 1)} / {progress.max} {isPractice ? "(Practice)" : ""}</span>
        <span className="rounded-full border border-line px-2 py-1 text-xs">{difficultyLabel(q.difficulty ?? 0)} · {q.topic}</span>
        <span className="font-mono text-white">{mm}:{ss}</span>
      </div>
      <div className="card p-6 space-y-4">
        <p className="text-lg leading-relaxed">{q.stem}</p>
        <div className="space-y-2">
          {(q.options as string[]).map((opt, i) => (
            <button
              key={i}
              disabled={Boolean(feedback)}
              onClick={() => setChoice(i)}
              className={`w-full text-left rounded-xl border px-4 py-3 ${
                choice === i ? "border-accent bg-accent/10" : "border-line hover:bg-white/5"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
        <label className="flex gap-2 text-sm text-slate-400">
          <input type="checkbox" checked={marked} onChange={(e) => setMarked(e.target.checked)} />
          Mark for review
        </label>
        <fieldset className="rounded-xl border border-line bg-ink/30 p-3">
          <legend className="px-1 text-xs uppercase tracking-wider text-slate-500">How confident are you?</legend>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {[0.25, 0.5, 0.75, 1].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setSelfConfidence(value)}
                className={`rounded-lg border px-2 py-2 text-sm transition ${selfConfidence === value ? "border-mint bg-mint/10 text-mint" : "border-line text-slate-400 hover:bg-white/5"}`}
              >
                {value * 100}%
              </button>
            ))}
          </div>
        </fieldset>
        {!feedback ? (
          <button className="btn-primary" onClick={submit} disabled={choice === null}>
            Submit
          </button>
        ) : (
          <div className="space-y-3">
            <p className={feedback.isCorrect ? "text-mint" : "text-rose-400"}>
              {feedback.isCorrect ? "Correct" : "Incorrect"} · {feedback.diagnosis.type}
            </p>
            <p className="text-sm text-slate-300">{feedback.explanation}</p>
            <p className="text-xs text-slate-500">
              θ {feedback.theta.before.toFixed(2)} → {feedback.theta.after.toFixed(2)} · {feedback.theta.label}
            </p>
            {feedback.knowledge && (
              <div className="rounded-xl border border-mint/20 bg-mint/[0.06] p-3 text-sm text-slate-300">
                <div className="flex flex-wrap justify-between gap-2 font-medium text-white">
                  <span>{feedback.knowledge.concept} mastery</span>
                  <span>{(feedback.knowledge.masteryBefore * 100).toFixed(0)}% → {(feedback.knowledge.masteryAfter * 100).toFixed(0)}%</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">Confidence: {(feedback.knowledge.confidence * 100).toFixed(0)}% · {feedback.knowledge.explanation}</p>
              </div>
            )}
            {feedback.diagnosis.type !== "NONE" && (
              <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-3 text-sm text-amber-100">
                <span className="font-semibold">Learning signal: </span>{feedback.diagnosis.reason}
              </div>
            )}
            <button className="btn-primary" onClick={nextQ}>
              Next
            </button>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        {!feedback && <button className="btn-ghost" onClick={() => setChoice(null)}>Clear response</button>}
      </div>
      <p className="text-xs text-slate-500">{q.engineNote}</p>
      </div>
      <ProctorPanel assessmentId={id} />
    </div>
  );
}
