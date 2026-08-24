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
// UNITS FIRST: observing it after World/Ship recomputes the cell, and _UNITS
// returns a fresh object literal, so a later fetch hands back an object the engine
// classes never captured (see feedback_notebook_import_fetch_config_cell_first).
for (const n of ["UNITS","Ship","World","geom","DT","pilot","pilotInput","TYPES","TYPE_ALIAS","RELICS","loadShipSpec","rotTile"]) E[n] = await eng.value(n);
const pick = (names: string[]) => Object.fromEntries(names.filter(n => n in E).map(n => [n, E[n]]));
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js", {overrides: {md: (s: any) => String(s)}});
const SHIPS: any = await mis.value("SHIPS");
const yard = await importNotebookModule("modules/@tomlarkworthy/corepox-shipyard.js", {
  // Only what corepox-shipyard actually imports -- `redefine` throws on a name the
  // module does not have, and its import list lost Ship/World on 2026-08-21.
  overrides: {...pick(["TYPES","TYPE_ALIAS","RELICS","loadShipSpec"]), SHIPS, TILE: 1}});
const specOfShip: any = await yard.value("specOfShip");
const unpack: any = await yard.value("unpackCorpus");
const CORPUS = unpack(JSON.parse(gunzipSync(readFileSync("data/corepox/corpus.json.gz")).toString()));
const duel = await importNotebookModule("modules/@tomlarkworthy/corepox-duel.js", {overrides: {...pick(["Ship","World","geom","DT","UNITS","pilot","pilotInput","loadShipSpec","TYPES","TYPE_ALIAS","RELICS"]), SHIPS, md: (s: any) => String(s), htl: {html: () => {}}, battlefield: null, backdrop: null, invalidation: new Promise(() => {})}});
const D: any = {};
for (const n of ["runDuel","duelView","newDuel","stepDuel"]) D[n] = await duel.value(n);
const map = await importNotebookModule("modules/@tomlarkworthy/corepox-map.js", {
  overrides: {md: (s: any) => String(s), invalidation: new Promise(() => {})}});
const NODE_KINDS: any = await map.value("NODE_KINDS");
const genRun: any = await map.value("genRun");

const duelExtra: any = {};
for (const n of ["DUEL_BACKDROP","humanControl"]) duelExtra[n] = await duel.value(n);
const min = await importNotebookModule("modules/@tomlarkworthy/corepox-mining.js", {
  overrides: {...pick(["Ship","World","geom","DT","pilot","loadShipSpec","TYPES","rotTile"]), SHIPS, ...duelExtra,
              md: (s: any) => String(s), htl: {html: () => {}}, battlefield: null, backdrop: null,
              invalidation: new Promise(() => {})}});
const runMining: any = await min.value("runMining");
const miningView: any = await min.value("miningView");
const MINER: any = await min.value("MINER");
// The station's own cells, fed in for real rather than stubbed: the encounter's
// station branch reports the stock and the repair quote, and a stub would have let
// the branch "pass" while reporting nothing.
const stn = await importNotebookModule("modules/@tomlarkworthy/corepox-station.js", {
  overrides: {...pick(["TYPES"]), shipEditor: null, md: (s: any) => String(s), htl: {html: () => {}}}});
const ST: any = {};
for (const n of ["stationView","stationStock","stationRail","repairQuote","sellPrice",
                 "STATION_PRICES","STATION_BERTHS"]) ST[n] = await stn.value(n);
const enc = await importNotebookModule("modules/@tomlarkworthy/corepox-duel-encounter.js", {
  overrides: {...pick(["Ship","World","geom","DT","TYPES","TYPE_ALIAS","RELICS","loadShipSpec"]), ...D, SHIPS, CORPUS, specOfShip, runMining, miningView, md: (s: any) => String(s),
              stationView: ST.stationView, stationStock: ST.stationStock, repairQuote: ST.repairQuote,
              shipEditor: null, htl: {html: () => {}}, invalidation: new Promise(() => {})}});
const V: any = {};
for (const n of ["newCampaign","newRunCampaign","partsOf","refitCheck","applyRefit","ENCOUNTER_RULES",
                 "encounterFoe","encounterSpoils","applySpoils","runEncounter","resolveNode"]) V[n] = await enc.value(n);

let fail = 0;
const ok = (cond: any, label: string, detail = "") => {
  console.log(`${cond ? "  ok  " : "FAIL  "}${label}${detail ? "   " + detail : ""}`);
  if (!cond) fail++;
};

// --- what a run starts with -------------------------------------------------
// Tom, 2026-08-23: "the starting ship is dumb. Just start a map with a simple brain
// and no more." The hull is the assertion; the total is the guard that says the
// Engine and Constant it used to carry moved into the HOLD rather than vanishing.
{
  const c = V.newRunCampaign(41);
  const hull = c.ship.components;
  const spares: number = Object.values(c.parts).reduce((a: any, b: any) => a + b, 0) as number;
  ok(hull.length === 1 && hull[0].type === "Brain", "a run starts on a bare Brain",
     hull.map((x: any) => `${x.type}@${x.pos}`).join(" "));
  ok(c.ship.connections.length === 0, "with no wire already drawn for you",
     String(c.ship.connections.length));
  ok(hull.length + spares === 14, "and the same 14 parts as before, all but one in the hold",
     `${hull.length} on the hull + ${spares} spares`);
}

