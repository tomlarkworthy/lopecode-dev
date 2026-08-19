// A radar->turret wire aims along the line from the RADAR, but fires from the
// TURRET. The miss is the perpendicular component of the radar-turret offset and
// is RANGE-INDEPENDENT: miss = |RT| * sin(angle between RT and the sightline).
// Aim's recovered ship puts the radar 3 cells directly BEHIND the turret, and the
// LazerHardpoint composite the mission awards does the same -- so the design only
// works dead ahead. This measures how far off axis it survives.
import {importNotebookModule} from "./notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const {Ship, World, DT, geom, UNITS}: any = await m.values(["Ship","World","DT","geom","UNITS"]);
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js");
const MISSIONS: any[] = await mis.value("MISSIONS");
const SHIPS: any = await mis.value("SHIPS");
const aim = MISSIONS.find(x => x.id === "Aim")!;

console.log("bearing  range  shots  hits  outcome");
for (const brg of [0, 5, 10, 15, 20, 30, 45, 60]) {
  for (const range of [8, 16]) {
    const w = new World();
    const p = new Ship({name:"p", ...aim.solution}, {team:"player", x:0, y:0, a:0});
    const [ux, uy] = geom.unit(brg);
    const r = new Ship(SHIPS.rocket, {team:"enemy", x:ux*range, y:uy*range, a:geom.norm(brg+180)});
    r.comps.forEach((c:any)=>{ if(c.type==="Engine") c.in.in = 0; });   // held still
    w.ships.push(p, r);
    let shots = 0, hits = 0;
    const dmg = r.damage.bind(r);
    r.damage = (c:any, a:number) => { hits++; return dmg(c, a); };
    let seen = new Set();
    for (let t=0; t<20; t+=DT) {
      w.step();
      for (const b of w.particles) if (b.kind==="beam" && !seen.has(b)) { seen.add(b); shots++; }
      if (!r.live.length) break;
    }
    console.log(`${String(brg).padStart(6)}째 ${String(range).padStart(5)}  ${String(shots).padStart(5)} ` +
      `${String(hits).padStart(5)}  ${r.live.length ? "survives" : "DESTROYED"}`);
  }
}
