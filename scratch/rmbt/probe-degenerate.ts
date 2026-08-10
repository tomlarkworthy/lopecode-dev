// Is hexcase-5ivq-06 explained by "an exact four-point fit extrapolates"? No --
// three of its four reads are the hexagon's centre and two opposite vertices,
// which are collinear BY CONSTRUCTION, so the homography is not determined at
// all. This tabulates every bank frame: what it read, whether the read set
// contains a collinear triple, and what the pose accounting made of it.
import { chromium } from "playwright";
import { resolve } from "node:path";
const IN = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
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
  const V = async (n: string) => { const v = [...rt._variables].find((z: any) => z._module === mod && z._name === n); return v ? await v._promise : undefined; };
  const T: any = await V("hexTarget"), bank: any = await V("hexFrameBank");
  const A: any = await V("analyzeFrameMan"), P: any = await V("fitHexPose");
  const pl = (id: number) => { const m = T.byId.get(id); return [m.xMm, m.yMm]; };
  const perp = (p: any, q: any, r: any) => { const L = Math.hypot(q[0]-p[0], q[1]-p[1]);
    return L ? Math.abs((q[0]-p[0])*(r[1]-p[1]) - (q[1]-p[1])*(r[0]-p[0])) / L : 0; };
  const degen = (set: number[]) => {
    for (let i = 0; i < set.length; i++) for (let j = i+1; j < set.length; j++) for (let k = j+1; k < set.length; k++)
      if (perp(pl(set[i]), pl(set[j]), pl(set[k])) < 1e-6) return [set[i], set[j], set[k]].join(",");
    return null;
  };
  const ids = T.marks.map((m: any) => m.id);
  let bad = 0, tot = 0;
  for (let a = 0; a < 7; a++) for (let b = a+1; b < 7; b++) for (let c = b+1; c < 7; c++) for (let d = c+1; d < 7; d++) {
    tot++; if (degen([ids[a], ids[b], ids[c], ids[d]])) bad++;
  }
  const rows: string[] = [];
  for (const f of bank) {
    const res = A({ gray: f.frame.gray, w: f.frame.w, h: f.frame.h }, { stride: 4 });
    const read = res.fused.map((x: any) => x.id).filter((id: number) => T.byId.has(id));
    const pose = P({ ...res, w: f.frame.w, h: f.frame.h });
    const dg = read.length >= 3 ? degen(read) : null;
    const truth = new Map((f.truth ?? []).map((t: any) => [t.id, t]));
    let worst = 0;
    if (pose.ok) for (const m of pose.marks) {
      const t: any = truth.get(m.id);
      if (t && m.predicted) worst = Math.max(worst, Math.hypot(m.predicted.x - t.x, m.predicted.y - t.y));
    }
    rows.push(`${f.name.padEnd(20)} read ${String(read.length).padStart(2)}  ${pose.ok ? `missing ${pose.counts.missing}` : "no plane "}` +
      `  worst pred-vs-label ${worst.toFixed(0).padStart(4)}px  ${dg ? `collinear ${dg}` : "-"}${dg && read.length === 4 ? "   <-- UNDETERMINED" : ""}`);
  }
  return { degenerateSubsets: `${bad} of ${tot}`, rows };
});
console.log("degenerate 4-subsets of the target:", out.degenerateSubsets);
console.log(out.rows.join("\n"));
console.log("pageerrors:", errs.length ? errs.slice(0, 3) : "none");
await browser.close();
