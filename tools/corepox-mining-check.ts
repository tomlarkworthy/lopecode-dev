// The mining field, headless. The claims worth checking are the ones that are not
// obviously true: that a chunk arrives as ONE body, that the ore inside it is buried
// rather than sitting on the rim, that ore cannot be shot, that cutting the rock off
// it frees it, that flying into a loose piece collects it, and that each free
// parameter moves the thing it is named after.
//
//   bun tools/corepox-mining-check.ts
import {importNotebookModule} from "./notebook-import.ts";
const ENGINE = process.env.COREPOX_ENGINE ?? "modules/@tomlarkworthy/corepox-engine.js";
const eng = await importNotebookModule(ENGINE);
const E: any = {};
for (const n of ["Ship","World","geom","DT","pilot","loadShipSpec","TYPES","rotTile"]) E[n] = await eng.value(n);
// `World.rng` defaults to Math.random and nothing in the game sets it, so this
// gate was reading the clock. Five consecutive runs on identical input, before
// this line: 5/5, 5/5, 2/5, 4/5, 5/5 seeds paying -- one of them below the
// gate's own 3/5 bar (lopecode-dev-66, 2026-08-21). It bites mining and not
// duels because a thrusting hull emits exhaust as a Poisson draw from World.rng
// and exhaust carries EXHAUST_DMG, so the randomness lands on the rock being cut.
// Kept OUT of `E`: E is spread into the overrides for corepox-duel and
// corepox-mining, and `redefine` throws on a name the module does not import.
const SEED_RNG: any = await eng.value("seedRng");
E.World.rng = SEED_RNG(20260821);
const {rotTile: _rt, ...Edep} = E;                 // corepox-duel imports no rotTile
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js", {overrides: {md: (s: any) => String(s)}});
const SHIPS: any = await mis.value("SHIPS");
const duel = await importNotebookModule("modules/@tomlarkworthy/corepox-duel.js", {
  overrides: {...Edep, SHIPS, pilotInput: await eng.value("pilotInput"),
              md: (s: any) => String(s), htl: {html: () => {}},
              battlefield: null, backdrop: null, invalidation: new Promise(() => {})}});
const DUEL_BACKDROP: any = await duel.value("DUEL_BACKDROP");
const humanControl: any = await duel.value("humanControl");
const min = await importNotebookModule("modules/@tomlarkworthy/corepox-mining.js", {
  overrides: {...E, SHIPS, DUEL_BACKDROP, humanControl, md: (s: any) => String(s),
              htl: {html: () => {}}, battlefield: null, backdrop: null,
              invalidation: new Promise(() => {})}});
const M: any = {};
for (const n of ["newMining","stepMining","runMining","rockSpec","minRng","loosePiece",
                 "collectAt","cashDead","MINING_ORE","MINING_DEFAULTS","minerCmd","MINER"]) M[n] = await min.value(n);

let fail = 0;
const ok = (c: any, label: string, detail = "") => {
  console.log(`${c ? "  ok  " : "FAIL  "}${label}${detail ? "   " + detail : ""}`); if (!c) fail++;
};
const isOre = (t: string) => E.TYPES[t]?.ore != null;
const rockHpOf = (M2: any) => M2.world.ships.filter((s: any) => s !== M2.player)
  .reduce((a: number, s: any) => a + s.live.filter((c: any) => !isOre(c.type))
    .reduce((b: number, c: any) => b + c.hp, 0), 0);

