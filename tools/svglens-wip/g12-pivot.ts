import { importNotebookModule } from "../notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/svg-lens.js");
const rotateAbout = await m.value("rotateAbout"), opsLens = await m.value("opsLens");

// G12: the transform tool feeds `focus.pivot || boxCentre` as (cx,cy) to rotateAbout. This confirms
// rotateAbout emits SVG's about-point rotate(angle cx cy), which holds (cx,cy) fixed by spec — so a
// moved pivot stays put under the rotation, the same guarantee the box-centre case already had.
function toMatrix(str: string): number[] {
  let M = [1,0,0,1,0,0];
  const mul=(A:number[],B:number[])=>[A[0]*B[0]+A[2]*B[1],A[1]*B[0]+A[3]*B[1],A[0]*B[2]+A[2]*B[3],A[1]*B[2]+A[3]*B[3],A[0]*B[4]+A[2]*B[5]+A[4],A[1]*B[4]+A[3]*B[5]+A[5]];
  const re=/(translate|rotate|scale|matrix)\s*\(([^)]*)\)/g; let mm;
  while((mm=re.exec(str))){ const a=mm[2].split(/[ ,]+/).map(Number); let T;
    if(mm[1]==="translate") T=[1,0,0,1,a[0],a[1]||0];
    else if(mm[1]==="scale") T=[a[0],0,0,a[1]??a[0],0,0];
    else if(mm[1]==="rotate"){ const r=a[0]*Math.PI/180, c=Math.cos(r),s=Math.sin(r);
      const R=[c,s,-s,c,0,0];
      if(a.length>=3){ const cx=a[1],cy=a[2]; T=mul(mul([1,0,0,1,cx,cy],R),[1,0,0,1,-cx,-cy]); } else T=R; }
    else T=a; M=mul(M,T); }
  return M;
}
const apply=(M:number[],x:number,y:number)=>[M[0]*x+M[2]*y+M[4],M[1]*x+M[3]*y+M[5]];
const base = opsLens.get("");
let ok = true;
for (const [px,py,ang] of [[0,0,90],[60,52,45],[10,20,180],[-5,7,30]]) {
  const str = opsLens.put(rotateAbout(base, ang, px, py), "");
  const [fx,fy] = apply(toMatrix(str), px, py);
  const err = Math.hypot(fx-px, fy-py); if (err>1e-6) ok=false;
  console.log(`rotate ${ang}° about (${px},${py}) -> "${str}"  pivot fixed-point err=${err.toExponential(2)}  ${err<1e-6?"HELD":"FAIL"}`);
}
console.log(ok ? "\n✅ the moved pivot is held fixed under rotation, for every pivot" : "\n❌");
