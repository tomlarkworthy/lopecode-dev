#!/usr/bin/env node
// Arm A — raw model, no harness: single-shot completion of each MultiPL-E humaneval-js prompt via
// OpenRouter chat, graded with the official tests. The comparison baseline for the robocoop-5 arm.
//   node run-baseline.mjs [--limit N] [--offset N] [--model m] [--json out.json] [--concurrency N]

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gradeCandidate, fnNameOf as fnNameOfPrompt } from "./grade.mjs";

const here = dirname(fileURLToPath(import.meta.url));

function loadKey() {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
  for (const f of [
    join(here, "..", "..", "..", "robocoop-4", ".env"),
    join(here, "..", "..", "..", "..", ".env"),
  ]) {
    try {
      const m = /^OPENROUTER_API_KEY=(.*)$/m.exec(readFileSync(f, "utf8"));
      if (m) return m[1].trim().replace(/^["']|["']$/g, "");
    } catch {}
  }
  throw new Error("OPENROUTER_API_KEY not found");
}

const args = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : dflt;
};
const limit = Number(flag("--limit", 20));
const offset = Number(flag("--offset", 0));
const model = flag("--model", "xiaomi/mimo-v2.5-pro"); // NEVER read OPENROUTER_MODEL — evals are mimo
const jsonOut = flag("--json", join(here, "results", `baseline-${offset}-${offset + limit}.json`));
const concurrency = Number(flag("--concurrency", 4));

const key = loadKey();
const problems = JSON.parse(readFileSync(join(here, "humaneval-js.json"), "utf8")).slice(offset, offset + limit);
console.log(`model: ${model}  problems: ${problems.length} (offset ${offset})`);

const fnNameOf = (p) => fnNameOfPrompt(p.prompt);

function extractCode(text) {
  const blocks = [...text.matchAll(/```(?:js|javascript)?\n([\s\S]*?)```/g)].map((m) => m[1]);
  if (blocks.length) return blocks[blocks.length - 1];
  return text; // no fence — hope it's bare code
}

async function complete(p) {
  const body = {
    model,
    messages: [
      {
        role: "system",
        content:
          "You are an expert JavaScript programmer. Complete the function the user gives you. " +
          "Reply with ONLY the complete, working function definition (including the signature) in a " +
          "single ```js code block. No explanation, no tests, no console.log.",
      },
      { role: "user", content: p.prompt },
    ],
    temperature: 0,
  };
  // Sustained concurrency trips transient network/rate-limit failures ("fetch failed", 429) — a full-161
  // run lost 104 problems to them. Retry with exponential backoff before counting anything as a failure.
  let lastErr;
  for (let attempt = 0; attempt < 6; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt + Math.random() * 1000));
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`openrouter ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (content == null) throw new Error("empty completion: " + JSON.stringify(data).slice(0, 200));
      return content;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

const results = [];
let i = 0;
async function worker() {
  while (i < problems.length) {
    const idx = i++;
    const p = problems[idx];
    const started = Date.now();
    let rec = { name: p.name, pass: false, error: null };
    try {
      const text = await complete(p);
      const candidate = extractCode(text);
      const graded = gradeCandidate(candidate, p.tests, { fnName: fnNameOf(p) });
      rec = { name: p.name, pass: graded.pass, error: graded.error, candidate };
    } catch (e) {
      rec.error = e.message;
    }
    rec.durationMs = Date.now() - started;
    results[idx] = rec;
    console.log(`${rec.pass ? "PASS" : "FAIL"}  ${p.name}  (${rec.durationMs}ms)${rec.pass ? "" : "  " + String(rec.error).split("\n")[0].slice(0, 100)}`);
  }
}
await Promise.all(Array.from({ length: concurrency }, worker));

const passed = results.filter((r) => r.pass).length;
console.log(`\npass@1: ${passed}/${results.length} = ${(passed / results.length).toFixed(3)}`);
writeFileSync(jsonOut, JSON.stringify({ arm: "baseline", model, offset, limit, passed, total: results.length, results }, null, 1));
console.log("wrote", jsonOut);
