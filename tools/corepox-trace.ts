import {ROSTER, Ship, World} from "./corepox-roster.ts";
const by: any = Object.fromEntries(ROSTER.map((s:any)=>[s.name,s]));
function trace(name: string, opp: string) {
  const A = by[name], B = by[opp];
  const a = new Ship(A,{team:"a",x:-9,y:4,a:33}), b = new Ship(B,{team:"b",x:9,y:-4,a:211});
  const w = new World([a,b]);
  console.log(`\n== ${name} vs ${opp}`);
  console.log("  t   range  head  bearing   engines(thrust)          speed  vel-vs-target");
  for (let i=0;i<1500;i++){
    w.step();
    if (i % 150 === 0) {
      const rad = a.live.find((c:any)=>c.type==="Radar");
      const eng = a.live.filter((c:any)=>c.type==="Engine");
      const dx=b.x-a.x, dy=b.y-a.y, r=Math.hypot(dx,dy);
      const closing = -((a.vx*dx + a.vy*dy)/r);   // +ve = closing
      console.log(`${(w.t).toFixed(1).padStart(5)} ${r.toFixed(1).padStart(6)} ${a.a.toFixed(0).padStart(5)} ${(rad?.out.bearing ?? NaN).toFixed(0).padStart(8)}   ` +
        eng.map((e:any)=>`${e.px},${e.py}:${(e.thrust??0).toFixed(2)}`).join(" ").padEnd(24) +
        ` ${Math.hypot(a.vx,a.vy).toFixed(2).padStart(6)} ${closing.toFixed(2).padStart(8)}`);
    }
    if(!a.alive||!b.alive) break;
  }
}
trace("rammer","turtle");
trace("seeker","turtle");
