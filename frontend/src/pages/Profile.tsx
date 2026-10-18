import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../store/auth";

export default function Profile() {
  const user = useAuth((s) => s.user);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["dash-profile"],
    queryFn: () => api<any>("/api/analytics/dashboard"),
    retry: 1,
  });
  const [docText, setDocText] = useState("React Node.js MongoDB REST APIs Trees Recursion");
  const [docResult, setDocResult] = useState<any>(null);
  const [docError, setDocError] = useState("");
  const profile = data?.profile || {};

  async function upload() {
    setDocError("");
    try {
      const r = await api<any>("/api/analytics/documents", {
        method: "POST",
        body: JSON.stringify({ filename: "resume.txt", kind: "RESUME", text: docText }),
      });
      setDocResult(r.document.analysis);
    } catch (e: any) {
      setDocError(e.message || "Could not analyze document. Is the backend running?");
    }
  }

  if (isLoading) return <p className="text-slate-400">Loading profile…</p>;
  if (error)
    return (
      <div className="max-w-2xl space-y-3">
        <h1 className="font-display text-4xl text-white">Profile unavailable</h1>
        <p className="text-sm text-rose-400">Could not load: {(error as Error).message}</p>
        <button className="btn-ghost" onClick={() => refetch()} disabled={isFetching}>{isFetching ? "Retrying…" : "Retry"}</button>
      </div>
    );

  return (
    <div className="max-w-4xl space-y-5">
      <h1 className="font-display text-4xl text-white">Profile & Analytics</h1>
      <div className="card space-y-1 p-5 text-sm">
        <div className="text-lg font-semibold text-white">{user?.name}</div>
        <div className="text-slate-400">{user?.email}</div>
        <div className="text-slate-400">Category: {profile.category || "—"} · Level: {profile.experienceLevel || "—"}</div>
        <div className="text-slate-400">Focus: {profile.customFocus || profile?.candidateContext?.focus || "—"}</div>
        <div className="text-slate-400">Joined: {user ? "" : ""}{profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "—"}</div>
        <div className="text-slate-400">Streak: {data?.streak?.current ?? 0} days (longest {data?.streak?.longest ?? 0})</div>
      </div>
      <div className="card space-y-2 p-5">
        <div className="font-semibold text-white">Resume / Syllabus Intelligence (prototype)</div>
        <p className="text-xs text-slate-500">Paste resume or syllabus text. The system extracts topics and suggests a personalized assessment. No fake parsing claims.</p>
        <textarea className="input min-h-24" value={docText} onChange={(e) => setDocText(e.target.value)} />
        <button className="btn-primary" onClick={upload}>Analyze document</button>
        {docError && <p className="text-sm text-rose-400">{docError}</p>}
        {docResult && (
          <div className="text-sm text-slate-300">
            <div>Matched: {(docResult.matchedConcepts || []).map((m: any) => m.name).join(", ") || "none"}</div>
            <div>Keywords: {(docResult.keywords || []).join(", ")}</div>
            <div className="mt-1 text-mint">{docResult.suggestedAssessment}</div>
            <div className="text-xs text-slate-500">{docResult.limitations}</div>
          </div>
        )}
      </div>
      <div className="card p-5">
        <div className="font-semibold">Badges ({(data?.badges || []).length})</div>
        <div className="mt-2 flex flex-wrap gap-2">{(data?.badges || []).map((b: any) => <span key={b.id} className="rounded-full bg-accent/20 px-2 py-1 text-xs">{b.badge.name}</span>)}</div>
      </div>
    </div>
  );
}
