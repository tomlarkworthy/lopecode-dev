// Re-sweep after the MINER hull fix. The first sweep tuned a ship whose two lateral
// engines were detached at t=0 (3 islands), so every number it produced was taken on
// a single-thrust-axis hull.
import {importNotebookModule} from "../notebook-import.ts";
const eng = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const E: any = {};
for (const n of ["Ship","World","geom","DT","pilot","loadShipSpec","TYPES","rotTile"]) E[n] = await eng.value(n);
const {rotTile: _rt, ...Edep} = E;
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js", {overrides: {md: (s: any) => String(s)}});
const SHIPS: any = await mis.value("SHIPS");
const duel = await importNotebookModule("modules/@tomlarkworthy/corepox-duel.js", {
  overrides: {...Edep, SHIPS, md: (s: any) => String(s), htl: {html: () => {}},
              battlefield: null, backdrop: null, invalidation: new Promise(() => {})}});
const min = await importNotebookModule("modules/@tomlarkworthy/corepox-mining.js", {
  overrides: {...E, SHIPS, DUEL_BACKDROP: await duel.value("DUEL_BACKDROP"),
              humanControl: await duel.value("humanControl"), md: (s: any) => String(s),
              htl: {html: () => {}}, battlefield: null, backdrop: null,
              invalidation: new Promise(() => {})}});
const newMining: any = await min.value("newMining"), stepMining: any = await min.value("stepMining");
const D: any = await min.value("MINING_DEFAULTS"), MINER: any = await min.value("MINER");
const SEEDS = [1,2,3,4,5,6];
for (const DUR of [90, 120, 150]) {
console.log(`--- duration ${DUR}`);
for (const rockHp of [3]) for (const oreSpread of [5]) for (const density of [0.4, 0.55, 0.8]) {
  let paid = 0, pieces = 0, scrap = 0, wrecked = 0, rocks = 0;
  for (const seed of SEEDS) {
    const M: any = newMining({...D, seed, ship: MINER, rockHp, oreSpread, density, duration: DUR});
    rocks += M.world.ships.length - 1;
    while (!M.outcome) stepMining(M);
    const n = Object.values(M.collected).reduce((a: any, b: any) => a + b, 0) as number;
    if (n > 0) paid++;
    pieces += n; scrap += M.scrap;
    if (M.outcome === "wrecked") wrecked++;
  }
  console.log(`${String(rockHp).padStart(2)} ${String(oreSpread).padStart(6)} ${String(density).padStart(4)} |` +
    ` ${(rocks/SEEDS.length).toFixed(1).padStart(5)} ${paid}/${SEEDS.length} ${String(pieces).padStart(7)} ${String(scrap).padStart(5)} ${String(wrecked).padStart(7)}`);
}
}
