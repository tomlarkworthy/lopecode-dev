// The encounter, headless: inventory accounting, the foe draw, spoils, and the run
// of nodes end to end. Also the one cross-module invariant that can silently rot --
// the map's panel PRINTS a reward ("+ 40 scrap") that this module PAYS.
//
//   bun tools/corepox-encounter-check.ts
import {importNotebookModule} from "./notebook-import.ts";
import {gunzipSync} from "node:zlib";
import {readFileSync} from "node:fs";
import {Runtime} from "@observablehq/runtime";
(Runtime.prototype as any).fileAttachments ??= () => () => null;
(globalThis as any).window = {lopecode: {contentSync: () => ({status: 200, mime: "application/gzip", bytes: new Uint8Array()})}};

// COREPOX_ENGINE lets this run against the engine IN THE NOTEBOOK rather than the
// working copy, which matters when another agent is mid-edit on the copy.
const ENGINE = process.env.COREPOX_ENGINE ?? "modules/@tomlarkworthy/corepox-engine.js";
const eng = await importNotebookModule(ENGINE);
const E: any = {};
for (const n of ["Ship","World","geom","DT","pilot","TYPES","TYPE_ALIAS","RELICS","loadShipSpec"]) E[n] = await eng.value(n);
const pick = (names: string[]) => Object.fromEntries(names.filter(n => n in E).map(n => [n, E[n]]));
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js", {overrides: {md: (s: any) => String(s)}});
const SHIPS: any = await mis.value("SHIPS");
const yard = await importNotebookModule("modules/@tomlarkworthy/corepox-shipyard.js", {
  overrides: {...pick(["Ship","World","TYPES","TYPE_ALIAS","RELICS"]), SHIPS,
              md: (s: any) => String(s), htl: {html: () => {}}, battlefield: null, TILE: 1,
              invalidation: new Promise(() => {})}});
const specOfShip: any = await yard.value("specOfShip");
const unpack: any = await yard.value("unpackCorpus");
const CORPUS = unpack(JSON.parse(gunzipSync(readFileSync("data/corepox/corpus.json.gz")).toString()));
const duel = await importNotebookModule("modules/@tomlarkworthy/corepox-duel.js", {overrides: {...pick(["Ship","World","geom","DT","pilot","loadShipSpec","TYPES","TYPE_ALIAS","RELICS"]), SHIPS, md: (s: any) => String(s), htl: {html: () => {}}, battlefield: null, backdrop: null, invalidation: new Promise(() => {})}});
const D: any = {};
for (const n of ["runDuel","duelView","newDuel","stepDuel"]) D[n] = await duel.value(n);
const map = await importNotebookModule("modules/@tomlarkworthy/corepox-map.js", {
  overrides: {md: (s: any) => String(s), invalidation: new Promise(() => {})}});
const NODE_KINDS: any = await map.value("NODE_KINDS");
const genRun: any = await map.value("genRun");

const enc = await importNotebookModule("modules/@tomlarkworthy/corepox-duel-encounter.js", {
  overrides: {...pick(["Ship","World","geom","DT","TYPES","TYPE_ALIAS","RELICS","loadShipSpec"]), ...D, SHIPS, CORPUS, specOfShip, md: (s: any) => String(s),
              shipEditor: null, htl: {html: () => {}}, invalidation: new Promise(() => {})}});
const V: any = {};
for (const n of ["newCampaign","partsOf","refitCheck","applyRefit","ENCOUNTER_RULES",
                 "encounterFoe","encounterSpoils","applySpoils","runEncounter","resolveNode"]) V[n] = await enc.value(n);

let fail = 0;
const ok = (cond: any, label: string, detail = "") => {
  console.log(`${cond ? "  ok  " : "FAIL  "}${label}${detail ? "   " + detail : ""}`);
  if (!cond) fail++;
};

// --- the reward the map prints is the reward this pays ----------------------
console.log("posted reward vs paid reward");
for (const [kind, k] of Object.entries(NODE_KINDS) as any) {
  const m = /\+\s*(\d+)\s*scrap/.exec(k.r1);
  if (!m) continue;
  const paid = V.ENCOUNTER_RULES[kind]?.scrap;
  ok(paid === +m[1], `${kind.padEnd(11)} panel says "${k.r1}"`, `rules pay ${paid}`);
}

