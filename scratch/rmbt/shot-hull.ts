// A picture of the scan panel with a real carved hull in it.
import { chromium } from "playwright";
import { resolve } from "node:path";
const NB = resolve("lopebooks/notebooks/tomlarkworthy_flat-trace.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1000 }, deviceScaleFactor: 2 });
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 180000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 180000 });
await page.waitForTimeout(6000);
await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const mod = [...rt._variables].find((v: any) => v._name === "matTarget")?._module;
  const val = (n: string) => mod.value(n);
  const T: any = await val("matTarget");
  const makeMatSampler: any = await val("makeMatSampler");
  const makePlaneMap: any = await val("makePlaneMap");
  const cameraPoseAt: any = await val("cameraPoseAt");
  const setValue: any = await val("setValue");
  const W = 1100, H = 825;
  const TRUE = { f: 0.9 * W, cx: W / 2 - 6, cy: H / 2 + 4, k1: -0.16, k2: 0.04, p1: 0, p2: 0 };
  const matGray = makeMatSampler();
  const HGT = 18;
  const inPlan = (x: number, y: number) => x >= -20 && x <= 20 && y >= -15 && y <= 15 && !(x > 0 && y > 0);
  const shots: any[] = [];
  const cams: number[][] = [[0, 85]];
  for (let i = 0; i < 8; i++) cams.push([i * 45, 30]);
  for (const [az, el] of cams) {
    const map = makePlaneMap(TRUE, cameraPoseAt(az, el, 1.15 * T.pageW));
    const gray = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const p0 = map.toPlaneAt(x + 0.5, y + 0.5, 0);
      if (!p0) { gray[y * W + x] = 230; continue; }
      const p1 = map.toPlaneAt(x + 0.5, y + 0.5, HGT);
      let hit = false;
      if (p1) for (let s = 0; s <= 24 && !hit; s++) { const u = s / 24; if (inPlan(p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u)) hit = true; }
      gray[y * W + x] = hit ? 45 : matGray(p0[0], p0[1]);
    }
    shots.push({ gray, w: W, h: H, name: `az${az} el${el}` });
  }
  setValue(await val("viewof cameraProfile"), { ...TRUE, w: W, h: H, rms: 0, views: 40, coverage: 0.9 });
  setValue(await val("viewof shots"), shots);
  setValue(await val("viewof scanOn"), true);
});
for (let i = 0; i < 120; i++) {
  const done = await page.evaluate(async () => {
    const rt = (window as any).__ojs_runtime;
    const mod = [...rt._variables].find((v: any) => v._name === "matTarget")?._module;
    const r: any = await mod.value("hullResult");
    return r.ok || (!r.working && !!r.why);
  });
  if (done) break;
  await page.waitForTimeout(500);
}
await page.waitForTimeout(4000);
const el = await page.$('[cell="hullPanel"]') ?? await page.$("body");
await el!.screenshot({ path: "tools/screenshots/flat-trace-hull.png" });
await browser.close();
console.log("shot written");
