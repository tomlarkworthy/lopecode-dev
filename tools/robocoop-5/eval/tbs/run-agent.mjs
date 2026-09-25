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
//                      [--max-steps N] [--time-floor MS] [--walk]
//                      [--pm model] [--pm-grace S] [--pm-dry trajDir turn]
//                      [--cache-from dir] [--resume snapDir] [--keep-turns N]
//
// WALK MODE (--walk, needs --trajectories): the run stops after EVERY turn, writes a review dump
// (walk-<slug>-<turn>.md + src-<turn>/) into the trajectory directory and waits for the reviewer to
// drop note-<turn>.txt there. The note becomes the next turn's question ("Continue where you left
// off." + REVIEWER NOTE); a note whose first line is STOP ends the run and grades it. Nothing else
// ends the loop — not artifacts on disk, not task_complete — so a human can step the agent and the
// cross_check verifier one turn at a time and see what entered the verified set.
//
// Every walk turn also writes a SNAPSHOT, <trajDir>/snap-<turn>/: src/ (the same tree as src-<turn>/),
// cache/ (the task root's materialised results), ledger.json (what LEDGER_COLLECT read off the page:
// cross checks, attestations, fetches, core table) question.txt, and note.txt once the reviewer's note
// is in. `--resume <snapDir>` starts a fresh run from one: seeds, cache, ledger and first note, with
// turn numbering restarting at 1. df17: --cache-from <dir> alone copies <dir>/cache/ into the task
// root after the per-task wipe, so a run can inherit another's materialised results without its code.

import { writeFileSync, mkdirSync, rmSync, readFileSync, existsSync, readdirSync, statSync, copyFileSync } from "node:fs";
import { join, basename, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createDriver } from "../driver.mjs";
import { criterionStamp, fileHash } from "../../../robocoop-eval/stamp.mjs";
import { prefixAt } from "../polyglot/attribute.mjs";
import { loadTasks, ensureImages, materializeSeeds, copyTree, readSeedDir, moduleSeeds, here } from "./tasks.mjs";
import { gradeFromDisk, missingArtifactsOnDisk } from "./grade.mjs";
import { loadKey } from "./keyload.mjs";
import { pageInit, fetchPatchSource } from "./page-init.mjs";
import { warmSeeds, stockModuleIdsOf } from "./warm-seeds.mjs";
import { LEDGER_COLLECT, ledgerRestoreSource } from "./ledger.mjs";

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 && !String(args[i + 1] ?? "--").startsWith("--") ? args[i + 1] : d; };

