import {readFileSync} from "node:fs";
const GZ = readFileSync("data/corepox/corpus.json.gz");
(globalThis as any).window = {lopecode: {contentSync: () => ({status:200, mime:"application/gzip", bytes: GZ})}};
import {Runtime} from "@observablehq/runtime";
(Runtime.prototype as any).fileAttachments = (r: any) => (n: string) => {
  const {url, mimeType} = r(n);
  return {url: async () => url, mimeType, stream: async () => (await fetch(url)).body};
};
import {importNotebookModule} from "../notebook-import.ts";
const eng = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const P: any = await eng.values(["loadShipSpec","TYPES","TYPE_ALIAS","RELICS"]);
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js");
const yard = await importNotebookModule("modules/@tomlarkworthy/corepox-shipyard.js",
  {overrides: {SHIPS: await mis.value("SHIPS"), TYPES: P.TYPES, TYPE_ALIAS: P.TYPE_ALIAS, RELICS: P.RELICS}});
const CORPUS: any = await yard.value("CORPUS");
const ships = Object.values(CORPUS.ships);
for (let pass = 0; pass < 3; pass++) {
  const t = performance.now();
  let n = 0;
  for (const s of ships) n += P.loadShipSpec(s).spec.components.length;
  console.log(`pass ${pass}: ${(performance.now() - t).toFixed(0)}ms for ${ships.length} designs, ${n} components`);
}
