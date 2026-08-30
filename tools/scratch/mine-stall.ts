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
const seed = Number(process.argv[2] ?? 1);
const M: any = newMining({...D, seed, ship: MINER});
const memo: any = {};
for (let i = 0; i < 4500; i++) {
  stepMining(M);
  if (i % 250 === 0) {
    const cmd = M.cmd;
    console.log(`t=${M.t.toFixed(1)} p=(${M.player.x.toFixed(1)},${M.player.y.toFixed(1)}) a=${M.player.a.toFixed(0)} ` +
      `v=(${M.player.vx.toFixed(2)},${M.player.vy.toFixed(2)}) thr=[${M.player.live.filter((c:any)=>c.type==="Engine").map((c:any)=>(c.in?.in??0).toFixed(0)).join(",")}] ` +
      `cmd=${JSON.stringify(cmd && {target: cmd.target?.map((v:number)=>+v.toFixed(1)), face: cmd.face?.toFixed?.(0), fire: cmd.fire})}`);
  }
}
console.log("outcome", M.outcome, "scrap", M.scrap, M.collected);
