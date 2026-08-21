// Does the pilot's actuator model agree with the integrator it is meant to model?
//
// Until 2026-08-21 pilotActuators built each engine's column as
//     ux = dx / mass,  uy = dy / mass,  t = (lx*uy - ly*ux) / I
// so the TORQUE row was divided by mass as well. Ship.force divides only the linear
// term: `this.vx += fx/this.mass*k` but `this.w += (r x f)/I * k/D`. This probe
// measures both rows against the integrator rather than reading them; `old`
// re-introduces the division through pilot()'s own `A` parameter, so neither arm is
// a second copy of the pilot.
//
// Section 1 is the gate: measured yaw must equal the model to within 2%.
//
//   bun tools/corepox-thrust-moment.ts [N]
import {importNotebookModule} from "./notebook-import.ts";
const m = await importNotebookModule(process.env.ENGINE ?? "modules/@tomlarkworthy/corepox-engine.js");
const Ship: any = await m.value("Ship");
const World: any = await m.value("World");
const load: any = await m.value("loadShipSpec");
const DT: number = await m.value("DT");
const pilot: any = await m.value("pilot");
const pilotActuators: any = await m.value("pilotActuators");
const flightModel: any = await m.value("flightModel");
const fs = await import("node:fs");

const raws: any[] = [];
for (const line of fs.readFileSync("vendor/corepox/firebase/data/ships.json", "utf8").split("\n")) {
  const i = line.indexOf(","); if (i < 0) continue;
  try { const s = JSON.parse(line.slice(i + 1)); if (s?.components) raws.push(s); } catch {}
}

const DRAG = 1 / (1 + 1.0 * DT);
// Wires are cut and EVERY engine is zeroed each tick: a wired engine still fires
// from propagate() and contaminated the first run of this probe (one ship measured
// -0.859x predicted, i.e. it turned the other way).
const fresh = (raw: any) => {
  const s = new Ship(load(raw).spec, {team: "a", x: 0, y: 0, a: 0});
  s.conns = [];
  return s;
};
const zero = (s: any) => { for (const c of s.live) if (c.type === "Engine") c.in.in = 0; };
const old = (A: any[], mass: number) => A.map(a => ({...a, t: a.t / mass}));

const N = Number(process.argv.find(a => /^\d+$/.test(a)) ?? 400);
const rows: any[] = [];
for (let i = 0; i < raws.length && rows.length < N; i++) {
  let s: any; try { s = fresh(raws[i]); } catch { continue; }
  if (!s.alive) continue;
  const A = pilotActuators(s);
  if (A.length < 2) continue;
  const R = flightModel(A);
  if (!(R.yawP > 1e-9) || !(R.vmax > 1e-9)) continue;

  // yawP claims max angular acceleration one way, deg/s^2. Fire exactly the
  // engines that push that way, for one tick, from rest.
  const sy = fresh(raws[i]); const Ay = pilotActuators(sy); const wy = new World([sy]);
  zero(sy); Ay.forEach(a => { a.c.in.in = a.t > 0 ? 100 : 0; });
  wy.step();
  const yawMeas = sy.w / (DT * DRAG);

  // vmax claims terminal speed along R.axis. Heading is pinned so this measures
  // speed and not a spiral.
  const sv = fresh(raws[i]); const Av = pilotActuators(sv); const wv = new World([sv]);
  for (let n = 0; n < 600; n++) {
    zero(sv); Av.forEach(a => { a.c.in.in = (a.ux * R.axis[0] + a.uy * R.axis[1]) > 0 ? 100 : 0; });
    sv.w = 0; sv.a = 0;
    wv.step();
  }
  rows.push({i, n: A.length, mass: s.mass, I: s.I,
             yawPred: R.yawP, yawMeas, vPred: R.vmax, vMeas: Math.hypot(sv.vx, sv.vy)});
}

const f = (x: number, w = 8, d = 3) => x.toFixed(d).padStart(w);
const med = (xs: number[]) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)];
console.log(`== 1. the model's rows against the integrator (${rows.length} corpus ships, wires cut)\n`);
console.log("  n  mass      I    yawP model   measured   meas/pred  /mass      vmax model   measured  meas/pred");
for (const r of rows.slice(0, 12))
  console.log(`${String(r.n).padStart(3)} ${f(r.mass,5,1)} ${f(r.I,6,2)}  ${f(r.yawPred,11)} ${f(r.yawMeas,10)} ${f(r.yawMeas/r.yawPred,11)} ${f(r.yawMeas/r.yawPred/r.mass,6)}   ${f(r.vPred,11)} ${f(r.vMeas,10)} ${f(r.vMeas/r.vPred,10)}`);