// --- the chunk --------------------------------------------------------------
console.log("a chunk, at the shipped defaults");
const spec = M.rockSpec(M.minRng(11), {...M.MINING_DEFAULTS, ore: M.MINING_ORE});
const chunk = new E.Ship(E.loadShipSpec(spec).spec, {team: "rock", x: 0, y: 0, a: 0});
{
  const by: any = {};
  for (const c of spec.components) by[c.type] = (by[c.type] ?? 0) + 1;
  const ores = spec.components.filter((c: any) => isOre(c.type));
  const tiles = chunk.live.flatMap((c: any) => c.tiles);
  ok(spec.components.length - ores.length >= M.MINING_DEFAULTS.rockVolume,
     "rockVolume counts PIECES, and they are all there",
     `${spec.components.length} pieces, ${tiles.length} tiles: ${JSON.stringify(by)}`);
  // Tom's shapes, 2026-08-21: rock is 3x1 and 2x2, ore is 1x1 and 1x2.
  const shape = (t: string) => E.TYPES[t].tiles.length;
  ok(Object.keys(by).every(t => E.TYPES[t].mineral),
     "nothing in a chunk is a ship part", Object.keys(by).join(","));
  ok(shape("RockSpar") === 3 && shape("RockSlab") === 4 &&
     shape("Ore") === 1 && shape("OreVein") === 2,
     "the shapes are 3x1, 2x2, 1x1, 1x2",
     `spar ${shape("RockSpar")} slab ${shape("RockSlab")} ore ${shape("Ore")} vein ${shape("OreVein")}`);
  ok(ores.length === M.MINING_DEFAULTS.oreVolume, "oreVolume sets the seams",
     ores.map((c: any) => c.type).join(","));
  // ONE body. A mineral with no JOINTS entry bonds to nothing, and the chunk then
  // arrives pre-shattered -- 53 pieces read as 53 islands before this was caught.
  ok(chunk.islands().length === 1, "the chunk is one island", `${chunk.islands().length}`);
  // Buried, defined as UNREACHABLE FROM OUTSIDE rather than "has four neighbours".
  // The two differ, and the difference is not a bug: a 1-tile pocket left between
  // three placed pieces has no rock in it and no way in either, so an ore beside one
  // is still walled off. Testing for four neighbours failed 2 of 3 seams on chunks
  // that were in fact sealed. What matters is that a beam cannot see the seam, and
  // that is a flood fill from outside the bounding box.
  const at = new Set(tiles.map((t: any) => t.join(",")));
  const xs = tiles.map((t: any) => t[0]), ys = tiles.map((t: any) => t[1]);
  const lo = [Math.min(...xs) - 1, Math.min(...ys) - 1], hi = [Math.max(...xs) + 1, Math.max(...ys) + 1];
  const outside = new Set<string>([lo.join(",")]);
  const q: any[] = [lo];
  // cost = rock cells crossed, so it doubles as the DEPTH of each seam
  const cost = new Map<string, number>([[lo.join(","), 0]]);
  while (q.length) {
    const [x, y] = q.shift(), d = cost.get(x + "," + y)!;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = x + dx, ny = y + dy, k = nx + "," + ny;
      if (nx < lo[0] || ny < lo[1] || nx > hi[0] || ny > hi[1]) continue;
      const nd = d + (at.has(k) ? 1 : 0);
      if (cost.has(k) && cost.get(k)! <= nd) continue;
      cost.set(k, nd); if (nd === 0) outside.add(k);
      q.push([nx, ny]);
    }
  }
  const seamsOf = chunk.live.filter((c: any) => isOre(c.type));
  const exposed = seamsOf.filter((c: any) => c.tiles.some(([x, y]: any) =>
    [[1,0],[-1,0],[0,1],[0,-1]].some(([dx, dy]: any) => outside.has((x+dx) + "," + (y+dy)))));
  const depths = seamsOf.map((c: any) => Math.min(...c.tiles.map((t: any) => cost.get(t.join(",")) ?? 99)));
  ok(exposed.length === 0, "no seam can be reached from outside without cutting rock",
     `${exposed.length} exposed of ${seamsOf.length}`);
  ok(Math.min(...depths) >= 2, "and every one is at least two pieces deep",
     `depths ${depths.join(",")}`);
}

