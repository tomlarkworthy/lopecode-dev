import {importNotebookModule} from "../notebook-import.ts";
const eng = await importNotebookModule(process.env.COREPOX_ENGINE!);
const E: any = {};
for (const n of ["Ship","World","geom","DT","pilot","loadShipSpec","TYPES"]) E[n] = await eng.value(n);
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js", {overrides: {md:(s:any)=>String(s)}});
const SHIPS: any = await mis.value("SHIPS");
const rock = {name: "rock", components: Array.from({length: 6}, (_, i) =>
  ({type: "Armour", pos: [i % 2, Math.floor(i / 2)], dir: "up"})), connections: []};
for (const dist of [6, 10, 14, 18, 22, 26]) {
  const team = "rock";
  const p = new E.Ship(E.loadShipSpec(SHIPS.laserpost).spec, {team: "player", x: 0, y: 0, a: 0});
  const r = new E.Ship(E.loadShipSpec(rock).spec, {team, x: 0, y: -dist, a: 0});
  const w = new E.World([p, r]);
  const hp0 = r.live.reduce((a: number, c: any) => a + c.hp, 0);
  let beams = 0;
  for (let i = 0; i < 300; i++) { w.step(); beams += w.beams.length; }
  const hp1 = r.live.reduce((a: number, c: any) => a + c.hp, 0);
  console.log(`dist ${String(dist).padStart(3)}  beam-ticks ${String(beams).padStart(5)}  rock hp ${hp0} -> ${hp1} (lost ${hp0-hp1})  parts ${r.live.length}`);
}
