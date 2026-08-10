// Drive a synthetic shot in, turn the preview on, and check three.js actually
// renders something (not a black canvas).
import { chromium } from "playwright";
import { resolve } from "node:path";
const NB = resolve("lopebooks/notebooks/tomlarkworthy_flat-trace.html");
const browser = await chromium.launch({ headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
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
await page.waitForTimeout(8000);

const setup = await page.evaluate(async () => {
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
  return true;
});
await page.waitForTimeout(4000);

// turn the preview on through the real toggle
const clicked = await page.evaluate(() => {
  const host = document.querySelector('[cell="viewof previewOn"]');
  const box = host?.querySelector('input[type=checkbox]') as HTMLInputElement | null;
  if (!box) return { err: "no previewOn toggle" };
  box.click();
  return { clicked: true };
});
await page.waitForTimeout(12000);

const result = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const mod = [...rt._variables].find((v: any) => v._name === "matTarget")?._module;
  const THREE: any = await mod.value("THREE");
  const host = document.querySelector('[cell="previewPanel"]') as HTMLElement;
  const cv = host?.querySelector("canvas") as HTMLCanvasElement | null;
  let pixels = null;
  if (cv) {
    // read the WebGL canvas back through a 2D copy
    const tmp = document.createElement("canvas");
    tmp.width = cv.width; tmp.height = cv.height;
    tmp.getContext("2d")!.drawImage(cv, 0, 0);
    const d = tmp.getContext("2d")!.getImageData(0, 0, cv.width, cv.height).data;
    const seen = new Set<string>(); let lit = 0;
    for (let i = 0; i < d.length; i += 4) {
      seen.add(`${d[i] >> 4},${d[i+1] >> 4},${d[i+2] >> 4}`);
      if (d[i] + d[i+1] + d[i+2] > 200) lit++;
    }
    pixels = { w: cv.width, h: cv.height, distinctColours: seen.size, litFraction: +(lit / (d.length / 4)).toFixed(3) };
  }
  return {
    threeLoaded: !!(THREE && THREE.REVISION), revision: THREE?.REVISION, threeError: THREE?.error,
    panelText: host ? host.innerText.slice(0, 220).replace(/\n/g, " ⏎ ") : null,
    hasCanvas: !!cv, pixels
  };
});
await page.locator('[cell="previewPanel"]').first().screenshot({ path: "tools/screenshots/flat-trace-preview.png" }).catch(() => {});
await browser.close();
console.log(JSON.stringify({ clicked, result }, null, 1));
if (errs.length) console.log("--- errors ---\n" + [...new Set(errs)].slice(0, 8).join("\n"));
