// Corepox simulation core. No DOM, no rendering -- so it runs headless in node
// (tools/notebook-import.ts) and can be reused as the ladder verifier.
//
// ONE angle convention, because the original had two that cancelled (see
// knowledge/corepox-extracted-design.md): coordinates are SVG-style with +Y
// DOWN, a heading `a` is DEGREES with 0 = screen-up and positive = clockwise,
// so unit(a) = (sin a, -cos a) and the 2D cross rx*Fy - ry*Fx is positive
// clockwise, matching `a`.

const _DT = function _DT(){return(
0.02
)};

// Unity worked in WORLD units at Metric.Tile2Pixel = 0.64 world units per tile
// (Metrics.cs:6). This engine lays components out in TILES, so every constant
// lifted from the original is divided by 0.64 to land in tile units. They are
// collected here rather than inlined, because getting one wrong is invisible --
// it just makes the game feel different.
const _UNITS = function _UNITS(){return(
{
  W: 0.64,                    // world units per tile (Metric.Tile2Pixel)
  // LaserFn.cs:22 emits a beam at local (0, 1.8) with local velocity (0, 20) and
  // ttl 1.3s. So a bolt TRAVELS -- 20/0.64 = 31.25 tiles/s for 1.3s = 40.6 tiles
  // of range -- and can miss a moving target. `beam.length = 100` is the visual
  // shaft scale, not the range; treating it as an instant 100-tile raycast made
  // every gun hitscan, which is most of why guns dominated self-play.
  BEAM_SPEED: 20 / 0.64, BEAM_LEN: 1 / 0.64,
  BEAM_TTL: 1.0,        BEAM_MUZZLE: 2.0 / 0.64,      // LaserFn
  TURRET_TTL: 1.3,      TURRET_MUZZLE: 1.8 / 0.64,    // TurretFn
  BEAM_CYCLE: 1.0, BEAM_DMG: 5,          // FIRE_S 0.1 + RECHARGE_S 0.9
  // ExplosiveFn.cs: 32 fragments evenly around a circle at 2 world u/s, ttl 3s,
  // 5 dmg each -- a shrapnel bomb with a 9.4 tile reach, not a point blast.
  FRAG_N: 32, FRAG_SPEED: 2 / 0.64, FRAG_TTL: 3, FRAG_DMG: 5, FRAG_CHARGE: 0.1,
  // EngineFn.emitParticle: exhaust spawns 1.6 tiles behind the nozzle moving aft
  // at 1 world u/s with ttl U(0,1), carrying Damage's default dmg of 1. Poisson
  // rate EMIT * magnitude * dt, magnitude 0..100 -- 2 a tick at full thrust.
  EXHAUST_SPEED: 1 / 0.64, EXHAUST_BACK: 1.6, EXHAUST_DMG: 1, EXHAUST_RATE: 1,
  RAM_DMG: 5,                                    // Ship.cs:586, per contact per tick
  RESTITUTION: 0.2,                              // bounciness of a hull-vs-hull contact
  // The Orb is MeleeFn: FixedUpdate calls `damageArea.GetContacts` and damages
  // EVERY ShipComponent touching the trigger by `damageAmount`, at 50Hz -- which
  // is this engine's tick, DT is already 0.02. Both numbers are off Orb.prefab
  // (tools/corepox-orb-melee-probe.py): damageAmount 5, and the `weapon` child
  // carries a CircleCollider2D of radius 1.1 at local (0.96, 0.96) under a root
  // at localScale 0.33. So 1.1 * 0.33 = 0.363 world units, and the circle sits
  // 0.96 * 0.33 = 0.317 world units diagonally off the pivot -- 0.495 tiles,
  // which is the centre of the Orb's own 2x2 to within a rounding.
  ORB_R: 1.1 * 0.33 / 0.64, ORB_DMG: 5,
  // HIT_R is measured: a component occupies one tile, so its box has a half
  // extent of 0.5.
  //
  // BEAM_R was 0.75 tiles from 2026-08-18 to 2026-08-21 and that was a CHOSEN
  // number, defended by an argument that turned out to be false. The argument:
  // a radar->turret wire aims from the radar and fires from the turret, so it
  // misses by 3 tiles * sin(off-axis); a wide beam widens that window; Aim exists
  // to teach that wire. Aim wins with the beam at 0.75, 0.5, 0.25, 0.1 and 0 --
  // 26.8s to 27.6s, every arm (tools/corepox-play-missions.ts). The window the
  // width buys is real (+-10 degrees at 0.75, dead ahead at 0.1, measured by
  // corepox-parallax.ts against a HELD-STILL target) and the mission does not
  // need it, because the rocket closes head on.
  //
  // What 0.75 did buy was a beam 2.5 tiles across, which damages whatever sits
  // one tile to the SIDE of the barrel. Tom, 2026-08-21, on corpus ship
  // FD96E630: "self intersects with its own radar and dies, but that seems like
  // a collision bounds bug". It was not the Radar's bounds: its Lazer at [3,1]
  // fires up the x=3 column and the Radar's cells at x=2 are 1.0 tile away,
  // inside HIT_R + 0.75.
  //
  // The prefab is binary, but one number in it is not ambiguous. DamageBeam.Awake
  // scales the shaft by (length, 1, 1) with length = 100 and puts the beam's tail
  // at -length/100, i.e. ONE world unit back. So a sprite stretched 100x in x
  // spans 1 world unit: the sprite is 0.01 world units long at unit scale. Its y
  // is not scaled at all, so the WIDTH is that sprite's own height -- of the order
  // of a hundredth of its length unless the texture is a hundred times taller than
  // it is wide, which no beam texture is. That argues small, and it does not give
  // a number.
  //
  // Two behavioural constraints bracket it, and they are the whole justification:
  //
  //   BEAM_R < 0.5   a beam must not damage the component one tile to the SIDE of
  //                  the barrel. HIT_R + BEAM_R has to stay under 1.0 for that.
  //                  (FD96E630 above.)
  //   BEAM_R > ~0.1  TwinTurrets has to stay solvable with the parts it hands the
  //                  player. tools/corepox-solve.ts searches its 140 legal builds:
  //                  0 of 140 win at 0, 1 of 140 at 0.25, the same 1 at 0.4 and at
  //                  0.75. So the level cares that the beam is not a line, and
  //                  cares about nothing above 0.25.
  //
  // 0.25 is the bottom of that bracket. It is still a fitted number and it is
  // still the first thing to check if the collider is ever recovered -- but it is
  // fitted to two things the game has to do, not to one thing it turns out not to
  // need.
  BEAM_R: 0.25,
  HIT_R: 0.5                  // a component is one tile across
}
)};

const _TYPES = function _TYPES(){return(
// HP is the SHIPPED table, recovered 2026-08-19. maxHp lives in the binary Unity
// prefabs, but every serialised ship carries each component's current hp and
// assets.json carries a creation_date per ship, so the values can be DATED rather
// than guessed. 303 of 892 ships are dated, spanning 2017-11-23..2018-02-24, and
// they show one balance patch on 2018-01-14 (tools/corepox-hp-eras.ts):
//
//   type          before 2018-01-14   after      n
//   Armour              75             100      499
//   Binary             100              25      196
//   Constant            50              25      760
//   LaserTurret2       100              50      116
//   Lazer              100              75      863
//   Radar               50              25      219
//   Brain               50              20      272   (nerfed earlier, 2017-11-29)
//   Engine              50              50      981   (unchanged)
//   Hyperdrive / Orb    --         200 / 75          (both first appear 2018-01-14)
//
// The patch made everything fragile except Armour, which got tougher. Armour 100
// against a Brain 20 is 5:1, so the game is about EXPOSING a core, not out-shooting
// a shell -- which matches Tom's memory of Armour being good. The earlier "no
// player used Armour" reading came from the wrong dump (S1.3, retracted).
{
  Brain:        {hp: 20,  tiles: [[0,0]], ins: [],                    outs: []},
  Constant:     {hp: 25,  tiles: [[0,0]], ins: [],                    outs: ["out"]},
  // T-tetromino. Corpus spacing: two Binaries never sit within +-3 cells (vs
  // Constants at 513 pairs one cell apart), and the T anchor here is the sharp
  // minimum of the overlap search (4.3% vs 17.3% for the next best).
  Binary:       {hp: 25,  tiles: [[-1,0],[0,0],[1,0],[0,-1]],
                 ins: ["a","b"], outs: ["out"]},
  // 2x3. Overlap search minimum is sharp: 1.5% at this anchor, 42.7% next.
  Radar:        {hp: 25,  tiles: [[0,0],[1,0],[0,1],[1,1],[0,2],[1,2]],
                 ins: [], outs: ["dist","bearing"]},
  // 2x1, nozzle behind (Tom). Local-frame corpus shadow agrees: two same-dir
  // Engines never sit 1 apart along their own axis (0 pairs) but do at 2 (17),
  // while 624 sit side by side. Direction from overlap: -y 22.9% vs +y 54.5%.
  Engine:       {hp: 50,  tiles: [[0,0],[0,-1]], ins: ["in"], outs: []},
  // 3x1, barrel forward (Tom). Shadow: blocked at +-1 AND +-2 along its own axis,
  // open at +-3, 884 side by side. Direction from overlap: +y 5.8% vs -y 53.7%.
  Lazer:        {hp: 75,  tiles: [[0,0],[0,1],[0,2]], ins: ["in"], outs: []},
  Explosive:    {hp: 5,   tiles: [[0,0]], ins: ["in"],                outs: []},
  // 2x2 (Tom). Corpus-consistent: this anchor costs +0.56pp of overlap over 1x1
  // (13.68% vs 13.12%) where every other 2x2 anchor and 3x3 cost more. Tom also
  // reports two connectors on one side; Descriptions.cs gives Orb no input or
  // output semantics, so they are not modelled.
  Orb:          {hp: 75,  tiles: [[0,0],[1,0],[0,1],[1,1]],
                 ins: [], outs: []},
  // 75, not the 100 the game shipped with. Tom, 2026-08-22: "armour seems a bit too
  // strong". At 100 one plate is 20 SECONDS of unbroken fire from one Lazer
  // (BEAM_DMG 5 per BEAM_CYCLE 1.0s), against missions that resolve in 3-74s
  // (tools/corepox-play-missions.ts) -- so a single 1-cell part outlasts most of
  // them, and it is 5x a Brain and 4x an Engine PER CELL. 75 is not invented: it is
  // the value the game shipped before 2018-01-14, seen on 65 dated corpus ships from
  // 2017-11-23 (tools/corepox-hp-eras.ts). That patch is the one that took Brain
  // 50->20, Binary 100->25, Constant 50->25, Lazer 100->75, Radar 50->25 and
  // LaserTurret2 100->50 -- Armour was the ONLY part it moved up. Going back to 75
  // is 15s a plate. tools/corepox-armour-balance.ts prints the table; 50 is the next
  // step down if it still soaks too much.
  Armour:       {hp: 75,  tiles: [[0,0]], ins: [],                    outs: []},
  // 12 cells, verbatim from TurretFn.Awake() -- the SHIPPED occupancy, with the
  // ASCII in that comment matching cell for cell. LaserTurret2.prefab serialises
  // only 10 (no y=3 row) and is the stale one: Awake() runs after deserialisation
  // and overwrites the field, and its own comment says why the prefab still holds
  // a copy -- "we still had to save the prefab with occupancy prepopulated".
  // TurretFn is the only component that does this (CompositeFn builds occupancy
  // from its children); for every other type the prefab is the definition.
  //    XX        y=3      x=0..1
  //   XXXX       y=1..2   x=-1..2
  //    0X        y=0      x=0..1   <- the 2x1 BASE Tom described
  // Both readings were right: the base is the 2x1 that carries the joints, and the
  // rest is the arc the gun sweeps, which the prefab reserves so nothing can be
  // built into it. pivot is the centre of the 2x2 over the base and the row above
  // (Tom: "the rotation point is in the middle if it was a 2x2").
  LaserTurret2: {hp: 50, pivot: [0.5, 0.5],
                 tiles: [[-1,1],[-1,2],[0,1],[0,2],[1,1],[1,2],[2,1],[2,2],
                         [0,0],[1,0],[0,3],[1,3]],
                 ins: ["fire","angle"], outs: []},
  // Straight out of Hyperdrive.prefab (tools/corepox-component-truth.py). Was a
  // guess: "a 2x4 hammer head joined to a 3x2 stem, joints placed sparsely" (Tom),
  // with no joint table at all, because only 57 instances exist and every anchor
  // scores ~50% overlap against a 46.9% baseline -- the corpus cannot resolve it.
  // The guessed shape was right and the ORIGIN was not: the head is at y=1..2 and
  // the stem at y=-2..0, so every cell moved 2 forward and the anchor is in the
  // stem's forward row, not its aft-left corner. Confirmed twice over -- the
  // sprite is 4.13 x 4.92 tiles against this 4 x 5 bounding box, and its pivot
  // lands on cell (0,0) to within 0.1 of a tile (tools/corepox-anchor-truth.ts).
  Hyperdrive:   {hp: 200, ins: ["in"], outs: [],
                 tiles: [[-2,2],[-1,2],[0,2],[1,2],[-2,1],[-1,1],[0,1],[1,1],
                         [-1,0],[0,0],[-1,-1],[0,-1],[-1,-2],[0,-2]]},
  Composite:    {hp: 25,  tiles: [[0,0]], ins: [],                    outs: []},

  // --- minerals: not ship parts, and marked so nothing offers them as parts -----
  // Added 2026-08-21 for the mining node. An asteroid is a Ship on team "rock", so
  // it splits, takes beam and ram damage and drops islands through the same code a
  // hull does -- but it was built out of Armour and real components, which put
  // Lazers in the asteroid belt (Tom: "we should not be littering normal components
  // in the asteroid belt"). These four types are the rock's own vocabulary.
  //
  // `mineral: true` is the filter every palette and price table reads; `ore` is what
  // a piece is worth when it is carried off. Shapes are Tom's: rock 3x1 and 2x2,
  // ore 1x1 and 1x2. hp here is a per-tile FLOOR -- a mining field overrides it per
  // component from its own `rockHp`, so the seam's toughness is a field parameter
  // and not an engine constant.
  RockSpar:     {hp: 60,  mineral: true, tiles: [[0,0],[0,1],[0,2]], ins: [], outs: []},
  RockSlab:     {hp: 80,  mineral: true, tiles: [[0,0],[1,0],[0,1],[1,1]], ins: [], outs: []},
  // Ore breaks, and shooting it IS the harvest. Twice rock's 20/tile, so a seam
  // costs about as much fire as the rock hiding it and the answer to wanting more
  // money is more guns and more seams rather than more patience on one.
  //
  // Tom, 2026-08-21: "We want people to shoot multiple ores to get money. Thats the
  // fun, designing a ship that optimizes swarming and mining a lot in parrallel...
  // the game is exploration and mass farming."
  //
  // It was `hp: 1e9` for about six hours -- indestructible, so the only route to a
  // seam was cutting the rock around it until the piece floated free. That removed
  // four deadlocking fire-discipline rules from the miner AI and it also removed the
  // game: an encounter you excavate is one seam at a time, and one seam at a time is
  // not a farm. A field overrides these per component from its own `rockHp`, so the
  // ratio is what is fixed here, not the number.
  Ore:          {hp: 40,  mineral: true, ore: 30, tiles: [[0,0]], ins: [], outs: []},
  OreVein:      {hp: 80,  mineral: true, ore: 75, tiles: [[0,0],[0,1]], ins: [], outs: []}
}
)};

