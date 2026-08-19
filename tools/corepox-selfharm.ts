// With the shipped damage model, how many real ships hurt THEMSELVES? Exhaust and
// shrapnel hit any component except the emitter, so a core behind a nozzle or a
// bomb inside the hull is a self-inflicted loss with no enemy present.
import {importNotebookModule} from "./notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const Ship:any=await m.value("Ship"); const World:any=await m.value("World");
const load:any=await m.value("loadShipSpec");
const fs=await import("node:fs");
const raw:any[]=[];
for(const line of fs.readFileSync("vendor/corepox/firebase/data/ships.json","utf8").split("\n")){
  const i=line.indexOf(","); if(i<0) continue;
  try{const s=JSON.parse(line.slice(i+1)); if(s?.components) raw.push(s);}catch{}
}
let n=0, lost=0, died=0, brainBurn=0, totalLost=0;
const t0=Date.now();
for(const r of raw){
  let s:any; try{s=new Ship(load(r).spec,{team:"a",x:0,y:0,a:0});}catch{continue}
  if(!s.alive) continue;
  n++;
  const before=s.live.length, brain0=s.live.filter((c:any)=>c.type==="Brain").length;
  const w=new World([s]);                      // ALONE. no enemy, no collisions
  for(let i=0;i<250;i++) w.step();             // 5 seconds
  const after=s.live.length;
  if(after<before){ lost++; totalLost+=before-after; }
  if(!s.alive) died++;
  if(s.live.filter((c:any)=>c.type==="Brain").length<brain0) brainBurn++;
}
console.log(`${n} ships flown ALONE for 5s with the shipped damage model  (${((Date.now()-t0)/1000).toFixed(0)}s)`);
console.log(`  ${lost} (${(100*lost/n).toFixed(0)}%) damaged themselves, losing ${totalLost} components in total`);
console.log(`  ${brainBurn} (${(100*brainBurn/n).toFixed(0)}%) destroyed one of their own Brains`);
console.log(`  ${died} (${(100*died/n).toFixed(0)}%) killed themselves outright`);
