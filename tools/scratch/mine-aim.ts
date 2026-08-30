// The guns on MINER are WIRED to a Constant, so `fireGuns` never touches them and
// `cmd.fire` is inert -- they fire every cycle regardless. What decides whether a
// shot lands is where the nose is pointing. This measures that, not the intent flag.
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
const geom = E.geom;
console.log("seed  paid   |heading-face| mean/med  <20deg%   seamRange mean  rockDmg");
for (const seed of [101,102,103,105,107]) {
  const M: any = newMining({...D, seed, ship: MINER, ...CFG});
  const rockHp = () => M.world.ships.filter((s: any) => s !== M.player)
    .reduce((a: number, s: any) => a + s.live.filter((c: any) => E.TYPES[c.type].ore == null)
      .reduce((b: number, c: any) => b + c.hp, 0), 0);
  const hp0 = rockHp();
  const errs: number[] = [], rngs: number[] = [];
  while (!M.outcome) {
    stepMining(M);
    if (M.cmd?.face != null) {
      errs.push(Math.abs(geom.norm(M.cmd.face - M.player.a)));
      if (M.cmd.target) rngs.push(Math.hypot(M.cmd.target[0] - M.player.x, M.cmd.target[1] - M.player.y));
    }
  }
  const n = Object.values(M.collected).reduce((a: any, b: any) => a + b, 0) as number;
  const mean = (a: number[]) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;
  const med = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
  console.log(`${String(seed).padStart(4)}  ${String(n).padStart(4)}   ` +
    `${mean(errs).toFixed(0).padStart(8)} / ${med(errs).toFixed(0).padStart(3)}` +
    `  ${(100 * errs.filter(e => e < 20).length / errs.length).toFixed(0).padStart(6)}%` +
    `  ${mean(rngs).toFixed(1).padStart(13)}  ${String(hp0 - rockHp()).padStart(7)}`);
}
