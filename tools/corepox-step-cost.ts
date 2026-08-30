// What one World.step costs with ships actually touching. Eight hulls in a ring
// four tiles across, so the collision pass is doing real work rather than being
// broad-phased away. ENGINE=<path> runs a variant, which is how the per-cell
// collision and beam tests of 2026-08-21 were priced: 91.0us -> 83.5us a tick,
// the per-component broad phase paying for the inner loops.
//
//   bun tools/corepox-step-cost.ts
import {importNotebookModule} from "./notebook-import.ts";
const eng = await importNotebookModule(process.env.ENGINE ?? "modules/@tomlarkworthy/corepox-engine.js");
const {Ship, World, DT}: any = await eng.values(["Ship","World","DT"]);
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js");
const SHIPS: any = await mis.value("SHIPS");
// eight ships in a ring, all in contact range of the middle
const specs = ["shooter","laserpost","rocket","braitenbergVehicle"].filter(k=>SHIPS[k]);
const ships:any[] = [];
for (let i=0;i<8;i++){ const s = SHIPS[specs[i%specs.length]];
  ships.push(new Ship(s,{team: i%2?"a":"b", x: Math.cos(i/8*6.28)*4, y: Math.sin(i/8*6.28)*4, a: i*45})); }
const w = new World(ships);
for (let i=0;i<50;i++) w.step();                      // warm up
const t0 = performance.now();
for (let i=0;i<2000;i++) w.step();
const ms = performance.now()-t0;
console.log(`${specs.length} specs, 8 ships, 2000 ticks in ${ms.toFixed(0)}ms = ${(ms/2000*1000).toFixed(1)}us/tick`);
