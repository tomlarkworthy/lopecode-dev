// Is the serial-vs-pooled disagreement caused by concurrency, or was it already
// there? Three comparisons against the same serial oracle:
//   single axis            -- baseline: does the pool agree at all?
//   bothAxes, sequential   -- OLD control flow, new frame cache
//   bothAxes, concurrent   -- the shipped change
// Whatever is already false in the first two is not the concurrency's doing.
import { chromium } from "playwright";
import { resolve } from "node:path";
const IN = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const b = await chromium.launch({ headless: true });
const p = await b.newPage();
await p.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await p.goto(`file://${IN}#view=S100(@tomlarkworthy/coded-landmark-tracking)`, { waitUntil: "networkidle", timeout: 300000 });
await p.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 300000 });
await p.waitForTimeout(15000);
console.log(JSON.stringify(await p.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const val = async (n: string) => { const v=[...rt._variables].find((z:any)=>z._module===mod&&z._name===n); return v ? await v._promise : null; };
  const [bank, opts, serial, pooled, pool, rotateFrame, mergeManAxes, wasmOn] = await Promise.all(
    ["hexFrameBank","hexRigOpts","analyzeFrameMan","analyzeFrameManAsync","detectPool","rotateFrame","mergeManAxes","wasmOn"].map(val));
  const frames = (bank as any[]).map((x:any)=>x.frame).filter(Boolean).slice(0,3);
  const single = { ...opts, bothAxes: false }, both = { ...opts, bothAxes: true };
  const sp = { ...single, runRows: pool.runRows };
  const key = (r:any) => [...(r.fused??[]).map((m:any)=>`F${m.id}@${(m.x??0).toFixed(3)},${(m.y??0).toFixed(3)}`),
                          ...(r.unidentified??[]).map((m:any)=>`U@${(m.x??0).toFixed(3)},${(m.y??0).toFixed(3)}`)].sort();
  const out:any = { wasmOn, rows: [] };
  for (const f of frames) {
    const sSingle = serial(f, single);
    const pSingle = await pooled(f, sp);
    const sBoth = serial(f, both);
    const a1 = await pooled(f, sp), b1 = await pooled(rotateFrame(f,1), sp);
    const seqBoth = mergeManAxes(a1, b1, f, both);
    const r = rotateFrame(f,1);
    const [a2, b2] = await Promise.all([pooled(f, sp), pooled(r, sp)]);
    const conBoth = mergeManAxes(a2, b2, f, both);
    out.rows.push({
      singleAxisAgrees: JSON.stringify(key(sSingle)) === JSON.stringify(key(pSingle)),
      bothSequentialAgrees: JSON.stringify(key(sBoth)) === JSON.stringify(key(seqBoth)),
      bothConcurrentAgrees: JSON.stringify(key(sBoth)) === JSON.stringify(key(conBoth)),
      seqVsConIdentical: JSON.stringify(key(seqBoth)) === JSON.stringify(key(conBoth)),
      counts: { serialSingle: (sSingle.fused??[]).length, poolSingle: (pSingle.fused??[]).length,
                serialBoth: (sBoth.fused??[]).length, seq: (seqBoth.fused??[]).length, con: (conBoth.fused??[]).length }
    });
  }
  return out;
}), null, 1));
await b.close();
