// Vercel serverless entrypoint (plain JavaScript - no TypeScript syntax).
// Delegates to the built Express app in backend/dist (CommonJS).
let ready = null;

async function ensureDb() {
  if (!ready) {
    ready = (async () => {
      const { execSync } = await import("node:child_process");
      try {
        execSync("npx prisma db push --schema backend/prisma/schema.prisma --accept-data-loss --skip-generate", {
          stdio: "inherit",
        });
      } catch (e) {
        console.error("prisma db push failed", e);
      }
      try {
        const { prisma } = await import("../backend/dist/lib/prisma.js");
        const q = await prisma.question.count().catch(() => 0);
        if (q === 0) {
          execSync("npm run seed --prefix backend", { stdio: "inherit" });
        }
      } catch (e) {
        console.error("seed check failed", e);
      }
    })();
  }
  return ready;
}

module.exports = async function handler(req, res) {
  await ensureDb();
  const mod = require("../backend/dist/index.js");
  const app = mod && mod.default ? mod.default : mod;
  return app(req, res);
};