// --- ore does not break -----------------------------------------------------
// Shooting a seam is the harvest now, so the two things to hold are that it breaks
// at the price the field set, and that breaking it PAYS -- the second is what makes
// it a harvest rather than vandalism, and it is a different code path (`cashDead`)
// from the one that pays for scooping a loose piece (`collectAt`).
console.log("\nore breaks, and breaking it pays");
{
  const ore = chunk.live.find((c: any) => isOre(c.type));
  const before = ore.hp;
  const hpOfRock = chunk.live.find((c: any) => !isOre(c.type)).hp;
  const perTile = (c: any) => c.hp / E.TYPES[c.type].tiles.length;
  ok(perTile(ore) === perTile(chunk.live.find((c: any) => !isOre(c.type))) * 2,
     "a seam is twice as tough per tile as the rock over it",
     `ore ${perTile(ore)}/tile vs rock ${perTile(chunk.live.find((c: any) => !isOre(c.type)))}/tile`);
  const shots = Math.ceil(before / 5);
  for (let i = 0; i < shots; i++) chunk.damage(ore, 5);    // beam hits at BEAM_DMG
  ok(ore.hp <= 0, `${shots} beam hits break a seam of ${before} hp`, `hp ${before} -> ${ore.hp}`);

  // and the tick it dies on is the tick it pays
  {
    const c2 = M.rockSpec(M.minRng(9), {...M.MINING_DEFAULTS, rockVolume: 12, oreVolume: 1});
    const body = new E.Ship(E.loadShipSpec(c2).spec, {team: "rock", x: 0, y: 0, a: 0});
    const seam = body.live.find((c: any) => isOre(c.type));
    const st: any = {world: new E.World([body]), collected: {}, scrap: 0};
    const alive = body.live.filter((c: any) => isOre(c.type));
    body.damage(seam, seam.hp);
    const cashed = M.cashDead(st, alive);
    ok(cashed.length === 1 && st.scrap === E.TYPES[seam.type].ore,
       "a seam shot dead pays what TYPES says it is worth",
       `${JSON.stringify(cashed)} -> ${st.scrap} scrap, collected ${JSON.stringify(st.collected)}`);
    // A seam handed to another hull by splitDetached is not a seam that was mined.
    const st2: any = {world: new E.World([body]), collected: {}, scrap: 0};
    ok(M.cashDead(st2, body.live.filter((c: any) => isOre(c.type))).length === 0 && st2.scrap === 0,
       "and a live seam pays nothing", `${st2.scrap}`);
  }
  // and killing what holds it frees it -- on a FRESH chunk, because the seam in the
  // one above has just been shot dead and a dead seam cannot come loose.
  const chunk2 = new E.Ship(E.loadShipSpec(
    M.rockSpec(M.minRng(7), M.MINING_DEFAULTS)).spec, {team: "rock", x: 0, y: 0, a: 0});
  const ore2 = chunk2.live.find((c: any) => isOre(c.type));
  const w = new E.World([chunk2]);
  // c.tiles, not worldTiles: `worldTiles` is world space and carries the ship's
  // centre-of-mass offset, so its numbers are fractional -- [[2.217, 2.651]] for a
  // component at grid [2,-1]. Comparing those as grid cells found 2 of the 4 pieces
  // bonded to the seam and the ore never came loose.
  const oreCells = ore2.tiles.map((t: any) => t.join(","));
  for (const c of [...chunk2.live]) {
    if (isOre(c.type)) continue;
    if (c.tiles.some(([x, y]: any) => [[1,0],[-1,0],[0,1],[0,-1]]
        .some(([dx, dy]: any) => oreCells.includes((x+dx) + "," + (y+dy)))))
      chunk2.damage(c, c.hp);
  }
  w.splitDetached();
  const freed = w.ships.filter((s: any) => s.live.length && M.loosePiece(s));
  ok(freed.length >= 1, "killing the rock bonded to it cuts it loose",
     `${freed.length} loose piece(s): ${freed.map((s: any) => s.live.map((c: any) => c.type).join("+")).join(" ")}`);

  // and touching it collects it, for what the type says it is worth
  const piece = freed[0];
  const player = new E.Ship(E.loadShipSpec(M.MINER).spec, {team: "player", x: 0, y: 0, a: 0});
  const [px, py] = piece.worldOf(piece.live[0]);
  player.x = px; player.y = py;
  const state = {player, world: new E.World([player, piece]), collected: {}, scrap: 0};
  const got = M.collectAt(state);
  const worth = piece.live.reduce((a: number, c: any) => a + E.TYPES[c.type].ore, 0);
  ok(got.length > 0, "flying into it collects it", JSON.stringify({got, scrap: state.scrap}));
  ok(state.scrap === worth, "and it pays what TYPES says the piece is worth",
     `${state.scrap} = ${worth}`);
  ok(state.world.ships.length === 1, "and it leaves the field");
}

