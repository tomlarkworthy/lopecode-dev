// Which archetypes are malformed under the real footprints, and exactly how.
// The layouts were authored when every component was assumed 1x1.
import {importNotebookModule} from "./notebook-import.ts";
const m=await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const Ship:any=await m.value("Ship"); const TYPES:any=await m.value("TYPES");
const {ROSTER}:any=await import("./corepox-tourney-specs.ts");
for(const spec of ROSTER){
  const s=new Ship(spec,{team:"a"});
  const at=new Map<string,any[]>();
  for(const c of s.comps) for(const [x,y] of c.tiles){
    const k=x+","+y; if(!at.has(k)) at.set(k,[]); at.get(k)!.push(c); }
  const clash=[...at.entries()].filter(([,v])=>v.length>1);
  const isl=s.islands().length;
  const badPorts=s.conns.filter((k:any)=>!s.at(k.from[0],k.from[1])||!s.at(k.to[0],k.to[1]));
  const tag=(clash.length||isl>1||badPorts.length)?"BROKEN":"ok    ";
  console.log(`${tag} ${spec.name.padEnd(13)} ${String(s.comps.length).padStart(2)} parts  ${isl} island${isl>1?"s":" "}  ${clash.length} overlapping cells  ${badPorts.length} dangling wires`);
  for(const [k,v] of clash) console.log(`         overlap at ${k}: ${v.map((c:any)=>`${c.type}@${c.px},${c.py}`).join(" + ")}`);
  for(const k of badPorts) console.log(`         wire ${k.from}->${k.to} addresses an empty cell`);
}

// Structurally legal is not the same as functional: a layout can be one body with
// every wire landing and still never thrust, if the dataflow does not reach an
// engine. (It could also be browned out, until the power budget was removed on
// 2026-08-20.) Fly each one at a stationary turtle.
const World:any=await m.value("World");
const TURTLE=ROSTER.find((r:any)=>r.name==="turtle");
console.log("\n            thrust-ticks  shots  closed(tiles)");
for(const spec of ROSTER){
  const a=new Ship(spec,{team:"a",x:0,y:-14,a:0});
  const b=new Ship(TURTLE,{team:"b",x:0,y:14,a:180});
  const w=new World([a,b]);
  let thrust=0, shots=0;
  const d0=Math.hypot(a.x-b.x,a.y-b.y);
  for(let i=0;i<20*50;i++){
    w.step();
    if(a.live.some((c:any)=>c.type==="Engine"&&Math.abs(c.thrust??0)>0.01)) thrust++;
    shots+=w.beams.filter((x:any)=>x.ship===a).length;
    if(!a.alive||!b.alive) break;
  }
  const d1=Math.hypot(a.x-b.x,a.y-b.y);
  console.log(`${spec.name.padEnd(13)} ${String(thrust).padStart(9)} ${String(shots).padStart(6)} ${(d0-d1).toFixed(1).padStart(13)}`);
}
