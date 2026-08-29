// Does moving the muzzle to the barrel change whether the gun HITS? Aim is a
// knife-edge mission -- a single deterministic run that flips on a spawn phase --
// so it cannot answer that. This does: one wired hull, a stationary target parked
// at a known range and bearing, count the bolts that land.
//
// ENGINE points at a variant, the same way tools/corepox-play-missions.ts does:
//   ENGINE=/path/eng.before.js bun tools/corepox-turret-hits.ts
import {importNotebookModule} from "./notebook-import.ts";
import {Runtime} from "@observablehq/runtime";
(Runtime.prototype as any).fileAttachments ??= () => () => null;

const eng = await importNotebookModule(process.env.ENGINE ?? "modules/@tomlarkworthy/corepox-engine.js");
const Ship: any = await eng.value("Ship");
const World: any = await eng.value("World");
const DT: number = await eng.value("DT");

// The Aim hull, cut down to what does the shooting: radar three tiles behind the
// turret, angle wired straight through, fire held on by a Constant.
const shooter = {name: "shooter", components: [
  {type: "Brain", pos: [-1, 0]},
  {type: "LaserTurret2", pos: [0, 0]},
  {type: "Radar", pos: [0, -3]},
  {type: "Constant", pos: [-1, -1], param: "100"}],
  connections: [
    {from: [0, -3], fromPort: "bearing", to: [0, 0], toPort: "angle"},
    {from: [-1, -1], fromPort: "out", to: [0, 0], toPort: "fire"}]};

// A wall of armour, wide enough that a half-tile of lateral throw is not the whole
// story: what is being measured is the SHOT, not the target's width.
const target = (n: number) => ({name: "wall", components: [
  {type: "Brain", pos: [0, 0]},
  ...Array.from({length: n}, (_, i) => ({type: "Armour", pos: [i - (n >> 1), 1]}))]});

const trial = (range: number, bearing: number, width: number, secs = 20) => {
  const w = new World();
  const s = new Ship(shooter, {team: "a", x: 0, y: 0, a: 0});
  const r = bearing * Math.PI / 180;
  const t = new Ship(target(width),
    {team: "b", x: range * Math.sin(r), y: -range * Math.cos(r), a: 180});
  w.ships = [s, t];
  let fired = 0, hit = 0;
  const realEmit = w.emit.bind(w);
  w.emit = (ship: any, comp: any, kind: string, ...rest: any[]) => {
    if (kind === "beam") fired++;
    return realEmit(ship, comp, kind, ...rest);
  };
  let hp0 = t.comps.reduce((a: number, c: any) => a + c.hp, 0);
  for (let i = 0; i < secs / DT; i++) {
    // Both hulls held still: this is a marksmanship test, not a dogfight.
    s.x = 0; s.y = 0; s.a = 0; s.vx = s.vy = s.w = 0;
    t.x = range * Math.sin(r); t.y = -range * Math.cos(r); t.a = 180;
    t.vx = t.vy = t.w = 0;
    w.step();
  }
  const hp1 = t.comps.reduce((a: number, c: any) => a + c.hp, 0);
  hit = Math.round((hp0 - hp1) / 5);           // UNITS.BEAM_DMG
  return {fired, hit};
};

console.log(`engine ${process.env.ENGINE ?? "modules/@tomlarkworthy/corepox-engine.js"}`);
console.log("range  bearing  width   fired  hit   rate");
let tot = 0, totF = 0;
for (const range of [10, 18, 26])
  for (const bearing of [0, 5, 10, 20, -5, -10, -20])
    for (const width of [3]) {
      const {fired, hit} = trial(range, bearing, width);
      tot += hit; totF += fired;
      console.log(`  ${String(range).padStart(3)}   ${String(bearing).padStart(5)}   ` +
        `${String(width).padStart(4)}    ${String(fired).padStart(4)}  ${String(hit).padStart(4)}   ` +
        `${(fired ? hit / fired : 0).toFixed(2)}`);
    }
console.log(`\noverall ${tot}/${totF} = ${(tot / totF).toFixed(3)}`);
