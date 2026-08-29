import {importNotebookModule} from "../notebook-import.ts";
const eng = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const Ship: any = await eng.value("Ship"), loadShipSpec: any = await eng.value("loadShipSpec");
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js", {overrides: {md: (s: any) => String(s)}});
const min = await importNotebookModule("modules/@tomlarkworthy/corepox-mining.js", {
  overrides: {TYPES: await eng.value("TYPES"), geom: await eng.value("geom"), DT: await eng.value("DT"),
    rotTile: await eng.value("rotTile"), Ship, World: await eng.value("World"),
    pilot: await eng.value("pilot"), loadShipSpec, SHIPS: await mis.value("SHIPS"),
    md: (s: any) => String(s), htl: {html: () => {}}, battlefield: null, backdrop: null,
    DUEL_BACKDROP: {}, humanControl: () => {}, invalidation: new Promise(() => {})}});
const MINER: any = await min.value("MINER");
const s = new Ship(loadShipSpec(MINER).spec, {team: "p", x: 0, y: 0, a: 0});
for (const c of s.live)
  console.log(c.type.padEnd(10), "px,py", c.px, c.py, "dir", c.dir, "tiles", JSON.stringify(c.tiles));
console.log("islands:", s.islands().length, "sizes", s.islands().map((i: any) => i.length));
