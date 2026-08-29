// Where the frame goes when the ships are big.
//
//   bun tools/corepox-melee-bench.ts             # the headline: 8 x 203-part melee
//   bun tools/corepox-melee-bench.ts --sweep     # scaling in ship COUNT and ship SIZE
//   bun tools/corepox-melee-bench.ts --ticks 400
//
// The fixture is the real melee -- `newDuel({ships})` from @tomlarkworthy/corepox-duel
// driving @tomlarkworthy/corepox-engine's World.step -- so a number here is a number
// the game has. Nothing about the simulation is reimplemented in this file; the only
// thing added is a stopwatch around the phases, and the cost of THAT is measured too
// (`--sweep` prints the instrumented-vs-clean gap) rather than assumed to be zero.
import {importNotebookModule} from "./notebook-import.ts";
import {gunzipSync} from "node:zlib";
import {readFileSync} from "node:fs";
import {Runtime} from "@observablehq/runtime";
(Runtime.prototype as any).fileAttachments ??= () => () => null;
(globalThis as any).window = {lopecode: {contentSync: () => ({status: 200, mime: "application/gzip", bytes: new Uint8Array()})}};

const arg = (k: string, d: number) => {
  const i = process.argv.indexOf("--" + k);
  return i >= 0 ? Number(process.argv[i + 1]) : d;
};
const SWEEP = process.argv.includes("--sweep");
const TICKS = arg("ticks", 300);
const NSHIPS = arg("ships", 8);

const eng = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const E: any = {};
for (const n of ["Ship","World","geom","DT","pilot","TYPES","TYPE_ALIAS","RELICS","loadShipSpec","rotTile"])
  E[n] = await eng.value(n);
const seedRng: any = await eng.value("seedRng");
const pick = (names: string[]) => Object.fromEntries(names.filter(n => n in E).map(n => [n, E[n]]));
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js",
  {overrides: {md: (s: any) => String(s)}});
const SHIPS: any = await mis.value("SHIPS");
const yard = await importNotebookModule("modules/@tomlarkworthy/corepox-shipyard.js", {
  overrides: {...pick(["TYPES","TYPE_ALIAS","RELICS","loadShipSpec"]), SHIPS, TILE: 1}});
const unpack: any = await yard.value("unpackCorpus");
const CORPUS: any = unpack(JSON.parse(gunzipSync(readFileSync("data/corepox/corpus.json.gz")).toString()));
const duel = await importNotebookModule("modules/@tomlarkworthy/corepox-duel.js", {
  overrides: {...pick(["Ship","World","geom","DT","pilot","loadShipSpec","TYPES","TYPE_ALIAS","RELICS"]),
              SHIPS, md: (s: any) => String(s), htl: {html: () => {}},
              battlefield: null, backdrop: null, invalidation: new Promise(() => {})}});
const newDuel: any = await duel.value("newDuel");
const stepDuel: any = await duel.value("stepDuel");

// ---------------------------------------------------------------------------
// The roster: biggest first, by PART count -- the loop bound that matters is the
// number of live components, not the tile area, because every hot loop in
// World.step iterates `ship.live`.
// ---------------------------------------------------------------------------
const sized = Object.entries(CORPUS.ships).map(([id, s]: any) => {
  const spec = E.loadShipSpec(structuredClone(s)).spec;
  return {id, spec,
          parts: spec.components.length,
          tiles: spec.components.reduce((n: number, c: any) => n + (E.TYPES[c.type]?.tiles?.length ?? 1), 0),
          guns: spec.components.filter((c: any) => /Lazer|Turret|Explosive/.test(c.type)).length,
          orbs: spec.components.filter((c: any) => c.type === "Orb").length};
}).sort((a, b) => b.parts - a.parts);

// Distinct hulls, because the top of the corpus has exact duplicates and a melee
// of one design copied eight times is a different fixture from eight designs.
const distinct: any[] = [];
const seen = new Set<string>();
for (const s of sized) {
  const k = JSON.stringify(s.spec.components.map((c: any) => [c.type, c.pos]));
  if (seen.has(k)) continue;
  seen.add(k); distinct.push(s);
}

