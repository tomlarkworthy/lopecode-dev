// Flipping "scan both axes" while the camera is running is reported to break
// the rig. Reproduce it: run with a synthetic scene as the camera, prove the
// loop is advancing, flip the toggle, and prove it either keeps advancing or
// does not — with console and page errors captured either way.
import { chromium } from "playwright";
import { resolve } from "node:path";

const NB = resolve(process.argv.includes("--nb")
  ? process.argv[process.argv.indexOf("--nb") + 1]
  : "lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const browser = await chromium.launch({
  headless: true,
  args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
});
const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, permissions: ["camera"] });
const page = await ctx.newPage();
const errs: string[] = [];
page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message.slice(0, 200)));
page.on("console", (m) => { if (m.type() === "error") errs.push("CONSOLE " + m.text().slice(0, 200)); });
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 180000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 180000 });
await page.waitForTimeout(12000);
await page.waitForFunction(() => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  if (!mod) return false;
  const names = new Set([...rt._variables].filter((v: any) => v._module === mod).map((v: any) => v._name));
  return ["viewof liveOn", "liveVideo", "hexRigView", "renderHexScene", "viewof hexRigCfg"].every((n) => names.has(n));
}, undefined, { timeout: 120000 });

const out = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const vars = [...rt._variables].filter((v: any) => v._module === mod);
  const V = (n: string) => vars.find((x: any) => x._name === n);
  const log: string[] = [];

  const cb = (V("viewof liveOn")._value as HTMLElement).querySelector("input[type=checkbox]") as HTMLInputElement;
  if (!cb.checked) { cb.checked = true; cb.dispatchEvent(new Event("input", { bubbles: true })); }
  await new Promise((r) => setTimeout(r, 3000));

  // a real scene, so the rig has marks to find and the HUD says something
  const renderHexScene = await mod.value("renderHexScene");
  const scene = renderHexScene({ W: 960, H: 720, yawDeg: 8, tiltDeg: 22, fill: 0.72 });
  const src = document.createElement("canvas");
  src.width = scene.w; src.height = scene.h;
  const g = src.getContext("2d")!;
  const im = g.createImageData(scene.w, scene.h);
  for (let i = 0, p = 0; i < scene.gray.length; i++, p += 4) {
    im.data[p] = im.data[p + 1] = im.data[p + 2] = scene.gray[i]; im.data[p + 3] = 255;
  }
  // jitter one pixel per frame so a frozen canvas is distinguishable from a
  // live one showing an unchanging scene
  let t = 0;
  const paint = () => { g.putImageData(im, 0, 0); g.fillRect((t++ % 40), 0, 2, 2); requestAnimationFrame(paint); };
  paint();
  const v = V("liveVideo")._value as HTMLVideoElement;
  v.srcObject = (src as any).captureStream(30);
  await v.play().catch(() => {});
  await new Promise((r) => setTimeout(r, 4000));

  const view: any = V("hexRigView")._value;
  const hud = () => String(view.hud.textContent || "");
  const shot = () => (view.querySelector("canvas") as HTMLCanvasElement).toDataURL().slice(-80);

  const advancing = async (tag: string) => {
    const a = shot(), h0 = hud();
    await new Promise((r) => setTimeout(r, 1500));
    const b = shot(), h1 = hud();
    log.push(`${tag}: canvasChanged=${a !== b} hudChanged=${h0 !== h1} hud="${h1.slice(0, 70)}"`);
    return a !== b;
  };

  const before = await advancing("before flip");

  // flip the toggle the way a user would
  const cfg: any = V("viewof hexRigCfg")._value;
  const boxes = [...cfg.querySelectorAll("input[type=checkbox]")] as HTMLInputElement[];
  const labels = boxes.map((b) => (b.closest("label")?.textContent || b.parentElement?.textContent || "").trim());
  const idx = labels.findIndex((l) => /both axes/i.test(l));
  log.push(`checkbox labels: ${JSON.stringify(labels)} -> index ${idx}`);
  if (idx < 0) return { log, before, after: null, note: "both-axes checkbox not found" };
  // Flip it repeatedly, faster than the loop's 250ms yield period. That is what
  // makes two generators overlap, and with bothAxes on they alternate 960x720
  // and 720x960 through the same pool — the condition the single-slot init
  // resolver could not survive.
  for (let i = 0; i < 6; i++) {
    boxes[idx].checked = i % 2 === 0;
    boxes[idx].dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 400));
  }
  boxes[idx].checked = true;
  boxes[idx].dispatchEvent(new Event("input", { bubbles: true }));

  await new Promise((r) => setTimeout(r, 6000));
  // the view node itself may have been replaced when hexRigView re-ran
  const view2: any = V("hexRigView")._value;
  log.push(`view node replaced: ${view2 !== view}; in document: ${document.contains(view2)}`);
  const shot2 = () => (view2.querySelector("canvas") as HTMLCanvasElement).toDataURL().slice(-80);
  const a2 = shot2();
  await new Promise((r) => setTimeout(r, 2500));
  const after = a2 !== shot2();
  log.push(`after flip: canvasChanged=${after} hud="${String(view2.hud.textContent || "").slice(0, 70)}"`);

  // is the runtime itself still alive, or is something parked on a promise?
  const probe = rt.module();
  let alive = false;
  probe.variable({ fulfilled: () => { alive = true; } }).define("probe", [], () => 1 + 1);
  await new Promise((r) => setTimeout(r, 1200));
  log.push(`runtime still computing new cells: ${alive}`);

  // flip it back
  boxes[idx].checked = false;
  boxes[idx].dispatchEvent(new Event("input", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 4000));
  const view3: any = V("hexRigView")._value;
  const shot3 = () => (view3.querySelector("canvas") as HTMLCanvasElement).toDataURL().slice(-80);
  const a3 = shot3();
  await new Promise((r) => setTimeout(r, 2500));
  log.push(`after flipping back: canvasChanged=${a3 !== shot3()} hud="${String(view3.hud.textContent || "").slice(0, 70)}"`);

  return { log, before, after, alive };
});
await browser.close();
console.log(out.log.join("\n"));
console.log("\nbefore flip advancing:", out.before, " after flip advancing:", out.after);
console.log("page/console errors:\n  " + (errs.length ? errs.slice(0, 10).join("\n  ") : "(none)"));
