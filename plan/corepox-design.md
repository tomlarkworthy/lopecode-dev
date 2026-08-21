# Corepox — what to change, and why

Written 2026-08-18, from measurements taken the same day. Every number below has the command that
produced it. Nothing here is inferred from memory of the original game.

Companion docs: `knowledge/corepox-extracted-design.md` (what was recovered), `plan/corepox.md`
(rebuild plan), `plan/corepox-tasks.md` (state).

## 1. Why it was not fun: measured, not remembered

### 1.1 Combat does not resolve

`bun tools/corepox-tourney.ts` — 7 hand-built archetypes, round robin, 12 seeds × 2 sides per
pairing, 60s matches, random start range 10–18 tiles and random headings:

```
 name           win%   draw%   dmg dealt/match  taken/match
 sniper          63     71           0.06         0.06
 proportional    60     74           0.12         0.12
 seeker          51     83           0.05         0.04
 rammer          49     98           0.05         0.06
 wall            49     76           0.06         0.06
 turtle          49     97           0.02         0.02
 braitenberg     30     60           0.08         0.07
```

`turtle` is a 9-tile brick: one Brain, eight Armour, **no engines and no weapons**. It cannot move,
cannot shoot, and cannot lose. 97% of its matches are draws and it destroys 2% of its opponent per
match by existing.

A game where an inert brick is a median-strength entrant has no combat loop.

**After the changes in S2 (same command, same seeds, 2026-08-18):**

```
 name           win%   draw%   dmg dealt/match  taken/match
 sniper          81     32           0.24         0.29
 seeker          69     47           0.28         0.28
 proportional    53     49           0.28         0.24
 rammer          40     81           0.12         0.14
 wall            40     55           0.18         0.19
 braitenberg     36     72           0.18         0.15
 turtle          31     61           0.09         0.08
```

turtle 49% -> 31%, and it now loses to every archetype that can both move and shoot
(`turtle vs sniper 0%`). Draw rates fell from 76-98% to 32-81%. Damage per match rose 4x. The
unsensed `wall` sits at 40%, below both piloting builds -- it is no longer the rational build.

The top entrant, `sniper`, is a wall of lasers *plus* a range gate *plus* a pilot: it wires
`Radar.dist -> Binary(LT) -> Lazer` so it holds fire outside 12 tiles. That is the intended shape
-- programming beating brute force -- rather than a regression to 1.3.

