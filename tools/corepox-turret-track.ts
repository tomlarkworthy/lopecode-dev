// Does the Gun Boat's turret actually point at the player? Tom, on Boss: The
// Assassin: "the enemy with a gun turret is not aiming at the player properly ...
// It looks wired correctly but the radar is not tracking."
//
// Runs against the module as it is IN THE NOTEBOOK (tools/corepox-engine.live.js,
// extracted with lope-reader), not the working copy, because another session has
// unpushed hitbox work in the checkout and this needs to say what Tom is seeing.
import {importNotebookModule} from "./notebook-import.ts";
import {importNotebookModule as _} from "./notebook-import.ts";
const eng = await importNotebookModule("tools/corepox-engine.live.js");
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js");
const Ship: any = await eng.value("Ship");
const World: any = await eng.value("World");
const geom: any = await eng.value("geom");
const MISSIONS: any[] = await mis.value("MISSIONS");

const m = MISSIONS.find(x => x.id === "FollowBoss");
const boss = m.enemies.find((e: any) => e.spec.name === "Gun Boat");
console.log(`enemy "${boss.spec.name}" at (${boss.x}, ${boss.y}) a=${boss.a}`);

const player = new Ship(m.solution, {team: "player", x: 0, y: 0, a: 0});
const world = new World([player]);
for (const e of m.enemies) {
  const s = new Ship(e.spec, {team: e.team ?? "enemy", x: e.x, y: e.y, a: e.a ?? 0});
  s.vx = e.vx ?? 0; s.vy = e.vy ?? 0;
  world.ships.push(s);
}
const gb = world.ships.find((s: any) => s.spec?.name === "Gun Boat"
                                     ?? false) ?? world.ships[3];
const findGB = world.ships.filter((s: any) => s.comps.some((c: any) => c.type === "LaserTurret2"));
const boat = findGB.find((s: any) => s.team === "enemy");
const radar = boat.comps.find((c: any) => c.type === "Radar");
const turret = boat.comps.find((c: any) => c.type === "LaserTurret2");

console.log("turret cells:", JSON.stringify(turret.tiles));
console.log("radar cells :", JSON.stringify(radar.tiles));
console.log("conns       :", JSON.stringify(boat.conns));
console.log("at(1,4)     :", boat.at(1, 4)?.type, " at(2,4):", boat.at(2, 4)?.type);
console.log("in topo order:", boat.order.map((i: number) => boat.comps[i].type).join(", "));
console.log("\n  t   truth   radar.bearing  in.angle  turret  aim-err   dist  lock");
for (let i = 0; i <= 60 * 50; i++) {
  if (i % 250 === 0) {
    const [rx, ry] = boat.sensorOf(radar);
    // where the player actually is, as a bearing in the turret's own frame
    const truth = geom.norm(geom.bearing(rx, ry, player.x, player.y)
                            - (boat.a + turret.dir));
    const aim = turret.turret ?? 0;
    const err = geom.norm(truth - aim);
    console.log(
      `${(world.t).toFixed(1).padStart(5)} ` +
      `${truth.toFixed(1).padStart(7)} ` +
      `${String(radar.out.bearing?.toFixed(1)).padStart(14)} ` +
      `${String(turret.in.angle?.toFixed?.(1) ?? turret.in.angle).padStart(9)} ` +
      `${aim.toFixed(1).padStart(7)} ` +
      `${err.toFixed(1).padStart(8)} ` +
      `${String(radar.out.dist?.toFixed(1)).padStart(6)} ` +
      `${radar.lock ? "yes" : "NO"}  radar.hp ${radar.hp}  turret.hp ${turret.hp}  live ${boat.live.length}`);
  }
  world.step();
  if (!player.alive || !boat.alive) { console.log(`\nended t=${world.t.toFixed(1)} player=${player.alive} boat=${boat.alive}`); break; }
}
