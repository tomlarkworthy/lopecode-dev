// Paired version of the blend sweep. The unpaired run had n drifting 34/35, so
// each arm was scored on a slightly different set of held-out marks -- exactly
// the confound that made the metric-pose comparison misleading before.
//
// Here a mark counts only when EVERY blend produced both a residual and a LOO
// prediction for it, so the columns differ only in the blend weight.
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

  const WS = [1, 0.95, 0.89, 0.8, 0.65, 0.5, 0.35, 0.2, 0];
  const resid: Record<string, Map<string, number>> = {};
  const loo: Record<string, Map<string, number>> = {};
  const counts: Record<string, any> = {};
  const perFrame: Record<string, any[]> = {};

  for (const wB of WS) {
    const k = String(wB);
    resid[k] = new Map(); loo[k] = new Map(); perFrame[k] = [];
    counts[k] = { read: 0, missing: 0, misplaced: 0, off: 0 };
    for (const bk of bank as any[]) {
      const res = analyze({ gray: bk.frame.gray, w: bk.frame.w, h: bk.frame.h },
                          { ...opts, bothAxes: true, axisBlend: wB });
      const sc = score(res, bk.truth);
      counts[k].read += sc.counts.read; counts[k].missing += sc.counts.missing;
      counts[k].misplaced += sc.counts.misplaced; counts[k].off += sc.offTarget.length;
      const fr: number[] = [];
      for (const m of sc.marks) if (m.residualPx != null) {
        resid[k].set(bk.name + "/" + m.id, m.residualPx); fr.push(m.residualPx);
      }
      const marks = (res.fused ?? []).filter((f: any) => T.byId.has(f.id))
        .map((f: any) => ({ x: f.xc, y: f.yc, id: f.id }));
      const byId = new Map((bk.truth as any[]).map((x: any) => [x.id, x]));
      for (const held of marks) {
        const tr: any = byId.get(held.id); if (!tr) continue;
        const rest = marks.filter((z) => z !== held);
        if (rest.length < 5) continue;              // fused >= 6 -> redundancy
        const plane = ransac(rest); if (!plane || !plane.fit) continue;
        const mk = T.byId.get(held.id);
        const [px, py] = plane.fit.map(mk.xMm, mk.yMm);
        loo[k].set(bk.name + "/" + held.id, Math.hypot(px - tr.x, py - tr.y));
      }
      fr.sort((a, b) => a - b);
      perFrame[k].push({ name: bk.name, n: fr.length, p50: fr.length ? +fr[fr.length >> 1].toFixed(2) : null });
    }
  }

  const common = (M: Record<string, Map<string, number>>) => {
    const ks = WS.map(String);
    let set = [...M[ks[0]].keys()];
    for (const k of ks.slice(1)) set = set.filter((x) => M[k].has(x));
    return set;
  };
  const rKeys = common(resid), lKeys = common(loo);
  const stat = (v: number[]) => { const q = v.slice().sort((a, b) => a - b);
    return q.length ? { n: q.length, p50: +q[q.length >> 1].toFixed(2),
      p90: +q[Math.floor(q.length * 0.9)].toFixed(2), worst: +q[q.length - 1].toFixed(2),
      mean: +(q.reduce((a, c) => a + c, 0) / q.length).toFixed(3) } : null; };

  const rows = WS.map((wB) => {
    const k = String(wB);
    const rv = rKeys.map((x) => resid[k].get(x)!), lv = lKeys.map((x) => loo[k].get(x)!);
    const base = String(WS[0]);
    const better = rKeys.filter((x) => resid[k].get(x)! < resid[base].get(x)! - 1e-9).length;
    const worse = rKeys.filter((x) => resid[k].get(x)! > resid[base].get(x)! + 1e-9).length;
    return { wB, counts: counts[k], resid: stat(rv), loo: stat(lv), better, worse };
  });
  return { rows, rN: rKeys.length, lN: lKeys.length, perFrame };
}, MERGE_SRC);

console.log(`paired on ${out.rN} residual marks / ${out.lN} LOO marks (present at every blend)\n`);
console.log("blend  read miss |  resid p50   p90   mean   worst | vs w=1 better/worse |  LOO p50   p90   mean   worst");
for (const r of out.rows) {
  console.log(`${String(r.wB).padEnd(7)}${String(r.counts.read).padEnd(5)}${String(r.counts.missing).padEnd(6)}|  ` +
    `${String(r.resid?.p50).padEnd(11)}${String(r.resid?.p90).padEnd(6)}${String(r.resid?.mean).padEnd(7)}${String(r.resid?.worst).padEnd(8)}| ` +
    `${String(r.better + "/" + r.worse).padEnd(20)}|  ` +
    `${String(r.loo?.p50).padEnd(10)}${String(r.loo?.p90).padEnd(6)}${String(r.loo?.mean).padEnd(7)}${r.loo?.worst}`);
}
console.log("\nper-frame residual p50 by blend:");
const names = out.perFrame["1"].map((x: any) => x.name);
const hdr = Object.keys(out.perFrame);
console.log("  frame".padEnd(30) + hdr.map((h) => ("w=" + h).padEnd(8)).join(""));
for (let i = 0; i < names.length; i++) {
  console.log("  " + String(names[i]).slice(0, 26).padEnd(28) +
    hdr.map((h) => String(out.perFrame[h][i].p50).padEnd(8)).join(""));
}
console.log("pageerrors:", errs.length ? errs.slice(0, 4) : "none");
await browser.close();
