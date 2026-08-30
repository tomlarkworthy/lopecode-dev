// How wide does the mine gate have to be? Trigger range is measured
// component-to-component, not centre-to-centre, so the mine's 5x5 footprint and
// the ship's own width both eat into the nominal 9.4-tile blast radius.
import {importNotebookModule} from "./notebook-import.ts";
const eng = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const parts: any = await eng.values(["Ship","World","TYPES","PORTS","geom","DT"]);
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js");
const MISSIONS: any[] = await mis.value("MISSIONS");
const SHIPS: any = await mis.value("SHIPS");
const {Ship, World, DT} = parts;
const av = MISSIONS.find((x:any)=>x.id==="Avoid")!;
console.log("offset  outcome              closest-approach");
for (const off of [10,12,14,16,18,20]) {
  const w = new World();
  const p = new Ship({name:"p", ...av.solution}, {team:"player", x:0, y:0, a:0});
  w.ships.push(p,
    new Ship(SHIPS.proximityMine, {team:"enemy", x:-off, y:-15, a:0}),
    new Ship(SHIPS.proximityMine, {team:"enemy", x: off, y:-27, a:0}));
  let out = "no arrival", near = Infinity;
  for (let t=0; t<40; t+=DT) {
    w.step();
    for (const s of w.ships) if (s.team==="enemy" && s.live.length)
      near = Math.min(near, Math.hypot(s.x-p.x, s.y-p.y));
    if (!p.live.some((c:any)=>c.type==="Brain")) { out = `DIED t=${t.toFixed(1)}`; break; }
    if (Math.hypot(p.x-av.zone.x, p.y-av.zone.y) < av.zone.r) { out = `reached t=${t.toFixed(1)}`; break; }
  }
  console.log(`${String(off).padStart(6)}  ${out.padEnd(20)} ${near.toFixed(1)}`);
}
