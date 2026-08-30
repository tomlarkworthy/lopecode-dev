import {importNotebookModule} from "../notebook-import.ts";
const eng = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const Ship: any = await eng.value("Ship");
const World: any = await eng.value("World");
const load: any = await eng.value("loadShipSpec");
const DT: number = await eng.value("DT");
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js", {overrides: {md: (s: any) => String(s)}});
const SHIPS: any = await mis.value("SHIPS");

for (const name of ["gunBoat", "manualAim", "laserpost", "shooter"]) {
  const raw = SHIPS[name];
  const {spec, dropped} = load(raw);
  console.log(`\n${name}: raw conns ${(raw.connections ?? []).length}, resolved ${(spec.connections ?? []).length}, dropped ${dropped.length}`);
  if (dropped.length) console.log("  dropped:", JSON.stringify(dropped));
  for (const mk of [["raw", raw], ["loaded", spec]] as any[]) {
    const s = new Ship(mk[1], {team: "a", x: 0, y: 0, a: 0});
    const target = new Ship(SHIPS.lonelyCore, {team: "b", x: 0, y: -14, a: 0});
    const w = new World([s, target]);
    let beams = 0;
    for (let k = 0; k < 6 / DT; k++) { w.step(); beams += w.particles.filter((p: any) => p.kind === "beam").length; }
    const t = s.comps.find((c: any) => c.type === "LaserTurret2" || c.type === "Lazer");
    console.log(`  ${mk[0].padEnd(7)} beam-ticks ${beams}  gun.in=${JSON.stringify(t?.in)} turret=${t?.turret?.toFixed?.(0)}`);
  }
}
