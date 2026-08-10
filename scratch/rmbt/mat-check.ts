// Read the THING THAT GETS PRINTED.
//
// Rasterises the actual mat SVG and runs the REAL cascade over it, sweeping the
// two design choices that are not obvious -- mark diameter and print rotation.
// A parallel model of the sheet would let a wrong radius or a mark at the wrong
// millimetre sail straight through, so the SVG is the input and the millimetre
// geometry is the truth.
import { chromium } from "playwright";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";

const NB = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const SRC = readFileSync(resolve("scratch/rmbt/mat-target.js"), "utf8")
  .replace(/^export /gm, "");   // inject as plain declarations

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
page.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));
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
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 120000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 120000 });
await page.waitForTimeout(9000);

const out = await page.evaluate(async ({ src }: any) => {
  const rt = (window as any).__ojs_runtime;
  const vars = [...rt._variables];
  const val = async (n: string) => { const v = vars.find((z: any) => z._name === n); return v ? await v._module.value(n) : null; };
  const manLayout: any = await val("manLayout");
  const manColor: any = await val("manColor");
  const analyzeFrameMan: any = await val("analyzeFrameMan");
  const fitHomography: any = await val("fitHomography");
  // eslint-disable-next-line no-new-func
  const mod = new Function(src + "\nreturn {makeMatTarget, matTargetSvg, matMarkPagePx};")();

  const rasterise = async (svg: string, W: number, H: number) => {
    const uri = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    const img = new (window as any).Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error("rasterise failed")); img.src = uri; });
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d")!;
    ctx.drawImage(img, 0, 0, W, H);
    const px = ctx.getImageData(0, 0, W, H).data;
    const gray = new Uint8Array(W * H);
    for (let i = 0, p = 0; i < gray.length; i++, p += 4) gray[i] = (px[p] * 77 + px[p + 1] * 150 + px[p + 2] * 29) >> 8;
    return gray;
  };

  const rows: any[] = [];
  for (const diameterMm of [48, 40, 32, 26]) {
    for (const rollDeg of [0, 30]) {
      const T = mod.makeMatTarget(manLayout, { diameterMm, rollDeg });
      // rasterise so the whole page is about 1200px wide, i.e. what a camera
      // held far enough back to see the whole mat would deliver
      const pxPerMm = 1200 / T.pageW;
      const W = Math.round(T.pageW * pxPerMm), H = Math.round(T.pageH * pxPerMm);
      const svg = mod.matTargetSvg(T, manColor);
      let gray: Uint8Array;
      try { gray = await rasterise(svg, W, H); } catch (e: any) { rows.push({ diameterMm, rollDeg, error: e.message }); continue; }
      const res = analyzeFrameMan({ gray, w: W, h: H }, {});
      const onTarget = res.fused.filter((f: any) => T.byId.has(f.id));
      const offTarget = res.fused.filter((f: any) => !T.byId.has(f.id));
      const errs = onTarget.map((f: any) => {
        const t = mod.matMarkPagePx(T, T.byId.get(f.id), pxPerMm);
        return Math.hypot(f.xc - t.x, f.yc - t.y);
      });
      // scale check: fit the homography the pipeline would fit, and ask what
      // millimetre-per-pixel it thinks the raster is at
      const pairs = onTarget.map((f: any) => { const m = T.byId.get(f.id); return { sx: m.xMm, sy: m.yMm, dx: f.xc, dy: f.yc }; });
      let mmPerPx = null, rms = null;
      if (pairs.length >= 4) {
        const fit = fitHomography(pairs);
        if (fit) {
          const [x0, y0] = fit.map(0, 0), [x1] = fit.map(10, 0);
          mmPerPx = +(10 / Math.hypot(x1 - x0, fit.map(10, 0)[1] - y0)).toFixed(4);
          rms = +fit.rmsResidual.toFixed(2);
        }
      }
      rows.push({
        diameterMm, rollDeg, marks: T.marks.length, truncated: T.sitesTruncated,
        markPx: Math.round(diameterMm * pxPerMm),
        rowGapDiscs: T.rowGapInDiscs,
        read: onTarget.length, offTarget: offTarget.map((f: any) => f.id),
        worstErrPx: errs.length ? +Math.max(...errs).toFixed(2) : null,
        medErrPx: errs.length ? +errs.sort((a: number, b: number) => a - b)[errs.length >> 1].toFixed(2) : null,
        mmPerPx, mmPerPxTrue: +(1 / pxPerMm).toFixed(4), rms,
        ms: +res.ms.toFixed(0)
      });
    }
  }
  return rows;
}, { src: SRC });

await browser.close();

console.log("mat design sweep -- whole sheet rasterised to 1200px wide, real cascade, defaults\n");
console.log("⌀mm roll marks markPx gap(discs)  read  off  medErr worstErr  mm/px (true)      ms");
console.log("-".repeat(92));
for (const r of out) {
  if (r.error) { console.log(`${r.diameterMm} ${r.rollDeg}  ERROR ${r.error}`); continue; }
  console.log(
    `${String(r.diameterMm).padStart(3)} ${String(r.rollDeg).padStart(4)} ${String(r.marks).padStart(5)} ` +
    `${String(r.markPx).padStart(6)} ${String(r.rowGapDiscs).padStart(10)}  ` +
    `${String(r.read + "/" + r.marks).padStart(6)} ${String(r.offTarget.length).padStart(4)} ` +
    `${String(r.medErrPx).padStart(7)} ${String(r.worstErrPx).padStart(8)}  ` +
    `${String(r.mmPerPx).padStart(6)} (${r.mmPerPxTrue})  ${String(r.ms).padStart(5)}`
  );
}
