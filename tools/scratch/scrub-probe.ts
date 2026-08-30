import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1400, height: 1150}});
p.on("pageerror", e => console.log("ERR", e.message));
await p.goto("file://" + process.cwd() +
  "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForFunction(() => /\b1\/\d+\b/.test(document.body.innerText), {timeout: 60000});
const skip = async () => { for (let i=0;i<8 && await p.locator(".cpx-cutscene").count();i++){ await p.click(".cpx-cutscene"); await p.waitForTimeout(90);} };
await skip();
await p.selectOption("select", "3"); await skip(); await p.waitForTimeout(1200);
const pt = async (px:number,py:number) => p.evaluate(([x,y]:any)=>{
  const root:any=[...document.querySelectorAll("div")].find((d:any)=>d.qa);
  const [vx,vy]=root.qa.tileToView(x,y); const svg=root.qa.svg(), r=svg.getBoundingClientRect(), vb=svg.viewBox.baseVal;
  return {x:r.left+(vx-vb.x)/vb.width*r.width, y:r.top+(vy-vb.y)/vb.height*r.height, vbw:vb.width, rw:r.width};
},[px,py]);
const d0 = await pt(0,0);
console.log("disc at", d0);
await p.evaluate(()=>{ (window as any).__log=[];
  const root:any=[...document.querySelectorAll("div")].find((d:any)=>d.qa);
  (window as any).__val=()=>root.qa.session().player.live.find((c:any)=>c.type==="Constant")?.param; });
// A sweep, because the question is not "does it move" but "what does a gesture of
// this size buy" -- the ramp has to make a small drag fine and a big one coarse.
for (const [dx,dy] of [[8,6],[20,15],[34,26],[48,36]] as any) {
  await p.evaluate(()=>{const root:any=[...document.querySelectorAll("div")].find((d:any)=>d.qa);
    root.qa.setParam(0, 0, 0);});
  await p.mouse.move(d0.x, d0.y); await p.mouse.down();
  for (let i=1;i<=14;i++) await p.mouse.move(d0.x+i*dx, d0.y-i*dy);
  await p.mouse.up(); await p.waitForTimeout(120);
  console.log(`drag ${(14*dx)}x${(14*dy)}px`.padEnd(18), "->", await p.evaluate(()=>(window as any).__val()));
}
await b.close();
