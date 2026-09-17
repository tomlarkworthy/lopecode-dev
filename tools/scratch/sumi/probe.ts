// bun tools/scratch/sumi/probe.ts [--gpu] [--wait ms] [--clicks "x,y;x,y"] [--out prefix] [--hash '#...']
import { chromium } from "playwright";
import { resolve } from "path";
const arg = (n: string, d?: string) => { const i = process.argv.indexOf(n); return i < 0 ? d : process.argv[i + 1]; };
const gpu = process.argv.includes("--gpu");
const out = arg("--out", "tools/scratch/sumi/shot")!;
const wait = Number(arg("--wait", "8000"));
const url = "file://" + resolve("lopebooks/notebooks/@tomlarkworthy_suminagashi.html") + (arg("--hash", "#view=S100(@tomlarkworthy/suminagashi)"));
const b = await chromium.launch({ headless: !process.env.HEADED, args: gpu ? ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader"] : ["--enable-unsafe-swiftshader"] });
const c = await b.newContext({ viewport: { width: Number(arg("--w", "900")), height: 1000 }, deviceScaleFactor: Number(arg("--dpr", "1")) });
const p = await c.newPage();
if (process.argv.includes("--nodemo")) await p.addInitScript(() => { (window as any).__nodemo = true; });
p.on("console", m => { if (["error", "warning"].includes(m.type())) console.log("[console]", m.type(), m.text().slice(0, 400)); });
p.on("pageerror", e => console.log("[pageerror]", String(e).slice(0, 400)));
await p.goto(url, { waitUntil: "load", timeout: 60000 });
await p.waitForSelector("canvas", { timeout: 60000 });
const evalJs = arg("--eval");
const sets = arg("--set");
if (sets) await p.evaluate((sets) => { for (const kv of sets.split(";")) { const [k, v] = kv.split("="); for (const x of (window as any).__ojs_runtime._variables) if (x._name === "viewof " + k && x._value) { x._value.value = isNaN(+v) ? v : +v; x._value.dispatchEvent(new Event("input", {bubbles: true})); } } }, sets);
const clicks = (arg("--clicks", "") || "").split(";").filter(Boolean).map(s => s.split(",").map(Number));
const shots = Number(arg("--shots", "2"));
for (const [x, y, hold = 50, pause = 1500] of clicks) {
  const box = await (await p.$("canvas"))!.boundingBox();
  await p.mouse.move(box!.x + x, box!.y + y); await p.mouse.down(); await p.waitForTimeout(hold); await p.mouse.up();
  await p.waitForTimeout(pause);
}
const blowArg = arg("--blow");
if (blowArg) {
  await p.waitForTimeout(Number(arg('--prewait','0'))); await p.locator('label', {hasText: /^\s*blow\s*$/}).click();
  const box = await (await p.$("canvas"))!.boundingBox();
  for (const g of blowArg.split(";")) { const [x1,y1,x2,y2] = g.split(",").map(Number);
    await p.mouse.move(box!.x+x1, box!.y+y1); await p.mouse.down(); for (let k=1;k<=60;k++){ await p.mouse.move(box!.x+x1+(x2-x1)*k/60, box!.y+y1+(y2-y1)*k/60); await p.waitForTimeout(12); } await p.mouse.up(); await p.waitForTimeout(500); }
}
for (let i = 0; i < shots; i++) {
  await p.waitForTimeout(wait / shots);
  const el = await p.$("canvas");
  await el!.screenshot({ path: `${out}-${i}.png` });
}
const zoom = arg("--zoom");
if (zoom) { const [zx, zy, zw, zh] = zoom.split(",").map(Number); const box = await (await p.$("canvas"))!.boundingBox();
  await p.screenshot({ path: `${out}-zoom.png`, clip: { x: box!.x + zx, y: box!.y + zy, width: zw, height: zh } }); }
const info = await p.evaluate(async () => {
  const errs = [...document.querySelectorAll(".observablehq--error")].map(e => e.textContent!.slice(0, 300));
  const cv = document.querySelector("canvas")!; const gl = (cv as any).getContext("webgl2");
  const dbg = gl.getExtension("WEBGL_debug_renderer_info");
  let n = 0; const t0 = performance.now();
  await new Promise<void>(r => { const f = () => { n++; performance.now() - t0 < 2000 ? requestAnimationFrame(f) : r(); }; requestAnimationFrame(f); });
  return { errs, renderer: dbg && gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL), fps: n / 2, size: [cv.width, cv.height] };
});
console.log(JSON.stringify(info, null, 1));
if (evalJs) console.log(JSON.stringify(await p.evaluate(evalJs)));
await p.screenshot({ path: `${out}-page.png`, fullPage: false });
await b.close();
