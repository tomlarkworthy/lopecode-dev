// Every recovered ship against every other, through the lab's own runMatch.
//
// Written because the arena's default pair drew, and picking a different one by
// eye would have been a guess. It also answers a question the campaign cannot:
// which of these hulls can kill anything at all. A draw is the honest verdict for
// two ships with no weapon between them, and most of this table is draws.
//
//   bun tools/corepox-arena-matrix.ts [gap]
import {importNotebookModule} from "./notebook-import.ts";

const gap = Number(process.argv[2] ?? 14);
const e = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const [Ship, World, DT] = await Promise.all([e.value("Ship"), e.value("World"), e.value("DT")]);
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js");
const SHIPS: any = await mis.value("SHIPS");
// runMatch is the lab's, not a copy: the arena and this table have to agree about
// what a win is or the table is describing a different game.
const lab = await importNotebookModule("modules/@tomlarkworthy/corepox-lab.js",
                                       {overrides: {Ship, World, DT}});
const runMatch: any = await lab.value("runMatch");

const names = Object.keys(SHIPS);
const wins: Record<string, number> = {}, losses: Record<string, number> = {};
const rows: string[] = [];
for (const a of names) {
  const cells = names.map(b => {
    if (a === b) return " ·";
    const r = runMatch(SHIPS[a], SHIPS[b], {gap, limit: 60});
    if (r.verdict === "A") { wins[a] = (wins[a] ?? 0) + 1; losses[b] = (losses[b] ?? 0) + 1; return " W"; }
    if (r.verdict === "B") { wins[b] = (wins[b] ?? 0) + 1; losses[a] = (losses[a] ?? 0) + 1; return " L"; }
    if (r.verdict === "mutual") return " X";
    return " -";
  });
  rows.push(`${a.padEnd(15)}${cells.join("")}`);
}
console.log(`gap ${gap} tiles, A at y=-${gap / 2} facing 0, B at y=+${gap / 2} facing 180, 60s limit`);
console.log(`W = the COLUMN ship went out first, L = the row ship did, X = both, - = draw`);
console.log(`A W is not proof the winner did anything: at 14 tiles nothing lands a shot in`);
console.log(`60s, and the only ships that die are the ones that detonate themselves. Read a`);
console.log(`row against the unarmed cores (lonelyCore, liteCore) to tell the two apart.\n`);
console.log(" ".repeat(15) + names.map(n => " " + n[0].toUpperCase()).join(""));
rows.forEach(r => console.log(r));
console.log("\n" + names.map(n => `${n} ${wins[n] ?? 0}W/${losses[n] ?? 0}L`).join("  "));
const killers = names.filter(n => (wins[n] ?? 0) > 0);
console.log(`\n${killers.length} of ${names.length} ships resolve a match at all: ${killers.join(", ")}`);