const _BINOPS = function _BINOPS(){return(
{
  PLUS:   (a,b) => a + b,
  MINUS:  (a,b) => a - b,
  TIMES:  (a,b) => a * b,
  DIVIDE: (a,b) => b !== 0 ? a / b : 1,   // original: a/0 === 1
  LT:     (a,b) => a <  b ? 1 : 0,
  GT:     (a,b) => a >  b ? 1 : 0,
  EQ:     (a,b) => a === b ? 1 : 0,
  AND:    (a,b) => Math.min(a, b),        // original used Mathf.Min
  OR:     (a,b) => Math.max(a, b)         // ...and Mathf.Max
}
)};


// Ports are GRID CELLS, not named properties: a connection addresses the cell a
// port sits in ({"from":[2,1],"to":[4,0]}), and the offsets lived in Unity binary
// prefabs that did not survive. Recovered instead by constraint propagation over
// 7,544 connection endpoints in 778 real ships (tools/corepox-ports.py):
// this table explains 99.2% of them, and reproduces all four connections of
// `BrautenbourgsFirst` in components/Resources/composites.json exactly.
// Ports lie ON the component's own tiles (Engine's input is its own (0,0)), which
// constrains them once footprints are known: Binary's output is the T's stem at
// (0,-1), and Radar's two outputs must fall inside its 2x3 body, ruling out (2,0).
// Which Radar port is which was settled by experiment: fighting 40 real corpus
// ships, bearing@(1,0) gives 15% that close on their target, dist@(1,0) gives 3%.

// Structural joints, distinct from the signal PORTS above. Each component CELL has
// 8 joint slots -- two per side -- which is what CoordDir8 encodes and what Tom's
// screenshot shows: connector dots along one cell edge sit ~89px apart against a
// 178px cell pitch, i.e. two per edge. So "the engine is 2x2" is in CONNECTOR
// units; one component cell is 2x2 connector slots. Components stay 1x1 on the
// component grid (492 corpus engine pairs sit one cell apart, impossible for a
// 2x2 body).
//
// Reading rule, from Tom: a CURVED corner in the art does not admit a connector.
// The vector art is in corepox-assets, so the remaining joint arrays are readable
// off the SVG paths rather than guessable -- straight edge segments take joints,
// curved ones do not. Not yet done.
//
// ENGINE FRAME, since 2026-08-19. `tools/corepox-joints-from-art.py` reads the SVG,
// where +y is DOWN, and this table used to carry its output unconverted; the
// browser's component page converted it on load. That conversion produced two
// separate sign bugs and silently dropped LaserTurret2 entirely -- its joints were
// authored from Tom's description in engine frame, so the art-to-engine fit found
// no alignment and returned null. Stored in the frame everything reads it in now,
// and the conversion is gone from the runtime path.
//
// Keys are ENGINE cells (+y FORWARD, the same frame as TYPES.tiles). Sides are
// named from the component's own up. Slot 0 is the half of a side nearer the
// SMALLER coordinate. UNPOPULATED slots are the point -- an Engine has none on its
// nozzle end.
const _JOINTS = function _JOINTS(){return(
{
  // Art-derived (tools/corepox-joints-from-art.py) under Tom's rule: a CURVED
  // corner does not admit a connector, a straight boundary segment does. Two slots
  // per cell side, eight around a 1x1 -- what CoordDir8 encodes, and what the
  // in-game screenshot shows (dots ~89px apart against a 178px cell pitch).
  //
  // Independently reproduces what Tom reported from memory:
  //   Engine "4 joints on the top and top/left/right" -> N:[0,1] E:[1] W:[1] = 4
  //   Lazer  "only connector on the bottom"           -> aft cell only, 4 slots
  //   Binary "the strange joint"                      -> stem has no forward face
  Engine:    {"0,0": {N: [0, 1], E: [1], W: [1]}},
  // Lazer: 4 joints, not the art's 6 (Tom, on the drawing). Two across the aft
  // edge plus the aft-biased corner slot on each side -- the same arrangement the
  // art gives Radar, whose "closest join around the corner" Tom confirmed blind.
  Lazer:     {"0,0": {E: [0], S: [0, 1], W: [0]}},
  Binary:    {"0,-1": {E: [1], W: [1]},
              "-1,0": {N: [1], S: [0, 1], W: [0]},
              "0,0":  {N: [0, 1]},
              "1,0":  {N: [0], E: [0], S: [0, 1]}},
  // Radar CONFIRMED by Tom independently of the art: "joins on one of the 2 length
  // sides (4 joins) plus the closest join around the corner (so 6 joints total)".
  // Here: S[0,1] on both aft cells plus W[0] and E[0]. The art-derived table and
  // Tom's memory agree without either being fitted to the other.
  Radar:     {"0,0": {S: [0, 1], W: [0]}, "1,0": {E: [0], S: [0, 1]}},
  // Orb: 2x2, ONE side connected = 4 joints (Tom). The art-derived table gave all
  // four outward faces (16); that reading is wrong -- the orb symbol is the one
  // that renders as a thin line, so its outline is unreliable.
  Orb:       {"0,0": {S: [0, 1]}, "1,0": {S: [0, 1]}},
  Armour:    {"0,0": {N: [0, 1], E: [0, 1], S: [0, 1], W: [0, 1]}},
  Constant:  {"0,0": {N: [0, 1], E: [0, 1], S: [0, 1], W: [0, 1]}},
  Explosive: {"0,0": {N: [0, 1], E: [0, 1], S: [0, 1], W: [0, 1]}},
  // Brain: 1x1, full 8 like Constant (Tom). The art tool returns 0 slots for it
  // because the brain symbol is 82x77 for one cell -- its pins overhang the cell,
  // so the bounding box is not the body and the face lines land off the outline.
  Brain:     {"0,0": {N: [0, 1], E: [0, 1], S: [0, 1], W: [0, 1]}},
  // LaserTurret2: the joints are on the 2x1 BASE, which is two of the twelve cells
  // TurretFn.Awake() reserves; the other ten are the arc the gun sweeps. 8 joints
  // (Tom) -- "leave one of the 2 length sides open, but that's where the gun pokes
  // out". A 2x1 perimeter is 12 slots; opening one long side leaves exactly 8.
  // This entry was already engine frame, which is why the art-to-engine fit could
  // not place it and the component page showed the turret with no joints at all.
  LaserTurret2: {"0,0": {S: [0, 1], W: [0, 1]}, "1,0": {S: [0, 1], E: [0, 1]}},
  // Recovered from Hyperdrive.prefab, which is also where the footprint above came
  // from. 16 slots, and "sparse" was the right word: the 4-wide head offers two
  // slots on its nose and the two outer columns' aft faces, the rest run down the
  // stem's flanks. Tom's LaserTurret2 entry above is the same shape of claim and
  // the prefab agrees with it, which is the check on this one.
  Hyperdrive: {"-2,1": {S: [0, 1], W: [0]},   "-1,2": {N: [1]},
               "-1,0": {W: [0, 1]},           "0,2":  {N: [0]},
               "-1,-1": {W: [0, 1]},          "0,0":  {E: [0, 1]},
               "0,-1": {E: [0, 1]},           "1,1":  {E: [0], S: [0, 1]}},
  // Minerals bond on every slot of every edge, because rock is welded to rock: a
  // chunk has to be ONE island or splitDetached shatters it at t=0 (measured
  // 2026-08-21: a 53-piece chunk with no JOINTS entry read as 53 islands, since
  // `jointList` returns [] for an absent type and nothing then bonds to anything).
  // Slots facing a piece's own interior are harmless -- `islands` skips a === b.
  RockSpar:  {"0,0": {N: [0, 1], E: [0, 1], S: [0, 1], W: [0, 1]},
              "0,1": {N: [0, 1], E: [0, 1], S: [0, 1], W: [0, 1]},
              "0,2": {N: [0, 1], E: [0, 1], S: [0, 1], W: [0, 1]}},
  RockSlab:  {"0,0": {N: [0, 1], E: [0, 1], S: [0, 1], W: [0, 1]},
              "1,0": {N: [0, 1], E: [0, 1], S: [0, 1], W: [0, 1]},
              "0,1": {N: [0, 1], E: [0, 1], S: [0, 1], W: [0, 1]},
              "1,1": {N: [0, 1], E: [0, 1], S: [0, 1], W: [0, 1]}},
  Ore:       {"0,0": {N: [0, 1], E: [0, 1], S: [0, 1], W: [0, 1]}},
  OreVein:   {"0,0": {N: [0, 1], E: [0, 1], S: [0, 1], W: [0, 1]},
              "0,1": {N: [0, 1], E: [0, 1], S: [0, 1], W: [0, 1]}}
}
)};

const _OVERRIDE_PORT = function _OVERRIDE_PORT(){return(
{input: "in", output: "out", rot_input: "angle", fire_input: "fire",
 angle: "bearing", distance: "dist", a: "a", b: "b"}
)};