// --- the free parameters move what they are named after ---------------------
console.log("\nfree parameters, one field each");
for (const [k, vals] of [["density", [0.15, 0.25, 0.5]], ["rockVolume", [20, 50, 90]],
                         ["oreVolume", [1, 3, 6]]] as any) {
  const row = vals.map((v: number) => {
    const F = M.newMining({ship: M.MINER, seed: 5, [k]: v});
    const rocks = F.world.ships.filter((s: any) => s !== F.player);
    const pieces = rocks.reduce((a: number, s: any) => a + s.live.length, 0);
    const seams = rocks.reduce((a: number, s: any) =>
      a + s.live.filter((c: any) => isOre(c.type)).length, 0);
    return `${k}=${v}: ${F.rocks} chunks, ${pieces} pieces, ${seams} seams`;
  });
  console.log("  " + row.join(" | "));
}
const chunks = (v: number) => M.newMining({ship: M.MINER, seed: 5, density: v}).rocks;
ok(chunks(0.5) > chunks(0.15) * 2, "density scales the chunk count",
   `0.15 -> ${chunks(0.15)}, 0.5 -> ${chunks(0.5)}`);
const pieces = (v: number) => { const F = M.newMining({ship: M.MINER, seed: 5, rockVolume: v});
  return F.world.ships.filter((s: any) => s !== F.player)
    .reduce((a: number, s: any) => a + s.live.length, 0); };
ok(pieces(90) > pieces(20) * 2, "rockVolume scales the rock in the field",
   `20 -> ${pieces(20)} pieces, 90 -> ${pieces(90)}`);
const seams = (v: number) => { const F = M.newMining({ship: M.MINER, seed: 5, oreVolume: v});
  return F.world.ships.filter((s: any) => s !== F.player)
    .reduce((a: number, s: any) => a + s.live.filter((c: any) => isOre(c.type)).length, 0); };
ok(seams(6) > seams(1) * 2, "oreVolume scales the seams", `1 -> ${seams(1)}, 6 -> ${seams(6)}`);

// --- the rig that flies it is the rig that was authored ----------------------
// A structural check, before any flying. MINER's two lateral engines were written at
// px +-2 with nothing at +-1, so they bonded to nothing and `splitDetached` threw
// them away at t=0: `islands [7,1,1]`. Every run for two days flew a single-thrust-
// axis hull, and no outcome-shaped probe could see it -- a stalled miner and a miner
// that cannot strafe produce the same log line. lopecode-dev-66 found it from the
// outside, by sweeping `pilot` against a fixture that arrived and one that did not.
console.log("\nthe MINER hull, before it flies");
{
  const hull = new E.Ship(E.loadShipSpec(M.MINER).spec, {team: "player", x: 0, y: 0, a: 0});
  const isl = hull.islands();
  const eng = hull.live.filter((c: any) => c.type === "Engine");
  const axes = new Set(eng.map((c: any) => c.dir % 180));
  ok(isl.length === 1, "every authored component is bonded to the hull",
     `islands [${isl.map((i: any) => i.length).join(",")}], ${hull.live.length} live, ` +
     `${eng.length} engines, ${axes.size} thrust axis/axes`);
  ok(axes.size >= 2, "and it can thrust off its own nose line, which is what lets it " +
     "orbit a chunk while its guns stay on the seam",
     `engine dirs [${eng.map((c: any) => c.dir).join(",")}]`);
}

