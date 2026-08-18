#!/usr/bin/env node
// The eval ladder, with criterion identity and a cost axis (plan/rqgm-and-robocoop-5.md, U2 + U4).
//
//   node tools/robocoop-5/eval/ladder.mjs results/a.json results/b.json ...
//   node tools/robocoop-5/eval/ladder.mjs --paired A1.json,A2.json B1.json,B2.json
//   ... [--trajectories results/trajectories-gate]
//
// Per file: arm, pass fraction, Jeffreys 95% interval, the criterion stamp written by the runner,
// and blended tokens where the run recorded usage. Two scores are only a progression if they were
// measured under the SAME criterion, so any stamp-hash difference between the files being compared
// prints a WARNING and the rows must not be pooled. Files written before 2026-08-17 carry no stamp
// at all and are reported as such — their criterion is unknown, which is exactly the defect U2 fixes
// (the July polyglot 0.776 was measured under a problems.json with an empty word-search export
// contract; nothing in the file says so).
//
// `--paired` takes exactly two sides, each a comma-joined list of shards from ONE run. Both arms saw
// the same tasks, so the discordant-pair count is the right statistic and is far tighter than the
// marginal intervals: only tasks present on BOTH sides are paired, matched on `slug` (polyglot) or
// `idx` (τ), auto-detected. A paired comparison across different criteria is a WARNING, not an
// error — the July-vs-current τ comparison is exactly that and remains informative history.
//
// No model calls, no side effects — pure reporting over already-written JSON.

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { jeffreysInterval, discordantPairTest } from "../../robocoop-eval/stats.mjs";

/** Jeffreys interval for k successes in n trials as [lo, hi]. Shared impl: robocoop-eval/stats.mjs. */
export function jeffreys(k, n, level = 0.95) {
  if (!n) return [0, 1];
  const { lower, upper } = jeffreysInterval(k, n - k, level);
  return [lower, upper];
}

// --- score extraction ------------------------------------------------------------------------
// Result JSONs come in three shapes and two benchmarks; partial in-loop writes have no totals, so
// the count is always recomputed from `results` when that array is present.

export function scoreOf(doc) {
  const rows = Array.isArray(doc.results) ? doc.results : null;
  if (rows && rows.length) {
    const r0 = rows[0];
    if ("reward" in r0) return { metric: "reward", k: rows.filter((r) => r.reward === 1).length, n: rows.length };
    if ("pass2" in r0) return { metric: "pass@2", k: rows.filter((r) => r.pass2).length, n: rows.length };
    if ("pass1" in r0) return { metric: "pass@1", k: rows.filter((r) => r.pass1).length, n: rows.length };
    if ("pass" in r0) return { metric: "pass", k: rows.filter((r) => r.pass).length, n: rows.length };
  }
  if (typeof doc.pass2 === "number" && typeof doc.total === "number") return { metric: "pass@2", k: doc.pass2, n: doc.total };
  if (typeof doc.pass1 === "number" && typeof doc.total === "number") return { metric: "pass@1", k: doc.pass1, n: doc.total };
  return { metric: "?", k: 0, n: 0 };
}

// --- pairing ---------------------------------------------------------------------------------

/** The row's task outcome. τ rows grade to a reward; polyglot rows to the best attempt reached. */
export function passOf(row) {
  if ("reward" in row) return row.reward === 1;
  return Boolean(row.pass2 ?? row.pass1 ?? row.pass);
}

/** The row's task identity: polyglot carries `slug`, τ `idx`, HumanEval `name`. */
const KEY_FIELDS = ["slug", "idx", "name"];

export function keyOf(row) {
  if (row == null) return null;
  for (const f of KEY_FIELDS) if (row[f] != null) return String(row[f]);
  return null;
}

/** Which field the rows are keyed on, for the report header. */
export function keyFieldOf(rows) {
  for (const r of rows) {
    if (!r) continue;
    for (const f of KEY_FIELDS) if (r[f] != null) return f;
  }
  return null;
}

