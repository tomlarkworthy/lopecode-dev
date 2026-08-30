// Held-out confirmation. The 18-cell sweep's best cell is the maximum of a noisy
// grid on 8 seeds, which is a lucky draw as often as it is a finding. These are the
// four candidates re-run on 20 seeds NONE of the sweeps saw.
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
const SEEDS = Array.from({length: 20}, (_, i) => 101 + i);
const CAND = [
  {rockHp: 3, oreSpread: 5, density: 0.40, duration: 120},
];
console.log(`20 held-out seeds ${SEEDS[0]}..${SEEDS.at(-1)}`);
console.log("hp spread dens dur | paid   pieces scrap/run wrecked");
for (const c of CAND) {
  let paid = 0, pieces = 0, scrap = 0, wrecked = 0;
  for (const seed of SEEDS) {
    const M: any = newMining({...D, seed, ship: MINER, ...c});
    while (!M.outcome) stepMining(M);
    const n = Object.values(M.collected).reduce((a: any, b: any) => a + b, 0) as number;
    if (n > 0) paid++;
    pieces += n; scrap += M.scrap;
    if (M.outcome === "wrecked") wrecked++;
  }
  console.log(`${String(c.rockHp).padStart(2)} ${String(c.oreSpread).padStart(6)} ${String(c.density).padStart(4)}` +
    ` ${String(c.duration).padStart(3)} | ${String(paid).padStart(2)}/20 ${String(pieces).padStart(7)} ` +
    `${(scrap/SEEDS.length).toFixed(0).padStart(8)} ${String(wrecked).padStart(7)}`);
}
