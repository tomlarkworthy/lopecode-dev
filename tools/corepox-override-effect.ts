// Do the restored connector overrides change what the corpus ships DO?
import {importNotebookModule} from "./notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const Ship:any=await m.value("Ship"); const load:any=await m.value("loadShipSpec");
const World:any=await m.value("World");
const fs=await import("node:fs");
const raw:any[]=[];
for (const line of fs.readFileSync("vendor/corepox/firebase/data/ships.json","utf8").split("\n")){
  const i=line.indexOf(","); if(i<0) continue;
  try{const s=JSON.parse(line.slice(i+1)); if(s?.components) raw.push(s);}catch{}
}
let thrusting=0, firing=0, armed=0, ok=0;
for(const r of raw){
  let s:any; try{ s=new Ship(load(r).spec,{team:"a"}); }catch{ continue; }
  ok++;
  const unwired=(c:any)=>!s.conns.some((k:any)=>k.to[0]===c.px&&k.to[1]===c.py);
  for(const c of s.live){
    if(!unwired(c)) continue;
    if(c.type==="Engine"&&(c.in.in??0)>0) {thrusting++; break;}
  }
  for(const c of s.live){ if(unwired(c)&&(c.type==="Lazer")&&(c.in.in??0)>0){firing++;break;} }
  for(const c of s.live){ if(unwired(c)&&c.type==="Explosive"&&(c.in.in??0)>0){armed++;break;} }
}
console.log(`${ok} ships load`);
console.log(`  ${thrusting} start with an UNWIRED engine already at throttle`);
console.log(`  ${firing} with an unwired lazer already firing`);
console.log(`  ${armed} with an unwired explosive already triggered`);