const yr = rows.map(r => r.yawMeas / r.yawPred), vr = rows.map(r => r.vMeas / r.vPred);
const mr = rows.map(r => r.yawMeas / r.yawPred / r.mass);
console.log(`\nmedian measured/model    yaw ${med(yr).toFixed(3)} (range ${Math.min(...yr).toFixed(3)}..${Math.max(...yr).toFixed(3)})` +
            `   speed ${med(vr).toFixed(3)} (range ${Math.min(...vr).toFixed(3)}..${Math.max(...vr).toFixed(3)})`);
const off = rows.filter(r => Math.abs(r.yawMeas / r.yawPred - 1) > 0.02).length;
console.log(`${rows.length - off}/${rows.length} ships: measured yaw = model yaw to within 2%` +
            (off ? `   ${off} FAIL` : ""));
if (off) process.exitCode = 1;

// ---- 2. what the understated authority costs a commanded turn ---------------
console.log("\n== 2. face 90 deg from rest: time to settle within 2 deg, old (t/mass) vs shipped\n");
console.log("        n  mass      old   shipped   ratio   peak rate old / shipped");
const turn = (raw: any, fix: boolean) => {
  const s = fresh(raw); const w = new World([s]); const memo: any = {};
  const face = 90; let t = 0, peak = 0;
  for (let n = 0; n < 12 / DT; n++) {
    const A0 = pilotActuators(s);
    pilot(s, {face}, memo, fix ? old(A0, s.mass) : A0);
    w.step(); t += DT; peak = Math.max(peak, Math.abs(s.w));
    if (Math.abs(((s.a - face + 540) % 360) - 180) < 2 && Math.abs(s.w) < 5) return {t, peak};
  }
  return {t: NaN, peak};
};
const tt: number[] = [];
for (const r of rows.slice(0, 12)) {
  const a = turn(raws[r.i], true), b = turn(raws[r.i], false);
  if (a.t && b.t) tt.push(a.t / b.t);
  console.log(`${String(r.n).padStart(9)} ${f(r.mass,5,1)} ${f(a.t,8,2)}s ${f(b.t,8,2)}s ${f(a.t/b.t,7,2)}   ${f(a.peak,9,1)} / ${f(b.peak,6,1)} deg/s`);
}
console.log(`\nmedian settle-time ratio (old / shipped) ${med(tt).toFixed(2)}`);

// ---- 3. does holding W turn a ship that need not turn? ----------------------
// Both arms run the CURRENT drive branch, so this isolates the torque row alone.
// The demand shape (torque vs rate, flat vs normalised weights) is A/B'd in
// tools/corepox-drive-yaw.ts, which is what chose the one that ships.
console.log("\n== 3. cmd.drive {thrust:1, yaw:0} held 2s -- spin the player did not ask for\n");
console.log("        n  mass     old |w|   speed    shipped |w|   speed   both-way yaw");
const drive = (raw: any, fix: boolean) => {
  const s = fresh(raw); const w = new World([s]); const memo: any = {};
  for (let n = 0; n < 2 / DT; n++) {
    const A0 = pilotActuators(s);
    pilot(s, {drive: {thrust: 1, yaw: 0}}, memo, fix ? old(A0, s.mass) : A0);
    w.step();
  }
  return {w: Math.abs(s.w), v: Math.hypot(s.vx, s.vy)};
};
let spun = 0;
for (const r of rows.slice(0, 12)) {
  const a = drive(raws[r.i], true), b = drive(raws[r.i], false);
  const s0 = fresh(raws[r.i]); const R0 = flightModel(pilotActuators(s0));
  const both = R0.yawP > 1e-9 && R0.yawN > 1e-9;
  if (b.w > 5) spun++;
  console.log(`${String(r.n).padStart(9)} ${f(r.mass,5,1)} ${f(a.w,9,1)} deg/s ${f(a.v,6,2)} ${f(b.w,13,1)} deg/s ${f(b.v,6,2)}   ${both ? "yes" : "NO -- cannot"}`);
}
console.log(`\n${spun}/12 still spin faster than 5 deg/s holding W. A hull that can torque only` +
            `\none way cannot cancel its own thrust asymmetry, and that is the build's failure.`);
