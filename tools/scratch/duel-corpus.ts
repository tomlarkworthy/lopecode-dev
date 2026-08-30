import {importNotebookModule} from "../notebook-import.ts";
import {gunzipSync} from "node:zlib"; import {readFileSync} from "node:fs";
import {Runtime} from "@observablehq/runtime";
(Runtime.prototype as any).fileAttachments ??= () => () => null;
(globalThis as any).window = {lopecode: {contentSync: () => ({status:200,mime:"application/gzip",bytes:new Uint8Array()})}};
const eng = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const E: any = {};
for (const n of ["Ship","World","geom","DT","pilot","loadShipSpec","TYPES","TYPE_ALIAS"]) E[n] = await eng.value(n);
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js", {overrides:{md:(s:any)=>String(s)}});
const SHIPS: any = await mis.value("SHIPS");
const duel = await importNotebookModule("modules/@tomlarkworthy/corepox-duel.js", {
  overrides: {...E, SHIPS, md:(s:any)=>String(s), htl:{html:()=>{}}, battlefield:null, backdrop:null,
              invalidation: new Promise(()=>{})}});
const runDuel: any = await duel.value("runDuel");
const yard = await importNotebookModule("modules/@tomlarkworthy/corepox-shipyard.js");
const unpack: any = await yard.value("unpackCorpus");
const C = unpack(JSON.parse(gunzipSync(readFileSync("data/corepox/corpus.json.gz")).toString()));
const top = Object.entries(C.ships).map(([id,s]:any)=>({id,s,n:C.ratings[id]?.n??0}))
  .sort((a,b)=>b.n-a.n);
const r1 = runDuel({a:{spec:SHIPS.manualAim,control:"auto"}, b:{spec:SHIPS.gunBoat},
  placement:{separation:20,bearing:25}, seed:4, limit:45});
console.log(`default manualAim vs gunBoat: winner=${r1.winner} t=${r1.seconds}s a=${r1.a.live} b=${r1.b.live}`);
for (const [i,j] of [[0,1],[1,2],[0,4]]) {
  const r = runDuel({a:{spec:top[i].s,control:"auto"}, b:{spec:top[j].s},
    placement:{separation:20,bearing:25}, seed:4, limit:45});
  console.log(`corpus #${i+1} (${top[i].n}m) vs #${j+1} (${top[j].n}m): winner=${r.winner} t=${r.seconds}s`);
}
