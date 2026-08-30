// Does fitHomographyScaled return on a COLLINEAR 4-point subset? The A/B probe
// wedged on a frame with 8 marks, where nearly every 4-subset is collinear, and
// that was inferred rather than isolated. This isolates it: one non-degenerate
// subset (must return fast) and one deliberately collinear subset (the suspect),
// each in its own page.evaluate so a hang is a timeout and not a mystery.
//
// It matters beyond this probe: fitHexPose calls fitPlane with as few as 4
// pairs, so a frame that reads exactly 4 marks with 3 of them collinear takes
// the same path in the live rig.
import { chromium } from "playwright";
import { resolve } from "node:path";

const NB = resolve("lopebooks/notebooks/tomlarkworthy_flat-trace.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", {
    get() { return orig; },
    set(N: any) {
      const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
      W.prototype = N.prototype; Object.assign(W, N); return W;
    }
  });
});
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 180000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 180000 });
await page.waitForTimeout(6000);

await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const clt = [...rt._variables].find((v: any) => v._name === "fitHomographyScaled")?._module;
  (window as any).__fs = await clt.value("fitHomographyScaled");
  (window as any).__fp = await clt.value("fitHomography");
});

// A square: well conditioned. And a subset with three points on one line.
const SETS: Record<string, number[][]> = {
  square:    [[0, 0], [40, 0], [40, 40], [0, 40]],
  collinear: [[0, 0], [40, 0], [80, 0], [40, 40]],
};
const R = 15, F = 1200, Z = 500;   // mm radius, px focal, mm distance — a plain frontal view

for (const [label, pts] of Object.entries(SETS)) {
  const t0 = Date.now();
  try {
    const r: any = await Promise.race([
      page.evaluate(({ pts, R, F, Z }: any) => {
      const pairs = pts.map(([X, Y]: number[]) => ({
        sx: X, sy: Y,
        dx: 600 + (F * X) / Z, dy: 450 + (F * Y) / Z,
        a: (F * R) / Z, b: (F * R) / Z, rMm: R,
      }));
      const plain = (window as any).__fp(pairs);
      const scaled = (window as any).__fs(pairs);
      return { plain: plain ? "returned" : "null", scaled: scaled ? "returned" : "null",
               rms: scaled ? scaled.rmsResidual : null };
      }, { pts, R, F, Z }),
      new Promise((_, rej) => setTimeout(() => rej(new Error("no return within 20s")), 20000)),
    ]);
    console.log(`${label.padEnd(10)} ${Date.now() - t0}ms  plain ${r.plain}  scaled ${r.scaled}  rms ${r.rms}`);
  } catch (e: any) {
    console.log(`${label.padEnd(10)} ${Date.now() - t0}ms  *** DID NOT RETURN *** ${String(e.message).split("\n")[0].slice(0, 80)}`);
    break;   // the page is wedged; nothing after this can run
  }
}
await browser.close();
