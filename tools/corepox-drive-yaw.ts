// Holding W turns the ship. Which demand shape and which torque weight stop it?
//
// The drive branch of pilot() asks the allocator for
//     b = [axis*thrust*along,  yaw * (yaw>=0 ? tp : tn)]      wt = [1,1,2]
// where `along` is the FULL open-loop support along the best thrust axis, so the
// linear demand saturates the throttles by construction and the weights alone
// decide how much unwanted torque comes with it. yaw=0 asks for zero TORQUE, which
// does not cancel a spin the ship already has.
//
// Arms (allocator and actuator columns are the real cells, not copies):
//   old      b3 = yaw * available torque, and the torque row divided by mass
//   torque   b3 = yaw * available torque          -- the demand shape before 2026-08-21
//   rate     b3 = G.rate*(yaw*termRate - w)/KA    -- a rate command; yaw=0 holds heading
//   norm     the rate demand, with both demands scaled by this hull's own authority
//            -- what ships now (pilot's cmd.drive branch, wt 2)
//
//   bun tools/corepox-drive-yaw.ts [N]
import {importNotebookModule} from "./notebook-import.ts";
const m = await importNotebookModule(process.env.ENGINE ?? "modules/@tomlarkworthy/corepox-engine.js");
const Ship: any = await m.value("Ship");
const World: any = await m.value("World");
const load: any = await m.value("loadShipSpec");
const DT: number = await m.value("DT");
const UNITS: any = await m.value("UNITS");
const geom: any = await m.value("geom");
const pilotActuators: any = await m.value("pilotActuators");
const pilotAllocate: any = await m.value("pilotAllocate");
const flightModel: any = await m.value("flightModel");
const fs = await import("node:fs");

const KL = 1 / UNITS.W, KA = KL / geom.D, TAU = 1, G_RATE = 3.2;
const raws: any[] = [];
for (const line of fs.readFileSync("vendor/corepox/firebase/data/ships.json", "utf8").split("\n")) {
  const i = line.indexOf(","); if (i < 0) continue;
  try { const s = JSON.parse(line.slice(i + 1)); if (s?.components) raws.push(s); } catch {}
}
const fresh = (raw: any) => { const s = new Ship(load(raw).spec, {team: "a", x: 0, y: 0, a: 0}); s.conns = []; return s; };
const zero = (s: any) => { for (const c of s.live) if (c.type === "Engine") c.in.in = 0; };

// The torque row was divided by mass until 2026-08-21 (tools/corepox-thrust-moment.ts).
// Arms here run on the shipped column; `old` re-introduces the division so the
// comparison that motivated the change stays runnable.
const acts = (s: any, old = false) =>
  old ? pilotActuators(s).map((a: any) => ({...a, t: a.t / s.mass})) : pilotActuators(s);

// "norm": the two demands are asked for as a FRACTION of what this hull can do,
// so the trade-off stops depending on how big the ship is. Row scaling folds into
// the weights, which multiply squared terms.
const run = (raw: any, {thrust = 1, yaw = 0, mode = "torque", wt = 2, secs = 3, spin0 = 0}) => {
  const s = fresh(raw); s.w = spin0;
  const w = new World([s]);
  for (let n = 0; n < secs / DT; n++) {
    const A = acts(s, mode === "old");
    if (!A.length) break;
    const R = flightModel(A);
    let tp = 0, tn = 0, along = 0;
    for (const a of A) {
      tp += Math.max(0, a.t); tn += Math.max(0, -a.t);
      along += Math.max(0, a.ux * R.axis[0] * Math.sign(thrust || 1) + a.uy * R.axis[1] * Math.sign(thrust || 1));
    }
    const b3 = (mode === "torque" || mode === "old")
      ? yaw * (yaw >= 0 ? tp : tn)
      : G_RATE * (yaw * (yaw >= 0 ? R.yawP : R.yawN) * TAU - s.w) / KA;   // rate + norm
    let W = [1, 1, wt];
    if (mode === "norm") {
      const aMax = Math.max(1e-9, Math.max(R.yawP, R.yawN) * geom.D / KL);
      W = [1 / (along * along || 1), 1 / (along * along || 1), wt / (aMax * aMax)];
    }
    const out = pilotAllocate(A, [R.axis[0] * thrust * along, R.axis[1] * thrust * along, b3], W);
    zero(s); A.forEach((a: any, i: number) => { a.c.in.in = out.f[i] * 100; });
    w.step();
  }
  return {w: s.w, v: Math.hypot(s.vx, s.vy)};
};

