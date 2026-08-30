import {importNotebookModule} from "../notebook-import.ts";
const eng = await importNotebookModule(process.env.COREPOX_ENGINE!);
const E: any = {};
for (const n of ["Ship","World","geom","DT","pilot","loadShipSpec","TYPES"]) E[n] = await eng.value(n);
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js", {overrides: {md:(s:any)=>String(s)}});
const SHIPS: any = await mis.value("SHIPS");
const duel = await importNotebookModule("modules/@tomlarkworthy/corepox-duel.js", {overrides: {...E, SHIPS, md:(s:any)=>String(s), htl:{html:()=>{}}, battlefield:null, backdrop:null, invalidation:new Promise(()=>{})}});
const DUEL_BACKDROP: any = await duel.value("DUEL_BACKDROP");
const humanControl: any = await duel.value("humanControl");
const min = await importNotebookModule("modules/@tomlarkworthy/corepox-mining.js", {overrides: {...E, SHIPS, DUEL_BACKDROP, humanControl, md:(s:any)=>String(s), htl:{html:()=>{}}, battlefield:null, backdrop:null, invalidation:new Promise(()=>{})}});
const newMining: any = await min.value("newMining");
const stepMining: any = await min.value("stepMining");
const minerCmd: any = await min.value("minerCmd");
const M = newMining({ship: SHIPS.laserpost, duration: 30, seed: 5, density: 1.0, rockVolume: 8, oreVolume: 2});
console.log("control", M.control, "rocks", M.rocks, "player parts", M.player.live.length,
            "types", M.player.live.map((c:any)=>c.type).join(","));
const hp0 = M.world.ships.filter((s:any)=>s!==M.player).reduce((a:number,s:any)=>a+s.live.reduce((b:number,c:any)=>b+c.hp,0),0);
let beams = 0, maxB = 0;
for (let i = 0; i < 1500; i++) {
  const o = stepMining(M);
  beams += M.world.beams.length; maxB = Math.max(maxB, M.world.beams.length);
  if (i === 40 || i === 400 || i === 1400) {
    const d = Math.hypot(M.player.x, M.player.y);
    const cmd = minerCmd(M);
    console.log(`t=${M.world.t.toFixed(1)} pos ${M.player.x.toFixed(1)},${M.player.y.toFixed(1)} a=${M.player.a.toFixed(0)}`,
      "cmd", JSON.stringify(cmd).slice(0,90), "beams", M.world.beams.length,
      "gun.in", JSON.stringify(M.player.live.filter((c:any)=>/Lazer/.test(c.type)).map((c:any)=>c.in)));
  }
  if (o !== "playing") break;
}
const hp1 = M.world.ships.filter((s:any)=>s!==M.player).reduce((a:number,s:any)=>a+s.live.reduce((b:number,c:any)=>b+c.hp,0),0);
console.log(`rock hp ${hp0} -> ${hp1} (lost ${hp0-hp1});  beam-ticks ${beams}, max concurrent ${maxB}`);
console.log("bodies", M.world.ships.length - 1, "collected", JSON.stringify(M.collected));
