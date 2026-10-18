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
  const [error, setError] = useState("");
  const [exam, setExam] = useState<any>(null);
  const [terminated, setTerminated] = useState<{ reason: string } | null>(null);

  useEffect(() => {
    setError("");
    api<any>(`/api/assessments/${id}/current`)
      .then((r) => {
        if (r.terminated) {
          setTerminated({ reason: r.reason || "Test terminated due to repeated proctoring violations." });
          return;
        }
        setQ(r.question);
        setSession(r.session);
        setProgress(r.progress);
        setExam(r.assessment || r.scope || null);
        setStarted(Date.now());
        if (r.session?.timeLeftSec) setTimeLeft(r.session.timeLeftSec);
      })
      .catch(async (e: any) => {
        // A terminated assessment returns 409 elsewhere; surface it clearly.
        setError(e.message || "Could not load question");
      });
  }, [id]);

  async function finishTerminated(reason: string) {
    setTerminated({ reason });
    try {
      await api(`/api/assessments/${id}/complete`, { method: "POST", body: "{}" });
    } catch {
      // Already terminated server-side; the report still opens.
    }
  }

  useEffect(() => {
    const t = setInterval(() => setTimeLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  async function submit() {
    if (choice === null || !q) return;
    setError("");
    let r: any;
    try {
      r = await api<any>(`/api/assessments/${id}/answer`, {
        method: "POST",
        body: JSON.stringify({
          questionId: q.id,
          selectedIndex: choice,
          timeMs: Date.now() - started,
          selfConfidence,
          markForReview: marked,
        }),
      });
    } catch (e: any) {
      // Termination can land between loading a question and submitting it.
      try {
        const body = JSON.parse(e.message);
        if (body?.terminated) {
          finishTerminated(body.reason || "Test terminated by proctoring.");
          return;
        }
      } catch {
        /* not a JSON payload */
      }
      setError(e.message || "Could not submit answer");
      return;
    }
    setFeedback(r);
    if (r.done) {
      try {
        await api(`/api/assessments/${id}/complete`, { method: "POST", body: "{}" });
      } catch (e: any) {
        setError(e.message || "Could not complete assessment");
        return;
      }
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

  if (terminated)
    return (
      <div className="max-w-2xl space-y-4">
        <div className="card border-rose-400/50 bg-rose-400/[0.06] p-6">
          <div className="text-xs uppercase tracking-widest text-rose-300">Integrity enforcement</div>
          <h1 className="mt-2 font-display text-3xl text-white">Test terminated</h1>
          <p className="mt-2 text-sm text-rose-100">{terminated.reason}</p>
          <p className="mt-3 text-xs text-slate-400">
            The session is locked on the server, so the test cannot be continued even if this page is refreshed.
            An integrity report has been recorded for review.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={() => nav(`/app/report/${id}`)}>View integrity report</button>
          <button className="btn-ghost" onClick={() => nav("/app/assessments")}>Back to assessments</button>
        </div>
      </div>
    );

  if (error && !q)
    return (
      <div className="max-w-2xl space-y-3">
        <h1 className="font-display text-3xl text-white">Assessment unavailable</h1>
        <p className="text-sm text-rose-400">{error}</p>
        <button className="btn-ghost" onClick={() => nav("/app/assessments")}>Back to assessments</button>
      </div>
    );
  if (!q) return <p>Loading item…</p>;
  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div className="max-w-3xl space-y-4">
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-400">
        <span>Q {progress.answered + (feedback ? 0 : 1)} / {progress.max} {isPractice ? "(Practice)" : ""}</span>
        <span className="rounded-full border border-line px-2 py-1 text-xs">{difficultyLabel(q.difficulty ?? 0)} · {q.topic}</span>
        <span className="font-mono text-white">{mm}:{ss}</span>
      </div>
      {exam && (
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-1 text-accent">
            {exam.examName?.replace(/_/g, " ")}
          </span>
          <span className="rounded-full border border-line px-2 py-1 text-slate-400">{exam.subject}</span>
          {exam.topic && <span className="rounded-full border border-line px-2 py-1 text-slate-400">{exam.topic}</span>}
          {exam.difficulty && <span className="rounded-full border border-line px-2 py-1 text-slate-400">{exam.difficulty}</span>}
        </div>
      )}
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
      <ProctorPanel
        assessmentId={id}
        enforced={!isPractice}
        onTerminate={(reason) => finishTerminated(reason)}
      />
    </div>
  );
}