const _PORTS = function _PORTS(){return(
{
  Constant:     {outs: {out: [0, 0]},                     ins: {}},
  Radar:        {outs: {bearing: [1, 0], dist: [0, 0]},   ins: {}},
  // a is the LEFT cell and b the right. DelayBomb.prefab wires its own output
  // back to (-1,0) while overriding a=-50, b=1 -- the accumulator has to be `a`
  // or it diverges; FollowCourse's TIMES Binary confirms it independently
  // (radar angle -> the cell that saved a=102.83). Had these the other way
  // round, every MINUS and DIVIDE in the corpus computed backwards.
  Binary:       {outs: {out: [0, -1]},                    ins: {a: [-1, 0], b: [1, 0]}},
  Engine:       {outs: {},                                ins: {in: [0, 0]}},
  Lazer:        {outs: {},                                ins: {in: [0, 0]}},
  Explosive:    {outs: {},                                ins: {in: [0, 0]}},
  LaserTurret2: {outs: {},                                ins: {angle: [0, 0], fire: [1, 0]}},
  Hyperdrive:   {outs: {},                                ins: {in: [0, 0]}},
  // Minerals carry no signal. Present so `portsOfShip` and the renderer can index
  // every type without a guard, not because a rock has anything to say.
  RockSpar:     {outs: {}, ins: {}},
  RockSlab:     {outs: {}, ins: {}},
  Ore:          {outs: {}, ins: {}},
  OreVein:      {outs: {}, ins: {}}
}
)};

// Binary's output is seen at both (0,+1) and (0,-1) in the corpus (364 endpoints
// at the second). Treated as an alternate rather than a separate type.
const _PORT_ALT = function _PORT_ALT(){return(
{Binary: {outs: {out: [0, 1]}}, Radar: {outs: {dist: [2, 0]}}}
)};

const _geom = function _geom(){return(
{
  D: Math.PI / 180,
  unit: (a) => [Math.sin(a * Math.PI / 180), -Math.cos(a * Math.PI / 180)],
  // rotate a ship-local offset into world, clockwise-positive in +Y-down space
  rot: ([x, y], a) => {
    const s = Math.sin(a * Math.PI / 180), c = Math.cos(a * Math.PI / 180);
    return [x * c - y * s, x * s + y * c];
  },
  norm: (a) => { a %= 360; if (a > 180) a -= 360; if (a < -180) a += 360; return a; },
  // bearing from p to q, 0 = up, clockwise positive
  bearing: (px, py, qx, qy) => Math.atan2(qx - px, -(qy - py)) * 180 / Math.PI
}
)};

const _DIRS = function _DIRS(){return(
Object.assign({up: 0, right: 90, down: 180, left: 270}, {
  // A live component carries `dir` in DEGREES, not as a name. Reading `c.dirName`
  // (which never existed) silently treated every rotated part as "up".
  name: (deg) => ["up", "right", "down", "left"][(Math.round(deg / 90) % 4 + 4) % 4]
})
)};

const _rotTile = function _rotTile(){return(
// grid tile rotated clockwise by dir (degrees, multiples of 90)
([x, y], deg) => {
  let n = ((Math.round(deg / 90) % 4) + 4) % 4, p = [x, y];
  for (let i = 0; i < n; i++) p = [p[1], -p[0]];
  return p;
}
)};


// Corpus ships address ports by grid cell. Resolve each endpoint to (component,
// portName) using the recovered PORTS table, so ships.json loads unmodified.
// Unity instance names leak into saved specs two ways: a "(Clone)" suffix on
// anything spawned from a prefab, and a lower-cased "brain" on the older hand-built
// prefabs (Bulldozer, DrifterShip). Both are the same type.
const _TYPE_ALIAS = function _TYPE_ALIAS(TYPES){return(
(t) => {
  const base = String(t).replace(/\(Clone\)(\s*\(\d+\))?$/, "").trim();
  if (TYPES[base]) return base;
  const hit = Object.keys(TYPES).find(k => k.toLowerCase() === base.toLowerCase());
  return hit ?? base;
}
)};

// Relics: prefabs a design may name INSTEAD of carrying inline. 436 of the 2191
// corpus designs were unbuildable without this table -- `new Ship` threw on an
// unknown component -- and they are named, not defined: LazerHardpoint on 417
// designs, BrautenbourgsFirst on 225, DevouringLove on 4
// (tools/scratch/unimpl.ts, 2026-08-20).
//
// These four are the shipped definitions, lifted verbatim out of the corpus pack's
// own `relics` field rather than re-recovered. tools/corepox-relic-parity.ts
// compares this table to the pack field by field and fails on any drift; it is a
// copy because the pack is a shipyard FileAttachment and the shipyard imports the
// engine, so the engine cannot read it.
//
// DevouringLove is NOT here. No definition of it survived any extraction, so its
// 4 designs stay blocked, and a picker that filters on TYPES still has to.
//
// corepox-missions carries its own hand-recovered `braitenbergRelic` and
// `lazerHardpoint` for mission setup. They are the same parts (checked
// 2026-08-20, missions.js:189) but they are mission content, not loader data.
const _RELICS = function _RELICS(){return(
{
  BrautenbourgsFirst: {
    id: "BrautenbourgsFirst", name: "Brautenbourgs First",
    components: [
      {"type":"Engine","pos":[-1,0],"dir":"up","hp":50},
      {"type":"Radar","pos":[0,1],"dir":"up","hp":50},
      {"type":"Engine","pos":[4,0],"dir":"up","hp":50},
      {"type":"Binary","pos":[2,0],"dir":"down","param":"MINUS","hp":100},
      {"type":"Constant","pos":[0,0],"dir":"up","hp":50}],
    connections: [
      {"from":[2,1],"to":[4,0]},
      {"from":[0,0],"to":[3,0]},
      {"from":[1,1],"to":[1,0]},
      {"from":[1,1],"to":[-1,0]}]
  },
  LazerHardpoint: {
    id: "LazerHardpoint", name: "Lazer Turret Hardpoint",
    components: [
      {"type":"LaserTurret2","pos":[0,2],"dir":"up"},
      {"type":"Radar","pos":[0,-1],"dir":"up"},
      {"type":"Armour","pos":[2,-1],"dir":"up"},
      {"type":"Armour","pos":[2,0],"dir":"up"},
      {"type":"Armour","pos":[2,1],"dir":"up"},
      {"type":"Armour","pos":[-1,-1],"dir":"up"},
      {"type":"Armour","pos":[-1,0],"dir":"up"},
      {"type":"Armour","pos":[-1,1],"dir":"up"},
      {"type":"Armour","pos":[2,2],"dir":"up"},
      {"type":"Armour","pos":[-1,2],"dir":"up"}],
    connections: [
      {"from":[1,-1],"to":[0,2]},
      {"from":[0,-1],"to":[1,2]}]
  },
  Minidrone: {
    id: "Minidrone", name: "Mini Drone",
    components: [
      {"type":"Radar","pos":[0,-1],"dir":"down"},
      {"type":"Engine","pos":[-2,-1],"dir":"up"},
      {"type":"Engine","pos":[1,-1],"dir":"up"},
      {"type":"Constant","pos":[-1,0],"dir":"up","param":"25"}],
    connections: [
      {"from":[-1,0],"to":[-2,-1]},
      {"from":[-1,-1],"to":[1,-1]}]
  },
  WeaponStation: {
    id: "WeaponStation", name: "Weapon Station",
    components: [
      {"type":"Engine","pos":[-1,-1],"dir":"right"},
      {"type":"Engine","pos":[2,-1],"dir":"left"},
      {"type":"Radar","pos":[0,-1],"dir":"up"},
      {"type":"Binary","pos":[0,-2],"dir":"up","param":"MINUS"},
      {"type":"Constant","pos":[2,-2],"dir":"up","param":"0"},
      {"type":"Armour","pos":[0,2],"dir":"up"},
      {"type":"Armour","pos":[1,2],"dir":"up"},
      {"type":"Armour","pos":[2,2],"dir":"up"},
      {"type":"Armour","pos":[-1,2],"dir":"up"},
      {"type":"Explosive","pos":[-1,1],"dir":"up"},
      {"type":"Explosive","pos":[-1,0],"dir":"up"},
      {"type":"Explosive","pos":[2,1],"dir":"up"},
      {"type":"Explosive","pos":[2,0],"dir":"up"}],
    connections: [
      {"from":[1,-1],"to":[1,-2]},
      {"from":[0,-3],"to":[-1,-1]},
      {"from":[1,-1],"to":[2,-1]},
      {"from":[2,-2],"to":[-1,-2]}]
  }
}
)};

const _loadShipSpec = function _loadShipSpec(PORTS, PORT_ALT, TYPE_ALIAS, RELICS){return(
(raw, relics = RELICS) => {
  raw = {...raw, components: (raw.components ?? []).map(
    c => ({...c, type: TYPE_ALIAS(c.type)}))};
  // A Composite is a sub-ship, and every instance carries its whole definition
  // inline in `param` (all 228 in the corpus are BrautenbourgsFirst). Splice its
  // components in, translated and rotated by the placement, so the parts are real
  // parts. Left as a 1x1 stub it was the single biggest cause of ships loading in
  // pieces: 43-48% of broken ships contained one vs 8-16% of whole ships.
  {
    // rotTile is the authority on where a component's cells land, so the splice
    // has to turn sub-components the same way it does: clockwise, (x,y)->(y,-x).
    const R = {up: (x, y) => [x, y], right: (x, y) => [y, -x],
               down: (x, y) => [-x, -y], left: (x, y) => [-y, x]};
    const TURN = {up: 0, right: 90, down: 180, left: 270};
    const NAME = ["up", "right", "down", "left"];
    // A sub-ship arrives two ways: a Composite carries its definition inline in
    // `param`, a relic names one in the table. Same splice either way.
    const subOf = (c) => {
      if (c.type === "Composite") {
        try { const s = typeof c.param === "string" ? JSON.parse(c.param) : c.param;
              return s?.components ? s : null; } catch { return null; }
      }
      const r = (relics ?? {})[c.type];
      return r?.components ? r : null;
    };
    // Bounded rather than single-pass: a relic may itself hold a Composite or
    // another relic. The cap is also what stops a relic that names itself.
    for (let depth = 0; depth < 4; depth++) {
      const out = [], extra = [];
      let spliced = false;
      for (const c of raw.components) {
        const sub = subOf(c);
        if (!sub) { out.push(c); continue; }
        spliced = true;
        const r = R[c.dir ?? "up"] ?? R.up, t = TURN[c.dir ?? "up"] ?? 0;
        const map = ([x, y]) => { const [a, b] = r(x, y);
          return [c.pos[0] + a, c.pos[1] + b]; };
        for (const sc of sub.components)
          out.push({...sc, type: TYPE_ALIAS(sc.type), pos: map(sc.pos),
            dir: NAME[(((TURN[sc.dir ?? "up"] ?? 0) + t) / 90) % 4]});
        for (const k of sub.connections ?? [])
          extra.push({from: map(k.from), to: map(k.to)});
      }
      raw = {...raw, components: out,
             connections: [...(raw.connections ?? []), ...extra]};
      if (!spliced) break;
    }
  }
  // world cell -> component-local, so this is the INVERSE of rotTile. Both this
  // and the splice above had it forwards, which is invisible for up/down and
  // exactly backwards for left/right (tools/corepox-rot-probe.ts).
  const rot = {up: (x, y) => [x, y], right: (x, y) => [-y, x],
               down: (x, y) => [-x, -y], left: (x, y) => [y, -x]};
  const comps = raw.components ?? [];
  const find = (cell, kind) => {
    for (const alt of [PORTS, PORT_ALT]) {
      for (const c of comps) {
        const tbl = alt[c.type]?.[kind === "out" ? "outs" : "ins"];
        if (!tbl) continue;
        const [lx, ly] = (rot[c.dir ?? "up"] ?? rot.up)(
          cell[0] - c.pos[0], cell[1] - c.pos[1]);
        for (const name of Object.keys(tbl))
          if (tbl[name][0] === lx && tbl[name][1] === ly) return {c, name};
      }
    }
    return null;
  };
  const conns = [], dropped = [];
  // A spec that NAMES its ports is authoritative; cell resolution exists for the
  // recovered corpus, where the cell is all there is. Re-deriving a declared name
  // is destructive when two ports of one component are addressed through the same
  // cell: gunBoat wires radar `dist` to its turret's `fire` through cell (1,4),
  // which is the turret's ANGLE cell, so both of its wires came out pointing at
  // `angle` and the gun never fired (0 beams loaded vs 52 raw, 6s against a
  // stationary target). Only a name the component actually has is kept.
  const keep = (want, c, kind) => (want && PORTS[c.type]?.[kind]?.[want]) ? want : null;
  for (const k of raw.connections ?? []) {
    const a = find(k.from, "out"), b = find(k.to, "in");
    if (!a || !b) { dropped.push(k); continue; }
    conns.push({from: a.c.pos, fromPort: keep(k.fromPort, a.c, "outs") ?? a.name,
                to: b.c.pos,   toPort:   keep(k.toPort,   b.c, "ins")  ?? b.name});
  }
  return {spec: {...raw, connections: conns}, dropped};
}
)};

