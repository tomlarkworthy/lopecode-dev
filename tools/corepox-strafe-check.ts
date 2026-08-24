// Can a hull fly sideways now, and did the old command shape survive?
//
// WASD used to write {thrust, yaw} -- one scalar along R.axis, the hull's strongest
// thrust heading -- so the drive command carried 2 of the allocator's 3 degrees of
// freedom and the missing one was strafe. It now writes {move: [x, y], yaw} in the
// body frame. Two things have to hold:
//
//   REGRESSION  {thrust: t} must still fly exactly as it did, because tools and
//               headless callers speak it. It is implemented as the special case
//               move = R.axis * t, so "exactly" means bit-for-bit, not close.
//   STRAFE      {move: [1,0]} must move a hull that has rightward thrust, and must
//               NOT move one that has none -- the same "the failure is the build's"
//               property the rest of the pilot has.
//
// pilot() itself is driven here, not a copy of its allocation (CLAUDE.md rule 17).
//
//   bun tools/corepox-strafe-check.ts [N]
import { importNotebookModule } from "./notebook-import.ts";
const m = await importNotebookModule(process.env.ENGINE ?? "modules/@tomlarkworthy/corepox-engine.js");
const Ship: any = await m.value("Ship");
const World: any = await m.value("World");
const load: any = await m.value("loadShipSpec");
const DT: number = await m.value("DT");
const geom: any = await m.value("geom");
const pilot: any = await m.value("pilot");
const pilotActuators: any = await m.value("pilotActuators");
const flightModel: any = await m.value("flightModel");
const fs = await import("node:fs");

const raws: any[] = [];
for (const line of fs.readFileSync("vendor/corepox/firebase/data/ships.json", "utf8").split("\n")) {
  const i = line.indexOf(","); if (i < 0) continue;
  try { const s = JSON.parse(line.slice(i + 1)); if (s?.components) raws.push(s); } catch {}
}

const fresh = (raw: any) => {
  const s = new Ship(load(raw).spec, { team: "a", x: 0, y: 0, a: 0 });
  s.conns = [];                       // an engine on a wire is the program's, not the pilot's
  return s;
};

// pilot() zeroes only the engines it drives. Anything outside that set -- a nozzle on
// a second island, or one the spec left at throttle -- keeps burning, and it burned
// hard enough here to hide the command: three different directions moved one hull to
// the same place, 2.19 tiles away, before this was added. corepox-drive-yaw.ts has
// the same line for the same reason.
const zero = (s: any) => { for (const c of s.live) if (c.type === "Engine") c.in.in = 0; };

// Fly one ship under one drive command for `secs` and report how far it travelled
// ALONG that command, as the path integral of velocity in the frame the command was
// given in: sum over ticks of (v . rot(d, a)) * DT.
//
// Position is the wrong instrument here, and differencing two positions does not
// rescue it. A hull whose islands do not all hold a Brain splits, and `detach()`
// re-centres what is left -- the parts stay put and the body's centre of mass moves,
// so `s.x` jumps with `vx` still exactly 0. Ship 9 of the corpus jumps 4.28 tiles on
// its first step and never moves again. Differencing against an idle run does not
// cancel it either, because a ship under thrust does not split at the same moment an
// idle one does: pick 63 reads -3.008 tiles by position and 0.018 by path integral,
// with its heading never leaving 0.1 degrees. Velocity cannot jump, so it is what is
// measured.
const run = (raw: any, drive: any, secs = 3) => {
  const s = fresh(raw);
  const w = new World([s]);
  const memo = {};
  let along = 0;
  for (let n = 0; n < secs / DT; n++) {
    if (!pilotActuators(s).length) break;
    zero(s);
    pilot(s, { drive }, memo);
    w.step();
    const [dx, dy] = geom.rot([drive.move?.[0] ?? 0, drive.move?.[1] ?? 0], s.a);
    along += (s.vx * dx + s.vy * dy) * DT;
  }
  return { along, a: s.a, w: s.w };
};

// The authority a hull flies with is not the authority it was BUILT with. An island
// that holds no Brain leaves on tick 0, and pick 10 of the corpus takes every engine
// with it -- it burns for exactly one tick and then has no actuators at all. Read off
// the intact hull it looks like 0.714 of rightward thrust that refused to answer D.
// So every reading here is taken on the SETTLED ship, one step in.
const settled = (raw: any) => {
  const s = fresh(raw); const w = new World([s]);
  zero(s); pilot(s, { drive: { move: [0, 0], yaw: 0 } }, {}); w.step();
  return s;
};

