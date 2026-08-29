import {importNotebookModule} from "../notebook-import.ts";
const eng = await importNotebookModule(process.env.COREPOX_ENGINE ?? "modules/@tomlarkworthy/corepox-engine.js");
const E: any = {};
for (const n of ["Ship","World","geom","DT","pilot","loadShipSpec","TYPES","rotTile"]) E[n] = await eng.value(n);
const {rotTile: _rt, ...Ed} = E;
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js", {overrides: {md:(s:any)=>String(s)}});
const SHIPS: any = await mis.value("SHIPS");
const duel = await importNotebookModule("modules/@tomlarkworthy/corepox-duel.js", {overrides: {...Ed, SHIPS, md:(s:any)=>String(s), htl:{html:()=>{}}, battlefield:null, backdrop:null, invalidation:new Promise(()=>{})}});
const min = await importNotebookModule("modules/@tomlarkworthy/corepox-mining.js", {overrides: {...E, SHIPS, DUEL_BACKDROP: await duel.value("DUEL_BACKDROP"), humanControl: await duel.value("humanControl"), md:(s:any)=>String(s), htl:{html:()=>{}}, battlefield:null, backdrop:null, invalidation:new Promise(()=>{})}});
const runMining: any = await min.value("runMining"), MINER: any = await min.value("MINER");
const SEEDS = [3, 5, 11, 17, 23, 31];
for (const rockHp of [3, 5, 8]) for (const oreSpread of [3, 5]) {
  let scrap = 0, pieces = 0, wrecks = 0, paid = 0;
  for (const seed of SEEDS) {
    const R = runMining({ship: MINER, seed, control: "auto", rockHp, oreSpread});
    scrap += R.scrap; pieces += Object.values(R.collected).reduce((a: any, b: any) => a + b, 0) as number;
    if (R.outcome === "wrecked") wrecks++;
    if (R.scrap > 0) paid++;
  }
  console.log(`rockHp ${rockHp} oreSpread ${oreSpread}: paid ${paid}/${SEEDS.length}` +
    `  ${pieces} pieces  ${scrap} scrap  ${wrecks} wrecked`);
}
