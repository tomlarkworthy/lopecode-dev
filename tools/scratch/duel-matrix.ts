import {importNotebookModule} from "../notebook-import.ts";
const eng = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const E: any = {}; for (const n of ["Ship","World","geom","DT","pilot","loadShipSpec"]) E[n] = await eng.value(n);
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js", {overrides: {md: (s: any) => String(s)}});
const SHIPS: any = await mis.value("SHIPS");
const duel = await importNotebookModule("modules/@tomlarkworthy/corepox-duel.js", {
  overrides: {...E, SHIPS, md: (s: any) => String(s), htl: {html: () => {}}, battlefield: null, backdrop: null, invalidation: new Promise(() => {})}});
const runDuel: any = await duel.value("runDuel");
const names = Object.keys(SHIPS);
const rows: string[] = [];
for (const a of names) for (const b of names) {
  if (a === b) continue;
  const r = runDuel({mode: "elimination", limit: 45, seed: 4,
    a: {spec: SHIPS[a], control: "auto"}, b: {spec: SHIPS[b]},
    placement: {separation: 22, bearing: 25}});
  if (r.winner !== "draw" && r.seconds > 3)
    rows.push(`${a} vs ${b}: ${r.winner} at ${r.seconds}s  (a ${r.a.live}, b ${r.b.live})`);
}
console.log(rows.slice(0, 14).join("\n") || "every pair drew or ended under 3s");
