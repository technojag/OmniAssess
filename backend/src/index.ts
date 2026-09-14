import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { authRouter } from "./routes/auth.js";
import { onboardingRouter } from "./routes/onboarding.js";
import { assessmentRouter } from "./routes/assessments.js";
import { analyticsRouter } from "./routes/analytics.js";
import { interviewRouter } from "./routes/interview.js";
import { proctorRouter } from "./routes/proctoring.js";

const app = express();
const allowedOrigins = new Set([
  process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);
app.use(cors({ origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)) }));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "omniassess-backend",
    scoring: "deterministic",
    llm: Boolean(process.env.GEMINI_API_KEY),
  });
});

app.use("/api/auth", authRouter);
app.use("/api", onboardingRouter);
app.use("/api/assessments", assessmentRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/interview", interviewRouter);
app.use("/api/proctoring", proctorRouter);

// ---- One-service mode: serve the built frontend from the same port ----
// Local dev still uses Vite (5173), but `npm start` / Vercel / single deploys
// serve frontend/dist from this same Express server so only ONE URL is needed.
const here = __dirname;
const distCandidates = [
  path.resolve(here, "../../frontend/dist"),
  path.resolve(process.cwd(), "frontend/dist"),
  path.resolve(process.cwd(), "omniassess-ai/frontend/dist"),
  path.resolve(process.cwd(), "../frontend/dist"),
];
const distDir = distCandidates.find((d) => fs.existsSync(path.join(d, "index.html")));
if (distDir) {
  app.use(express.static(distDir));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
  console.log(`Serving frontend from ${distDir}`);
} else {
  console.log("Frontend dist not found — API-only mode. Build frontend to enable one-service mode.");
}

export default app;

const isVercel = Boolean(process.env.VERCEL);
if (!isVercel) {
  const port = Number(process.env.PORT || 4000);
  app.listen(port, () => {
    console.log(`OmniAssess on http://localhost:${port} (API + frontend, one service)`);
  });
}
