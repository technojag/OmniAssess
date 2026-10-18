import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Absolute asset URLs (base "/") so deep SPA routes like /app/assessments
  // resolve /assets/... correctly. Relative "./" broke every page except /app.
  base: "/",
  server: { port: 5173 },
  test: { environment: "jsdom" },
});
