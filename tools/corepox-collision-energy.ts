// Does a collision ADD energy? Tom, 2026-08-22: "collisions cause energy gain,
// which should not happen, close ship collisions start accelerating everything to
// insane and unrealistic levels."
//
//   bun tools/corepox-collision-energy.ts
//
// The instrument needs no control run and no analytic prediction. `Ship.integrate`
// applies drag `1/(1+DT)` unconditionally (corepox-engine.js:995) and nothing else
// in a world of unwired hulls can add momentum, so total kinetic energy is
// MONOTONICALLY DECREASING unless `World.collide` puts some in. Any tick where the
// total rises is energy created, and how much it rises by is the size of the bug.
//
// Two earlier attempts at this measured the wrong thing and are recorded so they
// are not repeated: at the shipped 100hp the pair ANNIHILATED each other before
// bouncing (KE out 0.00x on every row, because the terms of the sum were being
// deleted), and reading "KE before vs KE after" over a long window measured the
// DRAG, which takes everything to zero in a few hundred ticks whether or not the
// ships ever meet.
import {importNotebookModule} from "./notebook-import.ts";
import {Runtime} from "@observablehq/runtime";
(Runtime.prototype as any).fileAttachments ??= () => () => null;
(globalThis as any).window = {lopecode: {contentSync: () => ({status: 200, mime: "application/gzip", bytes: new Uint8Array()})}};

const eng = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const E: any = {};
for (const n of ["Ship","World","geom","DT","TYPES","loadShipSpec","UNITS"]) E[n] = await eng.value(n);
E.World.rng = (await eng.value("seedRng"))(1);
const D2R = E.geom.D;

let fail = 0;
const ok = (cond: any, label: string, detail = "") => {
  console.log(`${cond ? "  ok  " : "FAIL  "}${label}${detail ? "   " + detail : ""}`);
  if (!cond) fail++;
};

// Armour only, so `evaluate` has nothing to run and no thrust can enter the system
// behind the collision's back. hp is absurd on purpose: a conservation test cannot
// read a total whose terms are being deleted by ram damage.
const brick = (w: number, h: number) => ({
  name: "brick", connections: [],
  components: Array.from({length: w * h}, (_, i) =>
    ({type: "Armour", pos: [i % w, Math.floor(i / w)], dir: "up", hp: 1e9}))
});
// Split, because which HALF grows is the whole diagnosis: a bounce that conserves
// momentum has to lose linear energy, so if the total rises the surplus can only be
// rotational -- and rotation is what `jmag`'s denominator forgot to pay for.
const keLin = (s: any) => 0.5 * s.mass * (s.vx * s.vx + s.vy * s.vy);
const keAng = (s: any) => 0.5 * s.I * (s.w * D2R) ** 2;   // the engine keeps w in deg/s
const ke = (s: any) => keLin(s) + keAng(s);
const sum = (w: any, f: any) => w.ships.reduce((n: number, s: any) => n + f(s), 0);
const totalKe = (w: any) => sum(w, ke);

const probe = ({size = 4, v = 0, offset = 0, gap = 3, ticks = 240} = {}) => {
  const spec = E.loadShipSpec(brick(size, size)).spec;
  const a = new E.Ship(structuredClone(spec), {team: "a", x: -gap, y: 0, a: 0});
  const b = new E.Ship(structuredClone(spec), {team: "b", x:  gap, y: offset, a: 0});
  a.vx = v;
  const w = new E.World([a, b]);
  const ke0 = totalKe(w);
  let prev = ke0, gains = 0, worst = 0, gained = 0, peak = ke0, tWorst = 0;
  for (let i = 0; i < ticks; i++) {
    w.step();
    const now = totalKe(w);
    const d = now - prev;
    if (d > 1e-9) { gains++; gained += d; if (d > worst) { worst = d; tWorst = +w.t.toFixed(2); } }
    if (now > peak) peak = now;
    prev = now;
  }
  return {ke0, peak, end: prev, gains, gained, worst, tWorst, ticks,
          lin: sum(w, keLin), ang: sum(w, keAng),
          mass: a.mass, I: a.I, spin: Math.abs(a.w), speed: Math.hypot(a.vx, a.vy)};
};

const sp = (x: number, n = 2) => x.toFixed(n).padStart(10);
console.log(`corepox collision energy — ${new Date().toISOString().slice(0, 10)}`);
console.log(`UNITS.W ${E.UNITS.W}, restitution in collide() 0.2, drag 1/(1+DT) every tick`);
console.log(`drag can only REMOVE energy, so every rise below was created by collide()\n`);

console.log("hulls placed IN CONTACT and at rest — nothing is moving, so every joule is new");
console.log("  size   gap   KE start    KE peak     KE end   rising ticks    worst tick    end |v|   end spin");
for (const [size, gap] of [[2, 1], [3, 1.5], [4, 2], [4, 1], [6, 2]] as any) {
  const r = probe({size, gap, offset: 0.5, v: 0});
  console.log(`  ${size}x${size} ${String(gap).padStart(5)} ${sp(r.ke0)} ${sp(r.peak)} ${sp(r.end)}` +
              `  ${String(r.gains + "/" + r.ticks).padStart(12)} ${sp(r.worst, 3)}  ${sp(r.speed)} ${sp(r.spin, 1)}`);
}
const rest = probe({size: 4, gap: 2, offset: 0.5, v: 0});
ok(rest.gains === 0, "a pair spawned in contact and at rest gains no energy",
   `${rest.gains} rising ticks, peak KE ${rest.peak.toFixed(2)}`);

