// Does the gapFrac 0.2 + offerWhole tuning survive a white page?
//
// A first attempt reimplemented manScene's compositing and got 25% of the bytes
// wrong, which made white look catastrophic. So: redefine the notebook's OWN
// renderManFrame and manScene with the page constant changed and nothing else,
// then read the notebook's OWN manSceneTest. 128 is the control and must
// reproduce the shipped output exactly.
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
    return v ? await v._promise : null; };

  const shipped: string = await val("manSceneTest");
  const rmfSrc: string = (await val("renderManFrame")).toString();
  // manColor is where the page level actually lives: it returns the page value
  // for r >= L.R. renderManFrame's `let v = 128` is only the degenerate-ray
  // fallback. Patching only the latter leaves every mark tile with a gray
  // square halo on a white scene -- which reads as the white page failing.
  const mcSrc: string = (await val("manColor")).toString();
  if (!mcSrc.includes("if (r >= L.R) return 128;")) throw new Error("manColor page literal missing");
  const sceneCell = [...rt._variables].find((z: any) => z._module === mod && z._name === "manScene");
  const sceneSrc: string = sceneCell._definition.toString();
  if (!rmfSrc.includes("let v = 128;")) throw new Error("renderManFrame literal missing");
  if (!sceneSrc.includes("fill(128)")) throw new Error("manScene literal missing");

  const run = async (PAGE: number) => {
    mod.redefine("manColor", ["manLayout"], (manLayout: any) =>
      eval(`(${mcSrc.replace("if (r >= L.R) return 128;", `if (r >= L.R) return ${PAGE};`)})`));
    mod.redefine("renderManFrame", ["manLayout", "manColor"], (manLayout: any, manColor: any) =>
      eval(`(${rmfSrc.replace("let v = 128;", `let v = ${PAGE};`)})`));
    mod.redefine("manScene", ["manLayout", "renderManFrame"], (manLayout: any, renderManFrame: any) =>
      eval(`(${sceneSrc.replace("fill(128)", `fill(${PAGE})`)})`)(manLayout, renderManFrame));
    await new Promise((r) => setTimeout(r, 2500));
    return await val("manSceneTest");
  };
  const at128 = await run(128);
  const at255 = await run(255);
  const strip = (t: string) => String(t).replace(/, \d+ms/g, "");
  return { shipped, at128, at255, controlMatches: strip(at128) === strip(shipped) };
});

console.log("control (redefined at 128) reproduces the shipped output:", out.controlMatches);
if (!out.controlMatches) {
  console.log("\n--- shipped ---\n" + String(out.shipped).trim());
  console.log("\n--- redefined @128 ---\n" + String(out.at128).trim());
} else {
  console.log("\n=== page 128 (control) ===\n" + String(out.at128).trim());
  console.log("\n=== page 255 (white) ===\n" + String(out.at255).trim());
}
console.log("\npageerrors:", errs.length ? errs.slice(0, 3) : "none");
await browser.close();
