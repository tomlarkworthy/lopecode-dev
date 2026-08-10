// Does the LIVE cascade already carry the per-mark local metric that
// fitPlaneMetric wants? solveMan fits an A while decoding, so the constraints
// may already be sitting on every fused mark, unused by the live pose.
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
  const [bank, opts, analyze] = await Promise.all(["hexFrameBank","hexRigOpts","analyzeFrameMan"].map(val));
  const bk: any = (bank as any[])[3];
  const res = analyze({ gray: bk.frame.gray, w: bk.frame.w, h: bk.frame.h }, opts);
  const f = (res.fused ?? [])[0];
  const shape = (o: any) => o && typeof o === "object"
    ? Object.fromEntries(Object.entries(o).map(([k, v]: any) => [k,
        Array.isArray(v) ? `Array(${v.length})=${JSON.stringify(v.slice(0,4))}` :
        typeof v === "object" && v ? "obj{" + Object.keys(v).slice(0,10).join(",") + "}" :
        typeof v === "number" ? +v.toFixed(4) : typeof v])) : typeof o;
  return {
    frame: bk.name,
    fusedCount: (res.fused ?? []).length,
    markKeys: f ? Object.keys(f) : null,
    mark: f ? shape(f) : null,
    hasA: f ? ["A","Amm","a","axis","metric","J"].filter(k => k in f) : null
  };
}), null, 1));
await b.close();
