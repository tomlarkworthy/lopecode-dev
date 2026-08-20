// Does a ship that is ONE body actually come apart when it is cut? The existing
// corepox-split-check.ts reports firstSplit=tick 1 on every pairing, which is not
// combat disintegration -- those roster ships are already multiple islands at
// t=0, so the split fires before a shot is fired and the gate passes without ever
// testing the mechanic.
//
// This builds a deliberately connected ship, severs it in the middle, and asks
// two separate questions: did the world gain a body, and do the pieces then move
// apart. The second is the one a player sees.
//
//   bun tools/corepox-split-probe.ts
import {importNotebookModule} from "./notebook-import.ts";

const eng = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const {Ship, World, DT}: any = await eng.values(["Ship", "World", "DT"]);

// What binds two components in the ORIGINAL is a declared joint --
// `ShipComponent.cs:16 joints: CoordDir8[]`, with connectivity running over joints
// in `Connectivity.cs:99 disjointSets()`. Components can touch and not be attached.
// The port does not do that. `islands()` runs on NEIGHBOURS, a DISTANCE rule
// (reach 2, chosen because it put 70% of corpus ships in one piece against 33% at
// reach 1), and the recovered JOINTS table is read by nothing but the components
// table editor.
//
// The consequence is this probe's subject: severing is governed by distance, so
// ONE destroyed component never cuts anything -- reach 2 spans the hole -- and a
// cut needs two adjacent cells gone. Under real joints, severing the right single
// joint would part a ship. Do not read the numbers below as the game's rule; they
// are the substitute's rule.
const bar = (n = 6) => ({name: "bar", components:
  Array.from({length: n}, (_, i) => ({type: "Armour", pos: [i, 0], dir: "up"})), connections: []});

const run = (label: string, {spin = 0, vx = 0} = {}) => {
  const s = new Ship(bar(), {team: "a", x: 0, y: 0, a: 0});
  s.w = spin; s.vx = vx;
  const w = new World([s]);
  const before = s.islands().length;
  // Two adjacent cells, because under the distance rule one is not a cut.
  for (const x of [2, 3]) { const c = s.at(x, 0); s.damage(c, c.hp); }
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
  console.log(`${label.padEnd(28)} islands ${before}->${afterIslands}  bodies ${bodies}  ` +
              `centre gap ${g0.toFixed(3)} -> ${g3.toFixed(3)} tiles` +
              (Number.isNaN(g0) ? "   NO SPLIT" : ""));
  return {bodies, g0, g3};
};

console.log("a 6-tile bar, the two middle tiles destroyed:\n");
const rest = run("at rest", {});
const drift = run("drifting (vx=3)", {vx: 3});
const spun = run("spinning (w=60 deg/s)", {spin: 60});

console.log("\nwhat the split gives each piece (Ship.detach):");
console.log("  position  f.x = parent.x, f.y = parent.y      -- same origin");
console.log("  angle     f.a = parent.a                      -- same heading");
console.log("  velocity  f.vx,f.vy = parent.velAt(piece)     -- differs ONLY under spin");
console.log("  spin      f.w = parent.w                      -- same");

let fail = 0;
const say = (ok: boolean, s: string) => { if (!ok) fail++; console.log((ok ? "ok   " : "FAIL ") + s); };
console.log();
say(rest.bodies === 2, "a cut ship becomes two bodies");
// The gap ALONE proves nothing -- the pieces start two cells apart because that
// is what a cut is. What a player sees is the gap GROWING.
const sep = (r: any) => r.g3 - r.g0;
say(sep(rest) > 0.5, `pieces drift apart at rest (+${sep(rest).toFixed(3)} tiles in 3s)`);
say(sep(spun) > 0.3, `pieces drift apart while spinning (+${sep(spun).toFixed(3)} tiles in 3s)`);
console.log(`note  drifting in a straight line: +${sep(drift).toFixed(3)} tiles in 3s -- both ` +
            `pieces inherit the same velocity, so a cut ship in level flight keeps formation`);
process.exit(fail ? 1 : 0);