/** Rows (possibly several shards, possibly with re-rolls) → key -> pass. A re-roll wins over the
 *  earlier row for the same key, matching how the gates were assembled by hand. */
export function indexRows(rows) {
  const map = new Map();
  let duplicates = 0;
  for (const r of rows) {
    const k = keyOf(r);
    if (k == null) continue;
    if (map.has(k)) duplicates++;
    map.set(k, passOf(r));
  }
  return { map, duplicates };
}

/**
 * Discordant-pair table over the tasks present on BOTH sides.
 * b = A-only passes, c = B-only passes; `onlyInA`/`onlyInB` are tasks that could not be paired and
 * are excluded from every count (an unmatched task is not evidence about a difference).
 */
export function pairUp(rowsA, rowsB) {
  const A = indexRows(rowsA), B = indexRows(rowsB);
  const out = {
    keyField: keyFieldOf(rowsA) ?? keyFieldOf(rowsB),
    n: 0, bothPass: 0, bothFail: 0, aOnly: 0, bOnly: 0,
    aPass: 0, bPass: 0,
    onlyInA: 0, onlyInB: 0,
    duplicatesA: A.duplicates, duplicatesB: B.duplicates,
  };
  for (const [k, va] of A.map) {
    if (!B.map.has(k)) { out.onlyInA++; continue; }
    const vb = B.map.get(k);
    out.n++;
    if (va) out.aPass++;
    if (vb) out.bPass++;
    if (va && vb) out.bothPass++;
    else if (!va && !vb) out.bothFail++;
    else if (va) out.aOnly++;
    else out.bOnly++;
  }
  for (const k of B.map.keys()) if (!A.map.has(k)) out.onlyInB++;
  out.discordant = out.aOnly + out.bOnly;
  out.p = discordantPairTest(out.aOnly, out.bOnly);
  return out;
}

// --- tokens ----------------------------------------------------------------------------------
// The paper's §4 cost axis (RQGM, arXiv:2606.26294v2): blended tokens = input + 5×output, summed
// over generation AND evaluation calls, charged at the point the best score is first reached:
//
//     blended = Σ promptTokens + 5 · Σ completionTokens
//
// Charging rule for polyglot's two-attempt protocol: attempt 1 is charged for every task, attempt 2
// only for tasks that actually ran it (`pass1 === false`) — a first-try pass never pays for a repair
// it did not run, which IS "charged when the best score is first reached". Grading on both of our
// benchmarks is deterministic node execution (jest specs / DB-state diff), so the evaluation term is
// zero tokens here; RQGM's is not, because its evaluator is itself an LLM. Cached prompt tokens are
// NOT discounted — the definition is on tokens, not on price — but the cached count and the
// provider's own cost are reported alongside when the run recorded them.
//
// Usage is read from the rows themselves (`usage`, or per-attempt `usage1`/`usage2`) and, for
// polyglot runs written before the rows carried it, from `--trajectories <dir>/<slug>-<attempt>.json`.
// A sidecar trajectory is only accepted when its `candidate` is byte-identical to the row's
// `candidate<attempt>` — same slug is NOT enough, and without that check pointing `--trajectories` at
// the agent gate's directory happily charged the raw baseline 14.5M of the agent's tokens. Tasks
// whose sidecar fails the check are reported as "no usage record", never estimated.
// τ runs record no usage at any level, so they report `not recorded`; nothing is ever inferred from
// step counts or wall-clock.

/** Any recorded usage blob → {input, output, calls, cached, costUSD}, or null if it has no token counts. */
export function normalizeUsage(u) {
  if (!u || typeof u !== "object") return null;
  const input = u.promptTokens ?? u.inputTokens ?? u.input_tokens ?? u.prompt_tokens;
  const output = u.completionTokens ?? u.outputTokens ?? u.output_tokens ?? u.completion_tokens;
  if (typeof input !== "number" && typeof output !== "number") return null;
  return {
    input: typeof input === "number" ? input : 0,
    output: typeof output === "number" ? output : 0,
    calls: typeof u.calls === "number" ? u.calls : 0,
    cached: typeof u.cachedTokens === "number" ? u.cachedTokens : 0,
    costUSD: typeof u.costUSD === "number" ? u.costUSD : null,
  };
}

