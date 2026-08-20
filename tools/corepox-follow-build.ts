// One-off: expand the three Advanced Steering composites through the real
// loadShipSpec and print the engine-format spec, plus the occupied-cell map so a
// Brain can be placed somewhere free. Kept because the numbers it prints are what
// got pasted into corepox-missions.js.
import {importNotebookModule} from "./notebook-import.ts";
const eng = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const load: any = await eng.value("loadShipSpec");
const TYPES: any = await eng.value("TYPES");
const rotTile: any = await eng.value("rotTile");
const DIRS: any = await eng.value("DIRS");
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js");
const SHIPS: any = await mis.value("SHIPS");

for (const key of ["braitenbergRelic", "unfinishedOrbDrone", "orbDroneChassis"]) {
  const c = SHIPS[key];
  const {spec, dropped} = load({name: c.name, components: c.components, connections: c.connections});
  const at = new Map<string, string>();
  let pwr = 0;
  for (const k of spec.components) {
    const T = TYPES[k.type]; pwr += T.pwr;
    const d = typeof k.dir === "number" ? k.dir : (DIRS[k.dir ?? "up"] ?? 0);
    for (const t of T.tiles) { const [rx, ry] = rotTile(t, d);
      at.set((k.pos[0]+rx)+","+(k.pos[1]+ry), k.type); }
  }
  const xs = [...at.keys()].map(s => +s.split(",")[0]), ys = [...at.keys()].map(s => +s.split(",")[1]);
  const x0 = Math.min(...xs)-1, x1 = Math.max(...xs)+1, y0 = Math.min(...ys)-1, y1 = Math.max(...ys)+1;
  console.log("=== " + key + "  " + c.name + "  pwr " + pwr + "  dropped " + dropped.length);
  for (let y = y1; y >= y0; y--) {
    let row = String(y).padStart(3) + " ";
    for (let x = x0; x <= x1; x++) row += (at.get(x+","+y) ?? ".")[0] + " ";
    console.log(row);
  }
  console.log("    " + Array.from({length: x1-x0+1}, (_, i) => String(x0+i).slice(-1)).join(" "));
  console.log(JSON.stringify(spec.connections));
}

// overlap check on the raw composites
const Ship: any = await eng.value("Ship");
for (const key of ["braitenbergRelic", "unfinishedOrbDrone", "orbDroneChassis"]) {
  const c = SHIPS[key];
  const {spec} = load({name: c.name, components: c.components, connections: c.connections});
  const s = new Ship(spec, {team: "a"});
  const o = s.overlaps();
  console.log(key, o ? ("OVERLAP " + o[0].type + "@" + o[0].px + "," + o[0].py + " x " +
    o[1].type + "@" + o[1].px + "," + o[1].py + " at " + o[2]) : "clean");
}