const slugs = flag("--slugs", null)?.split(",") ?? null;
const model = flag("--model", "xiaomi/mimo-v2.5-pro"); // pinned explicitly — never read OPENROUTER_MODEL
const timeoutMs = Number(flag("--timeout", 1800000));
const maxTurns = Number(flag("--turns", 3));
const headed = args.includes("--headed");
const noPython = args.includes("--no-python"); // remove run_python from the registry for this arm
const walk = args.includes("--walk");
// --pm <model>: an LLM project manager writes note-<turn>.txt when the human has not, after
// --pm-grace seconds. --pm-dry <trajDir> <turn>: build the same request from a finished walk and
// print the reply next to the human note, no browser.
const pmModel = flag("--pm", null);
const pmGraceMs = Number(flag("--pm-grace", 0)) * 1000;
let pmCost = 0; // declared before the --pm-dry block below, which calls pmNote at import time
const pmDryIdx = args.indexOf("--pm-dry");
if (pmDryIdx >= 0) {
  if (!pmModel) { console.error("--pm-dry needs --pm <model>"); process.exit(2); }
  const dir = args[pmDryIdx + 1], dryTurn = Number(args[pmDryIdx + 2]);
  const slug = pmSlugOf(dir, dryTurn);
  if (!slug) { console.error(`--pm-dry: no walk-*-${dryTurn}.md in ${dir}`); process.exit(2); }
  console.log(await pmNote(dir, slug, dryTurn));
  const humanNote = join(dir, `note-${dryTurn}.txt`);
  if (existsSync(humanNote)) console.log("\n---- human note ----\n" + readFileSync(humanNote, "utf8").trim());
  process.exit(0);
}
// --seed-dir <dir>: initial /src seeds read from <dir>/src/**, so a reviewer can start a walk from a
// hand-edited module (a walk on 2026-09-06 froze at boot re-seeding a heavy downstream cell).
// --note <file>: appended to the FIRST question as REVIEWER NOTE. In walk mode, a directory
// <trajDir>/seed-<turn>/ dropped next to note-<turn>.txt overlays the seeds for the next turn.
// --resume <snapDir>: a snap-<turn>/ written by an earlier walk stands in for --seed-dir AND
// --cache-from AND the collected ledger AND the first reviewer note, so a walk continues from where
// it stopped in a NEW trajectory whose turns start again at 1.
const resumeDir = flag("--resume", null);
function resumeNotePath(dir) {
  if (!dir) return null;
  const d = dir.replace(/\/+$/, "");
  if (existsSync(join(d, "note.txt"))) return join(d, "note.txt");
  const m = /snap-(\d+)$/.exec(d);            // an older snapshot: the note lives beside it
  const sib = m ? join(dirname(d), `note-${m[1]}.txt`) : null;
  return sib && existsSync(sib) ? sib : null;
}
const seedDir = flag("--seed-dir", null) ?? resumeDir;
const cacheFrom = flag("--cache-from", null) ?? resumeDir;
const firstNote = flag("--note", null) ?? resumeNotePath(resumeDir);
// df32: the CORE cells the reviewer's note re-opened — the page refuses an edit_file/write_file that changes any
// other core cell. Only backticked identifiers on the note's `May edit:` line count; no such line, or `none`,
// freezes the whole core. null (no note yet) leaves the global unset and the guard off.
function mayEditFromNote(note) {
  if (note == null) return null;
  const names = new Set();
  const add = (text) => { for (const m of text.matchAll(/`([^`]+)`/g))
    for (const t of m[1].split(/[\s,;]+/)) { const n = t.replace(/[()'"]/g, ""); if (/^[A-Za-z_$][\w$]*$/.test(n)) names.add(n); } };
  const line = String(note).split("\n").find((l) => /^\s*may edit\s*:/i.test(l));
  if (line) add(line.replace(/^\s*may edit\s*:/i, "").split(/\bmay not\b/i)[0]);
  // Walk ag note-11 (2026-09-23 22:59): "Re-open and fix `lomb_scargle`" with no May-edit line at all — the intent is
  // unambiguous, so a `re-open`/`reopen` phrase re-opens the backticked cells that follow it on that line.
  for (const l of String(note).split("\n")) { const m = /\bre-?open(?:ed|s|ing)?\b(.*)$/i.exec(l); if (m) add(m[1].split(/\bmay not\b/i)[0].slice(0, 200)); }
  return [...names];
}
let resumeCollected = null;
if (resumeDir) {
  const lp = join(resumeDir, "ledger.json");
  if (existsSync(lp)) {
    try { resumeCollected = JSON.parse(readFileSync(lp, "utf8")); }
    catch (e) { console.error(`--resume: ${lp} is not readable JSON: ${e.message}`); process.exit(2); }
  } else console.log(`  ..--resume: no ledger.json in ${resumeDir} — starting with an empty ledger`);
}
// --keep-turns N: in walk mode, carry only the last N turns of conversation into the next turn (see
// trimWalkResume). Unset = unlimited, the behaviour every earlier walk ran with.
const keepTurns = (() => { const v = flag("--keep-turns", null); return v == null ? Infinity : Math.max(1, Number(v)); })();
if (!Number.isFinite(keepTurns) && flag("--keep-turns", null) != null) { console.error("--keep-turns needs a number"); process.exit(2); }
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

if (walk && !trajDir) { console.error("--walk needs --trajectories (the dump and the reviewer note live in the trajectory dir)"); process.exit(2); }
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
    "COMPUTE: the notebook runs on the page's single thread. A cell that runs longer than ~20 s freezes the page, " +
    "and a page frozen for 300 s is killed: the turn is lost and the module that froze it is rolled back. So: develop on " +
    "3 items before 100; a loop over items lives in an `async` cell that awaits between items " +
    "(`await new Promise(r => setTimeout(r))`) and writes its result to " + DISK + "/cache/<cell>.json so a reload reads " +
    "instead of recomputing (read the cache first, compute only on a miss); downstream cells read the cached cell. " +
    "A periodogram or fit over 100 items is minutes of compute — chunk it, cache it, never put it in a synchronous cell. " +
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
// --max-steps / --time-floor are read by the BUNDLE (df13+): maxStepsPerTurn is fixed when the
// `session` cell evaluates at boot, so the global has to be there before the notebook loads —
// initScript (addInitScript), not init. __rc5MinTurnMs is read inside completeGuard at call time,
// but it rides along in the same pre-boot script. 0 disables the floor veto.
const maxSteps = flag("--max-steps", null);
const timeFloor = flag("--time-floor", null);
const globalsScript = [
  maxSteps != null ? `globalThis.__rc5MaxSteps = ${Number(maxSteps)};` : null,
  timeFloor != null ? `globalThis.__rc5MinTurnMs = ${Number(timeFloor)};` : null,
  walk ? "globalThis.__rc5WalkMode = true;" : null, // df15+: completeGuard rejects task_complete outright
].filter(Boolean).join("\n");
const requestPatch = Object.assign({},
  reasoning === "off" ? { reasoning: { enabled: false } } : reasoning === "on" ? { reasoning: { enabled: true } } : {},
  maxTokens ? { max_tokens: Number(maxTokens) } : {});
const INIT = pageInit({ removeTools: noPython ? ["run_python"] : [] });
const INIT_SCRIPT = [globalsScript, Object.keys(requestPatch).length || model.startsWith("google/") ? fetchPatchSource(requestPatch) : ""].filter(Boolean).join("\n") || null; // google/: the trailing-nudge rewrite in fetchPatchSource must be installed even with an empty patch (walk w turn 3, 2026-09-07: fix present, patch not installed)

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
function copyTreeExcept(srcDir, destDir, skip) {
  if (!srcDir || !existsSync(srcDir)) return 0;
  let n = 0;
  for (const e of readdirSync(srcDir).sort()) {
    const s = join(srcDir, e), d = join(destDir, e);
    if (skip.includes(s)) continue;
    const st = statSync(s, { throwIfNoEntry: false });
    if (!st) continue;
    if (st.isDirectory()) n += copyTreeExcept(s, d, skip);
    else if (st.isFile()) { mkdirSync(destDir, { recursive: true }); copyFileSync(s, d); n++; }
  }
  return n;
}
function saveTrajectory(task, turn, question, seedPaths, snap, grade) {
  if (!trajDir) return;
  mkdirSync(trajDir, { recursive: true });
  const out = { slug: task.slug, turn, model, capturedAt: new Date().toISOString(), question, seedPaths, conversation: snap.conversation ?? null, toolCalls: snap.toolCalls ?? null, toolTimes: snap.toolTimes ?? null, finishReason: snap.finishReason ?? null, usage: snap.usage ?? null, steps: snap.steps ?? 0, error: snap.error ?? null, artifacts: grade?.artifacts ?? null, pass: grade?.pass ?? null, verifierTail: grade ? String(grade.output).slice(-3000) : null, console: compactConsole(snap.console), srcFiles: Object.keys(warmSeeds({}, snap, stockIds)).filter((k) => k.startsWith("/src/")), filesError: snap.filesError ?? null, seedFailures: snap.seedFailures ?? null, ledgerRestored: snap.collected?.restored ?? null, ledgerEntries: snap.collected?.entries ?? null, attestRestored: snap.collected?.attestRestored ?? null, attestEntries: snap.collected?.attest ?? null, coreStatus: snap.collected?.core ?? null, fetches: snap.collected?.fetches ?? null };
  writeFileSync(join(trajDir, `${task.slug}-${turn}.json`), JSON.stringify(out, null, 1));
}

// ---------------------------------------------------------------- walk mode
// One turn, one dump, one reviewer note. The dump is everything a human needs to decide whether the
// turn's cross-checks belong in the verified set: what the agent said, what it called, the whole
// ledger with both upstream sets, and the /src tree as it stands.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cell = (x, n) => String(x ?? "").replace(/\s+/g, " ").slice(0, n).replace(/\|/g, "\\|");

// A resumed turn's snapshot carries the WHOLE conversation (driver-core injects the prefix into
// session.messages), so cut it at the user message carrying this turn's question.
function turnSlice(conv, question) {
  if (!Array.isArray(conv) || !conv.length) return [];
  const head = String(question || "").slice(0, 120);
  if (head) {
    for (let i = conv.length - 1; i >= 0; i--) {
      const m = conv[i];
      if (m.role === "user" && typeof m.content === "string" && m.content.includes(head)) return conv.slice(i);
    }
  }
  return conv;
}

function toolRows(slice, snap) {
  const results = new Map();
  for (const m of slice) if (m.role === "tool" && m.tool_call_id) results.set(m.tool_call_id, String(m.content ?? ""));
  const rows = [];
  let step = 0;
  for (const m of slice) {
    if (m.role !== "assistant") continue;
    step++;
    if (!Array.isArray(m.tool_calls)) continue;
    for (const tc of m.tool_calls) {
      const raw = tc?.function?.arguments;
      rows.push({
        step,
        name: tc?.function?.name ?? tc?.name ?? "?",
        args: typeof raw === "string" ? raw : JSON.stringify(raw ?? {}),
        result: results.get(tc?.id) ?? "",
      });
    }
  }
  // Fallback for a snapshot with no usable conversation (a wedged turn): the flat toolCalls record.
  if (!rows.length && Array.isArray(snap?.toolCalls))
    for (const tc of snap.toolCalls) rows.push({ step: "?", name: tc.name, args: JSON.stringify(tc.arguments ?? {}), result: "" });
  return rows;
}

function ledgerBlock(collected, turn, restoredFrom) {
  const out = [];
  const n = collected?.restored ?? 0;
  if (n) out.push(`ledger restored from turn ${restoredFrom ?? turn - 1} (${n} entries) — driver-core opens a fresh\nbrowser context per turn, so the entries were re-seeded into __rc5CrossChecks after the /src files\nwere re-applied, with their apply counters rewritten to this page's.\n`);
  else if (turn > 1) out.push("NOTE: driver-core opens a FRESH browser context per turn and the previous turn's ledger was\nEMPTY, so nothing was restored — only checks the agent ran in THIS turn appear below.\n");
  if (!collected) return out.join("\n") + "(no ledger collected: setup.collect returned nothing)";
  const cur = collected.applyCount || {};
  out.push(`__rc5ApplyCount (current): ${JSON.stringify(cur)}`);
  out.push(`__rc5MinItems=${collected.minItems ?? "(default 20)"}  __rc5MaxSteps=${collected.maxSteps ?? "(default 120)"}  __rc5MinTurnMs=${collected.minTurnMs ?? "(default 1200000)"}`);
  const es = collected.entries || [];
  out.push(`entries: ${es.length}\n`);
  for (const e of es) {
    const counts = e.counts || (e.module ? { [e.module]: e.applyCount } : {});
    const stale = Object.keys(counts).some((k) => (cur[k] || 0) !== (counts[k] || 0));
    const sa = (e.sides && e.sides.a) || {}, sb = (e.sides && e.sides.b) || {};
    out.push(`### ${e.name}   [module ${e.module}]  a=${e.a}  b=${e.b}`);
    out.push(`independent=${e.independent}  agree=${e.agree}  items=${e.items}  fraction=${e.fraction}  minFraction=${e.minFraction}`);
    out.push(`sides: a{upstreamOfDeliverable=${sa.upstreamOfDeliverable}, downstreamOfDeliverable=${sa.downstreamOfDeliverable}}  b{upstreamOfDeliverable=${sb.upstreamOfDeliverable}, downstreamOfDeliverable=${sb.downstreamOfDeliverable}}`);
    out.push(`applyCount registered=${JSON.stringify(counts)}  current=${JSON.stringify(cur)}  -> ${stale ? "STALE" : "fresh"}`);
    out.push(`shared: ${(e.shared || []).join(", ") || "(none)"}`);
    out.push(`dataShared (allowed as data): ${(e.dataShared || []).join(", ") || "(none)"}`);
    out.push(`offending: ${(e.offending || []).join(", ") || "(none)"}`);
    out.push(`upA (${(e.upA || []).length}): ${(e.upA || []).join(", ") || "(none)"}`);
    out.push(`upB (${(e.upB || []).length}): ${(e.upB || []).join(", ") || "(none)"}`);
    out.push(`verdict: ${e.verdictLine ?? ""}`);
    out.push("");
  }
  return out.join("\n");
}

// df16: the attest ledger and the verified core, both collected off the live page by LEDGER_COLLECT.
// The core table is what the reviewer (and the PM) should read instead of the agent's prose: it says
// which cells are assumed (given), which are inferred-correct (core) and what each other cell needs.
function attestBlock(collected) {
  const rows = collected?.attest || [];
  const n = collected?.attestRestored ?? 0;
  const out = [];
  if (n) out.push(`attest ledger restored from the previous turn (${n} cells); freshness is re-derived from each\ncell's current definition hash, so a module re-applied unchanged stays fresh and an edit does not.\n`);
  if (!rows.length) return out.join("\n") + "(no attestation recorded)";
  out.push(`cells with attestations: ${rows.length}\n`);
  for (const r of rows) {
    out.push(`### ${r.cell}`);
    for (const e of r.list || [])
      out.push(`- ${e.kind} by ${e.evidence} — ${e.rows} row(s), cellHash=${e.cellHash}, evidenceHash=${e.evidenceHash ?? "(n/a)"}, at ${new Date(e.at || 0).toISOString()}`);
    out.push("");
  }
  return out.join("\n");
}

function coreBlock(collected) {
  const core = collected?.core;
  if (!core) return "(no core table: the bundle predates df16, or __rc5CoreAll threw)";
  if (core.__error) return "core table failed on the page: " + core.__error;
  const ids = Object.keys(core);
  if (!ids.length) return "(no module with a deliverable or an attestation)";
  const out = [];
  for (const id of ids) {
    const st = core[id];
    out.push(`### ${id}`);
    out.push(`GIVEN (${st.given.length}): ${st.given.join(", ") || "(none)"}`);
    out.push(`CORE (${st.core.length}): ${st.core.join(", ") || "(none)"}`);
    const dels = st.deliverables || [];
    const names = Object.keys(st.blocked || {}).filter((n) => !dels.includes(n)).sort(); // the writer is never attested
    out.push(`BLOCKED (${names.length}):`);
    for (const n of names) out.push(`  ${n} → ${st.blocked[n]}`);
    out.push(`DELIVERABLE(S): ${dels.join(", ") || "(none)"}${dels.length ? " — the writer cell is never attested; its verification is its upstream" : ""}`);
    if (st.pathKinds) out.push(`PATH EVIDENCE KINDS: ${Object.entries(st.pathKinds).map(([k, n]) => `${k === "null" ? "nullcheck" : k} ×${n}`).join(", ") || "(none)"}`);
    out.push(`task_complete blocked on: ${(st.blocking || []).join("; ") || (dels.length ? "(nothing — the core rule is satisfied)" : "no deliverable cell — nothing in the module writes under /local-disk, so whatever is on disk was not produced by a cell and has no verified path")}`);
    out.push("");
  }
  return out.join("\n");
}

// df17: every fetch_text call the agent made, in order — what it read before it built the algorithm.
function fetchBlock(collected) {
  const rows = collected?.fetches || [];
  if (!rows.length) return "(no fetch_text call recorded)";
  return [`fetch_text calls: ${rows.length}`, ""]
    .concat(rows.map((f) => `- ${new Date(f.at || 0).toISOString()}  ${f.via || "?"}  ${f.chars ?? "?"} chars`
      + `${f.ofChars && f.ofChars > f.chars ? ` of ${f.ofChars}` : ""}  ${f.finalUrl || f.url}`))
    .join("\n");
}

// ------------------------------------------------------- the PM reviewer (--pm)
function pmSlugOf(dir, turn) {
  const f = (existsSync(dir) ? readdirSync(dir) : []).find((n) => new RegExp(`^walk-.+-${turn}\\.md$`).test(n));
  return f ? f.slice(5, -(String(turn).length + 4)) : null;
}
function pmFinalText(mdPath) {
  if (!existsSync(mdPath)) return "";
  const m = /## assistant final text\n+```\n([\s\S]*?)\n```/.exec(readFileSync(mdPath, "utf8"));
  return m ? m[1].trim() : "";
}
// The same request in both modes: earlier notes, earlier turns' final texts, this turn's whole dump.
function pmRequest(dir, slug, turn) {
  const parts = [];
  for (let k = 1; k < turn; k++) {
    const p = join(dir, `note-${k}.txt`);
    if (existsSync(p)) parts.push(`## note ${k}\n\n${readFileSync(p, "utf8").trim()}`);
  }
  for (let k = 1; k < turn; k++) {
    const t = pmFinalText(join(dir, `walk-${slug}-${k}.md`));
    if (t) parts.push(`## turn ${k} final text\n\n${t.slice(0, 1500)}`);
  }
  parts.push(`## turn budget\n\nturn ${turn} of ${maxTurns} is done; ${Math.max(0, maxTurns - turn)} remain.`);
  parts.push(`## turn ${turn} dump\n\n${readFileSync(join(dir, `walk-${slug}-${turn}.md`), "utf8").slice(0, 40000)}`);
  const taskPath = join(dir, "task.txt"); // written at walk start; the PM never saw the task before 2026-09-07 (it picked EW/EA/DSCT off the output file)
  if (existsSync(taskPath)) parts.unshift(`## task (what the agent was given: the classes it names are the shapes the sweep must plant and the labels the class rule is checked against)\n\n${readFileSync(taskPath, "utf8").slice(0, 6000)}`);
  return [
    { role: "system", content: readFileSync(join(here, "pm-prompt.md"), "utf8") },
    { role: "user", content: parts.join("\n\n") },
  ];
}

// The core table from a resumed snapshot, inlined into the first question. Walk g turn 1 (2026-09-06)
// spent all 11 steps re-reading the 2000-line module and calling core_status — the snapshot already knew.
function resumeStateText(collected) {
  const core = collected?.core;
  if (!core || typeof core !== "object") return "";
  const lines = [];
  for (const [mod, c] of Object.entries(core)) {
    if (!c || typeof c !== "object") continue;
    const blocked = Object.entries(c.blocked || {}).filter(([n]) => !(c.deliverables || []).includes(n)).map(([n, why]) => `${n} → ${why}`);
    lines.push(`${mod}: CORE (${(c.core || []).length}): ${(c.core || []).join(", ") || "none"}`
      + ` | GIVEN (${(c.given || []).length}): ${(c.given || []).join(", ") || "none"}`
      + (c.knowledge?.length ? ` | KNOWLEDGE: ${c.knowledge.join(", ")}` : "")
      + ` | BLOCKED (${blocked.length}): ${blocked.join("; ") || "none"}`
      + ` | DELIVERABLE: ${(c.deliverables || []).join(", ") || "none"}`);
  }
  return lines.length ? "\n\nRESUMED STATE (the verified core as the snapshot left it — start from it, do not spend the turn re-reading the module):\n" + lines.join("\n") : "";
}
async function pmNote(dir, slug, turn) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${loadKey()}`, "Content-Type": "application/json" },
    // gemini rejects reasoning:{enabled:false} ("Reasoning is mandatory for this endpoint"); only mimo gets the dial
    body: JSON.stringify({ model: pmModel, messages: pmRequest(dir, slug, turn), max_tokens: pmModel.startsWith("google/") ? 8000 : 1200, // Gemini thinks inside max_tokens: ag note-11 / ae note-19 hit 3996 and were cut mid-sentence
      usage: { include: true }, ...(pmModel.startsWith("xiaomi/") ? { reasoning: { enabled: false } } : {}) }),
    signal: AbortSignal.timeout(600000),
  });
  if (!res.ok) throw new Error(`openrouter ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = await res.json();
  let text = String(j.choices?.[0]?.message?.content ?? "").trim();
  if (text.startsWith("```")) text = text.replace(/^```[^\n]*\n?/, "").replace(/```\s*$/, "").trim();
  if (!text) throw new Error("empty completion");
  pmCost += Number(j.usage?.cost ?? 0); // openrouter `usage.cost` (usage.include) — the PM was unmetered in walks d–f
  console.log(`  ..pm usage: ${j.usage?.prompt_tokens ?? "?"} in, ${j.usage?.completion_tokens ?? "?"} out, $${Number(j.usage?.cost ?? 0).toFixed(4)} (pm total $${pmCost.toFixed(4)})`);
  return text;
}

