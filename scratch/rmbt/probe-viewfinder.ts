// Feed the page a fake camera playing a rendered mat scene, and check the
// viewfinder reads it, draws the overlay, and the Shoot button captures at
// NATIVE resolution.
import { chromium } from "playwright";
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";
const NB = resolve("lopebooks/notebooks/tomlarkworthy_flat-trace.html");
const Y4M = resolve("scratch/rmbt/fake-mat.y4m");
const browser = await chromium.launch({
  headless: true,
  args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", `--use-file-for-fake-video-capture=${Y4M}`]
});
const ctx = await browser.newContext({ permissions: ["camera"], viewport: { width: 1200, height: 1000 } });
const page = await ctx.newPage();
const errs: string[] = [];
page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
page.on("console", (m) => { const t = m.text(); if (m.type() === "error" && !t.includes("Not allowed to load local resource")) errs.push("console: " + t.slice(0, 250)); });
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; },
    set(N: any) { const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; }; W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 180000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 180000 });
await page.waitForTimeout(9000);

const before = await page.evaluate(() => {
  const host = document.querySelector('[cell="viewfinder"]') as HTMLElement;
  return { exists: !!host, hud: host?.innerText.slice(0, 160).replace(/\n/g, " ⏎ ") };
});

const camOn = await page.evaluate(() => {
  const box = document.querySelector('[cell="viewof camOn"] input[type=checkbox]') as HTMLInputElement | null;
  if (!box) return { err: "no camOn toggle" };
  box.click();
  return { clicked: true };
});
await page.waitForTimeout(9000);

const live = await page.evaluate(() => {
  const host = document.querySelector('[cell="viewfinder"]') as HTMLElement;
  const svg = host?.querySelector("svg");
  const cv = host?.querySelector("canvas") as HTMLCanvasElement | null;
  return {
    hud: host?.innerText.slice(0, 220).replace(/\n/g, " ⏎ "),
    overlayShapes: svg ? svg.children.length : 0,
    circles: svg ? svg.querySelectorAll("circle").length : 0,
    matOutline: svg ? svg.querySelectorAll("polygon").length : 0,
    canvas: cv ? [cv.width, cv.height] : null
  };
});

// press Shoot
const shot = await page.evaluate(async () => {
  const btn = [...document.querySelectorAll('[cell="viewfinder"] button')].find((b) => b.textContent === "Shoot") as HTMLButtonElement;
  if (!btn) return { err: "no Shoot button" };
  btn.click();
  await new Promise((r) => setTimeout(r, 4000));
  const rt = (window as any).__ojs_runtime;
  const mod = [...rt._variables].find((v: any) => v._name === "matTarget")?._module;
  const shots: any = await mod.value("shots");
  const tr: any = await mod.value("traceResult");
  return { shots: shots.length, shotSize: shots[0] ? [shots[0].w, shots[0].h] : null, traceOk: tr.ok, traceWhy: tr.why, sizeMm: tr.sizeMm };
});

await page.locator('[cell="viewfinder"]').first().screenshot({ path: "tools/screenshots/flat-trace-viewfinder.png" }).catch(() => {});
await browser.close();
console.log(JSON.stringify({ before, camOn, live, shot }, null, 1));
if (errs.length) console.log("--- errors ---\n" + [...new Set(errs)].slice(0, 8).join("\n"));
