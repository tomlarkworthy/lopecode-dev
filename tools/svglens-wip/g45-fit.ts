import { importNotebookModule } from "../notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/svg-lens.js");
const V = async (n: string) => await m.value(n);
const fitCurve = await V("fitCurve");

const sub=(a:any,b:any)=>[a[0]-b[0],a[1]-b[1]], norm=(a:any)=>Math.hypot(a[0],a[1]);
const bern=(n:number,i:number,t:number)=>{const c=n===3?[1,3,3,1][i]:1;return c*t**i*(1-t)**(n-i);};
const q=(bez:any,t:number)=>bez.reduce((r:any,p:any,i:number)=>[r[0]+p[0]*bern(3,i,t),r[1]+p[1]*bern(3,i,t)],[0,0]);
function maxDev(pts:any[], segs:any[]) {
  // for each input point, min distance to any fitted cubic (sampled)
  let mx=0;
  for (const p of pts) { let best=1e9;
    for (const s of segs) for (let k=0;k<=60;k++) best=Math.min(best, norm(sub(q(s,k/60),p)));
    mx=Math.max(mx,best);
  }
  return mx;
}
// a smooth arc of points (quarter circle r=50), plus noise-free
const arc:any[]=[]; for(let a=0;a<=90;a+=3) arc.push([50*Math.cos(a*Math.PI/180),50*Math.sin(a*Math.PI/180)]);
for (const tol of [1, 4, 10]) {
  const segs=fitCurve(arc,tol);
  console.log(`arc tol=${tol}: ${segs.length} cubics, maxDev=${maxDev(arc,segs).toFixed(3)} <= tol: ${maxDev(arc,segs)<=tol+1e-6}`);
}
// an L-shape with a sharp corner: should split into >=2 runs (corner preserved)
const Lshape:any[]=[]; for(let x=0;x<=50;x+=5)Lshape.push([x,0]); for(let y=5;y<=50;y+=5)Lshape.push([50,y]);
const segsL=fitCurve(Lshape,2);
console.log(`L-shape: ${segsL.length} cubics (corner at (50,0) should break the fit)`);
// zoom invariance: same user points + same user tol → identical output
const a=JSON.stringify(fitCurve(arc,4)), b=JSON.stringify(fitCurve(arc,4));
console.log("deterministic:", a===b);
// T1-ish: <2 points returns nothing
console.log("degenerate:", fitCurve([[1,1]],4).length, fitCurve([],4).length);
