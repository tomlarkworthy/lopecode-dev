// Record every real call to findInvolution that the 16 bank frames produce, so
// a Zig port can be held to identical output on identical input rather than on
// something I made up.
//
// The inputs are captured by REDEFINING the notebook's findInvolution with a
// recording wrapper that delegates to the original. detectRowMan then
// recomputes against the wrapper, so the calls recorded are the calls the
// shipping detector makes -- nothing here reimplements any part of the
// cascade, which is the only way this stays honest as the cells change.
//
//   bun scratch/rmbt/capture-involution.ts [--out scratch/rmbt/involution-cases.json]
import { chromium } from "playwright";
import { resolve } from "node:path";

const arg = (n: string, d: string) => {
  const i = process.argv.indexOf("--" + n);
  return i >= 0 ? process.argv[i + 1] : d;
};
const NB = resolve(arg("nb", "lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html"));
const OUT = arg("out", "scratch/rmbt/involution-cases.json");

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

const out = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const real = await mod.value("findInvolution");
  const bank = await mod.value("hexFrameBank");
  const opts = await mod.value("hexRigOpts");
  const o = { ...opts, bothAxes: false };

  const calls: any[] = [];
  (window as any).__calls = calls;
  mod.redefine("findInvolution", [], () => (edges: any[], op: any = {}) => {
    const res = real(edges, op);
    calls.push({
      xs: edges.map((e: any) => (typeof e === "number" ? e : e.x)),
      ss: edges.map((e: any) => (typeof e === "number" ? 1 : e.s)),
      tolPx: op.tolPx ?? 1.1,
      minInliers: op.minInliers ?? 6,
      // what the port has to reproduce
      out: res ? { P: res.P, Q: res.Q, inl: res.inl, nUp: res.up.length,
                   u: res.up.map((p: any) => p.u) } : null
    });
    return res;
  });

  // Force the whole bank through the real pipeline with the wrapper in place.
  const analyze = await mod.value("analyzeFrameMan");
  const manScanRows = await mod.value("manScanRows");
  let rows = 0;
  for (const spec of bank) { analyze(spec.frame, o); rows += manScanRows(spec.frame, o).length; }
  return {
    frames: bank.length, rows, calls,
    nulls: calls.filter((c) => !c.out).length,
    sizes: calls.reduce((m: any, c: any) => { m[c.xs.length] = (m[c.xs.length] ?? 0) + 1; return m; }, {})
  };
});

await browser.close();
await Bun.write(OUT, JSON.stringify(out, null, 0));
console.log(`${out.frames} frames, ${out.rows} rows -> ${out.calls.length} findInvolution calls`);
console.log(`  ${out.nulls} returned null (${((out.nulls / out.calls.length) * 100).toFixed(1)}%)`);
const sizes = Object.entries(out.sizes).map(([k, v]) => [+k, v as number]).sort((a, b) => a[0] - b[0]);
const n = out.calls.length;
console.log(`  edge counts: min ${sizes[0][0]}, max ${sizes[sizes.length - 1][0]}, ` +
  `median ${sizes[(() => { let c = 0; for (let i = 0; i < sizes.length; i++) { c += sizes[i][1]; if (c >= n / 2) return i; } return 0; })()][0]}`);
console.log(`wrote ${OUT}`);
