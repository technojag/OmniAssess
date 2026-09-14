# OmniAssess AI — "From Assessment to Insight to Improvement."

Full-stack implementation of the continuous intelligence loop:

**Candidate Context → Assessment → Performance Data → AI Analysis → Skill Gap → Recommendation → Next Assessment → Improvement Tracking**

Scoring, item selection, and knowledge updates are **deterministic**. LLM text is assistive and always carries **confidence + limitations**. There are **no 99.9% accuracy claims**.

## Stack

| Layer | Default |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, Tailwind, Recharts, Zustand, TanStack Query |
| Backend | Node.js, Express, Prisma, JWT |
| Database | **SQLite locally** (this machine has no Docker/Postgres). Schema is relational and maps to PostgreSQL. |
| ML | Python FastAPI — IRT-inspired EAP theta + linear readiness blend |
| LLM | Google Gemini when `GEMINI_API_KEY` is set; otherwise labeled fallbacks |

## Quick start

Requirements: Node 20+, Python 3.10+, Git.

```bash
cd omniassess-ai
npm install
cd backend && npm install && npx prisma generate && npx prisma db push && npm run seed
cd ../frontend && npm install
cd ../ml-service && python -m pip install -r requirements.txt
cd ..
npm run dev
```

If the Python service is not running, the app still works: the Node engine estimates theta itself.

URLs:

- App: http://localhost:5173
- API: http://localhost:4000/api/health
- ML: http://127.0.0.1:8001/health

The source `frontend/index.html` is a Vite entry file and must be run through a local server, not opened directly from the file system. To run the website, use `npm run dev` from the repository root and open http://localhost:5173. To preview a production build, run `npm run build --prefix frontend` followed by `npm run preview --prefix frontend`, then open the URL shown by Vite.

Demo login: `demo@omniassess.dev` / `password123`

### Gemini (optional)

Copy `.env.example` values into `backend/.env` and set `GEMINI_API_KEY`. Used for weakness narratives, study plans, and interview follow-ups.

### PostgreSQL later

Use `docker-compose.yml` (or any Postgres 16), change Prisma `provider` to `postgresql`, set `DATABASE_URL`, then `npx prisma migrate dev`.

## Tests

```bash
cd backend && npm test
cd ../frontend && npm test
cd ../ml-service && python -m pytest -q
```

## What is implemented

- Landing: navbar, Login/Register, hero + tagline, Try Free Demo, 4 audience cards, AI interview / assessment / proctoring / analytics previews, How Proctoring Works, footer.
- Auth: register/login/logout, protected routes, persistent session (localStorage JWT), onboarding guard via `has_completed_onboarding`.
- Onboarding: 3-step intake (School / College / Govt / Corporate → dynamic fields → custom focus), saves `UserProfile`, generates candidate context.
- Dashboard: name, category, streaks, totals, averages, recent assessments, radar, weak/strong areas, 365-day heatmap, Start Assessment / AI Interview / Practice Arena, improvement chart.
- Assessment: timer, palette state, difficulty badge, 4 options, clear response, mark-for-review, camera PiP + proctor HUD, adaptive Easy→Medium→Hard logic.
- Interview: interviewer panel + progress, webcam HUD, mic/voice input + speech output, end control, heuristic relevance/structure/depth scoring (no emotion detection).
- Integrity: `POST /api/proctoring/event` with backend-configured penalties, timeline, final scorecard section. Wording is Signal/Warning only.
- Scorecard: overall /100, skill analysis, topic breakdown, integrity, AI next-steps, Retake / Practice weak areas / Download / Dashboard.
- Practice Arena: camera + mic checks; `isPractice` sessions never touch official stats.
- Profile/Analytics: info, history, radar, integrity, heatmap, streak, badges, improvement.
- Documents: prototype resume/syllabus keyword→concept extraction with honest limitations.
- Nav: Dashboard, Assessments, AI Interview, Practice Arena, Performance, Skill Gap, Activity, Leaderboard, Profile, Settings.

## Project layout

```
frontend/    React SPA
backend/     Express API + Prisma + seeds
ml-service/  FastAPI IRT / readiness
```
