// System arm — robocoop-5 in the live notebook on the Terminal-Bench-Science slate (tasks.json).
// Per task: the official env image's inputs are copied out into a host directory laid out exactly as
// the container (/data, /app/data, …); that directory is mounted into the notebook at /local-disk
// the way a scientist mounts their working folder (window.showDirectoryPicker, faked headlessly by
// tools/robocoop-eval/fake-local-disk.mjs, through rc5_host.mount — the same seam the "Mount local
// folder" button uses). The instruction is sent verbatim behind an environment note (browser JS, no
// shell, no Python; task paths live under /local-disk). The agent writes its outputs to the mounted
// folder, so they land on the host disk, where the task's OFFICIAL verifier image bind-mounts them
// (grade.mjs gradeFromDisk). Binary reward, as upstream.
//
// A turn is bounded by the notebook's maxStepsPerTurn (use the bigcap bundle). If required artifacts
// are still missing on disk when a turn ends, the conversation is warm-resumed with a continuation
// prompt naming the missing files, up to --turns times; the disk persists across turns as it would
// for a scientist. The verifier is never shown to the agent — official agents do not see hidden
// tests either — and it runs once, after the last turn.
//
//   node run-agent.mjs [--slugs a,b] [--model m] [--notebook path] [--timeout ms] [--turns N]
//                      [--json out] [--trajectories [dir]] [--sandbox dir] [--headed] [--no-python]

import { writeFileSync, mkdirSync, rmSync, readFileSync } from "node:fs";
import { join, basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createDriver } from "../driver.mjs";
import { criterionStamp, fileHash } from "../../../robocoop-eval/stamp.mjs";
import { prefixAt } from "../polyglot/attribute.mjs";
import { loadTasks, ensureImages, materializeSeeds, here } from "./tasks.mjs";
import { gradeFromDisk, missingArtifactsOnDisk } from "./grade.mjs";
import { loadKey } from "./keyload.mjs";
import { pageInit, fetchPatchSource } from "./page-init.mjs";
import { warmSeeds, stockModuleIdsOf } from "./warm-seeds.mjs";

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 && !String(args[i + 1] ?? "--").startsWith("--") ? args[i + 1] : d; };

const slugs = flag("--slugs", null)?.split(",") ?? null;
const model = flag("--model", "xiaomi/mimo-v2.5-pro"); // pinned explicitly — never read OPENROUTER_MODEL
const timeoutMs = Number(flag("--timeout", 1800000));
const maxTurns = Number(flag("--turns", 3));
const headed = args.includes("--headed");
const noPython = args.includes("--no-python"); // remove run_python from the registry for this arm
const notebook = resolve(flag("--notebook", join(here, "..", "robocoop-5-eval-bigcap.html"))); // the driver builds file:// from it verbatim
const stockIds = stockModuleIdsOf(readFileSync(notebook, "utf8"));
const jsonOut = flag("--json", join(here, "results", `agent-${slugs ? "sel" : "all"}-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "")}.json`));
const runName = basename(jsonOut, ".json");
const trajIdx = args.indexOf("--trajectories");
// One directory per run (named after the results file), or trials overwrite each other's turn
// files — trials 1-3 of 2026-09-02 did exactly that, and only trial 3's trajectories survive.
const trajDir = trajIdx >= 0 ? (args[trajIdx + 1] && !args[trajIdx + 1].startsWith("--") ? args[trajIdx + 1] : join(here, "trajectories", runName)) : null;
// The mounted directories, one per task, kept after the run for autopsy (gitignored).
const sandboxDir = flag("--sandbox", join(here, "sandbox", runName));

const tasks = loadTasks({ slugs });
console.log(`model: ${model}  tasks: ${tasks.length}  notebook: ${notebook}  turns<=${maxTurns}  turn timeout ${timeoutMs}ms  sandbox: ${sandboxDir}`);

const stamp = criterionStamp({
  notebookPath: notebook,
  extra: { runnerPath: fileURLToPath(import.meta.url), tasksJsonHash: fileHash(join(here, "tasks.json")), graderHash: fileHash(join(here, "grade.mjs")) },
});

