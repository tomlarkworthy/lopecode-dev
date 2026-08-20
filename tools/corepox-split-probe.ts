// Does a ship that is ONE body actually come apart when it is cut? The older
// corepox-split-check.ts reports firstSplit=tick 1 on every pairing, which is not
// combat disintegration -- those roster ships are already multiple islands at t=0,
// so the split fires before a shot is fired and the gate passes without ever
// testing the mechanic.
//
// Connectivity now runs on JOINTS (Ship.islands, matching Connectivity.cs:99
// disjointSets over ShipComponent.joints), not on tile distance. Two consequences
// this probe exists to hold:
//
//   1. ONE destroyed component cuts a ship. Under the reach-2 distance rule it did
//      not -- the rule spanned a single hole -- so severing needed two adjacent
//      cells gone and the mechanic was much harder to trigger than the game's.
//   2. Components can TOUCH and not be bound. An Orb carries joints on its aft
//      edge only (JOINTS.Orb, confirmed by Tom: "2x2, ONE side connected"), so
//      something parked against its flank is not part of the ship.
//
//   bun tools/corepox-split-probe.ts
import {importNotebookModule} from "./notebook-import.ts";

const eng = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const {Ship, World, DT}: any = await eng.values(["Ship", "World", "DT"]);

const bar = (n = 6) => ({name: "bar", components:
  Array.from({length: n}, (_, i) => ({type: "Armour", pos: [i, 0], dir: "up"})), connections: []});

const run = (label: string, cut: number[], {spin = 0, vx = 0} = {}) => {
  const s = new Ship(bar(), {team: "a", x: 0, y: 0, a: 0});
  s.w = spin; s.vx = vx;
  const w = new World([s]);
  const before = s.islands().length;
  for (const x of cut) { const c = s.at(x, 0); s.damage(c, c.hp); }
  const afterIslands = s.islands().length;
  w.step();
  const bodies = w.ships.length;
  const gapOf = () => {
    const [A, B] = w.ships;
    if (!B) return NaN;
    return Math.hypot(A.x - B.x, A.y - B.y);
  };
  const g0 = gapOf();
  for (let i = 0; i < 150; i++) w.step();          // 3 seconds
  const g3 = gapOf();
  console.log(`${label.padEnd(30)} islands ${before}->${afterIslands}  bodies ${bodies}  ` +
              `centre gap ${g0.toFixed(3)} -> ${g3.toFixed(3)} tiles` +
              (Number.isNaN(g0) ? "   NO SPLIT" : ""));
  return {bodies, g0, g3, afterIslands};
};

const islandsOf = (comps: any[]) =>
  new Ship({name: "t", components: comps, connections: []}, {team: "a"}).islands().length;

console.log("a 6-tile Armour bar, cut by destroying tiles:\n");
const one   = run("one tile gone (#2)", [2]);
const rest  = run("two tiles gone (#2,#3)", [2, 3]);
const drift = run("two gone, drifting (vx=3)", [2, 3], {vx: 3});
const spun  = run("two gone, spinning (60 deg/s)", [2, 3], {spin: 60});

console.log("\ntouching is not binding -- an Orb's joints are on its aft edge only:");
const flank = islandsOf([{type: "Orb", pos: [0, 0], dir: "up"}, {type: "Armour", pos: [-1, 0], dir: "up"}]);
const aft   = islandsOf([{type: "Orb", pos: [0, 0], dir: "up"}, {type: "Armour", pos: [0, -1], dir: "up"}]);
console.log(`  Armour against the Orb's flank   islands ${flank}`);
console.log(`  Armour against the Orb's aft     islands ${aft}`);

console.log("\nwhat the split gives each piece (Ship.detach):");
console.log("  position  f.x = parent.x, f.y = parent.y      -- same origin");
console.log("  angle     f.a = parent.a                      -- same heading");
console.log("  velocity  f.vx,f.vy = parent.velAt(piece)     -- differs ONLY under spin");
console.log("  spin      f.w = parent.w                      -- same");

let fail = 0;
const say = (ok: boolean, s: string) => { if (!ok) fail++; console.log((ok ? "ok   " : "FAIL ") + s); };
console.log();
say(one.afterIslands === 2, "ONE destroyed component cuts the bar (reach-2 distance needed two)");
say(one.bodies === 2, "and the world gains a body");
say(rest.bodies === 2, "a two-tile cut also becomes two bodies");
// The gap ALONE proves nothing -- the pieces start apart because that is what a
// cut is. What a player sees is the gap GROWING.
const sep = (r: any) => r.g3 - r.g0;
say(sep(rest) > 0.5, `pieces drift apart at rest (+${sep(rest).toFixed(3)} tiles in 3s)`);
say(sep(spun) > 0.3, `pieces drift apart while spinning (+${sep(spun).toFixed(3)} tiles in 3s)`);
say(flank === 2, "a component against an Orb's flank is NOT bound");
say(aft === 1, "a component against an Orb's aft IS bound");
console.log(`note  drifting in a straight line: +${sep(drift).toFixed(3)} tiles in 3s -- both ` +
            `pieces inherit the same velocity, so a cut ship in level flight keeps formation`);
process.exit(fail ? 1 : 0);
