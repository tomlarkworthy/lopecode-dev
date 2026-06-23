// Dump the agent's transcript for one eval, to see where it spends steps.
import { createDriver } from "./eval/live/driver.mjs";
import { EVALS } from "./eval/live/evals.mjs";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
// load .env
try { for (const line of readFileSync(join(here, ".env"), "utf8").split("\n")) { const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim(); } } catch {}
const id = process.argv[2] || "self-modules-roles";
const evalDef = EVALS.find((e) => e.id === id);
const notebookPath = join(here, "..", "..", "lopebooks", "notebooks", "@tomlarkworthy_robocoop-4.html");
const driver = await createDriver({ notebookPath, apiKey: process.env.OPENROUTER_API_KEY, model: "anthropic/claude-sonnet-4", timeoutMs: 180000 });
try {
  const snap = await driver.runQuestion(evalDef);
  console.log("=== toolCalls (" + (snap.toolCalls || []).length + ") ===");
  for (const c of snap.toolCalls || []) {
    const a = c.arguments || {};
    console.log(c.name + ": " + String(a.command || a.code || (a.module ? a.module + " " + (a.code || "") : "") || JSON.stringify(a)).replace(/\n/g, " ").slice(0, 130));
  }
  const asst = (snap.conversation || []).filter((m) => m.role === "assistant" && typeof m.content === "string" && m.content.trim());
  console.log("\n=== final assistant ===\n" + (asst.length ? asst[asst.length - 1].content.slice(0, 500) : "(none)"));
  console.log("\n=== answer.txt ===\n" + (snap.files?.["/notebook/answer.txt"] ?? "(absent)"));
} finally { await driver.close?.(); }
process.exit(0);
