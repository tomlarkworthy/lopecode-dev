#!/usr/bin/env node
// Arm B — the robocoop-5 SYSTEM on the aider-polyglot JS subset, two-attempt protocol:
// attempt 1: instructions + skeleton seeded as scratch files, agent builds /src/@user/solution.js
//            (one cell per export) and can self-verify with eval_js.
// attempt 2 (only on failure): FRESH context re-seeded with the attempt-1 solution + the official
//            jest output in the question — the file is the agent's memory, mirroring aider's protocol.
//   node run-agent.mjs [--limit N] [--offset N] [--slugs a,b] [--model m] [--json out]
//                      [--timeout ms] [--notebook path] [--headed]

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createDriver } from "../driver.mjs";
import { gradeSolution, computeCellString } from "./grade.mjs";

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
const slugs = flag("--slugs", null);
const model = flag("--model", "xiaomi/mimo-v2.5-pro"); // NEVER read OPENROUTER_MODEL — evals are mimo
const timeoutMs = Number(flag("--timeout", 300000));
const headed = args.includes("--headed");
const notebook = flag("--notebook", "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");
const jsonOut = flag("--json", join(here, "results", `agent-${slugs ? "sel" : offset + "-" + (offset + limit)}.json`));

const SOL_PATH = "/src/@user/solution.js";

let problems = JSON.parse(readFileSync(join(here, "problems.json"), "utf8"));
problems = slugs ? problems.filter((p) => slugs.split(",").includes(p.slug)) : problems.slice(offset, offset + limit);
console.log(`model: ${model}  problems: ${problems.length}  notebook: ${notebook}`);

function exportNames(p) {
  return p.exports.length ? p.exports : p.defaultExport ? [p.defaultExport] : [];
}

function question1(p) {
  if (p.slug === "grep") {
    return (
      "Solve the exercise specified in /instructions.md (read it first; /stub.js is the original " +
      "skeleton). This exercise is a COMMAND-LINE program: the official tests run `node grep.js <flags> " +
      "<pattern> <files...>` and compare stdout/stderr. Create module @user/solution (" + SOL_PATH + ") " +
      "containing a single cell named `script` whose value is a STRING: the complete CommonJS source of " +
      "grep.js (it must read process.argv, read files with require('fs'), and console.log matching lines). " +
      "Test the core matching logic in userspace with eval_js before completing."
    );
  }
  const names = exportNames(p);
  const defNote = p.defaultExport
    ? ` The test suite imports the DEFAULT export; your cell \`${p.defaultExport}\` provides it.`
    : "";
  return (
    "Create module @user/solution (" + SOL_PATH + ") solving the exercise specified in " +
    "/instructions.md — read it first. /stub.js shows the original ES-module skeleton. Provide these " +
    "exports as cells with EXACTLY these names: " + names.join(", ") + "." + defNote + " Each cell's " +
    "VALUE must be the exported function/class (cells must be synchronous — no async cells; functions " +
    "may return promises internally). Do not use export statements or imports; the cell name IS the " +
    "export, and you may add helper cells. Verify your solution against the examples in the " +
    "instructions using eval_js before completing."
  );
}

function question2(p, output) {
  const intro = p.slug === "grep"
    ? "Your grep.js (the string value of the `script` cell in " + SOL_PATH + ") fails the official test suite."
    : "Your implementation in " + SOL_PATH + " fails the official test suite.";
  return (
    intro + " Read /instructions.md for the specification and " + SOL_PATH + " for your current code. " +
    "Failing test output:\n\n" + output.slice(0, 3500) + "\n\nDiagnose and fix " + SOL_PATH + ". Verify " +
    "the failing cases with eval_js before completing."
  );
}

function gradeFromSnapshot(p, snap) {
  const file = snap.files?.[SOL_PATH];
  if (typeof file !== "string") return { pass: false, output: "no solution file collected: " + (snap.error || "unknown"), candidate: null };
  if (p.slug === "grep") {
    const script = computeCellString(file, "script");
    if (script == null) return { pass: false, output: "could not compute `script` cell string", candidate: file };
    const g = gradeSolution(p, script, { mode: "esm" });
    return { ...g, candidate: file };
  }
  const g = gradeSolution(p, file, { mode: "module" });
  return { ...g, candidate: file };
}

const isInfra = (rec, attempt) =>
  (rec[`runError${attempt}`] && /fetch|network|empty turn|did not initialize/i.test(String(rec[`runError${attempt}`])));

const driver = await createDriver({ notebookPath: notebook, apiKey: loadKey(), model, timeoutMs, headed });
const results = [];
try {
  for (const p of problems) {
    const started = Date.now();
    const rec = { slug: p.slug, pass1: false, pass2: false, steps1: 0, steps2: 0, error: null };
    try {
      const seeds1 = { "/instructions.md": p.instructions, "/stub.js": p.stub };
      const snap1 = await driver.runQuestion({ id: p.slug + "#1", question: question1(p), setup: { files: seeds1 } });
      rec.steps1 = snap1.steps ?? 0;
      rec.runError1 = snap1.error || null;
      const g1 = gradeFromSnapshot(p, snap1);
      rec.pass1 = g1.pass;
      rec.candidate1 = g1.candidate;
      if (g1.pass) { rec.pass2 = true; }
      else if (g1.candidate) {
        rec.testOutput1 = g1.output.slice(0, 2000);
        const seeds2 = { ...seeds1, [SOL_PATH]: g1.candidate };
        const snap2 = await driver.runQuestion({ id: p.slug + "#2", question: question2(p, g1.output), setup: { files: seeds2 } });
        rec.steps2 = snap2.steps ?? 0;
        rec.runError2 = snap2.error || null;
        const g2 = gradeFromSnapshot(p, snap2);
        rec.pass2 = g2.pass;
        rec.candidate2 = g2.candidate;
        rec.error = g2.pass ? null : g2.output.slice(0, 1500);
      } else {
        rec.error = g1.output;
      }
    } catch (e) { rec.error = e.message; }
    rec.durationMs = Date.now() - started;
    results.push(rec);
    console.log(
      `${rec.pass2 ? "PASS" : "FAIL"}${rec.pass1 ? "@1" : rec.pass2 ? "@2" : "  "}  ${p.slug}  ` +
      `steps=${rec.steps1}+${rec.steps2} (${Math.round(rec.durationMs / 1000)}s)` +
      (rec.pass2 ? "" : "  " + String(rec.error).split("\n")[0].slice(0, 80)),
    );
    mkdirSync(join(here, "results"), { recursive: true });
    writeFileSync(jsonOut, JSON.stringify({ arm: "agent", model, results }, null, 1));
  }
} finally { await driver.close(); }

const p1 = results.filter((r) => r.pass1).length, p2 = results.filter((r) => r.pass2).length;
console.log(`\npass@1: ${p1}/${results.length} = ${(p1 / results.length).toFixed(3)}`);
console.log(`pass@2: ${p2}/${results.length} = ${(p2 / results.length).toFixed(3)}`);
writeFileSync(jsonOut, JSON.stringify({ arm: "agent", model, pass1: p1, pass2: p2, total: results.length, results }, null, 1));
console.log("wrote", jsonOut);
