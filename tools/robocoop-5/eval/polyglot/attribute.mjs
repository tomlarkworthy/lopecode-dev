#!/usr/bin/env node
// Counterfactual credit assignment over one failed polyglot trajectory
// (plan/robocoop-5-credit-assignment.md, Phase 1).
//
// Mechanism: a trajectory captured by `run-agent.mjs --trajectories` is cut before assistant step
// k; the file state at the cut is reconstructed by folding the prefix's write_file/edit_file calls
// over the attempt's seeds; the prefix is injected into a fresh session (driver-core `resume`) and
// the turn continues with send(null), N times; each continuation's final file state is graded with
// the official spec. p(k) = fraction of continuations that pass. Bisection between p(0) (a plain
// re-roll) and p(K)≈0 (the recorded fail) localizes the step where p collapses.
//
// Labels are read off the Jeffreys 95% credible band of each probe, never off the point estimate
// (plan/rqgm-and-robocoop-5.md §U1 — RQGM's BB_ε applied at both tails). A point-estimate label at
// N=3 is not supported by its own data: 0/3 has the band [0, 0.536], and 4 of the first campaign's
// 10 `model-ceiling` labels were later falsified. Thresholds and bands are in the output JSON:
//   variance       — the deepest probe's LOWER bound ≥ threshold and p never collapses: a re-roll
//                    passes; the fail was sampling noise, nothing structural.
//   strategic@k    — the pre-collapse probe's LOWER bound ≥ threshold and the collapse probe's
//                    UPPER bound < threshold: the action at k is the decision error; its assistant
//                    message is quoted in the output.
//   model-ceiling  — p(0)'s UPPER bound < threshold: even a fresh attempt fails; not a harness
//                    defect. Needs ≥10 clean failures (0/10 → upper 0.217); 0/3 never qualifies.
//   undetermined[@k] — the bands straddle the threshold. Not a verdict: `needsSamples` lists the
//                    cuts to buy more probes at (`--probe k --samples N`).
//
// Fidelity limits (accepted, plan §"Why the mechanism is feasible"): replayed tool results are
// frozen text from the original run; eval_js side effects are not reconstructed; edit_file folding
// mirrors the executor's success rules (exactly-once or replace_all) rather than replaying errors.
//
//   node attribute.mjs --traj results/trajectories/<slug>-<attempt>.json
//        [--samples 3] [--threshold 0.5] [--max-probes 6] [--concurrency 2]
//        [--notebook <abs path>] [--timeout ms] [--json results/attribution/<slug>-<attempt>.json]

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
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

// ── pure trajectory functions (exported for tests) ──────────────────────────
// Cut k = the conversation prefix ending just BEFORE assistant message k (0-based), so a probe at
// k resamples step k fresh. The leading system message (the loop prompt) is stripped — send()
// re-adds it; everything else (contexts, watch updates, nudges, tool results) stays verbatim.
export function assistantIndices(conv) {
  return conv.map((m, i) => (m.role === "assistant" ? i : -1)).filter((i) => i >= 0);
}

export function prefixAt(conv, k) {
  const idx = assistantIndices(conv);
  const end = k >= idx.length ? conv.length : idx[k];
  const pre = conv.slice(0, end);
  return pre.length && pre[0].role === "system" ? pre.slice(1) : pre;
}

// Fold write_file/edit_file over the attempt's seeds, mirroring the srctools executor's success
// rules (modules/@tomlarkworthy/robocoop-5-srctools.js: split on old_string; apply only when found,
// and exactly-once unless replace_all). A call the executor rejected leaves state unchanged here
// too — its frozen error text is already in the prefix.
export function filesAt(conv, seeds, k) {
  const idx = assistantIndices(conv);
  const files = { ...seeds };
  const end = k >= idx.length ? conv.length : idx[k];
  for (const m of conv.slice(0, end)) {
    if (m.role !== "assistant" || !Array.isArray(m.tool_calls)) continue;
    for (const call of m.tool_calls) {
      const name = call?.function?.name ?? call?.name;
      let a = call?.function?.arguments;
      if (typeof a === "string") { try { a = JSON.parse(a); } catch { continue; } }
      if (!a || typeof a !== "object") continue;
      if (name === "write_file" && typeof a.file_path === "string") {
        files[a.file_path] = String(a.content ?? "");
      } else if (name === "edit_file" && typeof a.file_path === "string") {
        const text = files[a.file_path];
        if (typeof text !== "string" || typeof a.old_string !== "string" || a.old_string === a.new_string) continue;
        const parts = text.split(a.old_string);
        const count = parts.length - 1;
        if (count === 0 || (count > 1 && !a.replace_all)) continue;
        files[a.file_path] = a.replace_all
          ? parts.join(String(a.new_string ?? ""))
          : parts[0] + String(a.new_string ?? "") + parts.slice(1).join(a.old_string);
      }
    }
  }
  return files;
}

