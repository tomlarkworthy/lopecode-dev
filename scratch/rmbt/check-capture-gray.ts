// The live loop now converts only the rows it scans, so the buffer a captured
// case copies is three quarters stale unless the capture path fills it first.
// A case is replayed at other strides, so a hole in it would show up much
// later as a frame that simply detects nothing. This captures one and compares
// every byte against the PNG the same capture stored.
import { chromium } from "playwright";
import { resolve } from "node:path";

const NB = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const browser = await chromium.launch({
  headless: true,
  args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
});
const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, permissions: ["camera"] });
const page = await ctx.newPage();
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
page.on("pageerror", (e) => console.log("!! pageerror " + e.message.slice(0, 160)));
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 180000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 180000 });
await page.waitForTimeout(12000);
await page.waitForFunction(() => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  if (!mod) return false;
  const names = new Set([...rt._variables].filter((v: any) => v._module === mod).map((v: any) => v._name));
  return ["viewof liveOn", "liveVideo", "hexRigView", "renderHexScene", "viewof hexRigCases"].every((n) => names.has(n));
}, undefined, { timeout: 120000 });

const out = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const vars = [...rt._variables].filter((v: any) => v._module === mod);
  const V = (n: string) => vars.find((x: any) => x._name === n);

  const cb = (V("viewof liveOn")._value as HTMLElement).querySelector("input[type=checkbox]") as HTMLInputElement;
  if (!cb.checked) { cb.checked = true; cb.dispatchEvent(new Event("input", { bubbles: true })); }
  await new Promise((r) => setTimeout(r, 4000));

  const renderHexScene = await mod.value("renderHexScene");
  const scene = renderHexScene({ W: 960, H: 720, yawDeg: 8, tiltDeg: 22, fill: 0.72 });
  const src = document.createElement("canvas");
  src.width = scene.w; src.height = scene.h;
  const g = src.getContext("2d")!;
  const im = g.createImageData(scene.w, scene.h);
  for (let i = 0, p = 0; i < scene.gray.length; i++, p += 4) {
    im.data[p] = im.data[p + 1] = im.data[p + 2] = scene.gray[i];
    im.data[p + 3] = 255;
  }
  const paint = () => { g.putImageData(im, 0, 0); requestAnimationFrame(paint); };
  paint();
  const v = V("liveVideo")._value as HTMLVideoElement;
  v.srcObject = (src as any).captureStream(30);
  await v.play().catch(() => {});
  await new Promise((r) => setTimeout(r, 4000));

  // press the rig's own keep button, so this tests the shipping path
  const view: any = V("hexRigView")._value;
  const btn = [...view.parentElement.querySelectorAll("button")].find((b: any) => /keep/i.test(b.textContent));
  (btn as HTMLButtonElement).click();
  await new Promise((r) => setTimeout(r, 3000));

  const cases: any[] = (V("hexRigCases") as any)._value;
  if (!cases.length) return { error: "nothing captured" };
  const c = cases[cases.length - 1];

  // every byte, against the PNG stored beside it
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = c.url; });
  const cv = document.createElement("canvas");
  cv.width = c.w; cv.height = c.h;
  const gg = cv.getContext("2d", { willReadFrequently: true })!;
  gg.drawImage(img, 0, 0);
  const px = gg.getImageData(0, 0, c.w, c.h).data;
  let bad = 0, firstBad = -1;
  for (let i = 0, p = 0; i < c.gray.length; i++, p += 4) {
    const want = (px[p] * 77 + px[p + 1] * 150 + px[p + 2] * 29) >> 8;
    if (Math.abs(want - c.gray[i]) > 1) { if (firstBad < 0) firstBad = i; bad++; }
  }
  // a wholly unconverted row reads as a run of zeros
  let zeroRows = 0;
  for (let y = 0; y < c.h; y++) {
    let z = true;
    for (let x = 0; x < c.w; x++) if (c.gray[y * c.w + x] !== 0) { z = false; break; }
    if (z) zeroRows++;
  }
  return { cases: cases.length, w: c.w, h: c.h, bytesDiffering: bad,
    firstBadRow: firstBad < 0 ? -1 : Math.floor(firstBad / c.w), zeroRows,
    labelled: c.labelled, truth: c.truth.length };
});
await browser.close();
console.log(JSON.stringify(out, null, 1));
