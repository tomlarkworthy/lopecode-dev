// Sweep how much of the column pass's measured y to take. 1.0 reproduces the
// shipped hard swap exactly, so the sweep contains its own control; 0.0 is the
// opposite swap and should be clearly bad, which is the sanity check that the
// knob is wired to anything at all.
//
// Scored two ways against the FROZEN labels: direct per-mark residual, and
// leave-one-out plane prediction (refit without a mark, predict it, compare to
// its label -- never to the detection that was removed).
import { chromium } from "playwright";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";

const t = readFileSync("modules/@tomlarkworthy/coded-landmark-tracking.js", "utf8");
const s = t.indexOf("const _1m3an4z = function _mergeManAxes(");
const e = t.indexOf("\nconst _", s + 10);
const MERGE_SRC = t.slice(s, e).replace(/^const _1m3an4z = /, "").replace(/;\s*$/, "");
if (!/axisBlend/.test(MERGE_SRC)) throw new Error("patched mergeManAxes not found");

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
  // Swap in the blend-capable merge, then re-read the cells that close over it.
  mod.redefine("mergeManAxes", ["unrotatePoint"], (0, eval)("(" + MERGE_SRC + ")"));
  await new Promise((r) => setTimeout(r, 1500));
  const [bank, opts, analyze, ransac, T, score] = await Promise.all(
    ["hexFrameBank", "hexRigOpts", "analyzeFrameMan", "fitPlaneRansac", "hexTarget", "hexRigScore"].map(val)
  );

  const run = (o: any) => {
    const resid: number[] = [], loo: number[] = [];
    let read = 0, missing = 0;
    for (const bk of bank as any[]) {
      const res = analyze({ gray: bk.frame.gray, w: bk.frame.w, h: bk.frame.h }, o);
      const sc = score(res, bk.truth);
      read += sc.counts.read; missing += sc.counts.missing;
      for (const m of sc.marks) if (m.residualPx != null) resid.push(m.residualPx);
      const marks = (res.fused ?? []).filter((f: any) => T.byId.has(f.id))
        .map((f: any) => ({ x: f.xc, y: f.yc, id: f.id }));
      const byId = new Map((bk.truth as any[]).map((x: any) => [x.id, x]));
      for (const held of marks) {
        const tr: any = byId.get(held.id);
        if (!tr) continue;
        const rest = marks.filter((z) => z !== held);
        if (rest.length < 4) continue;
        const plane = ransac(rest);
        if (!plane || !plane.fit) continue;
        const mk = T.byId.get(held.id);
        const [px, py] = plane.fit.map(mk.xMm, mk.yMm);
        loo.push(Math.hypot(px - tr.x, py - tr.y));
      }
    }
    const st = (v: number[]) => { const q = v.slice().sort((a, b) => a - b);
      return q.length ? { n: q.length, p50: +q[q.length >> 1].toFixed(2),
        p90: +q[Math.floor(q.length * 0.9)].toFixed(2),
        mean: +(q.reduce((a, c) => a + c, 0) / q.length).toFixed(2) } : null; };
    return { read, missing, resid: st(resid), loo: st(loo) };
  };

  const rows: any[] = [];
  rows.push({ arm: "single axis", ...run({ ...opts, bothAxes: false }) });
  for (const wB of [1, 0.95, 0.89, 0.8, 0.65, 0.5, 0]) {
    rows.push({ arm: "both, blend " + wB, ...run({ ...opts, bothAxes: true, axisBlend: wB }) });
  }
  return rows;
}, MERGE_SRC);

console.log("arm                 read  miss |  resid p50  p90   mean |  LOO p50   p90    mean   n");
for (const r of out) {
  console.log(`${String(r.arm).padEnd(20)}${String(r.read).padEnd(6)}${String(r.missing).padEnd(5)}|  ` +
    `${String(r.resid?.p50).padEnd(11)}${String(r.resid?.p90).padEnd(6)}${String(r.resid?.mean).padEnd(7)}|  ` +
    `${String(r.loo?.p50).padEnd(10)}${String(r.loo?.p90).padEnd(7)}${String(r.loo?.mean).padEnd(7)}${r.loo?.n}`);
}
await browser.close();
