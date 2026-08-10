// Extract MEASURED mark centres from every archived hexcase, for camera
// calibration.
//
// The archive's frozen `truth` cannot be used for this. Those positions are
// `m.predicted` -- the homography's image of the ideal target -- so they are
// exactly plane-consistent BY CONSTRUCTION. Fitting a lens model to them would
// recover a lens with no distortion no matter what the camera did. The only
// honest observation is what the detector actually measured in the pixels:
// `fused[].xc/yc`.
//
// Emits one JSON so the fitting can iterate in plain Bun without a browser.
import { chromium } from "playwright";
import { resolve } from "node:path";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const DIR = resolve("data/hexcases");
const NB = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const OUT = resolve("scratch/rmbt/calib-obs.json");

const names = readdirSync(DIR).filter((f) => f.endsWith(".gray")).map((f) => f.slice(0, -5)).sort();
const cases = names.map((n) => {
  const meta = JSON.parse(readFileSync(resolve(DIR, n + ".json"), "utf8"));
  const gray = readFileSync(resolve(DIR, n + ".gray"));
  return { name: n, w: meta.w, h: meta.h, grayB64: gray.toString("base64") };
}).filter((c) => c.w && c.h);

console.log(`${cases.length} cases`);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
page.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", {
    get() { return orig; },
    set(N: any) {
      const W = function (this: any, ...a: any[]) {
        const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i;
      };
      W.prototype = N.prototype; Object.assign(W, N); return W;
    }
  });
});
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 120000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 120000 });
await page.waitForTimeout(9000);

// chunked so one huge evaluate argument does not have to be serialised at once
const CHUNK = 20;
const out: any[] = [];
for (let i = 0; i < cases.length; i += CHUNK) {
  const part = cases.slice(i, i + CHUNK);
  const got = await page.evaluate(async (payload: any[]) => {
    const rt = (window as any).__ojs_runtime;
    const vars = [...rt._variables];
    const val = async (n: string) => { const v = vars.find((z: any) => z._name === n); return v ? await v._module.value(n) : null; };
    const analyzeFrameMan: any = await val("analyzeFrameMan");
    const hexTarget: any = await val("hexTarget");
    const onTarget = (fused: any[]) => fused.filter((f) => hexTarget.byId.has(f.id))
      .map((f) => ({ id: f.id, x: +f.xc.toFixed(3), y: +f.yc.toFixed(3), rows: f.rows, a: f.a, b: f.b }));

    return payload.map((c: any) => {
      const bin = atob(c.grayB64);
      const gray = new Uint8Array(bin.length);
      for (let k = 0; k < bin.length; k++) gray[k] = bin.charCodeAt(k);
      if (gray.length !== c.w * c.h) return { name: c.name, skip: "size" };
      const frame = { gray, w: c.w, h: c.h };
      // shipped defaults on purpose: calibrate the detector that ships
      const rows = analyzeFrameMan(frame, {});
      const both = analyzeFrameMan(frame, { bothAxes: true });
      return {
        name: c.name, w: c.w, h: c.h,
        rows: onTarget(rows.fused ?? []),
        both: onTarget(both.fused ?? [])
      };
    });
  }, part);
  out.push(...got);
  console.log(`  ${Math.min(i + CHUNK, cases.length)}/${cases.length}`);
}

// the target geometry, so the fit does not have to re-derive it
const geom = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const vars = [...rt._variables];
  const v = vars.find((z: any) => z._name === "hexTarget");
  const T: any = await v._module.value("hexTarget");
  return { marks: T.marks.map((m: any) => ({ id: m.id, xMm: m.xMm, yMm: m.yMm })), radiusMm: T.radiusMm };
});

await browser.close();

writeFileSync(OUT, JSON.stringify({ geom, cases: out }, null, 1));
const n = (k: "rows" | "both") => out.reduce((s, c) => s + (c[k]?.length ?? 0), 0);
console.log(`wrote ${OUT}: ${out.length} cases, ${n("rows")} rows-only obs, ${n("both")} both-axes obs`);
