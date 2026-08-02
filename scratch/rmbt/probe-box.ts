// Read-only: what is the CEILING for coarse-to-fine if the coarse pass were an
// oracle? Compares the deterministic work proxy (sum n^2 over offered candidate
// groups, the argument of findInvolution) over the whole frame against the same
// proxy restricted to the ground-truth bounding box of the target.
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
  for (const n of ["edges1Dsub", "manRowGroups"]) deps[n] = await val(n);
  const { edges1Dsub, manRowGroups } = deps;

  const frames = payload.map((c: any) => {
    const bin = atob(c.grayB64);
    const gray = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) gray[i] = bin.charCodeAt(i);
    return { name: c.meta.name, gray, w: c.meta.w, h: c.meta.h, truth: c.meta.truth ?? [] };
  }).filter((f: any) => f.gray.length === f.w * f.h);

  const work = (sig: Uint8Array) => {
    const se = edges1Dsub(sig, 12);
    if (se.length < 6) return 0;
    const xs = new Float64Array(se.length);
    for (let i = 0; i < se.length; i++) xs[i] = se[i].x;
    let W = 0;
    for (const [lo, hi] of manRowGroups(xs, {})) { const n = hi - lo + 1; W += n * n; }
    return W;
  };

  return frames.map((f: any) => {
    const t = f.truth;
    const pad = 1.25;
    const x0 = Math.max(0, Math.floor(Math.min(...t.map((k: any) => k.x - pad * k.radiusPx))));
    const x1 = Math.min(f.w, Math.ceil(Math.max(...t.map((k: any) => k.x + pad * k.radiusPx))));
    const y0 = Math.min(...t.map((k: any) => k.y - pad * k.radiusPx));
    const y1 = Math.max(...t.map((k: any) => k.y + pad * k.radiusPx));
    let wTot = 0, wBox = 0, rows = 0, rowsBox = 0;
    for (let y = 2; y < f.h; y += 4) {
      rows++;
      wTot += work(f.gray.subarray(y * f.w, (y + 1) * f.w));
      if (y < y0 || y > y1) continue;
      rowsBox++;
      wBox += work(f.gray.subarray(y * f.w + x0, y * f.w + x1));
    }
    return { name: f.name, rows, rowsBox, wTot: Math.round(wTot), wBox: Math.round(wBox),
             frac: +(wBox / wTot).toFixed(3), boxW: x1 - x0, boxH: Math.round(y1 - y0) };
  });
}, { payload: cases });

await browser.close();
for (const r of out) console.log(r.name.padEnd(20), `rows ${r.rowsBox}/${r.rows}`, `box ${r.boxW}x${r.boxH}`, `work ${r.wBox}/${r.wTot} = ${r.frac}`);
const tw = out.reduce((a: number, r: any) => a + r.wTot, 0), bw = out.reduce((a: number, r: any) => a + r.wBox, 0);
console.log("\nORACLE 2D box work fraction:", (bw / tw).toFixed(3));