const DISK = "/local-disk";
const TURN_MIN = Math.round(timeoutMs / 60000);
function envNote(task, seedPaths) {
  return (
    "ENVIRONMENT NOTE (read before the task below). You are working inside a lopecode reactive notebook, " +
    "with the scientist's working directory mounted at " + DISK + ": every path the task names lives under " +
    "it (/data/x.csv is " + DISK + "/data/x.csv). There is no shell" + (noPython ? " and no Python" : "") +
    "; the task's `python3 …` commands cannot run here. Do the science AS A DATAFLOW in a module of yours, " +
    "not as scripts pasted into eval_js: DATA cells that parse each input once (`await localDisk.readText(path)`), " +
    "SUMMARY cells you inspect BEFORE modelling (per-item statistics, quantiles, counts — the structure of " +
    "these datasets is visible in a summary and invisible in a head -5), FEATURE/MODEL cells, a CANDIDATE " +
    "cell in the output format, a SCORE cell that applies the task's own metric (port the shipped metric or " +
    "checker logic) to the candidate — watch_variable it once and every edit streams the new score to you — " +
    "and a WRITER cell that writes the candidate to the required output path with `await localDisk.write(path, " +
    "text)` whenever it changes. DATA -> CANDIDATE -> WRITER goes in your FIRST write_file with a placeholder " +
    "candidate in the exact output format, before any modelling; confirm the file is on disk, then improve it. " +
    "A shipped metric/checker script is the score: port it line by line, not from the task text. Score the trivial " +
    "baseline (do nothing / all null class / uncorrected data) with the same cell, on data you did not tune on, and " +
    "ship the baseline if your candidate does not beat it there. Iterate by " +
    "editing ONE cell with edit_file; " +
    "only what depends on it recomputes. Never overwrite a checkpoint with a candidate you have not measured to " +
    "be better. A module imports the disk with these two lines inside define():\n" +
    "  main.define(\"module @tomlarkworthy/local-disk\", async () => runtime.module((await import(\"@tomlarkworthy/local-disk\")).default));\n" +
    "  main.define(\"localDisk\", [\"module @tomlarkworthy/local-disk\", \"@variable\"], (_, v) => v.import(\"localDisk\", _));\n" +
    "In eval_js `localDisk` is in scope with no import. fetch() and FileAttachment do NOT reach " + DISK + "; " +
    "read_file truncates long lines (use it for code and small files, cells for data). Inputs on disk:\n" +
    seedPaths.map((p) => "  - " + DISK + p).join("\n") + "\n" +
    "REQUIRED OUTPUTS, exact paths under " + DISK + ":\n" +
    task.artifacts.map((a) => "  - " + DISK + a).join("\n") + "\n" +
    "TIME: this turn has a " + TURN_MIN + "-minute wall clock and a step limit; either cuts you off without " +
    "warning, and what is on disk at that moment is graded by the task's official verifier (which you cannot " +
    "see or run). You will get time-check messages. If you are cut off you continue in a follow-up turn: the " +
    "disk and the modules you wrote persist (their cells recompute on reload). write_file creates parent directories, so never create marker files (.keep, .placeholder) in an output directory, and never write reports, summaries or notes there either: the grader rejects an output directory holding anything but the required outputs (arm r lost a task to .keep, arm s to summary.md and COMPLETION_REPORT.md). " +
    "NULL MODEL: when the task classifies, vets or detects items, most items are the null class (constant, no companion, no event) and an item leaves it only when its own signal beats the noise its uncertainty columns imply (a false-alarm probability, a chi-square against a constant); say how many items you left in the null class and which test moved the rest. CALIBRATE THE TEST ON A NULL YOU BUILD: simulate items from the uncertainty columns (or shuffle each item in time), run your detector on them, and set the threshold where it flags under 1 % of those; a threshold you did not calibrate this way flags everything (arms that skipped this labelled 75-97 of 100 constant stars as variable). " +
    "SAMPLES: when a deliverable is a set of posterior samples, the grader compares whole distributions; a point estimate repeated N times, draws from the prior, or an unmixed chain fail even with the right median (three arms did each of these). Run the sampler until the chain mixes and check its spread against the data's own uncertainties before writing it. " +
    "STOPPING RULE: task_complete is " +
    "accepted only with a GATES list in its summary — every number the grader computes for this task, and next to " +
    "each the number you MEASURED for it and on what data. Reference samples, uncertainty columns, validation splits " +
    "and shipped checkers exist to produce those numbers; use them or record why you cannot. A diagnostic you computed " +
    "that contradicts your answer decides: fix it or ship the simpler candidate it accepts." +
    "\n\n---\n\n"
  );
}