const _NEIGHBOURS = function _NEIGHBOURS(){return(
// Structural reach is TWO cells, and that is the physical model, not a fudge.
// Tom's screenshot shows connectors as green dots sitting IN THE GAP between two
// components, two per cell edge, eight around a 1x1 -- which is what CoordDir8
// encodes (a cell plus one of 8 perimeter slots). The stalks project outward, so
// two components separated by one empty cell join when their stalks meet in it.
// Between component BODIES that is a reach of two.
// Checked against the alternatives on 892 corpus ships, composites expanded:
//   4-way 34% multi-island, 8-way 30%, reach-2 17% (with real Engine/Lazer footprints)
// and no footprint assignment rescues 4-way -- the best is 33% and it costs 48%
// overlapping components. Growing Engine to 1x2 or Lazer to 1x3 (which their art
// suggests) trades 5pp of connectivity for 25pp of overlap, so both stay 1x1.
// What is still NOT recovered is WHICH of the 8 slots each component populates
// (`joints: CoordDir8[]`, lost with the binary prefabs), so reach 2 is uniform
// here where the original was per-component.
(() => { const n = []; for (let x = -2; x <= 2; x++) for (let y = -2; y <= 2; y++)
  if (x || y) n.push([x, y]); return n; })()
)};

// Pull the saved connector values that belong to this side of the component.
// ConstantFn.deserialize, verbatim: an empty param means the ship predates
// constants-as-params, and the value is the saved `output` connector value cast
// to int. Without this every old-format Constant reads 0 -- ProximityMine's
// threshold is stored that way (param "", output 4), so the mine could never arm.
const _constantParam = function _constantParam(){return(
(c) => {
  if (c.type !== "Constant") return c.param;
  if (c.param != null && c.param !== "") return c.param;
  const o = (c.overrides ?? []).find(o => o.name === "output");
  return String(o ? Math.trunc(o.value) : 0);
}
)};

const _applyOverrides = function _applyOverrides(OVERRIDE_PORT){return(
(spec, ports) => {
  const out = {};
  for (const o of spec.overrides ?? []) {
    const port = OVERRIDE_PORT[o.name] ?? o.name;
    if ((ports ?? []).includes(port)) out[port] = o.value;
  }
  return out;
}
)};

// Where a component's SENSOR sits, in tiles from its origin tile's centre, in the
// component's own frame (+y forward). RadarFn.cs measures from a `center` child
// object -- `Vector3 here = center.transform.position` -- not from the component's
// own transform, and the shipped sprite says where that child is: the ring centre
// is at (206.7, 204.6)px and the pivot at (111.8, 491.4)px, so the ring sits
// (+0.494, +1.494) tiles from the pivot at 192px to the tile. That is the centre
// of the 2x2 top block to within a hundredth of a tile, which is Tom's "a circle
// for the 2x2 top part". Measuring from the origin tile instead put every `dist`
// reading 1.58 tiles long.
const _SENSOR = function _SENSOR(){return(
{Radar: [0.5, 1.5]}
)};

