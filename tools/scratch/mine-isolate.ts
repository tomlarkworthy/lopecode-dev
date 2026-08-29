import {importNotebookModule} from "../notebook-import.ts";
const eng = await importNotebookModule(process.env.COREPOX_ENGINE!);
const E: any = {};
for (const n of ["Ship","World","geom","DT","pilot","loadShipSpec","TYPES"]) E[n] = await eng.value(n);
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js", {overrides: {md:(s:any)=>String(s)}});
const SHIPS: any = await mis.value("SHIPS");
const duel = await importNotebookModule("modules/@tomlarkworthy/corepox-duel.js", {overrides: {...E, SHIPS, md:(s:any)=>String(s), htl:{html:()=>{}}, battlefield:null, backdrop:null, invalidation:new Promise(()=>{})}});
const min = await importNotebookModule("modules/@tomlarkworthy/corepox-mining.js", {overrides: {...E, SHIPS, DUEL_BACKDROP: await duel.value("DUEL_BACKDROP"), humanControl: await duel.value("humanControl"), md:(s:any)=>String(s), htl:{html:()=>{}}, battlefield:null, backdrop:null, invalidation:new Promise(()=>{})}});
const rockSpec: any = await min.value("rockSpec");
const minRng: any = await min.value("minRng");

const slab = {name: "slab", components: Array.from({length: 6}, (_, i) =>
  ({type: "Armour", pos: [i % 2, Math.floor(i / 2)], dir: "up"})), connections: []};
const blob = rockSpec(minRng(11), {rockVolume: 8, oreVolume: 2, rockHp: 10});
console.log("blob cells:", blob.components.map((c: any) => `${c.type}@${c.pos}`).join(" "));

const trial = (spec: any, label: string, {spin = 0, dist = 10} = {}) => {
  const p = new E.Ship(E.loadShipSpec(SHIPS.laserpost).spec, {team: "player", x: 0, y: 0, a: 0});
  const r = new E.Ship(E.loadShipSpec(spec).spec, {team: "rock", x: 0, y: -dist, a: 0});
  r.w = spin;
  const w = new E.World([p, r]);
  const hp0 = r.live.reduce((a: number, c: any) => a + c.hp, 0);
  let beams = 0;
  for (let i = 0; i < 500; i++) { w.step(); beams += w.beams.length; }
  const hp1 = r.live.reduce((a: number, c: any) => a + c.hp, 0);
  console.log(`${label.padEnd(28)} dist ${dist} spin ${spin}  beam-ticks ${String(beams).padStart(4)}  hp ${hp0} -> ${hp1}`);
};
trial(slab, "slab, 2x3");
trial(blob, "rockSpec blob");
trial(blob, "rockSpec blob, spinning", {spin: 20});
trial(blob, "rockSpec blob, further", {dist: 15});
// what does the ship's own radar say it is pointed at?
const p = new E.Ship(E.loadShipSpec(SHIPS.laserpost).spec, {team: "player", x: 0, y: 0, a: 0});
const r = new E.Ship(E.loadShipSpec(blob).spec, {team: "rock", x: 0, y: -10, a: 0});
const w = new E.World([p, r]);
for (let i = 0; i < 120; i++) w.step();
console.log("after 2.4s:", p.live.map((c: any) =>
  `${c.type} in=${JSON.stringify(c.in)} out=${JSON.stringify(c.out)}`).join("  |  "));