// ---------------------------------------------------------------------------
// The stopwatch. Prototype methods only, so the module under test is untouched.
// `evaluate` runs once per live component per tick and is the one wrap whose own
// cost is not negligible -- it is reported separately for that reason.
// ---------------------------------------------------------------------------
const T: Record<string, number> = {};
const N: Record<string, number> = {};
const saved: Array<[any, string, any]> = [];
const wrap = (obj: any, name: string, key = name) => {
  const f = obj[name];
  saved.push([obj, name, f]);
  obj[name] = function (...a: any[]) {
    const t0 = performance.now();
    const r = f.apply(this, a);
    T[key] = (T[key] ?? 0) + (performance.now() - t0);
    N[key] = (N[key] ?? 0) + 1;
    return r;
  };
};
const count = (obj: any, name: string) => {
  const f = obj[name];
  saved.push([obj, name, f]);
  obj[name] = function (...a: any[]) { N[name] = (N[name] ?? 0) + 1; return f.apply(this, a); };
};
const unwrap = () => { for (const [o, n, f] of saved.reverse()) o[n] = f; saved.length = 0; };
const reset = () => { for (const k of Object.keys(T)) delete T[k]; for (const k of Object.keys(N)) delete N[k]; };

const build = (roster: any[], seed = 20260822) => {
  E.World.rng = seedRng(seed);
  return newDuel({
    mode: "melee", limit: 1e9, seed,
    ships: roster.map((r) => ({spec: r.spec, control: "auto"})),
    placement: {separation: 26},
    backdrop: false
  });
};
const run = (D: any, ticks: number) => { for (let i = 0; i < ticks; i++) stepDuel(D); };
// Per-tick, because the average over a whole fight is not the number that matters:
// a melee starts with everything alive and thins out, so the frame the engine has
// to survive is the FIRST one, not the mean one.
const runTrace = (D: any, ticks: number, buckets = 10) => {
  const per = Math.ceil(ticks / buckets), out = [];
  for (let b = 0; b < buckets; b++) {
    const n = Math.min(per, ticks - b * per);
    if (n <= 0) break;
    const live = liveParts(D), pcount = D.world.particles.length, ships = shipCount(D);
    const t0 = performance.now();
    for (let i = 0; i < n; i++) stepDuel(D);
    out.push({t: +(D.world.t).toFixed(1), ms: (performance.now() - t0) / n, live, pcount, ships});
  }
  return out;
};

// Warm-up is its own fixture, discarded: V8 needs the big functions optimised
// before any of these numbers mean anything, and how long that takes scales with
// the size of the function being compiled.
const warm = (roster: any[]) => { const D = build(roster, 99); run(D, 120); };

// Over the WORLD, not over the roster. `splitDetached` re-homes a severed island
// into a brand-new Ship, so a roster-only count reads as a massacre (1522 -> 432
// in 0.4s on the first pass here) when nothing has died: the parts moved house.
// The engine still simulates every one of them, and the ship COUNT is itself a
// cost -- `collide` is O(ships^2) before it looks at a single component.
const liveParts = (D: any) => D.world.ships.reduce((n: number, s: any) => n + s.live.length, 0);
const shipCount = (D: any) => D.world.ships.filter((s: any) => s.live.length).length;

