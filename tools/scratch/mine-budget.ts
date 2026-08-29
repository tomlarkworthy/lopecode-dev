// Where the 90 seconds go on a seed that pays nothing.
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
const CFG = {rockHp: 3, oreSpread: 5, density: 0.55, duration: 120};
console.log("seed  paid  firing%  rockHp0->end  bodies0->end  nearestSeam0->min  travel");
for (const seed of [101,102,103,104,105,106,107,108]) {
  const M: any = newMining({...D, seed, ship: MINER, ...CFG});
  const p0 = [M.player.x, M.player.y];
  const rockHp = () => M.world.ships.filter((s: any) => s !== M.player)
    .reduce((a: number, s: any) => a + s.live.filter((c: any) => E.TYPES[c.type].ore == null)
      .reduce((b: number, c: any) => b + c.hp, 0), 0);
  const seamDist = () => Math.min(Infinity, ...M.world.ships.flatMap((s: any) =>
    s.live.filter((c: any) => E.TYPES[c.type].ore != null).map((c: any) => {
      const [x, y] = s.worldOf(c); return Math.hypot(x - M.player.x, y - M.player.y); })));
  const hp0 = rockHp(), b0 = M.world.ships.length - 1, s0 = seamDist();
  let firing = 0, ticks = 0, travel = 0, minSeam = s0;
  let px = p0[0], py = p0[1];
  while (!M.outcome) {
    stepMining(M); ticks++;
    if (M.cmd?.fire) firing++;
    travel += Math.hypot(M.player.x - px, M.player.y - py); px = M.player.x; py = M.player.y;
    const d = seamDist(); if (d < minSeam) minSeam = d;
  }
  const n = Object.values(M.collected).reduce((a: any, b: any) => a + b, 0) as number;
  console.log(`${String(seed).padStart(4)}  ${String(n).padStart(4)}  ${(100*firing/ticks).toFixed(0).padStart(6)}%` +
    `  ${String(hp0).padStart(5)}->${String(rockHp()).padStart(5)}` +
    `  ${String(b0).padStart(6)}->${String(M.world.ships.length - 1).padStart(3)}` +
    `  ${s0.toFixed(1).padStart(8)}->${minSeam.toFixed(1).padStart(5)}  ${travel.toFixed(0).padStart(6)}`);
}
