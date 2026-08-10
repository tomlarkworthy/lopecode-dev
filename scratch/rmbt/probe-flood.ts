// Did going from a grey-flooded mat to a white one cost accuracy? Render the
// SAME part through the SAME camera on a mat whose only difference is the page
// tone, trace it with the matching sampler, and compare. Also report what Otsu
// picked, because the histogram is what the page tone changes.
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
  const val = (n: string) => mod.value(n);
  const T: any = await val("matTarget");
  const makeMatSampler: any = await val("makeMatSampler");
  const makePlaneMap: any = await val("makePlaneMap");
  const traceFrame: any = await val("traceFrame");
  const cameraPoseAt: any = await val("cameraPoseAt");
  const calib: any = await val("calib");

  const W = 1280, H = 960;
  const TRUE = { f: 1150, cx: W / 2 - 8, cy: H / 2 + 5, k1: -0.22, k2: 0.06, p1: 0, p2: 0 };
  // the traceSelfTest bracket, rounded corners and all
  const corners = [[-35, -22], [35, -22], [35, 8], [12, 8], [12, 22], [-12, 22], [-12, 8], [-35, 8]];
  const poly: number[][] = [];
  for (let i = 0; i < corners.length; i++) {
    const a = corners[(i - 1 + corners.length) % corners.length], b = corners[i], c = corners[(i + 1) % corners.length];
    const r = 3;
    const n1 = Math.hypot(b[0] - a[0], b[1] - a[1]), n2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const p1 = [b[0] - (r * (b[0] - a[0])) / n1, b[1] - (r * (b[1] - a[1])) / n1];
    const p2 = [b[0] + (r * (c[0] - b[0])) / n2, b[1] + (r * (c[1] - b[1])) / n2];
    for (let t = 0; t <= 1.0001; t += 0.25) {
      const u = 1 - t;
      poly.push([u * u * p1[0] + 2 * u * t * b[0] + t * t * p2[0], u * u * p1[1] + 2 * u * t * b[1] + t * t * p2[1]]);
    }
  }
  const inPoly = (x: number, y: number) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const distToPoly = (x: number, y: number) => {
    let best = Infinity;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [x1, y1] = poly[j], [x2, y2] = poly[i];
      const dx = x2 - x1, dy = y2 - y1;
      const L2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / L2));
      best = Math.min(best, Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy)));
    }
    return best;
  };

  const rows: any[] = [];
  for (const flood of [230]) {
    for (const objTone of [40, 150]) {
      const matGray = makeMatSampler({ floodGray: flood });
      for (const [tilt, thick, ox, oy] of [
        [3, 0, 0, 0], [3, 0, 30, 14], [3, 0, -26, -15], [3, 0, 14, -18], [3, 0, -40, 10],
        [10, 3, 0, 0], [10, 3, 30, 14], [10, 3, -26, -15],
        [25, 3, 0, 0], [25, 3, 30, 14], [25, 3, -26, -15]]) {
        const pose = cameraPoseAt(35, 90 - tilt, (1.15 * T.pageW * TRUE.f) / W);
        const map = makePlaneMap(TRUE, pose);
        const gray = new Uint8Array(W * H);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const p0 = map.toPlaneAt(x + 0.5, y + 0.5, 0);
          const pt = thick ? map.toPlaneAt(x + 0.5, y + 0.5, thick) : null;
          const hit = (p0 && inPoly(p0[0] - ox, p0[1] - oy)) || (pt && inPoly(pt[0] - ox, pt[1] - oy));
          gray[y * W + x] = hit ? objTone : (p0 ? matGray(p0[0], p0[1]) : flood);
        }
        const got = traceFrame({ gray, w: W, h: H }, TRUE, { matGray });
        if (!got.ok) { rows.push({ objTone, tilt, at: [ox, oy], err: String(got.why).split("—")[0].trim() }); continue; }
        const errs = got.outline.map(([x, y]: number[]) => distToPoly(x - ox, y - oy)).sort((a: number, b: number) => a - b);
        const q = (f: number) => +errs[Math.min(errs.length - 1, Math.round(f * (errs.length - 1)))].toFixed(3);
        rows.push({
          objTone, tilt, at: [ox, oy], med: q(0.5), p95: q(0.95), max: q(1),
          bbox: [+(got.sizeMm[0] - 70).toFixed(2), +(got.sizeMm[1] - 44).toFixed(2)],
          thr: got.thresholdUsed, objToneRead: got.objTone, gain: got.gain, offset: got.offset,
          resid: got.matResidualPct, marks: got.marks
        });
      }
    }
  }
  return rows;
});
await browser.close();
console.log(out.map((r: any) => JSON.stringify(r)).join("\n"));
if (errs.length) console.log("\n--- page errors ---\n" + [...new Set(errs)].slice(0, 10).join("\n"));
