import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";

export default function Report() {
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api<any>(`/api/assessments/${id}/report`).then(setData);
  }, [id]);

  if (!data) return <p>Building intelligence report…</p>;
  const report = data.report;
  const weaknesses = report ? JSON.parse(report.weaknessesJson) : {};
  const topics = report ? JSON.parse(report.topicJson) : [];
  const cf = report ? JSON.parse(report.counterfactualJson) : null;
  const skill = data.skillAnalysis || {};
  const integrity = data.integrity || { score: 100, warnings: 0, events: [] };

  async function startRetake(practice: boolean) {
    const r = await api<any>("/api/assessments/start", {
      method: "POST",
      body: JSON.stringify({ mode: "ADAPTIVE", practice }),
    });
    nav(`/app/assess/${r.assessment.id}${practice ? "?practice=1" : ""}`);
  }

  function download() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `omniassess-report-${id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-4xl space-y-5">
      <h1 className="font-display text-4xl text-white">Scorecard — {data.assessment.scorePct?.toFixed(0)} / 100</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-semibold">Overall performance</h2>
          <div className="mt-2 font-display text-4xl text-white">{data.assessment.scorePct?.toFixed(0)}%</div>
          <p className="mt-2 text-sm text-slate-400">{weaknesses.headline}</p>
          <p className="mt-2 text-sm">{report?.summary}</p>
          <p className="mt-2 text-xs text-slate-500">Confidence {report?.confidence} · {report?.limitations}</p>
        </div>
        <div className="card p-5">
          <h2 className="font-semibold">Skill analysis</h2>
          <ul className="mt-2 space-y-1 text-sm">
            <li>Technical: {skill.technical ?? 0}%</li>
            <li>Problem solving (hard items): {skill.problemSolving ?? 0}%</li>
            <li>Time management: {skill.timeManagement ?? 0}/100</li>
            <li>Accuracy: {skill.accuracy ?? 0}% · total {(skill.totalTimeMs / 1000 || 0).toFixed(0)}s</li>
          </ul>
          <h3 className="mt-3 font-semibold">Difficulty performance</h3>
          <ul className="mt-1 space-y-1 text-sm">
            {(skill.difficultyPerf || []).map((d: any) => (
              <li key={d.level}>{d.level}: {(d.accuracy * 100).toFixed(0)}% ({d.attempts}) avg {(d.avgTimeMs / 1000).toFixed(0)}s</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="card p-5">
        <h2 className="font-semibold">Topic breakdown</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {topics.map((t: any) => (
            <li key={t.topic} className="flex justify-between"><span>{t.topic} {t.accuracy < 0.55 ? "(weak)" : t.accuracy >= 0.75 ? "(strong)" : ""}</span><span>{(t.accuracy * 100).toFixed(0)}% ({t.attempts})</span></li>
          ))}
        </ul>
      </div>
      <div className="card p-5">
        <h2 className="font-semibold">Integrity — {integrity.score}% · {integrity.warnings} warnings</h2>
        <p className="text-xs text-slate-500">Signals are review evidence, never automatic proof of misconduct.</p>
        <ul className="mt-2 max-h-32 space-y-1 overflow-auto text-xs text-slate-400">
          {(integrity.events || []).map((e: any) => <li key={e.id}>{new Date(e.createdAt).toLocaleTimeString()} — {e.description || e.kind} ({e.severity})</li>)}
          {(integrity.events || []).length === 0 && <li>No integrity signals recorded.</li>}
        </ul>
      </div>
      <div className="card p-5">
        <h2 className="font-semibold">AI feedback — what went well / wrong / next</h2>
        <ul className="mt-2 space-y-1 text-sm">{(cf?.whatImprovesScore || []).map((w: any) => <li key={w.action}>{w.action} → {w.projected}<div className="text-xs text-slate-500">{w.note}</div></li>)}</ul>
        <p className="mt-2 text-xs text-slate-500">{cf?.limitations}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" onClick={() => startRetake(false)}>Retake</button>
        <button className="btn-ghost" onClick={() => startRetake(true)}>Practice weak areas</button>
        <button className="btn-ghost" onClick={download}>Download report</button>
        <Link className="btn-ghost" to="/app">Return to dashboard</Link>
      </div>
    </div>
  );
}
