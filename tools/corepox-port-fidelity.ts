// Blast radius of trusting a declared port name: how many connections change,
// across the whole corpus and every authored mission ship.
import {importNotebookModule} from "./notebook-import.ts";
const eng = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const load: any = await eng.value("loadShipSpec");
const PORTS: any = await eng.value("PORTS");
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js", {overrides: {md: (s: any) => String(s)}});
const SHIPS: any = await mis.value("SHIPS");
const fs = await import("node:fs");

// the old behaviour, reproduced: always re-derive from the cell
const oldPorts = (raw: any) => (load(raw).spec.connections ?? []);
const specs: [string, any][] = Object.entries(SHIPS).map(([k, v]) => ["mission:" + k, v]);
for (const line of fs.readFileSync("vendor/corepox/firebase/data/ships.json", "utf8").split("\n")) {
  const i = line.indexOf(","); if (i < 0) continue;
  try { const s = JSON.parse(line.slice(i + 1)); if (s?.components) specs.push(["corpus", s]); } catch {}
}
let declared = 0, total = 0, changed: string[] = [];
for (const [tag, raw] of specs) {
  const {spec, dropped} = load(raw);
  const src = (raw.connections ?? []).filter((k: any) => !dropped.includes(k));
  src.forEach((k: any, i: number) => {   // load() preserves order minus drops
    total++;
    if (!k.fromPort && !k.toPort) return;
    declared++;
    const c = spec.connections[i];
    if ((k.toPort && c.toPort !== k.toPort) || (k.fromPort && c.fromPort !== k.fromPort))
      changed.push(`${tag} ${k.fromPort}->${k.toPort} became ${c.fromPort}->${c.toPort}`);
  });
}
console.log(`${specs.length} specs, ${total} connections, ${declared} of them declare a port name`);
console.log(`declared ports still rewritten after the fix: ${changed.length}`);
changed.slice(0, 10).forEach(c => console.log("  " + c));
