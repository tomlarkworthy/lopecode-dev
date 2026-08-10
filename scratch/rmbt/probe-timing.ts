// How long does one trace take at phone-camera resolutions?
import { chromium } from "playwright";
import { resolve } from "node:path";
const NB = resolve("lopebooks/notebooks/tomlarkworthy_flat-trace.html");
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
const out = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const mod = [...rt._variables].find((v: any) => v._name === "matTarget")?._module;
  const val = (n: string) => mod.value(n);
  const T: any = await val("matTarget");
  const calib: any = await val("calib");
  const makePlaneMap: any = await val("makePlaneMap");
  const makeMatSampler: any = await val("makeMatSampler");
  const traceFrame: any = await val("traceFrame");
  const analyzeFrameMan: any = await val("analyzeFrameMan");
  const detectOpts: any = await val("detectOpts");
  const matGray = makeMatSampler();
  const comp = (A:any,B:any)=>A.map((r:any)=>B[0].map((_:any,j:number)=>r.reduce((s:number,v:number,k:number)=>s+v*B[k][j],0)));
  const rows: any[] = [];
  for (const [W, H] of [[1280, 960], [1920, 1080], [2560, 1440], [4032, 3024]]) {
    const TRUE = { f: 0.9 * W, cx: W/2-8, cy: H/2+5, k1: -0.22, k2: 0.06, p1: 0, p2: 0 };
    const ro=12*Math.PI/180, t=4*Math.PI/180, a=35*Math.PI/180;
    const Rz=[[Math.cos(ro),-Math.sin(ro),0],[Math.sin(ro),Math.cos(ro),0],[0,0,1]];
    const ax=[Math.cos(a),Math.sin(a),0]; const c=Math.cos(t), s=Math.sin(t), C=1-c;
    const Rt=[[c+ax[0]*ax[0]*C,ax[0]*ax[1]*C,ax[1]*s],[ax[1]*ax[0]*C,c+ax[1]*ax[1]*C,-ax[0]*s],[-ax[1]*s,ax[0]*s,c]];
    const pose=[...calib.rodriguesInv(comp(Rz,Rt)),0,0,(1.15*T.pageW*TRUE.f)/W];
    const map = makePlaneMap(TRUE, pose);
    const gray = new Uint8Array(W*H);
    for (let y=0;y<H;y++) for (let x=0;x<W;x++){ const p=map.toPlane(x+0.5,y+0.5); const inside=p&&Math.abs(p[0])<30&&Math.abs(p[1])<18; gray[y*W+x]= inside?40:(p?matGray(p[0],p[1]):0x80); }
    const frame = { gray, w: W, h: H };
    const t0 = performance.now();
    const det = analyzeFrameMan(frame, detectOpts);
    const tDet = performance.now() - t0;
    const t1 = performance.now();
    const r = traceFrame(frame, TRUE, { detection: det, matGray });
    const tTrace = performance.now() - t1;
    rows.push({ res: `${W}x${H}`, mp: +((W*H)/1e6).toFixed(1), detectMs: Math.round(tDet), traceMs: Math.round(tTrace), totalMs: Math.round(tDet+tTrace), ok: r.ok, sizeMm: r.sizeMm, why: r.why });
  }
  return rows;
});
await browser.close();
console.log(JSON.stringify(out, null, 1));
