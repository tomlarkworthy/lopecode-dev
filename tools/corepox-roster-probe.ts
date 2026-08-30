// The shipyard's "start from" roster: does it actually carry the corpus, and does
// every entry in it load through the editor's own loader without losing parts?
//
// The corpus is a FILE ATTACHMENT, so the module reads window.lopecode at define
// time. Shimming that is what lets the real CORPUS/unpackCorpus chain run here
// instead of a hand-rolled copy of it -- the point is to test the shipped path.
import {readFileSync} from "node:fs";
const GZ = readFileSync("data/corepox/corpus.json.gz");
(globalThis as any).window = {lopecode: {contentSync: (id: string) => {
  if (!id.endsWith("corpus.json.gz")) throw new Error("unexpected attachment " + id);
  return {status: 200, mime: "application/gzip", bytes: GZ};
}}};

// `runtime.fileAttachments` is a lopecode BOOTLOADER extension, absent from the
// stock @observablehq/runtime, so it is shimmed rather than worked around -- that
// keeps the real corpusGz -> unpackCorpus -> CORPUS chain in the test.
import {Runtime} from "@observablehq/runtime";
(Runtime.prototype as any).fileAttachments = (resolve: any) => (name: string) => {
  const {url, mimeType} = resolve(name);
  return {url: async () => url, mimeType,
          stream: async () => (await fetch(url)).body};
};

import {importNotebookModule} from "./notebook-import.ts";
// Cross-module `import` is not resolved headlessly, so the names the roster reads
// are fed in from their real defining modules rather than stubbed.
const eng = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const P: any = await eng.values(["Ship", "loadShipSpec", "TYPES", "TYPE_ALIAS", "RELICS"]);
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js");
const SHIPS = await mis.value("SHIPS");
const yard = await importNotebookModule("modules/@tomlarkworthy/corepox-shipyard.js",
  {overrides: {SHIPS, TYPES: P.TYPES, TYPE_ALIAS: P.TYPE_ALIAS, RELICS: P.RELICS,
               loadShipSpec: P.loadShipSpec}});
const roster: any = await yard.value("shipRoster");

console.log(roster.groups.map((g: any) => g.label).join("\n"));
const corpus = roster.groups[1].items;
console.log("\nfirst 5 corpus labels:");
for (const e of corpus.slice(0, 5)) console.log("  " + e.label);
const hex = corpus.filter((e: any) => /^[0-9a-f]{8}/i.test(e.key)).length;
console.log(`\n${hex} of ${corpus.length} corpus entries have a hex id`);

// Every roster entry must survive the editor's load path with nothing dropped.
// The wire count is the check that matters: an unloaded corpus design addresses
// wires by CELL and Ship.at matches the anchor, so a missing loadShipSpec shows
// up here as endpoints that resolve to nothing.
let bad = 0, wires = 0, resolved = 0, comps = 0;
for (const g of roster.groups) for (const e of g.items) {
  try {
    const s = P.loadShipSpec(structuredClone(e.spec)).spec;
    const ship = new P.Ship(s, {team: "player", x: 0, y: 0, a: 0});
    comps += ship.comps.length;
    wires += ship.conns.length;
    resolved += ship.conns.filter((k: any) =>
      ship.at(k.from[0], k.from[1]) && ship.at(k.to[0], k.to[1])).length;
    if (!ship.comps.length) { bad++; console.log("EMPTY", e.key); }
  } catch (err: any) { bad++; console.log("THREW", e.key, err.message); }
}
const n = roster.groups.reduce((a: number, g: any) => a + g.items.length, 0);
console.log(`\n${n} entries, ${comps} components, ${bad} that do not build`);
console.log(`${resolved} of ${wires} wires resolve to two real endpoints after loading`);

// The counterfactual, so the number above is not just a number: the same designs
// handed straight to `new Ship`, which is what the editor did before 2026-08-21.
let rawWires = 0, rawResolved = 0, rawBad = 0;
for (const e of corpus) {
  try {
    const ship = new P.Ship(e.spec, {team: "player", x: 0, y: 0, a: 0});
    rawWires += ship.conns.length;
    rawResolved += ship.conns.filter((k: any) =>
      ship.at(k.from[0], k.from[1]) && ship.at(k.to[0], k.to[1])).length;
  } catch { rawBad++; }
}
console.log(`without loadShipSpec: ${rawResolved} of ${rawWires} wires, ${rawBad} designs throw`);

// Does the label's part count match what actually lands on the board? The label is
// how a person compares two designs, so a count that disagrees with the build is
// worse than no count.
let off = 0, worst: any = null;
for (const e of corpus) {
  const ship = new P.Ship(P.loadShipSpec(structuredClone(e.spec)).spec,
                          {team: "player", x: 0, y: 0, a: 0});
  const said = Number(/· (\d+)p/.exec(e.label)![1]);
  if (said !== ship.comps.length) {
    off++;
    const d = Math.abs(said - ship.comps.length);
    if (!worst || d > worst.d) worst = {d, key: e.key, said, real: ship.comps.length};
  }
}
console.log(`\nlabel part count disagrees with the built ship on ${off} of ${corpus.length} designs`);
if (worst) console.log(`  worst: ${worst.key.slice(0, 8)} label says ${worst.said}p, builds ${worst.real}`);
