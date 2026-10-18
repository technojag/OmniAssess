import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import ProctorPanel from "../components/ProctorPanel";
import ExamPicker, { type ExamSelection } from "../components/ExamPicker";

export default function Interview() {
  const [selection, setSelection] = useState<ExamSelection>({
    categoryId: "TECHNICAL",
    examName: "BTECH",
    subject: "DSA",
    topic: "Mixed",
    difficulty: "MIXED",
  });
  const [ready, setReady] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [turns, setTurns] = useState<{ role: string; content: string }[]>([]);
  const [text, setText] = useState("");
  const [meta, setMeta] = useState<any>(null);
  const [rubric, setRubric] = useState<any[]>([]);
  const [examInfo, setExamInfo] = useState<any>(null);
  const [focus, setFocus] = useState<string[]>([]);
  const [micOn, setMicOn] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<any>(null);
  const recRef = useRef<any>(null);

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

  async function start() {
    setError("");
    setSummary(null);
    try {
      const r = await api<any>("/api/interview/start", {
        method: "POST",
        body: JSON.stringify({
          category: selection.categoryId,
          examName: selection.examName,
          subject: selection.subject,
        }),
      });
      setSessionId(r.session.id);
      setTurns([r.turn]);
      setMeta(r.ai);
      setRubric(r.rubric || []);
      setExamInfo(r.exam);
      setFocus(r.focus || []);
    } catch (e: any) {
      setError(e.message || "Could not start interview. Is the backend running?");
    }
  }

  async function send() {
    if (!sessionId || !text.trim()) return;
    const content = text.trim();
    setError("");
    setTurns((t) => [...t, { role: "user", content }]);
    setText("");
    try {
      const r = await api<any>(`/api/interview/${sessionId}/turn`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      setTurns((t) => [...t, { role: "interviewer", content: r.reply }]);
      setMeta({ ...r.ai, evaluation: r.evaluation });
      setProgress((p) => Math.min(100, p + 20));
    } catch (e: any) {
      setError(e.message || "Could not send answer");
      return;
    }
    try {
      const u = new SpeechSynthesisUtterance(turns[turns.length - 1]?.content?.slice(0, 220) || content.slice(0, 220));
      window.speechSynthesis?.speak(u);
    } catch { /* voice optional */ }
  }

  function toggleMic() {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) {
      setText((t) => t || "Voice input not supported in this browser — type your answer.");
      return;
    }
    if (micOn && recRef.current) {
      recRef.current.stop();
      setMicOn(false);
      return;
    }
    const rec = new SR();
    recRef.current = rec;
    rec.lang = "en-US";
    rec.onresult = (e: any) => {
      const transcript = Array.from(e.results).map((r: any) => r[0].transcript).join(" ");
      setText((t) => (t ? `${t} ${transcript}` : transcript));
    };
    rec.onend = () => setMicOn(false);
    rec.start();
    setMicOn(true);
  }

  async function endInterview() {
    if (sessionId) {
      try {
        const s = await api<any>(`/api/interview/${sessionId}/summary`);
        setSummary(s);
      } catch (e: any) {
        setError(e.message || "Could not load interview summary");
      }
    }
    setSessionId(null);
    setTurns([]);
    setProgress(0);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div className="max-w-3xl space-y-4">
        <h1 className="font-display text-4xl text-white">AI Interview</h1>
        <p className="text-sm text-slate-400">
          Questions and scoring adapt to your selected category. Heuristic rubric scoring only — no emotion or psychological detection.
        </p>
        {error && <p className="text-sm text-rose-400">{error}</p>}

        {!sessionId ? (
          <div className="space-y-4">
            <ExamPicker value={selection} onChange={setSelection} />
            <div className="flex gap-3">
              <button className="btn-primary" onClick={start} disabled={!ready}>
                Start interview
              </button>
            </div>
          </div>
        ) : (
          <>
            {examInfo && (
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-1 text-accent">
                  {examInfo.categoryLabel}
                </span>
                <span className="rounded-full border border-line px-2 py-1 text-slate-400">{examInfo.examLabel}</span>
                {examInfo.subject && (
                  <span className="rounded-full border border-line px-2 py-1 text-slate-400">{examInfo.subject}</span>
                )}
              </div>
            )}
            {focus.length > 0 && (
              <div className="card p-4 text-xs text-slate-400">
                <div className="font-semibold text-white">This interview covers</div>
                <ul className="mt-1 list-inside list-disc">
                  {focus.map((f) => <li key={f}>{f}</li>)}
                </ul>
              </div>
            )}
            <div className="text-xs text-slate-400">Interview progress: {progress}%</div>
          <div className="h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-mint" style={{ width: `${progress}%` }} /></div>
          <div className="card min-h-[240px] space-y-3 p-4">
            {turns.map((t, i) => (
              <div key={i} className={t.role === "user" ? "text-right" : ""}>
                <div className="text-xs text-slate-500">{t.role === "user" ? "Candidate" : "AI interviewer"}</div>
                <div className="inline-block max-w-[85%] rounded-xl bg-white/5 px-3 py-2">{t.content}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Your answer (or use mic)" />
            <button className="btn-primary" onClick={send}>Answer</button>
          </div>
          <div className="flex gap-2">
              <button className="btn-ghost" onClick={toggleMic}>{micOn ? "Stop mic" : "Mic"}</button>
              <button className="btn-ghost" onClick={endInterview}>Finish &amp; score</button>
            </div>
            {meta && (
              <div className="card p-4">
                <div className="text-xs uppercase tracking-wider text-slate-500">Live rubric</div>
                <ul className="mt-2 space-y-1 text-sm">
                  {rubric.map((r) => {
                    const v = meta.evaluation?.[r.key];
                    return (
                      <li key={r.key} className="flex items-center justify-between gap-2">
                        <span className="text-slate-300" title={r.hint}>{r.label}</span>
                        <span className="text-slate-400">
                          {typeof v === "number" ? `${(v * 100).toFixed(0)}%` : "—"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-2 text-xs text-slate-500">Source {meta.source} · confidence {meta.confidence}</p>
              </div>
            )}
          </>
        )}

        {summary && (
          <div className="card space-y-3 p-5">
            <h2 className="font-semibold text-white">
              Interview result — {summary.exam?.categoryLabel} · {(summary.overall * 100).toFixed(0)}%
            </h2>
            <p className="text-xs text-slate-500">{summary.answered} answers · {summary.note}</p>
            <ul className="space-y-1 text-sm">
              {(summary.dimensions || []).map((d: any) => (
                <li key={d.key} className="flex items-center justify-between gap-2">
                  <span className="text-slate-300" title={d.hint}>{d.label}</span>
                  <span className="text-slate-400">{(d.score * 100).toFixed(0)}% ({d.samples} samples)</span>
                </li>
              ))}
            </ul>
            {summary.weakAreas?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-rose-300">Weak areas</h3>
                <ul className="mt-1 list-inside list-disc text-sm text-slate-300">
                  {summary.weakAreas.map((w: string) => <li key={w}>{w}</li>)}
                </ul>
              </div>
            )}
            <div>
              <h3 className="text-sm font-semibold text-mint">How to improve</h3>
              <ul className="mt-1 list-inside list-disc text-sm text-slate-300">
                {(summary.suggestions || []).map((s: string) => <li key={s}>{s}</li>)}
              </ul>
            </div>
          </div>
        )}
      </div>
      <ProctorPanel compact />
    </div>
  );
}
