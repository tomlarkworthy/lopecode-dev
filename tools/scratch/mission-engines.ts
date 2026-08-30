import {importNotebookModule} from "../notebook-import.ts";
const eng = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const Ship: any = await eng.value("Ship");
const load: any = await eng.value("loadShipSpec");
const pilotActuators: any = await eng.value("pilotActuators");
const flightModel: any = await eng.value("flightModel");
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js", {overrides: {md: (s: any) => String(s)}});
const MISSIONS: any[] = await mis.value("MISSIONS");
for (const m of MISSIONS) {
  const spec = m.ship ?? {name: "player", components: [], connections: []};
  let s: any; try { s = new Ship(load(spec).spec, {team: "player", x: 0, y: 0, a: 0}); } catch (e) { console.log(m.id ?? m.name, "LOAD FAIL"); continue; }
  const free = pilotActuators(s), all = pilotActuators(s, {all: true});
  const R = all.length ? flightModel(all) : null;
  console.log(`${(m.id ?? m.name ?? "?").padEnd(16)} comps=${String(s.live.length).padStart(2)} engines free/all=${free.length}/${all.length}` +
    (R ? ` vmax=${R.vmax.toFixed(2)} yaw=${R.yawP.toFixed(0)}/${R.yawN.toFixed(0)} rocket=${R.rocket}` : ""));
}