const _Ship = function _Ship(NEIGHBOURS, JOINTS, TYPES, DIRS, rotTile, geom, DT, UNITS, applyOverrides, constantParam, SENSOR){return(
class Ship {
  constructor(spec, {team = "a", x = 0, y = 0, a = 0} = {}) {
    this.team = team; this.name = spec.name ?? "ship";
    this.x = x; this.y = y; this.a = a;
    this.vx = 0; this.vy = 0; this.w = 0;
    this.comps = (spec.components ?? []).map((c, i) => {
      const T = TYPES[c.type];
      if (!T) throw new Error("corepox-engine: unknown component " + c.type);
      const dir = typeof c.dir === "number" ? c.dir : (DIRS[c.dir ?? "up"] ?? 0);
      return {
        i, type: c.type, px: c.pos[0], py: c.pos[1], dir,
        // maxHp is recorded, not looked up from TYPES later: a spec may set its own
        // hp (a mining field builds its rock at `rockHp` per tile), and the renderer
        // fades a component by hp/maxHp -- against TYPES it faded against a number
        // the component never had.
        // `dmg` is damage CARRIED IN, and it is a separate field from `hp` on
        // purpose: `hp` in a spec declares the part's maximum (a mining field builds
        // rock at `rockHp` per tile), so reusing it for a damaged survivor would make
        // the part read as full and cap its repair at what was left of it. Added
        // 2026-08-21 so a campaign hull carries its damage between nodes -- until
        // then a destroyed component came back whole at the next one
        // (tools/corepox-attrition.ts).
        hp: Math.max(0, (c.hp ?? T.hp) - (c.dmg ?? 0)), maxHp: c.hp ?? T.hp,
        param: constantParam(c), out: applyOverrides(c, T.outs),
        // kept so a rebuilt ship can be written back out: a saved connector value
        // is ship state, and the editor rebuilds the whole ship on every edit
        overrides: c.overrides, in: applyOverrides(c, T.ins), t: 0,
        tiles: T.tiles.map(t => { const [rx, ry] = rotTile(t, dir);
                                  return [c.pos[0] + rx, c.pos[1] + ry]; }),
        // Half-extent of the footprint about the anchor, for broad phase: the
        // furthest cell centre plus that cell's own half tile. Rotation does not
        // change a distance, so it comes off the unrotated table.
        rad: Math.max(...T.tiles.map(([tx, ty]) => Math.hypot(tx, ty))) + 0.5
      };
    });
    this.conns = (spec.connections ?? []).map(k => ({...k}));
    this.reindex();
    this.order = this.topo();
  }

  get live() { return this.comps.filter(c => c.hp > 0); }

  // Two components may not share a cell. Nothing enforced this before, so a
  // build search happily proposed an Engine sitting inside an Explosive and the
  // physics went along with it.
  overlaps() {
    const at = new Map();
    for (const c of this.comps) for (const [tx, ty] of c.tiles) {
      const k = tx + "," + ty;
      if (at.has(k)) return [at.get(k), c, [tx, ty]];
      at.set(k, c);
    }
    return null;
  }

  reindex() {
    // x,y is the world position of the CENTRE OF MASS and worldOf places every tile
    // relative to it, so recomputing the centre without moving the origin teleports
    // the whole ship. It fires on every component death: measured at up to 0.833
    // tiles on the mission ships (tools/corepox-damage-shift.ts), a ship jumping
    // most of a tile sideways the instant it loses a part. Remember the old centre
    // and move the origin by the same amount, rotated into the ship's frame.
    const wasX = this.cx, wasY = this.cy;
    const live = this.live;
    this.tileCount = live.reduce((n, c) => n + c.tiles.length, 0);
    // Mass is per COMPONENT (Constants.MASS_SCALE), spread uniformly over that
    // component's own tiles. Charging 0.1 per TILE made a Radar (6 tiles) six times
    // heavier than a Constant once real footprints landed, and real corpus ships
    // stopped closing on their targets (15% -> 5%).
    this.mass = Math.max(0.1, live.length * 0.1);
    let cx = 0, cy = 0;
    for (const c of live) {
      const mt = 0.1 / c.tiles.length;
      for (const [tx, ty] of c.tiles) { cx += mt * tx; cy += mt * ty; }
    }
    const M = live.length * 0.1;
    this.cx = M ? cx / M : 0;
    this.cy = M ? cy / M : 0;
    // Parallel axis: Icm + d^2*m. Dropping Icm understates inertia by 6-13%,
    // worst on compact ships, because a tile on the centre of mass then
    // contributes nothing. Ship.cs:562 carries the same formula as a comment.
    let I = 0;
    for (const c of live) {
      const mt = 0.1 / c.tiles.length;
      for (const [tx, ty] of c.tiles) {
        const dx = tx - this.cx, dy = ty - this.cy;
        I += mt * (dx * dx + dy * dy + 1 / 6);
      }
    }
    this.I = Math.max(0.05, I);
    if (wasX !== undefined) {                  // undefined on the constructor's call
      const dcx = this.cx - wasX, dcy = this.cy - wasY;
      const sn = Math.sin(this.a * geom.D), cs = Math.cos(this.a * geom.D);
      this.x += dcx * cs + dcy * sn;
      this.y += dcx * sn - dcy * cs;
    }
    this.alive = live.some(c => c.type === "Brain");
  }

  // Where a component's joints sit, in ship tile units. A joint is a POINT on a
  // cell boundary -- two slots per side, eight around a 1x1, which is what
  // CoordDir8 encodes. Metrics.cs:258 offset_x/offset_y give the eight offsets
  // literally, and they are these:
  //
  //   UP_LEFT  (-0.25, 0.5)   LEFT_UP   (-0.5,  0.25)   DOWN_LEFT  (-0.25,-0.5)
  //   UP_RIGHT ( 0.25, 0.5)   LEFT_DOWN (-0.5, -0.25)   DOWN_RIGHT ( 0.25,-0.5)
  //                           RIGHT_UP  ( 0.5,  0.25)   RIGHT_DOWN ( 0.5, -0.25)
  //
  // so slot 0 is the half nearer the smaller coordinate, which is what JOINTS is
  // written to and what corepox-components draws. Being a point, it rotates with
  // the component through the same rotTile the tiles go through.
  jointsOf(c) { return this.jointList(c).map(j => [j.x, j.y]); }

  // One walk of the table, two points out of it, and they are NOT the same point.
  //
  //   x, y     the mating key, at Metrics.cs's +-0.25. Two joints are bound when
  //            these coincide exactly, so the number has to be exact in binary.
  //   mx, my   where the joint is DRAWN: 1/3 and 2/3 of the edge, which is where
  //            every component's leads arrive in Tom's design doc ("Shipyard
  //            Concepts" 5a, "joints at the thirds"). Nothing physical reads it.
  //
  // They are computed together so the two cannot drift apart, and `edge` says
  // which way the shared edge runs AFTER rotation, which is what a mark straddling
  // it needs.
  jointList(c) {
    const tbl = JOINTS[c.type];
    if (!tbl) return [];
    const out = [];
    for (const key in tbl) {
      const cell = key.split(",").map(Number);
      const [rx, ry] = rotTile(cell, c.dir);
      for (const side in tbl[key])
        for (const slot of tbl[key][side]) {
          const a = slot === 0 ? -0.25 : 0.25, d = slot === 0 ? -1 / 6 : 1 / 6;
          const at = (u) => side === "N" ? [u, 0.5] : side === "S" ? [u, -0.5]
                          : side === "E" ? [0.5, u] : [-0.5, u];
          const [ox, oy] = rotTile(at(a), c.dir), [dx, dy] = rotTile(at(d), c.dir);
          out.push({c, x: c.px + rx + ox, y: c.py + ry + oy,
                    mx: c.px + rx + dx, my: c.py + ry + dy,
                    edge: Math.abs(oy) === 0.5 ? "h" : "v"});
        }
    }
    return out;
  }

  // Connectivity over JOINTS, which is what the original does: Connectivity.cs:99
  // disjointSets -> connected() -> adjacent(), which walks a component's joints and
  // looks up `outgoing.opposing()`. Metrics.cs:361 defines opposing() as the SAME
  // POINT reached from the neighbouring cell -- UP_LEFT at (x,y) mates DOWN_LEFT at
  // (x,y+1) -- so two components are bound when their joint points coincide, and
  // only then. Bodies one empty cell apart are not bound however long the drawn
  // stalks look; there is no gap rule in the original and this had one until the
  // C# was read.
  //
  // Components can touch and NOT be bound, which is the point, and the thing tile
  // distance cannot express.
  islands() {
    const meet = new Map();
    for (const c of this.live)
      for (const [x, y] of this.jointsOf(c)) {
        const k = (x * 4) + ":" + (y * 4);
        if (!meet.has(k)) meet.set(k, []);
        meet.get(k).push(c);
      }
    const bond = new Map(this.live.map(c => [c.i, []]));
    for (const grp of meet.values())
      for (const a of grp) for (const b of grp) if (a !== b) bond.get(a.i).push(b);

    const out = [], seen = new Set();
    for (const start of this.live) {
      if (seen.has(start.i)) continue;
      const grp = [], q = [start]; seen.add(start.i);
      while (q.length) {
        const c = q.pop(); grp.push(c);
        for (const n of bond.get(c.i))
          if (!seen.has(n.i)) { seen.add(n.i); q.push(n); }
      }
      out.push(grp);
    }
    return out;
  }

  // The rule this replaced: pure tile distance, reach 2, no joints involved. Kept
  // so the two can be measured against each other (tools/corepox-joint-rule.ts)
  // rather than the switch being argued about.
  islandsByDistance() {
    const at = new Map(), out = [], seen = new Set();
    for (const c of this.live) for (const [tx, ty] of c.tiles) at.set(tx + "," + ty, c);
    for (const start of this.live) {
      if (seen.has(start.i)) continue;
      const grp = [], q = [start]; seen.add(start.i);
      while (q.length) {
        const c = q.pop(); grp.push(c);
        for (const [tx, ty] of c.tiles)
          for (const [dx, dy] of NEIGHBOURS) {
            const n = at.get((tx + dx) + "," + (ty + dy));
            if (n && !seen.has(n.i)) { seen.add(n.i); q.push(n); }
          }
      }
      out.push(grp);
    }
    return out;
  }

  at(x, y) { return this.comps.find(c => c.px === x && c.py === y); }

  topo() {
    const dep = new Map(this.comps.map(c => [c.i, []]));
    for (const k of this.conns) {
      const s = this.at(k.from[0], k.from[1]), d = this.at(k.to[0], k.to[1]);
      if (s && d) dep.get(d.i).push(s.i);
    }
    const seen = new Set(), out = [];
    const visit = (i, stack) => {
      if (seen.has(i) || stack.has(i)) return;      // cycle -> last tick's value
      stack.add(i);
      for (const d of dep.get(i)) visit(d, stack);
      stack.delete(i); seen.add(i); out.push(i);
    };
    for (const c of this.comps) visit(c.i, new Set());
    return out;
  }

  worldOf(c) {
    const lx = c.px - this.cx, ly = -(c.py - this.cy);
    const s = Math.sin(this.a * geom.D), k = Math.cos(this.a * geom.D);
    return [this.x + lx * k - ly * s, this.y + lx * s + ly * k];
  }

  // Every occupied cell of a component, in world coordinates. worldOf returns
  // only the ANCHOR, so anything that tested worldOf against a single radius was
  // modelling a six-cell Radar as one disc -- an enemy could sit in four of those
  // six cells and in three of an Orb's four with nothing to stop it, measured in
  // tools/corepox-hitbox.ts. The original never had this problem: components
  // carry a BoxCollider2D or PolygonCollider2D covering the whole part
  // (fx/Placement.cs:30), and contacts resolve back to a CELL
  // (Ship.cs:581 worldToCoord(contact.point) -> isOccupied).
  worldTiles(c) {
    const s = Math.sin(this.a * geom.D), k = Math.cos(this.a * geom.D);
    return c.tiles.map(([tx, ty]) => {
      const lx = tx - this.cx, ly = -(ty - this.cy);
      return [this.x + lx * k - ly * s, this.y + lx * s + ly * k];
    });
  }

  // worldOf gives the component's ORIGIN tile; a sensor may read from somewhere
  // else on the part (see SENSOR). The offset is in the component's own frame, so
  // it turns with c.dir as well as with the ship.
  sensorOf(c) {
    const o = SENSOR[c.type];
    if (!o) return this.worldOf(c);
    const [wx, wy] = this.worldOf(c);
    const [dx, dy] = geom.rot(o, this.a + (typeof c.dir === "number" ? c.dir : 0));
    return [wx + dx, wy + dy];
  }

  // The inverse: a world point -> the ship-local cell it falls in. Every editor
  // needs it to turn a click into a tile, and a second copy of this arithmetic is
  // a sign error waiting to put a click one cell out -- so it lives beside the
  // forward map that has to agree with it.
  tileOf(wx, wy) {
    const dx = wx - this.x, dy = wy - this.y;
    const s = Math.sin(this.a * geom.D), k = Math.cos(this.a * geom.D);
    const lx = dx * k + dy * s, ly = -dx * s + dy * k;
    return [Math.round(lx + this.cx), Math.round(this.cy - ly)];
  }

  // Unity applied force at a world-unit position to a world-unit inertia. Working
  // in tiles the lever arm is 1/0.64 too long and the inertia 1/0.64^2 too small,
  // so BOTH accelerations pick up the same 1/0.64. The ratio is unchanged -- turn
  // radius is identical either way -- but absolute speed is 1.5625x, which is the
  // difference between matching the original's pace and not.
  force(wx, wy, fx, fy) {
    const k = DT / UNITS.W;
    this.vx += fx / this.mass * k;
    this.vy += fy / this.mass * k;
    const rx = wx - this.x, ry = wy - this.y;
    this.w += (rx * fy - ry * fx) / this.I * k / geom.D;
  }

  // An impulse is a VELOCITY change, so it does not go through force(). force()
  // carries a deliberate 1/UNITS.W = 1.5625x on both its linear and angular terms
  // to make thrust match the original's pace (see the note on it); a collision
  // impulse is an analytic quantity with a restitution already baked in, and
  // scaling it by 1.5625 was turning e = 0.2 into an effective 0.875.
  //
  // Units check: jmag is mass * velocity in the same units velAt reports, so j/mass
  // is a velocity and (r x j)/I is rad/s, converted to the deg/s w is kept in.
  impulse(wx, wy, jx, jy) {
    this.vx += jx / this.mass;
    this.vy += jy / this.mass;
    const rx = wx - this.x, ry = wy - this.y;
    this.w += (rx * jy - ry * jx) / this.I / geom.D;
  }

  propagate() {
    for (const k of this.conns) {
      const s = this.at(k.from[0], k.from[1]), d = this.at(k.to[0], k.to[1]);
      if (!s || !d || s.hp <= 0 || d.hp <= 0) continue;
      const sp = k.fromPort ?? TYPES[s.type].outs[0];
      const dp = k.toPort   ?? TYPES[d.type].ins[0];
      if (sp && dp) d.in[dp] = s.out[sp];
    }
  }

  // velocity of the material point at (wx,wy), including spin
  velAt(wx, wy) {
    const rx = wx - this.x, ry = wy - this.y, wr = this.w * geom.D;
    return [this.vx - wr * ry, this.vy + wr * rx];
  }

  // Detach one island into its own Ship, inheriting the velocity it had at its
  // own centre. The original did this too (Ship.cs:592 maybeSplit) -- a severed
  // fragment must fly off, not ride along as dead weight.
  detach(grp) {
    // A split does not move anything. The ship comes apart; the PARTS stay exactly
    // where they were, and each body leaves with the velocity that body's centre of
    // mass already had. Ship.cs:498 split() does it in three moves:
    //
    //   newGameObject.transform.position = this.transform.position;   // parts stay put
    //   body.centerOfMass = cm0;                                      // sample against the OLD centre
    //   v1 = GetRelativePointVelocity(body.centerOfMass);             // parent, at its new centre
    //   v2 = GetRelativePointVelocity(newBody.centerOfMass);          // fragment, at its centre
    //   newBody.angularVelocity = w0; body.angularVelocity = w0;
    //
    // Copying the transform is enough in Unity because a transform origin is not a
    // centre of mass. Here it is -- ship.x,y IS the centre of mass, which is why
    // reindex has to move the origin when a part dies -- so the fragment has to be
    // placed at ITS centre of mass, in the parent's frame. Setting f.x = this.x
    // instead teleported it: 2.1 tiles for a cut bar and 4.25 for a carrier
    // releasing a drone eight tiles forward, and 145% of the ship's linear momentum
    // invented out of nothing under spin. tools/corepox-split-inertia.ts holds it.
    //
    // Angular velocity goes to both bodies unchanged. That does not conserve
    // angular momentum and it is what the original does, so it is what this does.
    const keep = new Set(grp.map(c => c.i));
    const spec = {name: this.name + "-frag", components: grp.map(c => ({
      // c.dir is DEGREES on a live component, not a name -- reading c.dirName here
      // (undefined) reset every rotated part to "up" on a split.
      type: c.type, pos: [c.px, c.py], dir: DIRS.name(c.dir), param: c.param, hp: c.hp
    })), connections: this.conns.filter(k =>
      keep.has(this.at(k.from[0], k.from[1])?.i) && keep.has(this.at(k.to[0], k.to[1])?.i))};
    const f = new Ship(spec, {team: this.team, a: this.a});

    // the pre-split body, kept because damage() below moves this.x,y and this.cx,cy
    const ox = this.x, oy = this.y, vx0 = this.vx, vy0 = this.vy, w0 = this.w;
    const at0 = (wx, wy) => {
      const rx = wx - ox, ry = wy - oy, wr = w0 * geom.D;
      return [vx0 - wr * ry, vy0 + wr * rx];
    };
    // the fragment's centre of mass is a point in the parent, so place it like one
    const sn = Math.sin(this.a * geom.D), cs = Math.cos(this.a * geom.D);
    const lx = f.cx - this.cx, ly = -(f.cy - this.cy);
    f.x = ox + lx * cs - ly * sn; f.y = oy + lx * sn + ly * cs;
    [f.vx, f.vy] = at0(f.x, f.y);
    f.w = w0;

    // transfer, not destruction: these components are alive on `f` -- see Ship.damage
    for (const c of grp) this.damage(c, c.hp, true); // reindex moves this.x,y to the new centre
    if (this.live.length) [this.vx, this.vy] = at0(this.x, this.y);
    return f;
  }


  integrate() {
    const drag = 1 / (1 + 1.0 * DT);
    this.vx *= drag; this.vy *= drag; this.w *= drag;
    this.x += this.vx * DT; this.y += this.vy * DT;
    this.a = geom.norm(this.a + this.w * DT);
  }

  // ShipComponent.cs:84 damage(): when hp reaches 0 it calls `this.destroy()`, and
  // ExplosiveFn overrides destroy() to fire its 32 fragments first. So a bomb goes
  // off however it dies -- shot, rammed, or touched by an Orb -- and the rule lives
  // HERE rather than at each attacker, which is why the original has it in one place.
  //
  // It used to sit in the particle path alone (`if (died && hit.c.type ===
  // "Explosive")` in World.step), so a bolt set a bomb off and a collision did not:
  // Tom, 2026-08-23, "Explosives don't trigger on contact destruction".
  //
  // `transfer` is the one death that is not a death: Ship.detach removes a component
  // from the parent by damaging it to 0 after copying it into the fragment, and a
  // bomb that detonated every time a hull split would be a different game.
  damage(comp, n, transfer = false) {
    comp.hp -= n;
    if (comp.hp <= 0) {
      comp.hp = 0; this.reindex(); this.order = this.topo();
      if (!transfer && comp.type === "Explosive") this.world?.detonate(this, comp);
      return true;
    }
    return false;
  }
}
)};

