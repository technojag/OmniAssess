import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Activity, Award, BarChart3, BookOpen, Brain, FileText, LayoutDashboard, LogOut, Menu, Settings as SettingsIcon, ShieldCheck, Sparkles, Target, UserRound, Video, X } from "lucide-react";
import { useAuth } from "../store/auth";
import { useState } from "react";

const sections = [
  {
    label: "Main",
    items: [
      { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "/app/assessments", label: "Assessments", icon: Brain },
      { to: "/app/interview", label: "AI Interview", icon: Video },
      { to: "/app/practice", label: "Practice Arena", icon: Sparkles },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { to: "/app/performance", label: "Performance", icon: BarChart3 },
      { to: "/app/skill-gap", label: "Skill Gap", icon: Target },
      { to: "/app/activity", label: "Activity", icon: Activity },
      { to: "/app/leaderboard", label: "Leaderboard", icon: Award },
      { to: "/app/notebook", label: "Error Notebook", icon: BookOpen },
    ],
  },
  {
    label: "Trust & Growth",
    items: [
      { to: "/app/workspace/proctoring/integrity", label: "Integrity Timeline", icon: ShieldCheck },
      { to: "/app/workspace/twin/graph", label: "Knowledge Graph", icon: Brain },
      { to: "/app/workspace/twin/weaknesses", label: "Weaknesses", icon: Target },
      { to: "/app/workspace/learning/path", label: "Personalized Path", icon: BookOpen },
      { to: "/app/workspace/analytics/growth", label: "Skill Growth", icon: Activity },
    ],
  },
  {
    label: "Account",
    items: [
      { to: "/app/profile", label: "Profile", icon: UserRound },
      { to: "/app/settings", label: "Settings", icon: SettingsIcon },
      { to: "/app/workspace/resume/analysis", label: "Resume Intelligence", icon: FileText },
    ],
  },
];

export default function Shell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const logout = useAuth((s) => s.logout);
  const user = useAuth((s) => s.user);
  const nav = useNavigate();
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      <button
        className="fixed right-4 top-4 z-30 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-panel text-slate-200 shadow-lg lg:hidden"
        aria-label={menuOpen ? "Close navigation" : "Open navigation"}
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
      <aside className={`${menuOpen ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-20 flex w-[min(88vw,320px)] flex-col border-r border-line bg-panel/95 p-4 shadow-2xl backdrop-blur-xl transition-transform lg:sticky lg:top-0 lg:h-screen lg:w-auto lg:translate-x-0 lg:shadow-none`}>
        <div className="border-b border-line/70 px-2 pb-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-accent text-lg font-bold text-white shadow-lg shadow-accent/25">O<span className="text-mint">.</span></div>
            <div>
              <div className="font-display text-xl text-white">OmniAssess<span className="text-mint">.</span></div>
              <div className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-500">Learning intelligence</div>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-mint/15 bg-mint/[0.05] px-3 py-2 text-xs text-slate-400"><span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-mint" />Assess <span className="text-slate-600">→</span> Diagnose <span className="text-slate-600">→</span> Practice</div>
        </div>
        <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto py-5 pr-1">
          {sections.map((section) => (
            <div key={section.label} className="border-b border-line/40 pb-4 last:border-0">
              <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">{section.label}</div>
              <div className="space-y-1">
                {section.items.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={`${section.label}-${item.label}-${index}`}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        `group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${isActive && (item.to !== "/app" || item.label === "Dashboard") ? "border-accent/25 bg-accent/15 text-white shadow-sm shadow-accent/10" : "border-transparent text-slate-400 hover:border-line hover:bg-white/[0.04] hover:text-white"}`
                      }
                      onClick={() => setMenuOpen(false)}
                    >
                      <Icon size={16} strokeWidth={1.8} className="text-slate-500 transition group-hover:text-mint" />
                      {item.label}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="mt-auto border-t border-line/70 pt-4 text-xs text-slate-500">
          <div className="flex items-center gap-3 rounded-xl bg-ink/40 px-3 py-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-accent/20 font-semibold text-accent">{user?.name?.slice(0, 1).toUpperCase() || "U"}</div>
            <div className="min-w-0"><div className="truncate font-medium text-slate-200">{user?.name}</div><div className="truncate text-[11px] text-slate-600">{user?.email}</div></div>
          </div>
          <button
            className="mt-3 inline-flex items-center gap-2 px-3 text-accent transition hover:text-mint"
            onClick={() => {
              logout();
              nav("/");
            }}
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>
      {menuOpen && <button aria-label="Close navigation overlay" className="fixed inset-0 z-10 bg-black/50 lg:hidden" onClick={() => setMenuOpen(false)} />}
      <main className="mx-auto w-full max-w-7xl p-4 pt-20 sm:p-6 sm:pt-20 lg:p-10 lg:pt-10">
        <Outlet />
      </main>
    </div>
  );
}
