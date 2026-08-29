import {importNotebookModule} from "../notebook-import.ts";
const eng = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const E: any = {};
for (const n of ["Ship","World","loadShipSpec","TYPES","rotTile"]) E[n] = await eng.value(n);
const min = await importNotebookModule("modules/@tomlarkworthy/corepox-mining.js", {overrides: {...E, SHIPS:{}, DUEL_BACKDROP:{}, humanControl:()=>{}, geom:{}, DT:0.02, pilot:()=>{}, md:(s:any)=>String(s), htl:{html:()=>{}}, battlefield:null, backdrop:null, invalidation:new Promise(()=>{})}});
const rockSpec: any = await min.value("rockSpec");
const minRng: any = await min.value("minRng");
const MINING_DEFAULTS: any = await min.value("MINING_DEFAULTS");
const MINING_ORE: any = await min.value("MINING_ORE");
const spec = rockSpec(minRng(11), {...MINING_DEFAULTS, ore: MINING_ORE});
const chunk = new E.Ship(E.loadShipSpec(spec).spec, {team: "rock", x: 0, y: 0, a: 0});
const isOre = (t: string) => E.TYPES[t]?.ore != null;
const ore = chunk.live.find((c: any) => isOre(c.type));
console.log("ore at", ore.px, ore.py, "tiles", JSON.stringify(chunk.worldTiles(ore)));
const oreCells = chunk.worldTiles(ore).map((t: any) => t.join(","));
let killed = 0;
for (const c of [...chunk.live]) {
  if (isOre(c.type)) continue;
  if (chunk.worldTiles(c).some(([x, y]: any) => [[1,0],[-1,0],[0,1],[0,-1]]
      .some(([dx, dy]: any) => oreCells.includes((x+dx) + "," + (y+dy))))) { chunk.damage(c, c.hp); killed++; }
}
console.log("killed", killed, "live", chunk.live.length);
console.log("joints of ore", JSON.stringify(chunk.jointsOf(ore)));
const isl = chunk.islands();
console.log("islands", isl.length, isl.map((g:any)=>g.length).join("+"));
const w = new E.World([chunk]); w.splitDetached();
console.log("bodies", w.ships.length, w.ships.map((s:any)=>s.live.map((c:any)=>c.type).join("+").slice(0,40)));
