import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

type Evt = { kind: string; severity: string; description: string; action?: string };
type Action = "LOG" | "WARNING" | "TERMINATE";

/**
 * Proctoring HUD with enforcement.
 * Detection -> confidence gate -> warning -> terminate. Browser signals
 * (tab/window/camera/mic) are exact; CV signals carry model confidence.
 */
export default function ProctorPanel({
  assessmentId,
  compact = false,
  enforced = false,
  onTerminate,
}: {
  assessmentId?: string;
  compact?: boolean;
  enforced?: boolean;
  onTerminate?: (reason: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stoppedRef = useRef(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [score, setScore] = useState(100);
  const [warnings, setWarnings] = useState(0);
  const [maxWarnings, setMaxWarnings] = useState(3);
  const [events, setEvents] = useState<Evt[]>([]);
  const [status, setStatus] = useState("Monitoring ready");
  const [notice, setNotice] = useState<{ action: Action; text: string } | null>(null);
  const [terminated, setTerminated] = useState(false);

  async function send(kind: string, severity = "LOW", confidence = 0.7, description = "") {
    if (stoppedRef.current) return;
    const label = description || kind.replace(/_/g, " ");
    setStatus(`Signal: ${label}`);
    try {
      const r = await api<any>("/api/proctoring/event", {
        method: "POST",
        body: JSON.stringify({ assessmentId, kind, severity, confidence, description: label }),
      });
      const action: Action = r.action || "LOG";
      setEvents((e) =>
        [{ kind, severity, description: `${new Date().toLocaleTimeString()} — ${label}`, action }, ...e].slice(0, 20)
      );
      if (typeof r.integrityScore === "number") setScore(r.integrityScore);
      if (typeof r.violationCount === "number") setWarnings(r.violationCount);
      if (typeof r.maxWarnings === "number") setMaxWarnings(r.maxWarnings);

      if (action === "TERMINATE") {
        stoppedRef.current = true;
        setTerminated(true);
        setNotice({ action, text: r.reason || "Test terminated due to repeated proctoring violations." });
        stopMedia();
        onTerminate?.(r.reason || "Repeated suspicious activity detected");
      } else if (action === "WARNING") {
        setNotice({ action, text: r.reason || `Warning ${r.violationCount ?? warnings + 1} recorded.` });
      }
    } catch {
      // A network failure must not silently punish the learner.
      setEvents((e) =>
        [{ kind, severity, description: `${new Date().toLocaleTimeString()} — ${label} (offline)` }, ...e].slice(0, 20)
      );
    }
  }

  function stopMedia() {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }

  // Browser-level signals: exact, cheap, and reliable.
  useEffect(() => {
    if (!enforced || !assessmentId) return;
    const onVis = () => {
      if (document.hidden) send("TAB_SWITCH", "HIGH", 1, "Tab switched away from the test");
    };
    const onBlur = () => send("WINDOW_BLUR", "MEDIUM", 1, "Test window lost focus");
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId, enforced]);

  async function toggleCamera() {
    if (cameraOn) {
      stopMedia();
      if (enforced) send("CAMERA_DISABLED", "HIGH", 1, "Camera turned off");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
      setStatus("Camera live — on-device checks only");
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        setCameraOn(false);
        if (enforced) send("CAMERA_DISABLED", "HIGH", 1, "Camera feed ended");
      });
    } catch {
      setStatus("Camera unavailable");
      send("NO_FACE", "MEDIUM", 0.6, "Camera unavailable at start");
    }
  }

  const warnBudget = warnings >= Math.max(1, maxWarnings - 1);

  return (
    <div className={`card p-4 ${compact ? "" : "space-y-3"} ${terminated ? "border-rose-400/60" : ""}`}>
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-slate-500">Proctoring HUD</div>
        <div className={`rounded-full px-2 py-1 text-xs ${score >= 85 ? "bg-mint/15 text-mint" : score >= 60 ? "bg-amber-300/15 text-amber-200" : "bg-rose-400/15 text-rose-300"}`}>
          Integrity {score.toFixed(0)}%
        </div>
      </div>

      {enforced && (
        <div className={`rounded-xl border px-3 py-2 text-xs ${warnBudget ? "border-rose-400/40 bg-rose-400/10 text-rose-200" : "border-line text-slate-400"}`}>
          Violations: <span className="font-semibold text-white">{warnings}</span> / {maxWarnings - 1} warnings
          {warnings > 0 && <span className="ml-2 text-slate-500">Next confirmed violation terminates the test.</span>}
        </div>
      )}

      {notice && (
        <div className={`rounded-xl border px-3 py-2 text-xs ${notice.action === "TERMINATE" ? "border-rose-400/50 bg-rose-400/15 text-rose-100" : "border-amber-300/40 bg-amber-300/10 text-amber-100"}`}>
          <span className="font-semibold">{notice.action === "TERMINATE" ? "TEST TERMINATED — " : "Warning — "}</span>
          {notice.text}
        </div>
      )}

      <div className="relative overflow-hidden rounded-xl border border-line bg-ink/60">
        <video ref={videoRef} autoPlay muted playsInline className="h-36 w-full object-cover" />
        {!cameraOn && <div className="absolute inset-0 grid place-items-center text-xs text-slate-500">Camera PiP — click Test camera</div>}
      </div>

      <button type="button" className="btn-ghost w-full" onClick={toggleCamera} disabled={terminated}>
        {cameraOn ? "Stop camera" : "Test camera"}
      </button>

      {/* Detection harness: a CV model (or a demo) reports the same signals. */}
      {!compact && !terminated && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button type="button" className="btn-ghost" onClick={() => send("PHONE_DETECTED", "MEDIUM", 0.45, "Phone (1 frame, low confidence)")}>Phone (low conf)</button>
          <button type="button" className="btn-ghost" onClick={() => send("PHONE_DETECTED", "MEDIUM", 0.82, "Phone confirmed")}>Phone (confirmed)</button>
          <button type="button" className="btn-ghost" onClick={() => send("MULTIPLE_FACES", "HIGH", 0.85, "Multiple faces")}>Multiple faces</button>
          <button type="button" className="btn-ghost" onClick={() => send("FACE_AWAY", "LOW", 0.7, "Looking away")}>Face away</button>
        </div>
      )}

      <p className="text-xs text-slate-500">{status}. Confirmed violations only; low-confidence frames are logged, not punished.</p>

      {!compact && events.length > 0 && (
        <ul className="max-h-28 space-y-1 overflow-auto text-xs text-slate-400">
          {events.map((e, i) => (
            <li key={i} className={e.action === "TERMINATE" ? "text-rose-300" : e.action === "WARNING" ? "text-amber-200" : ""}>
              {e.description}{e.action && e.action !== "LOG" ? ` — ${e.action}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
