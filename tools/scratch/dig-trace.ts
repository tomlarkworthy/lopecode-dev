import {importNotebookModule} from "../notebook-import.ts";
const eng = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const E: any = {};
for (const n of ["Ship","World","geom","DT","pilot","loadShipSpec","TYPES","rotTile"]) E[n] = await eng.value(n);
const {rotTile: _rt, ...Ed} = E;
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js", {overrides: {md:(s:any)=>String(s)}});
const SHIPS: any = await mis.value("SHIPS");
const duel = await importNotebookModule("modules/@tomlarkworthy/corepox-duel.js", {overrides: {...Ed, SHIPS, md:(s:any)=>String(s), htl:{html:()=>{}}, battlefield:null, backdrop:null, invalidation:new Promise(()=>{})}});
const DUEL_BACKDROP: any = await duel.value("DUEL_BACKDROP");
const humanControl: any = await duel.value("humanControl");
const min = await importNotebookModule("modules/@tomlarkworthy/corepox-mining.js", {overrides: {...E, SHIPS, DUEL_BACKDROP, humanControl, md:(s:any)=>String(s), htl:{html:()=>{}}, battlefield:null, backdrop:null, invalidation:new Promise(()=>{})}});
const newMining: any = await min.value("newMining");
const stepMining: any = await min.value("stepMining");
const MINER: any = await min.value("MINER");
const geom = E.geom;

const minerCmd: any = await min.value("minerCmd");
const M = newMining({ship: MINER, seed: 5, control: "auto", duration: 90, rockHp: 4});
let firing = 0, ticks = 0, noTgt = 0;
let hits = 0, fired = 0;
const W = M.world;
const of = W.fire.bind(W);
W.fire = (ship:any,c:any,a:number,o:any) => { if (ship===M.player) fired++; return of(ship,c,a,o); };
for (const s of W.ships) if (s !== M.player) { const d = s.damage.bind(s);
  s.damage = (c:any,n:number)=>{ hits++; return d(c,n); }; }
let tick = 0;
while (stepMining(M) === "playing") {
  ticks++; if (M.cmd?.fire) firing++; if (!M.cmd?.target && !M.cmd?.face) noTgt++;
  if (++tick % 100 === 1) {
    const t = M.memo.seam;
    let near = Infinity, np: any = null;
    for (const s of W.ships) { if (s===M.player||!s.live.length) continue;
      for (const c of s.live) { const p = s.worldOf(c); const d = Math.hypot(p[0]-M.player.x, p[1]-M.player.y);
        if (d < near) { near = d; np = p; } } }
    const tp = t ? t.s.worldOf(t.c) : null;
    const br = tp ? geom.bearing(M.player.x, M.player.y, tp[0], tp[1]) : NaN;
    console.log(`t=${M.t.toFixed(0).padStart(3)} near=${near.toFixed(1)} a=${M.player.a.toFixed(0)}` +
      ` tgtBearing=${br.toFixed(0)} err=${Math.abs(geom.norm(br - M.player.a)).toFixed(0)}` +
      ` seam=${t ? t.c.type + " hp" + t.c.hp.toFixed(0) : "none"} dead=${W.ships.filter((s:any)=>s!==M.player).reduce((a:number,s:any)=>a+s.comps.filter((c:any)=>c.hp<=0).length,0)} bodies=${W.ships.length}` +
      ` fired=${fired} hits=${hits} v=${Math.hypot(M.player.vx, M.player.vy).toFixed(2)}` +
      ` f=${M.cmd.fire} ${JSON.stringify(M.cmd.dbg)}`);
  }
}
console.log(`fire uptime ${(100*firing/ticks).toFixed(0)}%  idle ${(100*noTgt/ticks).toFixed(0)}%`);
console.log("scrap", M.scrap, "ore", JSON.stringify(M.collected), "fired", fired, "hits", hits);
