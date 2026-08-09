// Does the barcode decode say WHICH pass placed the mark better?
//
// Every fused mark already has agreeing ids (the merge requires it), so the
// match itself is a constant. But each pass decoded independently and carries
// its own voteMargin / rows / cover. If the stronger decode is the better
// placement, that is the culprit statistic |dy| failed to be.
//
// Reports the ORACLE first: an omniscient chooser that always takes whichever
// pass is closer to the frozen label. That is the ceiling on any selection
// rule; if it is small, the whole line of attack is capped regardless of the
// statistic.
import { chromium } from "playwright";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";

const t = readFileSync("modules/@tomlarkworthy/coded-landmark-tracking.js", "utf8");
const s = t.indexOf("const _1m3an4z = function _mergeManAxes(");
const e = t.indexOf("\nconst _", s + 10);
let SRC = t.slice(s, e).replace(/^const _1m3an4z = /, "").replace(/;\s*$/, "");
// Probe-only: keep both passes' raw records on the fused mark.
const NEEDLE = "...r, xc: r.xc, yc: cols[m].yc, a: r.a, b: cols[m].b ?? r.b,";
if (!SRC.includes(NEEDLE)) throw new Error("fusion line not found -- working copy is not canonical");
SRC = SRC.replace(NEEDLE, NEEDLE + " _row: r, _col: cols[m],");

const IN = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs: string[] = [];
page.on("pageerror", (x) => errs.push(x.message.slice(0, 160)));
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${IN}#view=S100(@tomlarkworthy/coded-landmark-tracking)`, { waitUntil: "networkidle", timeout: 300000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 300000 });
await page.waitForTimeout(15000);

const out = await page.evaluate(async (SRC: string) => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const val = async (n: string) => {
    const v = [...rt._variables].find((z: any) => z._module === mod && z._name === n);
    if (!v) throw new Error("no variable " + n); return await v._promise;
  };
  mod.redefine("mergeManAxes", ["unrotatePoint"], (0, eval)("(" + SRC + ")"));
  await new Promise((r) => setTimeout(r, 1500));
  const [bank, opts, asyncA, pool] = await Promise.all(
    ["hexFrameBank", "hexRigOpts", "analyzeFrameManAsync", "detectPool"].map(val)
  );

  const recs: any[] = [];
  for (const bk of bank as any[]) {
    const res = await asyncA({ gray: bk.frame.gray, w: bk.frame.w, h: bk.frame.h },
      { ...opts, bothAxes: true, runRows: pool.runRows });
    const byId = new Map((bk.truth as any[]).map((x: any) => [x.id, x]));
    for (const f of res.fused ?? []) {
      if (f.axis !== "both" || !f._row || !f._col) continue;
      const tr: any = byId.get(f.id); if (!tr) continue;
      const eRowY = Math.abs(f._row.yc - tr.y), eColY = Math.abs(f._col.yc - tr.y);
      recs.push({
        frame: bk.name, id: f.id,
        dy: Math.abs(f._col.yc - f._row.yc), dx: Math.abs(f._col.xc - f._row.xc),
        eRowY, eColY, colBetter: eColY < eRowY,
        gain: eRowY - eColY,                       // + means taking col's y helped
        vmRow: f._row.voteMargin, vmCol: f._col.voteMargin,
        rowsRow: f._row.rows, rowsCol: f._col.rows,
        covRow: f._row.cover, covCol: f._col.cover
      });
    }
  }

  const sum = (v: number[]) => v.reduce((a, c) => a + c, 0);
  // Oracle: always take the better pass's y. Compare against the two fixed
  // policies (always column = shipped, always row = find-only).
  const errShipped = recs.map((r) => r.eColY), errRow = recs.map((r) => r.eRowY);
  const errOracle = recs.map((r) => Math.min(r.eRowY, r.eColY));
  const errAnti = recs.map((r) => Math.max(r.eRowY, r.eColY));

  // Candidate rules: pick the pass with the stronger decode.
  const rule = (pick: (r: any) => boolean) => {
    // pick() true => take the column pass
    const err = recs.map((r) => (pick(r) ? r.eColY : r.eRowY));
    const agree = recs.filter((r) => pick(r) === r.colBetter).length;
    return { total: +sum(err).toFixed(1), agree, n: recs.length };
  };
  const defined = (a: any, b: any) => a != null && b != null;
  return {
    n: recs.length,
    colBetterN: recs.filter((r) => r.colBetter).length,
    totals: {
      shipped_alwaysCol: +sum(errShipped).toFixed(1),
      findonly_alwaysRow: +sum(errRow).toFixed(1),
      ORACLE: +sum(errOracle).toFixed(1),
      antiOracle: +sum(errAnti).toFixed(1)
    },
    rules: {
      voteMargin: rule((r) => defined(r.vmRow, r.vmCol) ? r.vmCol > r.vmRow : true),
      rows:       rule((r) => defined(r.rowsRow, r.rowsCol) ? r.rowsCol > r.rowsRow : true),
      cover:      rule((r) => defined(r.covRow, r.covCol) ? r.covCol > r.covRow : true)
    },
    fieldsPresent: {
      voteMargin: recs.filter((r) => defined(r.vmRow, r.vmCol)).length,
      rows: recs.filter((r) => defined(r.rowsRow, r.rowsCol)).length,
      cover: recs.filter((r) => defined(r.covRow, r.covCol)).length
    },
    // The big-disagreement subset, where the decision actually costs something.
    bigDy: recs.filter((r) => r.dy > 4).map((r) => ({
      frame: r.frame.slice(0, 20), id: r.id, dy: +r.dy.toFixed(1),
      eRow: +r.eRowY.toFixed(1), eCol: +r.eColY.toFixed(1),
      colBetter: r.colBetter, vmRow: r.vmRow, vmCol: r.vmCol,
      rowsRow: r.rowsRow, rowsCol: r.rowsCol
    }))
  };
}, SRC);

console.log(`fused-from-both marks with a label: ${out.n}   (column pass closer in y: ${out.colBetterN})\n`);
console.log("summed |y error| over those marks:");
for (const [k, v] of Object.entries(out.totals)) console.log(`  ${k.padEnd(22)}${v}px`);
console.log(`\nselection rules (agree = how often the rule picks the truly-better pass):`);
for (const [k, v] of Object.entries(out.rules) as any)
  console.log(`  ${k.padEnd(22)}total ${String(v.total).padEnd(9)}agree ${v.agree}/${v.n}`);
console.log("\nfields actually populated on BOTH passes:", JSON.stringify(out.fieldsPresent));
console.log(`\nthe cases that matter (dy > 4px), n=${out.bigDy.length}:`);
console.log("  frame                id    dy    eRow   eCol   colBetter  vm row/col   rows row/col");
for (const r of out.bigDy)
  console.log(`  ${r.frame.padEnd(21)}${String(r.id).padEnd(6)}${String(r.dy).padEnd(6)}${String(r.eRow).padEnd(7)}${String(r.eCol).padEnd(7)}${String(r.colBetter).padEnd(11)}${String(r.vmRow) + "/" + String(r.vmCol)}`.padEnd(100) + `${String(r.rowsRow)}/${String(r.rowsCol)}`);
console.log("pageerrors:", errs.length ? errs.slice(0, 4) : "none");
await browser.close();
