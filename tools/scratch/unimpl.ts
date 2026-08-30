import {importNotebookModule} from "../notebook-import.ts";
import {gunzipSync} from "node:zlib"; import {readFileSync} from "node:fs";
import {Runtime} from "@observablehq/runtime";
(Runtime.prototype as any).fileAttachments ??= () => () => null;
(globalThis as any).window = {lopecode:{contentSync:()=>({status:200,mime:"application/gzip",bytes:new Uint8Array()})}};
const eng = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const [TYPES, ALIAS, RELICS]: any = await Promise.all(["TYPES","TYPE_ALIAS","RELICS"].map(n=>eng.value(n)));
const yard = await importNotebookModule("modules/@tomlarkworthy/corepox-shipyard.js");
const unpack: any = await yard.value("unpackCorpus");
const C = unpack(JSON.parse(gunzipSync(readFileSync("data/corepox/corpus.json.gz")).toString()));
const designs = new Map<string, Set<string>>(), instances = new Map<string, number>();
for (const [id, s] of Object.entries(C.ships) as any)
  for (const c of s.components) {
    const t = ALIAS(c.type);
    if (TYPES[t] || RELICS[t]) continue;
    (designs.get(t) ?? designs.set(t, new Set()).get(t)!).add(id);
    instances.set(t, (instances.get(t) ?? 0) + 1);
  }
console.log(`${Object.keys(C.ships).length} designs; ${new Set([...designs.values()].flatMap(s=>[...s])).size} blocked by ${designs.size} unimplemented types`);
[...designs].sort((a,b)=>b[1].size-a[1].size).forEach(([t,d])=>
  console.log(`  ${t.padEnd(24)} ${String(d.size).padStart(4)} designs  ${String(instances.get(t)).padStart(5)} instances`));
console.log(`implemented types: ${Object.keys(TYPES).length}`);
