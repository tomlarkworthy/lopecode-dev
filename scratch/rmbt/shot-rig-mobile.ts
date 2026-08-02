// Screenshot the rig at phone width with real marks in view.
//
// The fake camera shows a test pattern with no marks, so it can never answer
// "is the overlay legible on a phone". This renders a hex scene with the
// notebook's own renderHexScene, pipes it in as a MediaStream via
// canvas.captureStream(), and photographs the result at the width being
// complained about.
import { chromium } from "playwright";
import { resolve } from "node:path";

const NB = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const WIDTH = Number(process.argv.includes("--width") ? process.argv[process.argv.indexOf("--width") + 1] : 390);
const OUT = process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1] : `scratch/rmbt/rig-${WIDTH}.png`;

const browser = await chromium.launch({
  headless: true,
  args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
});
const ctx = await browser.newContext({
  viewport: { width: WIDTH, height: 900 },
  deviceScaleFactor: 3, // phone-like DPR, so thin strokes show as they really are
  permissions: ["camera"],
});
const page = await ctx.newPage();
await page.addInitScript(() => {
  const orig = (window as any).Runtime;
  let cap = false;
  Object.defineProperty(window, "Runtime", {
    get() { return orig; },
    set(N: any) {
      const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
      W.prototype = N.prototype; Object.assign(W, N); return W;
    },
  });
});
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 180000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 180000 });
await page.waitForTimeout(12000);
// The module's variables appear as the graph builds; waiting on a wall clock
// races that, and the failure reads as "V(...) is undefined" a long way from
// the cause.
await page.waitForFunction(() => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  if (!mod) return false;
  const names = new Set([...rt._variables].filter((v: any) => v._module === mod).map((v: any) => v._name));
  return ["viewof liveOn", "liveVideo", "hexRigView", "renderHexScene"].every((n) => names.has(n));
}, undefined, { timeout: 60000 }).catch(async () => {
  const seen = await page.evaluate(() => {
    const rt = (window as any).__ojs_runtime;
    const mods = [...rt.mains.keys()];
    const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
    const names = mod ? [...rt._variables].filter((v: any) => v._module === mod).map((v: any) => v._name) : [];
    return { mods, count: names.length, sample: names.slice(0, 25) };
  });
  console.log("WAIT FAILED, present:", JSON.stringify(seen, null, 1));
  throw new Error("module variables never appeared");
});

const info = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const vars = [...rt._variables].filter((v: any) => v._module === mod);
  const V = (n: string) => vars.find((x: any) => x._name === n);

  // camera on, so the rig loop runs rather than parking
  const vo = V("viewof liveOn")._value as HTMLElement;
  const cb = vo.querySelector("input[type=checkbox]") as HTMLInputElement;
  if (!cb.checked) { cb.checked = true; cb.dispatchEvent(new Event("input", { bubbles: true })); }
  await new Promise((r) => setTimeout(r, 5000));

  // a rendered scene, animated, as the camera feed
  const renderHexScene = await mod.value("renderHexScene");
  const scene = renderHexScene({ W: 960, H: 720, yawDeg: 8, tiltDeg: 22, fill: 0.72 });
  const src = document.createElement("canvas");
  src.width = scene.w; src.height = scene.h;
  const g = src.getContext("2d")!;
  const img = g.createImageData(scene.w, scene.h);
  for (let i = 0, p = 0; i < scene.gray.length; i++, p += 4) {
    const v = scene.gray[i];
    img.data[p] = img.data[p + 1] = img.data[p + 2] = v;
    img.data[p + 3] = 255;
  }
  const paint = () => { g.putImageData(img, 0, 0); requestAnimationFrame(paint); };
  paint();

  const stream = (src as any).captureStream(30);
  const v = V("liveVideo")._value as HTMLVideoElement;
  v.srcObject = stream;
  await v.play().catch(() => {});
  await new Promise((r) => setTimeout(r, 4000));

  const view = V("hexRigView")._value as HTMLElement & { hud: HTMLElement; overlay: SVGElement };
  const strokes = [...view.overlay.querySelectorAll("[stroke-width]")]
    .map((n) => n.getAttribute("stroke-width"));
  const fonts = [...view.overlay.querySelectorAll("text")].map((n) => n.getAttribute("font-size"));
  return {
    stageCssWidth: Math.round(view.querySelector("div")!.getBoundingClientRect().width),
    hud: view.hud.textContent,
    overlayNodes: view.overlay.childElementCount,
    strokeWidths: [...new Set(strokes)].slice(0, 8),
    fontSizes: [...new Set(fonts)].slice(0, 8),
  };
});
console.log(JSON.stringify(info, null, 1));

const stage = page.locator("canvas").first();
await stage.screenshot({ path: OUT }).catch(async () => { await page.screenshot({ path: OUT }); });
await browser.close();
console.log("wrote " + OUT);
