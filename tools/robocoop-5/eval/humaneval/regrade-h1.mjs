#!/usr/bin/env node
// Regrade EVERY stored candidate through the current grade.mjs (whole-program-first for raw text,
// emulator-first for module source, extraction as fallback, 5s timeout) and diff against the pass
// recorded when the run happened. Zero model calls — it only re-runs the graders subprocesses.
//   node regrade-h1.mjs [--out results/h1-regrade.json]
// Writes {slug, arm, oldPass, newPass, via, error} per candidate plus per-arm totals.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gradeCandidate, fnNameOf } from "./grade.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const out = flag("--out", join(here, "results", "h1-regrade.json"));

const problems = JSON.parse(readFileSync(join(here, "humaneval-js.json"), "utf8"));
const byName = new Map(problems.map((p) => [p.name, p]));

const sources = [
  { arm: "baseline", file: join(here, "results", "baseline-full.json") },
  { arm: "agent", file: join(here, "results", "agent-merged.json") },
];

const rows = [];
const summary = {};
for (const { arm, file } of sources) {
  const stored = JSON.parse(readFileSync(file, "utf8"));
  let oldPass = 0, newPass = 0;
  for (const rec of stored.results) {
    const p = byName.get(rec.name);
    if (!p) { console.log("NO PROBLEM", rec.name); continue; }
    const row = { slug: rec.name, arm, oldPass: !!rec.pass, newPass: false, via: null, error: null };
    if (typeof rec.candidate !== "string") {
      row.error = "no candidate stored";
    } else {
      const g = gradeCandidate(rec.candidate, p.tests, { fnName: fnNameOf(p.prompt) });
      row.newPass = g.pass;
      row.via = g.via;
      row.error = g.pass ? null : String(g.error || "").split("\n")[0].slice(0, 200);
    }
    if (row.oldPass) oldPass++;
    if (row.newPass) newPass++;
    if (row.oldPass !== row.newPass) console.log(`${row.oldPass ? "-" : "+"} ${arm} ${row.slug} (${row.via})`);
    rows.push(row);
  }
  const n = rows.filter((r) => r.arm === arm).length;
  summary[arm] = {
    total: n,
    oldPass,
    newPass,
    rescued: rows.filter((r) => r.arm === arm && !r.oldPass && r.newPass).map((r) => r.slug),
    broken: rows.filter((r) => r.arm === arm && r.oldPass && !r.newPass).map((r) => r.slug),
  };
  console.log(`${arm}: old ${oldPass}/${n} -> new ${newPass}/${n}`);
}

writeFileSync(out, JSON.stringify({ grader: "whole-program-first, 5s timeout", summary, rows }, null, 1));
console.log("wrote", out);
