// Does the pilot ever write a turret port? It must not: aiming is the program's job.
import {importNotebookModule} from "../notebook-import.ts";
const eng = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const Ship: any = await eng.value("Ship");
const World: any = await eng.value("World");
const load: any = await eng.value("loadShipSpec");
const pilot: any = await eng.value("pilot");
const DT: number = await eng.value("DT");
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js", {overrides: {md: (s: any) => String(s)}});
const MISSIONS: any[] = await mis.value("MISSIONS");

for (const m of MISSIONS) {
  const spec = m.ship ?? {name: "p", components: [], connections: []};
  if (!(spec.components ?? []).some((c: any) => c.type === "LaserTurret2")) continue;
  const s = new Ship(load(spec).spec, {team: "player", x: 0, y: 0, a: 0});
  const turrets = s.comps.filter((c: any) => c.type === "LaserTurret2");
  const before = turrets.map((c: any) => JSON.stringify(c.in));
  const w = new World([s]); const memo: any = {};
  // Step the world to get the ship moving and its own wiring propagating, then
  // snapshot and call the pilot ALONE -- otherwise propagate's writes get blamed
  // on it (ManualAim's own Constant sets the turret angle every tick).
  for (let k = 0; k < 5 / DT; k++) { pilot(s, {target: [15, -10], fire: true}, memo); w.step(); }
  const snap = turrets.map((c: any) => JSON.stringify(c.in));
  pilot(s, {target: [15, -10], fire: true}, memo);
  const post = turrets.map((c: any) => JSON.stringify(c.in));
  console.log(`  ${(m.id ?? m.name)}: pilot-only delta ${snap.every((v, i) => v === post[i]) ? "NONE" : snap.join(" ") + " -> " + post.join(" ")}`);
  const after = turrets.map((c: any) => JSON.stringify(c.in));
  const wrote = before.map((b, i) => b !== after[i]);
  console.log(`${(m.id ?? m.name).padEnd(14)} turrets=${turrets.length} ` +
    `ports written by pilot: ${wrote.some(Boolean) ? "YES " + after.join(" ") : "none"}   ` +
    `(in: ${before.join(" ")} -> ${after.join(" ")})`);
}