// Timed nudges into the running turn (driver-core evalDef.steers → session.steer).
function steers() {
  const m = (min) => min * 60000;
  return [
    { atMs: m(TURN_MIN - 12), text: `TIME CHECK: 12 minutes of this turn's ${TURN_MIN} remain. If any required output is not on disk yet, write your current best version to its exact path NOW, then keep improving.` },
    { atMs: m(TURN_MIN - 4), text: "TIME CHECK: 4 minutes remain. Make sure every required output on disk is your best measured version, then call task_complete if the work is final." },
  ];
}

// A turn that was cut by the timeout or the step limit with every artifact present is not a finished
// turn: an official agent stops when it says it is done. Run 2026-09-02b graded variable-star-vetting
// and rv-astrometry mid-work (rv's "artifact" was a directory holding one helper .js).
function continuation(missing, snap) {
  const state = "\nThe mounted folder, your earlier files and your modules are still in place.";
  if (missing.length) return (
    "Continue the task. These required output files do not exist on disk yet:\n" +
    missing.map((a) => "  - " + DISK + a).join("\n") + state +
    " Finish the outputs, then call task_complete."
  );
  const why = snap?.finishReason === "max_steps" ? "hit the step limit" : "was interrupted (time limit)";
  // Arm r (2026-09-04): every resumed turn ended in 2-5 min with 2-17 steps and a task_complete, because
  // this text invited it. A cut-off turn never produced a GATES list, so the resumed turn's job is that.
  return (
    "Your previous turn " + why + " before you called task_complete; this is a fresh full turn, not a wrap-up." + state +
    " The outputs on disk are a candidate, not the answer: before task_complete you must produce the GATES list" +
    " (every number the grader computes, next to the number you MEASURED for it), and a gate you have not measured" +
    " is measured now on a proxy you build from the data you have (a held-out split, the task's tolerance on a" +
    " reference sample, the shipped checker). Spend this turn on the thinnest gate, then call task_complete."
  );
}

// --reasoning off  → OpenRouter `reasoning: {enabled:false}` on every call (mimo's only real dial)
// --max-tokens N   → per-step completion cap (engine default 32000; a runaway plan costs N tokens of silence)
const reasoning = flag("--reasoning", null);
const maxTokens = flag("--max-tokens", null);
const requestPatch = Object.assign({},
  reasoning === "off" ? { reasoning: { enabled: false } } : reasoning === "on" ? { reasoning: { enabled: true } } : {},
  maxTokens ? { max_tokens: Number(maxTokens) } : {});
const INIT = pageInit({ removeTools: noPython ? ["run_python"] : [] });
const INIT_SCRIPT = Object.keys(requestPatch).length ? fetchPatchSource(requestPatch) : null;

// One repeated runtime error (300x "error building module dependancy map" in k's mri turn 1) must not
// crowd out the retry line the capture exists for: collapse by text, keep first/last time and a count.
function compactConsole(events) {
  if (!Array.isArray(events)) return null;
  const by = new Map();
  for (const e of events) {
    const key = e.type + " " + String(e.text).slice(0, 300);
    const r = by.get(key) || { type: e.type, text: String(e.text).slice(0, 300), n: 0, first: e.t ?? null, last: e.t ?? null };
    r.n++; r.last = e.t ?? r.last; by.set(key, r);
  }
  return [...by.values()].slice(-100);
}
function saveTrajectory(task, turn, question, seedPaths, snap, grade) {
  if (!trajDir) return;
  mkdirSync(trajDir, { recursive: true });
  const out = { slug: task.slug, turn, model, capturedAt: new Date().toISOString(), question, seedPaths, conversation: snap.conversation ?? null, toolCalls: snap.toolCalls ?? null, toolTimes: snap.toolTimes ?? null, finishReason: snap.finishReason ?? null, usage: snap.usage ?? null, steps: snap.steps ?? 0, error: snap.error ?? null, artifacts: grade?.artifacts ?? null, pass: grade?.pass ?? null, verifierTail: grade ? String(grade.output).slice(-3000) : null, console: compactConsole(snap.console), srcFiles: Object.keys(warmSeeds({}, snap, stockIds)).filter((k) => k.startsWith("/src/")), filesError: snap.filesError ?? null, seedFailures: snap.seedFailures ?? null };
  writeFileSync(join(trajDir, `${task.slug}-${turn}.json`), JSON.stringify(out, null, 1));
}

