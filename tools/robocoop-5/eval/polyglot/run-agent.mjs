#!/usr/bin/env node
// Arm B — the robocoop-5 SYSTEM on the aider-polyglot JS subset, two-attempt protocol:
// attempt 1: instructions + skeleton seeded as scratch files, agent builds /src/@user/solution.js
//            (one cell per export) and can self-verify with eval_js.
// attempt 2 (only on failure): WARM — attempt 1's whole conversation is resumed and the official
//            test output is pushed as the next user message. Official aider keeps the same coder
//            object across the retry, so the model sees its entire first attempt; a fresh context
//            was an arms asymmetry (the baseline arm always retried with its full reasoning in
//            context). --cold-repair restores the old fresh-context path for comparability with
//            runs recorded before 2026-08-17.
//   node run-agent.mjs [--limit N] [--offset N] [--slugs a,b] [--model m] [--json out]
//                      [--timeout ms] [--notebook path] [--headed] [--trajectories [dir]]
//                      [--cold-repair]
// --trajectories persists each attempt's full conversation (messages incl. tool_calls + tool
// results) for counterfactual attribution (see plan/robocoop-5-credit-assignment.md). Trajectory
// files hold whole conversations — keep them untracked like the rc4 transcripts.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createDriver } from "../driver.mjs";
import { criterionStamp, fileHash } from "../../../robocoop-eval/stamp.mjs";
import { gradeSolution, computeCellString } from "./grade.mjs";
import { prefixAt } from "./attribute.mjs"; // conversation prefix helper (strips the system message)

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
const coldRepair = args.includes("--cold-repair");
const notebook = flag("--notebook", "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");
const jsonOut = flag("--json", join(here, "results", `agent-${slugs ? "sel" : offset + "-" + (offset + limit)}.json`));
const trajIdx = args.indexOf("--trajectories");
const trajDir = trajIdx >= 0
  ? (args[trajIdx + 1] && !args[trajIdx + 1].startsWith("--") ? args[trajIdx + 1] : join(here, "results", "trajectories"))
  : null;

// repairMode marks HOW attempt 2 was run: "warm-resume" trajectories carry attempt 1's conversation
// as their prefix and their `seeds` are attempt 1's END file state, so attribute.mjs's fold of the
// prefix's write_file/edit_file calls re-applies writes that are already in the seeds (idempotent for
// write_file, a no-op for an edit whose old_string is gone).
function saveTrajectory(p, attempt, question, seeds, snap, grade, repairMode = null) {
  if (!trajDir) return;
  mkdirSync(trajDir, { recursive: true });
  const out = {
    slug: p.slug, attempt, model, capturedAt: new Date().toISOString(),
    question, seeds, repairMode,
    steps: snap.steps ?? 0, runError: snap.error || null, usage: snap.usage || null,
    conversation: snap.conversation || [], toolCalls: snap.toolCalls || [],
    pass: grade ? grade.pass : null,
    testOutput: grade && !grade.pass ? String(grade.output).slice(0, 4000) : null,
    candidate: grade ? grade.candidate : null,
  };
  writeFileSync(join(trajDir, `${p.slug}-${attempt}.json`), JSON.stringify(out, null, 1));
}

const SOL_PATH = "/src/@user/solution.js";
// spec-lock's executable spec (snapshotFiles keys modules as /src/<id>.js). Carried into attempt 2
// explicitly: under --cold-repair the page is fresh, and without this the spec — the artefact that
// catches convention errors — would be destroyed exactly at the repair step where most passes happen.
const SPEC_PATH = "/src/@user/spec.js";

let problems = JSON.parse(readFileSync(join(here, "problems.json"), "utf8"));
problems = slugs ? problems.filter((p) => slugs.split(",").includes(p.slug)) : problems.slice(offset, offset + limit);
console.log(`model: ${model}  problems: ${problems.length}  notebook: ${notebook}`);

// Criterion identity for this run (plan/rqgm-and-robocoop-5.md, U2): which core modules, which
// runner protocol, which problem set, which grader. Scores whose stamps differ are NOT comparable —
// see eval/ladder.mjs. Computed once, written into every snapshot of the results JSON.
const stamp = criterionStamp({
  notebookPath: notebook,
  extra: {
    runnerPath: fileURLToPath(import.meta.url),
    problemsJsonHash: fileHash(join(here, "problems.json")),
    graderHash: fileHash(join(here, "grade.mjs")),
  },
});

function exportNames(p) {
  return p.exports.length ? p.exports : p.defaultExport ? [p.defaultExport] : [];
}

