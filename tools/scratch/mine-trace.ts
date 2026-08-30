import {importNotebookModule} from "../notebook-import.ts";
const eng = await importNotebookModule(process.env.COREPOX_ENGINE!);
const E: any = {};
for (const n of ["Ship","World","geom","DT","pilot","loadShipSpec","TYPES"]) E[n] = await eng.value(n);
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js", {overrides: {md:(s:any)=>String(s)}});
const SHIPS: any = await mis.value("SHIPS");
const duel = await importNotebookModule("modules/@tomlarkworthy/corepox-duel.js", {overrides: {...E, SHIPS, md:(s:any)=>String(s), htl:{html:()=>{}}, battlefield:null, backdrop:null, invalidation:new Promise(()=>{})}});
const min = await importNotebookModule("modules/@tomlarkworthy/corepox-mining.js", {overrides: {...E, SHIPS, DUEL_BACKDROP: await duel.value("DUEL_BACKDROP"), humanControl: await duel.value("humanControl"), md:(s:any)=>String(s), htl:{html:()=>{}}, battlefield:null, backdrop:null, invalidation:new Promise(()=>{})}});
const newMining: any = await min.value("newMining");
const stepMining: any = await min.value("stepMining");
const M = newMining({ship: SHIPS.laserpost, duration: 60, seed: 5, density: 1.0,
                     rockVolume: 8, oreVolume: 2, rockHp: 10, control: "wired"});
const rocks = () => M.world.ships.filter((s: any) => s !== M.player);
const hp = () => rocks().reduce((a: number, s: any) => a + s.live.reduce((b: number, c: any) => b + c.hp, 0), 0);
const near = () => Math.min(...rocks().flatMap((s: any) => s.live.map((c: any) => {
  const [x, y] = s.worldOf(c); return Math.hypot(x - M.player.x, y - M.player.y); })));
console.log("rocks", rocks().length, "player", M.player.live.map((c:any)=>c.type).join(","));
console.log("rock distances:", rocks().map((s: any) => Math.hypot(s.x, s.y).toFixed(1)).join(" "));
for (let i = 0; i < 1200; i++) {
  stepMining(M);
  if (i % 200 === 0)
    console.log(`t=${M.world.t.toFixed(1)} beams ${M.world.beams.length} particles ${M.world.particles.length}` +
      ` nearest ${near().toFixed(1)}  rockHp ${hp()}  bodies ${rocks().length}  ` +
      M.player.live.map((c: any) => `${c.type}:${JSON.stringify(c.in)}`).join(" "));
}
