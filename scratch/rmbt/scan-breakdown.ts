// Where does the row scan actually spend its time?
//
// This sizes a WASM port before anyone writes any WASM. The scan splits into a
// per-PIXEL half (edges1Dsub, 20 code lines, walks every pixel in the row) and
// a per-CANDIDATE half (the §11 cascade: manRowGroups -> findInvolution ->
// solveMan, 205 code lines, runs only where edges cluster). If the pixel half
// dominates, the cheap port is 20 lines. If the cascade dominates, it is 225.
//
// Calls the notebook's OWN cells and times around them -- no reimplementation,
// so this cannot drift from what ships.
//
//   bun scratch/rmbt/scan-breakdown.ts [--reps 40] [--nb <file.html>]
import { chromium } from "playwright";
import { resolve } from "node:path";

const arg = (n: string, d: string) => {
  const i = process.argv.indexOf("--" + n);
  return i >= 0 ? process.argv[i + 1] : d;
};
const NB = resolve(arg("nb", "lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html"));
const REPS = +arg("reps", "40");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 180000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 180000 });
await page.waitForTimeout(15000);

// Inside the cascade, a sampling profile rather than more stopwatches: the
// three stages call each other, so wrapping them would either miss nesting or
// change what the JIT does to them. The profiler sees the real code.
const cdp = await page.context().newCDPSession(page);
await cdp.send("Profiler.enable");
await cdp.send("Profiler.setSamplingInterval", { interval: 100 });
await cdp.send("Profiler.start");

const out = await page.evaluate(async (reps) => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const bank = await mod.value("hexFrameBank");
  const opts = await mod.value("hexRigOpts");
  const edges1Dsub = await mod.value("edges1Dsub");
  const detectRowMan = await mod.value("detectRowMan");
  const manScanRows = await mod.value("manScanRows");
  const o = { ...opts, bothAxes: false };
  const thr = o.edgeThreshold ?? 12;

  // Everything on ONE thread and warmed properly. This is a ratio between two
  // halves of the same loop, so absolute speed does not matter, but tiering
  // does: an unwarmed half would look expensive for reasons Zig cannot fix.
  const sweep = (frame: any, ys: number[], timed: boolean) => {
    let tEdge = 0, tCascade = 0, nEdges = 0, nRows = 0, nHits = 0;
    const gray = frame.gray, w = frame.w;
    for (let i = 0; i < ys.length; i++) {
      const y = ys[i];
      const row = gray.subarray(y * w, (y + 1) * w);
      const a = timed ? performance.now() : 0;
      const se = edges1Dsub(row, thr);
      const b = timed ? performance.now() : 0;
      const hits = detectRowMan(se, o);
      const c = timed ? performance.now() : 0;
      tEdge += b - a; tCascade += c - b;
      nEdges += se.length; nRows++; nHits += hits.length;
    }
    return { tEdge, tCascade, nEdges, nRows, nHits };
  };

  const jobs = bank.map((s: any) => ({ frame: s.frame, ys: manScanRows(s.frame, o) }));
  for (let r = 0; r < 6; r++) for (const j of jobs) sweep(j.frame, j.ys, false);

  let tEdge = 0, tCascade = 0, nEdges = 0, nRows = 0, nHits = 0, px = 0;
  for (let r = 0; r < reps; r++)
    for (const j of jobs) {
      const s = sweep(j.frame, j.ys, true);
      tEdge += s.tEdge; tCascade += s.tCascade;
      if (r === 0) { nEdges += s.nEdges; nRows += s.nRows; nHits += s.nHits; px += s.ys ? 0 : j.ys.length * j.frame.w; }
    }
  return { reps, frames: bank.length, tEdge, tCascade, nEdges, nRows, nHits, px,
    cores: navigator.hardwareConcurrency };
}, REPS);

const tot = out.tEdge + out.tCascade;
const pct = (x: number) => ((x / tot) * 100).toFixed(1).padStart(5) + "%";
console.log(`${out.frames} bank frames x ${out.reps} reps, single thread, ${out.cores} cores`);
console.log(`${out.nRows} rows/pass, ${out.px} pixels/pass, ${out.nEdges} edges found, ${out.nHits} row hits\n`);
console.log(`edges1Dsub   (per pixel,     20 code lines)  ${out.tEdge.toFixed(0).padStart(6)}ms  ${pct(out.tEdge)}`);
console.log(`cascade      (per candidate, 205 code lines) ${out.tCascade.toFixed(0).padStart(6)}ms  ${pct(out.tCascade)}`);
console.log(`\nper pass: ${(tot / out.reps / out.frames).toFixed(2)}ms/frame single-threaded`);
console.log(`\nA WASM port of just edges1Dsub is capped at ${pct(out.tEdge)} of the scan.`);
console.log(`Amdahl: even at INFINITE speed it leaves ${(100 - (out.tEdge / tot) * 100).toFixed(1)}% behind.`);

const { profile }: any = await cdp.send("Profiler.stop");
const byId = new Map<number, any>(profile.nodes.map((n: any) => [n.id, n]));
const self = new Map<string, number>();
for (const id of profile.samples) {
  const n = byId.get(id);
  if (!n) continue;
  const f = n.callFrame.functionName || "(anonymous)";
  self.set(f, (self.get(f) ?? 0) + 1);
}
const total = profile.samples.length;
console.log(`\nself time inside the scan (${total} samples):`);
console.log("self%   function");
for (const [k, c] of [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12))
  console.log(`${((c / total) * 100).toFixed(1).padStart(5)}  ${k}`);

await browser.close();
process.exit(0);
