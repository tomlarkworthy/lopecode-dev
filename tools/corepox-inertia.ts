import {ROSTER, Ship} from "./corepox-roster.ts";
console.log(" name          tiles  mass    I(now)  I(+Icm)  ratio   turnR(now) turnR(fixed)  [tiles]");
for (const spec of ROSTER as any[]) {
  const s=new Ship(spec,{team:"a"});
  const tiles:any[]=[]; for(const c of s.live) for(const t of c.tiles) tiles.push(t);
  const d2=tiles.reduce((a,[tx,ty])=>a+0.1*((tx-s.cx)**2+(ty-s.cy)**2),0);
  const icm=tiles.length*0.1*(1/6);            // unit square about its own centre
  const Inow=Math.max(0.05,d2), Ifix=Math.max(0.05,d2+icm);
  // steady state: v = F/(m*drag), w = T/(I*drag); one engine, arm ~1, F=1
  const v=1/s.mass, wNow=1.0/Inow, wFix=1.0/Ifix;   // rad/s
  console.log(` ${spec.name.padEnd(13)} ${String(tiles.length).padStart(4)} ${s.mass.toFixed(2).padStart(6)} ${Inow.toFixed(3).padStart(8)} ${Ifix.toFixed(3).padStart(8)} ${(Ifix/Inow).toFixed(2).padStart(6)}   ${(v/wNow).toFixed(2).padStart(8)} ${(v/wFix).toFixed(2).padStart(12)}`);
}
