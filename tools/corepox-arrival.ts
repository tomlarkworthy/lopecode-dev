// "pilot parks about three tiles short of a waypoint" (lopecode-dev-75, 2026-08-21,
// on the robot miner) -- is there an arrival deadband, or is the fixture a
// single-axis hull with its heading pinned?
//
// There is no deadband: the same command on a hull that can push BOTH WAYS along its
// thrust line and is free to turn settles at 0.00 tiles. Note what that does and does
// not need -- both fixtures here have a single thrust AXIS (`rocket=true`, axis
// 0,-1); what the second one adds is reverse. A hull that can only push one way, with
// `face` pinned, reaches the PROJECTION of the target onto that line and stops there,
// which is 3.90 tiles for [7,-7] at face 45 -- and for a target the line does not pass
// near, it never leaves the spot at all (10.00 tiles out, throttles [0,0]).
//
// Each fixture reports its own islands and engine count, because a component placed
// where nothing bonds to it is discarded by splitDetached at t=0 and the hull that
// flies is not the hull that was written (lopecode-dev-75 lost two lateral engines
// that way, and every measurement taken after "I added lateral thrust" was the
// single-axis hull).
//
//   bun tools/corepox-arrival.ts
import {importNotebookModule} from "./notebook-import.ts";
const eng = await importNotebookModule(process.env.ENGINE ?? "modules/@tomlarkworthy/corepox-engine.js");
const Ship: any = await eng.value("Ship"), World: any = await eng.value("World");
const load: any = await eng.value("loadShipSpec"), pilot: any = await eng.value("pilot");
const flightModel: any = await eng.value("flightModel"), acts: any = await eng.value("pilotActuators");

const MINER = {name: "miner", components: [
  {type: "Brain", pos: [0, 0]},
  {type: "Engine", pos: [-1, -1]}, {type: "Engine", pos: [1, -1]},
  {type: "Constant", pos: [0, -1], param: "100"},
  {type: "Lazer", pos: [0, 1]}, {type: "Lazer", pos: [-1, 1]}, {type: "Lazer", pos: [1, 1]}],
 connections: []};
// the same hull with two engines turned around: it can push both ways along the SAME
// line -- this buys reverse, not a second axis
const REV = {...MINER, components: [...MINER.components,
  {type: "Engine", pos: [-1, 1], dir: "down"}, {type: "Engine", pos: [1, 1], dir: "down"}]};

const run = (spec: any, cmd: any, label: string) => {
  const s = new Ship(load(spec).spec, {team: "a", x: 0, y: 0, a: 0});
  const w = new World([s]); const memo: any = {};
  const A = acts(s), R = flightModel(A);
  const built = JSON.stringify(s.islands().map((g: any) => g.length));   // BEFORE flying
  let best = 1e9;
  for (let i = 0; i < 900; i++) {
    pilot(s, cmd, memo); w.step();
    best = Math.min(best, Math.hypot(s.x - cmd.target[0], s.y - cmd.target[1]));
  }
  const d = Math.hypot(s.x - cmd.target[0], s.y - cmd.target[1]);
  const thr = s.live.filter((c: any) => c.type === "Engine").map((c: any) => (c.in.in ?? 0).toFixed(0)).join(",");
  console.log(`${label.padEnd(34)} settled ${d.toFixed(2)} tiles out (closest ${best.toFixed(2)}), ` +
              `a=${s.a.toFixed(0)} v=${Math.hypot(s.vx, s.vy).toFixed(2)} thr=[${thr}]  ` +
              `islands ${built} ` +
              `engines ${A.length} axis ${R.axis.map((v: number) => v.toFixed(2)).join(",")}`);
};

const T: [number, number] = [7, -7];
run(MINER, {target: T, face: 45}, "rocket, face pinned to 45");
run(MINER, {target: T}, "rocket, free to turn");
run(REV,   {target: T, face: 45}, "two-way thrust, face pinned to 45");
run(REV,   {target: T}, "two-way thrust, free to turn");
for (const th of [0, 90, 135, 180, 225, 270]) {
  const t: [number, number] = [10 * Math.cos(th * Math.PI / 180), 10 * Math.sin(th * Math.PI / 180)];
  run(MINER, {target: t, face: 45}, `rocket, face 45, target at ${th} deg`);
}
