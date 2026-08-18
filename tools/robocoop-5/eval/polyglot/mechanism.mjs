#!/usr/bin/env node
// Retry-channel mechanism check over a trajectory directory: did attempt 2's prompt actually carry
// jest-style code frames, is it free of ANSI escapes, and how many steps did the repair take?
// Zero model calls — pure reading of persisted trajectories.
//
//   node mechanism.mjs results/trajectories-corrected-gate [--frames slug]

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];
const showIdx = process.argv.indexOf("--frames");
const showSlug = showIdx >= 0 ? process.argv[showIdx + 1] : null;
if (!dir || !existsSync(dir)) { console.error("usage: node mechanism.mjs <trajDir> [--frames slug]"); process.exit(2); }

const FRAME = /^\s*>\s*\d+ \|/m;
const ESC = String.fromCharCode(27);
const rows = [];
for (const f of readdirSync(dir).sort()) {
  if (!f.endsWith("-2.json")) continue;
  let t; try { t = JSON.parse(readFileSync(join(dir, f), "utf8")); } catch { continue; }
  const q = String(t.question || "");
  const frames = (q.match(/^\s*>\s*\d+ \|/gm) || []).length;
  rows.push({
    slug: t.slug, steps: t.steps ?? 0, pass: t.pass, mode: t.repairMode,
    hasFrame: FRAME.test(q), frames, esc: q.includes(ESC), qLen: q.length,
    convLen: (t.conversation || []).length,
  });
  if (showSlug && t.slug === showSlug) {
    const i = q.search(/FAIL: /);
    console.log("=== attempt-2 prompt excerpt for " + t.slug + " ===\n" + q.slice(Math.max(0, i), i + 2500) + "\n=== end excerpt ===\n");
  }
}
const n = rows.length;
const withFrame = rows.filter((r) => r.hasFrame).length;
const anyEsc = rows.filter((r) => r.esc).length;
const passed = rows.filter((r) => r.pass);
const mean = (xs) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
for (const r of rows) {
  console.log(`${String(r.slug).padEnd(22)} steps=${String(r.steps).padStart(3)} pass=${String(r.pass).padEnd(5)} mode=${String(r.mode).padEnd(11)} frames=${String(r.frames).padStart(3)} esc=${r.esc} promptChars=${r.qLen} resumedMsgs=${r.convLen}`);
}
console.log(`\nrepairs: ${n}   with code frames: ${withFrame}/${n}   carrying ANSI escapes: ${anyEsc}/${n}`);
console.log(`repair steps: mean ${mean(rows.map((r) => r.steps)).toFixed(1)}  median ${rows.map((r) => r.steps).sort((a, b) => a - b)[Math.floor(n / 2)]}  max ${Math.max(...rows.map((r) => r.steps))}`);
console.log(`repairs that passed: ${passed.length}/${n}  their mean steps ${mean(passed.map((r) => r.steps)).toFixed(1)}`);
