// Regrade every RECORDED FAILING candidate under two graders and report the flips — i.e. how many
// recorded polyglot failures a grader change manufactures or repairs, as opposed to the model.
//
// Built for the __compute-memoization fix: the baseline was grade.mjs and the candidate was the fork
// grade-fixed.mjs (49/49 references, 291 candidates, 1 legitimate flip, 0 unflips —
// results/gradefix-regrade.json is that run's evidence). The fork has since been merged into
// grade.mjs and deleted, so `--against` now names whatever fork is under test; with no --against
// both sides are grade.mjs and the run is a plain re-verification of the corpus.
//
//   node regrade-fix.mjs --list                      # just enumerate the candidate corpus
//   node regrade-fix.mjs --shard 0/4 --against ./grade-next.mjs --out results/gradefix-regrade.part0.json
//   node regrade-fix.mjs --merge results/gradefix-regrade.part*.json --out results/gradefix-regrade.json
//
// Candidate sources:
//   results/*.json          rows with candidate1/candidate2 (attempt n failed iff candidateN is a
//                           string and passN === false; passN is cumulative, so a present candidate2
//                           always means attempt 1 had already failed)
//   results/trajectories*/  per-attempt sidecars with { slug, attempt, candidate, pass:false }
// Deduped on (slug, mode, byte-identical candidate); every source that carried that exact byte
// string is listed on the row.
//
// Grading replicates run-agent.mjs's dispatch: arm "baseline" grades mode "esm"; the agent arm
// grades mode "module", except `grep`, whose `script` cell string is computed first and then graded
// as esm — and computeCellString goes through the SAME emulator, so each grader uses its own.
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import * as orig from "./grade.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const RESULTS = join(here, "results");
const problems = new Map(JSON.parse(readFileSync(join(here, "problems.json"), "utf8")).map((p) => [p.slug, p]));

const flag = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : dflt;
};

// ---------------------------------------------------------------- candidate collection

export function collectCandidates() {
  const byKey = new Map(); // slug\0mode\0candidate -> row
  const add = (slug, mode, candidate, source, attempt, recordedPass) => {
    if (typeof candidate !== "string" || !candidate.trim()) return;
    if (!problems.has(slug)) return; // a slug the current problems.json no longer carries
    const key = `${slug}\u0000${mode}\u0000${candidate}`;
    let row = byKey.get(key);
    if (!row) byKey.set(key, (row = { slug, mode, candidate, sources: [] }));
    row.sources.push({ source, attempt, recordedPass });
  };

  for (const f of readdirSync(RESULTS).filter((x) => x.endsWith(".json")).sort()) {
    let j;
    try { j = JSON.parse(readFileSync(join(RESULTS, f), "utf8")); } catch { continue; }
    if (!j || !Array.isArray(j.results)) continue; // reviewer-*.json etc. carry patches, not candidates
    const mode = j.arm === "baseline" ? "esm" : "module";
    for (const r of j.results) {
      if (!r || !r.slug) continue;
      for (const n of [1, 2]) {
        const cand = r[`candidate${n}`] ?? (n === 1 ? r.candidate : undefined);
        const pass = r[`pass${n}`] ?? (n === 1 ? r.pass : undefined);
        if (pass === false) add(r.slug, mode, cand, `results/${f}`, n, false);
      }
    }
  }

  for (const d of readdirSync(RESULTS).filter((x) => x.startsWith("trajectories"))) {
    const p = join(RESULTS, d);
    if (!statSync(p).isDirectory()) continue;
    for (const f of readdirSync(p).filter((x) => x.endsWith(".json")).sort()) {
      let j;
      try { j = JSON.parse(readFileSync(join(p, f), "utf8")); } catch { continue; }
      if (!j || j.pass !== false) continue;
      const slug = j.slug || basename(f).replace(/-\d+\.json$/, "");
      add(slug, "module", j.candidate, `results/${d}/${f}`, j.attempt ?? null, false);
    }
  }

  return [...byKey.values()].sort((a, b) => a.slug.localeCompare(b.slug) || a.mode.localeCompare(b.mode));
}

// ---------------------------------------------------------------- grading

function gradeWith(g, problem, candidate, mode) {
  try {
    if (problem.slug === "grep" && mode === "module") {
      const script = g.computeCellString(candidate, "script");
      if (script == null) return { pass: false, output: "could not compute `script` cell string" };
      return g.gradeSolution(problem, script, { mode: "esm", timeoutMs: 120000 });
    }
    return g.gradeSolution(problem, candidate, { mode, timeoutMs: 120000 });
  } catch (e) {
    return { pass: false, output: "GRADER ERROR: " + (e?.message ?? e) };
  }
}

