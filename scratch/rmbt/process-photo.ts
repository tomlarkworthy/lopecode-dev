// Run the man cascade + hex pose fit over an arbitrary photo from disk.
//
// Decoding happens in the browser, with the same canvas path the notebook's own
// frame loader uses, and greying uses the identical weights (77/150/29 >> 8) --
// so what the detector sees here is what it would see if the frame were stored
// as an attachment.
//
// Reports several working widths because a phone photo arrives 4-10x larger
// than the detector needs, and the width is the one knob that changes the
// input rather than the detector.
import { chromium } from "playwright";
import { resolve } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";

const PHOTO = resolve(process.argv[2]);
const NB = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const WIDTHS = (process.argv[3] ?? "3072,1536,960,768").split(",").map(Number);

const b64 = readFileSync(PHOTO).toString("base64");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
page.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; },
    set(N: any) { const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; }; W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 120000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 120000 });
await page.waitForTimeout(9000);

const out = await page.evaluate(async ({ b64, widths }) => {
  const rt = (window as any).__ojs_runtime;
  const vars = [...rt._variables];
  const val = async (n: string) => {
    const v = vars.find((z: any) => z._name === n);
    return v ? await v._module.value(n) : null;
  };
  const analyzeFrameMan: any = await val("analyzeFrameMan");
  const fitHexPose: any = await val("fitHexPose");

  const img = new Image();
  img.src = "data:image/jpeg;base64," + b64;
  await img.decode();
  const NW = img.naturalWidth, NH = img.naturalHeight;

  const results: any[] = [];
  for (const W of widths) {
    if (W > NW) continue;
    const H = Math.round((NH * W) / NW);
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, W, H);
    const px = ctx.getImageData(0, 0, W, H).data;
    const gray = new Uint8Array(W * H);
    for (let i = 0, p = 0; i < gray.length; i++, p += 4)
      gray[i] = (px[p] * 77 + px[p + 1] * 150 + px[p + 2] * 29) >> 8;

    for (const bothAxes of [false, true]) {
      const t0 = performance.now();
      const res = analyzeFrameMan({ gray, w: W, h: H }, { stride: 4, bothAxes });
      const ms = performance.now() - t0;
      const pose = fitHexPose({ ...res, w: W, h: H });
      results.push({
        W, H, bothAxes, ms: +ms.toFixed(0),
        detections: res.fused.length,
        ids: res.fused.map((f: any) => f.id).sort((a: number, b: number) => a - b),
        sizes: res.fused.map((f: any) => Math.round(f.a ?? 0)).sort((a: number, b: number) => a - b),
        unidentifiedPosed: res.unidentified.filter((u: any) => u.posed).length,
        rowsTried: res.rowsTried, rowHits: res.rowHits,
        conflicts: res.conflicts?.length ?? null,
        crossPx: res.worstCrossPx ?? null,
        poseOk: pose.ok,
        counts: pose.ok ? pose.counts : null,
        offTarget: pose.ok ? pose.offTarget.length : null,
        rms: pose.ok ? pose.rmsResidualPx : null,
        mmPerPx: pose.ok ? pose.mmPerPx : null,
        distanceMm: pose.pose ? Math.round(pose.pose.distanceMm) : null,
        tiltDeg: pose.pose ? Math.round(pose.pose.tiltDeg) : null,
        poseWhy: pose.ok ? null : pose.poseWhy ?? pose.why ?? null,
      });
    }
  }
  return { NW, NH, results };
}, { b64, widths: WIDTHS });

console.log(`photo ${out.NW}x${out.NH}\n`);
console.log("  width   axes    dets  ids                       read/loc/mis/msp off  rms    mm/px  dist  tilt   ms");
for (const r of out.results) {
  const c = r.counts;
  console.log(
    `  ${String(r.W).padStart(5)}  ${(r.bothAxes ? "both" : "rows").padEnd(6)} ${String(r.detections).padStart(4)}  ` +
    `${("[" + r.ids.join(",") + "]").padEnd(24)} ` +
    (r.poseOk
      ? `${c.read}/${c.located}/${c.missing}/${c.misplaced}`.padEnd(17) + String(r.offTarget).padStart(3) +
        `  ${String(r.rms).padStart(5)}  ${String(r.mmPerPx).padStart(5)}  ${String(r.distanceMm).padStart(4)}  ${String(r.tiltDeg).padStart(4)}`
      : `NO PLANE (${r.poseWhy ?? ""})`.padEnd(46)) +
    `  ${String(r.ms).padStart(5)}`
  );
}
writeFileSync("scratch/rmbt/photo-result.json", JSON.stringify(out, null, 1));
await browser.close();
