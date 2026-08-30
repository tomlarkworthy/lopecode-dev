import {importNotebookModule} from "../notebook-import.ts";
import {gunzipSync} from "node:zlib"; import {readFileSync} from "node:fs";
import {Runtime} from "@observablehq/runtime";
(Runtime.prototype as any).fileAttachments ??= () => () => null;
(globalThis as any).window={lopecode:{contentSync:()=>({status:200,mime:"application/gzip",bytes:new Uint8Array()})}};
const e = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const E: any = {};
for (const n of ["Ship","World","geom","DT","pilot","loadShipSpec"]) E[n] = await e.value(n);
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js",{overrides:{md:(s:any)=>String(s)}});
const SHIPS: any = await mis.value("SHIPS");
const y = await importNotebookModule("modules/@tomlarkworthy/corepox-shipyard.js");
const unpack: any = await y.value("unpackCorpus");
const C = unpack(JSON.parse(gunzipSync(readFileSync("data/corepox/corpus.json.gz")).toString()));
const d = await importNotebookModule("modules/@tomlarkworthy/corepox-duel.js",
  {overrides:{...E, SHIPS, md:(s:any)=>String(s), htl:{html:()=>{}}, battlefield:null, backdrop:null,
              invalidation:new Promise(()=>{})}});
const runDuel: any = await d.value("runDuel");
for (const relic of ["LazerHardpoint","BrautenbourgsFirst","WeaponStation","Minidrone"]) {
  const hits = Object.entries(C.ships).filter(([, s]: any) => s.components.some((c: any) => c.type === relic));
  if (!hits.length) { console.log(relic.padEnd(19), "not named by any design"); continue; }
  hits.sort((a: any, b: any) => (C.ratings[b[0]]?.n ?? 0) - (C.ratings[a[0]]?.n ?? 0));
  const [id, s]: any = hits[0];
  const {spec} = E.loadShipSpec(s);
  const r = runDuel({mode:"attrition", limit:30, seed:4, a:{spec:s, control:"auto"},
                     b:{spec:SHIPS.gunBoat}, placement:{separation:20, bearing:25}});
  console.log(`${relic.padEnd(19)} on ${String(hits.length).padStart(3)} designs; ${id.slice(0,8)} ` +
    `${String(s.components.length).padStart(2)}c raw -> ${String(spec.components.length).padStart(2)}c ` +
    `${String(spec.connections.length).padStart(2)}w loaded  vs gunBoat: ${r.winner} @${r.seconds}s`);
}