console.log("\nhead-on at speed — a bounce at e = 0.2 must never raise the total");
console.log("     v  offset   KE start    KE peak     KE end   rising ticks    worst tick");
for (const [v, offset] of [[6, 0], [6, 1], [6, 2], [12, 0], [12, 2], [20, 2]] as any) {
  const r = probe({size: 4, v, offset, gap: 3});
  console.log(`  ${String(v).padStart(4)} ${String(offset).padStart(7)} ${sp(r.ke0)} ${sp(r.peak)} ${sp(r.end)}` +
              `  ${String(r.gains + "/" + r.ticks).padStart(12)} ${sp(r.worst, 3)}`);
}
const hit = probe({size: 4, v: 12, offset: 2, gap: 3});
ok(hit.gains === 0, "an off-centre bounce gains no energy",
   `${hit.gains} rising ticks, ${hit.gained.toFixed(2)} total gained, peak ${(hit.peak / hit.ke0).toFixed(2)}x the start`);

// The decisive one. Two identical bricks meeting FACE TO FACE on y = 0 is
// symmetric about that axis, so the only outcome symmetry allows is a straight
// bounce with zero spin on both hulls.
console.log("\nthe symmetric case — two identical bricks, face to face, both on y = 0");
{
  const spec = E.loadShipSpec(brick(4, 4)).spec;
  const a = new E.Ship(structuredClone(spec), {team: "a", x: -3, y: 0, a: 0});
  const b = new E.Ship(structuredClone(spec), {team: "b", x:  3, y: 0, a: 0});
  a.vx = 12;
  const w = new E.World([a, b]);
  console.log("  tick     a.vx     b.vx        a.w        b.w   KE linear   KE spin    KE total");
  let prev = totalKe(w);
  for (let i = 0; i < 12; i++) {
    w.step();
    const t = totalKe(w), L = sum(w, keLin), A = sum(w, keAng);
    if (i >= 7 && i <= 11)
      console.log(`  ${String(i).padStart(4)} ${a.vx.toFixed(3).padStart(8)} ${b.vx.toFixed(3).padStart(8)}` +
                  ` ${a.w.toFixed(2).padStart(10)} ${b.w.toFixed(2).padStart(10)}` +
                  ` ${L.toFixed(2).padStart(11)} ${A.toFixed(2).padStart(9)} ${t.toFixed(2).padStart(11)}` +
                  (t > prev ? "   <-- KE UP" : ""));
    prev = t;
  }
  ok(Math.abs(a.w) < 1e-6 && Math.abs(b.w) < 1e-6,
     "a symmetric head-on bounce produces no spin",
     `a.w ${a.w.toFixed(1)} deg/s, b.w ${b.w.toFixed(1)} deg/s`);
  ok(sum(w, keAng) < 1e-6, "and no rotational energy",
     `spin carries ${sum(w, keAng).toFixed(1)} of ${totalKe(w).toFixed(1)} total`);
}

// What was wrong, kept because the numbers above only show that it is right NOW.
console.log("\nwhat this used to do, and what changed (all three were live until 2026-08-22)");
console.log(`  1. a whole contact patch was resolved at ONE cell pair, tie-broken by iteration`);
console.log(`     order, so a flush face-on hit landed as a CORNER strike -- the +/-297 deg/s of`);
console.log(`     spin on a collision that is symmetric about the line of centres.`);
console.log(`     now: one impulse per body pair, at the CENTROID of the manifold, along the`);
console.log(`     average normal, with rel read at that same point.`);
console.log(`  2. jmag divided by (1/mA + 1/mB) -- the LINEAR denominator -- and was then spent at`);
console.log(`     an offset on linear AND angular motion, so the rotation came out free. That was`);
console.log(`     the energy source: linear KE fell correctly while spin appeared from nothing.`);
console.log(`     now: + (rA x n)^2/IA + (rB x n)^2/IB, the standard 2D form, energy non-increasing`);
console.log(`     for e <= 1.`);
const f = 1 / E.UNITS.W;
console.log(`  3. the impulse went through force(), which carries a deliberate 1/UNITS.W = ${f.toFixed(4)}x`);
console.log(`     for THRUST, turning e = ${E.UNITS.RESTITUTION} into an effective ${(1.2 * f - 1).toFixed(3)}.`);
console.log(`     now: Ship.impulse(), which applies a velocity change and no thrust tuning.`);
console.log(`     force() is untouched, so ship speeds and turn rates are unchanged.`);

console.log(fail ? `\nFAIL: ${fail} check(s) — collide() creates energy` : "\nPASS — no energy created");
process.exit(fail ? 1 : 0);
