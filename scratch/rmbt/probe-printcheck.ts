// hexPrintCheck rasterises the ACTUAL A4 SVG the download button hands over and
// runs the cascade on it -- the closest bench to a print without a printer.
// Run it on both pages by passing pageFill, so the only difference is the flood.
import { chromium } from "playwright";
import { resolve } from "node:path";
const IN = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs: string[] = [];
page.on("pageerror", (x) => errs.push(x.message.slice(0, 160)));
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${IN}#view=S100(@tomlarkworthy/coded-landmark-tracking)`, { waitUntil: "networkidle", timeout: 300000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 300000 });
await page.waitForTimeout(18000);

const out = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const val = async (n: string) => {
    const v = [...rt._variables].find((z: any) => z._module === mod && z._name === n);
    return v ? await v._promise : null;
  };
  const [T, svgOf, analyze, fitPose]: any = await Promise.all(
    ["hexTarget", "hexTargetSvg", "analyzeFrameMan", "fitHexPose"].map(val));

  // Same body as hexPrintCheck, parametrised by pageFill only.
  const run = async (pageFill: string) => {
    const svg = svgOf({ target: T, pageFill });
    const pageW = 210, pageH = 297, cx0 = pageW / 2, cy0 = 110;
    const img = new (window as any).Image();
    await new Promise((res, rej) => {
      img.onload = res; img.onerror = () => rej(new Error("rasterise failed"));
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    });
    const rows = [];
    for (const pxPerMm of [3, 2, 1.5]) {
      const W = Math.round(pageW * pxPerMm), H = Math.round(pageH * pxPerMm);
      const cv = window.document.createElement("canvas");
      cv.width = W; cv.height = H;
      const ctx = cv.getContext("2d")!;
      ctx.drawImage(img, 0, 0, W, H);
      const px = ctx.getImageData(0, 0, W, H).data;
      const gray = new Uint8Array(W * H);
      for (let i = 0, p = 0; i < gray.length; i++, p += 4)
        gray[i] = (px[p] * 77 + px[p + 1] * 150 + px[p + 2] * 29) >> 8;
      const res = analyze({ gray, w: W, h: H }, { stride: 4 });
      const pose = fitPose({ ...res, w: W, h: H }, { target: T });
      const truth = new Map(T.marks.map((m: any) => [m.id, { x: (cx0 + m.xMm) * pxPerMm, y: (cy0 - m.yMm) * pxPerMm }]));
      const onT = res.fused.filter((f: any) => truth.has(f.id));
      const e = onT.map((f: any) => Math.hypot(f.xc - (truth.get(f.id) as any).x, f.yc - (truth.get(f.id) as any).y));
      rows.push({
        pxPerMm, markPx: Math.round(T.diameterMm * pxPerMm),
        read: onT.length, of: T.marks.length,
        offTarget: res.fused.filter((f: any) => !truth.has(f.id)).length,
        worst: e.length ? +Math.max(...e).toFixed(2) : null,
        rms: pose.ok ? +pose.rmsResidualPx.toFixed(2) : null,
        scaleErrPct: pose.ok ? +(100 * (pose.mmPerPx * pxPerMm - 1)).toFixed(2) : null
      });
    }
    return rows;
  };
  return { white: await run("#ffffff"), gray: await run("#808080") };
});

const fmt = (r: any) =>
  `  ${String(r.pxPerMm).padEnd(5)} mark ${String(r.markPx).padStart(3)}px  read ${r.read}/${r.of}  offTarget ${r.offTarget}  worst ${String(r.worst).padStart(6)}px  rms ${String(r.rms).padStart(5)}  scaleErr ${r.scaleErrPct}%`;
for (const k of ["white", "gray"] as const) {
  console.log(`=== ${k} sheet ===`);
  for (const r of (out as any)[k]) console.log(fmt(r));
}
console.log("\npageerrors:", errs.length ? errs.slice(0, 3) : "none");
await browser.close();