const driverOpts = { notebookPath: notebook, apiKey: loadKey(), model, timeoutMs, headed };
let driver = await createDriver(driverOpts);
// 6 min past the turn: the driver's wedge recovery (turn + 60 s, then terminateExecution and a snapshot
// evaluate) needs room — arm q (2026-09-04) recycled the browser while it was running and lost 5/5.
const HARD_DEADLINE = timeoutMs + 360000;
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
  for (const task of tasks) {
    const started = Date.now();
    const rec = { slug: task.slug, pass: false, turns: 0, steps: [], usage: [], runErrors: [], error: null };
    try {
      ensureImages(task);
      // A fresh working directory per task and run — the scientist's folder, laid out as the container.
      const root = join(sandboxDir, task.slug);
      rmSync(root, { recursive: true, force: true });
      const seeded = materializeSeeds(task, root);
      if (seeded.missing.length) console.log(`  ..${task.slug} seed roots NOT found in image: ${seeded.missing.join(", ")}`);
      rec.sandbox = root;
      rec.inputs = seeded.paths.length;
      const localDisk = { root, name: task.slug };
      let seeds = {};
      let question = envNote(task, seeded.paths) + task.instruction;
      let resume = null, snap = null;
      for (let turn = 1; turn <= maxTurns; turn++) {
        const turnStarted = Date.now();
        snap = await safeRun({ id: `${task.slug}#${turn}`, question, setup: { files: seeds, localDisk, init: INIT, initScript: INIT_SCRIPT }, steers: steers(), resume });
        rec.turns = turn;
        // When the turn object came back (finishReason set) driver-core reports this turn's own steps;
        // only its fallback (a timed-out turn) counts every assistant message including a resumed
        // prefix, so subtract the prefix in that case alone. Run d reported mri turn 2 as 0 steps.
        const resumedSteps = resume && snap.finishReason == null ? resume.filter((m) => m.role === "assistant").length : 0;
        rec.steps.push(Math.max(0, (snap.steps ?? 0) - resumedSteps));
        rec.usage.push(snap.usage ?? null);
        rec.runErrors.push(snap.error || null);
        const missing = missingArtifactsOnDisk(task, root);
        const toolMs = Array.isArray(snap.toolTimes) ? snap.toolTimes.reduce((n, t) => n + (t.ms || 0), 0) : null;
        rec.finish = rec.finish || []; rec.finish.push(snap.finishReason ?? null);
        rec.toolMs = rec.toolMs || []; rec.toolMs.push(toolMs);
        console.log(`  ..${task.slug} turn${turn} steps=${rec.steps.at(-1)} missing=${missing.length}/${task.artifacts.length} finish=${snap.finishReason ?? "none"} toolMs=${toolMs ?? "?"} (${Math.round((Date.now() - turnStarted) / 1000)}s, ${Math.round((Date.now() - started) / 1000)}s total)${snap.error ? " runError=" + String(snap.error).slice(0, 80) : ""}`);
        saveTrajectory(task, turn, question, seeded.paths, snap, null);
        const done = !missing.length && snap.finishReason === "completed";
        if (done || !Array.isArray(snap.conversation) || !snap.conversation.length) break;
        resume = prefixAt(snap.conversation, Infinity);
        seeds = warmSeeds(seeds, snap, stockIds);
        question = continuation(missing, snap);
      }
      const g = gradeFromDisk(task, root, { error: snap?.error });
      rec.pass = g.pass;
      rec.reward = g.reward;
      rec.missing = g.missing;
      rec.ctrf = g.ctrf ?? null;
      rec.error = g.pass ? null : String(g.output).split("\n").filter((l) => /FAIL|Error|assert|missing/i.test(l)).slice(-8).join("\n").slice(0, 1500);
      saveTrajectory(task, rec.turns, question, seeded.paths, snap ?? {}, g);
    } catch (e) { rec.error = e.message; }
    rec.durationMs = Date.now() - started;
    results.push(rec);
    console.log(`${rec.pass ? "PASS" : "FAIL"}  ${task.slug}  turns=${rec.turns} steps=${rec.steps.join("+")} (${Math.round(rec.durationMs / 1000)}s)${rec.pass ? "" : "  " + String(rec.error).split("\n")[0].slice(0, 100)}`);
    mkdirSync(join(here, "results"), { recursive: true });
    writeFileSync(jsonOut, JSON.stringify({ arm: "agent", benchmark: "terminal-bench-science", model, stamp, results }, null, 1));
  }
} finally { await driver.close(); }

const passed = results.filter((r) => r.pass).length;
console.log(`\npass: ${passed}/${results.length} = ${(passed / Math.max(1, results.length)).toFixed(3)}`);
writeFileSync(jsonOut, JSON.stringify({ arm: "agent", benchmark: "terminal-bench-science", model, stamp, passed, total: results.length, results }, null, 1));
console.log("wrote", jsonOut);