// --- inventory accounting ---------------------------------------------------
console.log("\ninventory");
const camp = V.newCampaign({seed: 7, ship: SHIPS.wiredCore, scrap: 214,
                            parts: {Engine: 3, Lazer: 2, Armour: 4}});
const hull = V.partsOf(camp.ship);
console.log("  hull", JSON.stringify(hull), " hold", JSON.stringify(camp.parts));
const add = (spec: any, type: string, pos: number[]) =>
  ({...spec, components: [...spec.components, {type, pos, dir: "up"}]});
let spec = camp.ship;
for (let i = 0; i < 3; i++) spec = add(spec, "Engine", [4 + i, 4]);
ok(V.refitCheck(camp, spec).ok, "3 spare Engines can be fitted");
const over = add(spec, "Engine", [8, 4]);
const c4 = V.refitCheck(camp, over);
ok(!c4.ok && c4.short.Engine === 1, "a 4th Engine is refused", JSON.stringify(c4.short));
const after = V.applyRefit(camp, spec);
ok((after.parts.Engine ?? 0) === 0, "the hold is emptied of Engines by the fit",
   JSON.stringify(after.parts));
const back = V.applyRefit(after, camp.ship);
ok(back.parts.Engine === 3, "removing them returns them to the hold", JSON.stringify(back.parts));

// --- foe draw ---------------------------------------------------------------
console.log("\nfoe draw (deterministic in seed + node id, scaling with depth)");
const run = genRun({seed: 41, galaxy: 2, jumps: 7});
const fights = run.nodes.filter((n: any) => V.ENCOUNTER_RULES[n.kind]?.battle);
for (const n of fights.slice(0, 5)) {
  const f = V.encounterFoe(n, camp);
  const g = V.encounterFoe(n, camp);
  ok(f.id === g.id, `${n.id.padEnd(7)} ${n.kind.padEnd(11)} -> ${f.label} ${String(f.parts).padStart(3)} parts (band ${f.band})`);
}
const byCol = fights.map((n: any) => [n.col, V.encounterFoe(n, camp).parts]);
console.log("  parts by column:", JSON.stringify(byCol));

// --- unknown nodes -----------------------------------------------------------
console.log("\nunknown resolves on arrival, not on the board");
const unk = run.nodes.filter((n: any) => n.kind === "unknown");
for (const n of unk) {
  const a = V.resolveNode(n, camp), b = V.resolveNode(n, camp);
  ok(a.kind !== "unknown" && a.kind === b.kind && a.wasUnknown,
     `${n.id} -> ${a.kind}`, "same on a second call");
}
ok(V.encounterSpoils({kind: "shop"}, "win", camp).scrap === 0 &&
   !Object.keys(V.encounterSpoils({kind: "shop"}, "win", camp).parts).length,
   "a node that posts no reward pays none");

// --- a whole run ------------------------------------------------------------
console.log("\none run, auto pilot, following the first reachable node each jump");
let C = V.newCampaign({seed: 7, ship: SHIPS.gunBoat, scrap: 100,
                       parts: {Engine: 2, Lazer: 2, Armour: 3}});
let at = run.start, jumps = 0;
while (jumps++ < 6 && !C.over) {
  const next = run.edges.filter((e: any) => e.from === at.id)
    .map((e: any) => run.nodes.find((n: any) => n.id === e.to))[0];
  if (!next) break;
  const r = V.runEncounter(next, C, {control: "auto"});
  C = r.campaign;
  console.log(`  ${next.id.padEnd(7)} ${next.kind.padEnd(11)} ${r.verdict.padEnd(5)}` +
    ` foe ${r.foe?.label ?? "-"}  scrap ${String(C.scrap).padStart(4)}` +
    `  hull ${String((C.ship.components ?? []).length).padStart(2)}p` +
    `  hold ${JSON.stringify(C.parts)}`);
  at = next;
}
ok(C.log.length > 0, `the run recorded ${C.log.length} nodes`, C.over ? "ended: " + C.over : "still flying");
ok(C.visited.length === C.log.length, "visited and log agree");

console.log(fail ? `\nFAIL: ${fail} check(s)` : "\nPASS");
process.exit(fail ? 1 : 0);
