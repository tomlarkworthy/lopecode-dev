// Where does the ~0.25mm-per-edge outward bias come from?
import { chromium } from "playwright";
import { resolve } from "node:path";
const NB = resolve("lopebooks/notebooks/tomlarkworthy_flat-trace.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
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
  const W = 1280, H = 960;
  const TRUE = { f: 1150, cx: W/2-8, cy: H/2+5, k1: -0.22, k2: 0.06, p1: 0, p2: 0 };
  const matGray = makeMatSampler();
  const comp = (A:any,B:any)=>A.map((r:any)=>B[0].map((_:any,j:number)=>r.reduce((s:number,v:number,k:number)=>s+v*B[k][j],0)));
  const ro=12*Math.PI/180, t=4*Math.PI/180, a=35*Math.PI/180;
  const Rz=[[Math.cos(ro),-Math.sin(ro),0],[Math.sin(ro),Math.cos(ro),0],[0,0,1]];
  const ax=[Math.cos(a),Math.sin(a),0]; const c=Math.cos(t), s=Math.sin(t), C=1-c;
  const Rt=[[c+ax[0]*ax[0]*C,ax[0]*ax[1]*C,ax[1]*s],[ax[1]*ax[0]*C,c+ax[1]*ax[1]*C,-ax[0]*s],[-ax[1]*s,ax[0]*s,c]];
  const pose=[...calib.rodriguesInv(comp(Rz,Rt)),0,0,(1.15*T.pageW*TRUE.f)/W];
  const map = makePlaneMap(TRUE, pose);
  const mk = (tone: number) => { const g = new Uint8Array(W*H);
    for (let y=0;y<H;y++) for (let x=0;x<W;x++){ const p=map.toPlane(x+0.5,y+0.5); const inside=p&&Math.abs(p[0])<30&&Math.abs(p[1])<18; g[y*W+x]= inside?tone:(p?matGray(p[0],p[1]):0x80); }
    return { gray: g, w: W, h: H }; };
  const res: any = {};
  const run = (label: string, frame: any, o: any) => { const r = traceFrame(frame, TRUE, o); res[label] = r.ok ? { size: r.sizeMm, area: r.areaMm2, thr: r.thresholdUsed } : r.why; };
  run("dark40 default", mk(40), {});
  run("dark40 noMorph", mk(40), { mask: { openRadius: 0, closeRadius: 0 } });
  run("dark40 open2close2", mk(40), { mask: { openRadius: 2, closeRadius: 2 } });
  run("dark40 thr40", mk(40), { mask: { threshold: 40 } });
  run("dark40 thr70", mk(40), { mask: { threshold: 70 } });
  run("light220 default", mk(220), {});
  run("light220 thr40", mk(220), { mask: { threshold: 40 } });
  return { truthSize: [60, 36], truthArea: 2160, mmPerPx: (2*T.pageW*0.575)/W, res };
});
await browser.close();
console.log(JSON.stringify(out, null, 1));
