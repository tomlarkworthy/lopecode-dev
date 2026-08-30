// Canonical test ships, chosen by what they DO, from designs players actually flew.
//
// The set they replace was seven hand-authored archetypes (wall, braitenberg,
// seeker, proportional, rammer, turtle, sniper) written when every component was
// assumed 1x1. Under the real footprints and the joint rule, five of the seven are
// several bodies -- sniper is 6 islands -- so every balance number measured over
// them was measuring debris. Tom, 2026-08-20: "we have much better ships in the
// corpus now anyway."
//
// Two rules follow from that failure:
//   1. a candidate must be a LEGAL ship by the engine's own checks, or it is not a
//      test of anything. 2191 designs -> 828 survive.
//   2. it must be selected on MEASURED behaviour against a fixed target, not on its
//      name or its parts list. A ship called "sniper" that never fires is a fixture
//      that lies.
//
//   bun tools/corepox-canon.ts            re-select and write data/corepox/canon.json
//   bun tools/corepox-canon.ts --check    verify the saved set is still legal + on-behaviour
//
// Other tools import CANON from here rather than re-deriving it.
import {importNotebookModule} from "./notebook-import.ts";
import {gunzipSync} from "node:zlib";
import {readFileSync, writeFileSync, existsSync} from "node:fs";
import {Runtime} from "@observablehq/runtime";

(Runtime.prototype as any).fileAttachments ??= () => () => null;
(globalThis as any).window = {lopecode: {contentSync: () => ({status: 200, mime: "application/gzip", bytes: new Uint8Array()})}};

const eng = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const {Ship, World, loadShipSpec, TYPES, TYPE_ALIAS, DT}: any =
  await eng.values(["Ship", "World", "loadShipSpec", "TYPES", "TYPE_ALIAS", "DT"]);
const yard = await importNotebookModule("modules/@tomlarkworthy/corepox-shipyard.js");
const unpack: any = await yard.value("unpackCorpus");

export const CORPUS = unpack(JSON.parse(gunzipSync(readFileSync("data/corepox/corpus.json.gz")).toString()));
const CANON_PATH = "data/corepox/canon.json";

// The set itself, ready to hand to `new Ship`. Import this rather than ROSTER:
//   import {CANON} from "./corepox-canon.ts";
//   for (const {label, spec} of CANON) ...
// `name` is the label, not the corpus's, because every corpus design is called
// "Brain" and a tournament table of fourteen rows called Brain is unreadable.
export const CANON: any[] = !existsSync(CANON_PATH) ? [] :
  JSON.parse(readFileSync(CANON_PATH, "utf8")).ships.map((e: any) => ({
    ...e, spec: {...loadShipSpec(CORPUS.ships[e.id]).spec, name: e.label}
  }));

// A punch bag, not a fighter: a Brain inside 5x5 of Armour, stationary, no guns, so
// every number below is the CANDIDATE's doing. It is a fixture, so it is checked.
export const DUMMY = {name: "bag", connections: [], components: [
  ...[-2, -1, 0, 1, 2].flatMap(x => [-2, -1, 0, 1, 2].map(y =>
    ({type: x === 0 && y === 0 ? "Brain" : "Armour", pos: [x, y], dir: "up"})))]};
{
  const d = new Ship(DUMMY, {team: "b"});
  if (d.overlaps() || d.islands().length !== 1)
    throw new Error("corepox-canon: the target is not a legal ship, which is the mistake this file exists to stop");
}

const RANGE = 20, SECS = 30;

// What a ship does in 30s against a stationary bag 20 tiles away.
export function fingerprint(spec: any) {
  const s = new Ship(spec, {team: "a", x: 0, y: 0, a: 0});
  const bag = new Ship(DUMMY, {team: "b", x: 0, y: RANGE, a: 180});
  const hp0 = bag.live.reduce((n: number, c: any) => n + c.hp, 0);
  const w = new World([s, bag]);
  const parts0 = s.live.length;
  let path = 0, turned = 0, near = RANGE, px = s.x, py = s.y, pa = s.a, beams = 0;
  for (let i = 0; i < SECS / DT; i++) {
    w.step();
    const mine = w.ships.filter((k: any) => k.team === "a");
    if (!mine.length) break;
    const lead = mine.reduce((a: any, b: any) => (b.live.length > a.live.length ? b : a));
    path += Math.hypot(lead.x - px, lead.y - py);
    turned += Math.abs(((lead.a - pa + 540) % 360) - 180);
    px = lead.x; py = lead.y; pa = lead.a;
    for (const k of mine) near = Math.min(near, Math.hypot(k.x - bag.x, k.y - bag.y));
    beams += w.particles.filter((p: any) => p.kind === "beam" && p.ship?.team === "a").length;
  }
  const mine = w.ships.filter((k: any) => k.team === "a");
  const hp1 = bag.live.reduce((n: number, c: any) => n + c.hp, 0);
  return {
    dmg: hp0 - hp1, closed: +(RANGE - near).toFixed(2), path: +path.toFixed(2),
    turned: Math.round(turned), beamTicks: beams, bodies: mine.length,
    parts: parts0, lost: parts0 - mine.reduce((n: number, k: any) => n + k.live.length, 0)
  };
}

