// Centres-only vs centres+widths, on the same detections.
//
// The two arms share one analyzeFrameMan call per frame, so the detector is
// literally identical between them and every difference is the plane fit. That
// is what opts.useScale is for. Running the bank twice through two builds would
// not have this control -- the row scan is deterministic but the comparison
// would no longer prove it.
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
  const perp = (p: any, q: any, r: any) => { const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
    return L ? Math.abs((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])) / L : 0; };
  const degen = (set: number[]) => {
    for (let i = 0; i < set.length; i++) for (let j = i + 1; j < set.length; j++) for (let k = j + 1; k < set.length; k++)
      if (perp(pl(set[i]), pl(set[j]), pl(set[k])) < 1e-6) return true;
    return false;
  };

  const score = (pose: any, f: any) => {
    if (!pose.ok) return { worst: NaN, missing: NaN, located: NaN, rms: NaN, ms: 0 };
    const truth = new Map((f.truth ?? []).map((t: any) => [t.id, t]));
    let worst = 0;
    for (const m of pose.marks) {
      const t: any = truth.get(m.id);
      if (t && m.predicted) worst = Math.max(worst, Math.hypot(m.predicted.x - t.x, m.predicted.y - t.y));
    }
    return { worst, missing: pose.counts.missing, located: pose.counts.located,
             rms: pose.fit ? pose.fit.rmsResidual : NaN };
  };

  const rows: any[] = [];
  for (const f of bank) {
    const res = A({ gray: f.frame.gray, w: f.frame.w, h: f.frame.h }, { stride: 4 });
    const read = res.fused.map((x: any) => x.id).filter((id: number) => T.byId.has(id));
    const inp = { ...res, w: f.frame.w, h: f.frame.h };
    const t0 = performance.now(); const off = P(inp, { useScale: false }); const t1 = performance.now();
    const on = P(inp); const t2 = performance.now();
    const sq = P(inp, { fit: { robust: false } });
    rows.push({
      name: f.name, read: read.length, degen: read.length >= 3 && degen(read),
      off: score(off, f), on: score(on, f), sq: score(sq, f),
      msOff: t1 - t0, msOn: t2 - t1,
      scaleRms: on.ok && on.fit ? on.fit.scaleRms : null,
      nScale: on.ok && on.fit ? on.fit.nScale : null
    });
  }
  // The synthetic tests go through fitManPose, not fitHexPose, so they should be
  // untouched -- asserted here rather than assumed.
  const strip = (x: any) => (typeof x === "string" ? x : (x && x.textContent) || String(x));
  const tests: any = {};
  for (const n of ["manSceneTest", "manAxesTest", "sectionAudit"])
    tests[n] = strip(await V(n)).replace(/\s+/g, " ").trim().slice(0, 260);
  return { rows, tests };
});

const p = (v: number, w = 6) => (Number.isNaN(v) ? "n/a" : v.toFixed(v < 10 ? 1 : 0) + "px").padStart(w);
console.log("frame                 read deg |  centres   +sq   +robust |   miss  |  posRms  sclRms |   ms");
for (const r of out.rows) {
  const d = r.on.worst - r.off.worst;
  console.log(
    `${r.name.padEnd(20)} ${String(r.read).padStart(4)} ${r.degen ? " Y " : " . "} |` +
    `${p(r.off.worst, 8)}${p(r.sq.worst, 7)}${p(r.on.worst, 9)} |` +
    ` ${String(r.off.missing).padStart(2)}->${String(r.on.missing).padEnd(2)} |` +
    `${p(r.on.rms, 8)}${p(r.scaleRms ?? NaN, 8)} |` +
    ` ${r.msOff.toFixed(1)}->${r.msOn.toFixed(1)}` +
    (Math.abs(d) >= 1 ? `   ${d > 0 ? "worse" : "better"} ${Math.abs(d).toFixed(0)}px` : "")
  );
}
const sum = (k: "off" | "on") => out.rows.reduce((s: number, r: any) => s + (r[k].missing || 0), 0);
const mx = (k: string) => Math.max(...out.rows.map((r: any) => r[k].worst || 0));
console.log(`\ntotals   missing ${sum("off")} -> ${sum("on")}   worst-over-bank centres ${mx("off").toFixed(0)}px  +sq ${mx("sq").toFixed(0)}px  +robust ${mx("on").toFixed(0)}px`);
const tot = (k: string) => out.rows.reduce((s: number, r: any) => s + (r[k].worst || 0), 0).toFixed(0);
console.log(`sum of worst-per-frame   centres ${tot("off")}px  +sq ${tot("sq")}px  +robust ${tot("on")}px`);
console.log(`fit cost ${out.rows.reduce((s: number, r: any) => s + r.msOff, 0).toFixed(1)}ms -> ${out.rows.reduce((s: number, r: any) => s + r.msOn, 0).toFixed(1)}ms over ${out.rows.length} frames`);
for (const [k, v] of Object.entries(out.tests)) console.log(`\n${k}: ${v}`);
console.log("\npageerrors:", errs.length ? errs.slice(0, 3) : "none");
await browser.close();
