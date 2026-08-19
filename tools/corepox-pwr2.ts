import {ROSTER, Ship} from "./corepox-roster.ts";
for (const spec of ROSTER as any[]) { const s=new Ship(spec,{team:"a"});
  const off=s.comps.filter((c:any)=>!c.powered);
  console.log(` ${spec.name.padEnd(13)} spare ${String(s.power).padStart(3)}` + (off.length?`  OFF: ${off.map((c:any)=>c.type).join(",")}`:"  all on")); }
