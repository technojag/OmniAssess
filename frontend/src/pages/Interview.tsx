import { useRef, useState } from "react";
import { api } from "../lib/api";
import ProctorPanel from "../components/ProctorPanel";

export default function Interview() {
  const [mode, setMode] = useState<"TECHNICAL" | "HR">("TECHNICAL");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [turns, setTurns] = useState<{ role: string; content: string }[]>([]);
  const [text, setText] = useState("");
  const [meta, setMeta] = useState<any>(null);
  const [micOn, setMicOn] = useState(false);
  const [progress, setProgress] = useState(0);
  const recRef = useRef<any>(null);

  async function start() {
    const r = await api<any>("/api/interview/start", { method: "POST", body: JSON.stringify({ mode }) });
    setSessionId(r.session.id);
    setTurns([r.turn]);
    setMeta(r.ai);
  }

  async function send() {
    if (!sessionId || !text.trim()) return;
    const content = text.trim();
    setTurns((t) => [...t, { role: "user", content }]);
    setText("");
    const r = await api<any>(`/api/interview/${sessionId}/turn`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
    setTurns((t) => [...t, { role: "interviewer", content: r.reply }]);
    setMeta({ ...r.ai, evaluation: r.evaluation });
    setProgress((p) => Math.min(100, p + 20));
    try {
      const u = new SpeechSynthesisUtterance(r.reply.slice(0, 220));
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

  function endInterview() {
    setSessionId(null);
    setTurns([]);
    setProgress(0);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div className="max-w-3xl space-y-4">
      <h1 className="font-display text-4xl text-white">AI Video Interview</h1>
      <p className="text-sm text-slate-400">Heuristic scoring only (relevance, structure, depth). No emotion or psychological detection.</p>
      {!sessionId ? (
        <div className="flex gap-3">
          <select className="input w-40" value={mode} onChange={(e) => setMode(e.target.value as any)}>
            <option value="TECHNICAL">Technical</option>
            <option value="HR">HR</option>
          </select>
          <button className="btn-primary" onClick={start}>
            Start
          </button>
        </div>
      ) : (
        <>
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
            <button className="btn-ghost" onClick={endInterview}>End interview</button>
          </div>
          {meta && (
            <p className="text-xs text-slate-500">
              Source {meta.source} · confidence {meta.confidence} · {meta.limitations}
              {meta.evaluation && (
                <span>
                  {" "}
                  · relevance {meta.evaluation.relevance} structure {meta.evaluation.structure} depth {meta.evaluation.depth}
                </span>
              )}
            </p>
          )}
        </>
      )}
      </div>
      <ProctorPanel compact />
    </div>
  );
}