/** Was attempt `a` of this row actually run, i.e. does the best-score-first-reached rule charge it? */
export function attemptCharged(row, a) {
  if (a === 1) return true;
  return "pass1" in row && !row.pass1;
}

/** Sidecar usage for one attempt, gated on the trajectory being THIS row's attempt (same candidate). */
export function trajUsage(dir, row, attempt, readJson = readTrajFile) {
  const traj = readJson(join(dir, `${row.slug}-${attempt}.json`));
  if (!traj) return null;
  const mine = row["candidate" + attempt];
  if (typeof mine !== "string" || traj.candidate !== mine) return null;
  return traj.usage ?? null;
}

function readTrajFile(p) {
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; }
}

/** Blended-token totals for a result doc, or null when the run recorded no usage at all. */
export function tokensOf(doc, { trajDir = null } = {}) {
  const rows = Array.isArray(doc.results) ? doc.results : [];
  const acc = { input: 0, output: 0, calls: 0, cached: 0, costUSD: 0, haveCost: false, tasks: rows.length, charged: 0, missing: 0, source: null };
  for (const row of rows) {
    const parts = [];
    const direct = normalizeUsage(row.usage);
    if (direct) { parts.push(direct); acc.source ??= "rows"; }
    for (const a of [1, 2]) {
      if (!attemptCharged(row, a)) continue;
      const u = normalizeUsage(row["usage" + a]);
      if (u) { parts.push(u); acc.source ??= "rows"; }
    }
    if (!parts.length && trajDir && row.slug != null) {
      for (const a of [1, 2]) {
        if (!attemptCharged(row, a)) continue;
        const u = normalizeUsage(trajUsage(trajDir, row, a));
        if (u) { parts.push(u); acc.source ??= "trajectories"; }
      }
    }
    if (!parts.length) { acc.missing++; continue; }
    acc.charged++;
    for (const u of parts) {
      acc.input += u.input; acc.output += u.output; acc.calls += u.calls; acc.cached += u.cached;
      if (u.costUSD != null) { acc.costUSD += u.costUSD; acc.haveCost = true; }
    }
  }
  if (!acc.charged) return null;
  acc.blended = acc.input + 5 * acc.output;
  acc.blendedPerTask = acc.blended / acc.charged;
  if (!acc.haveCost) acc.costUSD = null;
  return acc;
}

// --- stamp comparison ------------------------------------------------------------------------

/** Flatten a stamp to comparable field -> value, e.g. `core[@tomlarkworthy/robocoop-5-core]`. */
export function stampFields(stamp) {
  const out = {};
  if (!stamp) return out;
  for (const [k, v] of Object.entries(stamp)) {
    if (k === "stampVersion" || k === "notebookPath") continue;
    if (k === "coreModuleHashes") {
      if (v) for (const [id, h] of Object.entries(v)) out[`core[${id}]`] = h;
      // null means either "no notebook in this arm" (the raw baseline runs no core modules at all)
      // or "the notebook could not be read". Either way it is a criterion difference from a run that
      // HAS core hashes, so it stays a single comparable field — only the wording distinguishes them.
      else out["core"] = stamp.notebookPath ? "(notebook unreadable)" : "(no notebook — arm runs no core modules)";
    } else if (typeof v === "string" || v === null) out[k] = v;
  }
  return out;
}

/** Field names on which two stamps disagree (a field absent on one side counts as a difference). */
export function stampDiff(a, b) {
  const fa = stampFields(a), fb = stampFields(b);
  const keys = new Set([...Object.keys(fa), ...Object.keys(fb)]);
  return [...keys].filter((k) => fa[k] !== fb[k]).sort();
}

// --- report ----------------------------------------------------------------------------------

const pct = (x) => x.toFixed(3);
const num = (x) => Math.round(x).toLocaleString("en-US");

