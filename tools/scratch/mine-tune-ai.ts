// minerCmd's own knobs, on seeds the parameter sweeps never saw. standoff is the
// ring the miner holds off the chunk RIM (rad is added on top), dwell is how close
// to the ring point it has to be before it drops the waypoint and turns onto the seam.
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
const minerCmd: any = await min.value("minerCmd");
const D: any = await min.value("MINING_DEFAULTS"), MINER: any = await min.value("MINER");
const CFG = {rockHp: 3, oreSpread: 5, density: 0.40, duration: 120};
const SEEDS = Array.from({length: 12}, (_, i) => 201 + i);
console.log(`12 seeds ${SEEDS[0]}..${SEEDS.at(-1)}, cfg ${JSON.stringify(CFG)}`);
console.log("standoff dwell | paid  pieces scrap/run wrecked");
for (const standoff of [5, 7, 9]) for (const dwell of [3, 4, 6]) {
  let paid = 0, pieces = 0, scrap = 0, wrecked = 0;
  for (const seed of SEEDS) {
    const M: any = newMining({...D, seed, ship: MINER, ...CFG});
    M.control = "manual";                       // drive minerCmd ourselves, with knobs
    while (!M.outcome) { M.cmd = minerCmd(M, {standoff, dwell}); stepMining(M); }
    const n = Object.values(M.collected).reduce((a: any, b: any) => a + b, 0) as number;
    if (n > 0) paid++;
    pieces += n; scrap += M.scrap;
    if (M.outcome === "wrecked") wrecked++;
  }
  console.log(`${String(standoff).padStart(8)} ${String(dwell).padStart(5)} | ${String(paid).padStart(2)}/12` +
    ` ${String(pieces).padStart(6)} ${(scrap/SEEDS.length).toFixed(0).padStart(9)} ${String(wrecked).padStart(7)}`);
}
