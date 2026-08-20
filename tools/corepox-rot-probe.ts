// Does loadShipSpec's port-cell rotation agree with rotTile? For `up`/`down` the
// question is moot; for `left`/`right` the two are exact inverses of each other,
// so one of them is wrong. Loads the whole corpus under each convention and
// counts dropped wires -- a wire drops when no component owns the endpoint cell.
import {importNotebookModule} from "./notebook-import.ts";
import fs from "node:fs";
const ships: any[] = [];
for (const line of fs.readFileSync("vendor/corepox/firebase/data/ships.json", "utf8").split("\n")) {
  const i = line.indexOf(","); if (i < 0) continue;
  try { const s = JSON.parse(line.slice(i + 1)); if (s?.components) ships.push(s); } catch {}
}
for (const [label, path] of [["baseline", "modules/@tomlarkworthy/corepox-engine.js"],
                             ["find swapped", "tools/scratch/corepox-engine-h2.js"],
                             ["find+splice swapped", "tools/scratch/corepox-engine-h3.js"]] as any) {
  const m = await importNotebookModule(path);
  const Ship: any = await m.value("Ship"), load: any = await m.value("loadShipSpec");
  let wires = 0, drop = 0, islands = 0, overlap = 0, built = 0;
  for (const raw of ships) {
    try {
      const {spec, dropped} = load(raw);
      wires += spec.connections.length; drop += dropped.length;
      const s = new Ship(spec, {team: "a"}); built++;
      if (s.islands().length > 1) islands++;
      if (s.overlaps()) overlap++;
    } catch {}
  }
  console.log(label.padEnd(22), "built", built, " wired", wires, " dropped", drop,
    "(" + (100 * drop / (wires + drop)).toFixed(2) + "%)", " multi-island", islands, " overlapping", overlap);
}
