// Read-only: simulate the coarse-to-fine row policy with a DETERMINISTIC work
// proxy. findInvolution is ~144 * O(n^2) per candidate group and is 53% of the
// frame time (solveMan, 44%, runs only on groups that fit an involution), so
// sum(n^2) over offered groups is a load-independent stand-in for cost.
import { chromium } from "playwright";
import { resolve } from "node:path";
import { readFileSync, readdirSync } from "node:fs";

const NB = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const DIR = resolve("data/hexcases");
const SUBSET = Number(process.argv.includes("--subset") ? process.argv[process.argv.indexOf("--subset") + 1] : 20);
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
  for (const n of ["edges1Dsub", "manRowGroups", "detectRowMan"]) deps[n] = await val(n);
  const { edges1Dsub, manRowGroups, detectRowMan } = deps;

  const frames = payload.map((c: any) => {
    const bin = atob(c.grayB64);
    const gray = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) gray[i] = bin.charCodeAt(i);
    return { name: c.meta.name, gray, w: c.meta.w, h: c.meta.h, truth: c.meta.truth ?? [] };
  }).filter((f: any) => f.gray.length === f.w * f.h);

  const rep: any[] = [];
  for (const f of frames) {
    // per-row: work proxy and the real hits
    const W: Record<number, number> = {}, H: Record<number, any[]> = {};
    for (let y = 2; y < f.h; y += 4) {
      const se = edges1Dsub(f.gray.subarray(y * f.w, (y + 1) * f.w), 12);
      let work = 0;
      if (se.length >= 6) {
        const xs = new Float64Array(se.length);
        for (let i = 0; i < se.length; i++) xs[i] = se[i].x;
        for (const [lo, hi] of manRowGroups(xs, {})) { const n = hi - lo + 1; work += n * n; }
      }
      W[y] = work;
      H[y] = detectRowMan(se, {});
    }
    const rows = Object.keys(W).map(Number).sort((a, b) => a - b);
    const wTot = rows.reduce((a, y) => a + W[y], 0);
    const hitRows = rows.filter((y) => H[y].length > 0);

    const policies: any = {};
    for (const C of [12, 16, 24, 32]) {
      for (const cap of [30, 45, 60, 90]) {
        const rule = "cap" + cap;
        const coarse = rows.filter((y) => ((y - 2) / 4) % (C / 4) === 0);
        let wCoarse = 0; const bands: [number, number][] = [];
        for (const y of coarse) {
          wCoarse += W[y];
          for (const hit of H[y]) {
            const m = Math.min(hit.wHalf, cap) + C;
            bands.push([y - m, y + m]);
          }
        }
        bands.sort((a, b) => a[0] - b[0]);
        const mg: [number, number][] = [];
        for (const b of bands) {
          const last = mg[mg.length - 1];
          if (last && b[0] <= last[1]) last[1] = Math.max(last[1], b[1]); else mg.push([b[0], b[1]]);
        }
        const inBand = (y: number) => mg.some((b) => y >= b[0] && y <= b[1]);
        const dense = rows.filter((y) => !coarse.includes(y) && inBand(y));
        const wDense = dense.reduce((a, y) => a + W[y], 0);
        const lostHitRows = hitRows.filter((y) => !coarse.includes(y) && !inBand(y)).length;
        const lostHits = hitRows.filter((y) => !coarse.includes(y) && !inBand(y)).reduce((a, y) => a + H[y].length, 0);
        policies[`C${C}/${rule}`] = {
          wFrac: +((wCoarse + wDense) / wTot).toFixed(3),
          denseFrac: +((dense.length + coarse.length) / rows.length).toFixed(3),
          lostHitRows, lostHits,
        };
      }
    }
    rep.push({ name: f.name, rows: rows.length, hitRows: hitRows.length, wTot: Math.round(wTot), policies });
  }
  return rep;
}, { payload: cases });

await browser.close();
const keys = Object.keys(out[0].policies);
const agg: any = {};
for (const k of keys) {
  const w = out.reduce((a: number, f: any) => a + f.policies[k].wFrac * f.wTot, 0) / out.reduce((a: number, f: any) => a + f.wTot, 0);
  agg[k] = {
    workFrac: +w.toFixed(3),
    rowFrac: +(out.reduce((a: number, f: any) => a + f.policies[k].denseFrac, 0) / out.length).toFixed(3),
    lostHitRows: out.reduce((a: number, f: any) => a + f.policies[k].lostHitRows, 0),
    lostHits: out.reduce((a: number, f: any) => a + f.policies[k].lostHits, 0),
    totHitRows: out.reduce((a: number, f: any) => a + f.hitRows, 0),
  };
}
console.log(JSON.stringify(agg, null, 1));
console.log("\nper-frame workFrac for the best few:");
for (const f of out) console.log(f.name.padEnd(20), keys.map((k) => k + "=" + f.policies[k].wFrac + "/" + f.policies[k].lostHits).join("  "));