function load(p) {
  try { return JSON.parse(readFileSync(p, "utf8")); }
  catch (e) { console.log(`${p}\n  UNREADABLE: ${e.message}\n`); return null; }
}

function tokenLine(doc, trajDir) {
  const t = tokensOf(doc, { trajDir });
  if (!t) return "  tokens: not recorded";
  const extra = [];
  if (t.calls) extra.push(`${num(t.calls)} calls`);
  if (t.cached) extra.push(`${num(t.cached)} cached-in`);
  if (t.costUSD != null) extra.push(`$${t.costUSD.toFixed(2)}`);
  if (t.missing) extra.push(`${t.missing}/${t.tasks} tasks with no usage record`);
  return (
    `  tokens: in ${num(t.input)}  out ${num(t.output)}  blended(in+5·out) ${num(t.blended)}  ` +
    `= ${num(t.blendedPerTask)}/task over ${t.charged} charged tasks` +
    (extra.length ? `  [${extra.join(", ")}]` : "") +
    (t.source === "trajectories" ? "  (usage from trajectories)" : "")
  );
}

function reportFile(p, doc, trajDir) {
  const { metric, k, n } = scoreOf(doc);
  const [lo, hi] = jeffreys(k, n);
  console.log(p);
  console.log(`  arm=${doc.arm ?? "?"}  model=${doc.model ?? "?"}  ${metric} ${k}/${n} = ${n ? pct(k / n) : "-"}  Jeffreys95=[${pct(lo)}, ${pct(hi)}]`);
  const stamp = doc.stamp ?? null;
  if (!stamp) {
    console.log("  stamp: unstamped (pre-2026-08-17) — criterion unknown, not comparable to anything");
  } else {
    const f = stampFields(stamp);
    const core = Object.entries(f).filter(([k2]) => k2.startsWith("core["));
    const rest = Object.entries(f).filter(([k2]) => !k2.startsWith("core["));
    console.log(`  stamp: ${rest.map(([k2, v]) => `${k2}=${v ?? "null"}`).join("  ") || "(no benchmark fields)"}`);
    console.log(`  core:  ${core.length ? core.map(([k2, v]) => `${k2.slice(5, -1).replace("@tomlarkworthy/", "")}=${v}`).join("  ") : "(none)"}`);
  }
  console.log(tokenLine(doc, trajDir));
  console.log("");
  return { path: p, stamp };
}

