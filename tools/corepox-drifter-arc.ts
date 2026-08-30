// Where the Avoid ship can actually GO. With the scene's wiring one engine fires
// at a time (EngineFn clamps thrust to [0,100], so the -c side is dead), which is
// a torque plus an off-centre force: the ship loops. The level geometry has to sit
// on that loop, so measure it rather than guess.
import {importNotebookModule} from "./notebook-import.ts";
const eng = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const {Ship, World, DT}: any = await eng.values(["Ship","World","DT"]);
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js");
const SHIPS: any = await mis.value("SHIPS");

for (const v of [10, 25, 50, 75, 100, -50, -100]) {
  const spec = {...SHIPS.drifter, components: SHIPS.drifter.components.map((c: any) =>
    c.type === "Constant" ? {...c, param: String(v)} : c)};
  const w = new World();
  const p = new Ship(spec, {team: "player", x: 0, y: 0, a: 0});
  w.ships.push(p);
  let maxR = 0, mx = 0, my = 0, t = 0, first: number[] | null = null;
  while (t < 60) {
    w.step();
    t += DT;
    const r = Math.hypot(p.x, p.y);
    if (r > maxR) { maxR = r; mx = p.x; my = p.y; }
    if (!first && t > 0.5 && r < 0.6) first = [t, p.x, p.y];
  }
  console.log(`constant ${String(v).padStart(4)}  max reach ${maxR.toFixed(2)} tiles at ` +
    `(${mx.toFixed(2)}, ${my.toFixed(2)})   returns near origin ${first ? "t=" + first[0].toFixed(1) : "no"}`);
}
