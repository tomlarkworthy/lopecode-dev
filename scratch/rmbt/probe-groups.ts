// Read-only probe: what does a candidate group look like when it locks, and
// what does it look like when it does not? Same loading recipe as
// try-variant.ts; changes nothing.
import { chromium } from "playwright";
import { resolve } from "node:path";
import { readFileSync, readdirSync } from "node:fs";

const NB = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const DIR = resolve("data/hexcases");
const SUBSET = Number(process.argv.includes("--subset") ? process.argv[process.argv.indexOf("--subset") + 1] : 10);
let names = readdirSync(DIR).filter((f) => f.endsWith(".gray")).map((f) => f.slice(0, -5)).sort();
if (SUBSET > 0 && SUBSET < names.length) {
  const step = names.length / SUBSET;
  names = Array.from({ length: SUBSET }, (_, i) => names[Math.floor(i * step)]);
}
const cases = names.map((n) => ({
  meta: JSON.parse(readFileSync(resolve(DIR, n + ".json"), "utf8")),
  grayB64: readFileSync(resolve(DIR, n + ".gray")).toString("base64"),
}));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
page.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; },
    set(N: any) { const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; }; W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 180000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 180000 });
await page.waitForTimeout(9000);

const out = await page.evaluate(async ({ payload }) => {
  const rt = (window as any).__ojs_runtime;
  const vars = [...rt._variables];
  const val = async (n: string) => { const v = vars.find((z: any) => z._name === n); return v ? await v._module.value(n) : null; };
  const deps: any = {};
  for (const n of ["edges1Dsub", "manRowGroups", "findInvolution", "solveMan", "manLayout", "detectRowMan"])
    deps[n] = await val(n);
  const { edges1Dsub, manRowGroups, findInvolution, solveMan, manLayout } = deps;

  const frames = payload.map((c: any) => {
    const bin = atob(c.grayB64);
    const gray = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) gray[i] = bin.charCodeAt(i);
    return { name: c.meta.name, gray, w: c.meta.w, h: c.meta.h };
  }).filter((f: any) => f.gray.length === f.w * f.h);

  const stat = { hitN: [] as number[], missN: [] as number[], hitSpan: [] as number[], missSpan: [] as number[] };
  let tEdges = 0, tGroups = 0, tInv = 0, tSolve = 0;
  let rowsWithHit = 0, rowsNoHit = 0, groupsTot = 0, groupsHit = 0;
  // rows: does a cheap per-row test separate hit rows from no-hit rows?
  const rowMaxN: { hit: number[]; miss: number[] } = { hit: [], miss: [] };

  for (const f of frames) {
    for (let y = 2; y < f.h; y += 4) {
      const t0 = performance.now();
      const se = edges1Dsub(f.gray.subarray(y * f.w, (y + 1) * f.w), 12);
      tEdges += performance.now() - t0;
      const n = se.length;
      if (n < 6) { rowsNoHit++; rowMaxN.miss.push(0); continue; }
      const xs = new Float64Array(n), ss = new Int8Array(n);
      for (let i = 0; i < n; i++) { xs[i] = se[i].x; ss[i] = se[i].s; }
      const t1 = performance.now();
      const groups = manRowGroups(xs, {});
      tGroups += performance.now() - t1;
      let rowHit = false, maxN = 0;
      for (const [lo, hi] of groups) {
        groupsTot++;
        const cnt = hi - lo + 1, span = xs[hi] - xs[lo];
        if (cnt > maxN) maxN = cnt;
        const sub = [];
        for (let i = lo; i <= hi; i++) sub.push({ x: xs[i], s: ss[i] });
        const t2 = performance.now();
        const iv = findInvolution(sub, {});
        tInv += performance.now() - t2;
        let ok = false;
        if (iv) {
          const t3 = performance.now();
          const r = solveMan(iv, manLayout, {});
          tSolve += performance.now() - t3;
          ok = !!(r.ok && r.sup >= 5);
        }
        if (ok) { groupsHit++; rowHit = true; stat.hitN.push(cnt); stat.hitSpan.push(span); }
        else { stat.missN.push(cnt); stat.missSpan.push(span); }
      }
      if (rowHit) { rowsWithHit++; rowMaxN.hit.push(maxN); } else { rowsNoHit++; rowMaxN.miss.push(maxN); }
    }
  }
  const q = (a: number[], p: number) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(p * (s.length - 1))] : null; };
  const hist = (a: number[]) => [0.0, 0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 0.9, 1].map((p) => `${p}:${q(a, p)}`).join(" ");
  return {
    frames: frames.length, rowsWithHit, rowsNoHit, groupsTot, groupsHit,
    time: { edges: +tEdges.toFixed(0), groups: +tGroups.toFixed(0), inv: +tInv.toFixed(0), solve: +tSolve.toFixed(0) },
    hitN: hist(stat.hitN), missN: hist(stat.missN),
    hitSpan: hist(stat.hitSpan), missSpan: hist(stat.missSpan),
    rowMaxNhit: hist(rowMaxN.hit), rowMaxNmiss: hist(rowMaxN.miss),
    // how many groups survive a size prefilter, and how many hits it deletes
    sweep: [8, 10, 12, 14, 16, 18, 20].map((k) => ({
      k,
      keptGroups: stat.hitN.filter((v) => v >= k).length + stat.missN.filter((v) => v >= k).length,
      lostHits: stat.hitN.filter((v) => v < k).length,
    })),
  };
}, { payload: cases });

await browser.close();
console.log(JSON.stringify(out, null, 1));