// Aider's instructions_addendum (benchmark/benchmark.py), appended to the exercise instructions in
// every official run. Both arms get it verbatim, with the file list bound to our port's paths.
const ADDENDUM =
  "\n\n####\n\nUse the above instructions to modify the supplied files: /stub.js\n" +
  "Don't change the names of existing functions or classes, as they may be referenced from other " +
  "code like unit tests, etc.\n" +
  "Only use standard libraries, don't suggest installing any packages.";

function question1(p) {
  if (p.slug === "grep") {
    return (
      "Solve the exercise specified in /instructions.md (read it first; /stub.js is the original " +
      "skeleton). This exercise is a COMMAND-LINE program: the official tests run `node grep.js <flags> " +
      "<pattern> <files...>` and compare stdout/stderr. Create module @user/solution (" + SOL_PATH + ") " +
      "containing a single cell named `script` whose value is a STRING: the complete CommonJS source of " +
      "grep.js (it must read process.argv, read files with require('fs'), and console.log matching lines). " +
      "Test the core matching logic in userspace with eval_js before completing." + ADDENDUM
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
    "instructions using eval_js before completing." + ADDENDUM
  );
}

// --cold-repair only: a fresh attempt-2 context carrying the TAIL of attempt 1's assistant
// reasoning, framed as subordinate to the test output so wrong assumptions can be overturned rather
// than entrenched. Superseded by the warm path (full session resume), kept so runs recorded before
// 2026-08-17 remain reproducible.
function summarizeAttempt1(snap) {
  const msgs = Array.isArray(snap?.conversation) ? snap.conversation : [];
  const texts = msgs.filter((m) => m.role === "assistant" && m.content && String(m.content).trim())
    .map((m) => String(m.content).trim());
  if (!texts.length) return null;
  const joined = texts.join("\n");
  return joined.length > 1800 ? "…" + joined.slice(-1800) : joined;
}

// Attempt 2's starting file state must be attempt 1's ENDING file state, or the resumed conversation
// refers to files that do not exist. snapshotFiles() reports every module in the notebook — /src/<id>.js
// plus a /notebook/<id>.js export mirror — so re-seeding it wholesale would re-apply the CORE modules
// over the fresh page. Keep the agent's own surface: scratch files (non-module paths, e.g.
// /instructions.md) and its own /src/@user/* modules, which covers solution.js and the spec-lock
// module /src/@user/spec.js. (attribute.mjs reconstructs the same state a different way, by folding
// write_file/edit_file over the seeds — that is for cutting a trajectory mid-run, where no end-state
// snapshot exists.)
function warmSeeds(seeds1, snap) {
  const out = { ...seeds1 };
  for (const [path, text] of Object.entries(snap.files || {})) {
    if (typeof text !== "string") continue;
    if (path.startsWith("/notebook/")) continue;
    if (path.startsWith("/src/") && !path.startsWith("/src/@user/")) continue;
    out[path] = text;
  }
  return out;
}

function question2(p, output, attempt1Notes, hasSpec) {
  const intro = p.slug === "grep"
    ? "Your grep.js (the string value of the `script` cell in " + SOL_PATH + ") fails the official test suite."
    : "Your implementation in " + SOL_PATH + " fails the official test suite.";
  const spec = hasSpec
    ? " Your executable spec module " + SPEC_PATH + " is preserved. FIRST reconcile it against the failing " +
      "test output — the TESTS are the ground truth; where the tests reveal a different calling convention " +
      "or expected value than your spec assumed, correct the spec examples to match the tests, then fix " +
      SOL_PATH + " until the scorecard is green."
    : "";
  const notes = attempt1Notes
    ? "\n\nYour working notes from the failed attempt (context only — where they conflict with the " +
      "test output above, the TESTS are the ground truth and your prior assumption was wrong):\n" +
      attempt1Notes + "\n"
    : "";
  // The test output goes through UNCUT (official aider forwards the whole cleaned jest output,
  // code frames included); grade.mjs's 60000-char guard is the only ceiling.
  return (
    intro + " Read /instructions.md for the specification and " + SOL_PATH + " for your current code. " +
    "Failing test output:\n\n" + output + "\n" + notes + "\nDiagnose and fix " + SOL_PATH + ". Verify " +
    "the failing cases with eval_js before completing." + spec
  );
}

function gradeFromSnapshot(p, snap) {
  // A grader environment fault (e.g. missing polyglot-src) must not throw: the attempt's tokens are
  // already spent, and the trajectory still has to be persisted for attribution.
  try { return gradeFromSnapshotInner(p, snap); }
  catch (e) { return { pass: false, output: "GRADER ERROR: " + (e?.message ?? e), candidate: snap.files?.[SOL_PATH] ?? null }; }
}

function gradeFromSnapshotInner(p, snap) {
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

const driverOpts = { notebookPath: notebook, apiKey: loadKey(), model, timeoutMs, headed };
let driver = await createDriver(driverOpts);

// Hard deadline around every turn: a wedged page.evaluate (or a dead-but-open connection inside the
// browser) must never freeze the run — on breach the browser is recycled and the attempt marked infra.
const HARD_DEADLINE = timeoutMs + 180000;
async function safeRun(evalDef) {
  let timer;
  const sentinel = new Promise((r) => { timer = setTimeout(() => r({ __deadline: true }), HARD_DEADLINE); });
  const result = await Promise.race([driver.runQuestion(evalDef).catch((e) => ({ error: e.message })), sentinel]);
  clearTimeout(timer);
  if (result && result.__deadline) {
    console.log(`  ..${evalDef.id} HARD DEADLINE — recycling browser`);
    try { await driver.close(); } catch {}
    driver = await createDriver(driverOpts);
    return { error: `hard deadline: turn exceeded ${HARD_DEADLINE}ms`, steps: 0, files: {} };
  }
  return result;
}

const results = [];
try {
  for (const p of problems) {
    const started = Date.now();
    const rec = { slug: p.slug, pass1: false, pass2: false, steps1: 0, steps2: 0, error: null };
    try {
      const seeds1 = { "/instructions.md": p.instructions, "/stub.js": p.stub };
      const snap1 = await safeRun({ id: p.slug + "#1", question: question1(p), setup: { files: seeds1 } });
      rec.steps1 = snap1.steps ?? 0;
      rec.runError1 = snap1.error || null;
      rec.usage1 = snap1.usage || null; // cost axis (ladder.mjs tokens line) — without it the only
                                        // usage record is the optional trajectory sidecar.
      const g1 = gradeFromSnapshot(p, snap1);
      saveTrajectory(p, 1, question1(p), seeds1, snap1, g1);
      rec.pass1 = g1.pass;
      rec.candidate1 = g1.candidate;
      console.log(`  ..${p.slug} attempt1 ${g1.pass ? "pass" : "fail"} steps=${rec.steps1} (${Math.round((Date.now() - started) / 1000)}s)${rec.runError1 ? " runError=" + String(rec.runError1).slice(0, 60) : ""}`);
      if (g1.pass) { rec.pass2 = true; }
      else if (g1.candidate) {
        rec.testOutput1 = g1.output.slice(0, 2000);
        // Warm (default): resume attempt 1's whole conversation — driver-core injects it into
        // session.messages and sends q2 as the next user turn. Cold (--cold-repair, or when attempt 1
        // produced no conversation at all): a fresh context re-seeded with the candidate + a notes tail.
        const conv1 = Array.isArray(snap1.conversation) ? snap1.conversation : [];
        const resume = !coldRepair && conv1.length ? prefixAt(conv1, Infinity) : null;
        const spec1 = snap1.files?.[SPEC_PATH];
        const seeds2 = resume ? warmSeeds(seeds1, snap1) : { ...seeds1 };
        seeds2[SOL_PATH] = g1.candidate; // the graded bytes, in both modes
        // …and only when attempt 1 actually produced one (control arm never writes a spec).
        if (typeof spec1 === "string" && spec1.trim()) seeds2[SPEC_PATH] = spec1;
        rec.repairMode = resume ? "warm-resume" : "cold";
        rec.specCarried = SPEC_PATH in seeds2;
        const q2 = question2(p, g1.output, resume ? null : summarizeAttempt1(snap1), rec.specCarried);
        const snap2 = await safeRun({ id: p.slug + "#2", question: q2, setup: { files: seeds2 }, resume });
        rec.steps2 = snap2.steps ?? 0;
        rec.runError2 = snap2.error || null;
        rec.usage2 = snap2.usage || null;
        const g2 = gradeFromSnapshot(p, snap2);
        saveTrajectory(p, 2, q2, seeds2, snap2, g2, rec.repairMode);
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
    writeFileSync(jsonOut, JSON.stringify({ arm: "agent", model, stamp, results }, null, 1));
  }
} finally { await driver.close(); }

const p1 = results.filter((r) => r.pass1).length, p2 = results.filter((r) => r.pass2).length;
console.log(`\npass@1: ${p1}/${results.length} = ${(p1 / results.length).toFixed(3)}`);
console.log(`pass@2: ${p2}/${results.length} = ${(p2 / results.length).toFixed(3)}`);
writeFileSync(jsonOut, JSON.stringify({ arm: "agent", model, stamp, pass1: p1, pass2: p2, total: results.length, results }, null, 1));
console.log("wrote", jsonOut);
