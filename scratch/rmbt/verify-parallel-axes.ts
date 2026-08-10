// Does concurrent bothAxes give the SAME marks, and is it actually faster?
//
// Correctness: the serial analyzeFrameMan still runs its two axes one after the
// other and never touches the pool, so it is an oracle the change cannot have
// moved. Results key on `fused` (identified marks) + `unidentified`.
//
// Speed: comparing bothAxes against single-axis only tells you the algorithm
// does more work. The question is whether CONCURRENCY helped, so run both
// shapes explicitly against the same unchanged single-axis pooled path --
// sequential awaits vs Promise.all -- which isolates exactly the edit.
import { chromium } from "playwright";
import { resolve } from "node:path";

const IN = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs: string[] = [];
page.on("pageerror", (e) => errs.push(e.message.slice(0, 160)));
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${IN}#view=S100(@tomlarkworthy/coded-landmark-tracking)`, { waitUntil: "networkidle", timeout: 300000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 300000 });
await page.waitForTimeout(15000);

const out = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const val = async (n: string) => {
    const v = [...rt._variables].find((z: any) => z._module === mod && z._name === n);
    if (!v) throw new Error("no variable " + n);
    return await v._promise;
  };
  const [bank, opts, serial, pooled, pool, rotateFrame, mergeManAxes] = await Promise.all(
    ["hexFrameBank", "hexRigOpts", "analyzeFrameMan", "analyzeFrameManAsync",
     "detectPool", "rotateFrame", "mergeManAxes"].map(val)
  );
  if (!pool) return { err: "detectPool is null (poolSize 0)" };

  const frames = (bank as any[]).map((b: any) => b.frame).filter(Boolean).slice(0, 4);
  const both = { ...opts, bothAxes: true };
  const single = { ...opts, bothAxes: false };
  const singlePooled = { ...single, runRows: pool.runRows };
  const bothPooled = { ...both, runRows: pool.runRows };

  const key = (r: any) => [
    ...(r.fused ?? []).map((m: any) => `F${m.id}@${(m.x ?? 0).toFixed(3)},${(m.y ?? 0).toFixed(3)}`),
    ...(r.unidentified ?? []).map((m: any) => `U@${(m.x ?? 0).toFixed(3)},${(m.y ?? 0).toFixed(3)}`)
  ].sort();

  const compare = [];
  for (const f of frames) {
    const a = serial(f, both);
    const b = await pooled(f, bothPooled);
    const ka = key(a), kb = key(b);
    compare.push({
      fused: (a.fused ?? []).length, unid: (a.unidentified ?? []).length,
      pooledFused: (b.fused ?? []).length, pooledUnid: (b.unidentified ?? []).length,
      identical: JSON.stringify(ka) === JSON.stringify(kb)
    });
  }

  // The A/B. Both call the SAME unchanged single-axis pooled path.
  const f0 = frames[0];
  const seq = async () => {
    const a = await pooled(f0, singlePooled);
    const b = await pooled(rotateFrame(f0, 1), singlePooled);
    return mergeManAxes(a, b, f0, both);
  };
  const con = async () => {
    const r = rotateFrame(f0, 1);
    const [a, b] = await Promise.all([pooled(f0, singlePooled), pooled(r, singlePooled)]);
    return mergeManAxes(a, b, f0, both);
  };
  for (let i = 0; i < 6; i++) { await seq(); await con(); }   // warm the workers
  const time = async (fn: any, n = 15) => {
    const ts: number[] = [];
    for (let i = 0; i < n; i++) { const t = performance.now(); await fn(); ts.push(performance.now() - t); }
    ts.sort((x, y) => x - y);
    return { p50: +ts[ts.length >> 1].toFixed(2), p10: +ts[Math.floor(n * 0.1)].toFixed(2) };
  };
  // Interleave the arms so drift hits both equally.
  const s1 = await time(seq), c1 = await time(con), s2 = await time(seq), c2 = await time(con);
  const oneAxis = await time(() => pooled(f0, singlePooled));

  return {
    frameSize: `${f0.w}x${f0.h}`, poolSize: pool.size, compare,
    singleAxis: oneAxis,
    sequential: { run1: s1, run2: s2 },
    concurrent: { run1: c1, run2: c2 },
    speedup: +(((s1.p50 + s2.p50) / (c1.p50 + c2.p50))).toFixed(2)
  };
});
console.log(JSON.stringify(out, null, 1));
console.log("pageerrors:", errs.length ? errs.slice(0, 5) : "none");
await browser.close();
