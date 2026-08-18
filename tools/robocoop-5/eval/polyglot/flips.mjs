#!/usr/bin/env node
// Per-slug flip table: OLD outcomes (pre-correction runs) vs NEW (corrected protocol), per arm.
// Cross-criterion by construction — the old rows were measured under a different grader/runner, so
// this is qualitative reading only, never pooled. Zero model calls.
//
//   node flips.mjs --old-raw f.json --new-raw f.json --old-sys a.json,b.json --new-sys f.json

import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const load = (spec) => spec ? spec.split(",").flatMap((p) => {
  try { return JSON.parse(readFileSync(p, "utf8")).results || []; } catch { return []; }
}) : [];
const index = (rows) => { const m = new Map(); for (const r of rows) if (r?.slug) m.set(r.slug, Boolean(r.pass2 ?? r.pass1)); return m; };

const sides = {
  raw: [index(load(flag("--old-raw"))), index(load(flag("--new-raw")))],
  sys: [index(load(flag("--old-sys"))), index(load(flag("--new-sys")))],
};

for (const [arm, [oldM, newM]] of Object.entries(sides)) {
  if (!oldM.size && !newM.size) continue;
  const slugs = [...new Set([...oldM.keys(), ...newM.keys()])].sort();
  const gained = [], lost = [], both = [], neither = [], unpaired = [];
  for (const s of slugs) {
    if (!oldM.has(s) || !newM.has(s)) { unpaired.push(s + (oldM.has(s) ? " (old only)" : " (new only)")); continue; }
    const o = oldM.get(s), n = newM.get(s);
    (o && n ? both : !o && !n ? neither : n ? gained : lost).push(s);
  }
  console.log(`\n== ${arm}  old ${[...oldM.values()].filter(Boolean).length}/${oldM.size}  new ${[...newM.values()].filter(Boolean).length}/${newM.size}`);
  console.log(`  gained (fail -> pass, ${gained.length}): ${gained.join(", ") || "-"}`);
  console.log(`  lost   (pass -> fail, ${lost.length}): ${lost.join(", ") || "-"}`);
  console.log(`  still failing (${neither.length}): ${neither.join(", ") || "-"}`);
  if (unpaired.length) console.log(`  unpaired: ${unpaired.join(", ")}`);
}