// --- the seam pays, and only when something is flying the ship ---------------
// The gate the rest of this file does not give. Every assertion above has passed at
// least once while a 90-second field returned nothing at all: `minerCmd` handed
// `pilot` a POINT where it wanted an ANGLE, and later three versions of the miner
// deadlocked their own fire-control rules against their own throttle rules.
// Two sources of randomness, and the gate has to average over BOTH. `seed` picks
// the field layout; `World.rng` drives the exhaust that does most of the cutting.
// Pinning the rng made this repeat but not pass: swept over the pin alone on
// unchanged code, 8 of 8 pins agree the field pays 3-5 of 5 seeds, and one of
// them (rng 7) lands where the haul bar does not clear -- so which integer was
// typed here decided whether the gate was green (lopecode-dev-66, 2026-08-21).
//
//   rng 1  5/5   rng 2  4/5   rng 3  4/5   rng 4  3/5
//   rng 5  5/5   rng 6  4/5   rng 7  3/5 FAIL   rng 20260821  4/5
//
// The bars therefore sit on the aggregate of layout x rng, not on one draw of it.
// `--fast` drops to the single pin for the inner loop. The pooled run is 4x the
// wall clock (7m35s vs ~2m here) and it is what the gate's verdict should rest on,
// so it is the default and the cheap one is opt-in, not the other way round.
const RNGS = process.argv.includes("--fast") ? [20260821] : [20260821, 1, 4, 7];
const FIELDS = [3, 5, 11, 17, 23];
console.log(`\n${FIELDS.length} fields x ${RNGS.length} rng pins, MINER on auto, and an unsteered control`);
{
  let paid = 0, tot = 0, ore = 0, runs = 0;
  for (const rng of RNGS) {
    E.World.rng = SEED_RNG(rng);
    let rPaid = 0, rOre = 0;
    for (const seed of FIELDS) {
      const R = M.runMining({ship: M.MINER, seed, control: "auto"});
      const n = Object.values(R.collected).reduce((a: any, b: any) => a + b, 0) as number;
      if (R.scrap > 0) { paid++; rPaid++; }
      tot += R.scrap; ore += n; rOre += n; runs++;
    }
    console.log(`  rng ${String(rng).padEnd(9)} ${rPaid}/${FIELDS.length} fields paid, ${String(rOre).padStart(2)} pieces`);
  }
  // Bars are on the pooled result, and they are ONE metric, not two. Across the
  // eight-pin sweep the two lines rank identically -- they read the same draw from
  // opposite ends (lopecode-dev-66, 2026-08-21):
  //
  //   paid  5/5  5/5  4/5  4/5  4/5  4/5  3/5  3/5
  //   pcs    18   18   12    9    9    9    9    4
  //
  // So this is one number with a 4-to-18-piece spread on unchanged code and both
  // bars under the low end of it -- not two independent margins. Move one and you
  // have moved the other; do not cite them as agreeing evidence. What pooling buys
  // is that an unlucky pin is absorbed rather than decisive, which is all it was
  // added for.
  ok(paid >= runs / 2, `half the fields pay, pooled over ${RNGS.length > 1 ? "layout and rng" : "layout (--fast: ONE rng pin, not a verdict)"}`,
     `${paid}/${runs} runs`);
  ok(ore >= runs, "and the haul averages a piece a run or better",
     `${ore} pieces in ${runs} runs, ${tot} scrap`);
  // The control: the same hull with nothing steering it cannot work a seam, so a
  // pass above is the pilot's doing and not the field handing out ore.
  E.World.rng = SEED_RNG(20260821);
  const idle = M.runMining({ship: M.MINER, seed: 5, control: "wired"});
  ok(idle.scrap === 0, "an unsteered hull mines nothing", `${idle.scrap}`);
}

console.log(fail ? `\nFAIL: ${fail}` : "\nPASS");
process.exit(fail ? 1 : 0);
