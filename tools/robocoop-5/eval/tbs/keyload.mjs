// OpenRouter key lookup shared by both arms: env var, else the robocoop-4 .env (where the eval key
// lives), else the repo-root .env. Never logged.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
export function loadKey() {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
  for (const f of [join(here, "..", "..", "..", "robocoop-4", ".env"), join(here, "..", "..", "..", "..", ".env")]) {
    try { const m = /^OPENROUTER_API_KEY=(.*)$/m.exec(readFileSync(f, "utf8")); if (m) return m[1].trim().replace(/^["']|["']$/g, ""); } catch {}
  }
  throw new Error("OPENROUTER_API_KEY not found");
}
