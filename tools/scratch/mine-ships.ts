import {importNotebookModule} from "../notebook-import.ts";
const eng = await importNotebookModule(process.env.COREPOX_ENGINE!);
const E: any = {};
for (const n of ["Ship","World","geom","DT","pilot","loadShipSpec","TYPES"]) E[n] = await eng.value(n);
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js", {overrides: {md: (s:any)=>String(s)}});
const SHIPS: any = await mis.value("SHIPS");
const duel = await importNotebookModule("modules/@tomlarkworthy/corepox-duel.js", {overrides: {...E, SHIPS, md:(s:any)=>String(s), htl:{html:()=>{}}, battlefield:null, backdrop:null, invalidation:new Promise(()=>{})}});
const DUEL_BACKDROP: any = await duel.value("DUEL_BACKDROP");
const humanControl: any = await duel.value("humanControl");
const min = await importNotebookModule("modules/@tomlarkworthy/corepox-mining.js", {overrides: {...E, SHIPS, DUEL_BACKDROP, humanControl, md:(s:any)=>String(s), htl:{html:()=>{}}, battlefield:null, backdrop:null, invalidation:new Promise(()=>{})}});
const runMining: any = await min.value("runMining");
console.log(`Armour hp ${E.TYPES.Armour.hp}, Lazer hp ${E.TYPES.Lazer.hp}`);
for (const name of Object.keys(SHIPS)) {
  const spec = SHIPS[name];
  const guns = spec.components.filter((c:any)=>/Lazer|Turret|Orb|Explosive/i.test(c.type)).length;
  if (!guns) continue;
  const R = runMining({ship: spec, duration: 90, seed: 5, density: 1.0, rockVolume: 8, oreVolume: 2, rockHp: +(process.env.HP ?? 20)});
  console.log(`${name.padEnd(16)} guns ${guns}  -> ${R.outcome.padEnd(8)} scrap ${String(R.scrap).padStart(3)}` +
    `  ore ${JSON.stringify(R.collected).padEnd(34)} bodies ${R.rocks}->${R.rocksLeft}  hull ${R.parts}`);
}
