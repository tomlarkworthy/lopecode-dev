#!/usr/bin/env node
// Merge agent shard results and sequentially re-run INFRASTRUCTURE failures (rate-limit "Failed to
// fetch", timeouts, empty turns, uncollected files) in one browser. Genuine test failures are kept.
//   node retry-agent.mjs [--in results/agent-shard*.json ...] [--out results/agent-merged.json]
//                        [--rounds N] [--model m] [--notebook path]

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createDriver } from "../driver.mjs";
import { gradeCandidate, fnNameOf } from "./grade.mjs";

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
const inFiles = [];
for (let i = 0; i < args.length; i++) if (args[i] === "--in") { let j = i + 1; while (j < args.length && !args[j].startsWith("--")) inFiles.push(args[j++]); }
if (!inFiles.length) inFiles.push(...[0, 1, 2, 3].map((s) => join(here, "results", `agent-shard${s}.json`)));
const out = flag("--out", join(here, "results", "agent-merged.json"));
const rounds = Number(flag("--rounds", 3));
const model = flag("--model", "xiaomi/mimo-v2.5-pro");
const notebook = flag("--notebook", "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");

const SEED_PATH = "/src/@user/humaneval.js";
const problems = JSON.parse(readFileSync(join(here, "humaneval-js.json"), "utf8"));
const byName = new Map(problems.map((p) => [p.name, p]));

const merged = new Map();
for (const f of inFiles) {
  const r = JSON.parse(readFileSync(f, "utf8"));
  for (const rec of r.results || []) merged.set(rec.name, rec);
}
console.log(`merged ${merged.size} results from ${inFiles.length} files  model: ${model}`);

const isInfra = (rec) =>
  !rec.pass &&
  ((rec.runError && /fetch|network|timed out|empty turn|did not initialize/i.test(String(rec.runError))) ||
    /^no file collected/.test(String(rec.error || "")) ||
    rec.steps === 0);

function stubFor(p) {
  const fn = fnNameOf(p.prompt);
  const at = p.prompt.lastIndexOf(`function ${fn}`);
  const cell = p.prompt.slice(0, at) + `const _${fn} = function ${fn}(){return(\n` + p.prompt.slice(at) +
    '  throw new Error("not implemented");\n}\n)};\n';
  return cell +
    "\nexport default function define(runtime, observer) {\n" +
    "  const main = runtime.module();\n" +
    "  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;\n" +
    `  $def("_${fn}", "${fn}", [], _${fn});\n  return main;\n}\n`;
}
function questionFor(p) {
  const fn = fnNameOf(p.prompt);
  return (
    `The module @user/humaneval (${SEED_PATH}) contains a stub function cell \`${fn}\`. The doc ` +
    `comment above it is the specification (the \`>>>\` lines are input/expected-output examples). ` +
    `Replace the stub body with a correct implementation of \`${fn}\`. Keep it a single cell named ` +
    `\`${fn}\` whose value is the function, with no dependencies. Before declaring the task complete, ` +
    `verify your implementation against every example in the doc comment by running it with eval_js, ` +
    `and fix it if any example disagrees.`
  );
}

for (let round = 1; round <= rounds; round++) {
  const todo = [...merged.values()].filter(isInfra).map((r) => byName.get(r.name)).filter(Boolean);
  if (!todo.length) break;
  console.log(`round ${round}: retrying ${todo.length} infra failures`);
  const driver = await createDriver({ notebookPath: notebook, apiKey: loadKey(), model, timeoutMs: 180000 });
  try {
    for (const p of todo) {
      const started = Date.now();
      let rec = { name: p.name, pass: false, error: null, steps: 0 };
      try {
        const snap = await driver.runQuestion({ id: p.name, question: questionFor(p), setup: { files: { [SEED_PATH]: stubFor(p) } } });
        rec.steps = snap.steps ?? 0;
        rec.usage = snap.usage;
        rec.runError = snap.error || null;
        const file = snap.files?.[SEED_PATH];
        if (typeof file !== "string") rec.error = "no file collected: " + (snap.error || "unknown");
        else {
          rec.candidate = file;
          const graded = gradeCandidate(file, p.tests, { fnName: fnNameOf(p.prompt) });
          rec.pass = graded.pass;
          rec.error = graded.error;
        }
      } catch (e) { rec.error = e.message; }
      rec.durationMs = Date.now() - started;
      merged.set(p.name, rec);
      console.log(`${rec.pass ? "PASS" : "FAIL"}  ${p.name}  steps=${rec.steps} (${Math.round(rec.durationMs / 1000)}s)` +
        (rec.pass ? "" : "  " + String(rec.error).split("\n")[0].slice(0, 90)));
      const results = [...merged.values()];
      writeFileSync(out, JSON.stringify({ arm: "agent", model, results }, null, 1));
    }
  } finally { await driver.close(); }
}

const results = [...merged.values()];
const passed = results.filter((r) => r.pass).length;
const infra = results.filter(isInfra).length;
writeFileSync(out, JSON.stringify({ arm: "agent", model, passed, total: results.length, infraRemaining: infra, results }, null, 1));
console.log(`\npass@1: ${passed}/${results.length} = ${(passed / results.length).toFixed(3)}  (infra failures remaining: ${infra})`);
console.log("wrote", out);
