// Is sqrt(a*b) from a fused mark the same radius the target calls radiusMm?
// If it is some other feature radius, Amm is globally mis-scaled and the metric
// fit was handed a systematic error rather than a noisy measurement.
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
  const ratios: number[] = [];
  const sample: any[] = [];
  for (const bk of (bank as any[])) {
    const res = analyze({ gray: bk.frame.gray, w: bk.frame.w, h: bk.frame.h }, opts);
    const byId = new Map((bk.truth as any[]).map((t:any)=>[t.id,t]));
    for (const f of (res.fused ?? [])) {
      const t: any = byId.get(f.id);
      if (!t || !(t.radiusPx > 0) || !(f.a > 0 && f.b > 0)) continue;
      const r = Math.sqrt(f.a * f.b) / t.radiusPx;
      ratios.push(r);
      if (sample.length < 6) sample.push({ id: f.id, a: +f.a.toFixed(1), b: +f.b.toFixed(1),
        geo: +Math.sqrt(f.a*f.b).toFixed(1), truthRadiusPx: +t.radiusPx.toFixed(1), ratio: +r.toFixed(3) });
    }
  }
  ratios.sort((x,y)=>x-y);
  return { n: ratios.length, sample,
    ratioP50: +ratios[ratios.length>>1].toFixed(3),
    ratioP10: +ratios[Math.floor(ratios.length*0.1)].toFixed(3),
    ratioP90: +ratios[Math.floor(ratios.length*0.9)].toFixed(3) };
}), null, 1));
await b.close();
