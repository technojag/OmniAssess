import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";

export default function Settings() {
  const logout = useAuth((s) => s.logout);
  const nav = useNavigate();
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="font-display text-4xl text-white">Settings</h1>
      <div className="card space-y-3 p-5 text-sm text-slate-300">
        <p>Theme: dark prototype (light theme is future scope).</p>
        <p>Integrity penalties and termination threshold are configured server-side via environment variables.</p>
        <p>AI features use GEMINI_API_KEY when set; otherwise labeled deterministic fallbacks are shown.</p>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => nav("/app/onboarding")}>Edit onboarding profile</button>
          <button className="btn-ghost" onClick={() => { logout(); nav("/"); }}>Logout</button>
        </div>
      </div>
    </div>
  );
}
