import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../store/auth";

export default function Login() {
  const setAuth = useAuth((s) => s.setAuth);
  const nav = useNavigate();
  const [email, setEmail] = useState("demo@omniassess.dev");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const data = await api<{ token: string; user: any }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setAuth(data.token, data.user);
      const status = await api<{ has_completed_onboarding: boolean }>("/api/onboarding/status", {
        headers: { Authorization: `Bearer ${data.token}` },
      }).catch(() => ({ has_completed_onboarding: true as boolean }));
      nav(status.has_completed_onboarding ? "/app" : "/app/onboarding");
    } catch (err: any) {
      setError(err.message || "Login failed");
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <form onSubmit={onSubmit} className="card p-8 w-full max-w-md space-y-4">
        <h1 className="font-display text-3xl">Welcome back</h1>
        <p className="text-sm text-slate-400">Demo: demo@omniassess.dev / password123</p>
        {error && <p className="text-rose-400 text-sm">{error}</p>}
        <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
        <button className="btn-primary w-full" type="submit">
          Sign in
        </button>
        <Link className="text-sm text-accent" to="/register">
          Create an account
        </Link>
      </form>
    </div>
  );
}
