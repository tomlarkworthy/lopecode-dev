// Grade a label SET on its own, with no detector in the loop.
//
// The seven marks are printed on one sheet, so they are coplanar by construction. Seven correct
// image labels must therefore be consistent with a single homography from the sheet's mm
// coordinates. Fit on six, predict the seventh, and the residual is a measure of the labels and
// nothing else -- no cascade, no scan direction, no threshold. A set with one label on the wrong
// mark cannot hide: the six-point fit puts the prediction where the mark actually is.
//
// Old labels come from scratch/rmbt/hexcases-backup, new ones from data/hexcases.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { importNotebookModule } from "../../tools/notebook-import.ts";

// The module's define() resolves its file attachments at load time through the page's
// content store. Nothing reached here needs those bytes, so a stub is enough to get past it.
(globalThis as any).window = {
  performance,
  lopecode: { contentSync: () => ({ status: 404, mime: "application/octet-stream", bytes: new Uint8Array(0) }) },
};

// Same reason: the bootstrap calls runtime.fileAttachments, which the bare core Runtime in
// tools/node_modules does not carry. fitHomography and hexTarget touch no attachment.
const { Runtime } = await import("../../tools/node_modules/@observablehq/runtime/src/index.js");
if (!(Runtime as any).prototype.fileAttachments) (Runtime as any).prototype.fileAttachments = () => () => ({});

const m = await importNotebookModule("modules/@tomlarkworthy/coded-landmark-tracking.js");
const fitHomography: any = await m.value("fitHomography");
const hexTarget: any = await m.value("hexTarget");

const loo = (truth: any[]) => {
  const pairs = truth
    .filter((t) => hexTarget.byId.has(t.id))
    .map((t) => { const mk = hexTarget.byId.get(t.id); return { sx: mk.xMm, sy: mk.yMm, dx: t.x, dy: t.y, id: t.id }; });
  if (pairs.length < 5) return null;   // a homography needs 4, so 5 before one can be held out
  const out: any[] = [];
  for (let i = 0; i < pairs.length; i++) {
    const rest = pairs.filter((_, j) => j !== i);
    const fit = fitHomography(rest);
    if (!fit) continue;
    const [px, py] = fit.map(pairs[i].sx, pairs[i].sy);
    out.push({ id: pairs[i].id, d: Math.hypot(px - pairs[i].dx, py - pairs[i].dy) });
  }
  return out;
};

const DIR = resolve("data/hexcases");
const OLD = resolve("scratch/rmbt/hexcases-backup");
const names = readdirSync(DIR).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)).sort();
const rows: any[] = [];
for (const n of names) {
  if (!existsSync(resolve(OLD, n + ".json"))) continue;
  const nu = JSON.parse(readFileSync(resolve(DIR, n + ".json"), "utf8"));
  const od = JSON.parse(readFileSync(resolve(OLD, n + ".json"), "utf8"));
  const a = loo(od.truth ?? []), b = loo(nu.truth ?? []);
  if (!a || !b) continue;
  const worst = (z: any[]) => Math.max(...z.map((q) => q.d));
  const med = (z: any[]) => z.map((q) => q.d).sort((x, y) => x - y)[z.length >> 1];
  rows.push({ name: n, oldWorst: worst(a), newWorst: worst(b), oldMed: med(a), newMed: med(b) });
}

const P = (a: number[], p: number) => a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.round(p * (a.length - 1)))];
const show = (label: string, a: number[]) => console.log(`  ${label.padEnd(22)} p50=${P(a, 0.5).toFixed(2).padStart(7)}  p90=${P(a, 0.9).toFixed(2).padStart(7)}  max=${Math.max(...a).toFixed(1).padStart(8)}`);

console.log(`=== leave-one-out over the labels themselves, ${rows.length} cases (px) ===`);
show("worst-in-case, old", rows.map((r) => r.oldWorst));
show("worst-in-case, new", rows.map((r) => r.newWorst));
show("median-in-case, old", rows.map((r) => r.oldMed));
show("median-in-case, new", rows.map((r) => r.newMed));
console.log(`\n  cases improved: ${rows.filter((r) => r.newWorst < r.oldWorst - 0.5).length}   worsened: ${rows.filter((r) => r.newWorst > r.oldWorst + 0.5).length}   unchanged: ${rows.filter((r) => Math.abs(r.newWorst - r.oldWorst) <= 0.5).length}`);
console.log(`\n  biggest improvements:`);
for (const r of rows.slice().sort((a, b) => (b.oldWorst - b.newWorst) - (a.oldWorst - a.newWorst)).slice(0, 10))
  console.log(`    ${r.name.padEnd(20)} worst ${r.oldWorst.toFixed(1).padStart(7)} -> ${r.newWorst.toFixed(2)}`);
const worse = rows.filter((r) => r.newWorst > r.oldWorst + 0.5).sort((a, b) => (b.newWorst - b.oldWorst) - (a.newWorst - a.oldWorst));
console.log(`\n  regressions:`);
for (const r of worse.slice(0, 10)) console.log(`    ${r.name.padEnd(20)} worst ${r.oldWorst.toFixed(2).padStart(7)} -> ${r.newWorst.toFixed(2)}`);
if (!worse.length) console.log("    none");
