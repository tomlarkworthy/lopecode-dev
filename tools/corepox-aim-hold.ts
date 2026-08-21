// Does `chaseCmd`'s pinned `face` survive the allocation, or is it rounding?
//
// lopecode-dev-75 measured (2026-08-21) that the waypoint path's flat weights
// [1, 1, G.torque] leave a torque row two orders of magnitude smaller than the
// linear rows, so a demand that asks for BOTH a translation and a heading serves
// the translation and drops the heading. On their miner -- whose ring point is
// perpendicular to the seam it must face -- the hull flew the orbit nose-first at
// ~80 deg of heading error and fired the whole run into empty space.
//
// chaseCmd is the duel's stock opponent and it pins `face: brg` on every tick, so
// it has the same shape. It should be much milder, because its target lies ALONG
// the bearing (`self + unit(brg)*k`) -- translation and heading agree. This
// measures how mild, and it gates `fire`, which chaseCmd only sets inside a 25 deg
// arc: heading error the pilot declines to serve is shots the AI never takes.
//
//   bun tools/corepox-aim-hold.ts [seeds]
import {importNotebookModule} from "./notebook-import.ts";
const eng = await importNotebookModule(process.env.ENGINE ?? "modules/@tomlarkworthy/corepox-engine.js");
const E: any = {};
for (const n of ["Ship", "World", "geom", "DT", "pilot", "loadShipSpec"]) E[n] = await eng.value(n);
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js",
  {overrides: {md: (s: any) => String(s)}});
const SHIPS: any = await mis.value("SHIPS");
const duel = await importNotebookModule("modules/@tomlarkworthy/corepox-duel.js", {
  overrides: {...E, SHIPS, md: (s: any) => String(s), htl: {html: () => {}},
              battlefield: null, backdrop: null, invalidation: new Promise(() => {})}});
const newDuel: any = await duel.value("newDuel");
const stepDuel: any = await duel.value("stepDuel");
const chaseCmd: any = await duel.value("chaseCmd");
// World.rng is Math.random and nothing in the game sets it (corepox-engine.js:1025;
// `seedRng` has one caller in the repo). Exhaust particles draw from it and carry
// EXHAUST_DMG, so an unseeded run is not repeatable -- corepox-mining-check.ts swung
// 2/5 to 5/5 seeds on identical input before this was found. Seeded here so the
// numbers in the header and in the plan can be reproduced.
(await eng.value("World") as any).rng = (await eng.value("seedRng") as any)(20260821);
const geom = E.geom, DT = E.DT;
const pilotActuators: any = await eng.value("pilotActuators");

