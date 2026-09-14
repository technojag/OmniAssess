import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import ProctorPanel from "../components/ProctorPanel";

export default function PracticeArena() {
  const nav = useNavigate();
  const [micOk, setMicOk] = useState<string>("Not tested");
  const [busy, setBusy] = useState(false);

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
    try {
      const r = await api<any>("/api/assessments/start", {
        method: "POST",
        body: JSON.stringify({ mode: "PRACTICE", maxQuestions: 6, practice: true }),
      });
      nav(`/app/assess/${r.assessment.id}?practice=1`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <div className="text-xs uppercase tracking-widest text-mint">Safe sandbox</div>
        <h1 className="mt-2 font-display text-4xl text-white">Practice Arena</h1>
        <p className="mt-2 text-slate-400">Test camera, mic and interface. Practice scores do NOT affect official stats.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <ProctorPanel />
        <div className="card space-y-3 p-5">
          <div className="font-semibold text-white">Device checks</div>
          <div className="text-sm text-slate-400">Mic: {micOk}</div>
          <button className="btn-ghost" onClick={testMic}>Test microphone</button>
          <button className="btn-ghost" onClick={() => nav("/app/interview")}>Try AI interview</button>
          <button className="btn-primary" disabled={busy} onClick={startPractice}>{busy ? "Starting…" : "Start practice set (6 Qs)"}</button>
        </div>
      </div>
    </div>
  );
}
