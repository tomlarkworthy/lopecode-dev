import {importNotebookModule} from "../notebook-import.ts";
import {gunzipSync} from "node:zlib";
import {readFileSync} from "node:fs";
import {Runtime} from "@observablehq/runtime";
(Runtime.prototype as any).fileAttachments ??= () => () => null;
(globalThis as any).window = {lopecode: {contentSync: () => ({status: 200, mime: "application/gzip", bytes: new Uint8Array()})}};
const eng = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const TYPES: any = await eng.value("TYPES"); const ALIAS: any = await eng.value("TYPE_ALIAS");
const yard = await importNotebookModule("modules/@tomlarkworthy/corepox-shipyard.js");
const unpack: any = await yard.value("unpackCorpus");
const C = unpack(JSON.parse(gunzipSync(readFileSync("data/corepox/corpus.json.gz")).toString()));
const rows = Object.entries(C.ships).map(([id, s]: any) => ({
  id, name: s.name || id, parts: s.components.length,
  matches: C.ratings[id]?.n ?? 0, rating: C.ratings[id]?.rating ?? 0,
  blocked: [...new Set(s.components.map((c:any)=>ALIAS(c.type)).filter((t:any)=>!TYPES[t]))],
  guns: s.components.filter((c:any)=>/Lazer|Laser|Explosive|Missile|Turret|Spike/i.test(c.type)).length,
  engines: s.components.filter((c:any)=>/Engine/i.test(c.type)).length,
}));
const ok = rows.filter(r => !r.blocked.length);
console.log(`corpus ${rows.length} designs, ${ok.length} loadable, ${ok.filter(r=>r.matches>0).length} with recorded matches`);
console.log(`armed ${ok.filter(r=>r.guns>0).length}, armed+mobile ${ok.filter(r=>r.guns>0&&r.engines>0).length}`);
const names = new Map<string,number>(); ok.forEach(r=>names.set(r.name,(names.get(r.name)??0)+1));
console.log(`distinct names ${names.size}; commonest:`, [...names].sort((a,b)=>b[1]-a[1]).slice(0,4).map(x=>x.join(" x")).join(", "));
console.log("top by matches:");
ok.sort((a,b)=>b.matches-a.matches).slice(0,10).forEach(r=>
  console.log(`  ${r.id.padEnd(22)} ${String(r.name).padEnd(18)} ${String(r.parts).padStart(3)}p ${String(r.matches).padStart(6)}m r${r.rating.toFixed(0).padStart(5)} guns ${r.guns} eng ${r.engines}`));