const firstLine = (s) => ((s || "").split("\n").find((l) => l.trim()) || "").slice(0, 300);

// ---------------------------------------------------------------- main

const all = collectCandidates();

if (process.argv.includes("--list")) {
  const per = new Map();
  for (const r of all) per.set(r.slug, (per.get(r.slug) || 0) + 1);
  for (const [slug, n] of [...per].sort((a, b) => b[1] - a[1])) console.log(`${String(n).padStart(3)}  ${slug}`);
  console.log(`\n${all.length} unique failing candidates over ${per.size} slugs`);
  process.exit(0);
}

if (process.argv.includes("--merge")) {
  const rest = process.argv.slice(process.argv.indexOf("--merge") + 1);
  const stop = rest.findIndex((a) => a.startsWith("--"));
  const files = (stop === -1 ? rest : rest.slice(0, stop)).filter((a) => a.endsWith(".json"));
  const uniq = [];
  for (const f of files) uniq.push(...JSON.parse(readFileSync(f, "utf8")).rows);
  uniq.sort((a, b) => a.slug.localeCompare(b.slug) || a.sources[0].source.localeCompare(b.sources[0].source));
  // One output row per (slug, source file, attempt); `group` links rows that shared a byte-identical
  // candidate and were therefore graded once.
  const rows = [];
  uniq.forEach((u, gi) => {
    for (const s of u.sources) {
      rows.push({
        slug: u.slug, source: s.source, attempt: s.attempt, mode: u.mode, group: gi,
        recordedPass: s.recordedPass, oldPass: u.oldPass, newPass: u.newPass, flipped: u.flipped,
        oldError: u.oldError, newError: u.newError, candidateBytes: u.candidateBytes,
      });
    }
  });
  rows.sort((a, b) => a.slug.localeCompare(b.slug) || a.source.localeCompare(b.source) || (a.attempt - b.attempt));
  const out = flag("--out", join(RESULTS, "gradefix-regrade.json"));
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({
    generatedAt: new Date().toISOString(),
    note: "recorded-failing candidates regraded under grade.mjs (oldPass) and the --against grader (newPass); "
      + "graded once per byte-identical (slug, mode, candidate) and expanded back over every source that carried it",
    uniqueCandidates: uniq.length,
    rows: rows.length,
    flips: rows.filter((r) => r.flipped).length,
    uniqueFlips: uniq.filter((r) => r.flipped).length,
    unflips: rows.filter((r) => !r.newPass && r.oldPass).length,
    oldGraderDisagreesWithRecord: uniq.filter((r) => r.oldPass).length,
    data: rows,
  }, null, 1));
  console.log(`merged ${uniq.length} unique candidates -> ${rows.length} rows -> ${out}`);
  process.exit(0);
}

// The grader under test (default: grade.mjs itself, i.e. a no-op comparison).
const fixed = await import(flag("--against", "./grade.mjs"));

const [k, n] = (flag("--shard", "0/1")).split("/").map(Number);
const mine = all.filter((_, i) => i % n === k);
const out = flag("--out", join(RESULTS, `gradefix-regrade.part${k}.json`));
const rows = [];
let i = 0;
for (const c of mine) {
  const problem = problems.get(c.slug);
  const gOld = gradeWith(orig, problem, c.candidate, c.mode);
  const gNew = gradeWith(fixed, problem, c.candidate, c.mode);
  rows.push({
    slug: c.slug,
    mode: c.mode,
    sources: c.sources,
    oldPass: gOld.pass,
    newPass: gNew.pass,
    flipped: gNew.pass && !gOld.pass,
    oldError: gOld.pass ? null : firstLine(gOld.output),
    newError: gNew.pass ? null : firstLine(gNew.output),
    candidateBytes: c.candidate.length,
  });
  i++;
  const r = rows[rows.length - 1];
  console.log(`[${k}] ${i}/${mine.length} ${c.slug} old=${r.oldPass ? "PASS" : "fail"} new=${r.newPass ? "PASS" : "fail"}${r.flipped ? "  <<< FLIP" : ""}`);
  writeFileSync(out, JSON.stringify({ shard: k, of: n, rows }, null, 1));
}
console.log(`[${k}] done: ${rows.length} rows, ${rows.filter((r) => r.flipped).length} flips -> ${out}`);