// ---------------------------------------------------------------------------
const bench = (roster: any[], ticks: number, {phases = true} = {}) => {
  warm(roster);
  if (phases) {
    reset();
    wrap(E.World.prototype, "stepParticles", "particles");
    wrap(E.World.prototype, "collide", "collide");
    wrap(E.World.prototype, "splitDetached", "split");
    wrap(E.World.prototype, "evaluate", "evaluate");
    wrap(E.Ship.prototype, "propagate", "propagate");
    wrap(E.Ship.prototype, "integrate", "integrate");
    count(E.Ship.prototype, "worldTiles");
    // Counters, not timers: an operation count is exact and free, and the timings
    // above cannot say WHY a phase is expensive. `islands` is the one that matters
    // most -- splitDetached calls it on every ship every tick whether or not that
    // ship lost anything.
    count(E.Ship.prototype, "islands");
    count(E.Ship.prototype, "worldOf");
    count(E.Ship.prototype, "damage");
  }
  const D = build(roster);
  const parts0 = liveParts(D);
  const t0 = performance.now();
  run(D, ticks);
  const wall = performance.now() - t0;
  const out = {wall, ticks, parts0, parts1: liveParts(D),
               ships0: roster.length, ships1: shipCount(D),
               particles: D.world.particles.length, worldTiles: N.worldTiles ?? 0,
               T: {...T}, N: {...N}};
  if (phases) unwrap();
  return out;
};

// Median of R, because a single run of a JIT-compiled 25ms loop is not a
// measurement -- the first pass at this reported the stopwatch as costing -1.61
// ms/tick, which is run-to-run noise wearing a result's clothes.
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[xs.length >> 1];
const repeat = (f: () => any, r: number) => {
  const runs = Array.from({length: r}, f);
  const m = median(runs.map((x: any) => x.wall));
  return {...runs.find((x: any) => x.wall === m), spread: Math.max(...runs.map((x: any) => x.wall)) / Math.min(...runs.map((x: any) => x.wall))};
};
const ms = (x: number) => x.toFixed(2).padStart(7);
const pct = (x: number, t: number) => ((x / t) * 100).toFixed(1).padStart(5) + "%";

// ---------------------------------------------------------------------------
console.log(`corepox melee bench — ${new Date().toISOString().slice(0, 10)}`);
console.log(`corpus: ${sized.length} ships, ${distinct.length} distinct hulls, ` +
            `largest ${sized[0].parts} parts / ${sized[0].tiles} tiles`);

const roster = distinct.slice(0, NSHIPS);
console.log(`\nthe scene: ${roster.length} of the largest DISTINCT hulls, auto pilot, ring at sep 26`);
console.log("  id                                parts tiles guns orbs");
for (const r of roster)
  console.log(`  ${r.id.padEnd(33)} ${String(r.parts).padStart(5)} ${String(r.tiles).padStart(5)}` +
              ` ${String(r.guns).padStart(4)} ${String(r.orbs).padStart(4)}`);

// clean first: no wrappers at all, so the headline number carries no stopwatch
const REPS = 5;
const clean: any = repeat(() => bench(roster, TICKS, {phases: false}), REPS);
console.log(`\n${TICKS} ticks, no instrumentation, median of ${REPS} (spread ${clean.spread.toFixed(2)}x)`);
console.log(`  ${ms(clean.wall / TICKS)} ms/tick   ${(clean.wall / TICKS / (1000 / 60) * 100).toFixed(0)}% of a 60fps frame` +
            `   ${(TICKS / (clean.wall / 1000)).toFixed(0)} ticks/s`);
console.log(`  live parts ${clean.parts0} -> ${clean.parts1}, ships ${clean.ships0} -> ${clean.ships1}, ` +
            `${clean.particles} particles in flight at the end`);

// The average hides the opening. Trace it.
warm(roster);
const DT2 = build(roster);
const tr = runTrace(DT2, TICKS);
console.log(`\nover the fight — the average is not the frame the engine has to survive`);
console.log("     t   ships  live parts  particles   ms/tick");
for (const r of tr)
  console.log(`  ${String(r.t).padStart(4)}s  ${String(r.ships).padStart(5)}  ${String(r.live).padStart(10)}` +
              `  ${String(r.pcount).padStart(9)}   ${ms(r.ms)}`);
console.log(`  opening ${(tr[0].ms / clean.wall * TICKS).toFixed(1)}x the run average` +
            `  (${(tr[0].ms / (1000/60)).toFixed(1)} frames of a 60fps budget)`);

