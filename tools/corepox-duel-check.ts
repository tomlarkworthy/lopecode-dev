// Exercise the duel module headlessly: every mode, both controls, and a rematch
// check that the same seed and placement give the same fight.
import {importNotebookModule} from "./notebook-import.ts";
const eng = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const E: any = {};
for (const n of ["Ship", "World", "geom", "DT", "pilot", "loadShipSpec"]) E[n] = await eng.value(n);
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js", {overrides: {md: (s: any) => String(s)}});
const SHIPS: any = await mis.value("SHIPS");
const duel = await importNotebookModule("modules/@tomlarkworthy/corepox-duel.js", {
  overrides: {...E, SHIPS, md: (s: any) => String(s), htl: {html: () => {}},
              battlefield: null, backdrop: null, invalidation: new Promise(() => {})}
});
const runDuel: any = await duel.value("runDuel");
const MODES: any = await duel.value("DUEL_MODES");
const place: any = await duel.value("duelPlacement");

console.log("placement sep 20 bearing 25:", JSON.stringify(place({separation: 20, bearing: 25}))
  .replace(/(\d\.\d{2})\d+/g, "$1"));

for (const mode of Object.keys(MODES)) {
  const r = runDuel({mode, limit: 30, seed: 4,
    a: {spec: SHIPS.rocketCore, control: "auto"},
    b: {spec: SHIPS.proximityMine},
    placement: {separation: 20, bearing: 25}});
  console.log(`${mode.padEnd(12)} winner=${r.winner.padEnd(5)} ${r.seconds}s  a=${r.a.live}/${r.a.alive} b=${r.b.live}/${r.b.alive}`);
}
// auto vs wired, same pair
for (const control of ["wired", "auto"]) {
  const r = runDuel({mode: "elimination", limit: 30, seed: 4,
    a: {spec: SHIPS.rocketCore, control},
    b: {spec: SHIPS.proximityMine},
    placement: {separation: 20, bearing: 25}});
  console.log(`A control=${control.padEnd(6)} -> ${r.winner} at ${r.seconds}s (a ${r.a.live} parts)`);
}
// determinism
const twice = [0, 1].map(() => runDuel({mode: "elimination", limit: 30, seed: 9,
  a: {spec: SHIPS.rocketCore, control: "auto"}, b: {spec: SHIPS.laserpost},
  placement: {separation: 22, bearing: 100}}));
console.log(`same seed twice: ${twice[0].winner}@${twice[0].seconds}s vs ${twice[1].winner}@${twice[1].seconds}s ` +
  `-> ${JSON.stringify(twice[0].a) === JSON.stringify(twice[1].a) && twice[0].seconds === twice[1].seconds ? "IDENTICAL" : "DIVERGED"}`);

// A pair where the control actually matters: liteCore's engine is unwired, so
// `wired` leaves it sitting still and `auto` should close the distance.
const newDuel: any = await duel.value("newDuel");
const stepDuel: any = await duel.value("stepDuel");
for (const control of ["wired", "auto"]) {
  const D = newDuel({mode: "elimination", limit: 20, seed: 2,
    a: {spec: SHIPS.liteCore, control}, b: {spec: SHIPS.lonelyCore},
    placement: {separation: 30, bearing: 0}});
  const d0 = Math.hypot(D.b.x - D.a.x, D.b.y - D.a.y);
  for (let i = 0; i < 10 / E.DT; i++) if (stepDuel(D) !== "playing") break;
  console.log(`liteCore control=${control.padEnd(6)} separation ${d0.toFixed(1)} -> ${Math.hypot(D.b.x - D.a.x, D.b.y - D.a.y).toFixed(1)} tiles after 10s`);
}
// the `human` path: a caller writes D.cmd.a and nothing else drives it
const H = newDuel({mode: "survival", limit: 8, seed: 3,
  a: {spec: SHIPS.liteCore, control: "human"}, b: {spec: SHIPS.lonelyCore},
  placement: {separation: 30, bearing: 0}});
H.cmd.a = {drive: {thrust: 1, yaw: 0}, fire: false};
for (let i = 0; i < 5 / E.DT; i++) if (stepDuel(H) !== "playing") break;
console.log(`human control, thrust held 5s: speed ${Math.hypot(H.a.vx, H.a.vy).toFixed(2)} tiles/s`);
