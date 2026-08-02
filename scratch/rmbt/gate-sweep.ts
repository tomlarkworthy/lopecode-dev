import { readFileSync } from "fs";
const W=1280,H=960;
const A: any = await import("./kernel.js");
const B: any = await import("./kernel-opt.js");
const load=(s:string)=>({gray:new Uint8Array(readFileSync(`scratch/rmbt/imgs/${s}.luma`)),w:W,h:H,n:0});
const run=async(K:any,f:any,o:any)=>{let best:any=null;for(let i=0;i<4;i++){const t=performance.now();const r=await K.analyzeFrame(f,{minMargin:4,minReadable:4,...o});const ms=performance.now()-t;if(i&&(!best||ms<best.ms))best={ms,...r};}return best;};
const rows:any[]=[];
for (const stem of ["frame-mirror-angled","frame-mirror-flat"]) {
  const f=load(stem);
  const base=await run(A,f,{});
  const bm=new Map(base.fused.map((x:any)=>[x.id,x]));
  for (const tol of [0.012,0.03,0.06,0.12,0.25,0.5,Infinity]) {
    const b=await run(B,f,{dGateTol:tol});
    let worst=0; for(const [id,x] of bm as any){const y=b.fused.find((z:any)=>z.id===id); if(!y){worst=NaN;break;} worst=Math.max(worst,Math.hypot(x.xc-y.xc,x.yc-y.yc));}
    rows.push({frame:stem.replace("frame-mirror-",""),tol:tol===Infinity?"off":tol,ms:+b.ms.toFixed(1),
      speedup:+(base.ms/b.ms).toFixed(1),ids:b.fused.length,hits:b.run.hits.length,baseHits:base.run.hits.length,shiftPx:+worst.toFixed(2)});
  }
}
console.table(rows);