Caveat on these numbers: `rammer vs turtle` and `wall vs turtle` are still 24/24 draws because
neither pair can engage at all (the wall cannot rotate, the rammer's distance gate makes it flee).
Those are faults in archetypes I wrote, and they hold the draw column higher than the engine
deserves.

### 1.2 The cause is time-to-kill, and it is off by 2.3×

`bun tools/corepox-econ.ts` instruments shots fired against shots landed:

```
  matchup                 fired landed  hit%   range min/med/end     survivors      t
 sniper v turtle            144     57  39.6     0.5/  9.8/ 11.0    14/14    9/9   60s
 wall v turtle              360      0   0.0    19.7/ 19.7/ 19.7      8/8    9/9   60s
 rammer v turtle              0      0   0.0    17.4/ 30.2/ 59.8    15/15    9/9   60s
```

The sniper aims well — 40% of 144 shots land — and the turtle still ends the match at **9/9
components**. The arithmetic:

```
turtle total HP:                                     820   (8x100 Armour + 20 Brain)
sniper DPS: 3 lasers x 1 shot/s x 5 dmg x 0.396 hit    5.9 dmg/s
seconds to destroy the turtle                        138   (match length: 60)
seconds to destroy the 20 HP Brain alone               3.4
```

**A ship's HP pool is 40× its Brain's.** Combat is attrition through mass that does not matter,
and the match ends first. 138s of work is required and 60s is available.

`wall v turtle` (0/360 hits) and `rammer v turtle` (0 fired, range 17→60) are separate faults —
the wall has no engines so it never rotates onto a firing solution, and my rammer archetype flies
away. Both are archetype bugs, not engine bugs, and neither changes 1.1.

### 1.3 This is what produced the "wall of lasers"

`vendor/corepox/firebase/data/ships_snapshot.json`, all 492 real player ships:

```
 type            total  ships-with   mean/ship
 Engine           1183    364 (74.0%)   2.40
 Constant          889    417 (84.8%)   1.81
 Lazer             713    325 (66.1%)   1.45
 Brain             480    479 (97.4%)   0.98
 Binary            300    218 (44.3%)   0.61
 Explosive         284    125 (25.4%)   0.58
 Radar             277    256 (52.0%)   0.56
 LaserTurret2      213    156 (31.7%)   0.43
 Composite         125    121 (24.6%)   0.25
 Orb               108     57 (11.6%)   0.22
```

**RETRACTED 2026-08-18.** This table came from `ships_snapshot.json`, which is a partial dump.
The full export is `ships.json` (892 ships), where Armour appears 607 times in 241 ships (27.0%),
and armour marks the *heaviest, best-piloted* builds:

```
 among armour ships:     Lazer 4.39  Engine 3.73  Radar 1.04  Binary 1.05
 among no-armour ships:  Lazer 1.49  Engine 2.46  Radar 0.59  Binary 0.59
```

Armour was added 2017-11-15, before the first corpus ship (2017-11-23), so availability is not the
explanation -- the snapshot file simply predates its use. `Hyperdrive` (6.4%) is also absent from
the snapshot. The designed campaign ships invert the player metagame entirely: Armour 28,
Explosive 25, Lazer 1. The original claim below is false and is kept only to mark the error.

~~**Armour: zero. Not one of 492 ships used it.**~~ With a 138s TTK, HP buys nothing a player can
observe, and it costs mass. Armour was strictly dominated, and the players found that out.

More lasers, meanwhile, is the only lever that moves TTK at all. The wall of lasers is not a
strategy that beat piloting — it is *the only thing in the game that had a measurable effect*.
Fixing TTK removes the wall's reason to exist; nerfing lasers directly would not.

Two corrections to things I said earlier in this project:
- I previously reported Binary at "~1 per 15 components" and read that as players ignoring logic.
  Per-ship presence is the meaningful statistic: **Binary is in 44% of ships and Radar in 52%.**
  Half the playerbase did wire a sensor. The mechanic was not rejected.
- `Composite` appears in **24.6%** of ships. The composite mechanic was used by a quarter of
  players. Your read that it is the strong part is supported by the corpus.

### 1.4 What the corpus cannot tell us

`assets.json` holds `creation_date` and `creator` for 303 ships and nothing else. There are **no
match results, no ladder positions, no win rates** in any recovered dump. Every claim above about
what *won* comes from self-play against archetypes I wrote, not from what players actually beat
each other with. That gap is not closable from the recovered data.

## 2. The fix: structural failure, not attrition

[Reassembly](https://www.anisopteragames.com/) solved this exact problem and states the principle
directly: combat "doesn't involve pecking away at a health meter; instead, the object is to tear
off parts of enemy ships until landing a hit on their command center."

Corepox has the mechanism already and does not use it. `powerUp()` flood-fills from the Brains and
marks everything unreachable as unpowered — a severed limb stops computing but keeps its mass.
`Connectivity.cs:99 disjointSets()` in the original does the same over *joints* rather than tile
adjacency. What is missing is that severing is never worth aiming for, because a 20 HP Brain sits
behind 800 HP of shell that is not actually in the way.

*Both halves of that paragraph are now done and it is kept for the record.* `Ship.islands()` runs
on joints as of 2026-08-20, and `powerUp()` was removed the same day — a severed limb becomes its
own ship on the next step, which is what the original does, so there was nothing left for the
flood fill to mark.

Three changes, in dependency order:

1. **Make the shell be in the way.** A beam should stop at the first component it meets. It
   already does since today's raycast fix (`corepox-engine.js:318`) — before that it only tested
   the enemy component nearest the muzzle, so a shot aimed dead-on at anything else missed, and
   that alone held 86% of matches to a draw. Stripping armour is now real progress toward the core.
2. **Collapse the HP range.** 20 (Brain) to 100 (Armour) across a 9-part ship gives a 40× pool.
   Target single-digit shots per component so a 60s match resolves.
3. **Split the body.** `islands()` exists and is unused; a severed fragment should become its own
   rigid body with its own velocity and spin. This is the "exploding ships malfunctioning" you
   named as the fun part, and it is the one change that makes a *hit location* matter more than a
   *hit count*.

(3) is where hinges come in. `ShipComponent.cs:16` already declares `joints: CoordDir8[]` and
connectivity runs over joints, not tiles — so components can touch without being attached. A hinge
is a joint that transmits force but not torque. That is a small addition to an existing model, not
a new subsystem, and it makes structure a design surface: where you *join* becomes as expressive as
where you place.

The empty space stops being boring for the same reason. Ports are grid cells, not component
properties — `composites.json` wires `{"from":[2,1],"to":[4,0]}` where `[2,1]` is a port cell and
`[4,0]` is an Engine's own tile. The gaps between components are where signal runs. Once severing a
gap kills a limb, empty space is the most contested real estate on the ship.

## 3. Multiplayer on atproto

### 3.1 The property that makes it work

`bun tools/corepox-determinism.ts`:

```
identical across 3 runs: true
[3000,4.917272055669354,-4.398720396297764,49.41894083180921,4.51577979857558,-1.6385313985012107,-102.95601176692477,11,11]
```

The simulation has no `Math.random`, no clock, and a fixed `DT`. **You never publish a match
result — you publish a ship, and anyone recomputes the match.** No server has to be trusted,
because there is nothing to trust: the ship record is the whole claim, and the ladder is a pure
function of the ships in it. This sidesteps every hard atproto constraint at once (single-writer
repos, no cross-repo atomic transactions), because there is no shared mutable state to fight over.

**Limit, and it is load-bearing:** determinism is verified *within one JS engine*. `geom` uses
`Math.sin`, `Math.cos` and `Math.atan2` (`corepox-engine.js:46`), and ECMA-262 does not specify
their precision, so V8 and JSC may not agree bit-for-bit. Two fixes, and they trade differently:
integer-indexed trig tables make it exact everywhere at a small accuracy cost and must be done
before any hash-based scoring; or score by consensus and treat disagreement as a challenge, which
costs nothing now but cannot ever produce a single canonical ladder. **Recommendation:** trig
tables, because the whole design rests on recomputation agreeing.

### 3.2 The shape: ghost ladder, not live matches

[Super Auto Pets' Arena mode](https://gamerant.com/best-asynchronous-multiplayer-games/) is the
closest working reference — you face static snapshots of real players' teams, no scheduling. On
atproto that is nearly free: a ship is a `com.corepox.ship` record in the author's own repo,
matchmaking is sampling ship records from the firehose, and a "match" is a local recomputation.
Rate limits (~1,666 record creates/hour) are irrelevant because *playing does not write records* —
only publishing a ship does.

### 3.3 The hook the research points at

The sharpest retention finding is from Gladiabots, whose players
[wished they could start from someone else's good AI rather than a blank page](https://medium.com/@gofig.news/a-coffee-break-with-s%C3%A9bastien-dubois-gladiabots-45609a63e39f):
"Building the first AI was not relaxing … players wished it was possible to work from a good simple
one at first or use a link shared by another player."

Corepox already has that mechanic and shipped exactly one instance of it. `assets.json` `relics`
contains a single entry, `BrautenbourgsFirst` — the Braitenberg vehicle. Composites are named,
shareable, embeddable sub-ships that appear in 24.6% of player ships despite there being seven of
them total (`components/Resources/composites.json`: Braitenberg 1, Weapon Station, Mini Drone,
Lazer Turret Hardpoint, Devouring Love, Unfinished Orb Drone, Orb Drone Chassis).

**The composite is the atproto-native object, not the ship.** A composite is a small, named, working
idea that someone else can drop into their build — it is a fork, an import, and a citation at once.
Publishing composites gives the network something to circulate that ships alone do not: ships
compete, composites compound. That is the loop that makes a social network the right substrate
rather than a leaderboard bolted onto one.

## 4. Economy — the case against, for now

An economy is a way to make choices cost something. Corepox's choices do not cost anything yet:
mass is the only budget and it is weak enough that the corpus ignored it (mean 9.3 components,
max 31, no armour anywhere).

Before adding currency, spend the constraint we already have. Make mass hurt, make severing
matter, and the build becomes a real optimisation problem with no bookkeeping. If an economy is
still wanted after that, the atproto-native version is **salvage**: a destroyed fragment is a
record, and its author can claim it. That is single-writer, needs no atomic transfer, and reuses
the fragment objects the split in §2.3 produces anyway.

**Recommendation: not now.** It is the change most likely to be wasted work if §2 lands, and
§2 is measurable while an economy is not.

## 5. Local-first

The notebook is already the whole client — one HTML file, no server, works offline. What
"secure local-first" means concretely here:

- **Nothing to cheat at.** Scores are recomputed, not reported (§3.1). A lying client can only
  lie to itself.
- **Identity is the DID.** Signing a ship record is atproto's job, not ours.
- **The unresolved one is time.** A ladder that anyone can recompute can also be recomputed
  selectively — you can grind opponents offline and publish only the ship that wins. That is not a
  security hole so much as the actual metagame, and it may be a feature. Not decided.

## 6. What I recommend not changing

You offered to change the game entirely. Two things the measurements say to keep:

- **Composites.** 24.6% adoption with 7 examples, and independent evidence from Gladiabots that
  this is the thing players ask for. This is the strongest asset in the recovered design.
- **Dataflow-on-a-grid.** 52% of players wired a radar. The programming layer was not the failure;
  the combat resolution was.

## 7. Open, in priority order

1. ~~TTK rebalance~~ — done 2026-08-18, HP collapsed to 15..40. See S1.1 for the after table.
2. ~~Body splitting on sever~~ — done. `World.splitDetached()` + `Ship.detach()`; a severed island
   becomes its own Ship inheriting the velocity it had at its own centre.
   Verified by `tools/corepox-split-check.ts`: `proportional v sniper` ends with 4 bodies.
3. **Impact damage** — done, and it did not exist before in either codebase. The original left
   `component.damage(5)` with a literal `// TODO force based impact damage` (`Ship.cs:586`), and
   my engine had no ship-ship collision at all, which is why the `rammer` archetype could not ram.
   Now resolved as an impulse (`World.collide()`). Damage-proportional-to-impulse was itself
   dropped on 2026-08-20 for the original's flat 5 per contact per tick; and on 2026-08-21 the
   test moved from anchors to CELLS, with the impulse applied once per ship pair rather than once
   per component pair. See "Footprints are solid" in `plan/corepox-tasks.md`.
4. **Renderer does not show splits.** `battlefield()` builds ship nodes once at construction, so
   bodies created mid-match by `splitDetached()` are simulated but invisible. Known, not fixed.
5. Hinge joints on top of the existing `joints` model.
6. Trig tables, before anything hashes a match outcome.
7. Composite publishing as the first atproto lexicon, ahead of ship publishing.

## 8. Why `rammer` and `wall` did not work — and what that exposed

Added 2026-08-18, after S1-S7. Both were dismissed above as "archetype bugs". One of them was.

### 8.1 rammer: armament silently broke its steering

`bun tools/corepox-trace.ts` — bearing to target versus heading, per 3s:

```
  t   range  head  bearing   engines(thrust)
  6.0   13.6    94      -30   -1,-1:0.00 1,-1:1.00 0,-1:1.00
 15.0    6.0    85      -84   -1,-1:0.00 1,-1:1.00 0,-1:1.00
 24.0   12.4    76     -145   -1,-1:0.00 1,-1:1.00 0,-1:1.00
```

Bearing runs away to -145 while heading moves 94 -> 76. The ship flies past and never corrects.
The wiring is identical to `seeker`, which tracks fine. `bun tools/corepox-com.ts` gives the cause:

```
 name          mass   CoM         engine torque arms
 seeker        1.10  (0.18,0.27)   -1.18  +0.82  -0.18     1.4:1
 rammer        1.50  (0.47,0.47)   -1.47  +0.53  -0.47     2.8:1
```

Three explosives on the nose and a range-gate on the right flank moved the centre of mass to
(0.47, 0.47). Turning left became 2.8x stronger than turning right, and the always-on centre
engine acquired a -0.47 arm applying constant left torque the right engine cannot cancel.

**This is not a bug, it is the physics working.** And it is widespread: of 73 corpus ships with
4+ weapons and 2+ engines, **31 (42%) have >2:1 steering asymmetry or one-sided engines**. Players
were shipping broken steering and could not see it. The lesson is for the *designer* UI, not the
engine: show the centre of mass and the engine torque arms while building.

### 8.2 wall: my archetype was a strawman

`wall` has no engines and no sensing. Real players did not build that:

```
                n     has-engine  has-radar  has-binary  wired   mean engines
 ALL           492       74%        52%        44%        83%       2.40
 >=4 weapons    92       92%        70%        66%       100%       3.75
```

**Heavy-weapon ships were the best-piloted ships in the corpus**, on every measure. The wall of
lasers is not "guns instead of piloting", it is "guns *plus* piloting" — which is `sniper`, the
81% winner of S1.1. The tournament did reproduce the problem; it was filed under the wrong name.

### 8.3 The real cause: guns have no opportunity cost

`bun tools/corepox-guns.ts` — one fixed, well-piloted chassis, lasers added in symmetric pairs so
the centre of mass does not move, round-robin between rungs:

```
 guns   mass   win%
    1   1.10    11
    2   1.20    36
    3   1.30    58
    5   1.50    67
    8   1.80    78
```

Strictly monotonic. Piloting is a fixed setup cost; once paid, every further slot goes to a gun,
because nothing trades against it. That is the whole wall-of-lasers problem in five rows.

**RETRACTED 2026-08-20 — the chassis is not a ship.** It was authored when every component was
assumed 1x1. Under the real footprints the T-tetromino Binaries sit inside the Brain and inside
the Radar: 10 overlapping cells at one gun, 16 at eight, at every rung. Under joints the 8-gun
rung is also two islands. `corepox-guns.ts` now measures that first and refuses to print win rates
(`FORCE=1` overrides, knowing what is being measured). The five rows above, and the supply sweep
in §8.5 that was fitted to them, were measured on a hull that cannot be built. Rebuilding the
chassis on the real footprints is open work; nothing in §8.3-§8.5 should be cited until it is.

### 8.4 Recoil: a dead end, measured

The obvious fix is to make firing kick the ship off its own aim. Sweeping the impulse constant:

```
   k=0   11  36  58  67  69     monotonic
   k=8   11  36  58  67  78     monotonic
  k=30   11  29  62  68  79     monotonic
  k=80   43  22  71  64  49     incoherent, not an interior optimum
 k=200   50  50  50  50  50     nobody can aim; combat stops resolving
```

There is no useful window: recoil goes from no effect to breaking the game with nothing between.
The reason is that guns mounted symmetrically fore recoil straight back along the thrust axis, so
recoil trades against *closing speed*, not against *aim* — and more DPS beats slower closing.
Recoil is kept at k=8 because it is physically right, but it is not the lever.

### 8.5 Power as a budget: the lever that works

`powerUp()` already flood-filled from the Brains. Making it spend a budget rather than only test
connectivity is a small change to existing code. Each Brain supplies `Ship.SUPPLY`; each component
draws `TYPES[t].pwr` (Lazer 4, Engine 2, Radar 2, Binary 1, Armour 0); the flood pays in
breadth-first hop order, so **a component nearer a Brain is powered first**.

Sweeping supply against the same gun ladder:

```
 SUPPLY=999   11  36  58  67  78    unlimited: guns always win
 SUPPLY=30    12  39  58  67  74    still monotonic
 SUPPLY=20    38  49  54  51  58    spread 67pp -> 20pp; 5 guns (51) < 3 guns (54)
 SUPPLY=14    50  50  50  50  50    everything browns out; combat dead
```

`SUPPLY=20` is the working window. `bun tools/corepox-power.ts` shows what the ship actually does
with it:

```
 1 guns: powered 11/11, spare 3  (all powered)
 8 guns: powered 11/18, spare 3  BROWNED OUT: Lazer@-1,2 Lazer@1,2 Lazer@-2,2 ... (7 of 8)
```

One Brain runs the pilot and exactly one laser. **The 8-gun ship is not a gunship — it is a 1-gun
ship wearing seven unpowered lasers as ablative armour.** The wall of lasers stops being a damage
strategy and becomes a heavy, bad armour strategy. That is the intended outcome.

Effect on the archetype table (same command as S1.1):

```
 name           win%    was
 seeker          72      69     piloting build, 1 gun
 proportional    63      53
 wall            53      40
 sniper          45      81     <- overspent on guns
 turtle          40      31
 rammer          40      40
 braitenberg     37      36
```

`sniper` fell 81 -> 45 because its Constant *and* a Lazer browned out, and losing the Constant
kills the control loop that feeds its engines. Harsh, and correct: it overspent on guns and its
Brain could not run the pilot.

**The consequence is a new and learnable rule — critical logic must sit near a Brain** — and a new
failure mode: killing a Brain mid-fight browns out the far end of the ship. That is the
"malfunctioning" half of "exploding ships malfunctioning", and it costs nothing extra to get.

**Open:** brownout order is currently pure hop distance, so which component dies is not the
player's choice. Either expose priority in the designer or power declared-critical parts first.
Undecided, and it is the next thing to settle before this ships.

**REMOVED 2026-08-20, on Tom's call.** Two reasons, and the first is the one that matters.

*It is not in the game.* `ShipComponentStats` has exactly three fields — `hyperspeed`, `maxHp`,
`panel`. There is no power, energy, supply or draw anywhere in `Assets/scripts` (grep returns
nothing; the only hits in the whole tree are FMOD and DOTween). A component's cost in the original
is its mass and its slot in a limited inventory, and nothing else. `Descriptions.cs` gives Orb
"causes massive damage to touching components, and blocks incoming lazer fire" — the port had
rewritten it as "stores power for the components that draw more than the core makes", which is
flavour text invented to explain an invented mechanic. That is how far it had spread.

*And the evidence for it does not stand.* The sweep above was fitted to §8.3's ladder, which is
retracted. Re-measured today on the same build, budget on against budget off, three reps each and
stable to 1pp:

```
 guns              1    2    3    5    8
 budget ON        60   59   60   61   (10)     spread 2pp
 budget OFF       58   66   61   65   ( 0)     spread 8pp
```

The 8-gun rung is parenthesised because it is two islands under joints, so its number is a
shattered ship's, not a gunship's. There is no monotonic runaway in either arm — the 67pp
ladder the budget was invented to flatten is not present in today's build with the budget gone.
8pp against 2pp is a real difference and it is not the problem that was being solved.

What came out with it: `powerUp()`, `Ship.SUPPLY`, `TYPES[t].pwr`, `c.powered`, `ship.power`, the
renderer's 0.35 dimming of unpowered parts, the shipyard's `pwr` readout, the component table's
`pwr` column, and `tools/corepox-power.ts` / `corepox-pwr2.ts`, which had no subject left.
`this.alive` is now `live.some(c => c.type === "Brain")`.

**The opportunity cost of a gun is now structural, and that is the better answer.** Under joints a
part has to reach a face that will have it, and `JOINTS.Lazer` is the aft cell only — four slots.
The peripheral positions that made a wall of lasers cheap are exactly the ones nothing will hold.
That is a cost the player can see on the grid rather than a number rationed behind their back.
Whether it is *enough* is unmeasured, and needs a chassis that is a ship.

## 9. Port recovery — the corpus runs

2026-08-18. Balancing paused; this is porting.

Connections address ports by **grid cell** (`{"from":[2,1],"to":[4,0]}`), and the per-component port
offsets lived in Unity binary prefabs that did not survive. Recovered instead by constraint
propagation over 7,544 connection endpoints in 778 real ships: seed from the types that can only
have outputs or only inputs, accept the highest-voted unexplained offset, repeat.

```
round 0: 89.8% of 7544 endpoints explained
round 1: 96.0%   +out Binary (0,-1)   +in Lazer (0,0)
round 2: 98.0%   +out Composite (1,1) +in LaserTurret2 (-1,0)
round 3: 99.2%
```

The table reproduces all four connections of `BrautenbourgsFirst` in `composites.json` exactly.

**Occupancy is 1x1, and ports sit on adjacent EMPTY cells.** Proven by overlap test across all 892
ships: 1x1 gives 0 overlaps, any multi-tile footprint gives 60%. So the gaps between components are
not decoration -- they are mandatory port space. That is the "boring empty space", and it is
load-bearing.

Because neighbours are normally separated by a port gap, tile adjacency is the wrong connectivity
rule. Measured share of corpus ships forming a single body:

```
 reach 1 chebyshev  33%     reach 2  70%     reach 3  87%
```

Reach 2 adopted: it spans exactly one port gap and still lets a hit sever a ship. The residual is
expected -- the original *declared* joints per component (`ShipComponent.cs:16 joints: CoordDir8[]`)
rather than deriving them from distance.

Result, `bun tools/corepox-load-corpus.ts`:

```
ships in file      892
constructed        892   (0 threw)
alive at t=0       878
connections wired  3578, dropped 194 (5.1%)
multi-island ships 230 (26%)
```

Radar's port order was not decidable from the table. Settled by experiment (`bun
tools/corepox-corpus-battle.ts`, 40 real-vs-real matches): `bearing@(1,0)` yields 15% of ships
closing on their target, `dist@(1,0)` yields 3%. Adopted the former.

**Still open:** 15% closing is low, but consistent with the corpus (median ship has 2 connections,
17% are unwired, 26% load in pieces). Whether the remainder is bad player ships or a further port
error is not yet distinguished, and that is the next thing to check.

## 10. Footprints — components are not 1x1

2026-08-18, correcting S9. Tom: "radar is 2x3, the binary is a t shape 4, the SVG shapes are
suggestive."

S9 concluded components were 1x1 because multi-tile footprints produced 60% overlaps. That test was
broken three ways: it applied every candidate footprint simultaneously so one bad guess poisoned all
of them, it used a 5-tile plus for Binary rather than a T, and it never searched the anchor. Redone
one type at a time with an anchor search, the minima are sharp:

```
 Binary  T-tetromino  (-1,0)(0,0)(1,0)(0,-1)      4.3% clash   next best 17.3%
 Radar   2x3          (0..1, 0..2)                1.5% clash   next best 42.7%
```

The independent check is the **spacing shadow** — for same-type, same-dir pairs in the same ship,
which relative offsets never occur. It is not biased toward small footprints the way a clash count
is (1x1 always scores 0%):

```
 Constant  dy=+-1, dx=0: 513 pairs     -> 1x1
 Engine    dy=+-1, dx=0: 132 pairs     -> 1x1 (the 1x2 art is exhaust overhang)
 Lazer     dy=+-1, dx=0: 137 pairs     -> 1x1 (the 1x3 art is barrel overhang)
 Binary    nothing within +-3 except 17 pairs at (1,1)   -> large
 Radar / Turret / Orb / Hyperdrive: no same-type pair within +-3 at all -> large
```

So the art bounding box is suggestive but not authoritative: it includes barrels and exhaust that
overhang neighbouring tiles. Occupancy has to come from the corpus.

**Footprints then force a port correction.** Ports lie on the component's own tiles (Engine's input
is its own (0,0)), so Binary's output must be the T's stem at (0,-1), not (0,+1), and Radar's
outputs must fall inside its 2x3 body, ruling out the (2,0) that voting had suggested. Measured on
dropped-connection rate across all 892 ships, which is independent of any physics:

```
 Binary out (0,-1)   194 dropped  (5.1%)
 Binary out (0,+1)   558 dropped  (14.8%)
```

Theory and measurement agree, which is the reason to believe it.

**Two mass errors surfaced only once footprints were real**, and both were mine:

1. `mass = tileCount * 0.1` charged per TILE. A Radar became six times heavier than a Constant, and
   the share of real ships that close on their target fell 15% -> 5%. The original charged per
   COMPONENT (`Constants.MASS_SCALE`), and a comment in my own engine had already flagged the
   deviation. Now per component, spread uniformly over that component's tiles, with the centre of
   mass and inertia computed consistently from the same distribution.
2. Inertia dropped the `Icm` term of `Icm + d^2*m` (`Ship.cs:562` states the formula). Understated
   inertia by 6-13%, worst on compact ships, since a tile on the centre of mass contributed nothing.

Final state, `bun tools/corepox-load-corpus.ts`:

```
ships in file      892
constructed        892   (0 threw)
alive at t=0       878
connections wired  3578, dropped 194 (5.1%)
multi-island ships 207 (23%)     was 78% under 4-connectivity
```

**Broken by this change:** the seven hand-built archetypes in `tools/corepox-roster.ts` were laid
out assuming 1x1 components, so with real footprints five of the seven now overlap or fall into
pieces (`bun tools/corepox-validate.ts`). They are the harness every balance measurement in S1 and
S8 was taken with, so **those numbers are now unreproducible until the archetypes are rebuilt on
real footprints.** The corpus port itself does not depend on them.

### 10.1 Orb, and the connector model

Tom: "orb is 2x2 with two connectors on one side. I think a 1x1 has 8 connectors round the edge but
not all occupancy places them."

**Orb 2x2 adopted.** Corpus-consistent rather than corpus-derived: the corpus cannot resolve Orb's
footprint on its own (no two Orbs ever sit within 3 cells, so there is no spacing shadow to read),
but the anchor search shows this shape is nearly free where the alternatives are not:

```
 1x1                              13.12% clash   (baseline; 1x1 always scores lowest)
 2x2 at (0,0)(1,0)(0,1)(1,1)      13.68%   <- adopted, +0.56pp
 2x2 at (-1,0)(-1,1)(0,0)(0,1)    14.80%
 3x3                              17.83%
```

The two connectors are not modelled: `Descriptions.cs` gives Orb no input or output ("causes massive
damage to touching components, and blocks incoming lazer fire"), and no corpus connection resolves
to an Orb.

**The 8-connectors-round-the-edge model was tested and does not explain the connectivity gap.**
If connector cells sat outside the body they would be structure, and attachment would be reach-1
over `occupancy union connectors`. Measured, that is identical to bodies alone:

```
 reach1 8-way, bodies only          all 57%   without Composite 68%
 reach1 8-way, bodies+connectors    all 57%   without Composite 68%
 reach2 chebyshev, bodies only      all 78%   without Composite 85%
```

It changes nothing because every port the inference recovered is *already inside* the body — Engine's
input is its own (0,0), Binary's are on its T tiles, Radar's inside its 2x3 — and `composites.json`
independently confirms the Engine case in two separate connections.

The likely reconciliation is that Tom's 8-round-the-edge refers to **joints**, not signal connectors:
`ShipComponent.cs` declares them as separate arrays (`joints: CoordDir8[]` versus
`InputConnector.coord`), and `CoordDir8` is a cell *plus* one of 8 perimeter directions. Structure
and signal are different graphs. **This is not resolved.** Reach 2 stays because it measures best
(78% vs 57%), not because it is justified — the real joint arrays were in the binary prefabs.

**Composite is the largest remaining porting gap**, not the connectivity rule. It is in 22.3% of
ships, is modelled as a 1x1 stub, and is heavily over-represented in ships that load in pieces:

```
 of ships that load broken:  43-48% contain a Composite
 of ships that load whole:    8-16% contain a Composite
```

Expanding it from `components/Resources/composites.json` (7 definitions, all recovered) should move
the 22% multi-island figure more than any further tuning of reach.

Current state: 892/892 load, 878 alive, 5.1% of connections dropped, 196 ships (22%) multi-island.

### 10.2 Connectors are on cell edges — and a falsified prediction

Tom supplied an in-game screenshot with the connectors visible as green dots. Read against the grid
pitch (~178px; cell boundaries at x ~= 569, 747, 925), the dots sit **on the shared edge between two
cells**, and there are **two per edge** — at x ~= 578 they pair at y ~= 460/545 and again at
y ~= 620/740. Four edges x two = **eight around a 1x1 cell**, which is precisely what `CoordDir8`
encodes: a cell plus one of eight perimeter slots. A dot is drawn only where both sides have a
matching connector.

That model predicts plain 4-connectivity: two components attach when they occupy cells sharing an
edge. It also predicted that the 22% multi-island residual was `Composite` being stubbed as 1x1
(S10.1 measured it at 43-48% of broken ships).

**Composite expansion shipped, and the prediction was falsified.** Every instance carries its whole
definition inline in `param`, so splicing the sub-ship in — components translated and rotated by the
placement, internal connections rebased — is mechanical. All 228 instances in the corpus are
`BrautenbourgsFirst`: the composite mechanic reached 22% of ships with exactly one artifact ever
available, which is the single strongest piece of evidence for the S3.3 argument that composites,
not ships, are the atproto-native object.

The effect on wiring is large and on connectivity is nil:

```
                       connections wired   dropped        multi-island
 Composite as 1x1 stub       3578        194  (5.1%)         22%
 Composite expanded          4629         55  (1.2%)         22%
```

```
 with composites expanded:  4-way 40% multi-island   8-way 37%   reach-2 22%
```

4-way did not move at all. So the edge-connector model is right about the *mechanism* and still does
not explain the data, which means at least one footprint remains too small and I do not know which.
Candidates: Hyperdrive (never resolved — no same-type pairs in the corpus), and whether Engine and
Lazer really are 1x1 as their spacing shadows say (132 and 137 pairs one cell apart) against art
that measures 1x2 and 1x3.

Reach 2 stays as an empirical stand-in for the real per-component `joints: CoordDir8[]` arrays,
labelled as such in the code. **The port table is now the solid part**: 98.8% of 4,684 connection
endpoints resolved, against 94.9% before.

Current state: 892/892 load, 878 alive, 1.2% of connections dropped, 199 ships (22%) multi-island,
15% of sampled real ships close on their target.

### 10.3 What is and is not known about connectivity

Tom asked whether the connectivity of every individual component is known. It is not, and the shape
of the gap is now precise.

**Known (recovered, high confidence):** the *signal* ports — which cell each component's inputs and
outputs occupy. 98.8% of 4,684 connection endpoints across 892 ships resolve, and the table
reproduces `BrautenbourgsFirst` exactly.

**Not known:** the *structural* joints — which of the 8 perimeter slots each component populates
(`ShipComponent.cs:16 joints: CoordDir8[]`). These were per-component arrays in the binary prefabs
and did not survive. The engine therefore applies one uniform reach where the original varied it
per component.

**What the corpus can and cannot settle.** Two candidate explanations for the 22% of ships that load
in pieces were tested and both are dead:

1. *It is the joints.* Enabling every edge on every component is the ceiling of any edge-adjacency
   model, and that is exactly 4-connectivity. It leaves 42% of ships broken. **No joint assignment
   can beat a bound it already fails**, so joints are not the explanation.
2. *It is the footprints.* Sweeping Engine (1x1 / 1x2 up / 1x2 down) against Lazer (1x1 / 1x2 /
   1x3 up / 1x3 down), with composites expanded:

```
 engine  lazer   4-way multi-island   overlapping components
 E1      L1         42%                    23%
 E1      L3u        39%                    24%
 E2d     L3u        33%     <- best        48%
 E2u     L3d        39%                    89%
```

   The best case is 33% and it costs 48% of ships having components inside each other. Engine and
   Lazer stay 1x1: their art measures 1x2 and 1x3, but that is barrel and exhaust overhang, and the
   spacing shadows agree (132 and 137 same-type pairs one cell apart).

**So reach 2 is the physical model after all.** The screenshot shows connectors as dots *in the gap
between* components rather than on their bodies — the stalks project outward, and two components
separated by one empty cell join when their stalks meet in it. Between bodies that is a reach of
two. The earlier `bodies+connectors` test (S10.2) failed to show this only because every port the
inference recovered sits *on* the body: those are signal connectors, and the structural ones are a
different set that was never in the JSON.

The bridging analysis names where the residual sits, for whenever the joints are reconstructed by
hand: Engine dominates, appearing in 7 of the top 8 type-pairs that would close an island gap
(Binary-Engine 125, Brain-Engine 96, Engine-Lazer 79, Engine-Turret 57, Engine-Engine 53,
Engine-Radar 43, Engine-Orb 30).

### 10.4 Footprints, corrected again — and the methodology bug that caused it

Tom, in sequence: "engine is 2x2 [...] with 4 joints on the top and top/left/right, engine graphic on
bottom", then "sorry engine is 2x1", then "lazer is very clear 3x1 [...] and again it only has
connector on the bottom 4 sides", plus the general rule "curved corners do not admit a connector".

S10 concluded Engine and Lazer were 1x1 from their spacing shadows. **That was a measurement bug:
the shadow was tabulated in WORLD space, not component-local space.** 163 of 2,033 Lazers face
`left` and 62 face `right`, and for those a "dy=+-1" pair is two lasers side by side — entirely legal
for a 3x1. Re-tabulated in the local frame, un-rotating each offset by the component's own `dir`:

```
 Lazer   dx=0 column:  dy=+-1: 0   dy=+-2: 0   dy=+-3: 11   side by side: 884
 Engine  dx=0 column:  dy=+-1: 0   dy=+-2: 17  dy=+-3: 0-1  side by side: 624
```

Lazer blocks its own axis at 1 *and* 2 and opens at 3 -> 3 long. Engine blocks at 1 and permits 2
-> 2 long. Both match what Tom said. Armour (97 pairs at dy=+-1) and Constant (513) stay 1x1.

Direction, by overlap against all 892 ships with everything else held at 1x1 and composites
unexpanded, so the measurement is isolated (all-1x1 baseline is 0.0%):

```
 Lazer  3-long +y (barrel forward)   5.8%      3-long -y  53.7%    centred 56.2%
 Engine 2-long -y (nozzle behind)   22.9%      2-long +y  54.5%
```

Engine's residual 22.9% is 267 of 2,505 engines with something in the cell behind them — mostly
Constant (77), Lazer (50), Brain (41). 33 are other Engines, which the same-dir shadow says never
happens, so those are mixed-direction placements. Taken as legacy or invalid saves: `ships.json` is
every design ever saved, and 3% of ships already have two components on one cell even at 1x1.

Effect:

```
                  multi-island     4-way    reach-2
 before (1x1)         22%           42%       22%
 after                17%           34%       17%
```

### 10.5 Joints, and how to finish recovering them

The connector geometry is now settled. Tom's screenshot shows dots along one cell edge ~89px apart
against a 178px cell pitch: **two connector slots per cell side, eight around a 1x1** — which is what
`CoordDir8` encodes. "The engine is 2x2" was in connector units; one component cell is 2x2 connector
slots. Components stay 1x1 on the component grid (624 same-dir engine pairs sit one cell apart).

Two joint arrays are now recorded in `TYPES`/`JOINTS` from Tom directly:

```
 Engine  N:[on,on]  E:[on,off]  W:[off,on]  S:[off,off]   (nothing on the nozzle end)
 Lazer   S:[on,on]  E:[off,on]  W:[on,off]  N:[off,off]   (nothing on the muzzle end)
```

**The rest are readable off the art rather than guessable**, via Tom's rule: *a curved corner does
not admit a connector*. The vector paths are already in `corepox-assets`, so straight edge segments
take joints and curved ones do not. That is the route to finishing this, and it is not yet done.

Current state: 892/892 load, 878 alive, 1.2% of connections dropped, 148 ships (17%) multi-island.

## 11. Joints recovered from the art

2026-08-18. Tom supplied the rule — "curved corners do not admit a connector" — and a close-up of a
Binary in flight ("here you can see the strange joint"). That rule makes the joints *readable*
rather than guessable, because the vector paths are already in `corepox-assets`.

`tools/corepox-joints-from-art.py` parses each symbol's outline, classifies every boundary segment
as straight or curved (a cubic whose control points are collinear with its endpoints is straight),
and tests each cell face against it. Two slots per side, eight around a 1x1 — which is what
`CoordDir8` encodes and what the screenshot shows (dots ~89px apart against a 178px cell pitch).

**The art is exported at inconsistent scales** and this matters: Binary is 64.3 units/cell, the
components-page variants 56, Radar 59, Orb 135.5. The unit has to be derived per symbol from the
footprint, not assumed globally. A global 64 produced nonsense for everything except Binary.

Recovered:

```
 Engine     0,0: N[0,1] E[0] W[0]                                  4 slots
 Lazer      0,2: E[0,1] S[0,1] W[0,1]                              6 slots, base cell only
 Binary     1,0: E[1] W[1]          <- the stem: no top, sides only
            0,1: N[0,1] S[1] W[0]
            1,1: S[0,1]
            2,1: N[0,1] E[0] S[0]
 Radar      0,2: S[0,1] W[1]   1,2: E[1] S[0,1]                    base row only
 Orb        all four cells, outward faces only                     16 slots
 Armour / Constant / Explosive   all 8 slots                       fully connectable
```

**The check that this is real, not fitted:** Engine comes out as `N[0,1] E[0] W[0]` — exactly four
slots, on the top and the upper half of each side, nothing on the nozzle cell. Tom had described it
from memory as "4 joints on the top and top/left/right" *before* the tool was written. Lazer comes
out with joints on its base cell only, matching "only has connector on the bottom". And the Binary
stem has no top connector at all — its top is the rounded bump, so it can only be attached from the
sides, halfway up. That is the "strange joint".

**Not recovered:** Brain (its outline is all curves at the exported scale and the tool returns 0
slots, which must be wrong), LaserTurret2, Hyperdrive.

The joint table is recorded in `corepox-engine` as `JOINTS` but is **not yet used** — connectivity
still runs on the uniform reach-2 rule. Wiring `JOINTS` into `powerUp`/`islands` so attachment is
per-component, as the original was, is the next step and is the thing that should finally explain
the 17% of ships that load in pieces.

Current state: 892/892 load, 878 alive, 1.2% of connections dropped, 148 (17%) multi-island.

### 11.1 Corrections from Tom, and one independent confirmation

- **Brain**: 1x1, full 8 joints like Constant. The art tool returned 0 slots because the brain
  symbol is 82x77 for a single cell — its pins overhang, so the bounding box is not the body and
  the face lines land off the outline. Brain is in 98.4% of ships, so this single gap was blocking
  almost the whole corpus from being testable (485 ships became testable from 10).
- **Orb**: 2x2 with ONE side connected, 4 joints. The art gave all four outward faces (16), which is
  wrong; the orb symbol is the one that renders as a thin line, so its outline is unreliable.
- **Radar**: "joins on one of the 2 length sides (4 joins) plus the closest join around the corner,
  so 6 joints in total." **This matches the art-derived table exactly** — `S[0,1]` on both base
  cells (4) plus `W[1]` and `E[1]` (2). Tom's memory and the SVG agree without either being fitted
  to the other, which is the strongest available check that the curved-corner method works.

Together with Engine (`N[0,1] E[0] W[0]` = the "4 on top and top/left/right" Tom described before
the tool existed), two of the recovered tables were confirmed blind and two were corrected.

### 11.2 Joint-based connectivity does not work yet — and the number is not a verdict

`tools/corepox-joint-connectivity.ts` links two components when one has a joint at (cell, side, slot)
and the other has the opposing joint on the adjacent cell. Art cells are anchored at the symbol's
top-left while engine tiles are anchored per footprint, so the tool solves the offset per type by
matching the two shapes rather than assuming a shared origin:

```
 Engine (0,-1)   Lazer (0,0)   Binary (-1,-1)   Radar (0,0)   Orb (0,0)   1x1 types (0,0)
```

All nine solve by pure translation with no y-flip, which is coherent: the art's +y is down and so is
the engine's. An earlier run that appeared to favour a flip was measured before alignment existed
and was noise.

**Result: 10 of 485 ships (2%) form a single body.** Reach-2 gives 83% on the same ships. Something
in the linking is wrong — candidate causes not yet separated: slot index parity between opposing
faces, slot rotation under `dir`, or simply that Engine (4 slots) and Lazer (6) are too sparse to
connect the ships players actually built. **This is a verdict on my implementation, not on the joint
model**, and the production engine still runs reach-2. It should not be quoted as evidence that
per-component joints are wrong.

Still unrecovered: LaserTurret2, Hyperdrive.

Current state: 892/892 load, 878 alive, 1.2% of connections dropped, 148 (17%) multi-island under
reach-2.

### 11.3 LaserTurret2, and a production bug found by accident

**LaserTurret2 base is 2x1 with 8 joints (Tom):** "leave one of the 2 length sides open, but that's
where the gun pokes out and resolves. The rotation point is in the middle if it was a 2x2." The
joint count is forced by the geometry — a 2x1 perimeter is 4+4+2+2 = 12 slots, and opening one long
side leaves exactly 8. `pivot: [0.5, -0.5]` is the centre of the 2x2 formed by the base plus the row
the gun sweeps.

The 12-tile footprint previously in `TYPES`, transcribed from `TurretFn.Awake()`, was the turret's
**swept area, not its footprint**. The corpus cannot tell the two apart (14% vs 16% multi-island,
48% vs 47% overlap), so this rests entirely on Tom. Removing it cost 2pp of apparent connectivity
(17% -> 19% multi-island), which is the correct direction: a 12-tile turret was bridging gaps it
should never have reached.

**Production bug, found while debugging the joint tool:** `Ship.detach()` read `c.dirName`, which
never existed — a live component carries `dir` in DEGREES. Every rotated component would have been
reset to "up" when a ship split in two. Fixed with `DIRS.name(deg)`. Body splitting has been in the
engine since S2 and this would have silently corrupted every split of a ship containing a rotated
part.

### 11.4 Joint connectivity: still 1%, and the cause is narrowed but not found

The linking logic itself is **verified correct** on a hand-checked case: two adjacent Armours, each
with all 8 slots, produce `0,0,E,0 meets 1,0,W,0` and link. So the failure is in the data, not the
graph walk.

Three attachment rules, all 838 ships whose every part now has a recovered joint table:

```
 touching (adjacent cells)      10/838   1%
 stalks meet in the gap cell     7/838   1%
 either                         12/838   1%
```

Against reach-2's 81% on the same ships. The gap rule is not the variable.

**Narrowed to the art-to-engine y orientation.** The alignment solver reports `Engine [0,-1]`, which
maps the art's mount cell onto engine tile `(0,-1)` and its nozzle onto `(0,0)` — but `(0,-1)` is
*forward* in engine coords (heading 0 is -y), so this places the mount in front of the nozzle. At
least some footprint anchors are y-flipped relative to the art, which would point every joint the
wrong way and is sufficient to explain 1%. Resolving it means fixing the anchor convention for
Engine, Lazer, Radar and Binary against a hand-checked ship, not more sweeping.

**Production still runs reach-2.** None of the joint work is wired into `powerUp`/`islands` yet.

Current state: 892/892 load, 878 alive, 1.2% of connections dropped, 166 (19%) multi-island.

### 11.5 Hyperdrive, and a metric that should not be zero

**Hyperdrive (Tom):** "a 2x4 hammer head joined with a 3x2 stem but the joins are placed a bit
sparsely." Adopted as 14 cells — a 4-wide x 2-long head with a 2-wide x 3-long stem. This rests
entirely on Tom: there are only 57 instances in the corpus, and every anchor scores ~50% overlap
against a 46.9% baseline, so the measurement is flat and carries no information. The art at 248x299
(~4 x 4.8 cells) is consistent. Its joint slots are still unrecovered.

**"Some ships were genuinely multiple ships as well" (Tom).** This invalidates how S10 and S11 used
the multi-island count. I had been treating it as an error rate to drive toward zero, and picking
the connectivity reach by which rule minimised it. If a saved design is legitimately a carrier plus
drones, then the correct multi-island figure is **not zero**, and reach-2's advantage over 4-way
(19% vs 34%) is partly the reward for over-connecting genuinely separate bodies.

The evidence already pointed this way and was misread: S10.3 measured that ships breaking under
4-way are *larger and more wired* than whole ones (median 13.5 parts and 4 connections, against 8
and 2). That was read as "the residual concentrates in elaborate ships, so a footprint must be
wrong". A carrier with drones is exactly a large, heavily wired design, and fits the same data.

**Consequence:** multi-island cannot be used as a loss function, and the reach rule needs to be
chosen on the physical model instead. That is an argument for finishing the joint work (S11.4)
rather than tuning reach, and it means the true target figure is unknown until multi-body designs
can be told apart from broken ones. No attempt to separate them has been made.

### 11.6 Drawing the model found the bug that had joint connectivity stuck at 1%

Tom: *"if you draw some ships I can probably figure out where you have gone wrong, I just can't
visualize the choices you have made."* Building the drawing tool found it before he had to look.

`tools/corepox-draw.ts` renders footprints, joint slots, anchors and wired ports straight from the
engine's own tables. Writing its coordinate transform forced the question the connectivity tool had
answered wrong in a comment:

```
// Solve art -> engine as (x+ox, s*y+oy) with s = +1 or -1, per type: the art's
// +y is down and so is the engine's, so most types need a pure translation
```
— `tools/corepox-joint-connectivity.ts:22`, before this change.

**The engine's ship-local tile frame is +y forward, not +y down.** Three independent witnesses:

```
rotTile        ([x,y],90) -> [y,-x]        clockwise ONLY in a y-up frame
Engine.tiles   [[0,0],[0,-1]]              nozzle aft, so -y is aft
corepox-render ly = -(c.py - ship.cy)*TILE renderer flips y to get screen space
SEEKER demo    engines y=-1, lazer y=+2, armour y=-2
```

The art SVG is +y down. The two frames agree **visually** and disagree only on the sign of the y
number, so art→engine is `(x+ox, -y+oy)` for every type and the side names N/E/S/W carry across
unchanged. The old solver tried `s=+1` first, and every symmetric footprint (Armour, Orb, Radar,
Lazer, Engine, Turret) matched it with some offset, so it never reached `s=-1`. That is the concrete
mechanism behind §11.4's observation that Engine's mount landed on tile `(0,-1)`, ahead of its own
nozzle. A second bug rode along: the rotation was `(x,y)->(-y,x)`, the opposite sense to `rotTile`.

Fixing both, and adding the `LaserTurret2` cell grid the tool had never had:

```
                             before      after
touching (adjacent cells)    1%          56%   (470/838 ships load as one body)
either (touch or gap)        1%          64%   (540/838)
stalks meet in the gap cell  1%          1%
```

Measured 2026-08-18 over the 838 corpus ships whose types all have joint tables.

Reach-2 still reads higher (81%), but §11.5 removed multi-island as a loss function, so that gap is
not evidence either way until genuine multi-body designs are separated out.

**Residual, quantified.** 52/892 ships (6%) contain a `Hyperdrive`, the only type with no joint
table. `Binary` is the only type whose art cell grid cannot be laid on its footprint by a y-flip at
all — the art's T stem points forward, the footprint's points aft. Both alternatives were measured
and both are worse, so the current pairing stands:

```
footprint stem aft + art grid as transcribed   56%   (shipped)
footprint stem forward                         52%   (--binary-flip)
art grid transcribed the other way up          31%   (--binary-art)
```

The gap rule stays dead at 1% under the corrected frame, so it is not the missing physics; §11.2's
conclusion survives the bug fix.

### 11.7 Three corrections off the drawing, and the mirror that costs 9pp

Tom, reading the first drawing:

> lazer only has 4 joints. binary looks like right occupance, you have 4 joints on the top edge,
> correct, but the sides you have the joints bias to the front but I think they are bias to the back.
> And the back pair (on sides) is currently bias to the back and they should be bias to the front

> I think the warp drive is flipped in y too

The Binary report named a bug rather than a data error. `Binary` is the one type whose art cell grid
has no y-flip fit, so its alignment is a pure translation — which means the art's top lands at the
engine's **aft** and the whole component is drawn vertically mirrored. The draw and connectivity
tools swapped the N/S side *names* for that case and left the slot *indices* on the E/W sides alone.
That inverts exactly the two pairs Tom describes, and in opposite directions, because the bar's side
slots are `[0]` and the stem's are `[1]`.

```
JOINTS.Binary  "0,1": {... W: [0]}   bar left    slot 0 -> drawn forward, should be aft
               "2,1": {... E: [0]}   bar right   slot 0 -> drawn forward, should be aft
               "1,0": {E: [1], W: [1]}  stem      slot 1 -> drawn aft, should be forward
```

Applied, with `Lazer` cut 6 joints → 4 (`S:[0,1]` plus the aft-biased corner slot on each side, the
same arrangement the art gives Radar) and `Hyperdrive`'s 14 cells negated in y so the hammerhead
leads. Measured on the 838 corpus ships whose types all have joint tables, 2026-08-18:

```
lazer 6 joints, slots unmirrored   470/838 one piece (56%)   <- before the corrections
lazer 4 joints, slots unmirrored   463/838 (55%)             Lazer 6->4 costs 7 ships
lazer 6 joints, slots mirrored     390/838 (47%)             the mirror costs 80
BOTH CORRECTIONS                   383/838 (46%)
```

**The correct mirror costs 9pp of one-piece ships.** Binary is the only mirrored type, so all of that
lands on four slots. Two readings fit: joints are not what held ships together (which is what §11.2
already concluded from 4-way being their ceiling), or another type's table is still wrong. The
measurement does not separate them, and multi-island is not a loss function anyway (§11.5), so the
drop is recorded rather than treated as a regression to undo. Corpus load is unaffected: 892/892
construct, 4629 wired / 55 dropped (1.2%).

### 11.8 The archetypes, rebuilt

`tools/corepox-archetype-check.ts` printed the damage the real footprints did to layouts authored
against 1x1 assumptions — 6 of 7 broken, e.g.

```
BROKEN seeker  11 parts  2 islands  10 overlapping cells
       overlap at 0,1: Radar@0,1 + Binary@1,1 + Binary@-1,1
       overlap at 1,-1: Binary@1,0 + Engine@1,-1
```

Layouts moved to `tools/corepox-tourney-specs.ts` and rewritten so **wires name components, not
grid cells**. `Ship.at()` resolves an endpoint by *anchor* cell
(`comps.find(c => c.px === x && c.py === y)`, engine line 390), and the anchor moves whenever a
layout does; naming the component makes that unrepresentable, and `build()` also rejects a port name
the type does not have. All 7 now pass: one island, no overlapping cells, no dangling wires.

Flying each at a stationary turtle from 28 tiles, 20s:

```
             thrust-ticks  shots  closed(tiles)  powered/parts
wall                    0     80           6.5          10/11   no engines; RECOIL moves it
braitenberg           999     20         -30.2            7/7   flees
seeker                999     20           8.7          11/11
proportional          999     20           0.8          11/11
rammer                999      0          -0.3          15/15
turtle                  0      0           0.0            9/9
sniper                997      0          -1.5          12/14   browned out, 2 parts unpowered
```

Structurally legal is not functional. Four of seven barely close, and the control laws are the
reason, not the layouts — the gains were tuned when engines sat at `(±1,-1)`; on real footprints
they sit at `(±2,-3)`, so the torque arms roughly doubled. Sniper's `12/14` is the power budget
working as designed: 3 Lazers at 4 each already exceeds a single Brain's SUPPLY of 20.

Round-robin restored (12 seeds x 2 sides, 60s), so the harness is alive again — but read it as a
harness check, not a balance result, until the steering is retuned:

```
 name           win%   draw%   dmg dealt/match  taken/match
 wall            54     83           0.10         0.08
 seeker          52     81           0.13         0.15
 sniper          51     87           0.09         0.09
 braitenberg     50     97           0.04         0.03
 turtle          50    100           0.02         0.02
 proportional    49     89           0.12         0.11
 rammer          44     85           0.14         0.14
```

Draw rate 81-100% against §1's post-fix 32-81%: the spread collapsed because nothing closes.

## 12. The port, against the shipped constants (2026-08-19)

Tom: *"see if you can get the levels working and the game, decompiling unity assets if you have
to."* The C# is not compiled — `vendor/corepox/Meritocracy/Assets/scripts` is source. Reading it
replaced six guesses with measurements.

### 12.1 HP, dated rather than guessed

`maxHp` lives in the binary prefabs, so it looked unrecoverable. But every serialised ship carries
each component's *current* hp, and `firebase/data/assets.json` carries a `creation_date` per ship.
303 of 892 ships are dated, spanning 2017-11-23 to 2018-02-24, and the two hp populations separate
on one date — 2018-01-14 (`tools/corepox-hp-eras.ts`):

```
type          before 2018-01-14   after      n
Armour              75             100      499
Binary             100              25      196
Constant            50              25      760
LaserTurret2       100              50      116
Lazer              100              75      863
Radar               50              25      219
Brain               50              20      272   (nerfed earlier, 2017-11-29)
Engine              50              50      981   (unchanged)
Hyperdrive / Orb    --         200 / 75          (both first appear 2018-01-14)
```

One patch made everything fragile except Armour, which got tougher. **Armour 100 against a Brain 20
is 5:1**, so the shipped game is about exposing a core, not out-shooting a shell. That is what Tom
remembered ("I remember it being a good missile type ship") and what §1.3 got wrong off the wrong
dump. The engine had Armour 25 / Brain 15 — a shell four times too thin.

### 12.2 Guns are projectiles, and they miss

```
LaserFn.cs:22   emitParticle(ship, lazer, new Vector2(0, 1.8f), new Vector2(0, 20), 1.3f, beam_prefab)
                beam.length = 100;  beam.dmg = 5;
Metrics.cs:6    public static float Tile2Pixel = 0.64F;
```

A bolt *travels*: 20 world u/s ÷ 0.64 = 31.25 tiles/s for 1.3s = **40.6 tiles of range**, and it can
miss a moving target. `beam.length = 100` is the visual shaft scale, not the range. The engine had
been treating it as an instant 100-tile raycast, which is most of why guns dominated self-play
(§1.3's monotonic gun ladder). Verified with `tools/corepox-fidelity-check.ts`:

```
gap 20 tiles -> target took 35 damage in 8s
gap 35 tiles -> target took 35 damage in 8s
gap 50 tiles -> target took  0 damage in 8s     <- past 40.6, nothing lands
one Armour (100hp) under one Lazer: 24.2s       <- 5 dmg on a 1.0s cycle, plus misses
```

### 12.3 Every weapon is the same object, and it does not care whose ship it is

`DamageParticle.cs:12` — `component != this.owner`. The only thing a damage particle will not hit is
the component that emitted it. **Not the ship that emitted it.** So:

- `ExplosiveFn.destroy()` throws 32 fragments evenly around a circle at 2 world u/s for 3s, 5 dmg
  each — a 9.4-tile shrapnel sphere centred inside your own hull. It runs on *destruction*, not only
  on trigger, so a hit on a loaded bomb takes its neighbours with it.
- `EngineFn.emitParticle()` spawns exhaust 1.6 tiles behind the nozzle at 1 world u/s with
  `ttl = Random.value`, carrying `Damage`'s default `dmg = 1`, at a Poisson rate of 2 per tick at
  full thrust. **Your exhaust is a weapon pointed at your own tail.**

```
armour parked in the exhaust: 100 -> 0 hp after 10s of thrust (brain, one tile off the line, 20/20)
core mounted BEHIND the engine: dead in 0.26s of its own exhaust
self-detonation: 6 parts -> 5 alive; own armour hp 100 -> 75 each
```

**Flying all 878 loadable corpus ships alone for 5s, with no enemy and no collisions**
(`tools/corepox-selfharm.ts`):

```
136 (15%) damaged themselves, losing 662 components in total
 32 (4%)  destroyed one of their own Brains
 31 (4%)  killed themselves outright
```

That is the "fun bit" Tom named at the start of the design brief, and it was missing from the port
entirely. It is not a balance choice to make later — it is in the shipped constants.

### 12.4 Two unit bugs the source settled

**Radar distance is in world units.** `RadarFn` sets `distanceOutput.value = nearest.distance`, a
world-unit number. Reporting tiles silently rescaled every `dist < k` test in the corpus by 1/0.64.

**Force is applied in world units.** Unity applied force at a world-unit position against a
world-unit inertia. In tiles the lever arm is 1/0.64 too long and the inertia 1/0.64² too small, so
*both* accelerations pick up the same 1/0.64. The turn radius is unchanged — which is why this was
invisible — but absolute speeds were 1.5625× too slow. After the fix the archetypes engage:
seeker closes 23 tiles where it closed 8.7, rammer closes 15.5 where it closed −0.3.

### 12.5 LaserTurret2: both readings were right

`TurretFn.Awake()` sets `occupancy = new Coord[12]`, and its own ASCII comment matches cell for cell:

```
 XX        y=3      x=0..1
XXXX       y=1..2   x=-1..2
 0X        y=0      x=0..1   <- the 2x1 BASE Tom described
```

The base is the 2×1 that carries the joints; the rest is the arc the gun sweeps, which the prefab
reserves so nothing can be built into it. §11.3 recorded the 12-cell reading as "the swept area, not
the footprint" and dropped it — half right. Restored, with the joints left on the base.

## 13. The campaign, made playable (2026-08-19)

Nine missions, sixteen objectives, all recovered. Before this session five of the nine could be
won with a reference solution and one could be won by doing nothing. The gate is
`tools/corepox-play-missions.ts`, which drives the real `newSession` / `evaluateObjectives` /
`stepSession` cells (via `notebook-import.ts`, no browser) twice per level:

```
mission          solution        handed-to-player      objectives
PlaceBrain      win 2.0s        timeout 60.0s         #  (unsolved .)
Cocoon          win 3.2s        loss 2.1s             ##  (unsolved x#)
ManualAim       win 3.5s        timeout 60.0s         ##  (unsolved ..)
ConnectionLite  win 7.3s        timeout 60.0s         ##  (unsolved ..)
Connection      win 8.1s        timeout 60.0s         ###  (unsolved ...)
Aim             win 26.1s       timeout 60.0s         ###  (unsolved .##)
Avoid           win 11.9s       timeout 60.0s         ##  (unsolved .#)
SideShooter     win 13.2s       timeout 60.0s         ##  (unsolved .#)
TwinTurrets     win 17.1s       timeout 60.0s         ##  (unsolved .#)
```

Both halves are the test. A level nobody can win is broken; so is one that is already won at
t=0, because it teaches nothing. The script exits non-zero unless it reads 9/9 and 0/9.

### 13.1 The mission logic was never lost — it is C#

`Assets/scripts/scenes/missions/` holds one `MissionController` subclass per scene, uncompiled.
`Objectives.textByScene` lists all sixteen objective strings in order, and the count matches the
model exactly (PlaceBrain 1, Cocoon 1, ManualAim 2, ConnectionLite 2, Connection 3, Aim 3,
Avoid 1, SideShooter 2, TwinTurrets 1). Each controller states its win and loss conditions
outright:

```csharp
// CocoonMission.checkStatus()
if (space.findComponent("Brain", "player") == null) { ...LOSS }
else if (space.findComponents("Explosive", "enemy").count() == 0) { ...WIN }
```

Three corrections came straight out of that:

- **Aim counts Explosives, not Brains.** `AimMission.call(ShipComponent)` increments only when
  `component.name == "Explosive"` on team enemy, and `enemiesMax = 4`. The Aim scene contains no
  enemy ships at all — a `CircleSpawn` feeds them. `Rocket.prefab` is one Explosive and one Engine
  with its throttle latched at 40, so four rockets *is* the objective.
- **PlaceBrain and the Connection missions have no loss branch.** They were reading as an instant
  loss during the build stage, when the player has no core yet by definition. Derived rather than
  flagged: a mission with neither enemies nor a spawner cannot be lost.
- **A win is not committed the moment the objectives read done.** Every controller runs
  `checkStatus(); Invoke("checkStatus", /* secs = */ 2)`, and the loss branch is tested first. That
  two-second delay is load-bearing for Cocoon: the bombs satisfy "no enemy Explosives left" *by
  detonating*, and their shrapnel is still in the air. `stepSession` now holds a win for 2s and
  lets a loss overturn it. Cocoon's unsolved run went from `win 0.2s` to `loss 2.1s`.

`reach` had the opposite problem. It is a `TriggerShipDestroy` in the original — the ship is
recycled on entry and the callback fires once — so it must latch. Testing it as a live predicate
made ConnectionLite and Connection unwinnable the moment the settle window was added: the ship
crossed the jump zone at speed and coasted out the far side before the two seconds were up.

### 13.2 The prefabs carry their own ShipLoader JSON

`Assets/prefabs/ships/*.prefab` are binary, but each embeds the exact JSON string
`ShipLoader.fromJson` deserialises, wiring included. `tools/corepox-extract-prefabs.py`
brace-matches them out (a non-greedy regex stops at the first `]}`, which is inside a connection).
Eight ships, all hand-built by the author, all with connections that a scene extract loses:

```
Bulldozer   19c 17w      DelayBomb   3c 3w      Rocket   2c 0w
Strafer     14c 15w      DrifterShip 3c  1w     Ship     2c 0w
StraferThin 19c 18w      targetDrone 5c  0w
```

These are the sharpest available test of the port tables, and two of them failed it.

**Binary's `a` and `b` were swapped.** DelayBomb is a countdown built out of arithmetic — there is
no timer component in the game:

```json
{"type":"Binary","pos":[0,0],"param":"PLUS",
 "overrides":[{"name":"a","value":-50},{"name":"b","value":1.0}]},
"connections":[{"from":[0,-1],"to":[-1,0]}, ...]
```

The output at `(0,-1)` feeds back into `(-1,0)`. The accumulator has to be `a` — wired into `b` the
value would be `-50 + b` with `b` chasing it, and it diverges instead of counting. So `a` is the
left cell, `b` the right; the table had it the other way round, which means **every MINUS and
DIVIDE in the corpus was computing backwards**. FollowCourse's `UnfinishedOrbDrone` confirms it on
different geometry: its TIMES Binary saved `a = 102.83528137207031`, its Radar saved
`angle = 102.83528137207031`, and the connection from the radar's angle cell lands on the cell that
rotates to `(-1,0)`.

The fuse is 51 ticks — `-50` counting up by 1 at 50Hz — so 1.0s, then `ExplosiveFn.CHARGE_S` of
0.1s. Cocoon detonates at 1.2s of simulated time.

**LaserTurret2's inputs are both on its base.** Strafer and StraferThin each dropped exactly two
wires, and all four landed on a turret cell at local `(1,0)`. `TurretFn.Awake()` puts the base at
`(0,0)` and `(1,0)`; `ManualAim`'s recovered ship wires its Constant into `(0,0)` under the
objective text *"adjust turret angle using constant"*. So `(0,0)` is angle, `(1,0)` is fire — the
old table had angle at `(-1,0)`, which is not part of the component. Strafer then reads
`bearing->angle, dist->fire` on both turrets, which is what a hand-built ship should read.

```
                before          after
Strafer         13 resolved, 2 dropped   ->  15 resolved, 0 dropped
StraferThin     16 resolved, 2 dropped   ->  18 resolved, 0 dropped
corpus          4621 resolved, 63 dropped (1.3%);  753/892 ships one piece (84%)
```

### 13.3 Saved connector values are ship state, and 881 of 892 ships have them

`ShipLoader.save` writes every non-zero `InputConnector` and `OutputConnector` value as an
`OverrideSpec`, and `fromJson` restores them by name. The engine was discarding all of them.
Restoring them (`applyOverrides`, keyed by a Unity-name → port-name map) changes what the corpus
*does*, not just what it looks like:

```
892 ships load
   91 start with an UNWIRED engine already at throttle
  609 with an unwired lazer already firing
    0 with an unwired explosive already triggered
```

609 hot lazers is not a rounding error — it is why only 4 corpus wires go to `dist->fire` and 3 to
`out->fire` while 454 go to `bearing->angle`. Players aimed their turrets with a wire and left the
trigger latched on. ManualAim ships the same way: `fire_input = 1.0` on the turret, the angle wire
already made, so the whole mission is typing a number into a Constant.

Self-harm was re-measured after the change: 142/878 ships (16%) damage themselves inside 5s alone
with no enemy present and 45 (5%) kill themselves outright, against 15% / 4% before.

### 13.4 Three inventions that had to come out

The power budget, recoil and impulse collision damage were all added on 2026-08-18 for balance
(§8). Each broke a recovered level, and each was a different kind of mistake.

**Power budget — wrong for brainless ships, and then removed entirely.** `ProximityMine` and
`DelayBomb` have no Brain. The budget is supplied per Brain, so they got nothing: not powered, and
`ship.alive` gated stepping, so they did not drift, compute, or even register as targets. The
budget models a core rationing supply; with no core there is nothing to ration. That was patched
by powering a brainless hull fully and gating stepping on `live.length`.
**The budget itself came out on 2026-08-20** — there is no power system anywhere in the original
(`ShipComponentStats` is `hyperspeed`, `maxHp`, `panel`), and the gun ladder it was justified by is
retracted. See §8.5. Note what the patch had already told us: a mechanic that has to special-case
the ships the game ships with is a mechanic the game does not have.

**Recoil — not in the original at all.** `LaserFn` and `TurretFn` emit a `Damage` particle and
never touch the rigidbody. With recoil on, ManualAim *solves itself*: the turret's own kick rotates
the hull, and a beam fired at the wrong angle eventually sweeps across the target. Now
`World.RECOIL`, default false. §8.4 already recorded recoil as a measured dead end for balance;
this is a second, independent reason.

**Collision damage — the original is far more brutal.** `Ship.OnCollisionStay2D` does
`component.damage(5)` per contact point, *every frame the two stay in contact*: 250 dmg/s, with a
`// TODO force based impact damage` next to it. The invented impulse model read as a soft bump. At
the real rate a rocket that reaches you is fatal and 100hp of armour buys 0.4s — which is exactly
the shape Cocoon and Aim are built around.

### 13.5 A turret aims from the radar and fires from itself

The miss is not noise and it is not range-dependent. A radar→turret wire aims along the line from
**R**, the radar, but the beam leaves from **T**, the turret. Decompose `P - T` as
`(P - R) + (R - T)`: the component of `R - T` perpendicular to the sightline is the miss, and it is
constant at every range. `tools/corepox-parallax.ts`, against Aim's own recovered hull (radar at
`(0,-3)`, turret at `(0,0)`, 3 cells apart):

```
bearing  range  shots  hits  outcome          bearing  range  shots  hits  outcome
     0°      8      6    12  DESTROYED             0°     16      6    12  DESTROYED
     5°      8      5    12  DESTROYED             5°     16      5    12  DESTROYED
    10°      8     20     0  survives             10°     16     20     0  survives
    45°      8     20     0  survives             45°     16     20     0  survives
```

`3 · sin(10°) = 0.52` against a component half-extent of 0.5. The cliff is exactly where the
geometry puts it, and identical at 8 and 16 tiles as predicted.

That makes the recovered level unplayable, and it should not be. Aim exists to teach the
radar→turret wire; the `LazerHardpoint` composite it awards is built around one (radar at `(0,-1)`,
turret at `(0,2)`); 454 of the 4621 corpus wires are one. Both the mission ship and the composite
put the radar *directly behind* the turret, which is the arrangement that zeroes the perpendicular
offset dead ahead — so the design knows about the axis, and expects targets from the front.

The remaining free parameter is the beam's own width. `DamageBeam.Awake` sets
`shaft.transform.localScale = (length, 1, 1)` with `length = 100`, and places the tail at
`-length/100` — one world unit back. Read one way the sprite is 100 units long and the beam is
1 unit long and 0.01 wide; read the other it is 1 unit long and 1 unit wide. The prefab is binary,
so the sprite's own size is not recoverable and the numbers are consistent under both readings.

`BEAM_R = 0.75` tiles is therefore **chosen, not measured**, and is commented as such in `UNITS`.
It opens the window to ±25°, which is what makes the wire the mission teaches actually work. If the
collider size is ever recovered, this is the number to check first.

*Re-measured 2026-08-21:* the window is **±10°**, not ±25° — 10° destroys at both 8 and 16 tiles,
15° survives. The table above (10° surviving) is older still, so the window has moved twice and
neither move was recorded. It did **not** move when footprints became solid: `corepox-parallax.ts`
prints hit-for-hit identical rows against the engine before and after that change, which is why
`BEAM_R` was left alone there. The ±25° figure has no measurement behind it that survives.

**`BEAM_R` came down to 0.25 on 2026-08-21, and the argument above is what was wrong with it.**
The window is real — swept on Aim's own hull, it is ±10° at 0.75, ±5° at 0.5, dead-ahead-only at
0.25 and 0.1:

```
BEAM_R   0.75   0.5    0.25   0.1
window   ±10°   ±5°    0°     0°
```

But `corepox-parallax.ts` holds the target **still**, and Aim's rocket does not hold still — it
closes head on. Playing the actual mission at each width, Aim wins at every one of them: 26.8s,
26.8s, 27.2s, 27.6s, and 27.6s at zero. The level the width was chosen for does not need the width.

What the width did do was damage whatever sat one tile to the *side* of a barrel, because
`HIT_R + BEAM_R = 1.25`. Tom, on corpus ship FD96E630: "self intersects with its own radar and
dies, but that seems like a collision bounds bug". It was not the Radar's bounds — that ship's
Lazer at `[3,1]` fires up the `x = 3` column and the Radar's cells at `x = 2` are 1.0 tile away.
Three of its components were losing 5hp/s to its own guns; at 0.25 one is, and that one is a Lazer
firing straight up its own turret's column, which is the ship's design and not the engine's.

So the constant is now bracketed by two things the game has to do rather than by one thing it turns
out not to need:

| constraint | source | bound |
|---|---|---|
| a beam must not hit the component one tile to the side | FD96E630 | `< 0.5` |
| TwinTurrets must stay solvable with the parts it hands you | `corepox-solve.ts`: 0 of 140 builds win at 0, 1 of 140 at 0.25, the same 1 at 0.4 and at 0.75 | `> ~0.1` |

0.25 is the bottom of the bracket. Still fitted, still the first number to check if the collider is
ever recovered — but the prefab does argue small: `shaft.localScale = (100, 1, 1)` puts the tail at
one world unit, so the sprite is 0.01 units long at unit scale, and its **y is not scaled at all**.


Two consequences fall out and both are authentic. `CircleSpawn` carries `angle_min_deg` and
`angle_max_deg` as scene fields — a fixed turret only covers its own half-plane, so the spawn arc
was always a level parameter. Aim's is set to ±22°. And past about 45° the Aim hull's own armour
box is in the beam's way: the shot is consumed on its own ship, which is `DamageParticle`'s
`component != this.owner` doing exactly what it says.

### 13.6 Reference solutions found by search, not by hand

A hand-written reference solution only proves the author can imagine one. `tools/corepox-solve.ts`
enumerates every build the mission's own inventory and envelope permit — engine cell × constant
cell × throttle, remaining armour packed nearest-the-core first — and reports which win:

```
SideShooter   25 of  92 legal builds win, fastest 4.5s
TwinTurrets   48 of 140 legal builds win, fastest 15.0s
```

The first run of that search returned builds with an Engine sitting inside an Explosive. Nothing in
the engine had ever forbidden two components sharing a cell, and the physics went along with it —
now `Ship.overlaps()`, and build mode tests the whole footprint of the piece being placed rather
than its anchor cell, which had let a 2-cell Engine or a 6-cell Radar be dropped into occupied
space.

Where a level number was tuned, the measurement that forced it sits next to it in
`corepox-missions.js`:

- **Avoid**: the mines are 12 tiles off the run. A mine's fragments carry 2 world units/s for 3s,
  a nominal 9.4-tile kill radius, but the radar measures to the nearest *component*, so a 5×5 mine
  against a 5-wide ship reaches about 11. Measured at 10 the reference run dies, at 12 it clears by
  a tile (`tools/corepox-avoid-sweep.ts`). The corridor is the mission.
- **SideShooter**: the target moved from `(6,-18)`, where 2 of 120 builds won and the fastest took
  56s, to `(3,-10)`, where 33 of 120 win and the fastest takes 4.5s. Same ship, same inventory —
  only the target moved.

Mission *positions* remain authored throughout and are labelled as such at the top of
`corepox-missions.js`. Unity's binary scenes keep transforms without a readable type tree;
`corepox-extract-transforms.py` recovers positions by shape but cannot attach them to objects, and
what it finds is prefab-internal sub-tile offsets rather than ship placements.

### 13.7 What the scene extract cannot be trusted for

The TwinTurrets scene yields thirteen "loose" components — two Engines, a Radar, a MINUS Binary, a
Constant, four Armour, four Explosives — that look exactly like a Braitenberg ram-bomber and would
be a far better player ship than the authored one. They do not fit together: laid out under the
recovered footprints they produce three overlaps (Radar(0,-1) over Brain(0,0), Engine(-1,-1) over
Binary(0,-2), Engine(2,-1) over Constant(2,-2)), and no anchor convention fixes all three.
FollowCourse shows why — its loose list is emitted three times over, once per prefab instance. The
extractor groups components by prefab, not by ship, so a loose list can mix ships. TwinTurrets
keeps an authored player ship, and this is recorded rather than worked around.

### 13.8 Still open

- `tools/corepox-engine-test.ts` fails, and it is the *fixture* that is stale: its hand-written
  SEEKER has a Radar overlapping a Binary, written before the 2×3 Radar footprint was recovered.
  It also brownouts its Constant — the archetypes in `corepox-tourney-specs.ts` are built on real
  footprints and load clean, so the old fixture should be retired or rebuilt on them.
- `sniper` fires 0 shots. Its gate is `LT(dist, 12)` and `dist` is in world units since §12.4, so
  the threshold is 18.75 tiles, not 12. Every corpus threshold moved the same way; the archetype
  gains need re-tuning against the new units, which was already open from §11.8.
- Hyperdrive is still the only type with no joint table (52/892 ships contain one).

### 13.9 The composite definitions are not in Firebase

Tom asked whether composite definitions lived in the Firebase DB. They do not — a `CompositeSpec`
is a JSON string, and it appears in three local places: `SpoilsOverride.composites` (a `string[]`
field on a mission scene object), hard-coded in a `MissionController`, and inside any ship that
uses one, as the `Composite` component's `param`. `tools/corepox-extract-composites.py` finds four,
and they need three different unescapings to read — plain JSON in a scene field, C# verbatim
strings that double every quote, and a spec nested inside another JSON string where every quote is
backslash-escaped.

```
LazerHardpoint      scripts/scenes/missions/AimMission.cs    10c  2w   Aim's spoil
UnfinishedOrbDrone  scenes/missions/FollowCourse.unity        9c  4w
UnwiredOrbDrone     scenes/missions/FollowCourseAdvanced      13c 0w
BrautenbourgsFirst  firebase/data/ships.json                  5c  4w   228 corpus uses
```

All four load with 0 dropped wires, 1 island and no overlapping cells. `LazerHardpoint` reads
`bearing->angle` and `dist->fire` — a fourth independent confirmation of the LaserTurret2 port
cells, on an artifact that was not used to derive them.

### 13.10 The shipped campaign is seven missions, and the order was wrong

`prefabs/missions/InitialCampaign.prefab` holds the `List<Mission>`, and its strings survive a
plain scan in serialised order:

```
seed birth birthing PlaceBrain    armour cocoon cocoon Cocoon
connectlite connectlite run ConnectionLite    manualaim manualaim gunner ManualAim
connect connect connection Connection    aim aim aiming Aim    avoid avoid avoiding Avoid
tutorial
```

Seven missions: **PlaceBrain, Cocoon, ConnectionLite, ManualAim, Connection, Aim, Avoid**. The
model had ManualAim before ConnectionLite; corrected. Each entry is four non-empty strings against
five `Mission` string fields, so one field per mission is empty and the exact field mapping is not
pinned down — the *order* is, which is what the campaign needs.

SideShooter and TwinTurrets have full objective text in `Objectives.textByScene` but no slot in the
campaign list, so they are kept after the seven as bonus levels rather than promoted into the arc.
FollowBoss, FollowCourse and FollowCourseAdvanced have scenes but neither objective text nor a
campaign slot; one of their composites is named `UnfinishedOrbDrone`, which is a fair summary.

### 13.11 The editor was not usable, for three separate reasons

All three were invisible to the headless gate, because the gate hands the engine a finished ship.
Found by driving the DOM (`tools/corepox-qa-connect.mjs`, which solves ConnectionLite by clicking).

**A connector belongs to a cell, not to a component.** `portsAt` resolved by anchor and took
`ports[0]`, so a Binary's `b`, a Radar's `dist` and a turret's `fire` could not be wired at all —
which is most of what the corpus does. It now resolves the clicked cell against the port table with
the component's rotation, the same rule `loadShipSpec` uses to read a saved ship.

**Nothing showed where the connectors were.** Connect mode now paints every port cell, green for
outputs and blue for inputs, with the legal targets for the current step brought forward. Guessing
which cell of a six-cell Radar carries `dist` was not a puzzle, it was a hidden control.

**The camera moved between the paint and the click.** Adding a framing camera (§13.11 below) made
every click land a tile out in the editor: the overlay painted a connector at one viewBox, the
click was aimed at that pixel, and an intervening `render()` had eased the viewBox 12% toward its
target. The camera now snaps whenever the game is not running, and eases only during a match. The
symptom was a first click that selected correctly and a second that resolved to the neighbouring
tile — visible only because the debug line printed the resolved tile:

```
CP click 0 1 mode connect ports {"t":"Constant","outs":["out"]} wireFrom null
CP click 0 0 mode connect ports null wireFrom {"px":0,"py":1,...}
```

The second click was aimed at the Engine's input at `(0,-1)`.

**The camera itself.** The view was a fixed box on the origin, so Avoid's player left the frame at
y=-38 and Aim's rockets spawned 22 tiles outside it. `battlefield` now frames every live body plus
any fixed points the caller names, eased, never tighter than a minimum span. The two modes want
different things and say so: editing frames the ship at a 16-tile minimum, a running match frames
everything including the jump zone. Both are set through `view.focus` and `view.minSpan`, which are
mutable on the returned view.

## 14. Playing the campaign by clicking (2026-08-19)

§13 ended with the campaign at 9/9 under `tools/corepox-play-missions.ts` and the editor fixed by
hand-driving one mission through the DOM. That is two different claims about two different pieces
of software. The gate builds `new Ship(m.solution)` and hands it to the engine; it never touches
`place`, `portsAt`, `setParam` or `rebuild`. So it reports 9/9 for a game a player cannot finish.

`tools/corepox-qa-campaign.ts` closes the gap. It reads `MISSIONS` from the module (not a copy),
takes each mission's own reference solution as a *plan*, and executes it with real input: click the
part in the tray, click the destination cell, click the source connector then the sink connector,
type the number into the field. Tile-to-pixel comes from the game's own `tileToView` through a `qa`
seam on the view element — re-deriving it in the test would be exactly the copy that drifts.

First run, immediately after §13:

```
4/9 completed by clicking, not by handing the engine a ship
```

Three defects, none of them visible to the headless gate.

### 14.1 The envelope constrained the footprint, not the anchor

SideShooter and TwinTurrets could not be built at all. Both solutions put an Engine on a cell the
mission's own envelope lists:

```
SideShooter envelope [[-1,0],[0,-1],[1,-1],[-1,-1],[1,1],[-1,1]]
solution adds:       Engine@0,-1  Constant@1,1
Engine tiles:        [[0,0],[0,-1]]      -> occupies [0,-1] AND [0,-2]
```

`[0,-2]` is not in the envelope, and `place()` tested every cell of the footprint against it, so the
placement silently did nothing. The rule is anchor-in-envelope plus no-overlap: an engine nozzle
hanging off the back of the hull is the normal case, not an error. Overlap is still checked across
the whole footprint — that is what §13 added `Ship.overlaps()` for, and it stays.

Both parts of the same check were written in one line in §13 and only one of them was right.

### 14.2 Editing a ship disarmed it

ManualAim's whole mission is to type an angle into a Constant. Typing it made the mission
unwinnable. `setParam` rebuilds the ship — deliberately, because mass, centre of mass, inertia and
the topological order are all computed in the constructor — and the rebuild goes through
`specOf(player)`, which emitted `{type, pos, dir, hp, param}` and **dropped `overrides`**.

`overrides` are the saved connector values recovered in §12: ManualAim's turret arrives with
`fire_input` latched at 1 from `ManualAim.unity`. Rebuilding without them unlatched the trigger, so
the player typed the correct angle at a gun that no longer fired. Avoid failed the same way.

The component now carries its `overrides` and `specOf` writes them back. Headless, nothing changed
(9/9 before and after) because the gate never rebuilds — which is the point.

### 14.3 A part you place has no value yet

With 14.1 and 14.2 fixed the campaign read 7/9. The two engine missions still failed, and the
harness said why:

```
 8. SideShooter    ----  built 4/5 parts 2/2 wires
      MISSING PARTS Constant@1,1=100
```

A Constant placed from the tray arrives with no `param`. The test was diffing the solution against
the *handed* ship to decide what to type, so it only ever typed into fields that already existed.
Diffing against the *live* ship instead covers both cases. This one was a defect in the harness,
not in the game, and it is recorded because the distinction was not obvious while reading the log:
"built 4/5 parts" with all wires present looks like a game bug.

Final:

```
9/9 completed by clicking, not by handing the engine a ship
```

Both gates now run: `corepox-play-missions.ts` (engine, ~2s) and `corepox-qa-campaign.ts`
(browser, ~4min). The first is the fast one; only the second can see the editor.

### 14.4 The engine test was testing a ship that cannot exist

`tools/corepox-engine-test.ts` had been failing since the footprints were recovered (§10). The
cause was its fixture, not the engine: a hand-drawn "SEEKER" whose Radar at `[0,1]` is 2x3 and
therefore overlapped four of its own Binaries. It was written when every component was assumed 1x1.
`Ship` loaded it anyway — nothing checked overlap until §13 — and the test read FAIL for weeks.

Rebuilt on `corepox-missions.SHIPS`, which is entirely recovered from the scenes. Nothing in it is
hand-drawn now:

```
-- recovered specs --      11 ships: no overlaps, one island, 0 dropped wires
-- piloting --             drifter at throttle 0: 0.000 tiles/3s;  at 100: 12.64
-- damage --               fuse 1.14s; target 420 -> 365 hp; the bomb shreds itself (3 -> 0)
-- guns --                 mark 420 -> 365 hp in 12s; 600 ticks in 20ms
-- determinism --          two runs identical over 10 sampled frames
```

Two of those checks were wrong before they were right, and both mistakes are the same shape —
asserting on the wrong quantity:

*Parts, when the answer is hit points.* "blast damages the neighbour" asserted `live.length < 5`.
Armour is 100hp and a fragment is 5, so a working blast that lands 11 fragments destroys nothing.
The blast was fine; the assertion could only ever pass for a much bigger weapon.

*A gun that never fires.* The first match pitted `laserpost` against `shooter` and read `draw`.
`laserpost`'s recovered wiring is `bearing -> angle` with nothing on `fire` — it aims and never
shoots, and neither ship has an engine. `manualAim` is the one recovered spec whose trigger is
latched, so it is the only one that tests the gun rather than the turret. Controlled against the
same ship with the turret removed:

```
with turret      hp 420 -> 365   ticks with a beam in flight: 12
turret removed   hp 420 -> 420   ticks with a beam in flight: 0
```

*Not a defect:* `loadShipSpec` is for Unity's cell-addressed connections (`{from: [cell], to:
[cell]}`), and running our own port-named specs through it reports every wire as dropped. The test
now only applies it to specs that carry no port names. `lazerHardpoint` is the one recovered
composite still in that form, and it is the only spec exercising that path.

### 14.5 Unattributed

`Error: <rect> attribute height: A negative value is not valid. ("-3")` appears once per campaign
run. Not corepox: its only rects are `TILE`-sized. It reproduces neither at boot nor during a
match, and `svg-lens`'s resize-agreement property test builds `<rect>` documents from arbitraries
and drags corners past their pivot, which produces exactly that. Not chased further — an invalid
SVG attribute is ignored by the renderer.

## 15. JOINTS landed in engine frame (2026-08-19)

The joint table was recovered from the vector art by `tools/corepox-joints-from-art.py`, which reads
SVG, where **+y is down**. The engine's ship-local tile frame is the opposite: **+y is forward**
(`rotTile` is `(x,y)->(y,-x)`, clockwise only in a y-up frame; `Engine`'s `[[0,0],[0,-1]]` puts the
nozzle aft). The table was stored in the art frame and converted on read — twice, by two separate
copies of the conversion: `@tomlarkworthy/corepox-components` on load, and `tools/corepox-draw.ts`
at draw time. §11 records the two sign bugs that came out of that.

There was a third symptom nobody had attributed. `LaserTurret2`'s joints were authored from Tom's
description, in engine frame, so the art-to-engine *fit* had nothing to fit: `ARTCELLS.LaserTurret2`
is the 2x1 base, `TYPES.LaserTurret2.tiles` is the twelve cells `TurretFn.Awake()` reserves, and no
translation maps two cells onto twelve. `ALIGN` returned `null`, `toEngineFrame` returned `null`,
and the component page rendered the turret with **0 joints** instead of 8. Same in the drawing tool.

The table now lives in engine frame in `corepox-engine`, and the conversion is gone from every
runtime path. What each type carries, unchanged in content:

```
Engine        4 slots     N[0,1] E[1] W[1] on the mount cell, nothing on the nozzle
Lazer         4           aft cell only
Binary       12
Radar         6           S[0,1] on both aft cells, plus W[0] and E[0]
Orb           4
Brain/Constant/Explosive/Armour  8 each
LaserTurret2  8           was 0 in the browser and in the drawing
```

**Verified by round-trip, not by eye.** `bun tools/corepox-art-frame.ts` converts the engine-frame
table back and compares it against the literal art table the Python tool emitted:

```
all 10 types round-trip to the recovered art table
```

That is the check that matters, because a frame error is exactly the kind of change that looks
right in a drawing. It runs against the engine's live table, so it fails if a later edit — through
the component page's paste-back snippet, say — lands a mirrored entry.

The four `corepox-joint-*.ts` investigation tools were written against the art frame and hard-code
art cell keys (`Lazer`'s `"0,2"`). They now go through `toArtFrame` in `tools/corepox-art-frame.ts`,
which is the only conversion left and is not on the runtime path. `corepox-joint-connectivity.ts`
still reproduces its recorded finding after the move:

```
 touching (adjacent cells)    235/838 ships one piece (28%)
 stalks meet in the gap cell  7/838 ships one piece (1%)
 either                       267/838 ships one piece (32%)
```

against reach-2's 84%. **So the open task "wire JOINTS into powerUp/islands, replacing the uniform
reach-2" is retired, not deferred.** It contradicts the finding recorded directly below it in the
task list — reach-2 *is* the physical model, joints are not the gap, and 4-way is their ceiling.
Doing it would take connectivity from 84% to 32%.

*Not claimed:* that the joint table is right. It is recovered from art under a reading rule
(a curved corner admits no connector) and corrected in four places by Tom from memory. Nothing in
the simulation reads it yet, so nothing tests it. What is claimed is narrower: it is now stored in
one frame, read the same way everywhere, and the round-trip proves the move lost nothing.

## 16. The archetypes against real player ships (2026-08-19)

§8 asked why `rammer` and `wall` did not work and answered it from self-play — the roster fighting
itself. Nothing had ever fought the roster against the 892-ship dump. `tools/corepox-archetype-vs-corpus.ts`
does: 40 corpus ships, deterministically sampled, four start bearings each, 3000 ticks (60s), so a
ship that only works head-on cannot fake a score.

Opponents are filtered to legal and in-budget — no dropped wires, no overlapping cells, one body,
and power draw inside its own supply. **234 of 892 survive that filter**, which is itself the
headline number: three quarters of the dump is either broken under the recovered tables or was
built over budget. An over-budget ship fights with parts dark, which measures the budget rather
than the design, so they are excluded.

```
legal in-budget corpus ships: 234; sampled 40      SEED=20260819

archetype        win   loss   draw   of 160 duels
wall              5     32    123   3% win
braitenberg       2      4    154   1% win
seeker           34     39     87   21% win
proportional     24     37     99   15% win
rammer            7     70     83   4% win
turtle            2     13    145   1% win
sniper           35     43     82   22% win

roster overall 9.7% win, 21.3% loss, 69.0% draw
```

Seeded, and it had to be — see §17. The first version of this table was run unseeded and read
10.1 / 21.6 / 68.3 with `rammer` on 11 wins rather than 7. The overall shape survived the fix; a
single archetype's row moved by up to 4 duels in 160.

**68.3% draws.** The stalemate §8 diagnosed as time-to-kill is still the dominant outcome against
real opponents, and it is worse for the archetypes that do not steer: `braitenberg` draws 96% of
its duels and `turtle` 91%. `rammer` is the only one that loses more than it draws (73 losses of
160) — it closes, and dying on contact is a decision.

`sniper` is second at 22%, a duel behind `seeker`, and it was firing **zero shots** until this morning: its range
constant was browned out (see the commit "sniper fired 0 shots because its range constant was
browned out"). Before that fix it would have scored like `turtle`. That is a caution about the
whole table — these numbers measure the roster as currently built, and the roster has bugs in it.

### 16.1 One ship beats the entire roster

`2259C56C5600E341A3D81AF6781653BD` — nine components, 16 of 20 power — takes 24 of 28 duels:

```
ID=2259C56C5600E341A3D81AF6781653BD bun tools/corepox-archetype-vs-corpus.ts

wall           W1 L3 D0
braitenberg    W0 L1 D3
seeker         W0 L3 D1
proportional   W0 L3 D1
rammer         W0 L4 D0
turtle         W0 L4 D0
sniper         W0 L4 D0
```

It is a Braitenberg with a latched gun: `radar.bearing` goes straight into one Engine and through
`MINUS(0.01, bearing)` into the other, and the Lazer carries `input: 1` as a saved connector value,
so it fires continuously while it turns. Two Orbs, one Constant, one Brain. It closes to 2.6 tiles
from every one of the four bearings and kills a nine-part armour box from all four.

Nothing about it is clever. It is the shape `braitenberg` in the roster already has — and
`braitenberg` scores 1%. The difference is layout: this ship's engines and radar are placed so the
torque arms work, which is the open "retune archetype steering" item stated as a measurement rather
than a suspicion.

*Depends on `vendor/corepox`*, which is untracked (2.8 GiB, and it contains live GCP service-account
keys — see the repo warning). The sampling is deterministic given that dump, so the table above
reproduces; without it the tool cannot run at all.

*Not claimed:* that 10.1% is a fair measure of the archetypes. Four bearings, one opponent sample,
a 60-second cap that produces two thirds draws, and a roster with at least one known bug in it as
of this morning. What it does establish is a floor: **the hand-built roster does not beat the real
corpus**, and the reason is steering, not weapons.

## 17. The simulation is stochastic, and the determinism check did not know (2026-08-19)

Two consecutive runs of the same six-ship benchmark, same sample, same code, scored `sniper` at
13% and then 4%. The engine test had been asserting determinism the whole time and passing.

Both facts have one cause. Exhaust emission is a Poisson sample — `Misc.samplePoisson` in the
original, reproduced by Knuth's method — and exhaust **does damage**, so any match in which an
engine thrusts is stochastic. The engine test's determinism check fought `laserpost` against
`shooter`:

```
laserpost   Radar + LaserTurret2 + Brain + 3 Explosive     no engine
shooter     Brain + Lazer + Explosive                      no engine
```

Neither has an engine, so the check never reached the only random path in the simulation and passed
for free. It was written to guard the engine and it was guarding nothing.

**The randomness stays** — it is faithful, and a stream of damage behind a thrusting ship is a real
mechanic, not noise to be tidied away. What changed is that it is now *addressable*:

```js
World.rng = Math.random;       // the default, and the shipped behaviour
World.rng = seedRng(12345);    // mulberry32, exported from corepox-engine
```

`seedRng` is exported rather than copied into each tool, so a benchmark, a test and a replay draw
the same stream from the same seed. Verified:

```
unseeded: 24.3080/32.8709/11/14   24.3139/32.8537/11/14
seeded:   24.3080/32.8709/11/14   24.3080/32.8709/11/14   IDENTICAL
```

The engine test now checks three things instead of one, and the third exists so this cannot go
vacuous again:

```
PASS  seeded runs agree exactly                   -6.0091/-143.4339/5/5/231433
PASS  unseeded runs differ (the path is live)     .../233425 vs .../229703
PASS  engineless match is deterministic anyway    10 sampled frames identical
```

The signature is not the ship's position. A ship's own motion does not depend on its exhaust, so
two unseeded runs of a *single* thrusting drifter end at the same coordinates to four decimal
places — comparing positions is exactly how the check went vacuous the first time. The signature
sums the live particle count every tick, which is the stochastic quantity itself.

*Consequence for everything measured before today:* any corepox number produced from a match with
engines carries run-to-run variance that was never stated. The archetype table in §16 moved by up
to 4 duels in 160 between an unseeded and a seeded run. Numbers from engineless fixtures — the
port-table work, the corpus load statistics, the campaign gate — are unaffected.