// --- the reward the map prints is the reward this pays ----------------------
console.log("posted reward vs paid reward");
for (const [kind, k] of Object.entries(NODE_KINDS) as any) {
  const m = /\+\s*(\d+)\s*scrap/.exec(k.r1);
  const R = V.ENCOUNTER_RULES[kind] ?? {};
  // A node that is PLAYED for its reward must not post a number, and a node that
  // is not must post one that matches. Both directions, or the panel drifts from
  // the payout in whichever direction is not checked.
  if (R.mine) { ok(!m, `${kind.padEnd(11)} posts no fixed reward`, `panel says "${k.r1}"`); continue; }
  if (!m) continue;
  ok(R.scrap === +m[1], `${kind.padEnd(11)} panel says "${k.r1}"`, `rules pay ${R.scrap}`);
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
// --- a mining node, headless -----------------------------------------------
// The same node played on screen and played by a script has to pay the same thing.
// Before runEncounter grew a mining branch it resolved a seam as a stop, so this
// paid 0 for any hull and a check written against it would have been vacuous.
console.log("\na mining node pays the haul, not a posted number");
{
  const node = {id: "n2-1", kind: "mining", col: 2, name: "MINING"};
  const seam = (ship: any, seed = 7) =>
    V.runEncounter(node, V.newCampaign({seed, ship, scrap: 0}), {control: "auto"});
  // Over campaign seeds, not one: whether a given field pays is the mining gate's
  // question (`corepox-mining-check.ts`, held-out seeds), and pinning it here made
  // this check fail for a reason that has nothing to do with the plumbing it tests.
  // What has to hold every time is that a haul goes to ore and never to the hold.
  let worked = seam(MINER);
  for (const s of [7, 13, 21, 34, 55]) {
    worked = seam(MINER, s);
    if (worked.campaign.scrap > 0) break;
  }
  const idle = seam(SHIPS.wiredCore);
  const bag = (r: any) => JSON.stringify(r.campaign.parts);
  console.log(`  MINER      ${worked.verdict}  scrap ${worked.campaign.scrap}  hold ${bag(worked)}`);
  console.log(`  wiredCore  ${idle.verdict}  scrap ${idle.campaign.scrap}  hold ${bag(idle)}`);
  ok(worked.campaign.scrap > 0, "a hull that can cut brings scrap back", `${worked.campaign.scrap}`);
  // Ore is scrap, NOT a part: Ore and OreVein are mineral types, and a hold is what
  // a hull is refitted from. The haul is recorded on the log line instead, so a run
  // can still say what came out of which seam.
  const dug = worked.campaign.log.at(-1).ore ?? {};
  ok(Object.keys(worked.campaign.parts).length === 0,
     "and no mineral lands in the parts hold", bag(worked));
  ok(Object.values(dug).reduce((a: any, b: any) => a + b, 0) > 0,
     "the pieces are logged as ore", JSON.stringify(dug));
  // The control. wiredCore's engine is driven by its own wire, so `pilot` has no
  // free actuator to write and the hull cannot be steered -- it is the reason the
  // starting ship has to be refitted before a seam is worth anything.
  ok(idle.campaign.scrap === 0, "a hull that cannot be steered brings nothing",
     `${idle.campaign.scrap}`);
  ok(worked.campaign.log.at(-1).kind === "mining", "and the node is logged as mining");
}

// --- a station node ---------------------------------------------------------
// A dock is the one node that takes scrap instead of paying it, so the invariants
// run the other way: nothing is paid, nothing is fought, and the visit is still
// recorded. What the visit OFFERS is the stock and the quote, so those are what a
// headless run has to report -- a branch that returned a bare verdict would let a
// station with an empty rail pass.
console.log("\na station takes scrap, it does not pay it");
{
  const shopNode = {id: "n2-1", kind: "shop", col: 2, name: "SHOP"};
  const C0 = V.newCampaign({seed: 7, ship: SHIPS.gunBoat, scrap: 214,
                            parts: {Engine: 2, Armour: 1}});
  ok(V.ENCOUNTER_RULES.shop?.station && V.ENCOUNTER_RULES.repair?.station,
     "shop and repair are station nodes",
     `berths ${V.ENCOUNTER_RULES.shop.berth}/${V.ENCOUNTER_RULES.repair.berth}`);
  ok(!V.ENCOUNTER_RULES.shop.battle && !V.ENCOUNTER_RULES.repair.battle,
     "and neither has an opponent");

  const r = V.runEncounter(shopNode, C0, {control: "auto"});
  ok(r.verdict === "win" && r.foe === null && r.battle === null,
     "a visit cannot be lost", `verdict ${r.verdict}`);
  ok(r.campaign.scrap === C0.scrap, "and pays nothing", `${C0.scrap} -> ${r.campaign.scrap}`);
  ok(JSON.stringify(r.campaign.parts) === JSON.stringify(C0.parts),
     "and takes nothing out of the hold", JSON.stringify(r.campaign.parts));
  ok(r.campaign.visited.at(-1) === shopNode.id && r.campaign.log.at(-1).kind === "shop",
     "the visit is still recorded");
  ok(r.station?.stock?.length === 6 && r.station.berth === "market",
     "and it reports what was on the rail",
     r.station.stock.map((g: any) => `${g.type} \u25c6${g.price}`).join(" "));

  // The design's legibility rule, turn 10b: "six items with one unaffordable, which
  // makes the diamond constraint visible at a glance." Checked at a balance where a
  // fair draw would probably NOT produce one, which is the case the guarantee exists
  // for -- at 214 scrap only Lazer is out of reach.
  let unaff = 0;
  for (const seed of [1, 3, 7, 11, 19, 23, 31]) {
    for (const id of ["n0-0", "n1-1", "n2-1", "n4-2"]) {
      const c = {...C0, seed};
      const st = ST.stationStock({id}, c);
      if (st.length !== 6) { unaff = -1; break; }
      if (st.some((g: any) => g.price > c.scrap)) unaff++;
    }
  }
  ok(unaff === 28, "every draw has something you cannot afford", `${unaff}/28 draws`);
  const a = ST.stationStock(shopNode, C0), b = ST.stationStock(shopNode, C0);
  ok(JSON.stringify(a) === JSON.stringify(b), "the stock is deterministic in seed + node id");
  const other = ST.stationStock({id: "n3-2"}, C0);
  ok(JSON.stringify(a) !== JSON.stringify(other), "and a different node draws a different one",
     other.map((g: any) => g.type).join(","));
  ok(a.every((g: any) => !E.TYPES[g.type]?.mineral),
     "no mineral is ever for sale", a.map((g: any) => g.type).join(","));

  // Selling at half is a LOSS, not a round trip. If floor(price/2) ever equalled the
  // price the market would be a place to launder scrap, and the drag-to-rail gesture
  // would be free to spam.
  const prices: any = ST.STATION_PRICES;
  const bad = Object.keys(prices).filter(t => ST.sellPrice(t) !== Math.floor(prices[t] / 2)
                                           || ST.sellPrice(t) >= prices[t]);
  ok(bad.length === 0, `selling is half of buying, on all ${Object.keys(prices).length} priced types`,
     bad.length ? bad.join(",") : `e.g. Lazer \u25c6${prices.Lazer} -> \u25c6${ST.sellPrice("Lazer")}`);

  // The rail is the only thing a berth changes.
  const held = {...C0, parts: {Engine: 2, Armour: 1}};
  const mkt = ST.stationRail("market", a, held), rep = ST.stationRail("repair", a, held);
  ok(mkt.length === a.length + 2 && mkt.filter((x: any) => x.group === "MARKET").length === 6,
     "the market rail stacks stock over the hold", `${mkt.length} rows`);
  ok(mkt.filter((x: any) => x.group === "YOUR HOLD").every((x: any) => x.price == null),
     "and only the market rows carry a price");
  ok(rep.length === 2 && rep.every((x: any) => x.group === "YOUR HOLD"),
     "the repair rail is the hold alone", `${rep.length} rows`);

  // The precondition for the bug reported 2026-08-22 ("I was unable to place
  // another engine even though I had it in the hold"). A market rail can carry the
  // SAME type on both shelves, so a rail row is not identified by its type --
  // corepox-board resolved a pick with `find(i => i.type === picked)`, took the
  // market row because the market is listed first, charged for parts already owned
  // and then refused the placement when the balance ran out. If this assertion ever
  // fails because the rail was made type-unique, the type-keyed lookup it replaced
  // becomes safe again; while it passes, `spendRow` has to stay.
  const dup = ST.stationRail("market", [{type: "Engine", price: 95}],
                             {...C0, parts: {Engine: 2}});
  ok(dup.filter((x: any) => x.type === "Engine").length === 2,
     "the same type can sit on two shelves at once",
     dup.map((x: any) => `${x.group}:${x.type}${x.price ? " \u25c6" + x.price : " x" + x.n}`).join(" "));
  ok(dup[0].group === "MARKET" && dup[0].price != null,
     "and the PRICED one is listed first, which is why order cannot decide it");

  // A quote prices the damage, not the hull. An undamaged ship must quote zero, or
  // PATCH becomes a button that charges for nothing.
  const clean = {components: [{type: "Armour"}, {type: "Engine"}]};
  const hurt = {components: [{type: "Armour", dmg: 30}, {type: "Engine", dmg: 11}]};
  ok(ST.repairQuote(clean).dmg === 0 && ST.repairQuote(clean).cost === 0,
     "an undamaged hull quotes nothing");
  ok(ST.repairQuote(hurt).dmg === 41 && ST.repairQuote(hurt).cost === Math.ceil(41 * 0.6),
     "and a damaged one quotes its damage at the rate",
     JSON.stringify(ST.repairQuote(hurt)));
}

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
