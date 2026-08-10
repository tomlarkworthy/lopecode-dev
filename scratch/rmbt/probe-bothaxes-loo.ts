// The metric mergeManAxes was actually tuned on: worst-case leave-one-out
// prediction error. Independent of the frozen labels -- it refits the homography
// without each mark and predicts it -- so it answers "is the POSE better",
// which is what the tracker exists to produce.
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
const out = await p.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const val = async (n: string) => { const v=[...rt._variables].find((z:any)=>z._module===mod&&z._name===n); return v ? await v._promise : null; };
  const [bank, opts, analyze, loo] = await Promise.all(["hexFrameBank","hexRigOpts","analyzeFrameMan","hexRigLoo"].map(val));
  const run = (bothAxes: boolean) => (bank as any[]).map((bk: any) => {
    const res = analyze({ gray: bk.frame.gray, w: bk.frame.w, h: bk.frame.h }, { ...opts, bothAxes });
    const L: any = loo(res);
    return { name: bk.name, fused: (res.fused ?? []).length, worstPx: L ? +L.worstPx.toFixed(2) : null };
  });
  return { single: run(false), both: run(true) };
});
const stat = (rows: any[], minFused = 0) => {
  const v = rows.filter(r => r.fused >= minFused).map(r => r.worstPx).filter(x => x != null).sort((a: number, b: number) => a - b);
  return { n: v.length, p50: v.length ? +v[v.length>>1].toFixed(2) : null,
           worst: v.length ? +v[v.length-1].toFixed(2) : null,
           mean: v.length ? +(v.reduce((a:number,c:number)=>a+c,0)/v.length).toFixed(2) : null };
};
console.log("LOO worst-case prediction error (px), per frame:\n");
console.log("  frame                        1-axis     2-axis");
for (let i=0;i<out.single.length;i++) {
  const a=out.single[i], c=out.both[i];
  const mark = (a.worstPx!=null&&c.worstPx!=null) ? (c.worstPx < a.worstPx*0.9 ? "  BETTER" : c.worstPx > a.worstPx*1.1 ? "  worse" : "") : "";
  console.log(`  ${String(a.name).slice(0,26).padEnd(28)} n=${a.fused}/${c.fused}  ${String(a.worstPx).padEnd(10)} ${String(c.worstPx).padEnd(9)}${mark}`);
}
console.log("\n  ALL frames        single:", JSON.stringify(stat(out.single)), " both:", JSON.stringify(stat(out.both)));
// LOO needs redundancy: 4 points fit a homography exactly, so at 5 marks the
// held-out prediction is unconstrained and the number is noise, not error.
console.log("  fused >= 6        single:", JSON.stringify(stat(out.single, 6)), " both:", JSON.stringify(stat(out.both, 6)));
console.log("  fused >= 7        single:", JSON.stringify(stat(out.single, 7)), " both:", JSON.stringify(stat(out.both, 7)));
// Paired: only frames where BOTH arms have enough redundancy to be comparable.
const pairs = out.single.map((s: any, i: number) => ({ s, c: out.both[i] }))
  .filter((x: any) => x.s.fused >= 6 && x.c.fused >= 6 && x.s.worstPx != null && x.c.worstPx != null);
console.log("  paired, both n>=6 :", pairs.length, "frames");
for (const x of pairs) console.log(`     ${String(x.s.name).slice(0,24).padEnd(26)} ${x.s.worstPx} -> ${x.c.worstPx}`);
await b.close();
