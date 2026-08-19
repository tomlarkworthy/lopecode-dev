import {importNotebookModule} from "./notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const load: any = await m.value("loadShipSpec"); const Ship: any = await m.value("Ship");
const fs = await import("node:fs");
const raw: any[] = [];
for (const line of fs.readFileSync("vendor/corepox/firebase/data/ships.json","utf8").split("\n")){
  const i=line.indexOf(","); if(i<0) continue;
  try{const s=JSON.parse(line.slice(i+1)); if(s?.components) raw.push(s);}catch{}
}
let wires=0, drop=0, ships=0, onePiece=0, byPort:any={};
for(const r of raw){
  const {spec,dropped}=load(r); ships++;
  wires+=spec.connections.length; drop+=dropped.length;
  for(const k of spec.connections) byPort[k.fromPort+"->"+k.toPort]=(byPort[k.fromPort+"->"+k.toPort]??0)+1;
  try{ const s=new Ship(spec,{team:"a"}); if(s.islands().length===1) onePiece++; }catch{}
}
console.log(`${ships} ships, ${wires} wires resolved, ${drop} dropped (${(100*drop/(wires+drop)).toFixed(1)}%)`);
console.log(`${onePiece}/${ships} load as one piece (${(100*onePiece/ships).toFixed(0)}%)`);
console.log(Object.entries(byPort).sort((a:any,b:any)=>b[1]-a[1]).slice(0,12)
  .map(([k,v])=>`  ${String(k).padEnd(18)}${v}`).join("\n"));
