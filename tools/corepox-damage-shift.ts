// Same defect as the build-time shift, on the physics side: ship.x/y is the world
// position of the CENTRE OF MASS, so when a component dies and reindex() recomputes
// it, every surviving tile teleports by the delta. Measures how far, on the real
// mission ships, by killing one component and watching a survivor.
import {importNotebookModule} from "./notebook-import.ts";
const eng = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const {Ship}: any = await eng.values(["Ship"]);
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js");
const SHIPS: any = await mis.value("SHIPS");

let bad = 0, n = 0;
console.log("ship            killed          survivor moves (tiles)");
for (const [name, spec] of Object.entries<any>(SHIPS)) {
  if (!spec?.components?.length) continue;
  let worst = 0, who = "";
  for (const victim of spec.components) {
    const s = new Ship(spec, {team: "a", x: 0, y: 0, a: 0});
    const keep = s.comps.find((c: any) => c !== s.comps[spec.components.indexOf(victim)]);
    const target = s.comps[spec.components.indexOf(victim)];
    if (!keep || !target || s.live.length < 2) continue;
    const before = s.worldOf(keep);
    s.damage(target, target.hp);
    const after = s.worldOf(keep);
    const d = Math.hypot(after[0] - before[0], after[1] - before[1]);
    if (d > worst) { worst = d; who = target.type; }
  }
  console.log(`${name.padEnd(15)} ${(who || "-").padEnd(15)} ${worst.toFixed(3)}`);
  if (worst > 1e-9) bad++;
  n++;
}
console.log(bad ? `\n${bad} of ${n} ships teleport when a component dies`
                : `\nnone of ${n} ships move when a component dies`);
if (bad) process.exit(1);
