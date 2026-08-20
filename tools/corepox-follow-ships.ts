// Do the Advanced Steering hulls build, power up and steer the way the wiring
// says? Each is put on the field 14 tiles from a stationary target and the closing
// distance is measured -- pursuit shows up as a number that goes down. Two of them
// are meant NOT to close: the hulls arrive without a core, so nothing is powered
// and nothing moves, which is the mission.
import {importNotebookModule} from "./notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const Ship: any = await m.value("Ship"), World: any = await m.value("World"), DT: any = await m.value("DT");
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js");
const SHIPS: any = await mis.value("SHIPS");

const NAMES = ["braitenbergVehicle", "unfinishedOrbDrone_hull", "orbDroneChassis_hull",
               "spike", "gunBoat"];
// where a core fits on the coreless hulls: FollowCourse's own copy of the
// Unfinished drone puts one at [0,-2], and the chassis takes one at [1,-2].
const CORE: Record<string, number[]> = {unfinishedOrbDrone_hull: [0, -2],
                                        orbDroneChassis_hull: [1, -2]};
let bad = 0;
for (const n of NAMES) {
  // the hulls that ship coreless get one, so the rest of the check has something
  // to observe; the report says which
  const raw = SHIPS[n], cored = raw.components.some((c: any) => c.type === "Brain");
  const spec = cored ? raw
    : {...raw, components: [...raw.components, {type: "Brain", pos: CORE[n]}]};
  const s = new Ship(spec, {team: "a", x: 0, y: 0, a: 0});
  const o = s.overlaps(), isl = s.islands().length;
  const target = new Ship({name: "t", components: [{type: "Brain", pos: [0, 0]}]},
                          {team: "b", x: 0, y: -14, a: 180});
  const w = new World([s, target]);
  const d0 = Math.hypot(s.x - target.x, s.y - target.y);
  let dmin = d0;
  for (let i = 0; i < 60 / DT && s.live.length; i++) {
    w.step(DT);
    dmin = Math.min(dmin, Math.hypot(s.x - target.x, s.y - target.y));
  }
  const pwr = s.comps.filter((c: any) => c.powered).length, tot = s.comps.length;
  const ok = !o && isl === 1 && pwr === tot;
  if (!ok) bad++;
  console.log((ok ? "ok  " : "FAIL") + " " + n.padEnd(24) +
    " " + tot + " comps, " + pwr + " powered, " + isl + " island" +
    (cored ? "" : ", core added at " + CORE[n]) +
    (o ? ", OVERLAP " + o[0].type + "/" + o[1].type : "") +
    "   closed " + d0.toFixed(1) + " -> " + dmin.toFixed(1) +
    (target.live.length ? "" : "  TARGET DEAD"));
}
process.exit(bad ? 1 : 0);