// mulberry32. Exported so a benchmark, a test and a replay all draw the same
// stream from the same seed -- a private copy per tool is a copy that drifts.
const _seedRng = function _seedRng(){return(
(seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
)};

const _World = function _World(BINOPS, geom, DT, UNITS){return(
class World {
  static EXHAUST = true;   // off for bulk headless runs: it is most of the cost
  // Exhaust emission is a Poisson sample (Misc.samplePoisson in the original), and
  // exhaust does damage, so any match with a thrusting engine is stochastic. That
  // is faithful, and it makes every benchmark unrepeatable unless the source is
  // swappable: set World.rng to a seeded generator and a run reproduces exactly.
  static rng = Math.random;
  constructor(ships = []) {
    this.ships = ships; this.beams = []; this.particles = [];
    this.t = 0; this.tick = 0;
    // A component's death is resolved on the ship (Ship.damage), but an explosion is
    // particles, and particles live out here. The back-reference is what lets the
    // rule stay in one place.
    for (const s of ships) s.world = this;
  }

  add(ship) { ship.world = this; this.ships.push(ship); return ship; }

  nearestEnemy(ship, wx, wy) {
    let best = null, bd = Infinity;
    for (const s of this.ships) {
      if (s.team === ship.team || !s.live.length) continue;
      for (const c of s.live) {
        const [px, py] = s.worldOf(c);
        const d2 = (px - wx) ** 2 + (py - wy) ** 2;
        if (d2 < bd) { bd = d2; best = {x: px, y: py, ship: s, comp: c}; }
      }
    }
    if (best) best.d = Math.sqrt(bd);
    return best;
  }

  evaluate(ship, c) {
    switch (c.type) {
      case "Constant":
        c.out.out = Number(c.param ?? 0) || 0;
        break;
      case "Binary": {
        const f = BINOPS[c.param ?? "PLUS"] ?? BINOPS.PLUS;
        c.out.out = f(c.in.a ?? 0, c.in.b ?? 0);
        break;
      }
      case "Radar": {
        const [wx, wy] = ship.sensorOf(c);
        const n = this.nearestEnemy(ship, wx, wy);
        if (!n) { c.out.dist = NaN; c.out.bearing = NaN; c.lock = null; break; }
        // RadarFn set distanceOutput to a WORLD-unit distance, so every player
        // program's threshold is in world units. Reporting tiles here silently
        // rescaled every `dist < k` test in the corpus by 1/0.64.
        c.out.dist = n.d * UNITS.W;
        c.out.bearing = geom.norm(geom.bearing(wx, wy, n.x, n.y) - (ship.a + c.dir));
        c.lock = [wx, wy, n.x, n.y];       // what it is looking at, for the renderer
        break;
      }
      case "Engine": {
        const v = c.in.in;
        if (v == null || Number.isNaN(v)) { c.thrust = 0; break; }
        const f = Math.max(0, Math.min(100, v)) / 100;
        c.thrust = f;
        if (f > 0) {
          const [wx, wy] = ship.worldOf(c);
          const [ux, uy] = geom.unit(ship.a + c.dir);
          ship.force(wx, wy, ux * f, uy * f);
          this.exhaust(ship, c, wx, wy, ux, uy, v);
        }
        break;
      }
      case "Lazer": {
        c.t += DT;
        if (c.t > UNITS.BEAM_CYCLE && c.in.in > 0) {
          c.t = 0;
          this.fire(ship, c, ship.a + c.dir);
        }
        break;
      }
      case "LaserTurret2": {
        c.t += DT;
        const want = c.in.angle;
        if (want != null && !Number.isNaN(want)) {
          const err = geom.norm(want - (c.turret ?? 0));
          c.turret = geom.norm((c.turret ?? 0) + err * 0.05);
          // isBetweenAngle(-turretAngle, selfAngle-90, selfAngle+90): the barrel
          // only lives in the forward half-plane of its own mounting, so a target
          // behind the turret cannot be engaged by turning it round.
          c.turret = Math.max(-90, Math.min(90, c.turret));
        }
        if (c.t > UNITS.BEAM_CYCLE && c.in.fire > 0) {
          c.t = 0;
          this.fire(ship, c, ship.a + c.dir + (c.turret ?? 0),
                    {ttl: UNITS.TURRET_TTL, muzzle: UNITS.TURRET_MUZZLE});
        }
        break;
      }
      case "Explosive": {
        if (c.in.in > 0) {
          c.t += DT;
          if (c.t > UNITS.FRAG_CHARGE) this.detonate(ship, c);
        } else c.t = 0;
        break;
      }
    }
  }

  // Firing kicks the ship back at the muzzle. This is the only thing that makes a
  // gun cost something: an off-axis gun spins you off your own firing solution,
  // so gun COUNT and gun PLACEMENT both trade against aim. Added 2026-08-18 after
  // the corpus showed heavy-weapon ships were the best-piloted ones (92% engines,
  // 70% radar) -- guns were pure upside. See plan/corepox-design.md S1.3.
  // NOT IN THE ORIGINAL. LaserFn and TurretFn emit a particle and never touch the
  // body. Off by default, because it is strong enough to change a recovered level:
  // with recoil on, ManualAim solves ITSELF -- the turret's own kick rotates the
  // hull until a beam fired at the wrong angle sweeps across the target anyway.
  static RECOIL = false;
  recoil(ship, c, wx, wy, a) {
    if (!World.RECOIL) return;
    const [ux, uy] = geom.unit(a);
    const k = 8;
    ship.force(wx, wy, -ux * k, -uy * k);
  }

  // Every weapon in the original was the same object: a Damage with a velocity, a
  // ttl and a dmg, which hits the first component it touches that is not its own
  // emitter (DamageParticle.cs:12, `component != this.owner`). Note what that does
  // NOT exclude -- your own ship. Your exhaust burns your own tail, your own
  // shrapnel shreds you, and a bolt from a rear gun can hit your own nose.
  emit(ship, comp, kind, x, y, vx, vy, ttl, dmg, extra = {}) {
    const [sx, sy] = ship.velAt(x, y);          // particles inherit ship velocity
    // ttl0 is the life it was BORN with, and it is purely for the renderer: an
    // exhaust particle's ttl is World.rng(), so remaining ttl alone cannot say
    // how far through its life it is. Consumes no rng, so determinism is
    // unaffected (tools/corepox-determinism.ts).
    this.particles.push({kind, ship, comp, x, y, vx: vx + sx, vy: vy + sy,
                         ttl, ttl0: ttl, dmg, ...extra});
  }

  fire(ship, c, a, {ttl = UNITS.BEAM_TTL, muzzle = UNITS.BEAM_MUZZLE} = {}) {
    const [ux, uy] = geom.unit(a);
    // NOT offset by TYPES[c.type].pivot, though TurretFn's emitParticle argues it
    // should be: it TransformPoints (0, 1.8) off `lazer`, the rotating barrel,
    // whose transform sits at the pivot. Tried 2026-08-21. Half a tile of lateral
    // bias is enough to break the two missions built around the radar-to-turret
    // wire -- Aim goes from a 24.7s win to a 25.1s loss, TwinTurrets to a 10.5s
    // loss -- which says the pivot value, the radar's sensor offset, or both are
    // wrong, and that is its own investigation rather than a line in this one.
    const [cx, cy] = ship.worldOf(c);
    this.emit(ship, c, "beam", cx + ux * muzzle, cy + uy * muzzle,
              ux * UNITS.BEAM_SPEED, uy * UNITS.BEAM_SPEED,
              ttl, UNITS.BEAM_DMG, {a});
    this.recoil(ship, c, cx, cy, a);
  }

  exhaust(ship, c, wx, wy, ux, uy, magnitude) {
    if (!World.EXHAUST) return;
    // Misc.samplePoisson(EMIT * magnitude * dt), by Knuth. At full thrust lambda
    // is 2, so this is a stream of damage behind you, not an occasional spark.
    const lam = UNITS.EXHAUST_RATE * Math.max(0, Math.min(100, magnitude)) * DT;
    let n = 0, p = World.rng();
    const L = Math.exp(-lam);
    while (p > L && n < 8) { n++; p *= World.rng(); }
    for (let i = 0; i < n; i++)
      this.emit(ship, c, "exhaust",
                wx - ux * UNITS.EXHAUST_BACK, wy - uy * UNITS.EXHAUST_BACK,
                -ux * UNITS.EXHAUST_SPEED, -uy * UNITS.EXHAUST_SPEED,
                World.rng(), UNITS.EXHAUST_DMG);
  }

  // ExplosiveFn.destroy(): 32 fragments evenly around a circle, then the component
  // removes itself. It runs on DESTRUCTION, not only on trigger, which is why a
  // hit on a loaded bomb takes its neighbours with it.
  detonate(ship, c) {
    if (c.spent) return;
    c.spent = true;
    const [wx, wy] = ship.worldOf(c);
    for (let i = 0; i < UNITS.FRAG_N; i++) {
      const r = (i * Math.PI * 2) / UNITS.FRAG_N;
      this.emit(ship, c, "frag", wx, wy,
                Math.sin(r) * UNITS.FRAG_SPEED, -Math.cos(r) * UNITS.FRAG_SPEED,
                UNITS.FRAG_TTL, UNITS.FRAG_DMG);
    }
    if (c.hp > 0) ship.damage(c, c.hp);
  }

  // Move every particle, then damage the first component its swept segment
  // crosses. A bolt covers 0.625 tiles a tick against a half-tile component, so
  // the test is against the segment, not the point, or fast shots tunnel.
  // TUNING TARGET. 43% of the tick in an 8-ship melee of 203-part hulls, 13.26ms
  // of a 28.69ms tick (measured 2026-08-22, `bun tools/corepox-melee-bench.ts`).
  // Every particle is tested against every ship: 72228 particle x ship pairs a
  // tick, and the per-component broad phase below calls worldOf, which recomputes
  // this.a's sin/cos every time. Not tuned yet -- measure before and after with
  // that tool, it prints phase split and operation counts.
  stepParticles() {
    const alive = [];
    for (const b of this.particles) {
      const x0 = b.x, y0 = b.y;
      b.x += b.vx * DT; b.y += b.vy * DT; b.ttl -= DT;
      let tx = x0, ty = y0;
      if (b.kind === "beam") {                  // a bolt has length; its tail hits too
        const sp = Math.hypot(b.vx, b.vy) || 1;
        tx = x0 - b.vx / sp * UNITS.BEAM_LEN; ty = y0 - b.vy / sp * UNITS.BEAM_LEN;
      }
      const sx = b.x - tx, sy = b.y - ty, ss = sx * sx + sy * sy;
      const R = UNITS.HIT_R + (b.kind === "beam" ? UNITS.BEAM_R : 0);
      let hit = null, bestT = Infinity, bestD2 = Infinity;
      for (const s of this.ships) {
        if (!s.live.length) continue;
        const ddx = s.x - b.x, ddy = s.y - b.y;
        if (ddx * ddx + ddy * ddy > 2500) continue;                  // broad phase
        for (const c of s.live) {
          if (c === b.comp) continue;                    // never its own emitter
          const [cx0, cy0] = s.worldOf(c);               // component broad phase
          let ct = ss ? ((cx0 - tx) * sx + (cy0 - ty) * sy) / ss : 0;
          ct = ct < 0 ? 0 : ct > 1 ? 1 : ct;
          const cqx = tx + sx * ct - cx0, cqy = ty + sy * ct - cy0;
          const rr = c.rad + R;
          if (cqx * cqx + cqy * cqy > rr * rr) continue;
          for (const [px, py] of s.worldTiles(c)) {
            // Where the swept point ENTERS this cell's disc. The test used to be
            // "closest approach to the component's anchor, nearest wins", which
            // shot through hulls: a beam running down a Radar's outer cell column
            // passes 1.0 tiles from the Radar's anchor and 0.0 from a Brain
            // sheltering behind it, so the Brain took the shot
            // (tools/corepox-hitbox.ts). The original cannot do that -- a beam is
            // a physics trigger and damages the first collider it enters
            // (behaviour/DamageBeam.cs:59).
            const fx = tx - px, fy = ty - py;
            const bq = fx * sx + fy * sy, cq = fx * fx + fy * fy - R * R;
            let t0;
            if (cq <= 0) t0 = 0;                         // the segment starts inside
            else if (!ss) continue;                      // stationary, and outside
            else {
              const disc = bq * bq - ss * cq;
              if (disc < 0) continue;                    // misses the cell entirely
              t0 = (-bq - Math.sqrt(disc)) / ss;
              if (t0 < 0 || t0 > 1) continue;            // not within this tick's travel
            }
            // Several cells can share an entry of 0 -- that is the case where the
            // segment starts inside them, which is what a muzzle buried in its own
            // hull looks like. Break the tie on distance rather than on whichever
            // component happens to be listed first.
            const gx = fx + sx * t0, gy = fy + sy * t0, d2 = gx * gx + gy * gy;
            if (t0 > bestT || (t0 === bestT && d2 >= bestD2)) continue;
            bestT = t0; bestD2 = d2; hit = {s, c, px: tx + sx * t0, py: ty + sy * t0};
          }
        }
      }
      if (hit) {
        b.hx = hit.px; b.hy = hit.py; b.hitOk = true;
        hit.s.damage(hit.c, b.dmg);          // a destroyed Explosive detonates in there
      } else if (b.ttl > 0) alive.push(b);
    }
    this.particles = alive;
    this.beams = this.particles.filter(b => b.kind === "beam");
  }

  // Tile-vs-tile contact between ships, resolved as an impulse, with damage
  // proportional to the normal impulse. The original left this as a flat
  // component.damage(5) per contact and a "TODO force based impact damage"
  // (Ship.cs:586) -- so ramming never actually worked there.
  //
  // TUNING TARGET. 41% of the tick in the same melee, 12.67ms of 28.69ms. The
  // outer loop is every ship PAIR, and a melee shatters: 8 ships become 164 within
  // 0.8s, so 12090 pairs a tick reach the broad phase below. That broad phase is on
  // ship CENTRES at 30 tiles, which a 461-tile hull exceeds on its own. Note also
  // that B.worldTiles(cb) is inside the ca loop and allocates per pair. Not tuned
  // yet -- `bun tools/corepox-melee-bench.ts`.
  collide() {
    const live = this.ships.filter(s => s.alive || s.live.length);
    for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
      const A = live[i], B = live[j];
      const dx = B.x - A.x, dy = B.y - A.y;
      if (dx*dx + dy*dy > 900) continue;                       // broad phase
      // Damage is per component pair, the way Ship.OnCollisionStay2D damages the
      // cell under every contact point. The IMPULSE is not: Unity resolves one
      // collision between two rigid bodies however many colliders touch, and
      // applying a full impulse and a full depenetration per pair multiplies both
      // by the contact area -- which is what happens the moment footprints stop
      // being single points and a flush hull registers six pairs instead of one.
      // The contact MANIFOLD, not one point of it. Keeping only the deepest cell
      // pair meant a flush face-on hit -- where four pairs are exactly equidistant
      // -- was resolved wherever iteration order happened to land, i.e. at a
      // corner, which spun both hulls up on a collision that is symmetric about the
      // line of centres. One impulse per body pair is still right; it just has to
      // act at the centroid of the contact and along the average normal.
      let deep = null, nc = 0, sax = 0, say = 0, sbx = 0, sby = 0, snx = 0, sny = 0;
      for (const ca of A.live) {
       const [cax, cay] = A.worldOf(ca), ta = A.worldTiles(ca);
       for (const cb of B.live) {
        const [cbx, cby] = B.worldOf(cb);
        const rr = ca.rad + cb.rad;                            // component broad phase
        if ((cbx - cax) ** 2 + (cby - cay) ** 2 > rr * rr) continue;
        // The CLOSEST pair of CELLS. Testing the two ANCHORS instead was the bug:
        // a Radar is six cells and an Orb four, so most of both was empty space --
        // tools/corepox-hitbox.ts measured 4 of 6 and 2 of 4 as passable.
        let bd = Infinity, ax = 0, ay = 0, bx = 0, by = 0;
        for (const [px, py] of ta) for (const [qx, qy] of B.worldTiles(cb)) {
          const dd = (qx - px) ** 2 + (qy - py) ** 2;
          if (dd < bd) { bd = dd; ax = px; ay = py; bx = qx; by = qy; }
        }
        const d = Math.sqrt(bd);
        if (d > 1) continue;                                   // two unit cells, r 0.5 each
        let nx = bx - ax, ny = by - ay;
        if (d === 0) {
          // Dead-centre cells have no contact normal to read off. `continue`ing
          // on that case is why EVERY anchor cell measured as passable: the probe
          // parks the intruder exactly on a cell centre. Push along the line of
          // ship centres instead.
          const cd = Math.hypot(dx, dy);
          nx = cd ? dx / cd : 1; ny = cd ? dy / cd : 0;
        } else { nx /= d; ny /= d; }
        const [avx, avy] = A.velAt(ax, ay), [bvx, bvy] = B.velAt(bx, by);
        const rel = (bvx - avx) * nx + (bvy - avy) * ny;
        if (rel > 0) continue;                                 // separating
        // Ship.OnCollisionStay2D: a flat 5 to the cell under each contact point,
        // EVERY frame the two stay in contact -- 250 dmg/s, not an impulse. It is
        // why a rocket that reaches you is fatal and why armour (100hp, 0.4s of
        // contact) buys time rather than immunity. The old impulse model
        // (jmag * 2) was invented and read as a much softer bump.
        A.damage(ca, UNITS.RAM_DMG); B.damage(cb, UNITS.RAM_DMG);
        nc++; sax += ax; say += ay; sbx += bx; sby += by; snx += nx; sny += ny;
        if (!deep || d < deep.d) deep = {d, nx, ny, ax, ay, bx, by, rel};
       }
      }
      if (!deep) continue;
      // Fixed 2026-08-22 (`bun tools/corepox-collision-energy.ts` is the gate; it
      // failed on three checks before this and passes after). It used to create
      // energy, all of it rotational: two identical bricks meeting face to face on
      // y = 0 left the contact at +/-297 deg/s and the total went 80.66 -> 183.42 in
      // one tick, on a collision that by symmetry must produce no spin at all.
      //
      // The standard 2D rigid-body impulse, which is energy non-increasing for
      // e <= 1 -- the previous denominator was the LINEAR one only, so the rotation
      // it induced at an offset contact was never paid for and came out free.
      //
      //   j = -(1 + e) * v_rel . n / (1/mA + 1/mB + (rA x n)^2/IA + (rB x n)^2/IB)
      //
      // Nothing here is a Unity compatibility shim any more (Tom, 2026-08-22: "we
      // are not on unity anymore so all those old things are not relevant"), so the
      // impulse is applied as an impulse rather than as a force scaled for thrust.
      const cax = sax / nc, cay = say / nc, cbx = sbx / nc, cby = sby / nc;
      let mnx = snx / nc, mny = sny / nc;
      const nl = Math.hypot(mnx, mny);
      // Opposed normals across a wrap-around contact can cancel; fall back to the
      // deepest pair's normal rather than dividing by zero.
      if (nl < 1e-9) { mnx = deep.nx; mny = deep.ny; } else { mnx /= nl; mny /= nl; }
      // rel has to be read where the impulse ACTS, not at some other cell.
      const [avx, avy] = A.velAt(cax, cay), [bvx, bvy] = B.velAt(cbx, cby);
      const rel = (bvx - avx) * mnx + (bvy - avy) * mny;
      // Separating at the CENTROID while individual cells were still closing is
      // possible under spin. Skip the impulse then, but still depenetrate below --
      // `continue`ing here would leave the two hulls overlapped indefinitely.
      if (rel < 0) {
        const ran = (cax - A.x) * mny - (cay - A.y) * mnx;     // (r x n), z only
        const rbn = (cbx - B.x) * mny - (cby - B.y) * mnx;
        const denom = 1 / A.mass + 1 / B.mass + ran * ran / A.I + rbn * rbn / B.I;
        const jmag = -(1 + UNITS.RESTITUTION) * rel / denom;
        A.impulse(cax, cay, -mnx * jmag, -mny * jmag);
        B.impulse(cbx, cby,  mnx * jmag,  mny * jmag);
      }
      const push = (1 - deep.d) * 0.5;                         // depenetrate
      A.x -= deep.nx * push; A.y -= deep.ny * push;
      B.x += deep.nx * push; B.y += deep.ny * push;
    }
  }

  // A ship cut in two becomes two ships.
  splitDetached() {
    for (const s of [...this.ships]) {
      if (!s.live.length) continue;
      const isl = s.islands();
      if (isl.length < 2) continue;
      isl.sort((a, b) => b.length - a.length);
      for (const grp of isl.slice(1)) this.add(s.detach(grp));   // `add`, so the fragment knows its world
    }
  }

  step() {
    for (const ship of this.ships) {
      // Claimed every tick rather than only in `add`: four modules build their world
      // by pushing onto `world.ships` directly (corepox-game, corepox-lab), and a
      // ship that did not know its world would be one whose bombs did not go off --
      // a back-reference set at insertion is a back-reference someone will bypass.
      ship.world = this;
      if (!ship.live.length) continue;
      ship.propagate();
      for (const i of ship.order) {
        const c = ship.comps[i];
        if (c.hp > 0) this.evaluate(ship, c);
      }
      ship.integrate();
    }
    // Weapons are particles now, so this is where every one of them lands --
    // beams, shrapnel and exhaust alike, on friend and foe.
    this.stepParticles();
    // Orb: contact damage to EVERYTHING touching, which is what MeleeFn does.
    //
    // This used to test `worldOf(c)` -- the component's ORIGIN tile -- against the
    // single nearest enemy at 1.2 tiles for 1 damage. Three errors compounding: the
    // damage circle sat half a tile off in both axes because the Orb is 2x2 and its
    // trigger is centred on the square, not on the origin tile; only one component
    // could ever be hit however many were inside; and it hit for a fifth of the
    // real amount. Tom, 2026-08-20: "The orb doesn't seem to do damage when it is
    // overlapping an enemy" -- an enemy against the far corner sat 1.4 tiles from
    // the origin tile and so outside the old test entirely.
    //
    // BOTH sides are modelled as an HIT_R disc on every occupied CELL, the same
    // way the particle path and collide() model them. Measuring ORB_R from ONE
    // point -- the centroid of the 2x2 -- is a radius of 1.067 tiles about a
    // square whose own cell centres are already 0.707 out, so it stops 0.36 tiles
    // short of its own edge. That was survivable only while hulls could
    // interpenetrate: once footprints are solid, contact happens at a cell
    // separation of 1.0 and a centre-measured Orb can never reach anything at all
    // (tools/corepox-ram.ts: Orb into a Brain, both untouched, gap 2.01). Per
    // cell, the reach is 1.067 from a cell centre against contact at 1.0 -- which
    // is what "touching" means, and what MeleeFn's damageArea.GetContacts returns.
    for (const s of this.ships) {
      if (!s.live.length) continue;
      for (const c of s.live) {
        if (c.type !== "Orb") continue;
        const mine = s.worldTiles(c);
        const R = UNITS.ORB_R + UNITS.HIT_R;
        // NOT a team check. MeleeFn has none -- it damages every ShipComponent the
        // trigger touches. What it cannot touch is its OWN ship: every component
        // of a ship shares one Rigidbody2D, and Unity generates no contacts
        // between colliders on the same body. So the exemption is the ship, and a
        // friendly that drifts into your Orb takes 5 a tick like anyone else.
        // Tom, 2026-08-21: "perhaps a component from the same team does not
        // collide? That seems wrong as well".
        for (const e of this.ships) {
          if (e === s || !e.live.length) continue;
          for (const t of e.live)
            if (e.worldTiles(t).some(([px, py]) =>
                  mine.some(([ox, oy]) => (px - ox) ** 2 + (py - oy) ** 2 <= R * R)))
              e.damage(t, UNITS.ORB_DMG);         // once per component, not per cell
        }
      }
    }
    this.collide();
    this.splitDetached();
    this.tick++; this.t += DT;
    return this;
  }
}
)};

