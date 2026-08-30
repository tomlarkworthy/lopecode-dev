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
const MINER: any = await min.value("MINER");

const M = newMining({ship: MINER, seed: 5, duration: 60, density: 1.0, rockVolume: 8, oreVolume: 2, rockHp: 10, control: "auto"});
console.log("player", M.player.comps.map((c:any)=>`${c.type}@${c.px},${c.py}`).join(" "));
console.log("conns", JSON.stringify(M.player.conns));
const W = M.world, seen = new Map<string,number>();
const hp = (x:any) => { const seenC = new Set(); let t = 0; for (const s of x.ships) { if (s===M.player) continue; for (const c of s.live) if (!seenC.has(c)) { seenC.add(c); t += c.hp; } } return t; };
const hp0 = hp(W);
const r0 = W.ships.find((s:any)=>s!==M.player);
console.log("rock0", r0.live.map((c:any)=>`${c.type}:${c.hp}`).join(" "), "| hp0", hp0);
const origFire = W.fire.bind(W);
let fired = 0;
W.fire = (ship:any, c:any, ang:number, o:any) => { if (ship===M.player) fired++; return origFire(ship,c,ang,o); };
for (const s of W.ships) { const d = s.damage.bind(s);
  s.damage = (c:any,n:number)=>{ const k = (s===M.player?"PLAYER ":"rock ")+c.type; seen.set(k,(seen.get(k)??0)+n); return d(c,n); }; }
let tick = 0;
while (stepMining(M) === "playing") {
  if (++tick % 600 === 1) {
    const l = M.player.live.filter((c:any)=>c.type==="Lazer");
    console.log(`t=${M.t.toFixed(1)} beams=${W.beams.length} lazers=${l.length} in=${l.map((c:any)=>c.in.in).join(",")} t=${l.map((c:any)=>c.t.toFixed(2)).join(",")}`);
  }
}
console.log("fired", fired, "t", M.t.toFixed(1), "scrap", M.scrap, "ore", JSON.stringify(M.got ?? M.ore ?? M.cargo));
console.log("rock hp", hp0, "->", hp(W), "bodies", W.ships.filter((s:any)=>s.live.length).length);
console.log("damage:", [...seen].map(([k,v])=>`${k}=${v}`).join("  ") || "(none)");
