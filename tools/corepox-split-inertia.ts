// A split must not move anything. The ship comes apart; the PARTS stay exactly
// where they were, and each piece carries away the velocity that piece already had.
// Ship.cs:498 split() is explicit about it -- it copies the parent's transform onto
// the new body, then sets each body's velocity to GetRelativePointVelocity at its
// own centre of mass, both sampled against the PRE-split centre of mass:
//
//     Vector2 cm1 = body.centerOfMass;
//     body.centerOfMass = cm0;                              // reset so relative calcs correct
//     Vector2 v1 = body.GetRelativePointVelocity(body.centerOfMass);
//     Vector2 v2 = body.GetRelativePointVelocity(newBody.centerOfMass);
//     body.centerOfMass = cm1;
//     newBody.angularVelocity = w0;  body.angularVelocity = w0;
//
// This measures the two things that has to give: does any component jump, and is
// linear momentum conserved. Angular velocity is NOT a conservation test -- the
// original hands w0 to both bodies unchanged, which is an approximation, and this
// port matches it.
//
//   bun tools/corepox-split-inertia.ts
import {importNotebookModule} from "./notebook-import.ts";

const eng = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const {Ship, World, DT}: any = await eng.values(["Ship", "World", "DT"]);

const key = (s: any, c: any) => `${c.type}@${c.px},${c.py}`;
const snapshot = (w: any, team: string) => {
  const m = new Map<string, number[]>();
  for (const s of w.ships) if (s.team === team)
    for (const c of s.live) m.set(key(s, c), s.worldOf(c));
  return m;
};
// Sum of (body mass x body centre-of-mass velocity). ship.x/y IS the centre of
// mass and ship.vx/vy is its velocity, so this is the whole of p with no per-tile
// arithmetic. It is exactly conserved by a correct split, because the pre-split
// centre of mass is the mass-weighted mean of the two new ones.
const momentum = (w: any, team: string) => {
  let px = 0, py = 0;
  for (const s of w.ships) if (s.team === team) { px += s.mass * s.vx; py += s.mass * s.vy; }
  return [px, py];
};

const bar = (n = 6) => ({name: "bar", components:
  Array.from({length: n}, (_, i) => ({type: "Armour", pos: [i, 0], dir: "up"})), connections: []});

// A drone that was never attached: two clusters, far apart, one body at t=0. This
// is the corpus's "shoots a drone off to the side" shape, and it is the worst case
// because the fragment's centre of mass is nowhere near the parent's.
const carrier = () => ({name: "carrier", components: [
  {type: "Brain", pos: [0, 0], dir: "up"},
  {type: "Armour", pos: [0, -1], dir: "up"}, {type: "Armour", pos: [0, -2], dir: "up"},
  {type: "Constant", pos: [0, 8], dir: "up", param: "100"},
  {type: "Engine", pos: [0, 7], dir: "up"},
  {type: "Armour", pos: [1, 8], dir: "up"}], connections: [
  {from: [0, 8], fromPort: "out", to: [0, 7], toPort: "in"}]});

let fail = 0;
const say = (ok: boolean, s: string) => { if (!ok) fail++; console.log((ok ? "ok   " : "FAIL ") + s); };

const run = (label: string, spec: any, cut: number[][], {spin = 0, vx = 0, vy = 0} = {}) => {
  const s = new Ship(spec, {team: "a", x: 3, y: -2, a: 37});
  s.w = spin; s.vx = vx; s.vy = vy;
  const w = new World([s]);
  for (const [x, y] of cut) { const c = s.at(x, y); if (c) s.damage(c, c.hp); }
  const before = snapshot(w, "a"), pBefore = momentum(w, "a");
  w.splitDetached();
  const after = snapshot(w, "a"), pAfter = momentum(w, "a");

  let worst = 0, worstKey = "";
  for (const [k, [bx, by]] of before) {
    const a = after.get(k); if (!a) continue;             // destroyed by the cut
    const d = Math.hypot(a[0] - bx, a[1] - by);
    if (d > worst) { worst = d; worstKey = k; }
  }
  const dp = Math.hypot(pAfter[0] - pBefore[0], pAfter[1] - pBefore[1]);
  const rel = Math.hypot(pBefore[0], pBefore[1]) || 1;
  console.log(`\n${label}`);
  console.log(`  bodies ${w.ships.length}   worst component jump ${worst.toFixed(4)} tiles` +
              (worst > 1e-6 ? `  (${worstKey})` : ""));
  console.log(`  linear momentum |dp| ${dp.toFixed(5)}  (${(100 * dp / rel).toFixed(1)}% of |p|)`);
  return {worst, dp, rel};
};

// Losing a part is the same problem without the split: the centre of mass moves,
// and ship.x,y IS the centre of mass, so the origin has to move with it or the whole
// hull jumps. reindex() does that; this is the gate that says so.
const chip = (label: string, spin: number) => {
  const s = new Ship(carrier(), {team: "a", x: 3, y: -2, a: 37});
  s.w = spin; s.vx = 1; s.vy = -0.5;
  const w = new World([s]);
  const before = snapshot(w, "a");
  const t = s.at(1, 8); s.damage(t, t.hp);              // an outrigger, so the centre really moves
  const after = snapshot(w, "a");
  let worst = 0, worstKey = "";
  for (const [k, [bx, by]] of before) {
    const q = after.get(k); if (!q) continue;
    const d = Math.hypot(q[0] - bx, q[1] - by);
    if (d > worst) { worst = d; worstKey = k; }
  }
  console.log(`\n${label}\n  worst component jump ${worst.toFixed(4)} tiles` +
              (worst > 1e-6 ? `  (${worstKey})` : ""));
  return worst;
};
const e = chip("carrier loses an outrigger, spinning", 40);
const g = chip("carrier loses an outrigger, no spin", 0);

const a = run("bar, one tile cut, spinning 60 deg/s", bar(), [[2, 0]], {spin: 60, vx: 1.5});
const b = run("bar, one tile cut, no spin", bar(), [[2, 0]], {vx: 1.5});
const c = run("carrier releasing a drone 8 tiles forward, spinning", carrier(), [], {spin: 40, vx: 1, vy: -0.5});
const d = run("carrier releasing a drone, no spin", carrier(), [], {vx: 1});

console.log();
for (const [label, r] of [["bar spinning", a], ["bar still", b], ["carrier spinning", c], ["carrier still", d]] as any[])
  say(r.worst < 1e-6, `${label}: no component moves (${r.worst.toFixed(4)} tiles)`);
say(c.dp / c.rel < 0.01, `carrier spinning: linear momentum conserved (${(100 * c.dp / c.rel).toFixed(1)}% drift)`);
say(a.dp / a.rel < 0.01, `bar spinning: linear momentum conserved (${(100 * a.dp / a.rel).toFixed(1)}% drift)`);
say(e < 1e-6, `losing a part moves nothing else, spinning (${e.toFixed(4)} tiles)`);
say(g < 1e-6, `losing a part moves nothing else, at rest (${g.toFixed(4)} tiles)`);
process.exit(fail ? 1 : 0);
