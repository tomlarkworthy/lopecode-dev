// The eight authored ships in Assets/prefabs/ships carry their ShipLoader JSON
// verbatim, wiring included. They are the only specs in the project that were
// hand-built by the author AND survive with their connections, so they are the
// sharpest test of the port tables.
import {importNotebookModule} from "./notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const {Ship, load}: any = {Ship: await m.value("Ship"), load: await m.value("loadShipSpec")};
const fs = await import("node:fs");
const pre = JSON.parse(fs.readFileSync("scratch/corepox-prefabs.json","utf8").replace(/:\s*(-?)Infinity/g, ": $11e400"));
console.log("prefab           comps wires dropped islands  notes");
for (const [file, specs] of Object.entries(pre) as any) {
  for (const raw of specs) {
    const {spec, dropped} = load(raw);
    let s: any, note = "";
    try { s = new Ship(spec, {team: "a"}); } catch (e: any) { note = "LOAD FAIL " + e.message; }
    const isl = s ? s.islands().length : 0;
    const wires = s ? s.conns.map((k: any) =>
      `${k.fromPort}->${k.toPort}`).join(" ") : "";
    console.log(`${file.padEnd(16)} ${String(spec.components.length).padStart(4)} ` +
      `${String(spec.connections.length).padStart(5)} ${String(dropped.length).padStart(7)} ` +
      `${String(isl).padStart(7)}  ${note}`);
    if (raw.name === "DelayBomb" || raw.name === "Strafer")
      console.log("      " + wires);
  }
}