const N = Number(process.argv.find((a) => /^\d+$/.test(a)) ?? 40);
const picks: any[] = [];
for (let i = 0; i < raws.length && picks.length < N; i++) {
  let s: any; try { s = fresh(raws[i]); } catch { continue; }
  if (!s.alive || !pilotActuators(s).length) continue;
  picks.push(raws[i]);
}

// --- regression: the old shape, and its explicit equivalent ------------------
// `{thrust: t}` is implemented as `move = R.axis * t`, and R.axis is recomputed from
// the LIVE actuators every tick -- so the equivalent command is a vector that moves
// with the hull, not a fixed one. Fed a fixed axis, a ship that sheds engines on the
// split diverges from tick 1 for that reason alone and nothing is learned. The two
// are therefore flown in lockstep, the reference re-reading its own axis each tick.
let same = 0, differ = 0;
const shown: string[] = [];
for (const raw of picks) {
  const a = fresh(raw), b = fresh(raw);
  const wa = new World([a]), wb = new World([b]);
  const ma = {}, mb = {};
  for (let n = 0; n < 3 / DT; n++) {
    const A = pilotActuators(a), B = pilotActuators(b);
    if (!A.length || !B.length) break;
    zero(a); pilot(a, { drive: { thrust: 1, yaw: 0 } }, ma);
    const R = flightModel(B);
    zero(b); pilot(b, { drive: { move: [R.axis[0], R.axis[1]], yaw: 0 } }, mb);
    wa.step(); wb.step();
  }
  const eq = a.x === b.x && a.y === b.y && a.vx === b.vx && a.vy === b.vy && a.a === b.a;
  if (eq) same++; else {
    differ++;
    if (shown.length < 3)
      shown.push(`   thrust (${a.x.toFixed(6)}, ${a.y.toFixed(6)})   move (${b.x.toFixed(6)}, ${b.y.toFixed(6)})`);
  }
}
console.log(`REGRESSION  {thrust:1} vs {move:R.axis}, flown in lockstep, ${picks.length} ships, 3s`);
console.log(`  identical to the last bit: ${same}/${picks.length}${differ ? `  DIFFER: ${differ}` : ""}`);
for (const l of shown) console.log(l);

// --- strafe: does the build answer a lateral command? ------------------------
// Body +x is right (geom.unit(90) = [1,0]); body -y is up.
const DIRS: Array<[string, [number, number]]> = [
  ["W  up", [0, -1]], ["S  down", [0, 1]], ["A  left", [-1, 0]], ["D  right", [1, 0]],
];
let answered = 0, refused = 0, held = 0, wrong = 0;
const bad: string[] = [];
let stripped = 0;
const table: string[] = [];
for (const [pi, raw] of picks.entries()) {
  const A = pilotActuators(settled(raw));
  if (!A.length) { stripped++; continue; }          // lost every engine in the split
  const row: string[] = [];
  for (const [label, d] of DIRS) {
    // what the build can produce in this direction, the same sum the pilot scales by
    let auth = 0;
    for (const a of A) auth += Math.max(0, a.ux * d[0] + a.uy * d[1]);
    const moved = run(raw, { move: d, yaw: 0 }).along;
    if (moved < -0.05) { wrong++; bad.push(`pick ${pi} ${label} auth=${auth.toExponential(2)} moved BACKWARDS ${moved.toFixed(3)}`); }
    else if (auth <= 1e-9) {
      // thrust from nowhere would be a real fault; standing still is the point
      if (moved > 0.05) { wrong++; bad.push(`pick ${pi} ${label} auth=0 but moved ${moved.toFixed(3)}`); }
      else refused++;
    }
    else if (moved > 0.05) answered++;
    // Authority in that direction, but the hull cannot spend it without spinning, and
    // yaw=0 is a demand for zero RATE -- so the pilot cancels it. The build's failure,
    // stated the same way everywhere else in pilot().
    else held++;
    row.push(`${label} ${auth > 1e-9 ? moved.toFixed(2).padStart(7) : "    -- "}`);
  }
  if (table.length < 8) table.push("  " + row.join("  "));
}
console.log(`\nSTRAFE  displacement along the command, 3s, ${picks.length} ships x 4 directions`);
for (const l of table) console.log(l);
console.log(`\n  build has thrust there and it moved:      ${answered}`);
console.log(`  build has none there and it stayed put:   ${refused}   ("--" above)`);
console.log(`  has thrust but cannot spend it unspun:    ${held}`);
console.log(`  disagreed with the build:                 ${wrong}`);
console.log(`  skipped, no engines left after the split: ${stripped}`);
for (const l of bad) console.log(`    ${l}`);

