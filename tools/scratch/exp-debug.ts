import {importNotebookModule} from "../notebook-import.ts";
const eng = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const {Ship, World, UNITS, seedRng}: any = await eng.values(["Ship","World","UNITS","seedRng"]);
World.rng = seedRng(1); World.EXHAUST = false;
const spec = (c: any[], name = "t") => ({name, components: c, connections: []});
// split
const s = new Ship(spec([{type:"Armour",pos:[0,0],dir:"up"},{type:"Armour",pos:[1,0],dir:"up"},
                         {type:"Armour",pos:[2,0],dir:"up"},{type:"Explosive",pos:[3,0],dir:"up"}]),
                   {team:"a",x:0,y:0,a:0});
const w = new World([s]); w.step();
const mid = s.at(2,0); s.damage(mid, mid.hp); w.step();
for (const sh of w.ships)
  console.log(sh.name, "comps:", sh.comps.map((c: any) => `${c.type}@${c.px},${c.py}=${c.hp}`).join(" "));
console.log("frags:", w.particles.filter((p: any) => p.kind === "frag").length);
// orb geometry
console.log("\nORB_R tiles:", UNITS.ORB_R.toFixed(3), " ORB_DMG", UNITS.ORB_DMG);
const a = new Ship(spec([{type:"Brain",pos:[0,0],dir:"up"},{type:"Orb",pos:[0,1],dir:"up"}],"orb"),
                   {team:"a",x:0,y:0,a:0});
console.log("orb tiles:", a.comps.map((c: any) => `${c.type}:${JSON.stringify(a.worldTiles(c))}`).join(" "));
for (const off of [[0.6,1],[1,1],[1.2,1.5],[0.5,1.5]]) {
  const b = new Ship(spec([{type:"Explosive",pos:[0,0],dir:"up"}],"bomb"), {team:"b",x:off[0],y:off[1],a:0});
  const w2 = new World([a, b]); const bomb = b.comps[0];
  let t = -1; for (let i = 0; i < 40; i++) { w2.step(); if (bomb.hp <= 0) { t = i; break; } }
  console.log(`  bomb at ${off}: dead tick ${t}, frags ${w2.particles.filter((p: any)=>p.kind==="frag").length}, bodies ${w2.ships.length}`);
}
