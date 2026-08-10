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
await page.waitForTimeout(9000);
// push a synthetic calibrated shot so the trace panel has something to show
await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const mod = [...rt._variables].find((v: any) => v._name === "matTarget")?._module;
  const val = (n: string) => mod.value(n);
  const T: any = await val("matTarget");
  const calib: any = await val("calib");
  const makePlaneMap: any = await val("makePlaneMap");
  const makeMatSampler: any = await val("makeMatSampler");
  const setValue: any = await val("setValue");
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
  const corners=[[-35,-22],[35,-22],[35,8],[12,8],[12,22],[-12,22],[-12,8],[-35,8]];
  const inPoly=(x:number,y:number)=>{let cc=false;for(let i=0,j=corners.length-1;i<corners.length;j=i++){const [xi,yi]=corners[i],[xj,yj]=corners[j];if((yi>y)!==(yj>y)&&x<((xj-xi)*(y-yi))/(yj-yi)+xi)cc=!cc;}return cc;};
  const gray=new Uint8Array(W*H);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const p=map.toPlane(x+0.5,y+0.5);const hit=p&&inPoly(p[0],p[1]);gray[y*W+x]=hit?40:(p?matGray(p[0],p[1]):0x80);}
  setValue(await val("viewof cameraProfile"), { ...TRUE, w: W, h: H, rms: 0.4, views: 14, coverage: 0.91 });
  setValue(await val("viewof shots"), [{ gray, w: W, h: H, name: "synthetic" }]);
});
await page.waitForTimeout(4000);
const shot = async (cell: string, file: string) => {
  const el = page.locator(`[cell="${cell}"]`).first();
  if (!(await el.count())) { console.log("no node for", cell); return; }
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await el.screenshot({ path: `tools/screenshots/${file}` });
  console.log("shot", cell, "->", file);
};
await shot("matPrintPanel", "flat-trace-mat.png");
await shot("tracePanel", "flat-trace-trace.png");
await shot("calibratePanel", "flat-trace-calib.png");
await browser.close();
