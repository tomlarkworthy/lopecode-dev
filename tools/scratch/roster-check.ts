import {importNotebookModule} from "../notebook-import.ts";
import {gunzipSync} from "node:zlib"; import {readFileSync} from "node:fs";
import {Runtime} from "@observablehq/runtime";
(Runtime.prototype as any).fileAttachments ??= () => () => null;
(globalThis as any).window = {lopecode: {contentSync: () => ({status: 200, mime: "application/gzip", bytes: new Uint8Array()})}};
const eng = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const [TYPES, ALIAS, Ship, World, loadShipSpec, RELICS] = await Promise.all(
  ["TYPES","TYPE_ALIAS","Ship","World","loadShipSpec","RELICS"].map(n => eng.value(n)) as any);
const yard = await importNotebookModule("modules/@tomlarkworthy/corepox-shipyard.js");
const unpack: any = await yard.value("unpackCorpus");
const CORPUS = unpack(JSON.parse(gunzipSync(readFileSync("data/corepox/corpus.json.gz")).toString()));
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js", {overrides: {md: (s:any)=>String(s)}});
const SHIPS: any = await mis.value("SHIPS");

// the roster cell, lifted out of the module source and run against the same inputs
const src = readFileSync("modules/@tomlarkworthy/corepox-duel.js","utf8");
const body = src.slice(src.indexOf("const _duelRoster ="), src.indexOf("const _viewof_duelDemo"));
const roster = eval(body.replace("const _duelRoster =", "(") .replace(/\)\};\s*$/, ")});"))(SHIPS,CORPUS,TYPES,ALIAS,RELICS);
console.log(`groups: ${roster.groups.map((g:any)=>g.label).join(" | ")}`);
console.log(`byKey ${roster.byKey.size} keys, collisions ${roster.groups.reduce((n:number,g:any)=>n+g.items.length,0) - roster.byKey.size}`);
roster.groups[1].items.slice(0,4).forEach((e:any)=>console.log("  " + e.label));
console.log("  named (not Brain):");
roster.groups[1].items.filter((e:any)=>e.label.split(" · ").length > 3).slice(0,4)
  .forEach((e:any)=>console.log("    " + e.label));
// every corpus entry must actually build
let built = 0, failed: string[] = [];
for (const e of roster.groups[1].items) {
  try { new Ship(loadShipSpec(e.spec).spec, 0, 0, 0); built++; }
  catch (err: any) { if (failed.length < 3) failed.push(`${e.key}: ${err.message}`); }
}
console.log(`corpus entries that construct: ${built}/${roster.groups[1].items.length}`, failed);