// Behaviour buckets. Deliberately coarse -- the point is that the set spans
// strategies, not that every ship is filed perfectly. islands0 is the island count
// at t=0, which is what separates a ship BUILT to release a drone from one that
// merely comes apart when shot: 912 of 1714 end a 30s fight in more than one body,
// and lumping those together would have made the carrier bucket meaningless.
export const bucketOf = (f: any, islands0: number) =>
  islands0 > 1                        ? "carrier"     // arrives in pieces, on purpose
  : f.bodies > 1                      ? "shedder"     // one body at t=0, several by the end
  : f.path < 2                        ? "turtle"      // does not leave the spot
  : f.dmg > 0 && f.closed > 12        ? "brawler"     // gets on top of it and hurts it
  : f.dmg > 0                         ? "gunship"     // hurts it from where it is
  : f.closed > 12                     ? "rammer"      // arrives with nothing to shoot
  : "drifter";                                        // moves, achieves nothing

const legal = (raw: any) => {
  if (raw.components.some((c: any) => !TYPES[TYPE_ALIAS(c.type)])) return null;
  let spec: any, dropped: any[];
  try { ({spec, dropped} = loadShipSpec(raw)); } catch { return null; }
  let s: any; try { s = new Ship(spec, {team: "a"}); } catch { return null; }
  if (s.overlaps() || dropped.length) return null;
  if (!s.live.some((c: any) => c.type === "Brain")) return null;
  return {spec, ship: s, islands: s.islands().length};
};

// Selecting is what this file DOES; importing it must only get you CANON.
if (import.meta.main) {
  if (process.argv.includes("--check")) {
    if (!existsSync(CANON_PATH)) { console.log("no " + CANON_PATH + " -- run without --check first"); process.exit(1); }
    const saved = JSON.parse(readFileSync(CANON_PATH, "utf8"));
    let fail = 0;
    console.log(`${CANON_PATH}, selected ${saved.selected}\n`);
    for (const e of saved.ships) {
      const L = legal(CORPUS.ships[e.id]);
      const f = L ? fingerprint(L.spec) : null;
      const b = f ? bucketOf(f, L!.islands) : "-";
      const ok = !!L && b === e.bucket;
      if (!ok) fail++;
      console.log(`${ok ? "ok  " : "FAIL"} ${e.label.padEnd(14)} ` +
        (L ? `${b.padEnd(8)} dmg ${String(f!.dmg).padStart(4)} closed ${String(f!.closed).padStart(6)} ` +
             `bodies ${f!.bodies}` : "NO LONGER LEGAL"));
    }
    console.log(`\n${saved.ships.length - fail}/${saved.ships.length} still legal and on-behaviour`);
    process.exit(fail ? 1 : 0);
  }

  // --- selection ---------------------------------------------------------------
  const cands: any[] = [];
  const seenShape = new Set<string>();
  for (const [id, raw] of Object.entries<any>(CORPUS.ships)) {
    const L = legal(raw); if (!L) continue;
    // the corpus holds many byte-identical resaves; two of those are one tester
    const shape = JSON.stringify(L.spec.components.map((c: any) => [c.type, c.pos, c.dir, c.param]).sort());
    if (seenShape.has(shape)) continue;
    seenShape.add(shape);
    const r = CORPUS.ratings[id] ?? {};
    cands.push({id, name: raw.name || id, spec: L.spec, islands: L.islands,
                parts: L.ship.live.length, rating: r.rating ?? 0, matches: r.n ?? 0});
  }
  console.log(`${cands.length} legal designs of ${Object.keys(CORPUS.ships).length}`);
  // Flown ships first: a design nobody ever fought is not evidence of a strategy.
  cands.sort((a, b) => b.matches - a.matches || b.rating - a.rating);

  const byBucket = new Map<string, any[]>();
  let done = 0;
  for (const c of cands) {
    if (++done % 100 === 0) process.stdout.write(`  ${done}/${cands.length}\r`);
    let f: any; try { f = fingerprint(c.spec); } catch { continue; }
    const b = bucketOf(f, c.islands);
    if (!byBucket.has(b)) byBucket.set(b, []);
    byBucket.get(b)!.push({...c, f, bucket: b});
  }
  console.log(`${done} fingerprinted            `);

  const PER = Number(process.env.PER ?? 2);
  const picked: any[] = [];
  for (const [b, list] of [...byBucket].sort()) {
    // spread the picks over ship SIZE as well, so a bucket is not two of the same hull
    list.sort((x, y) => y.matches - x.matches || y.rating - x.rating);
    const takes: any[] = [];
    for (const c of list) {
      if (takes.length >= PER) break;
      if (takes.some(t => Math.abs(t.parts - c.parts) < 3)) continue;
      takes.push(c);
    }
    while (takes.length < Math.min(PER, list.length)) takes.push(list[takes.length]);
    console.log(`\n${b}  (${list.length} designs)`);
    takes.forEach((c, i) => c.label = `${b}-${c.parts}p`);
    for (const c of takes) {
      console.log(`  ${c.label.padEnd(14)} ${String(c.parts).padStart(3)}p  ` +
        `${String(c.matches).padStart(4)} matches  rating ${c.rating.toFixed(1).padStart(7)}  ` +
        `dmg ${String(c.f.dmg).padStart(4)} closed ${String(c.f.closed).padStart(6)} ` +
        `path ${String(c.f.path).padStart(7)} bodies ${c.f.bodies} lost ${c.f.lost}`);
      picked.push(c);
    }
  }

  const out = {
    selected: new Date(Number(process.env.NOW ?? Date.now())).toISOString().slice(0, 10),
    note: "chosen by tools/corepox-canon.ts on measured behaviour; --check re-verifies",
    ships: picked.map(c => ({id: c.id, label: c.label, bucket: c.bucket, parts: c.parts,
                             islands0: c.islands, matches: c.matches, rating: c.rating, f: c.f}))
  };
  writeFileSync(CANON_PATH, JSON.stringify(out, null, 1) + "\n");
  console.log(`\nwrote ${CANON_PATH}: ${picked.length} ships across ${byBucket.size} buckets`);
}
