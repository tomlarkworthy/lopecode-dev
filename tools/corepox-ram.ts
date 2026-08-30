// Can a ship still kill by ramming? Four head-on runs, closing at 20 tiles/s
// because drag is heavy enough that 4 tiles/s never arrives.
//
// This exists because of what solid footprints did to the Orb on 2026-08-21. Its
// melee reach was measured from ONE point, the centre of its 2x2, and 1.067 tiles
// about a square whose own cells sit 0.707 out stops short of its own edge. That
// was invisible while hulls could interpenetrate; the moment they could not, an
// Orb driven into a Brain left it on full health. ENGINE=<path> runs a variant.
//
//   bun tools/corepox-ram.ts
import {importNotebookModule} from "./notebook-import.ts";
const eng = await importNotebookModule(process.env.ENGINE ?? "modules/@tomlarkworthy/corepox-engine.js");
const {Ship, World, DT}: any = await eng.values(["Ship","World","DT"]);
const mk=(c:any[],o:any)=>new Ship({name:"s",components:c,connections:[]},o);
const cases: [string, any[], any[]][] = [
  ["Orb vs Brain",   [{type:"Orb",pos:[0,0],dir:"up"}], [{type:"Brain",pos:[0,0],dir:"up"}]],
  ["Orb vs Armour",  [{type:"Orb",pos:[0,0],dir:"up"}], [{type:"Armour",pos:[0,0],dir:"up"}]],
  ["Orb vs 3xArmour",[{type:"Orb",pos:[0,0],dir:"up"}], [0,1,2].map(i=>({type:"Armour",pos:[i-1,0],dir:"up"}))],
  ["Armour vs Brain",[{type:"Armour",pos:[0,0],dir:"up"}],[{type:"Brain",pos:[0,0],dir:"up"}]],
];
for (const [label, a, b] of cases) {
  const A = mk(a,{team:"a",x:-6,y:0}), B = mk(b,{team:"b",x:0,y:0});
  A.vx = 20;                                  // drag is heavy: 4 tiles/s never arrives
  const w = new World([A,B]);
  let t=0, note="";
  for (let i=0;i<300;i++){ w.step(); t+=DT;
    if (!B.live.length) { note=`target dead at ${t.toFixed(2)}s`; break; }
    if (!A.live.length) { note=`rammer dead at ${t.toFixed(2)}s`; break; } }
  if (!note) note = `both alive at 6s  A ${A.live.map((c:any)=>c.hp)} B ${B.live.map((c:any)=>c.hp)}`;
  console.log(`${label.padEnd(18)} ${note}   gap ${Math.hypot(A.x-B.x,A.y-B.y).toFixed(2)}`);
}