const _simulate = function _simulate(World, Ship){return(
// Headless match. Returns the outcome plus a sampled trace, which is what makes
// a control-loop bug findable -- rendering alone does not show it.
(specA, specB, {ticks = 3000, start = 40, sample = 25} = {}) => {
  const a = new Ship(specA, {team: "a", x: -start / 2, y: 0, a: 90});
  const b = new Ship(specB, {team: "b", x:  start / 2, y: 0, a: -90});
  const w = new World([a, b]);
  const trace = [];
  for (let i = 0; i < ticks; i++) {
    w.step();
    if (i % sample === 0) {
      const n = w.nearestEnemy(a, a.x, a.y);
      trace.push({t: +w.t.toFixed(2), dist: n ? +n.d.toFixed(2) : null,
                  ax: +a.x.toFixed(2), ay: +a.y.toFixed(2), aa: +a.a.toFixed(1),
                  aLive: a.live.length, bLive: b.live.length});
    }
    if (!a.alive || !b.alive) break;
  }
  return {
    winner: a.alive && !b.alive ? "a" : b.alive && !a.alive ? "b" : "draw",
    ticks: w.tick, seconds: +w.t.toFixed(2), trace,
    a: {live: a.live.length, alive: a.alive},
    b: {live: b.live.length, alive: b.alive}
  };
}
)};

const _title = function _title(md){return(
md`# Corepox engine

Physics, dataflow and damage. No DOM — it runs headless, which is what lets the same code resolve a
battle in the browser and verify a ladder result outside it.`
)};

// ---------------------------------------------------------------------------
// The robot pilot. Ship.force is LINEAR in throttle, so throttles -> (ax, ay,
// alpha) is a constant 3xn matrix and piloting is control allocation, not a
// script: the player names an intent and the solver works out which nozzles.
// Measured 2026-08-20 over 200 corpus ships, 25-tile waypoint, 40s cap
// (tools/corepox-autopilot.ts): 70.5% arrive, median 12.6s. The ships that fail
// are the ones that cannot torque both ways (3.1% arrive against 83.3%), which
// is the point -- the solver is handed the same matrix either way, so the
// failure belongs to the build.

