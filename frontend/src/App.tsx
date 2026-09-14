import type { ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "./store/auth";
import { api } from "./lib/api";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Assessment from "./pages/Assessment";
import Report from "./pages/Report";
import Notebook from "./pages/Notebook";
import Interview from "./pages/Interview";
import AssessmentsHub from "./pages/AssessmentsHub";
import PracticeArena from "./pages/PracticeArena";
import Performance from "./pages/Performance";
import SkillGap from "./pages/SkillGap";
import ActivityPage from "./pages/ActivityPage";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import WorkspacePage from "./pages/WorkspacePage";
import Shell from "./components/Shell";

function Private({ children }: { children: ReactNode }) {
  const token = useAuth((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function OnboardingGuard({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const [state, setState] = useState<"loading" | "needs" | "ok">("loading");
  useEffect(() => {
    let live = true;
    api<{ has_completed_onboarding: boolean }>("/api/onboarding/status")
      .then((r) => {
        if (live) setState(r.has_completed_onboarding ? "ok" : "needs");
      })
      .catch(() => {
        if (live) setState("ok");
      });
    return () => {
      live = false;
    };
  }, [loc.pathname]);
  if (state === "loading") return <p className="p-8 text-slate-400">Checking profile…</p>;
  if (state === "needs" && !loc.pathname.includes("/onboarding")) {
    return <Navigate to="/app/onboarding" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/app"
        element={
          <Private>
            <OnboardingGuard>
              <Shell />
            </OnboardingGuard>
          </Private>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="assessments" element={<AssessmentsHub />} />
        <Route path="onboarding" element={<Onboarding />} />
        <Route path="assess/:id" element={<Assessment />} />
        <Route path="report/:id" element={<Report />} />
        <Route path="notebook" element={<Notebook />} />
        <Route path="interview" element={<Interview />} />
        <Route path="practice" element={<PracticeArena />} />
        <Route path="performance" element={<Performance />} />
        <Route path="skill-gap" element={<SkillGap />} />
        <Route path="activity" element={<ActivityPage />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
        <Route path="workspace/:section/:view" element={<WorkspacePage />} />
      </Route>
    </Routes>
  );
}