function pairedReport(sideA, sideB, trajDir) {
  const docsA = [], docsB = [];
  for (const [paths, into] of [[sideA, docsA], [sideB, docsB]]) {
    for (const p of paths) {
      const doc = load(p);
      if (doc) into.push({ path: p, doc });
    }
  }
  if (!docsA.length || !docsB.length) {
    console.error("--paired: each side needs at least one readable result file");
    process.exit(2);
  }
  for (const { path, doc } of [...docsA, ...docsB]) reportFile(path, doc, trajDir);

  const rowsOf = (docs) => docs.flatMap(({ doc }) => (Array.isArray(doc.results) ? doc.results : []));
  const r = pairUp(rowsOf(docsA), rowsOf(docsB));
  const [aLo, aHi] = jeffreys(r.aPass, r.n);
  const [bLo, bHi] = jeffreys(r.bPass, r.n);
  const delta = r.aOnly - r.bOnly; // = aPass − bPass over the paired tasks

  console.log("paired");
  console.log(`  A = ${docsA.map((d) => d.path).join(", ")}`);
  console.log(`  B = ${docsB.map((d) => d.path).join(", ")}`);
  console.log(`  key=${r.keyField ?? "?"}  n paired = ${r.n}` +
    (r.onlyInA || r.onlyInB ? `  (excluded: ${r.onlyInA} A-only tasks, ${r.onlyInB} B-only tasks)` : "") +
    (r.duplicatesA || r.duplicatesB ? `  (re-rolls collapsed: A ${r.duplicatesA}, B ${r.duplicatesB} — last row wins)` : ""));
  console.log(`  A ${r.aPass}/${r.n} = ${r.n ? pct(r.aPass / r.n) : "-"}  Jeffreys95=[${pct(aLo)}, ${pct(aHi)}]`);
  console.log(`  B ${r.bPass}/${r.n} = ${r.n ? pct(r.bPass / r.n) : "-"}  Jeffreys95=[${pct(bLo)}, ${pct(bHi)}]`);
  console.log(`  both pass ${r.bothPass}   both fail ${r.bothFail}   A-only pass b=${r.aOnly}   B-only pass c=${r.bOnly}   discordant ${r.discordant}`);
  console.log(`  exact two-sided sign test on the discordant pairs: P = ${r.p.toFixed(4)}`);
  console.log(r.p < 0.05
    ? `  verdict: significant at P<0.05 — ${delta > 0 ? "A" : "B"} beats ${delta > 0 ? "B" : "A"} by ${Math.abs(delta)} tasks in ${r.n}`
    : `  verdict: parity (P=${r.p.toFixed(2)}) — a difference of ${Math.abs(delta)} tasks in ${r.n} is not resolvable at this churn`);

  // The do-not-pool rule applies here too: a paired test across criteria is history, not progression.
  const stampOf = (docs) => docs.find(({ doc }) => doc.stamp)?.doc.stamp ?? null;
  const sa = stampOf(docsA), sb = stampOf(docsB);
  if (!sa || !sb) {
    console.log("  WARNING one or both sides are unstamped (pre-2026-08-17) — the two rolls may have been " +
      "measured under different criteria; the pairing is still valid per task, read it as history");
  } else {
    const diff = stampDiff(sa, sb);
    if (diff.length) console.log(`  WARNING different criterion: do not pool the marginal scores — sides differ in ${diff.join(", ")} (the paired test is still computed)`);
    else console.log("  both sides share one criterion — the comparison is a progression, not just history");
  }
}

function main(argv) {
  const args = [...argv];
  let trajDir = null;
  const ti = args.indexOf("--trajectories");
  if (ti >= 0) { trajDir = args[ti + 1] ?? null; args.splice(ti, 2); }
  const pi = args.indexOf("--paired");
  if (pi >= 0) {
    const sides = args.slice(pi + 1, pi + 3).filter(Boolean);
    if (sides.length !== 2) {
      console.error("usage: node ladder.mjs --paired A.json[,A2.json] B.json[,B2.json] [--trajectories dir]");
      process.exit(2);
    }
    return pairedReport(sides[0].split(","), sides[1].split(","), trajDir);
  }
  const paths = args;
  if (!paths.length) {
    console.error("usage: node ladder.mjs <result.json> [more.json ...] [--trajectories dir]");
    console.error("       node ladder.mjs --paired A.json[,A2.json] B.json[,B2.json]");
    process.exit(2);
  }
  const rows = [];
  for (const p of paths) {
    const doc = load(p);
    if (doc) rows.push(reportFile(p, doc, trajDir));
  }

  if (rows.length < 2) return;
  console.log("comparison");
  const stamped = rows.filter((r) => r.stamp);
  const unstamped = rows.filter((r) => !r.stamp);
  for (const r of unstamped)
    console.log(`  NOTE  ${r.path}: unstamped (pre-2026-08-17) — cannot be shown same-criterion; treat as history, do not pool`);
  let warned = false;
  for (let i = 0; i < stamped.length; i++) {
    for (let j = i + 1; j < stamped.length; j++) {
      const diff = stampDiff(stamped[i].stamp, stamped[j].stamp);
      if (!diff.length) continue;
      warned = true;
      console.log(`  WARNING different criterion: do not pool — ${stamped[i].path} vs ${stamped[j].path} differ in ${diff.join(", ")}`);
    }
  }
  if (stamped.length >= 2 && !warned) console.log("  all stamped rows share one criterion — poolable");
  console.log("  two arms on the same tasks? use --paired A B — the discordant-pair test is far tighter than these marginals");
}

if (import.meta.url === `file://${process.argv[1]}`) main(process.argv.slice(2));
