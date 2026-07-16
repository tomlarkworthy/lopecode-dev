#!/usr/bin/env node
// Arm A — raw model on the aider-polyglot JS subset, two-attempt protocol (aider's pass@2):
// attempt 1 from instructions + stub; on failure, attempt 2 sees the jest output. No agent harness.
//   node run-baseline.mjs [--limit N] [--offset N] [--model m] [--json out] [--concurrency N]

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gradeSolution } from "./grade.mjs";

const here = dirname(fileURLToPath(import.meta.url));

function loadKey() {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
  for (const f of [join(here, "..", "..", "..", "robocoop-4", ".env"), join(here, "..", "..", "..", "..", ".env")]) {
    try {
      const m = /^OPENROUTER_API_KEY=(.*)$/m.exec(readFileSync(f, "utf8"));
      if (m) return m[1].trim().replace(/^["']|["']$/g, "");
    } catch {}
  }
  throw new Error("OPENROUTER_API_KEY not found");
}

const args = process.argv.slice(2);
const flag = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
const limit = Number(flag("--limit", 49));
const offset = Number(flag("--offset", 0));
const model = flag("--model", "xiaomi/mimo-v2.5-pro"); // NEVER read OPENROUTER_MODEL — evals are mimo
const jsonOut = flag("--json", join(here, "results", `baseline-${offset}-${offset + limit}.json`));
const concurrency = Number(flag("--concurrency", 2));

const key = loadKey();
const problems = JSON.parse(readFileSync(join(here, "problems.json"), "utf8")).slice(offset, offset + limit);
console.log(`model: ${model}  problems: ${problems.length} (offset ${offset})`);

function extractCode(text) {
  const blocks = [...text.matchAll(/```(?:js|javascript)?\n([\s\S]*?)```/g)].map((m) => m[1]);
  if (blocks.length) return blocks[blocks.length - 1];
  return text;
}

async function chat(messages) {
  let lastErr;
  for (let attempt = 0; attempt < 6; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt + Math.random() * 1000));
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, temperature: 0 }),
      });
      if (!res.ok) throw new Error(`openrouter ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (content == null) throw new Error("empty completion: " + JSON.stringify(data).slice(0, 200));
      return content;
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

function firstPrompt(p) {
  return (
    `# Exercise: ${p.slug}\n\n${p.instructions}\n\n` +
    `# Skeleton file ${p.solutionFile}\n\n\`\`\`js\n${p.stub}\n\`\`\`\n\n` +
    `Implement the exercise. Reply with the COMPLETE contents of ${p.solutionFile} in a single ` +
    "```js code block. Keep the same export names and module style (ES module exports) as the skeleton. " +
    "No explanation."
  );
}

const results = [];
let i = 0;
async function worker() {
  while (i < problems.length) {
    const idx = i++;
    const p = problems[idx];
    const started = Date.now();
    let rec = { slug: p.slug, pass1: false, pass2: false, error: null };
    try {
      const messages = [
        { role: "system", content: "You are an expert JavaScript programmer solving an Exercism exercise." },
        { role: "user", content: firstPrompt(p) },
      ];
      const reply1 = await chat(messages);
      const cand1 = extractCode(reply1);
      const g1 = gradeSolution(p, cand1, { mode: "esm" });
      rec.pass1 = g1.pass;
      rec.candidate1 = cand1;
      if (!g1.pass) {
        messages.push({ role: "assistant", content: reply1 });
        messages.push({
          role: "user",
          content:
            "Your solution fails the official test suite. Test output:\n\n```\n" +
            g1.output.slice(0, 3500) +
            "\n```\n\nFix the solution. Reply with the COMPLETE corrected contents of " +
            p.solutionFile + " in a single ```js code block. No explanation.",
        });
        const reply2 = await chat(messages);
        const cand2 = extractCode(reply2);
        const g2 = gradeSolution(p, cand2, { mode: "esm" });
        rec.pass2 = g2.pass;
        rec.candidate2 = cand2;
        rec.error = g2.pass ? null : g2.output.slice(0, 1500);
      } else {
        rec.pass2 = true;
      }
    } catch (e) { rec.error = e.message; }
    rec.durationMs = Date.now() - started;
    results[idx] = rec;
    console.log(`${rec.pass2 ? "PASS" : "FAIL"}${rec.pass1 ? "@1" : rec.pass2 ? "@2" : "  "}  ${p.slug}  (${Math.round(rec.durationMs / 1000)}s)`);
    mkdirSync(join(here, "results"), { recursive: true });
    writeFileSync(jsonOut, JSON.stringify({ arm: "baseline", model, offset, limit, results: results.filter(Boolean) }, null, 1));
  }
}
await Promise.all(Array.from({ length: concurrency }, worker));

const p1 = results.filter((r) => r.pass1).length, p2 = results.filter((r) => r.pass2).length;
console.log(`\npass@1: ${p1}/${results.length} = ${(p1 / results.length).toFixed(3)}`);
console.log(`pass@2: ${p2}/${results.length} = ${(p2 / results.length).toFixed(3)}`);
writeFileSync(jsonOut, JSON.stringify({ arm: "baseline", model, offset, limit, pass1: p1, pass2: p2, total: results.length, results }, null, 1));
console.log("wrote", jsonOut);
