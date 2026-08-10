// Do the rescued frames still calibrate? Bytes on disk prove a transfer, not a
// rescue — the only proof is running them back through the real cells and
// getting the camera out again. Loads the .gray files into the flat-trace
// notebook headlessly, surveys each shot the way the panel does (marks, tilt,
// which side, how far to the corner), then runs the real `calibrate`.
import { chromium } from "playwright";
import { resolve } from "node:path";
import { readFileSync, readdirSync } from "node:fs";

const DIR = resolve("scratch/rmbt/calshots");
const NB = resolve("lopebooks/notebooks/tomlarkworthy_flat-trace.html");
// The archive is 8-bit grayscale PNG, which round-trips to the raw luma
// byte-for-byte (verified) and is a third smaller and actually viewable.
const files = readdirSync(DIR).filter((f) => f.endsWith(".png")).sort();
const shots = files.map((f) => {
  const meta = JSON.parse(readFileSync(resolve(DIR, f.replace(/\.png$/, ".json")), "utf8"));
  return { name: meta.name, w: meta.w, h: meta.h, png: readFileSync(resolve(DIR, f)).toString("base64") };
});

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 1200 } });
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
await page.waitForTimeout(8000);

const out = await page.evaluate(async (payload: any[]) => {
  const rt = (window as any).__ojs_runtime;
  const mod = [...rt._variables].find((v: any) => v._name === "matTarget")?._module;
  const val = async (n: string) => mod.value(n);
  const T: any = await val("matTarget");
  const calib: any = await val("calib");
  const calibrate: any = await val("calibrate");
  const afm: any = await val("analyzeFrameMan");
  const detectOpts: any = await val("detectOpts");

  const cv = document.createElement("canvas");
  const g2 = cv.getContext("2d", { willReadFrequently: true })!;
  const dec = async (b64: string, w: number, h: number) => {
    const bin = atob(b64);
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const bm = await createImageBitmap(new Blob([u], { type: "image/png" }));
    cv.width = w; cv.height = h;
    g2.drawImage(bm, 0, 0);
    const px = g2.getImageData(0, 0, w, h).data;
    const gray = new Uint8Array(w * h);
    for (let k = 0, p = 0; k < gray.length; k++, p += 4) gray[k] = px[p];
    return gray;
  };

  const SIDES = ["right", "far", "left", "near"];
  const views: any[] = [], rows: any[] = [], tilts: number[] = [];
  const sides = new Set<string>();
  for (const s of payload) {
    const gray = await dec(s.png, s.w, s.h);
    const res = afm({ gray, w: s.w, h: s.h }, detectOpts);
    const on = res.fused.filter((f: any) => T.byId.has(f.id));
    const pairs = on.map((f: any) => { const m = T.byId.get(f.id); return { X: m.xMm, Y: m.yMm, u: f.xc, v: f.yc }; });
    views.push({ name: s.name, pairs });
    let tilt = null, cover = null, side = null;
    if (pairs.length >= 4) {
      const I = { f: 1.1 * s.w, cx: s.w / 2, cy: s.h / 2, k1: 0, k2: 0, p1: 0, p2: 0 };
      const pose = calib.poseFor(I, pairs);
      if (pose) {
        const R = calib.rodrigues(pose.slice(0, 3)), t = pose.slice(3, 6);
        tilt = (Math.acos(Math.min(1, Math.abs(R[2][2]))) * 180) / Math.PI;
        tilts.push(tilt);
        const C = [0, 1, 2].map((i) => -(R[0][i] * t[0] + R[1][i] * t[1] + R[2][i] * t[2]));
        side = SIDES[(Math.round((2 * Math.atan2(C[1], C[0])) / Math.PI) + 4) % 4];
        if (tilt >= 20) sides.add(side);
      }
      const rr = Math.max(...pairs.map((p: any) => Math.hypot(p.u - s.w / 2, p.v - s.h / 2)));
      cover = rr / (Math.hypot(s.w, s.h) / 2);
    }
    rows.push({ name: s.name, marks: pairs.length, tilt: tilt == null ? null : +tilt.toFixed(1),
                side, cover: cover == null ? null : +cover.toFixed(2) });
  }
  tilts.sort((a, b) => a - b);

  const W = payload[0].w, H = payload[0].h;
  const clone = () => views.map((v) => ({ name: v.name, pairs: v.pairs.map((p: any) => ({ ...p })) }));
  const r = calibrate(clone(), W, H);

  // Is the recovered focal length actually pinned, or would any f do? Refit with
  // f frozen at several values: if the rms barely moves, the set is degenerate
  // and the number is arbitrary however small the residual looks.
  // calibrate() always seeds f from zhangK, so the freeze is done against
  // calib.bundle directly — the same optimiser calibrate ends on, with f simply
  // absent from the free list.
  const sweep: any[] = [];
  for (const k of [0.9, 1.1, 1.28, 1.5, 1.8]) {
    const I0 = { f: k * W, cx: W / 2, cy: H / 2, k1: 0, k2: 0, p1: 0, p2: 0 };
    const vs = views.filter((v) => v.pairs.length >= 5)
      .map((v) => ({ name: v.name, pairs: v.pairs.map((p: any) => ({ ...p })), pose: [0, 0, 0, 0, 0, 400] }));
    for (const v of vs) v.pose = calib.poseFor(I0, v.pairs) ?? v.pose;
    const b = calib.bundle(I0, vs, ["cx", "cy", "k1", "k2"], 100);
    sweep.push({ fFrozen: +(k * W).toFixed(0), rms: +b.rms.toFixed(3),
                 cx: +b.I.cx.toFixed(1), cy: +b.I.cy.toFixed(1), k1: +b.I.k1.toFixed(4), k2: +b.I.k2.toFixed(4) });
  }

  return {
    rows, tiltSpread: tilts.length ? +(tilts[tilts.length - 1] - tilts[0]).toFixed(1) : 0,
    oblique: tilts.filter((t) => t >= 20).length, frontal: tilts.filter((t) => t < 20).length,
    sides: [...sides], bestCover: +Math.max(0, ...rows.map((x) => x.cover ?? 0)).toFixed(2),
    fit: r.ok
      ? { ok: true, f: +r.intrinsics.f.toFixed(1), cx: +r.intrinsics.cx.toFixed(1), cy: +r.intrinsics.cy.toFixed(1),
          k1: +r.intrinsics.k1.toFixed(4), k2: +r.intrinsics.k2.toFixed(4), rms: r.rms, views: r.views,
          coverage: r.coverage, rejected: r.rejected, dropped: r.dropped, warning: r.warning, error: r.error }
      : { ok: false, why: r.why, rms: r.rms, rejected: r.rejected },
    sweep,
  };
}, shots);

console.log(JSON.stringify(out, null, 1));
await browser.close();
