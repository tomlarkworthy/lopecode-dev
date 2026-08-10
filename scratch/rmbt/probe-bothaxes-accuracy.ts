// Does scanning both directions actually read more marks, or place them better?
//
// Scored the way hexBankScores does it: every bank frame replayed through the
// cascade and compared against the FROZEN §4.7 labels, so the reference cannot
// move when the setting does. Uses the serial analyzeFrameMan (not the pool) on
// purpose -- there is a pre-existing serial-vs-pooled disagreement, and letting
// it into this comparison would confound the axis question with that one.
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
  const [bank, opts, analyze, score] = await Promise.all(
    ["hexFrameBank", "hexRigOpts", "analyzeFrameMan", "hexRigScore"].map(val)
  );

  const run = (bothAxes: boolean) => {
    const o = { ...opts, bothAxes };
    const tot: any = { marks: 0, read: 0, located: 0, missing: 0, misplaced: 0, off: 0, ms: 0 };
    const resid: number[] = [];
    const per: any[] = [];
    for (const b of bank as any[]) {
      const res = analyze({ gray: b.frame.gray, w: b.frame.w, h: b.frame.h }, o);
      const s = score(res, b.truth);
      const d = s.marks.map((m: any) => m.residualPx).filter((x: any) => x != null);
      tot.marks += b.truth.length;
      tot.read += s.counts.read; tot.located += s.counts.located;
      tot.missing += s.counts.missing; tot.misplaced += s.counts.misplaced;
      tot.off += s.offTarget.length; tot.ms += res.ms;
      resid.push(...d);
      per.push({ name: b.name, read: s.counts.read, missing: s.counts.missing,
                 misplaced: s.counts.misplaced, off: s.offTarget.length,
                 p50: d.length ? +d.slice().sort((x: number, y: number) => x - y)[d.length >> 1].toFixed(2) : null });
    }
    resid.sort((a, b) => a - b);
    return {
      ...tot, ms: Math.round(tot.ms),
      residP50: resid.length ? +resid[resid.length >> 1].toFixed(3) : null,
      residP90: resid.length ? +resid[Math.floor(resid.length * 0.9)].toFixed(3) : null,
      worst: resid.length ? +resid[resid.length - 1].toFixed(2) : null,
      per
    };
  };

  const single = run(false);
  const both = run(true);
  return { frames: (bank as any[]).length, single, both };
});

const f = (r: any) => `read ${r.read}/${r.marks}  located ${r.located}  missing ${r.missing}  misplaced ${r.misplaced}  offTarget ${r.off}  |  resid p50 ${r.residP50}  p90 ${r.residP90}  worst ${r.worst}  |  ${r.ms}ms`;
console.log(`frames: ${out.frames}`);
console.log("single axis :", f(out.single));
console.log("both axes   :", f(out.both));
console.log("\nper-frame (name: read / missing / misplaced / offTarget / residP50)");
for (let i = 0; i < out.single.per.length; i++) {
  const a = out.single.per[i], b = out.both.per[i];
  const ch = (a.read !== b.read || a.missing !== b.missing || a.misplaced !== b.misplaced || a.off !== b.off) ? "  <-- differs" : "";
  console.log(`  ${String(a.name).slice(0, 26).padEnd(27)} 1ax ${a.read}/${a.missing}/${a.misplaced}/${a.off} p50 ${String(a.p50).padEnd(6)}   2ax ${b.read}/${b.missing}/${b.misplaced}/${b.off} p50 ${String(b.p50).padEnd(6)}${ch}`);
}
console.log("pageerrors:", errs.length ? errs.slice(0, 4) : "none");
await browser.close();
