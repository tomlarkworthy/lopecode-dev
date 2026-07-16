#!/usr/bin/env node
// Arm B — the robocoop-5 SYSTEM on MultiPL-E humaneval-js: each problem is seeded as a stub module
// (/src/@user/humaneval.js), the agent implements it with its file tools and can self-verify with
// eval_js before completing. Graded OUTSIDE the notebook with the official MultiPL-E tests (grade.mjs).
//   node run-agent.mjs [--limit N] [--offset N] [--model m] [--json out.json] [--notebook path]
//                      [--timeout ms] [--headed]

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createDriver } from "../driver.mjs";
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
const timeoutMs = Number(flag("--timeout", 180000));
const headed = args.includes("--headed");
const notebook = flag(
  "--notebook",
  "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/@tomlarkworthy_robocoop-5.html",
);
const jsonOut = flag("--json", join(here, "results", `agent-${offset}-${offset + limit}.json`));

const SEED_PATH = "/src/@user/humaneval.js";

const problems = JSON.parse(readFileSync(join(here, "humaneval-js.json"), "utf8")).slice(offset, offset + limit);
console.log(`model: ${model}  problems: ${problems.length} (offset ${offset})  notebook: ${notebook}`);

const fnNameOf = (p) => fnNameOfPrompt(p.prompt);

function stubFor(p) {
  // /src files are compiled modules (export default define). Turn the MultiPL-E prompt — doc comments
  // ending in `function name(args){` — into a stub cell wired into a define(). The cell is thunk-form:
  // its VALUE is the function (Observable semantics; the runtime calls the definition with its deps).
  const fn = fnNameOf(p);
  const at = p.prompt.lastIndexOf(`function ${fn}`);
  const cell =
    p.prompt.slice(0, at) +
    `const _${fn} = function ${fn}(){return(\n` +
    p.prompt.slice(at) +
    '  throw new Error("not implemented");\n}\n)};\n';
  return (
    cell +
    "\nexport default function define(runtime, observer) {\n" +
    "  const main = runtime.module();\n" +
    "  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;\n" +
    `  $def("_${fn}", "${fn}", [], _${fn});\n  return main;\n}\n`
  );
}

function questionFor(p) {
  const fn = fnNameOf(p);
  return (
    `The module @user/humaneval (${SEED_PATH}) contains a stub function cell \`${fn}\`. The doc ` +
    `comment above it is the specification (the \`>>>\` lines are input/expected-output examples). ` +
    `Replace the stub body with a correct implementation of \`${fn}\`. Keep it a single cell named ` +
    `\`${fn}\` whose value is the function, with no dependencies. Before declaring the task complete, ` +
    `verify your implementation against every example in the doc comment by running it with eval_js, ` +
    `and fix it if any example disagrees.`
  );
}

const driver = await createDriver({ notebookPath: notebook, apiKey: loadKey(), model, timeoutMs, headed });

const results = [];
try {
  for (const p of problems) {
    const started = Date.now();
    const evalDef = { id: p.name, question: questionFor(p), setup: { files: { [SEED_PATH]: stubFor(p) } } };
    let rec = { name: p.name, pass: false, error: null, steps: 0 };
    try {
      const snap = await driver.runQuestion(evalDef);
      rec.steps = snap.steps ?? 0;
      rec.usage = snap.usage;
      rec.runError = snap.error || null;
      const file = snap.files?.[SEED_PATH];
      if (typeof file !== "string") {
        rec.error = "no file collected: " + (snap.error || "unknown");
      } else {
        rec.candidate = file;
        const graded = gradeCandidate(file, p.tests, { fnName: fnNameOf(p) });
        rec.pass = graded.pass;
        rec.error = graded.error;
      }
    } catch (e) {
      rec.error = e.message;
    }
    rec.durationMs = Date.now() - started;
    results.push(rec);
    console.log(
      `${rec.pass ? "PASS" : "FAIL"}  ${p.name}  steps=${rec.steps} (${Math.round(rec.durationMs / 1000)}s)` +
        (rec.pass ? "" : "  " + String(rec.error).split("\n")[0].slice(0, 100)),
    );
    mkdirSync(dirname(jsonOut), { recursive: true });
    writeFileSync(jsonOut, JSON.stringify({ arm: "agent", model, offset, limit, results }, null, 1));
  }
} finally {
  await driver.close();
}

const passed = results.filter((r) => r.pass).length;
console.log(`\npass@1: ${passed}/${results.length} = ${(passed / results.length).toFixed(3)}`);
writeFileSync(jsonOut, JSON.stringify({ arm: "agent", model, offset, limit, passed, total: results.length, results }, null, 1));
console.log("wrote", jsonOut);
