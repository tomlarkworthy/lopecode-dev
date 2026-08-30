import {importNotebookModule} from "../notebook-import.ts";
import {gunzipSync} from "node:zlib"; import {readFileSync} from "node:fs";
import {Runtime} from "@observablehq/runtime";
(Runtime.prototype as any).fileAttachments ??= () => () => null;
(globalThis as any).window={lopecode:{contentSync:()=>({status:200,mime:"application/gzip",bytes:new Uint8Array()})}};
const y = await importNotebookModule("modules/@tomlarkworthy/corepox-shipyard.js");
const unpack: any = await y.value("unpackCorpus");
const C = unpack(JSON.parse(gunzipSync(readFileSync("data/corepox/corpus.json.gz")).toString()));
const ids = Object.keys(C.ships);
console.log(`${ids.length} ids, e.g. ${ids[0]} (len ${ids[0].length})`);
for (const n of [6, 7, 8, 10])
  console.log(`  ${n}-char prefix: ${new Set(ids.map(i => i.slice(0, n))).size} distinct -> ${ids.length - new Set(ids.map(i => i.slice(0, n))).size} collisions`);
const shape = new Map<string, number>();
for (const i of ids) {
  const k = /^[0-9A-F]{32}$/.test(i) ? "32-hex CID" : /^\d+$/.test(i) ? `integer (len ${i.length})` : `other (len ${i.length})`;
  shape.set(k, (shape.get(k) ?? 0) + 1);
}
[...shape].sort((a,b)=>b[1]-a[1]).forEach(([k,n])=>console.log(`  ${k}: ${n}`));
console.log("integer-id samples:", ids.filter(i=>/^\d+$/.test(i)).slice(0,8).join(","));
const names = ids.map(i => C.ships[i].name).filter(n => n && n !== "Brain");
console.log(`designs with a name other than "Brain": ${names.length}`);
