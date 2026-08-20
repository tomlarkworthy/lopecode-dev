// The port's authored inventories against what UIState.buildOptions would offer
// (tools/corepox-inventory-offered.py). An item whose quantity the initial ship
// already carries is never offered, so an inventory that lists one is a mission
// the port makes easier than the scene does.
import {importNotebookModule} from "./notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js");
const MISSIONS: any[] = await m.value("MISSIONS");
for (const mi of MISSIONS) {
  const loose: Record<string, number> = {};
  for (const c of mi.ship?.components ?? []) {
    if (c.type === "Composite") continue;
    loose[c.type] = (loose[c.type] ?? 0) + 1;
  }
  const inv = (mi.inventory ?? []).map((i: any) =>
    `${i.type}x${i.n}${loose[i.type] ? ` (ship already has ${loose[i.type]})` : ""}`);
  console.log(`${mi.id.padEnd(22)} parts ${(mi.ship?.components ?? []).length.toString().padStart(2)}  ` +
              `inventory ${inv.join(", ") || "-"}`);
}