// --- keys: does the shared binder produce the command the pilot answers? ------
// The mapping used to be written twice, once in @tomlarkworthy/corepox-board and once
// in corepox-duel's `humanControl`, and the second copy did not get the WASD-plus-QE
// change: in Explore A/D still yawed, Q/E fell through the unknown-key guard, and W was
// thrust along the hull's best axis. It is now one cell, `pilotInput` in the engine, and
// this drives THAT -- not a copy of its table -- from a synthetic key event through
// pilot() to the ship's velocity. `attach:false` keeps it off a window it does not have;
// `typing` is stubbed because there is no document either.
const pilotInput: any = await m.value("pilotInput");
const ev = (k: string) => ({key: k, preventDefault() {}});
const press = (k: string) => {
  const cmd: any = {};
  const input = pilotInput(() => cmd, {attach: false, typing: () => false});
  const handled = input.key(ev(k), true);
  return {handled, cmd};
};

// One press, held for `secs`, measured the same way as above: distance along the
// command in the live frame, plus the heading it ended on.
const flyKey = (raw: any, k: string, secs = 3) => {
  const {cmd} = press(k);
  const s = fresh(raw);
  const w = new World([s]);
  const memo = {};
  const a0 = s.a;
  let along = 0;
  for (let n = 0; n < secs / DT; n++) {
    if (!pilotActuators(s).length) break;
    zero(s);
    pilot(s, cmd, memo);
    w.step();
    const [dx, dy] = geom.rot([cmd.drive?.move?.[0] ?? 0, cmd.drive?.move?.[1] ?? 0], s.a);
    along += (s.vx * dx + s.vy * dy) * DT;
  }
  return {along, turned: s.a - a0};
};

const KEYS: Array<[string, [number, number], number]> = [
  ["w", [0, -1], 0], ["s", [0, 1], 0], ["a", [-1, 0], 0], ["d", [1, 0], 0],
  ["q", [0, 0], -1], ["e", [0, 0], 1],
];
let shape = 0, shapeBad: string[] = [];
for (const [k, move, yaw] of KEYS) {
  const {handled, cmd} = press(k);
  const got = cmd.drive;
  const ok = handled && got && got.move[0] === move[0] && got.move[1] === move[1] && got.yaw === yaw;
  if (ok) shape++;
  else shapeBad.push(`  ${k}: handled=${handled} drive=${JSON.stringify(got)} want move=${JSON.stringify(move)} yaw=${yaw}`);
}
console.log(`\nKEYS  one binder, ${KEYS.length} keys`);
console.log(`  key -> command shape: ${shape}/${KEYS.length}`);
for (const l of shapeBad) console.log(l);

// A key that flies. W/A/S/D are gated on the build having thrust that way, Q/E on it
// having yaw authority that way -- the same "the failure is the build's" rule, so a
// hull that cannot answer is not counted against the keys.
let flew = 0, refusedK = 0, wrongK = 0;
const badK: string[] = [];
const perKey = new Map<string, [number, number]>(KEYS.map(([k]) => [k, [0, 0]]));
for (const [pi, raw] of picks.entries()) {
  const A = pilotActuators(settled(raw));
  if (!A.length) continue;
  const R = flightModel(A);
  for (const [k, move, yaw] of KEYS) {
    const auth = yaw === 0
      ? A.reduce((t: number, a: any) => t + Math.max(0, a.ux * move[0] + a.uy * move[1]), 0)
      : (yaw > 0 ? R.yawP : R.yawN);
    const {along, turned} = flyKey(raw, k);
    const answer = yaw === 0 ? along : turned * yaw;      // q turns anticlockwise
    if (auth <= 1e-9) { perKey.get(k)![1]++; if (answer > 0.05) { wrongK++; badK.push(`pick ${pi} ${k} auth=0 but answered ${answer.toFixed(3)}`); } else refusedK++; }
    else if (answer > 0.05) { flew++; perKey.get(k)![0]++; }
    else if (answer < -0.05) { wrongK++; badK.push(`pick ${pi} ${k} auth=${auth.toExponential(2)} went the WRONG WAY ${answer.toFixed(3)}`); }
    // else: authority it cannot spend without spinning -- pilot() cancels it, as above
  }
}
console.log("  per key, of " + picks.length + " ships:  " +
  KEYS.map(([k]) => `${k.toUpperCase()} ${perKey.get(k)![0]} flew / ${perKey.get(k)![1]} cannot`).join("   "));
console.log(`  pressed a key the build can answer and it did:  ${flew}`);
console.log(`  build cannot answer that key and it stayed put: ${refusedK}`);
console.log(`  went the wrong way:                            ${wrongK}`);
for (const l of badK) console.log(`    ${l}`);

process.exit(wrong || differ || wrongK || shape !== KEYS.length ? 1 : 0);
