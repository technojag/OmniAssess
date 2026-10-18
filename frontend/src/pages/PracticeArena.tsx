import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import ProctorPanel from "../components/ProctorPanel";
import ExamPicker, { type ExamSelection } from "../components/ExamPicker";

export default function PracticeArena() {
  const nav = useNavigate();
  const [micOk, setMicOk] = useState<string>("Not tested");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [selection, setSelection] = useState<ExamSelection>({
    categoryId: "TECHNICAL",
    examName: "BTECH",
    subject: "DSA",
    topic: "Mixed",
    difficulty: "MIXED",
  });
  const [history, setHistory] = useState<any[]>([]);

  // Load the global selection so Practice matches Skill Gap / Interview.
  useEffect(() => {
    api<{ active: any }>("/api/preferences/exam")
      .then((r) => {
        setSelection((s) => ({
          ...s,
          categoryId: r.active.category.categoryId,
          examName: r.active.examName,
          subject: r.active.subject,
        }));
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  // Recent practice sessions for performance tracking.
  useEffect(() => {
    if (!ready) return;
    api<any>("/api/analytics/history")
      .then((r) => setHistory((r.assessments || []).filter((a: any) => a.isPractice).slice(0, 5)))
      .catch(() => undefined);
  }, [ready, selection.examName]);

  async function testMic() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      s.getTracks().forEach((t) => t.stop());
      setMicOk("Microphone working");
    } catch {
      setMicOk("Microphone unavailable");
    }
  }

  async function startPractice() {
    setBusy(true);
    setError("");
    try {
      const r = await api<any>("/api/assessments/start", {
        method: "POST",
        body: JSON.stringify({
          mode: "PRACTICE",
          maxQuestions: 6,
          practice: true,
          examName: selection.examName,
          subject: selection.subject,
          topic: selection.topic,
          difficulty: selection.difficulty,
        }),
      });
      nav(`/app/assess/${r.assessment.id}?practice=1`);
    } catch (e: any) {
      setError(e.message || "Could not start practice. Is the backend running?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <div className="text-xs uppercase tracking-widest text-mint">Safe sandbox</div>
        <h1 className="mt-2 font-display text-4xl text-white">Practice Arena</h1>
        <p className="mt-2 text-slate-400">Pick your exam, then practise only that syllabus. Practice scores do NOT affect official stats.</p>
      </div>

      <ExamPicker value={selection} onChange={setSelection} showTopic showDifficulty />

      <div className="grid gap-4 md:grid-cols-2">
        <ProctorPanel compact />
        <div className="card space-y-3 p-5">
          <div className="font-semibold text-white">Device checks</div>
          <div className="text-sm text-slate-400">Mic: {micOk}</div>
          <div className="text-sm text-slate-400">
            Practice set: {selection.examName.replace(/_/g, " ")} · {selection.subject} · {selection.topic} · {selection.difficulty}
          </div>
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <button className="btn-ghost" onClick={testMic}>Test microphone</button>
          <button className="btn-ghost" onClick={() => nav("/app/interview")}>Try AI interview</button>
          <button className="btn-primary" disabled={busy} onClick={startPractice}>
            {busy ? "Starting…" : "Start practice set (6 Qs)"}
          </button>
          <p className="text-xs text-slate-500">
            Every practice question comes from the selected exam and subject, with difficulty filtering applied.
          </p>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-white">Recent practice performance</h2>
        {history.length === 0
          ? <p className="mt-2 text-sm text-slate-500">No practice sessions yet. Start one above to track progress.</p>
          : (
            <ul className="mt-2 space-y-1 text-sm">
              {history.map((a: any) => (
                <li key={a.id} className="flex items-center justify-between">
                  <span className="text-slate-300">
                    {a.examName?.replace(/_/g, " ")} · {a.subject} · {a.mode}
                  </span>
                  <span className="text-slate-400">{a.scorePct?.toFixed?.(0) ?? "—"}%</span>
                </li>
              ))}
            </ul>
          )}
      </div>
    </div>
  );
}
