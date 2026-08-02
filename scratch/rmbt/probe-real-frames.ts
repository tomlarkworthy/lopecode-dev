#!/usr/bin/env bun
// Run the notebook's OWN analyzeFrameMan over real camera frames (PNG on disk).
//
// Frames come from the notebook's grab panel, so this closes the loop the
// synthetic renderer cannot: real optics, glare, motion blur, a phone screen
// instead of paper, and a pose the simulator never produces (the sheet tipped
// about a HORIZONTAL axis, which foreshortens vertically).
//
//   bun scratch/rmbt/probe-real-frames.ts scratch/rmbt/frames/*.png
//
// Nothing is reimplemented here: the page is the real notebook and the cells
// are pulled out of its live runtime.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { resolve, basename } from "node:path";

const NOTEBOOK = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const files = process.argv.slice(2);
if (!files.length) {
  console.error("usage: probe-real-frames.ts <frame.png> [...]");
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
page.on("pageerror", (e) => console.error("page error:", e.message));

await page.addInitScript(() => {
  const orig = (window as any).Runtime;
  let captured = false;
  Object.defineProperty(window, "Runtime", {
    get() { return orig; },
    set(NewRuntime: any) {
      const W = function (this: any, ...args: any[]) {
        const inst = new NewRuntime(...args);
        if (!captured) { (window as any).__ojs_runtime = inst; captured = true; }
        return inst;
      };
      W.prototype = NewRuntime.prototype;
      Object.assign(W, NewRuntime);
      return W;
    },
  });
});

await page.goto(`file://${NOTEBOOK}`, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForFunction(() => {
  if ((window as any).__ojs_runtime) return true;
  for (const k in window) {
    try {
      const v = (window as any)[k];
      if (v && typeof v === "object" && v._variables && v.module) { (window as any).__ojs_runtime = v; return true; }
    } catch {}
  }
  return false;
}, { timeout: 60000 });
await page.waitForTimeout(3000);

for (const f of files) {
  const b64 = readFileSync(f).toString("base64");
  const out = await page.evaluate(async ({ b64, strides }) => {
    const rt = (window as any).__ojs_runtime;
    const byName: Record<string, any> = {};
    for (const v of rt._variables) if (v._name) byName[v._name] = v;
    const analyze = byName["analyzeFrameMan"]?._value;
    if (!analyze) return { error: "analyzeFrameMan not in runtime" };

    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = "data:image/png;base64," + b64; });
    const W = img.naturalWidth, H = img.naturalHeight;
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const px = ctx.getImageData(0, 0, W, H).data;
    const gray = new Uint8Array(W * H);
    for (let i = 0, p = 0; i < gray.length; i++, p += 4)
      gray[i] = (px[p] * 77 + px[p + 1] * 150 + px[p + 2] * 29) >> 8;

    const runs: any[] = [];
    for (const stride of strides) {
      const r = analyze({ gray, w: W, h: H }, { stride });
      const fmt = (c: any) => ({
        id: c.id, x: Math.round(c.xc), y: Math.round(c.yc), rows: c.rows,
        a: c.a == null ? null : +c.a.toFixed(1),
        b: c.b == null ? null : +c.b.toFixed(1),
        aspect: c.aspect == null ? null : +c.aspect.toFixed(2),
        cover: c.cover == null ? null : +c.cover.toFixed(2),
        aSpread: c.aSpread == null ? null : +c.aSpread.toFixed(2),
        tilt: c.tiltDeg == null ? null : Math.round(c.tiltDeg),
        why: c.why,
      });
      runs.push({
        stride, ms: Math.round(r.ms), rowHits: r.rowHits,
        fused: r.fused.map(fmt),
        rejected: r.unidentified.map(fmt),
      });
    }
    return { W, H, runs };
  }, { b64, strides: [4] });

  console.log("=====", basename(f), out.error ?? `${out.W}x${out.H}`);
  for (const run of out.runs ?? []) {
    console.log(`  stride ${run.stride}: ${run.ms}ms, ${run.rowHits} row hits, ${run.fused.length} read`);
    for (const c of run.fused)
      console.log(`    READ  #${c.id} @${c.x},${c.y} rows${c.rows} a${c.a} b${c.b} asp${c.aspect} cov${c.cover} spread${c.aSpread} tilt${c.tilt}`);
    // only the near-misses matter; a 3-row lattice fit on noise is not informative
    for (const c of run.rejected.filter((z: any) => z.rows >= 6))
      console.log(`    rej   ${c.id == null ? "?" : "#" + c.id} @${c.x},${c.y} rows${c.rows} a${c.a} b${c.b} asp${c.aspect} cov${c.cover} why=${c.why}`);
  }
}

await browser.close();
