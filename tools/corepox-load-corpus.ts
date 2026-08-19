// Can the engine run the real 892-ship corpus?
import {importNotebookModule} from "./notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const Ship:any=await m.value("Ship"); const World:any=await m.value("World");
const load:any=await m.value("loadShipSpec");
const fs=await import("node:fs");
const ships:any[]=[];
for (const line of fs.readFileSync("vendor/corepox/firebase/data/ships.json","utf8").split("\n")) {
  const i=line.indexOf(","); if(i<0) continue;
  try { const s=JSON.parse(line.slice(i+1)); if(s?.components) ships.push(s); } catch {}
}
let ok=0, built=0, wires=0, drop=0, islands=0, err=0;
const bad:any={};
for (const raw of ships) {
  try {
    const {spec,dropped}=load(raw);
    wires+=spec.connections.length; drop+=dropped.length;
    const s=new Ship(spec,{team:"a"});
    built++; if(s.islands().length>1) islands++;
    if(s.alive) ok++;
  } catch(e:any){ err++; bad[e.message]= (bad[e.message]??0)+1; }
}
console.log(`ships in file      ${ships.length}`);
console.log(`constructed        ${built}   (${err} threw)`);
console.log(`alive at t=0       ${ok}`);
console.log(`connections wired  ${wires}, dropped ${drop} (${(100*drop/(wires+drop)).toFixed(1)}%)`);
console.log(`multi-island ships ${islands} (${(100*islands/built).toFixed(0)}%)`);
if(err) console.log("errors:", bad);
