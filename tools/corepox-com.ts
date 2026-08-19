import {ROSTER, Ship} from "./corepox-roster.ts";
console.log(" name           mass   CoM(cx,cy)   engines: pos -> torque-arm about CoM");
for (const spec of ROSTER as any[]) {
  const s = new Ship(spec,{team:"a"});
  const eng = s.live.filter((c:any)=>c.type==="Engine");
  // engine thrusts along ship +up; torque arm is its horizontal offset from CoM
  const arms = eng.map((e:any)=>`${e.px},${e.py}: arm ${(e.px - s.cx).toFixed(2)}`);
  console.log(` ${spec.name.padEnd(13)} ${s.mass.toFixed(2).padStart(5)}  (${s.cx.toFixed(2)},${s.cy.toFixed(2)})   ${arms.join("  ")}`);
}
