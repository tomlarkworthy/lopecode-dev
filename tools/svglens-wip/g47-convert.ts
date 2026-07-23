import { importNotebookModule } from "../notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/svg-lens.js");
const V = async (n: string) => await m.value(n);
const pathConvert = await V("pathConvert"), parsePath = await V("parsePath"),
      printPath = await V("printPath"), pathSegments = await V("pathSegments"),
      pointOnSegment = await V("pointOnSegment");

const seg = (d:string, i=0) => pathSegments(parsePath(d))[i];
const cv = (d:string, i:number, to:string) => { const r = pathConvert.convert(parsePath(d), i, to); return r ? printPath(r) : null; };

console.log("L→C:", cv("M 0 0 L 10 20", 0, "C"));
console.log("C→L (straight cubic):", cv("M 0 0 C 3 6 7 14 10 20", 0, "L"));
console.log("C→L (real curve, declines):", cv("M 0 0 C 5 0 5 20 10 20", 0, "L"));
console.log("Q→C:", cv("M 0 0 Q 5 10 10 0", 0, "C"));
console.log("C→Q (from raised Q, exact):", cv(printPath(parsePath(cv("M 0 0 Q 5 10 10 0", 0, "C")!)), 0, "Q"));
console.log("C→Q (real cubic, declines):", cv("M 0 0 C 5 0 5 20 10 20", 0, "Q"));

// roundtrip L↔C byte-exact
const L = "M 0 0 L 10 20";
const rt = cv(cv(L,0,"C")!, 0, "L");
console.log("L→C→L byte-exact:", rt === L, JSON.stringify(rt));

// A→C shape check: sample points along arc vs cubics
function samplePath(d:string, N=40) {
  const segs = pathSegments(parsePath(d)).filter((s:any)=>s.kind!=="Z");
  const pts:any[] = [];
  const total = segs.length;
  for (const s of segs) for (let k=0;k<=N;k++) pts.push(pointOnSegment(s, k/N));
  return pts;
}
// arc sampled via its own pathSegments? pointOnSegment approximates A by chord, so instead compare
// endpoints + that A→C stays within tolerance of the true arc via an independent arc sampler.
const arcD = "M 10 0 A 10 10 0 0 1 0 10";
const cD = cv(arcD, 0, "C");
console.log("A→C:", cD);
// independent true-arc sampler (quarter circle centre (0,0) r10 from (10,0) to (0,10))
function trueArc(t:number){ const a = t*(Math.PI/2); return [10*Math.cos(a), 10*Math.sin(a)]; }
// sample cubic result
const csegs = pathSegments(parsePath(cD!));
function cubicAt(s:any,t:number){const L=(a:any,b:any)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
  const a=L(s.p0,s.p1),b=L(s.p1,s.p2),c=L(s.p2,s.p3),d=L(a,b),e=L(b,c);return L(d,e);}
let maxErr=0;
for(let k=0;k<=100;k++){const t=k/100; const [cx,cy]=cubicAt(csegs[0],t);
  // find nearest true-arc param (brute)
  let best=1e9; for(let j=0;j<=400;j++){const [tx,ty]=trueArc(j/400); best=Math.min(best,Math.hypot(cx-tx,cy-ty));}
  maxErr=Math.max(maxErr,best);}
console.log("A→C max deviation from true arc (r=10):", maxErr.toFixed(5), "→ sub-pixel:", maxErr<0.01);

// A→C over 270° (multiple sub-cubics)
const bigArc = "M 10 0 A 10 10 0 1 1 -10 0";
console.log("A→C 180°+ sub-cubic count:", pathSegments(parsePath(cv(bigArc,0,"C")!)).filter((s:any)=>s.kind==="C").length);
console.log("targets(L seg):", pathConvert.targets(seg("M 0 0 L 10 0")));
console.log("targets(A seg):", pathConvert.targets(seg("M 10 0 A 10 10 0 0 1 0 10")));
