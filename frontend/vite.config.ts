import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Relative asset URLs allow the built SPA to be opened from dist/index.html.
  base: "./",
  server: { port: 5173 },
  test: { environment: "jsdom" },
});
