// Does WASD actually drive, and does a hull without the authority ignore the key?
import {importNotebookModule} from "../notebook-import.ts";
const eng = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const Ship: any = await eng.value("Ship");
const World: any = await eng.value("World");
const load: any = await eng.value("loadShipSpec");
const pilot: any = await eng.value("pilot");
const act: any = await eng.value("pilotActuators");
const fm: any = await eng.value("flightModel");
const DT: number = await eng.value("DT");
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js", {overrides: {md: (s: any) => String(s)}});
const MISSIONS: any[] = await mis.value("MISSIONS");

const run = (id: string, drive: any, secs = 3) => {
  const m = MISSIONS.find((x: any) => (x.id ?? x.name) === id);
  const s = new Ship(load(m.ship).spec, {team: "player", x: 0, y: 0, a: 0});
  const A = act(s); if (!A.length) return `${id}: no free engines`;
  const R = fm(A);
  const w = new World([s]); const memo: any = {};
  for (let k = 0; k < secs / DT; k++) { pilot(s, {drive}, memo); w.step(); }
  return `${id.padEnd(20)} ${JSON.stringify(drive).padEnd(24)} -> ` +
    `speed ${Math.hypot(s.vx, s.vy).toFixed(2)} tiles/s, heading ${s.a.toFixed(0)}deg, spin ${s.w.toFixed(0)}deg/s` +
    `   [yaw authority ${R.yawP.toFixed(0)}/${R.yawN.toFixed(0)}]`;
};
for (const id of ["FollowCourse", "ConnectionLite"])
  for (const d of [{thrust: 1, yaw: 0}, {thrust: -1, yaw: 0}, {thrust: 0, yaw: 1}, {thrust: 0, yaw: -1}, {thrust: 1, yaw: 1}])
    console.log(run(id, d));
