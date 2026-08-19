// What do the Aim turret's beams actually hit? A miss and a hit on your own
// armour look identical from the objective's point of view.
import {importNotebookModule} from "./notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const {Ship, World, DT, geom}: any = await m.values(["Ship","World","DT","geom"]);
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js");
const MISSIONS: any[] = await mis.value("MISSIONS");
const aim = MISSIONS.find(x => x.id === "Aim")!;
const SHIPS: any = await mis.value("SHIPS");

const w = new World();
const p = new Ship({name:"p", ...aim.solution}, {team:"player", x:0, y:0, a:0});
w.ships.push(p);
// one rocket, held still, dead ahead-ish at the bearing the trace showed
const [ux,uy] = geom.unit(39);
const r = new Ship(SHIPS.rocket, {team:"enemy", x:ux*12, y:uy*12, a:geom.norm(39+180)});
r.comps.forEach((c:any)=>{ if(c.type==="Engine") c.in.in = 0; });   // hold position
w.ships.push(r);

const tally: any = {};
const orig = w.stepParticles.bind(w);
w.stepParticles = function() {
  const before = this.particles.filter((b:any)=>b.kind==="beam").map((b:any)=>b);
  orig();
  for (const b of before) {
    if (!b.hitOk) continue;
    if (b.logged) continue; b.logged = true;
  }
};
// simpler: wrap Ship.damage to see who takes the beam
for (const s of w.ships) {
  const d = s.damage.bind(s);
  s.damage = (c: any, amt: number) => { tally[`${s.team}/${c.type}`] = (tally[`${s.team}/${c.type}`]??0)+1; return d(c, amt); };
}
for (let t=0; t<12; t+=DT) w.step();
console.log("damage events by target:", tally);
console.log("rocket live:", r.live.map((c:any)=>c.type+":"+c.hp.toFixed(0)).join(" "));
console.log("player live:", p.live.length, "of", p.comps.length);
const [px,py] = p.worldOf(p.comps.find((c:any)=>c.type==="LaserTurret2"));
console.log("turret world pos", px.toFixed(2), py.toFixed(2), "target", (ux*12).toFixed(2), (uy*12).toFixed(2));
console.log("player tiles:", p.live.map((c:any)=>`${c.type}${c.px},${c.py}`).join(" "));

// --- where do the beams actually go?
const w2 = new World();
const p2 = new Ship({name:"p", ...aim.solution}, {team:"player", x:0, y:0, a:0});
const r2 = new Ship(SHIPS.rocket, {team:"enemy", x:ux*12, y:uy*12, a:geom.norm(39+180)});
r2.comps.forEach((c:any)=>{ if(c.type==="Engine") c.in.in = 0; });
w2.ships.push(p2, r2);
const ex = r2.comps.find((c:any)=>c.type==="Explosive");
for (let i=0;i<160;i++) {
  w2.step();
  for (const b of w2.particles) {
    if (b.kind!=="beam") continue;
    const [tx,ty] = r2.worldOf(ex);
    const d = Math.hypot(b.x-tx, b.y-ty);
    if (!b.seen) { b.seen = true;
      console.log(`beam born t=${w2.t.toFixed(2)} at (${b.x.toFixed(2)},${b.y.toFixed(2)}) ` +
        `heading ${b.a.toFixed(1)} target at (${tx.toFixed(2)},${ty.toFixed(2)}) ` +
        `true bearing ${geom.bearing(b.x,b.y,tx,ty).toFixed(1)}`); }
    if (d < 3) console.log(`   t=${w2.t.toFixed(2)} beam (${b.x.toFixed(2)},${b.y.toFixed(2)}) miss ${d.toFixed(2)} tiles`);
  }
  if (w2.t > 4) break;
}
