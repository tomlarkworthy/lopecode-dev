// Which keys actually move a ship? Tom, 2026-08-24: "I don't think the WASDQE
// controls work at all. I am struggling to get anything working other than D for a
// small ship with two turrets."
//
// Presses each key on a hull for two seconds and reports what the ship did. No
// browser: `pilotInput`'s table is a pure map and `pilot` is the thing under test,
// so the keyboard is not in the loop and cannot be what is broken.
//
//   bun tools/corepox-drive-keys.ts
import {importNotebookModule} from "./notebook-import.ts";
import {Runtime} from "@observablehq/runtime";
(Runtime.prototype as any).fileAttachments ??= () => () => null;

const eng = await importNotebookModule(process.env.ENGINE ?? "modules/@tomlarkworthy/corepox-engine.js");
const Ship: any = await eng.value("Ship");
const World: any = await eng.value("World");
const DT: number = await eng.value("DT");
const geom: any = await eng.value("geom");
const pilotActuators: any = await eng.value("pilotActuators");
const pilot: any = await eng.value("pilot");

const KEYS: Record<string, any> = {
  w: {move: [0, -1], yaw: 0}, s: {move: [0, 1], yaw: 0},
  a: {move: [-1, 0], yaw: 0}, d: {move: [1, 0], yaw: 0},
  q: {move: [0, 0], yaw: -1}, e: {move: [0, 0], yaw: 1}
};

const fly = (spec: any, key: string | null, secs = 2) => {
  const w = new World();
  const s = new Ship(spec, {team: "a", x: 0, y: 0, a: 0});
  w.ships = [s];
  const cmd = {drive: key ? KEYS[key] : null, fire: false, target: null, face: null};
  const memo = {};
  for (let i = 0; i < secs / DT; i++) { pilot(s, cmd, memo); w.step(); }
  // Body-frame displacement, so "forward" reads as forward whatever the hull did.
  const [bx, by] = geom.rot([s.x, s.y], -0);
  return {dx: bx, dy: by, da: geom.norm(s.a)};
};

const report = (label: string, spec: any) => {
  const s = new Ship(spec, {team: "a", x: 0, y: 0, a: 0});
  // A hull with two parts in one cell is not a hull the game would let you build,
  // and it drifts on its own -- so a reading taken on one says nothing.
  const bad = s.overlaps();
  if (bad) throw new Error(`${label}: illegal fixture, ${bad[0].type} and ${bad[1].type} share ${bad[2]}`);
  const A = pilotActuators(s);
  const eng = s.comps.filter((c: any) => c.type === "Engine");
  console.log(`\n${label}`);
  console.log(`  engines ${eng.length}, pilot actuators ${A.length}` +
    (A.length ? `  thrust ${A.map((a: any) => `(${(a.ux * s.mass).toFixed(0)},${(a.uy * s.mass).toFixed(0)})`).join(" ")}`
              : "   <- NOTHING THE PILOT CAN DRIVE"));
  for (const k of Object.keys(KEYS)) {
    const r = fly(spec, k);
    const moved = Math.hypot(r.dx, r.dy) > 0.05 || Math.abs(r.da) > 1;
    console.log(`  ${k.toUpperCase()}  dx ${r.dx.toFixed(2).padStart(6)}  dy ${r.dy.toFixed(2).padStart(6)}  ` +
      `turn ${r.da.toFixed(1).padStart(6)} deg   ${moved ? "moves" : "-- nothing --"}`);
  }
};

// Real hulls, not invented ones. Two earlier fixtures here were illegal (an engine
// sharing the core's cell) or unjointed (engines a diagonal away from it), and both
// read as "the controls do nothing" for a reason that was mine, not the game's --
// so everything below is a ship the game itself ships.
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js");
const SHIPS: any = await mis.value("SHIPS");
const MISSIONS: any[] = await mis.value("MISSIONS");

const rows: any[] = [];
const look = (label: string, spec: any) => {
  if (!spec?.components?.length) return;
  const s = new Ship(spec, {team: "a", x: 0, y: 0, a: 0});
  if (s.overlaps()) return;
  // `free` is what the pilot gets with no command: unwired engines on the core's
  // island. `manual` is what it gets while a key is held. They differ by exactly the
  // engines the program is driving, which is the whole of this bug.
  const free = pilotActuators(s).length;
  const manual = pilotActuators(s, {all: true}).length;
  const eng = s.comps.filter((c: any) => c.type === "Engine");
  const wired = eng.filter((c: any) => s.conns.some((k: any) => k.to[0] === c.px && k.to[1] === c.py));
  // Against a NO-KEY baseline, not against zero. A hull with a Constant wired into
  // its engine flies on its own, so "the ship moved" is not "the key did anything" --
  // measuring it that way said every key worked on ships the pilot cannot touch.
  const base = fly(spec, null, 1.5);
  const works = Object.keys(KEYS).filter(k => {
    const r = fly(spec, k, 1.5);
    return Math.hypot(r.dx - base.dx, r.dy - base.dy) > 0.05 ||
           Math.abs(geom.norm(r.da - base.da)) > 1;
  });
  rows.push({label, eng: eng.length, wired: wired.length, free, manual, works});
};

for (const [name, spec] of Object.entries(SHIPS)) look(`SHIPS.${name}`, spec);
for (const m of MISSIONS) {
  look(`${m.id} (handed)`, m.ship);
  look(`${m.id} (solution)`, m.solution);
}

console.log("hull                            engines wired  free manual  keys that do anything");
for (const r of rows)
  console.log(`  ${r.label.padEnd(30)} ${String(r.eng).padStart(4)} ${String(r.wired).padStart(5)} ` +
    `${String(r.free).padStart(5)} ${String(r.manual).padStart(5)}   ` +
    `${r.works.length ? r.works.join(" ").toUpperCase() : "NONE"}`);

// The gate: a hull the pilot CAN reach must answer something. `manual` 0 means the
// build has no engine on the core's island -- that failure is the build's and is
// reported, not asserted on.
const reachable = rows.filter(r => r.manual > 0);
const dead = reachable.filter(r => !r.works.length);
const noTurn = reachable.filter(r => !r.works.includes("q") && !r.works.includes("e"));
console.log(`\n${rows.filter(r => r.eng).length} hulls carry an engine, ` +
  `${reachable.length} of them put one on the core's island`);
console.log(`${dead.length} of those answer no key at all` +
  (dead.length ? ":\n  " + dead.map(r => r.label).join("\n  ") : ""));
console.log(`${noTurn.length} of those cannot be TURNED with Q or E` +
  (noTurn.length ? ":\n  " + noTurn.map(r => r.label).join("\n  ") : ""));
if (dead.length) { console.error("\nFAIL: a hull with an engine the pilot can reach ignores every key"); process.exit(1); }
console.log("\nPASS");