// ── pure posterior functions (exported for tests) ───────────────────────────
// Jeffreys credible band on a pass rate — implementation shared with eval/ladder.mjs in
// ../../../robocoop-eval/stats.mjs. Reference values (level 0.95): 0/3 → upper 0.536,
// 0/10 → 0.217, 0/30 → 0.080; 10/10 → lower 0.783, 3/3 → lower 0.464.
import { regularizedIncompleteBeta, betaQuantile, jeffreysInterval } from "../../../robocoop-eval/stats.mjs";
export { regularizedIncompleteBeta, betaQuantile, jeffreysInterval };

// One probe's counts and band. Infra losses are not evidence about the model — excluded, as in the
// p estimate itself.
export function probeStats(probe, level = 0.95) {
  const scored = (probe?.samples ?? []).filter((s) => !s?.infra);
  const successes = scored.filter((s) => s?.pass).length;
  const failures = scored.length - successes;
  const { lower, upper } = jeffreysInterval(successes, failures, level);
  const p = typeof probe?.p === "number" ? probe.p : scored.length ? successes / scored.length : 0;
  return { k: probe?.k, n: scored.length, successes, failures, p, lower, upper, level };
}

// Three-way label from recorded probes alone (no model calls): pure, so the CLI and the offline
// relabeler (relabel.mjs) cannot disagree. opts.K is the trajectory's assistant-step count (p(K)=0
// by construction, the recorded fail) and opts.maxProbes the bisection budget — both default to
// what the probe list implies. The bisection bracket is replayed from the recorded point estimates
// so the decisive cut is located exactly as the CLI located it; only the verdicts read the bands.
export function labelFromProbes(probes, threshold, opts = {}) {
  const level = opts.level ?? 0.95;
  const stats = (probes ?? []).map((p) => probeStats(p, level)).sort((a, b) => a.k - b.k);
  const byK = new Map(stats.map((s) => [s.k, s]));
  const out = (label, decisionStep, needsSamples) => ({
    label, decisionStep, level,
    needsSamples: [...new Set(needsSamples)].sort((a, b) => a - b),
    bounds: stats,
  });

  const p0 = byK.get(0);
  if (!p0) return out("undetermined", null, [0]);
  if (p0.upper < threshold) return out("model-ceiling", null, []);
  if (p0.p < threshold) return out("undetermined", null, [0]); // band straddles: buy probes at 0

  const K = opts.K ?? Math.max(...stats.map((s) => s.k)) + 1;
  const maxProbes = opts.maxProbes ?? Infinity;
  let lo = 0, hi = K, budget = maxProbes - 1;
  const missing = [];
  while (hi - lo > 1 && budget-- > 0) {
    const mid = Math.floor((lo + hi) / 2);
    const e = byK.get(mid);
    if (!e) { missing.push(mid); break; } // the recorded sweep stopped here — bracket unresolved
    e.p >= threshold ? (lo = mid) : (hi = mid);
  }

  const needs = [...missing];
  if (byK.get(lo).lower < threshold) needs.push(lo); // pre-collapse evidence too weak to assert
  const coarse = hi - lo > 1 ? `~coarse(lo=${lo})` : "";

  if (hi >= K) { // no collapse inside the probed range
    return needs.length ? out("undetermined", hi, needs) : out("variance", hi, []);
  }
  if (byK.get(hi).upper >= threshold) needs.push(hi); // collapse not established
  return needs.length
    ? out(`undetermined@${hi - 1}${coarse}`, hi, needs)
    : out(`strategic@${hi - 1}${coarse}`, hi, []);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (!isMain) {
  // imported as a library (tests) — skip the CLI body below
} else {

const args = process.argv.slice(2);
const flag = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
const trajPath = flag("--traj", null);
if (!trajPath) { console.error("--traj <trajectory.json> required"); process.exit(1); }
const samples = Number(flag("--samples", 3));
const threshold = Number(flag("--threshold", 0.5));
const maxProbes = Number(flag("--max-probes", 6));
const concurrency = Number(flag("--concurrency", 2));
const timeoutMs = Number(flag("--timeout", 300000));
const notebook = flag("--notebook", join(here, "..", "..", "rc5-bundle.html"));
const model = flag("--model", "xiaomi/mimo-v2.5-pro"); // NEVER read OPENROUTER_MODEL — evals are mimo
const traj = JSON.parse(readFileSync(trajPath, "utf8"));
const jsonOut = flag("--json", join(here, "results", "attribution", basename(trajPath)));
const saveCont = args.includes("--save-continuations"); // dump each continuation's full conversation beside jsonOut

const problems = JSON.parse(readFileSync(join(here, "problems.json"), "utf8"));
const problem = problems.find((p) => p.slug === traj.slug);
if (!problem) throw new Error("unknown slug " + traj.slug);

const SOL_PATH = "/src/@user/solution.js";

// ── trajectory cuts (see exported prefixAt/filesAt above) ───────────────────
const conv = traj.conversation;
const assistantIdx = assistantIndices(conv);
const K = assistantIdx.length;
if (K < 2) { console.error(`only ${K} assistant steps — nothing to bisect`); process.exit(1); }

function gradeFromSnapshot(snap) {
  const file = snap.files?.[SOL_PATH];
  if (typeof file !== "string") return { pass: false, output: "no solution file: " + (snap.error || "unknown") };
  if (problem.slug === "grep") {
    const script = computeCellString(file, "script");
    if (script == null) return { pass: false, output: "no `script` cell string" };
    return gradeSolution(problem, script, { mode: "esm" });
  }
  return gradeSolution(problem, file, { mode: "module" });
}

// ── driver pool ─────────────────────────────────────────────────────────────
const driverOpts = { notebookPath: notebook, apiKey: loadKey(), model, timeoutMs };
const pool = [];
for (let i = 0; i < concurrency; i++) pool.push({ driver: await createDriver(driverOpts), busy: false });

async function withDriver(fn) {
  for (;;) {
    const slot = pool.find((s) => !s.busy);
    if (slot) {
      slot.busy = true;
      try { return await fn(slot); }
      finally { slot.busy = false; }
    }
    await new Promise((r) => setTimeout(r, 500));
  }
}

const HARD_DEADLINE = timeoutMs + 180000;
async function runContinuation(k, sampleIdx) {
  return withDriver(async (slot) => {
    let timer;
    const sentinel = new Promise((r) => { timer = setTimeout(() => r({ __deadline: true }), HARD_DEADLINE); });
    const evalDef = { id: `${traj.slug}@${k}#${sampleIdx}`, question: "", setup: { files: filesAt(conv, traj.seeds, k) }, resume: prefixAt(conv, k) };
    const snap = await Promise.race([slot.driver.runQuestion(evalDef).catch((e) => ({ error: e.message })), sentinel]);
    clearTimeout(timer);
    if (snap && snap.__deadline) {
      try { await slot.driver.close(); } catch {}
      slot.driver = await createDriver(driverOpts);
      return { pass: false, infra: true, error: "hard deadline", steps: 0 };
    }
    const g = gradeFromSnapshot(snap);
    if (saveCont) {
      mkdirSync(dirname(jsonOut), { recursive: true });
      const contPath = join(dirname(jsonOut), `${traj.slug}-${traj.attempt}-k${k}s${sampleIdx}.cont.json`);
      writeFileSync(contPath, JSON.stringify({ k, sampleIdx, pass: g.pass, steps: snap.steps,
        error: snap.error || null, conversation: snap.conversation || [] }, null, 1));
    }
    return {
      pass: g.pass,
      infra: !!(snap.error && /fetch|network|empty turn|did not initialize/i.test(String(snap.error))),
      error: snap.error || (g.pass ? null : String(g.output).split("\n")[0].slice(0, 120)),
      steps: snap.steps ?? 0,
      usage: snap.usage || null,
    };
  });
}

const probes = []; // {k, samples:[…], p}
// Probes as written to the output JSON: the recorded fields plus the probe's credible band.
const withBounds = (ps) => ps.slice().sort((a, b) => a.k - b.k).map((p) => {
  const { n, successes, failures, lower, upper } = probeStats(p);
  return { ...p, bounds: { n, successes, failures, lower, upper } };
});
async function probe(k) {
  const existing = probes.find((p) => p.k === k);
  if (existing) return existing.p;
  console.log(`probe k=${k} (${samples} samples)…`);
  const out = await Promise.all(Array.from({ length: samples }, (_, i) => runContinuation(k, i)));
  // Infra losses don't count against p — rerun each once, then score what graded.
  for (let i = 0; i < out.length; i++) if (out[i].infra) out[i] = await runContinuation(k, i + 100);
  const scored = out.filter((s) => !s.infra);
  const p = scored.length ? scored.filter((s) => s.pass).length / scored.length : 0;
  probes.push({ k, samples: out, p });
  console.log(`  p(${k}) = ${p.toFixed(2)}  [${out.map((s) => (s.infra ? "?" : s.pass ? "P" : "F")).join("")}]`);
  return p;
}

// ── bisection ───────────────────────────────────────────────────────────────
const started = Date.now();
console.log(`${traj.slug} attempt ${traj.attempt}: K=${K} assistant steps, samples=${samples}, threshold=${threshold}`);

// --probe k: single forced probe at cut k (debug / manual exploration), no bisection.
const forcedProbe = flag("--probe", null);
if (forcedProbe != null) {
  const k = Number(forcedProbe);
  await probe(k);
  const result = { slug: traj.slug, attempt: traj.attempt, trajectory: trajPath, model,
    ranAt: new Date().toISOString(), durationMs: Date.now() - started,
    K, samples, threshold, forcedProbe: k, probes: withBounds(probes) };
  mkdirSync(dirname(jsonOut), { recursive: true });
  writeFileSync(jsonOut, JSON.stringify(result, null, 1));
  console.log("wrote", jsonOut);
  for (const s of pool) { try { await s.driver.close(); } catch {} }
  process.exit(0);
}

const p0 = await probe(0);
// Bisect only when p(0) is both plausibly and pointwise above threshold: a band that already
// closes below it is model-ceiling (no step to localize), and a point estimate below it means the
// budget belongs at k=0, not down the trajectory.
if (probeStats(probes.find((p) => p.k === 0)).upper >= threshold && p0 >= threshold) {
  let lo = 0, hi = K; // invariant: p(lo) ≥ threshold, p(hi) < threshold (p(K)=0 by construction: the recorded fail)
  let budget = maxProbes - 1;
  while (hi - lo > 1 && budget-- > 0) {
    const mid = Math.floor((lo + hi) / 2);
    (await probe(mid)) >= threshold ? (lo = mid) : (hi = mid);
  }
}
// The bracket above is replayed inside labelFromProbes from the same recorded probes.
const verdict = labelFromProbes(probes, threshold, { K, maxProbes });
const label = verdict.label;
const decisionStep = verdict.decisionStep;

// The localized assistant message, for autopsy without reopening the trajectory.
const decisionMsg = decisionStep != null && decisionStep <= K
  ? conv[assistantIdx[decisionStep - 1]] ?? null
  : null;

const result = {
  slug: traj.slug, attempt: traj.attempt, trajectory: trajPath, model,
  ranAt: new Date().toISOString(), durationMs: Date.now() - started,
  K, samples, threshold, maxProbes, level: verdict.level,
  label, decisionStep: decisionStep != null ? decisionStep - 1 : null,
  needsSamples: verdict.needsSamples,
  decisionMessage: decisionMsg ? { content: String(decisionMsg.content ?? "").slice(0, 2000), tool_calls: decisionMsg.tool_calls ?? null } : null,
  probes: withBounds(probes),
};
mkdirSync(dirname(jsonOut), { recursive: true });
writeFileSync(jsonOut, JSON.stringify(result, null, 1));
console.log(`label: ${label}${decisionStep != null ? ` (decision step ${decisionStep - 1} of ${K})` : ""}`);
for (const b of verdict.bounds) console.log(`  p(${b.k}) = ${b.successes}/${b.n}  [${b.lower.toFixed(3)}, ${b.upper.toFixed(3)}]`);
if (verdict.needsSamples.length) console.log(`  needs more samples at k = ${verdict.needsSamples.join(", ")}`);
console.log("wrote", jsonOut);
for (const s of pool) { try { await s.driver.close(); } catch {} }

} // end CLI body
