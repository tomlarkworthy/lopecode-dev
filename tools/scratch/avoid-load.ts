import {importNotebookModule} from "../notebook-import.ts";
const eng = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const Ship: any = await eng.value("Ship");
const load: any = await eng.value("loadShipSpec");
const act: any = await eng.value("pilotActuators");
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js", {overrides: {md: (s: any) => String(s)}});
const MISSIONS: any[] = await mis.value("MISSIONS");
for (const id of ["Avoid", "FollowCourse", "Aim", "TwinTurrets"]) {
  const m = MISSIONS.find((x: any) => (x.id ?? x.name) === id);
  const raw = m.ship;
  const {spec, dropped} = load(raw);
  const a = new Ship(raw, {team: "player"});            // what newSession does
  const b = new Ship(spec, {team: "player"});           // what every other path does
  console.log(`${id}: raw conns=${(raw.connections ?? []).length} loaded conns=${(spec.connections ?? []).length} dropped=${dropped.length}` +
    ` | comps raw=${a.comps.length} loaded=${b.comps.length} | free engines raw=${act(a).length} loaded=${act(b).length}` +
    ` | composites=${(raw.components ?? []).filter((c: any) => c.type === "Composite").length}`);
}
