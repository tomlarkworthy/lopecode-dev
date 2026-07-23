import { importNotebookModule } from "../notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/svg-lens.js");
const V = async (n: string) => await m.value(n);
const pathConvert = await V("pathConvert"), parsePath = await V("parsePath"),
      printPath = await V("printPath"), pathSegments = await V("pathSegments");
function cubicAt(s:any,t:number){const L=(a:any,b:any)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
  const a=L(s.p0,s.p1),b=L(s.p1,s.p2),c=L(s.p2,s.p3),d=L(a,b),e=L(b,c);return L(d,e);}
// radial error: quarter/half/three-quarter circles centred at origin r=10
for (const [name,d,cx,cy,r] of [
  ["90°","M 10 0 A 10 10 0 0 1 0 10",0,0,10],
  ["180°","M 10 0 A 10 10 0 1 1 -10 0",0,0,10],
  ["270°","M 0 -10 A 10 10 0 1 1 -10 0",0,0,10],
] as any) {
  const cD = pathConvert.convert(parsePath(d), 0, "C");
  const segs = pathSegments(cD).filter((s:any)=>s.kind==="C");
  let maxE=0;
  for (const s of segs) for(let k=0;k<=200;k++){const [x,y]=cubicAt(s,k/200);
    maxE=Math.max(maxE, Math.abs(Math.hypot(x-cx,y-cy)-r));}
  console.log(`${name}: ${segs.length} cubics, max radial error ${maxE.toExponential(3)} (${(maxE/r*100).toExponential(2)}% of r)`);
}
// endpoints preserved exactly
const d="M 10 0 A 8 5 30 0 1 3 9";
const cD=pathConvert.convert(parsePath(d),0,"C");
const last=pathSegments(cD).filter((s:any)=>s.kind==="C").pop();
console.log("endpoint pinned:", JSON.stringify(last.p3), "expected [3,9]");
