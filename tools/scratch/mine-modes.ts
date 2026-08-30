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
const loosePiece: any = await min.value("loosePiece");
const MINER: any = await min.value("MINER");

const hpOf = (M: any) => M.world.ships.filter((s: any) => s !== M.player)
  .reduce((a: number, s: any) => a + s.live.reduce((b: number, c: any) => b + c.hp, 0), 0);

const FLEET: any = {MINER, spike: SHIPS.spike, laserpost: SHIPS.laserpost, shooter: SHIPS.shooter};
for (const ship of Object.keys(FLEET)) {
  for (const mode of ["auto", "wired", "hand"]) {
    const M = newMining({ship: FLEET[ship], duration: 60, seed: 5, density: 1.0,
                         rockVolume: 8, oreVolume: 2, rockHp: 10,
                         control: mode === "hand" ? "human" : mode});
    const hp0 = hpOf(M);
    for (let i = 0; i < 3100; i++) {
      if (mode === "hand") {                 // a person: point at the nearest body and hold fire
        let best = null, bd = Infinity;
        for (const s of M.world.ships) { if (s === M.player || !s.live.length) continue;
          for (const c of s.live) { const [px, py] = s.worldOf(c);
            const d2 = (px - M.player.x) ** 2 + (py - M.player.y) ** 2;
            if (d2 < bd) { bd = d2; best = [px, py, s]; } } }
        if (best) M.cmd = {target: loosePiece(best[2]) || Math.sqrt(bd) > 3 ? [best[0], best[1]] : null,
                           face: [best[0], best[1]], drive: null, fire: true};
      }
      if (stepMining(M) !== "playing") break;
    }
    console.log(`${ship.padEnd(10)} ${mode.padEnd(5)} rock hp ${String(hp0).padStart(4)} -> ${String(hpOf(M)).padStart(4)}` +
      `  scrap ${String(M.scrap).padStart(3)}  ore ${JSON.stringify(M.collected).padEnd(28)}` +
      ` bodies ${M.world.ships.length - 1}  hull ${M.player.live.length}  ${M.outcome}`);
  }
}