const N = Number(process.argv.find(a => /^\d+$/.test(a)) ?? 40);
const picks: any[] = [];
for (let i = 0; i < raws.length && picks.length < N; i++) {
  let s: any; try { s = fresh(raws[i]); } catch { continue; }
  if (!s.alive) continue;
  const A = acts(s);
  if (A.length < 2) continue;
  const R = flightModel(A);
  if (!(R.yawP > 1e-9 && R.yawN > 1e-9 && R.vmax > 0.5)) continue;   // can steer BOTH ways
  picks.push({i, n: A.length, mass: s.mass});
}
const med = (xs: number[]) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const f = (x: number, w = 7, d = 2) => x.toFixed(d).padStart(w);

console.log(`${picks.length} corpus ships that can torque BOTH ways and move (holding W, 3s, from rest)\n`);
console.log("mode      wt      median |w|    ships >5 deg/s    median speed   speed vs wt=2");
const base = med(picks.map(p => run(raws[p.i], {mode: "old", wt: 2}).v));
for (const [mode, wt] of [["old", 2], ["torque", 2], ["torque", 200],
                          ["rate", 20], ["rate", 50], ["rate", 200],
                          ["norm", 0.5], ["norm", 1], ["norm", 2], ["norm", 4]] as any[]) {
  const rs = picks.map(p => run(raws[p.i], {mode, wt}));
  console.log(`${mode.padEnd(8)} ${String(wt).padStart(4)}   ${f(med(rs.map(r => Math.abs(r.w))),9)} deg/s ` +
              `${String(rs.filter(r => Math.abs(r.w) > 5).length).padStart(12)}/${rs.length}   ` +
              `${f(med(rs.map(r => r.v)),12)} ${f(100 * med(rs.map(r => r.v)) / base, 12, 0)}%`);
}

console.log("\nheading hold: same command but the ship is already spinning at 60 deg/s\n");
console.log("mode      wt    |w| after 3s");
for (const [mode, wt] of [["old", 2], ["torque", 2], ["rate", 50], ["norm", 1], ["norm", 2], ["norm", 4]] as any[]) {
  const rs = picks.map(p => run(raws[p.i], {mode, wt, spin0: 60}));
  console.log(`${mode.padEnd(8)} ${String(wt).padStart(4)}   ${f(med(rs.map(r => Math.abs(r.w))),9)} deg/s`);
}

console.log("\nturn authority must survive the change -- hold D (yaw=1) with no thrust, 3s\n");
console.log("mode      wt    median turn rate");
for (const [mode, wt] of [["old", 2], ["torque", 2], ["rate", 50], ["norm", 1], ["norm", 2], ["norm", 4]] as any[]) {
  const rs = picks.map(p => run(raws[p.i], {mode, wt, thrust: 0, yaw: 1}));
  console.log(`${mode.padEnd(8)} ${String(wt).padStart(4)}   ${f(med(rs.map(r => Math.abs(r.w))),9)} deg/s`);
}
console.log("\nand W+D together (thrust 1, yaw 1)\n");
console.log("mode      wt    median turn rate   median speed");
for (const [mode, wt] of [["old", 2], ["torque", 2], ["rate", 50], ["norm", 1], ["norm", 2], ["norm", 4]] as any[]) {
  const rs = picks.map(p => run(raws[p.i], {mode, wt, thrust: 1, yaw: 1}));
  console.log(`${mode.padEnd(8)} ${String(wt).padStart(4)}   ${f(med(rs.map(r => Math.abs(r.w))),9)} deg/s ${f(med(rs.map(r => r.v)),14)}`);
}