// A ZERO heading error can mean perfect aim or a ship that never moved. Three of the
// six hulls this probe first ran on have no free engine -- aimPlayer, laserpost and
// orbDroneChassis_hull -- so attacker and foe both sat still at the placement's
// face-each-other heading and scored 0 deg and 100% inside the arc while measuring
// nothing. Free-engine count and distance travelled are printed so that cannot pass
// as a result again.
//
// The duel seed feeds World.rng (exhaust, fragments) and NOT the placement, so eight
// seeds of the same pairing are one sample eight times -- the first run of this probe
// printed eight identical rows. Variety comes from the placement bearing and the hull.
const N = Number(process.argv.find(a => /^\d+$/.test(a)) ?? 8);
const HULLS = ["gunBoat", "aimPlayer", "laserpost", "orbDroneChassis_hull", "spike", "drifter"];
// aimPlayer on b: 14 parts and a turret, so the fight lasts long enough to sample.
// The first run of this probe used proximityMine and got 59 ticks a seed -- 1.2s --
// which is not a measurement of a chase.
console.log("chaseCmd driving a gunBoat, aimPlayer wired on side b, 60s per seed\n");
console.log("attacker            engines   travelled       |err| mean  median   inside the 25 deg arc");
const all: number[] = []; let inArc = 0, ticks = 0, wanted = 0, fired = 0;
const rows: any[] = [];
for (const hull of HULLS) for (let s = 0; s < N; s++) {
  const bearing = Math.round(360 * s / N);
  const D = newDuel({mode: "elimination", limit: 60, seed: s + 1,
    a: {spec: SHIPS[hull], control: "auto"}, b: {spec: SHIPS.aimPlayer},
    placement: {separation: 22, bearing}});
  const errs: number[] = [];
  const A0 = pilotActuators(D.a).length;
  const x0 = D.a.x, y0 = D.a.y;
  for (let i = 0; i < 60 / DT && !D.over; i++) {
    stepDuel(D);
    const self = D.a, foe = D.b;
    if (!self?.live?.length || !foe?.live?.length) break;
    const brg = geom.bearing(self.x, self.y, foe.x, foe.y);
    const e = Math.abs(geom.norm(brg - self.a));
    errs.push(e); all.push(e); ticks++;
    if (e < 25) inArc++;
    // what chaseCmd WOULD fire at if the heading were served, against what it does
    const d = Math.hypot(foe.x - self.x, foe.y - self.y);
    if (d < 26) { wanted++; if (e < 25) fired++; }
  }
  if (!errs.length) continue;
  const srt = errs.slice().sort((a, b) => a - b);
  rows.push({hull, bearing, n: errs.length, eng: A0,
             moved: Math.hypot(D.a.x - x0, D.a.y - y0),
             mean: errs.reduce((a, b) => a + b, 0) / errs.length,
             med: srt[srt.length >> 1],
             arc: 100 * errs.filter(e => e < 25).length / errs.length});
}
for (const hull of HULLS) {
  const rs = rows.filter(r => r.hull === hull);
  if (!rs.length) { console.log(`${hull.padEnd(22)} (no ticks)`); continue; }
  const m = (f: (r: any) => number) => rs.reduce((a, r) => a + f(r), 0) / rs.length;
  // Two different disqualifications, and they are not the same thing: a hull with no
  // FREE engine gives pilot() nothing to allocate (pilotActuators skips wired ones),
  // so it may still fly -- under its own program, with the pilot writing nothing.
  const why = rs[0].eng === 0
    ? (m(r => r.moved) < 1 ? "   NOT A MEASUREMENT: no free engine, never moved"
                           : "   NOT A MEASUREMENT: flies its own wiring, pilot wrote nothing")
    : m(r => r.moved) < 1 ? "   NOT A MEASUREMENT: never left the spot" : "";
  console.log(`${hull.padEnd(22)} ${String(rs[0].eng).padStart(2)} eng ` +
              `${m(r => r.moved).toFixed(1).padStart(6)} tiles moved   ` +
              `${m(r => r.mean).toFixed(0).padStart(4)} ${m(r => r.med).toFixed(0).padStart(7)}   ` +
              `${m(r => r.arc).toFixed(0).padStart(10)}%` + why);
}
const live = rows.filter(r => r.eng > 0 && r.moved >= 1);   // the pilot actually drove it
console.log(`\n${live.length}/${rows.length} runs actually flew. Over those: mean ` +
  `${(live.reduce((a, r) => a + r.mean, 0) / live.length).toFixed(0)} deg, inside the arc ` +
  `${(live.reduce((a, r) => a + r.arc, 0) / live.length).toFixed(0)}%`);
const srt = all.slice().sort((a, b) => a - b);
console.log(`over ${ticks} ticks: mean ${(all.reduce((a, b) => a + b, 0) / all.length).toFixed(0)} deg, ` +
            `median ${srt[srt.length >> 1].toFixed(0)} deg, inside the 25 deg arc ${(100 * inArc / ticks).toFixed(0)}%`);
console.log(`in range and would shoot: ${wanted} ticks, actually inside the arc ${fired} ` +
            `(${(100 * fired / Math.max(1, wanted)).toFixed(0)}%)`);
