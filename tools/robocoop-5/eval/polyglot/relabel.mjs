#!/usr/bin/env node
// Re-label every recorded attribution with the credible-band logic (plan/rqgm-and-robocoop-5.md
// §U1) — zero model calls: the probes already on disk are the whole input.
//
// This is U1's verification step. The first campaign's 10 `model-ceiling` labels all came from
// 0/3, and 4 of them (word-search, list-ops, go-counting, simple-linked-list) were later falsified
// by an actual pass. Under the bands none of them may keep that label.
//
//   node relabel.mjs [--dir results/attribution] [--threshold 0.5] [--json out.json]

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { labelFromProbes } from "./attribute.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
const dir = flag("--dir", join(here, "results", "attribution"));
const thresholdOverride = args.includes("--threshold") ? Number(flag("--threshold")) : null;
const jsonOut = flag("--json", null);

// The slugs whose model-ceiling label a later run disproved (worktree plan Phase 2 log).
const FALSIFIED = ["word-search", "list-ops", "go-counting", "simple-linked-list"];

const files = readdirSync(dir).filter((f) => f.endsWith(".json") && !f.endsWith(".cont.json")).sort();
const rows = [];
for (const f of files) {
  const rec = JSON.parse(readFileSync(join(dir, f), "utf8"));
  const threshold = thresholdOverride ?? rec.threshold ?? 0.5;
  const v = labelFromProbes(rec.probes ?? [], threshold, { K: rec.K, maxProbes: rec.maxProbes });
  rows.push({
    file: f, slug: rec.slug ?? null, attempt: rec.attempt ?? null,
    forcedProbe: rec.forcedProbe ?? null, K: rec.K ?? null, threshold,
    old: rec.label ?? null, new: v.label, decisionStep: v.decisionStep,
    needsSamples: v.needsSamples,
    counts: v.bounds.map((b) => `p(${b.k})=${b.successes}/${b.n} [${b.lower.toFixed(3)},${b.upper.toFixed(3)}]`).join(" "),
  });
}

const w = (s, n) => String(s).padEnd(n);
console.log(`${w("file", 26)} ${w("old label", 15)} → ${w("new label", 16)} ${w("needs k", 9)} evidence`);
console.log("-".repeat(120));
for (const r of rows) {
  const old = r.old ?? (r.forcedProbe != null ? `(--probe ${r.forcedProbe})` : "(none)");
  console.log(`${w(r.file, 26)} ${w(old, 15)} → ${w(r.new, 16)} ${w(r.needsSamples.join(",") || "-", 9)} ${r.counts}`);
}

const tally = {};
for (const r of rows) tally[`${r.old ?? "(none)"} → ${r.new}`] = (tally[`${r.old ?? "(none)"} → ${r.new}`] ?? 0) + 1;
console.log("\ntransitions:");
for (const [k, n] of Object.entries(tally).sort()) console.log(`  ${n}×  ${k}`);

// The required outcome, checked rather than eyeballed.
const kept = rows.filter((r) => FALSIFIED.includes(r.slug) && r.new === "model-ceiling");
console.log(`\nfalsified slugs still labelled model-ceiling: ${kept.length ? kept.map((r) => r.slug).join(", ") : "none"}`);

if (jsonOut) { writeFileSync(jsonOut, JSON.stringify({ dir, ranAt: new Date().toISOString(), rows }, null, 1)); console.log("wrote", jsonOut); }
if (kept.length) process.exit(1);
