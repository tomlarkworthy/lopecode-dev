#!/usr/bin/env node
// Merge shard result JSONs of ONE run into a single document. Shards are the same run split by
// --offset/--limit (or a --slugs re-roll of it), so they must agree on arm, model and stamp — a
// stamp mismatch is refused, because merging across criteria is exactly what the stamp exists to
// prevent. Later files win per slug, so a re-roll shard listed last replaces the original row and
// the replaced row is reported. Zero model calls.
//
//   node merge-shards.mjs out.json in1.json in2.json ...

import { readFileSync, writeFileSync } from "node:fs";

const [out, ...ins] = process.argv.slice(2);
if (!out || !ins.length) { console.error("usage: node merge-shards.mjs out.json in1.json ..."); process.exit(2); }

const docs = ins.map((p) => ({ p, d: JSON.parse(readFileSync(p, "utf8")) }));
const key = (d) => JSON.stringify([d.arm ?? null, d.model ?? null, d.stamp ?? null]);
const k0 = key(docs[0].d);
for (const { p, d } of docs) {
  if (key(d) !== k0) { console.error(`REFUSED: ${p} differs from ${docs[0].p} in arm/model/stamp — not one run`); process.exit(1); }
}

const rows = new Map();
const replaced = [];
for (const { p, d } of docs) {
  for (const r of d.results || []) {
    if (rows.has(r.slug)) replaced.push(`${r.slug} (was ${rows.get(r.slug).pass2 ? "pass" : "fail"} → now ${r.pass2 ? "pass" : "fail"}, from ${p})`);
    rows.set(r.slug, r);
  }
}
const results = [...rows.values()];
const p1 = results.filter((r) => r.pass1).length, p2 = results.filter((r) => r.pass2).length;
writeFileSync(out, JSON.stringify({
  arm: docs[0].d.arm, model: docs[0].d.model, stamp: docs[0].d.stamp,
  mergedFrom: ins, pass1: p1, pass2: p2, total: results.length, results,
}, null, 1));
console.log(`wrote ${out}: ${results.length} tasks  pass@1 ${p1}  pass@2 ${p2}`);
if (replaced.length) console.log("replaced rows (later file wins):\n  " + replaced.join("\n  "));
