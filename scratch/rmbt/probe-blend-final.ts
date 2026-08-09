// Confirm the new default end to end: single axis vs bothAxes-as-shipped-today
// vs bothAxes-with-the-soft-gate, through BOTH the serial path and the pooled
// async path the live camera actually uses.
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
  const [bank, opts, analyze, asyncA, pool, score] = await Promise.all(
    ["hexFrameBank", "hexRigOpts", "analyzeFrameMan", "analyzeFrameManAsync", "detectPool", "hexRigScore"].map(val)
  );
  const ARMS = [
    { tag: "single axis",    o: { bothAxes: false } },
    { tag: "both, old swap", o: { bothAxes: true, axisBlendHalf: Infinity } },
    { tag: "both, NEW d0=3", o: { bothAxes: true } }
  ];
  const run = async (A: any, viaPool: boolean) => {
    const tot: any = { read: 0, located: 0, missing: 0, misplaced: 0, off: 0 };
    const resid: number[] = [];
    for (const bk of bank as any[]) {
      const f = { gray: bk.frame.gray, w: bk.frame.w, h: bk.frame.h };
      const o = { ...opts, ...A.o, ...(viaPool && pool ? { runRows: pool.runRows } : {}) };
      const res = viaPool ? await asyncA(f, o) : analyze(f, o);
      const sc = score(res, bk.truth);
      tot.read += sc.counts.read; tot.located += sc.counts.located;
      tot.missing += sc.counts.missing; tot.misplaced += sc.counts.misplaced;
      tot.off += sc.offTarget.length;
      for (const m of sc.marks) if (m.residualPx != null) resid.push(m.residualPx);
    }
    resid.sort((a, b) => a - b);
    return { ...tot, n: resid.length, p50: +resid[resid.length >> 1].toFixed(2),
      p90: +resid[Math.floor(resid.length * 0.9)].toFixed(2),
      mean: +(resid.reduce((a, c) => a + c, 0) / resid.length).toFixed(3) };
  };
  const serial: any = {}, pooled: any = {};
  for (const A of ARMS) { serial[A.tag] = await run(A, false); pooled[A.tag] = pool ? await run(A, true) : null; }
  return { serial, pooled, hasPool: !!pool, tags: ARMS.map((A) => A.tag) };
}, MERGE_SRC);

const fmt = (r: any) => r ? `read ${String(r.read).padEnd(4)} located ${String(r.located).padEnd(3)} missing ${String(r.missing).padEnd(3)} misplaced ${String(r.misplaced).padEnd(3)} off ${String(r.off).padEnd(3)} | resid p50 ${String(r.p50).padEnd(5)} p90 ${String(r.p90).padEnd(5)} mean ${r.mean}` : "n/a";
console.log("SERIAL path");
for (const t of out.tags) console.log("  " + t.padEnd(16) + fmt(out.serial[t]));
console.log(`\nPOOLED async path (the live camera path)${out.hasPool ? "" : " -- no pool"}`);
for (const t of out.tags) console.log("  " + t.padEnd(16) + fmt(out.pooled[t]));
console.log("pageerrors:", errs.length ? errs.slice(0, 4) : "none");
await browser.close();
