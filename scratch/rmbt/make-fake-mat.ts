// Render a mat-with-part scene through the notebook's own maths and write it as
// a Y4M so Chromium's fake camera can play it. Gives the viewfinder a real
// thing to look at instead of a test pattern.
import { chromium } from "playwright";
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";
const NB = resolve("lopebooks/notebooks/tomlarkworthy_flat-trace.html");
const W = 960, H = 720, N = 24;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; },
    set(N: any) { const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; }; W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 180000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 180000 });
await page.waitForTimeout(8000);
const frames = await page.evaluate(async ({ W, H, N }: any) => {
  const rt = (window as any).__ojs_runtime;
  const mod = [...rt._variables].find((v: any) => v._name === "matTarget")?._module;
  const val = (n: string) => mod.value(n);
  const T: any = await val("matTarget");
  const calib: any = await val("calib");
  const makePlaneMap: any = await val("makePlaneMap");
  const makeMatSampler: any = await val("makeMatSampler");
  const matGray = makeMatSampler();
  const comp = (A: any, B: any) => A.map((r: any) => B[0].map((_: any, j: number) => r.reduce((s: number, v: number, k: number) => s + v * B[k][j], 0)));
  const corners = [[-35,-22],[35,-22],[35,8],[12,8],[12,22],[-12,22],[-12,8],[-35,8]];
  const inPoly = (x: number, y: number) => { let c = false; for (let i=0,j=corners.length-1;i<corners.length;j=i++){const [xi,yi]=corners[i],[xj,yj]=corners[j]; if((yi>y)!==(yj>y)&&x<((xj-xi)*(y-yi))/(yj-yi)+xi)c=!c;} return c; };
  const I = { f: 0.95 * W, cx: W/2 - 4, cy: H/2 + 3, k1: -0.14, k2: 0.03, p1: 0, p2: 0 };
  const out: number[][] = [];
  for (let n = 0; n < N; n++) {
    const tilt = (5 + 3 * Math.sin(n / 4)) * Math.PI / 180;
    const az = (35 + 4 * Math.cos(n / 5)) * Math.PI / 180;
    const ro = (10 + 2 * Math.sin(n / 6)) * Math.PI / 180;
    const Rz = [[Math.cos(ro), -Math.sin(ro), 0], [Math.sin(ro), Math.cos(ro), 0], [0, 0, 1]];
    const ax = [Math.cos(az), Math.sin(az), 0];
    const c = Math.cos(tilt), s = Math.sin(tilt), C = 1 - c;
    const Rt = [[c+ax[0]*ax[0]*C, ax[0]*ax[1]*C, ax[1]*s], [ax[1]*ax[0]*C, c+ax[1]*ax[1]*C, -ax[0]*s], [-ax[1]*s, ax[0]*s, c]];
    const pose = [...calib.rodriguesInv(comp(Rz, Rt)), 0, 0, (1.02 * T.pageW * I.f) / W];
    const map = makePlaneMap(I, pose);
    const g = new Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const p = map.toPlane(x + 0.5, y + 0.5);
      g[y * W + x] = p ? (inPoly(p[0], p[1]) ? 45 : matGray(p[0], p[1])) : 20;
    }
    out.push(g);
  }
  return out;
}, { W, H, N });
await browser.close();
const hdr = Buffer.from(`YUV4MPEG2 W${W} H${H} F12:1 Ip A1:1 C420jpeg\n`, "ascii");
const chroma = Buffer.alloc((W / 2) * (H / 2), 128);
const parts: Buffer[] = [hdr];
for (const g of frames) {
  parts.push(Buffer.from("FRAME\n", "ascii"), Buffer.from(Uint8Array.from(g)), chroma, chroma);
}
const buf = Buffer.concat(parts);
writeFileSync(resolve("scratch/rmbt/fake-mat.y4m"), buf);
console.log(`wrote ${frames.length} frames, ${(buf.length / 1e6).toFixed(1)}MB`);
