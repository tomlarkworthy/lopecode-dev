- [x] **The belt is made of minerals, not of ship parts** (Tom, 2026-08-21 — "I could not find any
      ore in the astroids. Its weird having lazers in there... I think rocks can be 3x1 and 2x2
      components. Ore might be 1x1 or 1x2. They need their own component type though, we should not
      be litering normal components in the astroid belt. I think we should be aiming for much larger
      chunks (50 components) so it taks quite a while to get to the ore."). This replaces the model
      in the entry above: no `Armour` walk, no real components buried in the rock.

      Four new `TYPES`, all `mineral: true`, which is also what keeps them out of the shipyard and
      lab palettes (`Object.keys(TYPES).filter(t => t !== "Composite" && !TYPES[t].mineral)`):

      ```
      RockSpar  3x1  hp from cfg   RockSlab  2x2  hp from cfg
      Ore       1x1  hp 1e9  ore 30      OreVein   1x2  hp 1e9  ore 75
      ```

      **Ore was unshootable for six hours, and that was wrong.** `hp: 1e9` — a number no weapon
      reaches — made mining a distinct verb: cut the rock *around* a seam until the piece floats
      free, then fly into it. It was introduced to kill a real problem (the miner kept destroying
      its own prize, `seam=Ore hp25 -> 5`, and the four fire-discipline rules written to stop that
      deadlocked against each other in three different ways). It worked, and it deleted the game.
      Tom, the same day: "We want people to shoot multiple ores to get money. Thats the fun,
      designing a ship that optimizes swarming and mining a lot in parrallel... the game is
      exploration and mass farming." An encounter you excavate is one seam at a time, and one seam
      at a time is not a farm.

      **Ore now breaks at twice rock's toughness per tile**, `Ore` 40 and `OreVein` 80 against
      rock's 20, overridden per component from the field's own `rockHp` so the ratio is what the
      engine fixes rather than the number. Shooting a seam is the harvest. New cell `cashDead`
      snapshots the ore alive *before* `world.step()` and pays for anything at `hp <= 0` after it —
      the test is `hp <= 0` and not "left the ship", because `splitDetached` hands a component to
      another hull without killing it and being handed to a new hull is not being mined. Ramming
      pays through the same path: `collide` breaks a seam exactly as a beam does. Scooping still
      works, so a piece cut free can be flown into for the same value.

      The four fire-discipline rules stayed deleted, for the opposite reason to the one that
      deleted them. They only ever existed to serve a third model — ore breakable AND breaking it
      a loss — which is not this one and was not the last one either.

      Pooled gate, 5 field layouts x 4 rng pins, before and after:

      ```
      indestructible ore   15/20 runs paid   40 pieces   1290 scrap
      destructible ore     20/20 runs paid   93 pieces   3060 scrap
      ```

      **A type with no `JOINTS` entry bonds to nothing.** `Ship.islands()` bonds two components only
      where their joint points coincide, and `jointsOf` returns `[]` for a type the table does not
      name. A 53-piece chunk therefore read as **53 islands** and would have shattered at t=0. The
      four mineral types get a full-perimeter entry, both slots on all four sides.

      **Chunks are packed, not scattered.** Placing each piece against a random free cell grew a
      comb: 170 tiles in a 20x19 box, 45% filled. `grow` now tries eight candidates against the
      chosen cell and takes the one with the most already-occupied neighbours (`hug`), and aligns
      *one of the piece's own cells* on the free cell rather than its anchor — anchoring only ever
      grows in the anchor's direction. 64% fill.

      **Two phases, because a seam on the rim is not worth digging for.** Phase 1 SEAL fills every
      free cell touching an ore; phase 2 grows the bulk. The seal has to be exhaustive over
      (shape x 4 rotations x each of the piece's cells) rather than eight random tries — eight tries
      often cannot cover one particular cell with a 3- or 4-tile piece, and 2 of 3 seams were still
      showing. "Buried" is checked by flood fill from outside the bounding box, not by counting
      neighbours: the four-neighbour test failed 2 of 3 seams on chunks that were in fact sealed,
      because a 1-tile pocket has no rock in it and no way into it either.

      At the shipped defaults, one chunk:

      ```
      53 pieces, 161 tiles: {"Ore":3,"RockSpar":42,"RockSlab":8}   1 island
      0 of 3 seams reachable from outside without cutting rock, depths 4, 5, 2
      ```

      **The bug every measurement in this entry was nearly taken through.** `MINER` grew two lateral
      engines because a hull whose every engine thrusts along its nose cannot orbit a chunk while
      its guns stay on the seam. They were written at px ±2 with nothing at ±1, bonded to nothing,
      and `splitDetached` threw them away on the first tick:

      ```
      islands 3, sizes [7,1,1]     as written, px +-2
      islands 1, sizes [9]         at px +-1
      ```

      So every run for two days flew the single-axis rocket the comment said it must not be, and two
      of five seeds never left the spawn point — 1.0 and 0.3 tiles in ninety seconds, throttles at 0
      from t=15 with a target 13 tiles away. Found only because a second session could not reproduce
      the "`pilot` parks ~3 tiles short of a waypoint" claim I had sent them and swept `pilot`
      against a fixture that arrives and one that does not (see the flight-model entry above, and
      `tools/corepox-arrival.ts`). That claim is **retracted**: it was one hull, and the hull was
      broken. `corepox-mining-check.ts` now asserts `islands [9]`, 4 engines and 2 thrust axes
      *before* it flies anything — a stalled miner and a miner that cannot strafe write the same log
      line, so no outcome-shaped probe could have seen it.

      **Every tuned number was re-taken afterwards**, because the first sweep tuned the crippled
      hull. 18 cells x 8 seeds x 90 s, `tools/scratch/mine-sweep2.ts`:

      ```
      hp spread dens | rocks paid  pieces scrap wrecked
       3      3 0.25 |   2.0 5/8       7   255       0
       3      3 0.55 |   5.0 3/8       7   255       0
       3      5 0.25 |   2.0 3/8       8   330       0
       3      5 0.55 |   5.0 7/8      17   645       0
       3      7 0.25 |   2.0 5/8      11   465       0
       3      7 0.55 |   5.0 5/8      10   435       0
       5      3 0.25 |   2.0 2/8       2    60       0
       5      3 0.55 |   5.0 3/8       5   195       0
       5      5 0.25 |   2.0 3/8       4   120       0
       5      5 0.55 |   5.0 3/8       4   165       0
       5      7 0.25 |   2.0 4/8       7   255       0
       5      7 0.55 |   5.0 6/8       9   450       0
       8      3 0.25 |   2.0 1/8       2    60       0
       8      3 0.55 |   5.0 0/8       0     0       0
       8      5 0.25 |   2.0 0/8       0     0       0
       8      5 0.55 |   5.0 0/8       0     0       0
       8      7 0.25 |   2.0 1/8       2    60       0
       8      7 0.55 |   5.0 2/8       3   135       0
      ```

      A second sweep held rockHp and oreSpread and moved the clock and the density
      (`tools/scratch/mine-sweep3.ts`, 6 seeds):

      ```
      --- duration 90
       3      5  0.4 |   4.0 4/6      12   450       0
       3      5 0.55 |   5.0 4/6       6   180       0
       3      5  0.8 |   7.0 4/6      10   345       0
      --- duration 120
       3      5  0.4 |   4.0 2/6       9   270       0
       3      5 0.55 |   5.0 6/6      16   570       1
       3      5  0.8 |   7.0 4/6      13   480       0
      --- duration 150
       3      5  0.4 |   4.0 4/6       9   315       0
       3      5 0.55 |   5.0 6/6      16   570       0
       3      5  0.8 |   7.0 5/6      18   675       0
      ```

      120 and 150 return the same 16 pieces and 570 scrap from the same seeds, which says nothing
      is collected after t=120 and a longer clock buys nothing.

      `rockHp` dominates and the shipped value was on the wrong side of it: at 8 the field is
      unmineable (1/8 across all six cells), and 5 — what the crippled-hull sweep chose — pays about
      half what 3 does. Because the best cell of an 18-cell grid on 8 seeds is a lucky draw as often
      as it is a finding, the candidates were re-run on 20 seeds none of the sweeps had seen
      (`tools/scratch/mine-confirm.ts`):

@@CONFIRM@@

      **The instrument was not an instrument, and this is the part worth carrying forward.**
      Every tuned number above was taken on a gate that did not repeat. `World.rng` is
      `Math.random` (`corepox-engine.js:1025`) and nothing in the game sets it; `runMining` spends
      its `seed` on the field layout and not on the simulation, and a thrusting hull emits exhaust
      as a Poisson draw from `World.rng` carrying `EXHAUST_DMG` onto the rock it is cutting. Five
      consecutive runs on identical input, found by lopecode-dev-66 after I reported a regression
      against their engine push:

      ```
      5/5 seeds   18 pieces   630 scrap
      5/5         18          585
      2/5          6          180      <- below the gate's own 3/5 bar
      4/5         13          390
      5/5         10          300
      ```

      Pinning it made the gate repeat and not pass: swept over the pin alone on unchanged code, 8
      pins give 3–5 of 5 fields paying and one lands below the haul bar, so which integer was typed
      decided whether the gate was green. It now sweeps 5 layouts x 4 rng pins — including the pin
      that used to fail — and asserts on the pooled result, with `--fast` for the single pin and an
      assertion label that says out loud when it is running cheap.

      A further correction: the two bars are **one metric**, not two. Across the eight-pin sweep
      they rank identically (`paid 5/5 5/5 4/5 4/5 4/5 4/5 3/5 3/5`, `pcs 18 18 12 9 9 9 9 4`) —
      the same draw read from opposite ends. They were briefly cited as two independent 1.5x
      margins, which was wrong.

      Three findings in one day, all the same shape: **the measurement was not measuring what it
      looked like it measured.** A fixture that could not fly, an instrument that did not repeat,
      and two metrics that were one. A held-out sample defends against overfitting a sample; it
      does nothing about either of the other two. Checking that identical input gives identical
      output belongs before the first sweep, not after the third wrong answer.

      **What is still not done.** The field has no quota and no hazard, `MINING_ORE` prices are
      invented, and `MINER` is not offered anywhere — the starting `wiredCore` cannot be steered
      (its engine is driven by its own wire) and so mines nothing until the player refits, which is
      the intended loop but is taught by nothing. The latched-orbit miner AI is kept as it stands:
      it works, and it was written to route around a stall that turns out to have been the hull's,
      so whether a free-to-turn miner still needs it is untested.

      Nor are the parameters re-derived for the destructible model. `rockHp 3` makes a seam 6 hp,
      two beam hits, and the field may be far too soft — the pooled gate now reads 20/20 and 93
      pieces against bars of 10 and 20, so it no longer discriminates and would pass through a
      large regression. The right number is a rate, pieces per second **per gun**, because
      `paid`-per-run cannot tell a swarm build from a big one and that distinction is what the
      design is about. Deliberately waiting on Tom playing it before measuring: twice today a
      number was shipped off an instrument that had not been checked, and his read is evidence the
      grid is not.
