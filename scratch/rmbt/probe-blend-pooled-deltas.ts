// Which marks the soft gate hurts on the pooled path, and by how much. The
// paired count favours it 16/4 while the mean opposes it, so the answer is
// whether the 4 are a handful of large regressions or a broad tail.
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
  const [bank, opts, asyncA, pool, score] = await Promise.all(
    ["hexFrameBank", "hexRigOpts", "analyzeFrameManAsync", "detectPool", "hexRigScore"].map(val)
  );
  const grab = async (d0: number) => {
    const R = new Map<string, any>();
    for (const bk of bank as any[]) {
      const r = await asyncA({ gray: bk.frame.gray, w: bk.frame.w, h: bk.frame.h },
        { ...opts, bothAxes: true, axisBlendHalf: d0, runRows: pool.runRows });
      const sc = score(r, bk.truth);
      const byId = new Map((r.fused ?? []).map((f: any) => [f.id, f]));
      for (const m of sc.marks) if (m.residualPx != null) {
        const f: any = byId.get(m.id);
        R.set(bk.name + "/" + m.id, { e: m.residualPx, dy: f?.dyPx, dx: f?.dxPx, axis: f?.axis });
      }
    }
    return R;
  };
  const A = await grab(Infinity), B = await grab(3);
  const rows: any[] = [];
  for (const [k, a] of A) { const b = B.get(k); if (!b) continue;
    rows.push({ k, old: +a.e.toFixed(2), nw: +b.e.toFixed(2), d: +(b.e - a.e).toFixed(2),
                dy: a.dy, dx: a.dx, axis: a.axis }); }
  rows.sort((x, y) => y.d - x.d);
  const worse = rows.filter((r) => r.d > 0.01), better = rows.filter((r) => r.d < -0.01);
  const sum = (v: any[]) => +v.reduce((a: number, c: any) => a + c.d, 0).toFixed(2);
  return { top: rows.slice(0, 8), bottom: rows.slice(-8).reverse(),
    nWorse: worse.length, nBetter: better.length,
    sumWorse: sum(worse), sumBetter: sum(better), total: sum(rows) };
}, MERGE_SRC);

console.log("marks the soft gate HURTS most (pooled path):");
console.log("  mark                          old ->  new    delta   dy     dx    axis");
for (const r of out.top) console.log(`  ${r.k.slice(0, 28).padEnd(30)}${String(r.old).padEnd(8)}${String(r.nw).padEnd(7)}${String(r.d).padEnd(8)}${String(r.dy).padEnd(7)}${String(r.dx).padEnd(6)}${r.axis}`);
console.log("\nmarks it HELPS most:");
for (const r of out.bottom) console.log(`  ${r.k.slice(0, 28).padEnd(30)}${String(r.old).padEnd(8)}${String(r.nw).padEnd(7)}${String(r.d).padEnd(8)}${String(r.dy).padEnd(7)}${String(r.dx).padEnd(6)}${r.axis}`);
console.log(`\n${out.nBetter} marks better (total ${out.sumBetter}px), ${out.nWorse} worse (total +${out.sumWorse}px), net ${out.total}px`);
await browser.close();
