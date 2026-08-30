// "Match any two ships in the corpus" is only true for the designs that load.
// Constructs all 2191 packed designs through the same path the arena uses --
// unpackCorpus -> loadShipSpec -> new Ship -- and groups what fails by message.
//
//   bun tools/corepox-corpus-load.ts [--show N]
import { importNotebookModule } from "./notebook-import.ts";
import { gunzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { Runtime } from "@observablehq/runtime";

const i = process.argv.indexOf("--show");
const SHOW = i > 0 ? Number(process.argv[i + 1]) : 0;

(Runtime.prototype as any).fileAttachments ??= () => () => null;
(globalThis as any).window = {lopecode: {contentSync: () => ({status: 200, mime: "application/gzip", bytes: new Uint8Array()})}};

const eng = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const Ship: any = await eng.value("Ship");
const loadShipSpec: any = await eng.value("loadShipSpec");
const yard = await importNotebookModule("modules/@tomlarkworthy/corepox-shipyard.js");
const unpack: any = await yard.value("unpackCorpus");

const {ships} = unpack(JSON.parse(gunzipSync(readFileSync("data/corepox/corpus.json.gz")).toString()));
const ids = Object.keys(ships);

let ok = 0, wires = 0, dropped = 0, islands = 0;
const fails = new Map<string, string[]>();
for (const id of ids) {
  try {
    const {spec, dropped: d} = loadShipSpec(ships[id]);
    wires += spec.connections.length; dropped += d.length;
    const s = new Ship(spec, {team: "a", x: 0, y: 0, a: 0});
    ok++;
    if (s.islands().length > 1) islands++;
  } catch (e: any) {
    const k = String(e.message).replace(/[0-9A-F]{8,}/g, "<id>").replace(/-?\d+/g, "N");
    if (!fails.has(k)) fails.set(k, []);
    fails.get(k)!.push(id);
  }
}

console.log(`designs        ${ids.length}`);
console.log(`constructed    ${ok}  (${(100 * ok / ids.length).toFixed(1)}%)`);
console.log(`failed         ${ids.length - ok}`);
console.log(`wires          ${wires} resolved, ${dropped} dropped (${(100 * dropped / (wires + dropped)).toFixed(1)}%)`);
console.log(`multi-island   ${islands} of the ${ok} that built`);
console.log("\nfailures by message:");
for (const [msg, list] of [...fails].sort((a, b) => b[1].length - a[1].length))
  console.log(`  ${String(list.length).padStart(4)}  ${msg}`);
for (const [, list] of [...fails].sort((a, b) => b[1].length - a[1].length).slice(0, SHOW ? 1 : 0))
  console.log("\n  example ids:", list.slice(0, SHOW).join(" "));