// Dump the turn, then block until the reviewer drops note-<turn>.txt. Returns {stop, note}.
// A turn's ledger is carried forward when ANY of its tables has content. Guarding on cross_check
// entries alone (until 2026-09-07) meant a walk with no cross_check kept restoring the resumed
// ledger every turn: walk j lost fold_phase's two attestations at turn 8 and re-attested twice.
function hasLedger(c) {
  if (!c || typeof c !== "object") return false;
  const n = (v) => Array.isArray(v) ? v.length : v && typeof v === "object" ? Object.keys(v).length : 0;
  return n(c.entries) + n(c.attest) + n(c.fetches) > 0;
}
// ------------------------------------------------- --keep-turns (walk context trim)
// A walk session grows ~20 messages / ~25k chars per turn and nothing is ever dropped: walk r's
// prompt went 234k -> 584k tokens over turns 1-4, single model calls reached 288/642/698 s by turns
// 7-9, and two turns died on the turn timeout with `session.send timed out`. --keep-turns N rebuilds
// the resumed conversation at each turn boundary as [state, the last N turns verbatim] — the same
// shape a fresh `--resume <snapDir>` starts from, which is known to work.
//
// Turn boundaries are RECORDED, not inferred: the conversation carries mid-turn user messages
// (nudges, contexts) as well as the question, so no message reliably marks a turn start. A turn's
// messages are exactly the ones appended between two prefixAt() snapshots, so run() pushes
// {turn, start} into turnBounds as it takes each one. Cutting only on those boundaries also
// guarantees no tool_call is separated from its tool result.
//
// The state message carries what --resume's first question carries (envNote + instruction +
// resumeStateText of the collected ledger) plus one line per dropped turn with its final text — the
// same finals pmRequest gives the PM, read back with pmFinalText.
function trimStateText(task, seedPaths, collected, droppedTurns, slug) {
  const one = (t) => String(t).replace(/\s+/g, " ").slice(0, 400);
  const lines = droppedTurns.map((k) => {
    const t = pmFinalText(join(trajDir, `walk-${slug}-${k}.md`));
    return `turn ${k}: ${t ? one(t) : "(no final text)"}`;
  });
  return envNote(task, seedPaths) + task.instruction
    + resumeStateText(collected)
    + (lines.length ? "\n\nEARLIER TURNS (one line each, what you reported at the end of each):\n" + lines.join("\n") : "")
    + `\n\nThe messages of turn${droppedTurns.length > 1 ? "s" : ""} ${droppedTurns.join(", ")} have been dropped from this conversation to keep it short. /src and ${DISK} are exactly as those turns left them, and the state above is what carried over — continue from it, do not re-derive it.`;
}
// Pure. null when there is nothing to drop. bounds[i] = {turn, start}, start indexing `resume`.
function trimWalkResume(resume, bounds, keep, stateText) {
  if (!Array.isArray(resume) || !Array.isArray(bounds) || !Number.isFinite(keep) || bounds.length <= keep) return null;
  const kept = bounds.slice(-keep);
  const cut = kept[0].start;
  return {
    resume: [{ role: "user", content: stateText }, ...resume.slice(cut)],
    bounds: kept.map((b) => ({ turn: b.turn, start: b.start - cut + 1 })), // +1 for the state message
    kept,
  };
}
function parkWedgedSrc(snap, root, turn) {
  const out = [];
  for (const [path, text] of Object.entries(snap.files || {})) {
    if (typeof text !== "string" || !path.startsWith("/src/")) continue;
    const id = path.slice(5).replace(/\.js$/, "");
    if (!/^@[^/]+\/[^/]+$/.test(id) || (stockIds && stockIds.has(id))) continue;
    const rel = `/wedged/turn-${turn}${path.slice(4)}`;
    const dst = join(root, rel);
    mkdirSync(dirname(dst), { recursive: true });
    writeFileSync(dst, text);
    out.push(rel);
  }
  return out;
}
let turnStartedAt = 0; // wall clock at the start of the current walk turn (deliverableLine)
// Walk u turns 3–9 (2026-09-07): findPeriod was fixed and re-attested twice while output.csv stayed the 07:38 file —
// the writer is a function cell, so an upstream edit does not rewrite it, and the PM kept reporting counts from stale rows.
function deliverableLine(task, root, slice) {
  const edits = [];
  for (const m of slice) {
    if (!Array.isArray(m?.tool_calls)) continue;
    for (const tc of m.tool_calls) {
      const name = tc?.function?.name;
      if (name !== "edit_file" && name !== "write_file") continue;
      try { const a = JSON.parse(tc.function.arguments || "{}"); if (String(a.file_path || a.path || "").startsWith("/src/")) edits.push(name); } catch {}
    }
  }
  const out = [];
  for (const a of task.artifacts) {
    const p = join(root, a);
    if (!existsSync(p) || statSync(p).isDirectory()) continue;
    const mt = statSync(p).mtimeMs;
    const stale = edits.length && mt < turnStartedAt;
    let rowsNote = "";
    if (/\.csv$/i.test(a)) { // walk y turn 8 (2026-09-07): a timed-out writer left 100 all-CST rows and the PM read it as an output
      try {
        const lines = readFileSync(p, "utf8").split(/\r?\n/).filter((l) => l.trim());
        const NULLISH = new Set(["", "0", "0.0", "cst", "null", "nan", "none", "n/a"]);
        const nonNull = lines.slice(1).filter((l) => l.split(",").slice(1).some((v) => !NULLISH.has(v.trim().toLowerCase()))).length;
        rowsNote = `; rows ${Math.max(0, lines.length - 1)}, non-null ${nonNull}${nonNull === 0 ? " → ALL-NULL OUTPUT: this is the trivial baseline, not a result" : ""}`;
      } catch {}
    }
    out.push(`deliverable on disk: ${a} written ${new Date(mt).toISOString().slice(11, 19)}Z${rowsNote}; /src edits this turn: ${edits.length}${stale ? " → OUTPUT PREDATES THIS TURN'S EDITS: it was produced by the OLD code; run the writer before quoting counts from it" : ""}`);
  }
  return out.join("\n") || "deliverable on disk: (none)";
}
function modelWaitLine(tt) {
  // tt[i].start is performance.now() in the page: ms since the page opened. The first one is the boot plus the first
  // model reply — walk z turn 5 (2026-09-07) made no tool call in 1260 s and only the PM guessed why.
  if (!Array.isArray(tt) || !tt.length) return "model wait: NO TOOL CALL THIS TURN — the page never became ready (evidence cells computing at boot?) or the first model reply never came";
  const boot = `first tool call ${(tt[0].start / 1000).toFixed(0)} s after the page opened (boot + first model reply)`;
  if (tt.length < 2) return `model wait: (fewer than two tool calls)   ${boot}`;
  const gaps = tt.slice(1).map((b, i) => Math.max(0, b.start - (tt[i].start + (tt[i].ms || 0))) / 1000);
  const tool = tt.reduce((n, t) => n + (t.ms || 0), 0) / 1000;
  return `model wait between tool calls: total ${gaps.reduce((a, b) => a + b, 0).toFixed(0)} s, max ${Math.max(...gaps).toFixed(0)} s   tool time: ${tool.toFixed(0)} s   (a turn that ran out of time with small tool time waited on the model, not the page)   ${boot}`;
}
async function walkTurn(task, turn, question, snap, missing, restoredFrom, root, parked = []) {
  const files = warmSeeds({}, snap, stockIds);
  const srcPaths = Object.keys(files).filter((k) => k.startsWith("/src/")).sort();
  const slice = turnSlice(snap.conversation, question);
  const lastText = [...slice].reverse().find((m) => m.role === "assistant" && typeof m.content === "string" && m.content.trim());
  const rows = toolRows(slice, snap);
  const md = [
    `# walk ${task.slug} turn ${turn}`,
    "",
    `finish: ${snap.finishReason ?? "none"}   steps: ${snap.steps ?? 0}   costUSD: ${snap.usage?.costUSD ?? "?"} (session cumulative)   calls: ${snap.usage?.calls ?? "?"}`,
    modelWaitLine(snap.toolTimes), // provider latency vs page time: walk u turn 6 (2026-09-07) the PM blamed a 900 s timeout on a tool when the model calls were 199/344/137 s
    `missing artifacts: ${missing.length}/${task.artifacts.length}${missing.length ? " — " + missing.join(", ") : ""}`,
    deliverableLine(task, root, slice),
    snap.error ? `runError: ${String(snap.error).slice(0, 300)}` : "",
    parked.length ? `ROLLED BACK: this turn wedged the page; its src writes are not loaded next turn, parked at ${parked.map((q) => DISK + q).join(", ")}` : "",
    "",
    "## assistant final text",
    "",
    "```",
    String(lastText?.content ?? "(no assistant text this turn)").slice(0, 3000),
    "```",
    "",
    `## tool calls (${rows.length})`,
    "",
    "| step | tool | args (120) | result (160; 1500 for measurement tools) |",
    "|---|---|---|---|",
    // Walk ag turns 15–18 (2026-09-23): the agent's eval_js results held the whole 15-row sweep table (2.4 kB in the
    // trajectory json) while the PM saw 160 chars of it here and spent four notes asking for it to be re-printed.
    ...rows.map((r) => `| ${r.step} | ${r.name} | ${cell(r.args, 120)} | ${cell(r.result, /^(eval_js|inspect_value|core_status|attest|cross_check|list_values)$/.test(r.name) ? 1500 : 160)} |`),
    "",
    "## cross_check ledger (globalThis.__rc5CrossChecks)",
    "",
    "```",
    ledgerBlock(snap.collected, turn, restoredFrom) + (snap.collectError ? "\ncollectError: " + snap.collectError : ""),
    "```",
    "",
    "## attest ledger (globalThis.__rc5Attest)",
    "",
    "```",
    attestBlock(snap.collected),
    "```",
    "",
    "## verified core (given / core / blocked)",
    "",
    "```",
    coreBlock(snap.collected),
    "```",
    "",
    "## fetches (fetch_text, globalThis.__rc5Fetches)",
    "",
    "```",
    fetchBlock(snap.collected),
    "```",
    "",
    `## /src files (${srcPaths.length})`,
    "",
    ...srcPaths.map((p) => `- ${p} — ${String(files[p]).split("\n").length} lines`),
    "",
  ].join("\n");
  const mdPath = join(trajDir, `walk-${task.slug}-${turn}.md`);
  mkdirSync(trajDir, { recursive: true });
  writeFileSync(mdPath, md);
  const dumpSrc = (base) => {
    mkdirSync(base, { recursive: true }); // always present, so "no files" is not the same as "not dumped"
    for (const [path, text] of Object.entries(files)) {
      const dest = join(base, path);
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, String(text));
    }
  };
  const srcDir = join(trajDir, `src-${turn}`);
  dumpSrc(srcDir);
  // The snapshot is everything --resume needs to start this turn again in a new trajectory: the same
  // /src tree, the task root's materialised cache, the ledger as collected off the page, and the
  // question this turn was given. note.txt is added at the bottom, once the reviewer's note is in.
  const snapDir = join(trajDir, `snap-${turn}`);
  dumpSrc(snapDir);
  const snapCache = root ? copyTree(join(root, "cache"), join(snapDir, "cache")) : 0;
  // …and the whole task root minus the seeded data: the vsv writer caches at /root/cache/target_N.json and
  // writes /root/results/output.csv, neither under <root>/cache, so every resume so far restored 0 files
  // and walks y and ab (2026-09-07) spent a turn rebuilding an output the previous walk had written.
  const snapResults = root ? copyTreeExcept(root, join(snapDir, "root-state"), (task.seedRoots || []).map((r) => join(root, r))) : 0;
  writeFileSync(join(snapDir, "ledger.json"), JSON.stringify(snap.collected ?? null, null, 1));
  writeFileSync(join(snapDir, "question.txt"), String(question ?? ""));
  console.log(`  ..snapshot ${snapDir}: ${srcPaths.length} src files, ${snapCache} cache files, ${snapResults} result files`);
  const notePath = join(trajDir, `note-${turn}.txt`);
  console.log(`WALK: turn ${turn} dumped to ${mdPath}; waiting for ${notePath}`);
  if (pmModel) {
    const until = Date.now() + pmGraceMs;
    while (!existsSync(notePath) && Date.now() < until) await sleep(2000);
    if (!existsSync(notePath)) {
      try {
        // Walk ad turn 3 (2026-09-23): one empty Gemini completion parked the run for 35 min behind "waiting for a human note".
        let text, lastErr;
        for (let attempt = 1; attempt <= 3 && text == null; attempt++) {
          try { text = await pmNote(trajDir, task.slug, turn); }
          catch (e) { lastErr = e; console.log(`  ..pm note attempt ${attempt} failed: ${e.message}`); if (attempt < 3) await sleep(30000 * attempt); }
        }
        if (text == null) throw lastErr;
        if (existsSync(notePath)) console.log("  ..human note arrived first — pm note discarded"); // a human note always wins
        else { writeFileSync(notePath, text + "\n"); console.log(`  ..pm note written (${text.length} chars)`); }
      } catch (e) { console.log(`  ..pm note failed: ${e.message} — waiting for a human note`); }
    }
  }
  while (!existsSync(notePath)) await sleep(5000);
  const note = readFileSync(notePath, "utf8");
  writeFileSync(join(snapDir, "note.txt"), note);
  const stop = note.split("\n").some((l) => /^STOP\b\W*$/.test(l.trim())); // any bare STOP line — mimo put it after its verdict (walk k turn 8); Gemini wrote "STOP." (walk ag turn 19, 2026-09-23) and the exact match missed it
  console.log(`  ..note read (${note.length} chars)${stop ? " — STOP" : ""}`);
  return { stop, note: note.trim() };
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
      // df17: inherit another run's materialised results (walk c left ~25 min of estimator runs in
      // its cache/). materializeSeeds has already made the artifact directories, so this only adds.
      const cacheFiles = cacheFrom ? copyTree(join(cacheFrom, "cache"), join(root, "cache")) : 0;
      // The deliverable rides along too: walks y and ab (2026-09-07) each spent their first turn rebuilding an
      // output the previous walk had already written, because a resume carried src + cache and nothing else.
      const resultFiles = cacheFrom ? copyTree(join(cacheFrom, "root-state"), root) : 0;
      if (cacheFrom) console.log(`  ..cache-from: ${cacheFiles} cache files, ${resultFiles} result files`);
      rec.sandbox = root;
      rec.inputs = seeded.paths.length;
      const localDisk = { root, name: task.slug };
      // A --resume snapshot carries cache/, ledger.json, question.txt and note.txt beside src/ —
      // only the modules are seeds. --seed-dir keeps its old behaviour (the caller lays out the dir).
      let seeds = readSeedDir(seedDir);
      if (seedDir && seedDir === resumeDir) seeds = moduleSeeds(seeds);
      if (Object.keys(seeds).length) console.log(`  ..initial seeds from ${seedDir === resumeDir ? "--resume" : "--seed-dir"}: ${Object.keys(seeds).join(", ")}`);
      if (walk && trajDir) { mkdirSync(trajDir, { recursive: true }); writeFileSync(join(trajDir, "task.txt"), task.instruction); }
      let question = envNote(task, seeded.paths) + task.instruction + (firstNote && existsSync(firstNote) ? "\n\nREVIEWER NOTE: " + readFileSync(firstNote, "utf8").trim() : "")
        + resumeStateText(resumeCollected);
      const firstQuestion = question;
      let mayEdit = mayEditFromNote(firstNote && existsSync(firstNote) ? readFileSync(firstNote, "utf8") : null);
      let resume = null, snap = null, prevCollected = resumeCollected, restoredFrom = resumeDir ? basename(resumeDir.replace(/\/+$/, "")) : null;
      let turnBounds = []; // {turn, start}: where each recorded turn's messages begin in `resume`
      if (resumeDir)
        console.log(`  ..resumed from ${resumeDir}: ${cacheFiles} cache files, ledger entries ${resumeCollected?.entries?.length ?? 0}/${(resumeCollected?.attest ?? []).length}`);
      for (let turn = 1; turn <= maxTurns; turn++) {
        turnStartedAt = Date.now();
        const turnStarted = Date.now();
        // INIT is a page-side IIFE with no trailing semicolon — the `;` separator keeps a following
        // IIFE from being parsed as a call on its result.
        const restoreSrc = ledgerRestoreSource(prevCollected);
        // df29: __rc5SeedRoots tells the page which /local-disk paths are the task's own data — a data cell reading anything else is not `given`.
        // df28: the restore source also rides the PRE-BOOT script — at `init` it lands after seedFiles has already forced every cell, so the memo cannot stop the first computation (memo-smoke page 4, 2026-09-07).
        const initSrc = restoreSrc ? INIT + ";\n" + restoreSrc : INIT;
        snap = await safeRun({ id: `${task.slug}#${turn}`, question, setup: { files: seeds, localDisk, init: initSrc, initScript: [INIT_SCRIPT, `globalThis.__rc5SeedRoots = ${JSON.stringify((task.seedRoots || []).map((r) => "/local-disk" + r))};`, mayEdit ? `globalThis.__rc5MayEdit = ${JSON.stringify(mayEdit)};` : "", restoreSrc].filter(Boolean).join("\n"), collect: LEDGER_COLLECT }, steers: steers(), resume });
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
        rec.ledger = rec.ledger || [];
        rec.ledger.push({ restoredInto: snap.collected?.restored ?? 0, entries: snap.collected?.entries?.length ?? 0 });
        saveTrajectory(task, turn, question, seeded.paths, snap, null);
        // Walk mode never ends on its own: artifacts present, task_complete — all of it still stops
        // for the reviewer, and only a note whose first line is STOP (or --turns) ends the run.
        if (walk) {
          // A wedged turn (page frozen >300 s, or the hard deadline) is ROLLED BACK: its src writes are not
          // re-seeded (walk h 2026-09-06 re-seeded the freezing module, wedged the next boot for 1260 s and
          // ended), they are parked under <root>/wedged/turn-N/ for read_file, and the conversation resumes
          // from before the turn. Nothing else about the walk changes.
          const wedged = snap.finishReason === "wedged" || /wedged|hard deadline/i.test(String(snap.error || ""));
          const parked = wedged ? parkWedgedSrc(snap, root, turn) : [];
          const r = await walkTurn(task, turn, question, snap, missing, restoredFrom, root, parked);
          if (r.stop) break;
          mayEdit = mayEditFromNote(r.note);
          if (mayEdit) console.log(`  ..may edit (df32): ${mayEdit.length ? mayEdit.join(", ") : "none — every core cell frozen"}`);
          const noteText = r.note ? "\n\nREVIEWER NOTE: " + r.note : "";
          if (wedged) {
            console.log(`  ..turn ${turn} wedged — rolled back; ${parked.length} src file(s) parked under ${join(root, "wedged", `turn-${turn}`)}`);
            const rollback = `TURN ${turn} WEDGED THE PAGE (a cell blocked the main thread for over 300 s) and was ROLLED BACK: nothing it wrote to /src is loaded. `
              + (parked.length ? `Its module text is parked at ${parked.map((q) => DISK + q).join(", ")} — read_file it, then rewrite it so no cell runs longer than 20 s (async loops that await between items, a cache file per heavy cell under ${DISK}/cache/, 3 items before 100).`
                : `No src file was captured from it.`);
            question = (resume ? "Continue where you left off." : firstQuestion) + "\n\n" + rollback + noteText;
            continue;
          }
          if (!Array.isArray(snap.conversation) || !snap.conversation.length) { console.log("  ..no conversation to resume from — ending the walk"); break; }
          const turnStart = resume ? resume.length : 0; // this turn appended everything past here
          resume = prefixAt(snap.conversation, Infinity);
          turnBounds.push({ turn, start: turnStart });
          seeds = warmSeeds(seeds, snap, stockIds);
          const overlay = readSeedDir(join(trajDir, `seed-${turn}`));
          if (Object.keys(overlay).length) { Object.assign(seeds, overlay); console.log(`  ..reviewer seed overlay: ${Object.keys(overlay).join(", ")}`); }
          if (hasLedger(snap.collected)) { prevCollected = snap.collected; restoredFrom = turn; }
          if (turnBounds.length > keepTurns) { // trim BEFORE the next question is sent
            const dropped = turnBounds.slice(0, turnBounds.length - keepTurns).map((b) => b.turn);
            const t = trimWalkResume(resume, turnBounds, keepTurns, trimStateText(task, seeded.paths, prevCollected, dropped, task.slug));
            console.log(`  ..trimmed conversation: ${resume.length} → ${t.resume.length} messages (kept turns ${t.kept[0].turn}–${t.kept.at(-1).turn})`);
            resume = t.resume; turnBounds = t.bounds;
          }
          question = "Continue where you left off." + noteText;
          continue;
        }
        const done = !missing.length && snap.finishReason === "completed";
        if (done || !Array.isArray(snap.conversation) || !snap.conversation.length) break;
        resume = prefixAt(snap.conversation, Infinity);
        seeds = warmSeeds(seeds, snap, stockIds);
        if (hasLedger(snap.collected)) { prevCollected = snap.collected; restoredFrom = turn; }
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
