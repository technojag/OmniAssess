import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

type Evt = { kind: string; severity: string; description: string };

export default function ProctorPanel({ assessmentId, compact = false }: { assessmentId?: string; compact?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [score, setScore] = useState<number>(100);
  const [events, setEvents] = useState<Evt[]>([]);
  const [status, setStatus] = useState("Monitoring ready");

  async function send(kind: string, severity = "LOW", description = "") {
    const label = description || kind.replace(/_/g, " ");
    setEvents((e) => [{ kind, severity, description: `${new Date().toLocaleTimeString()} — ${label}` }, ...e].slice(0, 20));
    setStatus(`Integrity signal: ${label}`);
    try {
      const r = await api<any>("/api/proctoring/event", {
        method: "POST",
        body: JSON.stringify({ assessmentId, kind, severity, confidence: 0.6, description: label }),
      });
      if (typeof r.integrityScore === "number") setScore(r.integrityScore);
    } catch {
      setScore((s) => Math.max(0, s - 2));
    }
  }

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) send("TAB_HIDDEN", "MEDIUM", "Tab visibility changed");
    };
    const onBlur = () => send("WINDOW_BLUR", "LOW", "Window focus lost");
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId]);

  async function toggleCamera() {
    if (cameraOn) {
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
      setCameraOn(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
      setStatus("Camera live — face presence is checked on-device only");
    } catch {
      setStatus("Camera unavailable — tab/focus signals still active");
      send("NO_FACE", "LOW", "Camera unavailable");
    }
  }

  return (
    <div className={`card p-4 ${compact ? "" : "space-y-3"}`}>
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-slate-500">Proctoring HUD</div>
        <div className={`rounded-full px-2 py-1 text-xs ${score >= 85 ? "bg-mint/15 text-mint" : score >= 60 ? "bg-amber-300/15 text-amber-200" : "bg-rose-400/15 text-rose-300"}`}>
          Integrity {score.toFixed(0)}%
        </div>
      </div>
      <div className="relative overflow-hidden rounded-xl border border-line bg-ink/60">
        <video ref={videoRef} autoPlay muted playsInline className="h-36 w-full object-cover" />
        {!cameraOn && <div className="absolute inset-0 grid place-items-center text-xs text-slate-500">Camera PiP — click Test camera</div>}
      </div>
      <div className="flex gap-2">
        <button type="button" className="btn-ghost flex-1" onClick={toggleCamera}>{cameraOn ? "Stop camera" : "Test camera"}</button>
        <button type="button" className="btn-ghost" onClick={() => send("NO_FACE", "LOW", "Face temporarily unavailable")}>Simulate signal</button>
      </div>
      <p className="text-xs text-slate-500">{status}. Signals are review evidence, never automatic proof of misconduct.</p>
      {!compact && events.length > 0 && (
        <ul className="max-h-28 space-y-1 overflow-auto text-xs text-slate-400">
          {events.map((e, i) => <li key={i}>{e.description}</li>)}
        </ul>
      )}
    </div>
  );
}
