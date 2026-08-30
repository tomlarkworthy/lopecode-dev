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
const DUEL_BACKDROP: any = await duel.value("DUEL_BACKDROP");
const humanControl: any = await duel.value("humanControl");
const min = await importNotebookModule("modules/@tomlarkworthy/corepox-mining.js", {
  overrides: {...E, SHIPS, DUEL_BACKDROP, humanControl, md: (s: any) => String(s),
              htl: {html: () => {}}, battlefield: null, backdrop: null,
              invalidation: new Promise(() => {})}});
const newMining: any = await min.value("newMining"), stepMining: any = await min.value("stepMining");
const D: any = await min.value("MINING_DEFAULTS");
const geom = E.geom;
for (const seed of [1,2,3,4,5]) {
  const M: any = newMining({...D, seed, ship: await min.value("MINER")});
  const p0 = [M.player.x, M.player.y];
  let maxd = 0, firstMove = -1;
  const nRocks = M.world.ships.length - 1;
  const near = Math.min(...M.world.ships.filter((s:any)=>s!==M.player).map((s:any)=>Math.hypot(s.x-p0[0], s.y-p0[1])));
  while (!M.outcome) {
    stepMining(M);
    const d = Math.hypot(M.player.x-p0[0], M.player.y-p0[1]);
    if (firstMove < 0 && d > 2) firstMove = M.t;
    maxd = Math.max(maxd, d);
  }
  console.log(`seed ${seed}: rocks ${nRocks} nearest ${near.toFixed(1)} outcome ${M.outcome} scrap ${M.scrap} ore ${JSON.stringify(M.collected)} maxTravel ${maxd.toFixed(1)} firstMove@${firstMove.toFixed(1)}s`);
}
