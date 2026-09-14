import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../store/auth";

export default function Register() {
  const setAuth = useAuth((s) => s.setAuth);
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const data = await api<{ token: string; user: any }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      setAuth(data.token, data.user);
      nav("/app/onboarding");
    } catch (err: any) {
      setError(err.message || "Could not register");
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <form onSubmit={onSubmit} className="card p-8 w-full max-w-md space-y-4">
        <h1 className="font-display text-3xl">Create your workspace</h1>
        {error && <p className="text-rose-400 text-sm">{error}</p>}
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
        <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (8+ chars)" />
        <button className="btn-primary w-full" type="submit">
          Continue
        </button>
        <Link className="text-sm text-accent" to="/login">
          I already have an account
        </Link>
      </form>
    </div>
  );
}