const inst: any = repeat(() => bench(roster, TICKS), REPS);
const total = inst.wall;
const rows: Array<[string, number, string]> = [
  ["propagate     (wires -> outputs)", inst.T.propagate ?? 0, `${inst.N.propagate} calls`],
  ["evaluate      (per component)", inst.T.evaluate ?? 0, `${inst.N.evaluate} calls`],
  ["integrate     (forces -> motion)", inst.T.integrate ?? 0, `${inst.N.integrate} calls`],
  ["stepParticles (every shot in flight)", inst.T.particles ?? 0, `${inst.N.particles} ticks`],
  ["collide       (hull vs hull)", inst.T.collide ?? 0, `${inst.N.collide} ticks`],
  ["splitDetached (did a ship break)", inst.T.split ?? 0, `${inst.N.split} ticks`]
];
const named = rows.reduce((n, r) => n + r[1], 0);
console.log(`\nwhere the time goes  (instrumented median ${ms(total / TICKS)} ms/tick vs clean ` +
            `${ms(clean.wall / TICKS)}, so the stopwatch itself costs ` +
            `${((total - clean.wall) / TICKS).toFixed(2)} ms/tick)`);
for (const [label, t, note] of rows.sort((a, b) => b[1] - a[1]))
  console.log(`  ${label.padEnd(38)} ${ms(t / TICKS)} ms/tick  ${pct(t, total)}   ${note}`);
console.log(`  ${"orb contact + step loop (remainder)".padEnd(38)} ${ms((total - named) / TICKS)} ms/tick  ${pct(total - named, total)}`);
const ships1 = clean.ships1, pairs = ships1 * (ships1 - 1) / 2;
console.log(`\nthe work itself, per tick, at the end of the run (${ships1} ships, ` +
            `${clean.parts1} live parts, ~${clean.particles} particles)`);
const per = (k: string) => ((inst.N[k] ?? 0) / TICKS).toFixed(0).padStart(9);
console.log(`  Ship.worldTiles   ${per("worldTiles")} calls/tick   each allocates a fresh array of arrays`);
console.log(`  Ship.worldOf      ${per("worldOf")} calls/tick`);
console.log(`  Ship.islands      ${per("islands")} calls/tick   splitDetached floods EVERY ship EVERY tick`);
console.log(`  Ship.damage       ${per("damage")} calls/tick`);
console.log(`  collide ship pairs${String(pairs).padStart(9)} /tick     O(ships^2) broad phase before any component test`);
console.log(`  particle x ship   ${String(clean.particles * ships1).padStart(9)} /tick     every shot is tested against every ship`);

if (SWEEP) {
  console.log(`\nscaling in SHIP COUNT, largest hulls, ${TICKS} ticks, no instrumentation`);
  console.log("   n   parts  ms/tick   vs n=2   ms/tick/part");
  const base: any = {};
  for (const n of [2, 3, 4, 6, 8, 12]) {
    if (n > distinct.length) break;
    const r = bench(distinct.slice(0, n), TICKS, {phases: false});
    base[n] = r.wall / TICKS;
    console.log(`  ${String(n).padStart(2)}  ${String(r.parts0).padStart(6)}  ${ms(base[n])}` +
                `  ${(base[n] / base[2]).toFixed(1).padStart(6)}x  ${(base[n] / r.parts0).toFixed(4).padStart(12)}`);
  }
  console.log(`\nscaling in SHIP SIZE, 6 ships, ${TICKS} ticks, no instrumentation`);
  console.log("  parts each   total   ms/tick   ms/tick/part");
  for (const at of [0, 40, 200, 700, 1500]) {
    const r6 = distinct.slice(at, at + 6);
    if (r6.length < 6) break;
    const r = bench(r6, TICKS, {phases: false});
    console.log(`  ${String(r6[0].parts).padStart(10)}   ${String(r.parts0).padStart(5)}   ${ms(r.wall / TICKS)}` +
                `  ${((r.wall / TICKS) / r.parts0).toFixed(4).padStart(13)}`);
  }
}
