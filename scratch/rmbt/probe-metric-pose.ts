// Would the live pose be better if it used the metric each mark already measures?
//
// Every fused mark carries its image ellipse (a, b, tiltDeg) -- which IS the local
// metric, 3 numbers -- but the live pose goes through centre-only fitHomography.
// fitPlaneMetric exists and is wired only into the offline relabelling pass.
//
// Comparison is leave-one-out against the FROZEN labels: refit the plane without a
// mark, predict where that mark should be, and measure against the label rather than
// against the detection that was excluded. Non-circular, and identical for both arms
// so the only difference is whether Amm was supplied.
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
  const [bank, opts, analyze, ransac, T] = await Promise.all(
    ["hexFrameBank", "hexRigOpts", "analyzeFrameMan", "fitPlaneRansac", "hexTarget"].map(val)
  );

  // Image ellipse -> A (image px -> plane mm). Only A'A is observed, so the
  // unobservable in-plane rotation is dropped. Self-checked below.
  const ammFrom = (m: any, sign: number) => {
    if (!(m.a > 0 && m.b > 0)) return null;
    const th = sign * (m.tiltDeg * Math.PI) / 180;
    const R = T.radiusMm, c = Math.cos(th), s = Math.sin(th);
    return [(R / m.a) * c, (R / m.a) * s, -(R / m.b) * s, (R / m.b) * c];
  };
  const len = (M: number[], dx: number, dy: number) =>
    Math.hypot(M[0] * dx + M[1] * dy, M[2] * dx + M[3] * dy);

  // Self-check: a displacement of `a` px along the major axis must be radiusMm.
  const checks: any[] = [];
  const mkMarks = (res: any, sign: number, withMetric: boolean) =>
    (res.fused ?? []).filter((f: any) => T.byId.has(f.id)).map((f: any) => {
      const A = withMetric ? ammFrom(f, sign) : null;
      if (A && checks.length < 5) {
        const th = sign * (f.tiltDeg * Math.PI) / 180;
        checks.push(+len(A, f.a * Math.cos(th), f.a * Math.sin(th)).toFixed(4));
      }
      return { x: f.xc, y: f.yc, id: f.id, Amm: A || undefined,
               radiusPx: A ? Math.sqrt(f.a * f.b) : undefined };
    });

  const looErrors = (marks: any[], truth: any[]) => {
    const errs: any[] = [];
    const byId = new Map(truth.map((t: any) => [t.id, t]));
    for (const held of marks) {
      const t = byId.get(held.id);
      if (!t) continue;
      const rest = marks.filter((m) => m !== held);
      if (rest.length < 4) continue;
      const plane = ransac(rest);
      if (!plane || !plane.fit) continue;
      const mk = T.byId.get(held.id);
      const [px, py] = plane.fit.map(mk.xMm, mk.yMm);
      errs.push({ id: held.id, e: Math.hypot(px - t.x, py - t.y) }); // vs the FROZEN label
    }
    return errs;
  };

  // Paired: a held-out mark counts only when EVERY arm produced a fit for it.
  // The metric arm accepts fits the centre-only gate rejects (redundancy >= 8 vs
  // 5 inliers), so unpaired totals compare it on a strictly harder set.
  const arms: any = { centreOnly: [], metricPos: [], metricNeg: [] };
  let onlyMetricCould = 0;
  for (const bk of bank as any[]) {
    const res = analyze({ gray: bk.frame.gray, w: bk.frame.w, h: bk.frame.h }, opts);
    const c = looErrors(mkMarks(res, 1, false), bk.truth);
    const mp = looErrors(mkMarks(res, +1, true), bk.truth);
    const mn = looErrors(mkMarks(res, -1, true), bk.truth);
    const cm = new Map(c.map((x: any) => [x.id, x.e]));
    const nm = new Map(mn.map((x: any) => [x.id, x.e]));
    for (const x of mp) {
      if (cm.has(x.id) && nm.has(x.id)) {
        arms.centreOnly.push(cm.get(x.id)); arms.metricPos.push(x.e); arms.metricNeg.push(nm.get(x.id));
      } else onlyMetricCould++;
    }
  }
  (globalThis as any).__onlyMetric = onlyMetricCould;
  const stat = (v: number[]) => {
    const s = v.slice().sort((a, b) => a - b);
    return s.length ? { n: s.length, p50: +s[s.length >> 1].toFixed(2),
      p90: +s[Math.floor(s.length * 0.9)].toFixed(2), worst: +s[s.length - 1].toFixed(2),
      mean: +(s.reduce((a, c) => a + c, 0) / s.length).toFixed(2) } : null;
  };
  return { radiusMm: T.radiusMm, selfCheck: checks, onlyMetricCould,
    centreOnly: stat(arms.centreOnly), metricPos: stat(arms.metricPos), metricNeg: stat(arms.metricNeg) };
});

console.log("radiusMm:", out.radiusMm);
console.log("self-check len(A, a*u_theta) should equal radiusMm:", out.selfCheck);
console.log("\nleave-one-out error vs FROZEN labels (px):");
console.log("  centre only  :", JSON.stringify(out.centreOnly));
console.log("  + metric (+θ):", JSON.stringify(out.metricPos));
console.log("  + metric (-θ):", JSON.stringify(out.metricNeg));
console.log("\nheld-out marks only the METRIC arm could fit at all:", (out as any).onlyMetricCould);
console.log("pageerrors:", errs.length ? errs.slice(0, 4) : "none");
await browser.close();