// One column per Engine the pilot may command: [ax, ay, alpha] at full throttle,
// ship frame. Two filters, each of which cost a wrong answer to find:
//   own island -- the Brain pilots what it is attached to and nothing else
//   unwired    -- Ship.propagate writes only ports that carry a connection, so a
//                 directly set in.in survives the tick; a wired engine is a
//                 program's, not the pilot's
// There was a third, `powered`, until the power budget was removed on 2026-08-20.
const _pilotActuators = function _pilotActuators(geom){return(
(ship, {all = false} = {}) => {
  const withBrain = ship.islands().filter(g => g.some(c => c.type === "Brain" && c.hp > 0));
  if (!withBrain.length) return [];
  const grp = withBrain.reduce((a, b) => (b.length > a.length ? b : a));
  const cols = [];
  for (const c of grp) {
    if (c.type !== "Engine") continue;
    if (!all && ship.conns.some(k => k.to[0] === c.px && k.to[1] === c.py)) continue;
    const lx = c.px - ship.cx, ly = -(c.py - ship.cy);
    const [dx, dy] = geom.unit(c.dir);
    const ux = dx / ship.mass, uy = dy / ship.mass;
    // The torque row is NOT divided by mass. Ship.force divides only the linear
    // term (`vx += fx/mass*k` against `w += (r x f)/I * k/D`), so building t out of
    // ux,uy understated every hull's turn authority by exactly its own mass --
    // 400/400 corpus ships measured model x mass (tools/corepox-thrust-moment.ts,
    // 2026-08-21). That is what made a big ship turn worse than a small one for no
    // reason a player could see, and it fed yawP, which sets the turn profile.
    cols.push({c, ux, uy, t: (lx * dy - ly * dx) / ship.I});
  }
  return cols;
}
)};

// min over f in [0,1]^n of || diag(wt) (A f - b) ||^2, by cyclic coordinate
// descent. n is the engine count -- median 3, max 13 across the corpus -- so an
// exact per-coordinate step converges in a handful of sweeps.
const _pilotAllocate = function _pilotAllocate(){return(
(A, b, wt, sweeps = 24) => {
  const n = A.length, f = new Array(n).fill(0);
  const col = A.map(a => [a.ux, a.uy, a.t]);
  const diag = col.map(c => wt[0] * c[0] ** 2 + wt[1] * c[1] ** 2 + wt[2] * c[2] ** 2);
  const r = [-b[0], -b[1], -b[2]];
  for (let s = 0; s < sweeps; s++)
    for (let i = 0; i < n; i++) {
      if (diag[i] < 1e-12) continue;
      const g = wt[0] * col[i][0] * r[0] + wt[1] * col[i][1] * r[1] + wt[2] * col[i][2] * r[2];
      const step = Math.max(-f[i], Math.min(1 - f[i], -g / diag[i]));
      if (!step) continue;
      f[i] += step;
      for (let k = 0; k < 3; k++) r[k] += step * col[i][k];
    }
  return {f, residual: Math.hypot(r[0], r[1], r[2])};
}
)};

// The flight model is READ OFF THE BUILD, never configured. h(d), the support
// function of the reachable force set, is max thrust in body direction d, so the
// best thrust axis and the isotropy both fall out of one sweep. Body +y is not
// assumed to be the nose: a hull whose engines all point sideways flies sideways.
const _flightModel = function _flightModel(geom, UNITS){return(
(A) => {
  const KL = 1 / UNITS.W, TAU = 1;
  let phi = 0, ax = 0, ay = -1, hi = 0, lo = Infinity;
  for (let k = 0; k < 72; k++) {
    const th = k * 5, [dx, dy] = geom.unit(th);
    let h = 0;
    for (const a of A) h += Math.max(0, a.ux * dx + a.uy * dy);
    if (h > hi) { hi = h; ax = dx; ay = dy; phi = th; }
    if (h < lo) lo = h;
  }
  let p = 0, n = 0;
  for (const a of A) { p += Math.max(0, a.t); n += Math.max(0, -a.t); }
  return {rocket: lo < 0.2 * hi, axis: [ax, ay], phi,
          vmax: KL * hi * TAU, yawP: p * KL / geom.D, yawN: n * KL / geom.D};
}
)};

// Guns are not part of the allocation: a fixed Lazer points where the hull points,
// so its trigger carries no aiming decision. A LaserTurret2 has an aim, and the aim
// is what a wire is for -- the pilot never writes a turret port (Tom, 2026-08-20).
const _fireGuns = function _fireGuns(){return(
(ship, cmd) => {
  if (cmd.fire === undefined) return;
  for (const c of ship.live)
    if ((c.type === "Lazer" || c.type === "Explosive") &&
        !ship.conns.some(k => k.to[0] === c.px && k.to[1] === c.py))
      c.in.in = cmd.fire ? 100 : 0;
}
)};

// pilot(ship, {target, face, drive, fire}) -- writes engine throttles for one tick.
// `memo` is per-ship scratch the caller owns; it latches the turn direction.
const _pilot = function _pilot(pilotActuators, pilotAllocate, flightModel, fireGuns, geom, UNITS){return(
(ship, cmd = {}, memo = {}, A = pilotActuators(ship)) => {
  for (const a of A) a.c.in.in = 0;
  if (!A.length) return {residual: 0, err: 0, model: null, throttles: []};
  const KL = 1 / UNITS.W, KA = KL / geom.D, TAU = 1;
  const G = {vel: 2.4, rate: 3.2, torque: 8};
  const R = flightModel(A);
  let bx = 0, by = 0, want = cmd.face ?? ship.a;

  // Direct drive (WASD). Same allocator, different demand: instead of deriving a
  // wrench from a waypoint the caller names one outright, as a fraction of what
  // this hull can produce. thrust and yaw are each -1..1, and each is scaled by
  // the authority the build actually has in that direction -- so a hull with no
  // reverse ignores S and one with no yaw ignores A/D, which is the same "the
  // failure is the build's" property the waypoint mode has.
  if (cmd.drive) {
    const {thrust = 0, yaw = 0} = cmd.drive;
    let along = 0;
    for (const a of A)
      along += Math.max(0, a.ux * R.axis[0] * Math.sign(thrust || 1) +
                          a.uy * R.axis[1] * Math.sign(thrust || 1));
    // yaw is a RATE demand, not a torque one. Asking for zero torque only means
    // "add no spin" -- it does not take away the spin the hull's own asymmetry is
    // producing, so holding W turned 19 of 40 corpus ships at more than 5 deg/s
    // (tools/corepox-drive-yaw.ts, 2026-08-21). Asking for zero RATE closes the
    // loop on what the player can see. Full deflection asks for the terminal rate
    // the build can hold, yawP*TAU, which is the same "the failure is the build's"
    // property as everywhere else.
    const alpha = G.rate * (yaw * (yaw >= 0 ? R.yawP : R.yawN) * TAU - ship.w) / KA;
    // Both demands are asked for as a FRACTION of this hull's own authority. A flat
    // [1,1,2] compares tiles/s^2 against a torque row two orders of magnitude
    // smaller, so the allocator served position and treated rotation as rounding:
    // holding D alone turned the median ship 4.68 deg/s when it could do 21.7. The
    // normalised weights also make the feel independent of ship size.
    const hi = R.vmax / (KL * TAU), aMax = Math.max(R.yawP, R.yawN) * geom.D / KL;
    const wl = 1 / Math.max(1e-9, hi * hi), wa = 2 / Math.max(1e-18, aMax * aMax);
    const b = [R.axis[0] * thrust * along, R.axis[1] * thrust * along, alpha];
    const out = pilotAllocate(A, b, [wl, wl, wa]);
    A.forEach((a, i) => { a.c.in.in = out.f[i] * 100; });
    fireGuns(ship, cmd);
    return {residual: out.residual, err: 0, model: R, throttles: out.f};
  }

  if (cmd.target && R.vmax > 1e-6) {
    const ex = cmd.target[0] - ship.x, ey = cmd.target[1] - ship.y;
    const d = Math.hypot(ex, ey) || 1e-9;
    // Drag is first order with TAU = 1s, so a ship carrying v coasts about v*TAU
    // further. Commanding d/TAU is the fastest approach that still stops, and it
    // has to be, because 61% of the corpus cannot thrust aft at all.
    const sp = Math.min(R.vmax * 0.9, d / TAU);
    const vx = ex / d * sp, vy = ey / d * sp;
    const wx = G.vel * (vx - ship.vx) + vx / TAU, wy = G.vel * (vy - ship.vy) + vy / TAU;
    const mag = Math.hypot(wx, wy);
    if (cmd.face == null) {
      // Point the strongest thrust axis at the demand, and gate the burn on how
      // well the nose already agrees -- without the gate a rocket fights itself.
      want = geom.norm(geom.bearing(0, 0, wx, wy) - R.phi);
      const gate = Math.max(0, Math.cos(geom.norm(want - ship.a) * geom.D));
      bx = R.axis[0] * mag * gate / KL; by = R.axis[1] * mag * gate / KL;
    } else {
      const [rx, ry] = geom.rot([wx, wy], -ship.a);          // world -> body
      bx = rx / KL; by = ry / KL;
    }
  }

  // Time-optimal turn against the authority this build actually has. Near 180 the
  // sign of the error chatters tick to tick, so the direction is latched until the
  // turn is well under way; without it a two-engine hull oscillated at +-179 for 20s.
  const err = geom.norm(want - ship.a);
  if (Math.abs(err) > 150) { if (memo.turn === undefined) memo.turn = R.yawP >= R.yawN ? 1 : -1; }
  else memo.turn = undefined;
  const sweep = memo.turn === undefined ? err
    : memo.turn > 0 ? (err + 360) % 360 : -((360 - err) % 360);
  const amax = Math.max(1e-6, sweep >= 0 ? R.yawP : R.yawN);
  const wWant = Math.sign(sweep) * Math.min(Math.sqrt(2 * amax * Math.abs(sweep)), 300);
  const alpha = G.rate * (wWant - ship.w) / KA;

  const out = pilotAllocate(A, [bx, by, alpha], [1, 1, G.torque]);
  A.forEach((a, i) => { a.c.in.in = out.f[i] * 100; });

  fireGuns(ship, cmd);
  return {residual: out.residual, err, model: R, throttles: out.f};
}
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  $def("_title", "title", ["md"], _title);
  $def("_DT", "DT", [], _DT);
  $def("_UNITS", "UNITS", [], _UNITS);
  $def("_seedRng", "seedRng", [], _seedRng);
  $def("_TYPES", "TYPES", [], _TYPES);
  $def("_BINOPS", "BINOPS", [], _BINOPS);
  $def("_DIRS", "DIRS", [], _DIRS);
  $def("_JOINTS", "JOINTS", [], _JOINTS);
  $def("_OVERRIDE_PORT", "OVERRIDE_PORT", [], _OVERRIDE_PORT);
  $def("_applyOverrides", "applyOverrides", ["OVERRIDE_PORT"], _applyOverrides);
  $def("_PORTS", "PORTS", [], _PORTS);
  $def("_PORT_ALT", "PORT_ALT", [], _PORT_ALT);
  $def("_TYPE_ALIAS", "TYPE_ALIAS", ["TYPES"], _TYPE_ALIAS);
  $def("_RELICS", "RELICS", [], _RELICS);
  $def("_loadShipSpec", "loadShipSpec", ["PORTS","PORT_ALT","TYPE_ALIAS","RELICS"], _loadShipSpec);
  $def("_geom", "geom", [], _geom);
  $def("_constantParam", "constantParam", [], _constantParam);
  $def("_rotTile", "rotTile", [], _rotTile);
  $def("_NEIGHBOURS", "NEIGHBOURS", [], _NEIGHBOURS);
  $def("_SENSOR", "SENSOR", [], _SENSOR);
  $def("_Ship", "Ship", ["NEIGHBOURS","JOINTS","TYPES","DIRS","rotTile","geom","DT","UNITS","applyOverrides","constantParam","SENSOR"], _Ship);
  $def("_World", "World", ["BINOPS","geom","DT","UNITS"], _World);
  $def("_simulate", "simulate", ["World","Ship"], _simulate);
  $def("_pilotActuators", "pilotActuators", ["geom"], _pilotActuators);
  $def("_pilotAllocate", "pilotAllocate", [], _pilotAllocate);
  $def("_flightModel", "flightModel", ["geom","UNITS"], _flightModel);
  $def("_fireGuns", "fireGuns", [], _fireGuns);
  $def("_pilot", "pilot", ["pilotActuators","pilotAllocate","flightModel","fireGuns","geom","UNITS"], _pilot);
  return main;
}