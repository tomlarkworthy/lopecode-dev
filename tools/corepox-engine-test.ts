// Engine gate on RECOVERED ships only. The previous fixture was a hand-drawn
// "SEEKER" written before the component footprints were recovered: its Radar at
// [0,1] is 2x3, so it overlapped four of its own Binaries. The engine loaded it
// anyway and the test read FAIL for two months without anything being wrong with
// the engine. Nothing here is hand-drawn -- every spec comes out of the Unity
// scenes via corepox-missions.SHIPS.
import {importNotebookModule} from "./notebook-import.ts";

const eng = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const {Ship, World, DT, simulate, loadShipSpec}: any =
  await eng.values(["Ship", "World", "DT", "simulate", "loadShipSpec"]);
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js");
const SHIPS: any = await mis.value("SHIPS");

let fails = 0;
const check = (name: string, ok: boolean, detail: string) => {
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name.padEnd(34)} ${detail}`);
};

// 1. every recovered ship loads whole: no overlapping cells, one island, and --
//    for the specs still in Unity's cell-address form -- no dropped wires.
//    loadShipSpec resolves a wire by the CELL it lands on and only applies to
//    those; a spec that already names its ports is the Ship constructor's own
//    format and must not be run through it.
console.log("-- recovered specs --");
for (const [id, spec] of Object.entries<any>(SHIPS)) {
  const conns = spec.connections ?? [];
  const unity = conns.length > 0 && conns.every((w: any) => !w.fromPort && !w.toPort);
  const dropped = unity ? loadShipSpec(spec).dropped : [];
  const s = new Ship(spec, {team: "a"});
  const ov = s.overlaps(), isl = s.islands().length;
  check(id, dropped.length === 0 && !ov && isl === 1,
    `${s.comps.length}c ${conns.length}w${unity ? " (cell-addressed)" : ""}` +
    `${isl !== 1 ? ` ${isl} ISLANDS` : ""}` +
    `${dropped.length ? ` DROPPED ${JSON.stringify(dropped)}` : ""}` +
    `${ov ? ` OVERLAP ${ov[0].type}/${ov[1].type} at ${JSON.stringify(ov[2])}` : ""}`);
}

// 2. piloting: the drifter is the only recovered ship that steers on a wire, and
//    its Constant is the throttle. At 0 it must not move; driven, it must.
console.log("\n-- piloting (SteerableDrifterV2) --");
const drive = (throttle: string) => {
  const spec = JSON.parse(JSON.stringify(SHIPS.drifter));
  spec.components.find((c: any) => c.type === "Constant").param = throttle;
  const s = new Ship(spec, {team: "a", x: 0, y: 0, a: 0});
  const w = new World([s]);
  for (let i = 0; i < 150; i++) w.step();
  return Math.hypot(s.x, s.y);
};
const idle = drive("0"), driven = drive("100");
check("throttle 0 does not move", idle < 0.01, `moved ${idle.toFixed(3)} tiles in 3s`);
check("throttle 100 moves", driven > 1, `moved ${driven.toFixed(2)} tiles in 3s`);

// 3. damage: the delay bomb is a fuse built out of arithmetic. It must detonate
//    on its own, and its shrapnel must reach a neighbour. Armour is 100hp and a
//    fragment is 5, so the blast wounds, it does not destroy -- assert on hp, not
//    on parts, or the check reads FAIL for a working weapon.
console.log("\n-- damage (Cocoon delayBomb vs an armour box) --");
const box = {name: "box", components: [{type: "Brain", pos: [0, 0]},
  ...[[0,1],[1,0],[-1,0],[0,-1]].map(p => ({type: "Armour", pos: p}))], connections: []};
const bomb = new Ship(SHIPS.delayBomb, {team: "a", x: 0, y: 0, a: 0});
const target = new Ship(box, {team: "b", x: 3, y: 0, a: 0});   // clear of the bomb's own cells
const hp0 = target.live.reduce((n: number, c: any) => n + c.hp, 0);
const w2 = new World([bomb, target]);
let fuse = -1;
for (let i = 0; i < 300; i++) {
  w2.step();
  if (fuse < 0 && bomb.live.filter((c: any) => c.type === "Explosive").length < 2) fuse = w2.t;
}
const hp1 = target.live.reduce((n: number, c: any) => n + c.hp, 0);
check("fuse fires ~1.0s", fuse > 0.8 && fuse < 1.3, `detonated at ${fuse.toFixed(2)}s`);
check("shrapnel reaches 2 tiles", hp1 < hp0, `target ${hp0} -> ${hp1} hp`);
check("the bomb shreds itself", bomb.live.length === 0,
  `${bomb.live.length} parts left of 3`);

// 4. guns: laserpost aims but never shoots -- its recovered wiring is bearing ->
//    angle with nothing on `fire`. manualAim is the one recovered ship whose
//    trigger is latched (fire_input = 1, saved in ManualAim.unity), so it is the
//    only spec that tests the gun rather than the turret.
console.log("\n-- guns (ManualAim's turret vs a parked box) --");
const gunner = new Ship(SHIPS.manualAim, {team: "a", x: 0, y: 0, a: 0});
const mark = new Ship(box, {team: "b", x: 0, y: -6, a: 0});     // dead ahead
const mhp0 = mark.live.reduce((n: number, c: any) => n + c.hp, 0);
const w3 = new World([gunner, mark]);
const t0 = performance.now();
for (let i = 0; i < 600; i++) w3.step();
const ms = performance.now() - t0;
const mhp1 = mark.live.reduce((n: number, c: any) => n + c.hp, 0);
check("a latched turret fires", mhp1 < mhp0, `mark ${mhp0} -> ${mhp1} hp in 12s`);
check("speed", ms < 2000, `600 ticks in ${ms.toFixed(0)}ms`);

// 5. determinism: same inputs, same trace. Without this nothing else here means
//    anything, because a flaky engine can pass any single run.
console.log("\n-- determinism --");
const r = simulate(SHIPS.laserpost, SHIPS.shooter, {ticks: 2000, start: 8, sample: 200});
const r2 = simulate(SHIPS.laserpost, SHIPS.shooter, {ticks: 2000, start: 8, sample: 200});
check("two runs agree frame for frame",
  JSON.stringify(r.trace) === JSON.stringify(r2.trace),
  `${r.trace.length} sampled frames identical`);

console.log(`\n${fails ? `${fails} FAILED` : "all checks passed"} (DT=${DT})`);
process.exit(fails ? 1 : 0);
