// How close do Cocoon's bombs have to be for the shrapnel to matter? The core
// must die WITHOUT the armour and live WITH it -- that is the whole mission.
import {importNotebookModule} from "./notebook-import.ts";
const eng = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const {Ship, World, DT}: any = await eng.values(["Ship","World","DT"]);
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js");
const SHIPS: any = await mis.value("SHIPS");

const bare = {name:"p", components:[{type:"Brain", pos:[0,0]}], connections:[]};
const cocooned = {name:"p", components:[{type:"Brain",pos:[0,0]},
  {type:"Armour",pos:[0,-1]},{type:"Armour",pos:[0,1]}], connections:[]};

function trial(spec:any, d:number) {
  const w = new World();
  const p = new Ship(spec, {team:"player", x:0, y:0, a:0});
  w.ships.push(p,
    new Ship(SHIPS.delayBomb, {team:"enemy", x:0, y:-d, a:180}),
    new Ship(SHIPS.delayBomb, {team:"enemy", x:0, y: d, a:0}));
  for (let t=0; t<5; t+=DT) w.step();
  const brain = p.comps.find((c:any)=>c.type==="Brain");
  return {hp: brain.hp, dead: brain.hp<=0};
}
console.log(" dist   bare-core   cocooned    verdict");
for (const d of [2,2.5,3,3.5,4,4.5,5,6]) {
  const b = trial(bare,d), c = trial(cocooned,d);
  const ok = b.dead && !c.dead;
  console.log(`  ${String(d).padEnd(5)} ${String(b.hp+"/20").padEnd(11)} ${String(c.hp+"/20").padEnd(11)} ${ok?"PLAYABLE":""}`);
}
