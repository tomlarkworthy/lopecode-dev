// Is the residual-vs-LOO conflict just two different frame populations?
//
// LOO needs fused >= 6, so it can only sample rich frames. If fusion helps
// rich frames and hurts sparse ones, then "shipped wins LOO, find-only wins
// residual" is one fact, not two, and the fix is a per-frame (or per-mark)
// gate rather than a global constant.
import { chromium } from "playwright";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";

const t = readFileSync("modules/@tomlarkworthy/coded-landmark-tracking.js", "utf8");
const s = t.indexOf("const _1m3an4z = function _mergeManAxes(");
const e = t.indexOf("\nconst _", s + 10);
const MERGE_SRC = t.slice(s, e).replace(/^const _1m3an4z = /, "").replace(/;\s*$/, "");

const IN = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${IN}#view=S100(@tomlarkworthy/coded-landmark-tracking)`, { waitUntil: "networkidle", timeout: 300000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 300000 });
await page.waitForTimeout(15000);

const out = await page.evaluate(async (MERGE_SRC: string) => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const val = async (n: string) => {
    const v = [...rt._variables].find((z: any) => z._module === mod && z._name === n);
    if (!v) throw new Error("no variable " + n); return await v._promise;
  };
  mod.redefine("mergeManAxes", ["unrotatePoint"], (0, eval)("(" + MERGE_SRC + ")"));
  await new Promise((r) => setTimeout(r, 1500));
  const [bank, opts, analyze, ransac, T, score] = await Promise.all(
    ["hexFrameBank", "hexRigOpts", "analyzeFrameMan", "fitPlaneRansac", "hexTarget", "hexRigScore"].map(val)
  );

  const ARMS = [
    { tag: "shipped", o: { bothAxes: true, axisBlendX: 1, axisBlendY: 1 } },
    { tag: "findonly", o: { bothAxes: true, axisBlendX: 1, axisBlendY: 0 } }
  ];
  const rows: any[] = [];
  for (const bk of bank as any[]) {
    const rec: any = { name: bk.name, dims: bk.frame.w + "x" + bk.frame.h };
    for (const A of ARMS) {
      const res = analyze({ gray: bk.frame.gray, w: bk.frame.w, h: bk.frame.h }, { ...opts, ...A.o });
      const sc = score(res, bk.truth);
      const d = sc.marks.map((m: any) => m.residualPx).filter((x: any) => x != null).sort((a: number, b: number) => a - b);
      const marks = (res.fused ?? []).filter((f: any) => T.byId.has(f.id)).map((f: any) => ({ x: f.xc, y: f.yc, id: f.id }));
      const byId = new Map((bk.truth as any[]).map((x: any) => [x.id, x]));
      const le: number[] = [];
      for (const held of marks) {
        const tr: any = byId.get(held.id); if (!tr) continue;
        const rest = marks.filter((z) => z !== held);
        if (rest.length < 5) continue;
        const pl = ransac(rest); if (!pl || !pl.fit) continue;
        const mk = T.byId.get(held.id);
        const [px, py] = pl.fit.map(mk.xMm, mk.yMm);
        le.push(Math.hypot(px - tr.x, py - tr.y));
      }
      le.sort((a, b) => a - b);
      // How many rows/cols each pass actually saw for this frame's marks --
      // the candidate signal for a per-mark gate.
      const cov = (res.fused ?? []).filter((f: any) => f.axis === "both");
      rec[A.tag] = { fused: (res.fused ?? []).length, both: cov.length,
        rp50: d.length ? +d[d.length >> 1].toFixed(2) : null, rn: d.length,
        lp50: le.length ? +le[le.length >> 1].toFixed(2) : null, ln: le.length,
        crossPx: cov.length ? +(cov.reduce((a: number, c: any) => a + Math.abs(c.crossPx || 0), 0) / cov.length).toFixed(2) : null };
    }
    rows.push(rec);
  }
  return rows;
}, MERGE_SRC);

console.log("frame                      dims       fused both crossPx | resid p50 ship/find | LOO n  p50 ship/find");
let richShip = 0, richFind = 0, sparseShip = 0, sparseFind = 0, richN = 0, sparseN = 0;
for (const r of out) {
  const rich = r.shipped.fused >= 6;
  console.log(`${String(r.name).slice(0, 25).padEnd(26)}${r.dims.padEnd(11)}${String(r.shipped.fused).padEnd(6)}` +
    `${String(r.shipped.both).padEnd(5)}${String(r.shipped.crossPx).padEnd(8)}| ` +
    `${String(r.shipped.rp50).padEnd(5)}/ ${String(r.findonly.rp50).padEnd(10)}| ` +
    `${String(r.shipped.ln).padEnd(6)}${String(r.shipped.lp50).padEnd(5)}/ ${r.findonly.lp50}   ${rich ? "RICH" : "sparse"}`);
  if (r.shipped.rp50 != null && r.findonly.rp50 != null) {
    if (rich) { richShip += r.shipped.rp50; richFind += r.findonly.rp50; richN++; }
    else { sparseShip += r.shipped.rp50; sparseFind += r.findonly.rp50; sparseN++; }
  }
}
console.log(`\nmean of per-frame residual p50:`);
console.log(`  RICH   (fused>=6, n=${richN}):  shipped ${(richShip / richN).toFixed(2)}  find-only ${(richFind / richN).toFixed(2)}`);
console.log(`  sparse (fused<6,  n=${sparseN}):  shipped ${(sparseShip / sparseN).toFixed(2)}  find-only ${(sparseFind / sparseN).toFixed(2)}`);
await browser.close();
