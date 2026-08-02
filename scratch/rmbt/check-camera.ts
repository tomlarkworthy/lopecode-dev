// Does the rig still work with liveVideo hidden? Chromium's fake device gives a
// synthetic moving stream, so this answers it without the real camera.
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

const out = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const vars = [...rt._variables].filter((v: any) => v._module === mod);
  const V = (n: string) => vars.find((x: any) => x._name === n);

  // turn the camera on the way a user would
  const vo = V("viewof liveOn")._value as HTMLElement;
  const cb = vo.querySelector("input[type=checkbox]") as HTMLInputElement;
  if (!cb.checked) { cb.checked = true; cb.dispatchEvent(new Event("input", { bubbles: true })); }
  await new Promise((r) => setTimeout(r, 6000));

  const v = V("liveVideo")._value as HTMLVideoElement;
  const rig = V("hexRigView")._value as HTMLElement;
  const canvas = rig.querySelector("canvas") as HTMLCanvasElement;
  // Exact, not a downsampled sum: a 16x16 sum collides easily on a test
  // pattern that only moves in one corner, and "the canvas stopped updating"
  // is precisely the failure this is here to catch.
  const px = () => canvas.toDataURL();
  const a = px();
  await new Promise((r) => setTimeout(r, 1200));
  const b = px();
  const cell = v.closest(".observablehq") as HTMLElement | null;
  const s = V("liveStream")._value;
  const agree = await mod.value("poolAgreement");
  const pool = await mod.value("detectPool");
  return {
    pool: { workers: pool ? pool.size : 0, allIdentical: agree.allIdentical, frames: agree.frames,
            disagreements: agree.disagreements },
    hud: (rig.hud ? rig.hud.textContent : "").slice(0, 120),
    stream: s === null ? "null" : s.error ? "ERR " + s.error : "active=" + s.active,
    video: { paused: v.paused, t: +v.currentTime.toFixed(2), ready: v.readyState, vw: v.videoWidth, visibility: getComputedStyle(v).visibility },
    videoCellHeight: cell ? Math.round(cell.getBoundingClientRect().height) : null,
    rigCanvasChanging: a !== b, sampleBytes: [a.length, b.length],
  };
});
await browser.close();
console.log(JSON.stringify(out, null, 1));
const ok = out.video.ready >= 2 && !out.video.paused && out.rigCanvasChanging && (out.videoCellHeight ?? 999) < 40;
console.log(ok ? "\nPASS: hidden video decodes, rig canvas live, cell collapsed" : "\nFAIL");
process.exit(ok ? 0 : 1);
