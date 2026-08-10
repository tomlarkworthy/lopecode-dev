// Which SET of camera positions actually pins the shape? A visual hull from
// near-overhead views is tall: a column above a wide object still projects
// inside every silhouette. Sweep camera sets through the notebook's own
// hullSelfTest and report the recovered box and volume against known truth.
import { chromium } from "playwright";
import { resolve } from "node:path";

const NB = resolve("lopebooks/notebooks/tomlarkworthy_flat-trace.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
const errs: string[] = [];
page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
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
await page.waitForTimeout(5000);

const out = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const mod = [...rt._variables].find((v: any) => v._name === "matTarget")?._module;
  const hullSelfTest: any = await mod.value("hullSelfTest");

  const ring = (n: number, el: number, off = 0) => Array.from({ length: n }, (_, i) => [off + (360 * i) / n, el]);
  const SETS: Record<string, number[][]> = {
    "top+5@62": [[0, 85], ...ring(5, 62)],
    "top+5@45": [[0, 85], ...ring(5, 45)],
    "top+5@30": [[0, 85], ...ring(5, 30)],
    "top+5@20": [[0, 85], ...ring(5, 20)],
    "top+4@62+4@30": [[0, 85], ...ring(4, 62), ...ring(4, 30, 45)],
    "top+6@45+6@25": [[0, 85], ...ring(6, 45), ...ring(6, 25, 30)],
    "top+8@30": [[0, 85], ...ring(8, 30)],
    "5@30 no top": ring(5, 30),
  };
  const rows: any[] = [];
  for (const [name, cameras] of Object.entries(SETS)) {
    const t0 = performance.now();
    const r = hullSelfTest({ cameras });
    rows.push({
      set: name, shots: cameras.length, used: r.views, refused: (r.rejected || []).length,
      measuredMm: r.measuredMm, errMm: r.errMm, volErrPct: r.volErrPct,
      notch: r.notchRecovered, pass: r.pass, why: r.why,
      refusals: (r.rejected || []).map((x: any) => `${x.az}/${x.el}: ${String(x.why).split("—")[0].trim()}`),
      ms: Math.round(performance.now() - t0)
    });
  }
  return rows;
});
await browser.close();
console.log(out.map((r: any) => JSON.stringify(r)).join("\n"));
if (errs.length) console.log("\n--- page errors ---\n" + [...new Set(errs)].slice(0, 10).join("\n"));
