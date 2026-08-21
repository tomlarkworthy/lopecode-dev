# Corepox — working task list

Updated 2026-08-21. Ticked only when verified, not when written.

## Now
- [x] Recover original source (partial clone; `vendor/corepox`)
- [x] Recover vector art (`design.sketch` history + `corepox_art` repo)
- [x] `tools/sketch2svg.py` — Sketch JSON → SVG, incl. `--groups` for the components page
- [x] Recover 12 missions + 79 ship specs from binary scenes
- [x] `corepox-engine` module — physics/dataflow/damage, headless, 446k ticks/s
- [x] `corepox-assets` module — 20 Symbols-page components
- [x] Confirm neon look = render-time bloom, not baked art
- [x] Components-page art folded into `corepox-assets` — 58 symbols, `SYMBOL_FOR` covers all 12
      component types, `cp-bloom` filter shipped from the same module
- [x] `corepox-render` — hulls from the real sprites on black, bloomed, over a starfield
- [x] Value labels on connectors — `valueNode`, live per frame. Verified in a screenshot of Aim:
      the incoming rocket's Engine reads 40.0 while it flies
- [x] Live battle view — `battlefield`, animated, framing camera, reconciled per frame
- [x] UI rebuilt on the shipped flow (2026-08-20): selection-driven menus instead of a modal
      toolbar, wrench → build panel → ghosts, chequered ports with a confirm tick, objective pills,
      perspective jump-zone funnels. Driven end to end by `tools/corepox-qa-campaign.ts`, 9/9.
      What it was measured against, and what is still missing, is the ledger at the end of
      `knowledge/corepox-shipped-ui-observed.md`.
- [x] Connectors carry their value (2026-08-20): port discs with typed cog rings and live numerals,
      the Binary operator glyph, and a wire that arcs OUTSIDE the hull coloured by what flows
      through it. The old sprite wire was invisible on `run`, the mission that teaches wires.
- [x] Camera and connect UX off four complaints (2026-08-20): the wheel is anchored on the pointer
      and a drag pans (`api.pan`, `api.panLock`, `⌖` recentre), `connect` self-arms on a single-port
      component, and the zoom rule looks at where the SHIP is rather than at which menu is open.
      New gate `tools/corepox-camera-probe.ts`, 8/8; `corepox-qa-campaign.ts` still 9/9. The
      Engine's silhouette was missing its 4.16 bright stroke on two of three shapes, not
      misaligned — `corepox-art-ink.py` 7/8 → 8/8. Evidence in
      `knowledge/corepox-shipped-ui-observed.md`, "Four more complaints".
- [x] Engine exhaust redrawn as one path per colour (2026-08-20). The old `fx` layer built a node
      per particle each frame inside the bloomed group -- the worst of 22 techniques measured
      (13fps at n=2000, 6x throttle; the lane draw is 120fps at 2.3ms). Bloom turns out to be
      free (priced per filter-region area, not per particle) and per-particle opacity and
      gradients are the expensive embellishments. Sheet, ceiling and the corpus arithmetic for
      1000s of components are in `knowledge/svg-particle-performance.md`; bench is
      `tools/bench/svg-particles.*`. Gates: qa-campaign 9/9, camera-probe pass, boot 0 errors.
- [x] The 2191-design corpus is in the notebook (2026-08-20). `corpus.json.gz` (394 KB) rides as a
      file attachment on `@tomlarkworthy/corepox-shipyard`, which unpacks it in userspace with
      DecompressionStream; `unpackCorpus` is a hand port of the inverse in
      `tools/cloud/corpus-pack.py` and `tools/corepox-corpus-parity.ts` holds the two to
      bit-identical output over all 2191 designs and 2196 ratings. The lab arena picks a side from
      either the authored ships or the corpus, over a datalist labelled with parts/wires/rating/
      matches played, and matches them with the real `World.step`. Gate:
      `tools/corepox-corpus-arena.mjs`.
- [ ] **436 of the 2191 designs cannot be built.** They name components this engine does not
      implement: `LazerHardpoint` (278), `BrautenbourgsFirst` (154), `DevouringLove` (4). The
      picker marks them and the arena says which component is missing instead of throwing, but
      "match any two ships in the corpus" is 1755 of 2191 until those three are ported. Measured
      by `tools/corepox-corpus-load.ts`, which also reports 655 of 18028 wires dropped (3.6%) and
      274 of the 1755 loading as more than one island.
- [x] Exhaust was invisible after the lane change, and fixed (2026-08-20). Brightness was bucketed
      on raw remaining `ttl`; exhaust is born with `ttl = World.rng()`, so the steady-state density
      is 2(1-x) and 23% of the plume sat in the dimmest lane against 1.6% in white. Every particle
      was drawn, in near-black. The engine now records `ttl0` at emit (no rng consumed, determinism
      unaffected) and the lane is `ttl/ttl0`. Gate is `tools/corepox-exhaust-probe.mjs`, which
      asserts lane OCCUPANCY -- "did the renderer write anything" passed throughout the bug.
- [x] **Connectivity now runs on JOINTS.** Done 2026-08-20 on Tom's instruction ("switch to joint
      based connectivity ... all those statements were made early on in the porting process and
      are stale"). The mating rule is not a judgement call: `Metrics.cs:361 CoordDir8.opposing()`
      returns the SAME POINT reached from the neighbouring cell (`UP_LEFT` at (x,y) mates
      `DOWN_LEFT` at (x,y+1)), and `Connectivity.cs:99 disjointSets -> connected -> adjacent`
      does nothing but look that up. So two components are bound when their joint POINTS coincide
      and only then -- **there is no gap rule**, and the drawn stalks are cosmetic. `Metrics.cs:258
      offset_x/offset_y` also gives the eight slot offsets literally, and they are exactly what
      `JOINTS` and `corepox-components` were already written to: slot 0 is the half nearer the
      smaller coordinate. `Ship.jointsOf` rotates the slot as a point through the same `rotTile`
      the tiles go through.
      **The control, not the corpus, is what says this is right.** All 48 developer ships (the port
      roster plus every mission fleet, from the game's own prefabs) are ONE body under joints:
      48/48, `tools/corepox-joint-rule.ts`. Player saves are 62%, against reach-2's 89%, and the
      shortfall is not a defect -- `ShipComponent.cs:117 canPlace` only tests occupancy, so the
      editor never required a design to be joined up. Joints is a strict refinement of reach-2
      (0 of 890 ships bind under joints and not under distance), which the gate asserts.
      What it buys: ONE destroyed component now cuts a ship, and touching is no longer binding --
      an Armour against an Orb's flank is not part of the ship, against its aft edge it is.
      `tools/corepox-split-probe.ts` holds both. `islandsByDistance()` is kept for the comparison.
      Rejected on the way: negating every `dir` to match `Coord.rotateClockwise`'s (x,y)->(-y,x)
      (ours is (y,-x)) makes it WORSE, 46% against 62% -- the ported rotation sense is right.
      `Composite` is the one type with no joint entry and it is unreachable: `loadShipSpec`
      splices every one of the corpus's 228 instances into sub-components, 0 survive.
      Fallout, fixed: FollowBoss's reference solution loaded as 3 islands and the campaign gate
      timed out. Rebuilt (see the comment in `corepox-missions.js`) -- 7 parts, first kill 18.6s
      against the old 41s. Two searches could NOT repair the old shape, which is the finding:
      `corepox-boss-search.ts` gets 490 joint-bound layouts out of 4,898,880 and its best kills
      nothing, and `corepox-boss-rebuild.ts` (adds rotation) does no better. Under joints a hull
      is a chain -- every part has to reach a face that will have it.
      Still on distance: `Ship.powerUp` spreads power over `NEIGHBOURS`, so power can cross a
      non-existent joint. Power is a port invention (there is no power system in the C#), and a
      ship that is several joint-islands is split by `splitDetached` on the next step anyway, so
      this only matters for the tick before the split. Left alone deliberately -- changing it
      changes balance.
- [x] **Power budget removed.** Tom, 2026-08-20: "what is this powerUp, I think it is hallucinations
      and should be removed." It is an invention, and the record is unambiguous: `ShipComponentStats`
      has three fields (`hyperspeed`, `maxHp`, `panel`), and grepping the whole of `Assets/scripts`
      for power/energy/supply returns NOTHING. It had spread into flavour text -- the port described
      Orb as "stores power for the components that draw more than the core makes" where
      `Descriptions.cs:19` says "causes massive damage to touching components, and blocks incoming
      lazer fire". That description is now the original's.
      The evidence that justified it does not stand either. It was fitted (design §8.5) to the gun
      ladder in §8.3, and that chassis is not a ship: the T-tetromino Binaries sit inside the Brain
      and the Radar, 10 overlapping cells at one gun and 16 at eight, at every rung.
      `tools/corepox-guns.ts` now checks that and refuses to print win rates.
      A/B on today's build, three reps, stable to 1pp: budget ON 60/59/60/61, budget OFF
      58/66/61/65. No monotonic runaway in either arm.
      Out with it: `powerUp()`, `Ship.SUPPLY`, `TYPES[t].pwr`, `c.powered`, `ship.power`, the
      renderer's 0.35 dimming, the shipyard `pwr` readout, the components table `pwr` column, and
      `tools/corepox-power.ts` / `corepox-pwr2.ts`. `alive` is now just "has a live Brain".
      **The opportunity cost of a gun is structural now**: `JOINTS.Lazer` is the aft cell only, so
      the peripheral slots that made a wall of lasers cheap are the ones nothing will hold. Whether
      that is enough is UNMEASURED and needs a chassis that is a ship (open, below).
- [ ] **Rebuild the gun-ladder chassis on the real footprints.** `tools/corepox-guns.ts` is the only
      instrument for "does adding a gun keep paying", and it refuses to run: its hull was authored
      when every component was 1x1 and has 10-16 overlapping cells. Until it is rebuilt, §8.3-§8.5
      of the design doc cannot be cited and the structural cost of a gun under joints is untested.
- [x] **Canonical testers are corpus ships now, chosen on measured behaviour.** Tom, 2026-08-20:
      "we have much better ships in the corpus now anyway. We should find a better set to be our
      canonical testers." The seven hand-built archetypes had to go: 5 of 7 are several bodies under
      the real footprints and the joint rule (`corepox-archetype-check.ts` -- sniper 6 islands,
      rammer 6, seeker 5, proportional 5, braitenberg 4), so every balance number measured over
      ROSTER was measuring debris. Same cause as the gun ladder.
      `tools/corepox-canon.ts` picks the replacement under two rules, both of them lessons from that
      failure: a candidate must be a LEGAL ship by the engine's own checks, and it must be filed on
      what it DOES against a fixed target, never on its name. 2191 designs -> 1343 legal and
      distinct (byte-identical resaves deduped) -> fingerprinted over 30s against a stationary
      5x5 armour bag -> 14 ships in 7 buckets, written to `data/corepox/canon.json`:

        brawler   closes AND damages     18p (11502 matches), 10p (10602)
        carrier   several bodies at t=0  29p (16149), 25p (13535)
        shedder   one body, then several 19p (16425), 6p (11008)
        gunship   damages from range     6p (20849), 13p (10509)
        rammer    closes, no damage      7p (4898), 11p (4875)
        drifter   moves, achieves none   19p (13974), 5p (12120)
        turtle    does not move          3p (14036), 7p (6374)

      Every one is a design real players flew thousands of recorded matches with. `--check`
      re-fingerprints the saved set and fails if any ship stops being legal or changes bucket --
      run it after any engine change. `corepox-tourney.ts` uses CANON by default;
      `ROSTER=archetypes` gets the old set back for comparison and says it is broken.
      Note the bucket rule that had to be added: `bodies > 1` at the END of a fight caught 912 of
      1343 ships, because under joints almost anything sheds a part. Only the island count at t=0
      separates a ship BUILT to release a drone from one that merely comes apart.
- [ ] **Rebuild or retire the seven hand-built archetypes.** They are still in
      `corepox-tourney-specs.ts` and still broken. Either re-author them on the real footprints so
      the named strategies survive, or drop them and let CANON be the only roster.
- [x] **A split moved everything, and that was the "glitch on losing components".** Tom, 2026-08-20:
      "when ships lose components their positions seem to glitch. There was quite a lot of math went
      into preserving inertia to make splitting work correctly, that work seems to be absent."
      It was absent. `Ship.detach` set `f.x = this.x`, copying the parent's ORIGIN onto the fragment.
      That is right in Unity, where `Ship.cs:504 newGameObject.transform.position =
      this.transform.position` works because a transform origin is not a centre of mass. Here
      `ship.x,y` IS the centre of mass -- it is why `reindex` has to move the origin when a part dies
      -- so the fragment landed at the PARENT's centre of mass instead of its own:

        a cut 6-tile bar          every part jumps 2.10 tiles
        a carrier releasing a
        drone 8 tiles forward     every part jumps 4.25 tiles
        under spin                145% of the ship's linear momentum invented from nothing

      A corpus carrier ("97. Brain - 25p 14g") was the report: its 12-part drone spawned INSIDE the
      hull, the Explosives went off on contact, and 6 parts died in the first half second. Fixed, it
      separates cleanly and all 29 parts are alive 3s later.
      The fix is `Ship.cs:498 split()` verbatim: place each body at its OWN centre of mass, and give
      each the pre-split velocity sampled at that centre (`GetRelativePointVelocity` against `cm0`).
      The parent needs it too -- it keeps its old velocity at its OLD centre otherwise. Both bodies
      keep `w0`; that does not conserve angular momentum and it is what the original does.
      Gate: `tools/corepox-split-inertia.ts` -- nothing moves, linear momentum exact.
      `reindex` was already correct: losing a part with no split moves nothing, spinning or not.
      **A stale expectation fell out of this.** `corepox-split-probe.ts` asserted that a cut ship's
      halves "drift apart at rest" and passed on +1.000 tiles. That was the bug: the fragment spawned
      inside the hull and the collision push shoved it out. `split()` applies NO separation impulse,
      so two halves that left with the same velocity hold formation, and the probe now says so. That
      also answers the old open question here -- "whether the original applied a separation impulse
      is not recorded". It is recorded, in `Ship.cs:498`, and it does not.
- [ ] **Measure the hull/port layer.** With the particle draw fixed, a frame still costs 67-76ms at
      6x throttle while carrying 4-66 particles, so the cost is elsewhere -- most likely the
      per-frame port numerals (`valueNode`). That is the layer that decides whether ships of
      1000s of components are possible, not the exhaust.
- [x] **Port the second campaign, "Advanced Steering".** `FollowCourse` ("Yin opposses Yang"),
      `FollowCourseAdvanced` ("Zero negates something"), `FollowBoss` ("Boss: the Gun Boat"), done
      2026-08-20. `corepox-play-missions.ts` 12/12, `corepox-qa-campaign.ts` 12/12 by clicking,
      `corepox-mission-fidelity.ts` all 12 match. The blocker written here -- "they need the
      Composite component, which missions do not currently support" -- was wrong twice over:
      `loadShipSpec` has spliced Composites since the corpus work, and the scenes place the
      relevant hulls expanded anyway. What they actually needed was the scene override data, which
      turned out to be readable: player flags and transforms, the 5x7 envelope, the inventories
      (via `tools/corepox-prefab-ids.py`) and `liveMode`. See
      `knowledge/corepox-extracted-design.md`, "Advanced Steering, ported".
- [x] `@tomlarkworthy/debugger-2` dropped from `bootconf.mains`, 2026-08-21, on Tom's report that it
      slows the game down. It does, by **15x**: measured from the game's own per-frame `input` event
      with the arms interleaved (`tools/corepox-frame-budget.ts`, Aim playing, 10s windows), 8.1/s
      at a 124ms rAF p50 with it, 120.1/s at 8.3ms without. Worse than the 24-30fps the idle
      measurement on tarot showed, because its cost scales with dataflow events and a reactive game
      ticks 120 times a second. The module BLOCK stays in the file (36 KB, 0.69%) -- nothing
      imports it, but blank-notebook's fork gallery lists it in `catalogue`, and a spawn would then
      ask for a block that is not there. corepox.html was the only notebook in either content repo
      that booted it.
- [x] The `<rect> attribute height: A negative value is not valid. ("-3")` console error is fixed,
      2026-08-20, and it was never corepox. `tools/corepox-plot-caller-probe.ts` hooks `Plot.plot`
      in every booted module and attributes each bad rect to the call it happened inside:
      **@tomlarkworthy/debugger-2**, 1966 plots in 70s, 121 bad rects. Its two `Plot.rect` marks use
      a fixed `insetTop: 7, insetBottom: 7` on a band scale, and a few rows makes the band narrower
      than 14px (4 rows -> 11px -> "-3"). Now the margins are pinned and the inset is computed from
      the band. Probe reads 0 bad rects over 2103 plots. Pushed to the lopecode canonical and to
      corepox.html. (An earlier session blamed `local-change-history`; that was wrong -- it also
      calls Plot, but it made no call in this run.)
      Separately: debugger-2 replots ~30x/second while booted, which is the known 30fps pin. Not
      touched.
- [x] `buildOnce` modelled, 2026-08-20. FollowBoss is the only scene of twelve that sets it, and it
      does exactly two things: `hasBuildBuildOptions` hides the BUILD button once `hasPlayed`
      (nothing else — move/rotate/delete/wire are `Selected` options and the scene allows them all),
      and `MissionController.call` saves the pre-play ship so `retry` gives it back. Both in the
      port; `tools/corepox-buildonce-probe.ts` asserts the difference against Cocoon
      (`stock 1->1 restart forgets` vs `stock 9->0 restart remembers`).
- [x] The relic item is **never offered**, 2026-08-20 — so there is nothing to place. The two
      `m_FileID` 0 inventory items are not relics: each is a second copy of the mission's own hull,
      and `UIState.buildOptions` cancels an item whose `model.id` is already on the player ship.
      `tools/corepox-inventory-offered.py` applies the rule to all twelve scenes. Both live Follow
      missions come out with an **empty** BUILD menu, which is what `liveMode: 1` and a wires-only
      brief already said. Cut the spare Brain from all three Follow missions and the two spare
      Constants from FollowCourseAdvanced.
- [x] **Two campaigns, not one flat list**, 2026-08-20. `CAMPAIGNS` in corepox-missions drives an
      `<optgroup>` picker and a per-campaign header counter (`tutorial 1/7`, `Advanced Steering 3/3`).
      Option values stay the global mission index so nothing driving the select by number changed.
      `minPlayerRating` is still unread — it is an int and the extractor only recovers strings.
- [x] `SideShooter` and `TwinTurrets` are labelled, 2026-08-20. They appear in a trailing
      "not in a campaign" group rather than being hidden or numbered into the arc. A mission the
      table does not name still shows up, so nothing can silently vanish from the picker.
- [x] Two mission titles corrected against the campaign read, 2026-08-20: "Zero negates something"
      -> "Zero Negates Something", and "Boss: the Gun Boat" -> **"Boss: The Assassin"**. The former
      was the enemy composite's name (`SHIPS.gunBoat`), not the mission's.
- [x] Cutscenes recovered and ported, 2026-08-20. The frames were a `Resources` TextAsset named
      `cutscenes`, 1103 bytes, in the APK -> `data/corepox/cutscenes.yaml`: 9 scenes, 11 frames,
      every profile `BrainProfile`. `followBoss` is a key with no scene, so FollowBoss plays no
      cutscene -- shipped behaviour, not a gap. In the port as `MISSIONS[i].intro`, typed a word
      per 200ms behind a tap-to-advance overlay; the portrait is drawn from the Brain symbol plus
      40 generated traces rather than shipping the 361 KB PNG. qa-campaign still 12/12.
- [ ] `outro` is declared on `Mission.cs` beside `intro` and nothing has been found for it: no
      outro key in the campaign read, no non-intro scene in cutscenes.yaml. Either never written
      or an empty string in the campaign rows.
- [ ] Re-run the corpus analysis against **2,191** designs, **2,140 of them rated**. The live
      database holds 2191 under `assets/ships` and 2140 ratings under `ratings/ships`; the
      "Binary once per 15 components" finding was computed on 492 designs and no ratings. The
      ratings are what would turn "players built bricks" into "bricks won or lost".
- [ ] Binary is still 2.4% narrow (`corepox-art-ink.py`) and `dx -0.023` (`corepox-art-align.py`);
      LaserTurret2 and Hyperdrive are the other two `art-align` flags. Uninvestigated.
- [x] Orb redrawn from the shipped sprites, 2026-08-20. Was four purple rings, which was the
      components page's occupancy sketch. `Orb.prefab` root is the only component at localScale
      0.33: the glow is `orb_weapon` at 4.192 tiles across centred on the 2x2, the body is `orb`,
      a 1.748 x 0.248 tile rail along the bottom edge where the four joints are. `art-align` 0.005
      tiles; `art-ink` gates the size at 234.75 art units. Gradient sampled off the PNG; material
      is Mobile/Particles/Additive so the path carries `mix-blend-mode:plus-lighter`.
- [ ] The Orb glow blends additively with the ship's own art but still occludes the board, because
      `shipNode` puts component art inside the `cp-bloom` group and a filter isolates. Faithful
      additive needs the glow painted outside that group, like `LaserTurret2` is special-cased.
- [x] Orb damage rewritten from `MeleeFn`, 2026-08-20, on Tom's report "the orb doesn't seem to do
      damage when it is overlapping an enemy". Was `nearestEnemy < 1.2` from the ORIGIN tile for 1
      damage; the trigger is a `CircleCollider2D` r=1.1 at (0.96, 0.96) under a root at scale 0.33,
      so 0.567 tiles centred on the 2x2, and `damageAmount` is 5, applied to EVERY contact every
      FixedUpdate. Zone verified symmetric about the Orb's centre and 1.067 tiles across by
      `tools/corepox-orb-damage-probe.ts`. **Balance change** -- any corpus arena number predating
      this was measured against a fifth-strength Orb, and 228 corpus ships carry one.
- [x] **Footprints are solid**, 2026-08-21. Tom: "Collisions are not working properly. Very
      apparent on radar where nodes can totally overlap that circular component. Also it seems
      like lazer can shoot things in the interior which is incorrect." Three separate tests --
      ship-vs-ship contact, the particle path, and the Orb's melee -- modelled a component as ONE
      disc at its `worldOf` **anchor**. A Radar is six cells and an Orb four, so most of both was
      empty space; and a cell sitting *dead centre* on another was skipped outright, because
      `d === 0` gave no contact normal to read off and the code `continue`d. `tools/corepox-hitbox.ts`
      parks an Armour on each cell of a hull component in turn and reads the contact off the hull's
      hp (movement is no good -- two cells at zero depth get no separating push):

      ```
      before                                     after
      Radar   6 cells, 2 solid, 4 passable  [.##...]    6 solid  [######]
      Orb     4 cells, 2 solid, 2 passable  [.##.]      4 solid  [####]
      Lazer   3 cells, 1 solid, 2 passable  [.#.]       3 solid  [###]
      Engine  2 cells, 1 solid, 1 passable  [.#]        2 solid  [##]
      Binary  4 cells, 3 solid, 1 passable  [#.##]      4 solid  [####]
      ```

      The beam picked its victim by **closest approach to an anchor**, not by what it reached
      first. A shot crossing a Radar's far row passes 2.00 tiles from that Radar's anchor -- outside
      the 1.25 reach entirely -- so it went straight through and killed the Brain sheltering behind
      it. It is now a swept point-vs-disc **entry** test against every cell, smallest entry
      parameter along the segment wins, which is what `behaviour/DamageBeam.cs:59` does (a beam is
      a trigger; it damages the first collider it enters). The original never had any of this: each
      component carries a Box or Polygon collider covering the whole part (`fx/Placement.cs:30`)
      and `Ship.cs:581` resolves each contact point back to a **cell** via `worldToCoord` →
      `isOccupied`.

      Two things had to move with it, or the fix would have been a net regression:

      - **Impulse once per ship pair, damage per component pair.** Unity resolves one collision
        between two rigid bodies however many colliders touch. Applying a full impulse and a full
        depenetration per *component* pair multiplies both by the contact area the moment a flush
        hull starts registering six pairs instead of one; the campaign went 9/12 → 8/12 on that
        alone. Damage stays per pair, matching `OnCollisionStay2D`'s `component.damage(5)` per
        contact point.
      - **The Orb's melee is measured from its cells, not its centre** — see
        `knowledge/corepox-extracted-design.md`, "Amended 2026-08-21". A 1.067-tile radius about a
        square whose cells are 0.707 out cannot reach a touching cell at 1.0, so the moment hulls
        stopped interpenetrating the Orb became inert: an Orb rammed into a Brain at 20 tiles/s
        left it untouched. And the melee's same-team exemption was a port invention -- `MeleeFn`
        has no team check, only the implicit one that a ship's components share a `Rigidbody2D` and
        generate no contacts with each other. It is now scoped to the ship (Tom, same day:
        "perhaps a component from the same team does not collide? That seems wrong as well").

      Cost: no measurable one. 8 ships in contact, 2000 ticks: 91.0µs → 83.5µs a tick, because the
      per-component broad phase pays for the inner loops. Beams are not weaker either --
      `corepox-parallax.ts` is identical off-axis, hit for hit, at both ranges.

      **Blast radius, stated because it is large.** Every ship is now the size of its whole
      footprint to every beam and every hull, in both directions, so any balance number measured
      before today is stale. Measured consequences: self-harm over the 878-ship corpus flown alone
      is 349 → 362 ships and 1892 → 2003 components; `TwinTurrets` fell from 19 of 140 legal builds
      winning to **1**, and was re-solved (engine behind the core at `[0,-1]`; the old flank mount
      loses at 57.1s); `FollowCourse` and `FollowCourseAdvanced` recovered only once the Orb melee
      was fixed. Gate is `tools/corepox-hitbox.ts`, 11/11, which fails 7 of 11 against the engine
      as it was.

      Two reference solutions had to be re-found, and one of the two searches learned something
      the other gates could not see. `FollowBoss`'s chain is not slow now, it is **stuck**: the
      Gun Boat sits at 125 of 320 hp from t=45s to t=210s at a range of 22 tiles, where the
      radar→turret parallax miss stops the shots landing, and both Spikes fly away
      (`tools/corepox-boss-trace.ts`). Both Spikes also lead with an Orb, and `Descriptions.cs`
      says an Orb "blocks incoming lazer fire" — so the shielding a beam now respects is the
      design working. `corepox-boss-rebuild.ts` re-ran with a **buildability** filter it never
      had: the shipped UI places a part facing up and rotates it afterwards, so a rotated part
      needs somewhere to sit in its up-facing footprint at the moment it goes down. That rules out
      **35,301 of 36,685** joint-bound layouts, 96%, and the first answer found without it put a
      LaserTurret2 whose up-facing footprint covers the mission's own Brain — headless gate green,
      `corepox-qa-campaign.ts` red at 5/7 parts with "no menu at -2,-2". The search now stops at
      the first layout that satisfies the objective (`destroy n: 1`), which it reached after
      simulating 1,384 of them. Win in 39.8s.

      Two gate repairs came with it, both recorded where they live: `corepox-qa-campaign.ts` polls
      for a verdict for 80s rather than 40s (every reference solution used to win inside ~10s of
      simulated time; TwinTurrets' re-solve takes 28.5s and the browser runs at roughly wall
      speed, so a real win was being read as no verdict), and it now prints the verdict it saw.
      `corepox-orb-damage-probe.ts` asserted the centre-measured reach that had to go, and now
      asserts a touching cell at exactly 1.0 is damaged.

      `data/corepox/canon.json` was re-selected on the new physics, and solid footprints moved it
      more than the earlier draft of this entry claimed: **9 of the 14** ships survive the
      re-selection. Every bucket keeps its slot count; five members change --
      `brawler-18p → brawler-6p`, `gunship-13p → gunship-19p`, `rammer-7p → rammer-6p`,
      `shedder-19p → shedder-18p`, `shedder-6p → shedder-10p` -- and `rammer-11p` keeps its place
      in the bucket while moving within it. `corepox-canon.ts --check` is 14/14 on the new file.
- [ ] **A pinned `face` is dropped when a waypoint is commanded too**, found 2026-08-21 by the
      session building the mining node, confirmed here on the duel's stock AI. Not fixed.

      The `cmd.drive` branch was normalised on 2026-08-21 (entry below) and the `cmd.target`
      branch was deliberately left on flat `[1, 1, G.torque]` with `G.torque = 8`. The reasoning
      written into the drive branch applies to the waypoint branch as well: a torque row two
      orders of magnitude smaller than the linear rows means the allocator serves position and
      treats rotation as rounding. When the two demands **agree** that is a trade; when the
      waypoint is perpendicular to the heading it is a rout. Their miner — commanded
      `{target: ring point, face: bearing-to-seam}` — flew the orbit nose-first at ~80° of
      heading error on five held-out seeds and fired the whole run into empty space.

      `chaseCmd` is the duel's stock opponent and it pins `face: brg` on every tick, so it has
      the same shape. It should be mild, because its target lies **along** the bearing
      (`self + unit(brg)*k`) — translation and heading agree. `tools/corepox-aim-hold.ts` says it
      is mild for one hull and a rout for two:

      ```
      attacker            engines   travelled     |err| mean  median   inside the 25 deg arc
      gunBoat                 2 eng   17.0 tiles         80      90            8%
      orbDroneChassis_hull    2 eng   17.5 tiles          5       6          100%
      drifter                 1 eng    1.9 tiles         85      90            3%
      ```

      They agree only if the hull's best thrust axis is its nose. `pilot` takes the
      `cmd.face != null` branch, which rotates the world demand into the body frame and does
      **not** gate the burn on heading agreement the way the `face == null` branch does, so a
      hull whose `R.phi` is off-nose flies at an angle and the heading demand competes at weight
      8 and loses.

      **What it costs**: `chaseCmd` gates `fire` on that same 25° arc, so the stock opponent is
      declining 92% and 97% of the shots it wants to take. Every headless campaign number
      measured with `control: "auto"` — including the economy audit — is therefore pessimistic
      about the player's side by an unknown amount.

      **Not fixed on purpose.** Raising the waypoint torque weight is a balance change that moves
      every mission and every corpus flight result, so it wants the mission gates and a corpus
      A/B, not a one-line edit. The other session took the app-level route instead: within 4
      tiles of the ring point their `minerCmd` returns `{target: null, face: bearing}`, so the
      linear rows are zero and the turn is all there is to allocate (0% → 49% inside 20° on their
      worst seed). That is available to any caller and needs no shared change.

      **Fixture warning, because this probe walked into it.** Three of the six hulls first
      measured scored 0° error and 100% inside the arc while measuring nothing: `aimPlayer` and
      `laserpost` have no engine at all, and `spike`'s engines are wired, which `pilotActuators`
      skips — so the pilot wrote nothing and the ship either sat at its starting heading or flew
      its own program. A zero heading error is what perfect aim and a ship that never turned look
      like from the outside. The tool now prints free-engine count and distance travelled and
      labels those rows as not a measurement.

- [x] **The flight model turned the wrong amount, in both directions**, 2026-08-21. Tom: "I am not
      convinced the auto thrust works properly. I seem to turn very slowly sometimes and pressing
      forwards turns the ship even though it has the capability not to turn, are the thrusts moments
      calculated properly? Is A and D turn of strafe, I would expect turn but please confirm this."

      **A and D are turn.** `humanControl`'s table is `{w:[1,0], s:[-1,0], a:[0,-1], d:[0,1]}` read
      as `[thrust, yaw]`, so A/D write yaw and nothing writes a lateral demand — there is no strafe
      key. Space fires, a click on the field sets a waypoint, and any WASD press clears `target` and
      `face`. Unchanged; confirmed by reading, not altered.

      Two separate defects behind the other two complaints.

      **1. The torque row was divided by mass.** `pilotActuators` built each engine's column as
      `ux = dx/mass, uy = dy/mass, t = (lx*uy - ly*ux)/I`, but `Ship.force` divides only the linear
      term — `vx += fx/mass*k` against `w += (r x f)/I * k/D`. So the pilot's model understated every
      hull's turn authority by exactly its own mass, which is why the complaint is "sometimes": the
      error is the ship's size.

      ```
      tools/corepox-thrust-moment.ts -- fires the engines and reads the integrator back
      before   measured yaw / model yaw = mass exactly, 400/400 corpus ships within 2%
      after    measured yaw / model yaw = 1.000, range 1.000..1.000, 400/400
      ```

      The linear row was already right (median measured/model speed 1.000), which is what makes the
      one-character fix safe: `t: (lx*dy - ly*dx)/ship.I`, off the raw unit vector. `yawP` feeds
      `wWant = sqrt(2*amax*sweep)`, so the turn profile was commanding a slower turn than the build
      could hold. Fixing the row alone: a 90° `cmd.face` turn settles **1.12x faster** (median over
      12 ships), and corpus waypoint flight improves — `tools/corepox-autopilot.ts 400 --all` goes
      **69.8% -> 71.8% arrived**, and **83.5% -> 86.1%** among ships that can torque both ways.

      **2. Under WASD, yaw asked for zero TORQUE and the weights made rotation an afterthought.**
      The drive branch demanded `b = [axis*thrust*along, yaw*availableTorque]` at `wt = [1,1,2]`.
      Zero torque is not zero rate: it declines to *add* spin but never takes away the spin the
      hull's own asymmetry is producing. And the flat weights compare a linear row in tiles/s^2
      against a torque row two orders of magnitude smaller, so the allocator served position and
      treated rotation as rounding — which is the "turn very slowly", not the mass error.

      yaw is now a **rate** demand (`alpha = G.rate*(yaw*yawP*TAU - ship.w)/KA`, so yaw = 0 means
      hold this heading) and both demands are asked for as a fraction of *this hull's* own
      authority, which also makes the feel independent of ship size. `tools/corepox-drive-yaw.ts`
      A/Bs four demand shapes over the 40 corpus ships that can torque both ways and move:

      ```
      holding W, unwanted spin      4.77 -> 0.15 deg/s median,  19/40 -> 1/40 above 5 deg/s
      holding W already spinning
        at 60 deg/s, after 3s       6.39 -> 0.18 deg/s
      holding D, turn rate          4.25 -> 21.68 deg/s          5.1x
      W and D together              6.61 -> 21.40 deg/s turn, speed 2.87 -> 1.89 tiles/s
      forward speed holding W       100% -> 96% of the old median
      ```

      That last line is the price and it is deliberate: an asymmetric hull cannot make full thrust
      and no torque at once, so flying straight costs 4% of the median build's speed. A symmetric
      one pays nothing — `corepox-duel-check.ts` reports 5.17 tiles/s under held thrust before and
      after, to the digit.

      **What still spins is the build's failure, not the pilot's.** 3 of the 12 sampled hulls hold W
      and still turn faster than 5 deg/s; one of them has no reverse torque at all, so no throttle
      vector cancels its own thrust asymmetry.

      Not affected: determinism (`corepox-determinism.ts` identical across 3 runs),
      `corepox-engine-test.ts` all checks, missions 12/12 winnable with the reference solutions and
      0/12 winnable with no input at all.

      **Verified in the browser** after the module block reached `corepox.html`:
      `corepox-qa-campaign.ts` 11/12, the same 11 as before the change, with FollowBoss still the
      only failure and failing the same way (builds 7/7 parts and 6/6 wires, then loses the fight).

      **There is no arrival deadband**, checked because a second session reported the pilot parking
      about three tiles short of a waypoint. `tools/corepox-arrival.ts`: the same command on a hull
      that can push **both ways along its thrust line** and is free to turn settles at **0.00
      tiles**. What that needs is reverse, not a second axis — both fixtures report `rocket=true`
      on axis (0,-1). The one that stalled has two engines pointing the same way, with `face`
      pinned, so it reaches the projection of the target onto that line and stops, which is all it
      can do. Swept round a 10-tile circle at `face: 45` it does not leave the spot at all for
      targets at 90° and 135°, throttles [0,0]. Pinning `face` on a hull that cannot reverse is the
      constraint; the pilot is not declining to arrive.

      The tool prints each fixture's island sizes and engine count next to the result, because a
      component placed where nothing bonds to it is discarded by `splitDetached` at t=0 and the hull
      that flies is not the hull that was written. That is not hypothetical: it is what the reported
      stall turned out to be — two lateral engines at px ±2 with nothing at ±1, thrown away before
      the first tick, so every run taken after "I added lateral thrust" was still the single-axis
      hull. A benchmark should certify its fixture is legal by the system's own rules before it
      reports, and this one now does.

      The allocator's *waypoint* weights (`G.torque = 8`) were left alone. They now sit on a torque
      row `mass` times bigger, which is where the +2pp of corpus arrivals comes from; retuning them
      is a balance decision and wants the mission gates, not a corpus statistic.

- [x] **The refit bench shows what you are about to fight, and its LAUNCH is above the board**,
      2026-08-21. Tom: "I've made the ship but how do I start the mission in a duel encounter. Also
      I would expect to see the enemy during the build stage of the encounter." — then, having
      found it: "ok I found the button I just needed to scroll, but combining the enemy with the
      dual is still relevant".

      LAUNCH was the last child of the bench, under the ship editor, and the editor's board is as
      tall as the layer it opens in — so on the map the only control that ends the phase was off
      the bottom of the screen with nothing to say it was there. It now sits on the HOLD row, top
      right, with `revert` beside it. Reproduced and then verified with
      `tools/corepox-encounter-shot.ts`, which drives the map the way a player does (select a
      reachable node, JUMP, wait for the bench).

      The opponent is drawn on the bench from the same spec the battle will load, via the board's
      own `shipNode`, so it wears the team tint it will wear in the fight. This is safe to show a
      phase early because `encounterFoe` is a pure function of `(node, camp.seed)` and **not** of
      your hull — refitting between the preview and the battle cannot change the answer.

      One bug on the way, worth the note because it is silent: `loadShipSpec` returns `{spec, …}`
      and handing that wrapper to `new Ship` builds a hull with **no components** — no error, an
      empty `<svg>` with a viewBox of `"Infinity Infinity 1 1"`. The probe that printed the viewBox
      is what found it; the panel looked merely empty.
- [x] **A hit shows**, 2026-08-21. Tom: "One missing feature from the port is a component should
      flash when damaged, so it's clear it is happening." `ShipComponent.damage()` ends with
      `StartCoroutine("displayDamage")`, and `displayDamage` is six lines that do **two** things the
      port had neither of:

      ```csharp
      material.shader = Shaders.highlight;
      yield return new WaitForSeconds(.1f);
      material.shader = Shaders.normal;
      spriteRenderer.color = new Color(1, 1, 1, (float) this.hp / stats.maxHp);
      ```

      So: a tenth of a second of flat highlight, and then a permanent alpha of `hp/maxHp`. The
      second one is the bigger gap — damage was completely invisible between "full" and "gone".

      `Sprites/Highlight` is a Unity built-in and is **not** in the decompile, so flat white is
      inferred from the name, not read. `brightness(0) invert(1)` is the SVG equivalent: every
      opaque pixel goes white, alpha untouched. The 0.1s is read.

      The fade is floored at **0.35** rather than the original's bare `hp/maxHp`, and that is a
      deviation on purpose: these drawings are neon line art on black where the sprites were
      filled, and below about a third a part stops reading as damaged and starts reading as gone.

      Gated by `tools/corepox-damage-flash.ts`, which samples the live DOM on every animation frame
      from inside the page, because a screenshot cannot gate a 100ms event. On Aim, over 8s:
      **7–8 flashes, mean 137–161ms** each (overlapping hits extend one), lit on 14–15% of frames,
      never more than 2 components at once, and damaged parts settle across the whole range
      0.35–0.98. One frame was caught on camera in `tools/screenshots/corepox-damage-flash.png`.

      The fixture choice is itself a finding. Twin turrets looks like the obvious mission — both
      posts open fire on the handed ship immediately — but that ship loses in 1.4s and most of its
      parts go from full hp to zero in one event, and a fatal hit is not drawn (the component is
      hidden the same frame). It reports **0 flashes while damage is plainly happening**. The first
      version of the probe also counted hidden nodes and read 97% of frames lit on that mission,
      because the loop stops on DEFEAT and freezes the filter on dead parts. Aim's armour takes
      graze damage and survives it, which is the case the flash exists for.

      Costs nothing: `corepox-frame-budget.ts` reads 119.9/s, p50 raf gap 8.3ms, against 119.7/s
      before. The filter is written only when the lit state CHANGES, not every frame.
- [x] **Five components redrawn from the design doc**, 2026-08-21. Tom: "I have refreshed the
      graphics for many of the components", pointing at a claude.ai design project, *Shipyard
      Concepts*, imported through the design MCP and kept at
      `data/corepox/shipyard-concepts.dc.html` so the import is reproducible.

      Brain, Engine, Lazer, Radar and LaserTurret2 stopped being traces of the shipped sprites and
      became drawings authored ON the lattice. What that buys is stated in the doc's own title for
      option 5a — "leads land on the joints, so the art explains the wiring". Each part's drawn
      leads now arrive where `JOINTS` says its joints are, and the doc's joint tables agree with the
      engine's on all five without an edit: Engine's four live joints are `N[0,1] E[1] W[1]`, the
      upper half of the mount cell, which is `JOINTS.Engine` exactly; Lazer's are the base cell's
      bottom edge and one low on each side; the turret's eight sit on the plate's sides and bottom
      with the top edge clear because the arm swings through it; Radar's six are on the skirt only.

      The import is a coordinate rewrite, `art = doc*0.5 - 2` (the doc draws 112 units to the cell
      with a 4-unit margin, `ART_TILE` is 56), and it is checked rather than eyeballed:
      `tools/corepox-art-check.mjs` rasterises the design doc's own SVG and the rewritten one at the
      same pixel size and diffs them. Brain, Engine, Lazer and Radar are pixel-identical, 0 of
      12544/25088/37632/75264. LaserTurret2 differs in 200 of 200704, all of them the pivot cap,
      which is moved into `#turret2-barrel` on purpose so it draws over the arm.

      Two things are dropped on the way in: the sockets and the port labels. `portNode` draws those
      live with the value in them, and a static disc under a live one is two discs. The short leads
      that run from the socket position toward the joints are kept.

      Consequences elsewhere, all of them recorded where the number lives:
      - anchors — the art frame starts at the footprint's corner, so `SYMBOL_FOR` for these five is
        the centre of cell [0,0] by construction, 28 art units in. `corepox-anchor-truth.ts` reads
        them 3.3–3.7 units off the sprite pivots, because the new art fills a whole cell where the
        sprite filled 0.9 of one. That is the redraw, not an error, and the tool says so.
      - `ART_TURRET_DEG` 68.82 → 90. The barrel is authored pointing +x instead of at whatever angle
        a trace happened to be drawn at, so the constant is now a fact about the drawing.
      - `TURRET_PIVOT` (33.95, −30.44) → (28, −22), read off the doc's pivot ring rather than
        measured off a trace.
      - joints are drawn at the THIRDS, which is what the doc draws and what the leads point at.
        `Ship.jointList` produces both points from one walk of the table — the mating key stays at
        `Metrics.cs`'s ±0.25, which has to be exact in binary because two joints bind when the
        points coincide, and the drawn point is ±1/6. Nothing physical reads the drawn one.
- [x] **The board shows joints**, 2026-08-21, from the same doc (option 5c). A joint belongs to the
      PAIR, so it is drawn once, straddling the cell edge with half in each cell, and only where two
      parts agree; a part on its own shows none. Every ship, and in battle as well as in build --
      Tom: "I can't see the new joints being drawn during battle", because the first version sat
      behind the `editable()` gate. It is drawn off `s.live`, so a joint vanishes the moment either
      part it binds is destroyed, which is the ship coming apart shown a frame before the split
      does it. It costs nothing measurable: `corepox-frame-budget.ts` on Aim reads **119.7/s before
      and 119.8/s after**, p50 raf gap 8.3 ms both ways.

      This makes visible the rule that decides whether a ship is one body — until now nothing on the
      board said anything about it, and a player could bolt a Radar to the side of a core, see them
      touching, and watch the ship come apart on the first hit, because `JOINTS.Radar` is the skirt
      only. Verified in `tools/screenshots/corepox-art-m5.png`: capsules appear on every armour seam
      and on both sides of the turret plate, and none appear beside the Radar's dome.
- [x] **`BEAM_R` 0.75 → 0.25**, 2026-08-21, same day, on Tom's second report: "maybe the radar
      geometry is off, FD96E630 self intersects with its own radar and dies, but that seems like a
      collision bounds bug". It is not the Radar's bounds. That ship's Lazer at `[3,1]` fires up
      the `x = 3` column; the Radar's cells at `x = 2` are 1.0 tile away, and `HIT_R + BEAM_R` was
      1.25 — so a 2.5-tile-wide beam ate whatever sat beside the barrel. Three of its components
      were losing 5hp/s to its own guns; at 0.25 one is, and that one is a Lazer firing straight up
      its own turret's column, which is that player's design.

      0.75 was a *chosen* number defended by one argument — that Aim, the mission which exists to
      teach the radar→turret wire, needs the width. **Falsified by playing it**: Aim wins at 0.75,
      0.5, 0.25, 0.1 and 0, in 26.8s to 27.6s. `corepox-parallax.ts`, which produced the ±10°
      window the choice rested on, holds the target still; the rocket does not. The replacement is
      bracketed rather than chosen — `< 0.5` so a beam misses the cell beside the barrel, and
      `> ~0.1` because `corepox-solve.ts` finds 0 of TwinTurrets' 140 legal builds winning at 0
      against 1 of 140 at 0.25, 0.4 and 0.75. Details and the prefab argument for "small" are in
      `plan/corepox-design.md` §13.5.

      Blast radius again: `FollowBoss` needed its third solution of the day (16 upright layouts,
      one winner, 34.1s) and the corpus self-harm sweep came back to where it started —
      **347 ships / 1901 components**, against 349/1892 before any of today's work and 362/2003
      with solid footprints and the wide beam. The whole of that increase was guns eating their
      own hulls.
- [ ] **`FollowBoss` loses in the browser and wins headless, and it is not the harness.**
      `corepox-qa-campaign.ts` has been 11/12 all day: DEFEAT at t=5.0s, `lost Brain@0,0`, enemies
      untouched, while `corepox-play-missions.ts` wins the same build at 16.8s. The first suspect
      was a stale engine in the notebook, and that WAS true for most of the session — the engine
      module carried the whole solid-footprint change uncommitted and unsynced, so every browser run
      before 2026-08-21 08:15 was judging the old physics. Syncing it did not change the verdict.

      What the two harnesses actually disagree about is 5 hp. A headless trace of the installed
      solution reads the core down 20 → 15 → 10 → 5 by t=5.0s and holding, with `World.EXHAUST`
      off making no difference, and the Gun Boat sitting at 38 tiles against a 40.6-tile beam
      range. So it is not self-fire and not the exhaust: the boss is hitting an exposed core
      through the gaps in a 7-part hull, and the reference solution survives headless with one beam
      of margin. The browser run takes that beam.

      The fix is a solution that ends the match unhurt, which `corepox-boss-rebuild.ts` already
      scores for (`core ok`); the candidate it found on 2026-08-21 uses two rotated parts and lost
      in the browser a different way (built 7/7, wired 6/6, then shredded to 1 part by t=388s).
      Not fixed. The mission is winnable and the level is not at fault.
- [ ] `tools/corepox-econ.ts` reports 0 shots landed in every pairing and always has: it counts
      `w.beams.filter(hitOk)` *after* `stepParticles` has already dropped the beam that hit. The
      hit-rate column has never carried information. Not fixed, not load-bearing for any gate.
- [x] Persist: sync modules to `corepox.html`, verify boot. corepox-missions + corepox-game
      inserted, canonical, in bootconf mains, spec minted, sitemap updated. Boots with 0 console
      errors; mission 1 completes through the DOM (corepox-qa-play.mjs); Aim runs 17.9s of sim in
      20s wall (corepox-qa-aim.mjs). lopebooks@2949e16f
- [x] **The two bench gates were testing furniture the player can no longer see** (2026-08-21).
      Turn 9 of "Shipyard Concepts" retired the mode rail and the tray — "Refit is not a mode with
      its own furniture — it is this board with the clock in HARD and the hold full" — and the
      encounters moved onto the shared `shipBoard`. `corepox-bench-drive.ts` then failed honestly:

      ```
      TimeoutError: click: Timeout 30000ms exceeded.
        - waiting for getByRole('button', { name: /^rotate$/ })
      ```

      `corepox-bench-menu.ts` did not fail, which was worse — it asserted on `q.mode() === "select"`
      and on tray text, and `shipEditor`'s compat `qa.mode` answers `"select"` unconditionally.
      A gate that passes by reading a constant is not a gate.

      Both deleted, replaced by `tools/corepox-bench-board.ts`, which goes in through the MAP
      (`[data-node="n1-1"]` → `[data-act="jump"]`) and drives the board's own gestures — a chip
      dragged off the rail, a port dragged to a port, a disc scrubbed:

      ```
      the bench opens on a rail of parts                     5 rows
      the rail is the campaign's hold, not a palette         Armour:4 Constant:2 Engine:2 Lazer:2 Radar:1
      one drag off the rail places a part                    3 -> 4 parts
      and the hold pays for it                               Armour 4 -> 3
      the rail runs the Armour down to nothing               Constant:2 Engine:2 Lazer:2 Radar:1
      and an exhausted row places nothing                    7 parts, unchanged
      one drag from a port to a port makes a wire            1 -> 2
      dragging a Constant's disc scrubs it                   100 -> 113
      LAUNCH is inside the viewport                          y=485..525 of 1000
      ```

      Two things the rewrite had to learn. The destination of a drag must be resolved AFTER the
      press, because arming a chip paints ghosts and the ghosts feed the camera, so the viewBox
      moves between computing a point and arriving at it. And "any out port → any in port" is not
      a wire test on this hull: the bench opens on Brain/Constant/Engine whose single legal wire is
      already in the spec, so the drag re-made the wire that was there and the count never moved —
      read as a failure for one run until the gate started wiring into a part it had placed itself.

      The overdraft assertion is new, and it is the one the old bench could not make: the editor
      used to let a design overdraw and reloaded the last affordable one afterwards. The rail never
      offers a part the hold does not hold, so an exhausted row is inert.
- [x] The lab and the shipyard roster still render on the rewritten `shipEditor` (2026-08-21,
      `tools/scratch/lab-boot.ts`). Neither passes `parts`, so the hold is every non-mineral type
      at `Infinity` and the rail reads `∞` — 11 rows, 0 console errors, camera cluster and foot
      present (`tools/screenshots/boot-corepox-lab.png`, `boot-corepox-shipyard.png`). The
      shipyard's own intro cell still described the retired flow ("Click a part then a cell to
      place it, drag nothing") and was rewritten to describe the rail.
- [x] **The tempo chip is turn 9's, and the refit bench draws it too** (2026-08-21). Two things
      were wrong, and only one of them was a colour.

      The hues were a traffic light and turn 9 is not: read back out of
      `Shipyard Concepts.dc.html`, the live chip is

      ```
      border:1px solid rgba(255,92,114,.5); background:rgba(255,92,114,.08)
      color:#ff5c72  LIVE      clock runs · damage lands
      ```

      and HARD is `#e8ecf5`. So LIVE was green — "everything is fine" about the only state where
      damage lands — and HARD was amber — "warning" about the state that cannot hurt you. The chip
      also tints its own border and ground from the hue and is an 8px rectangle, not a pill.

      The second was the "one screen" claim itself. `CLOCK` and the chip markup lived in
      corepox-game, so a refit bench drew no chip at all, and turn 9b's first stated difference —
      "The tempo chip reads HARD, and the resume control reads `LAUNCH ▶` instead of ▶. Same
      control, same corner." — was true in the code and invisible on screen. Both moved to
      corepox-board as `CLOCK` + `tempoChip(mode, {t, mob})`; `shipEditor` takes `tempo` and the
      duel encounter passes `"build"`. `t: null` draws no clock column, because a chip reading
      `0.0s` beside HARD says the match has started when it has not.

      The encounter's own header lost its `scrap` chip in the refit phase only — the rail's head
      carries `◆ 214` and the header carried `scrap 214` 30px away, which reads as two numbers.

      `tools/screenshots/clock-build.png`, `clock-live.png`, `bench-corepox-duel-encounter.png`.
      Caught in passing: `chrome({mob, pad, chip})` already binds `chip`, so the first version
      threw `Identifier 'chip' has already been declared` — the bench gate reported it as a console
      error while every assertion still passed, which is the whole reason it collects them.

- [x] **`World.rng` is `Math.random` and nothing seeds it — duels replay, mining does not**
      (2026-08-21). Found while checking whether an engine push had moved a peer's mining gate
      from 5/5 to 3/5. It had not. Five consecutive runs of `tools/corepox-mining-check.ts` on
      one unmodified engine:

      ```
      run 1   5/5   18 pieces   630 scrap
      run 2   5/5   18          585
      run 3   2/5    6          180     FAIL
      run 4   4/5   13          390
      run 5   5/5   10          300
      ```

      Same tool, same build, same input. The reverted arm's 3/5 sits inside that spread, so the
      A/B could not have decided anything either way.

      `corepox-engine.js:1025` sets `World.rng = Math.random`. `seedRng` is exported and has
      exactly one caller in the repo — `tools/corepox-engine-test.ts`, which seeds for its own
      check and restores `Math.random` afterwards. Nothing in corepox-duel, corepox-mining or
      corepox-duel-encounter touches it.

      `tools/corepox-replay.ts` separates the claim from the assumption, because "the engine is
      nondeterministic" and "this gate is nondeterministic" are different statements and only the
      second was observed. Same seed, three runs, on `World.rng` as it ships:

      ```
      gunBoat vs aimPlayer               same
      laserpost vs orbDroneChassis_hull  same
      shooter vs proximityMine           same
      spike vs drifter                   same
      gunBoat vs laserpost               same

      mining, seed 3    DIFFERENT   scrap   0 /  30 /  30
      mining, seed 23   DIFFERENT   scrap 120 / 135 /  90
      ```

      So duels **are** reproducible unseeded — the duel path draws from `World.rng` only where the
      draw does not reach the outcome — and seeding makes mining reproducible too. The defect is
      scoped to the exhaust-on-rock path: a miner thrusts continuously, each exhaust particle is a
      Poisson draw from `World.rng`, and it carries `EXHAUST_DMG` onto the rock being cut. How
      much rock a run breaks is therefore a coin-flip sum, not a consequence of the ship.

      Consequence for tuning, not yet acted on: `rockHp 5` / `oreSpread 5` were chosen against an
      instrument that swings 2/5–5/5 on identical input. One-line fix for any such gate —
      `World.rng = seedRng(<fixed>)` before the runs. Applied here to `tools/corepox-attrition.ts`
      and `tools/corepox-aim-hold.ts` so the numbers quoted in "The map arc" below can be
      reproduced; both are unchanged in character after seeding (winner loses 0.0% of its parts in
      100% of wins; gunBoat still holds 80° of aim error and 8% inside the fire arc). The mining
      gate itself was left alone — it is a peer's tool and they have the finding.

      **The pin makes it repeat; it does not make it pass.** The peer pinned
      `World.rng = seedRng(20260821)` and got three byte-identical 4/5 runs. Sweeping the pin
      alone — their tool copied to `tools/scratch`, one `sed` on the seed literal, nothing else
      changed — the verdict moves with the integer:

      ```
      rng 20260821  4/5 seeds  PASS      <- the pinned one
      rng 1  5/5 PASS   rng 2  4/5 PASS   rng 3  4/5 PASS   rng 4  3/5 PASS
      rng 5  5/5 PASS   rng 6  4/5 PASS   rng 7  3/5 FAIL
      ```

      rng 7 clears `paid >= 3` and fails the line after it:

      ```
        ok  most fields pay                                    3/5 seeds
      FAIL  and the haul is several pieces, not a lucky one    4 pieces, 120 scrap
      ```

      Both bars sit inside the distribution rather than below it, so a different pin would have
      given a permanently red gate on unchanged code — and the natural reading of that is "the
      last change broke mining". A seeded single-draw gate is repeatable and still arbitrary; the
      verdict has to come from an aggregate over several pins (median, or k of n) if it is to mean
      anything. Suggested to the peer, not imposed — it is their tool.

## Campaign (done 2026-08-19)
- [x] All 9 missions playable: 9/9 win with a reference solution, 0/9 win with no input.
      Gate is `tools/corepox-play-missions.ts` (exits non-zero otherwise). Was 5/9 and 1/9
- [x] Mission logic recovered from C# (`Assets/scripts/scenes/missions/*.cs`) — win/loss per
      controller, the 2s re-check that stops Cocoon's own detonation being an instant win,
      Aim counting Explosives not Brains, and the missions that have no loss branch at all
- [x] Ship prefabs carry their ShipLoader JSON verbatim, wiring included (8 ships,
      `tools/corepox-extract-prefabs.py`). They are the sharpest test of the port tables
- [x] **Binary `a`/`b` were swapped** — every MINUS and DIVIDE in the corpus computed backwards.
      DelayBomb's self-feeding fuse proves it; FollowCourse's TIMES Binary confirms independently
- [x] **LaserTurret2 inputs are both on its base**: angle (0,0), fire (1,0). Fixes the 4 wires
      Strafer and StraferThin dropped; corpus now 4621 resolved / 63 dropped (1.3%), 84% one piece
- [x] Connector overrides restored — 881/892 corpus ships carry saved connector state, and it is
      live state: 609 ships start with an unwired lazer already firing
- [x] Three inventions rolled back where they broke recovered levels: power for brainless hulls,
      recoil (`World.RECOIL`, off — it let ManualAim solve itself), impulse impact damage
      (the original is a flat 5 per contact per TICK, 250/s)
- [x] `Ship.overlaps()` — nothing had ever stopped two components sharing a cell. Build mode now
      tests the whole footprint, not the anchor
- [x] Reference solutions for SideShooter and TwinTurrets found by exhaustive search over the
      mission's own inventory (`tools/corepox-solve.ts`), not written by hand
- [ ] **Turret parallax**: `BEAM_R = 0.75` is CHOSEN, not measured — the collider is a scaled
      sprite in a binary prefab and reads either way. With a zero-width beam the radar->turret
      wire only lands inside +-5 degrees, which makes Aim unplayable. Check this first if the
      collider size is ever recovered
- [x] `tools/corepox-engine-test.ts` rebuilt on `corepox-missions.SHIPS` — nothing hand-drawn.
      The old SEEKER's Radar overlapped four of its own Binaries. All checks pass
- [ ] TwinTurrets' player ship is authored: the scene's loose components overlap three ways under
      the recovered footprints, and FollowCourse shows the extractor groups by prefab, not by ship
- [x] Composite definitions are NOT in Firebase (Tom's question). Four recovered from the C#, two
      scenes and the corpus (`tools/corepox-extract-composites.py`); all four load 0-dropped,
      1-island, no overlaps. LazerHardpoint reads bearing->angle, dist->fire — a fourth
      independent confirmation of the turret ports
- [x] Shipped campaign order recovered from `InitialCampaign.prefab`: 7 missions, and the model had
      ManualAim and ConnectionLite the wrong way round. SideShooter/TwinTurrets have objective text
      but no campaign slot; FollowBoss/FollowCourse/FollowCourseAdvanced have neither
- [x] The editor was unusable and the headless gate could not see it — it hands the engine a
      finished ship. Found by driving the DOM (`tools/corepox-qa-connect.mjs` solves ConnectionLite
      by clicking): connectors resolve per CELL now (so `b`, `dist` and `fire` are reachable at
      all), connect mode paints where they are, and the camera snaps rather than eases when the
      game is paused — easing moved the viewBox between the paint and the click, putting every
      editor click a tile out
- [x] Camera frames the action: every live body plus named fixed points, eased in play, snapped in
      the editor, 16-tile minimum while building and the mission span while running. Avoid's player
      used to leave the frame at y=-38 and Aim's rockets spawned 22 tiles outside it
- [x] **The campaign is playable by clicking**, not just by handing the engine a ship:
      `tools/corepox-qa-campaign.ts` executes each mission's own reference solution as real input
      (pick part, click cell, click connector to connector, type the value) and reads 9/9. It read
      4/9 the first time, against a headless gate that said 9/9
- [x] Build envelope constrains the ANCHOR, not the footprint — an Engine's nozzle hangs off the
      hull, and testing the whole footprint made both engine missions unbuildable
- [x] `specOf` dropped `overrides` — every edit rebuilds the ship, so typing the angle into
      ManualAim's Constant unlatched its turret's `fire_input` and disarmed the gun. Same for Avoid
- [x] The board fits on screen: `viewof game` is defined first, so it renders above the module's
      import rows and helper cells. Objectives, board, mode bar and mission select are all above
      the fold at 1280x900
- [x] `defend` objectives read as constraints, not goals — they were struck through from t=0,
      because the core is still there on frame one
- [x] **The simulation is stochastic and the determinism check could not see it.** Exhaust emission
      is a Poisson sample and exhaust does damage, so any match with thrust is random; the check
      fought two engineless ships and passed for free. `World.rng` is now swappable and
      `seedRng` (mulberry32) is exported from the engine so every tool draws the same stream from
      the same seed. The check now also asserts that the unseeded path is live

## Next
- [x] Starfield background (`starfield`, parallax-free, seeded per view)
- [x] Dashed target lines — each live Radar draws a sightline to what it is looking at. The
      endpoints are `c.lock`, set where the engine computes bearing and dist, so the line cannot
      disagree with the numbers printed on the component
- [x] The Gun Boat's turret did not aim (2026-08-21). `SHIPS.gunBoat`'s bearing wire addressed the
      Radar's bearing CELL `[1,1]` instead of its ANCHOR `[0,1]`, and `Ship.at` only matches the
      anchor, so it was dropped in silence — the dist wire landed, so the gun fired without ever
      turning. `tools/corepox-wire-anchors.ts` now gates all 74 MISSIONS wires. Costs real
      difficulty: FollowBoss's reference solution now wins at 48.1s of 60.
- [x] The sightline redrawn to the shipped asset (2026-08-21). Was invented — green #4dd47a,
      width 2, dash "10 12", opacity 0.3, starting at the sensor. `RadarFn.trace` resolves to a
      `radar_trace` SpriteRenderer, Tiled, m_Size (0.19, 10), on the `arrow` at local (0, 0.64),
      with `size.y = distance - 0.64`. Sprite is 57x60 at 300ppu, opaque rows 15..44 (50% duty),
      RGB (230,230,104). Now: two strokes at 0.198 and 0.297 tiles, dash period 0.3125 tiles,
      starting a tile out. `tools/screenshots/radar-9.png`.
- [ ] `corepox-designer` — place / rotate / wire
- [x] The shipyard browses the whole corpus (2026-08-21). "start from" listed only the 21 authored
      `SHIPS` — Tom: *"currently its just named ones and not the hex ones"*. It now uses the same
      roster the duel picks from, moved down into `corepox-shipyard` because `CORPUS` lives there:
      21 missions + 2187 buildable corpus designs, labelled `CD0A0D5B · 6p 1g 2e · 20849m`.
      `shipEditor` now runs every spec through `loadShipSpec`, which is what makes a corpus design
      loadable at all — without it only 3228 of 12044 wires resolve and 453 of 2187 designs throw
      (`tools/corepox-roster-probe.ts`). The roster's own part count was re-derived from the loader
      at the same time; the hand-rolled relic expansion it replaced was wrong on 464 of 2187.
- [x] Fix the stalemate — diagnosed as TTK (138s kill in a 60s match), not piloting.
      Raycast bug + HP collapse + impact damage + body splitting. Draws 76-98% -> 32-81%.
- [x] Design study: self-play, corpus mining, comparable-game research -> `plan/corepox-design.md`
- [x] Renderer shows bodies created mid-match by `splitDetached()` — the node set is reconciled
      against `world.ships` every frame, so a severed piece appears instead of vanishing
- [x] Diagnosed rammer (CoM asymmetry 2.8:1) and wall (strawman; real walls were best-piloted)
- [x] Power budget — guns now have an opportunity cost; gun-ladder spread 67pp -> 20pp
- [ ] Brownout priority: hop distance is not the player's choice. Expose it, or power criticals first
- [ ] Designer must show centre of mass + engine torque arms (42% of corpus heavy ships steer badly)
- [x] Port: all 892 real ships load and run (ports recovered, footprints, mass model)
- [x] Archetypes rebuilt on real footprints (tools/corepox-tourney-specs.ts). Wires now name
      COMPONENTS -- Ship.at() resolves by anchor cell, which moves with any layout change. All 7
      pass corepox-archetype-check.ts. Round-robin runs again
- [x] `sniper` fires again: 0 shots -> 92. Not a steering problem. It drew 25 against one core's
      20 and power spreads by HOP DISTANCE, so the part that went dark was `k2` at [1,-4] --
      the constant holding the range threshold. The guns stayed lit with nothing telling them to
      fire, through a 1500-tick match that closed from 18.8 to 0.6 tiles. One Lazer now, 17/20
- [ ] **Retune archetype steering** — 4 of 7 barely close; gains were set when engines sat at
      (+-1,-1) and they now sit at (+-2,-3), so the torque arms doubled. Now measured against the
      dump, not just self-play (`tools/corepox-archetype-vs-corpus.ts`, 40 ships x 4 bearings):
      roster 10.1% win / 21.6% loss / **68.3% draw**; braitenberg draws 96%, turtle 91%. One real
      9-part player ship (2259C56C…) takes 24 of 28 duels against the whole roster with the same
      Braitenberg wiring braitenberg already has — the difference is where its engines sit
- [ ] **Brownout order is geometric, and it can strand a trigger.** `powerUp` spreads breadth-first
      from the Brain, nearest-first within a hop, so a Constant placed far out goes dark while the
      guns it drives stay powered. Whether the original did this is unrecovered. Options: power by
      dataflow depth instead, or surface the budget in the editor. Tom's call
- [x] Composite expansion — dropped connections 5.1% -> 1.2%. Did NOT fix multi-island (prediction
      falsified). All 228 corpus instances are BrautenbourgsFirst
- [~] **WRONG, superseded 2026-08-20: "reach-2 IS the physical model (connector stalks meet in the
      gap cell)".** `Metrics.cs:361 opposing()` mates a joint with the neighbouring CELL, so there
      is no gap rule in the original at all. Reach-2 was a stand-in fitted to a corpus statistic,
      and stating it as the physical model is how a stand-in becomes the remembered design.
- [x] Engine 2x1 (nozzle behind), Lazer 3x1 (barrel forward) — earlier 1x1 call was a world-space
      vs local-space measurement bug. multi-island 22% -> 17%
- [x] Joints recovered off the SVG art (tools/corepox-joints-from-art.py). Engine came out as
      N[0,1] E[0] W[0] = exactly the "4 on top and top/left/right" Tom described from memory
- [x] **UN-RETIRED and DONE 2026-08-20: JOINTS is the connectivity rule.** The 2026-08-19 numbers
      here (1% for stalks-in-the-gap, 28% for adjacency, against reach-2's 84%) were measured
      through `corepox-joint-connectivity.ts`, which fits an art-frame-to-engine-frame alignment
      per type and reported `LaserTurret2: FAILED`. JOINTS has since been restated in engine frame
      and drawn in `corepox-components`, so no alignment is needed and the rule reads the table
      directly: 62% of player saves and 48/48 developer ships. See the live entry above. The
      retirement was correct on its evidence and wrong about the cause -- the frame was the
      problem, not the rule.
- [x] Brain joints = full 8 (Tom). Unblocked 485 ships for testing, up from 10
- [x] Radar joints CONFIRMED blind: Tom's "4 on the 2-length side + closest round the corner = 6"
      matches the art-derived table exactly. Engine confirmed the same way
- [x] LaserTurret2: base 2x1, 8 joints, pivot [0.5,-0.5] (Tom). Old 12-tile footprint was the
      turret's SWEPT AREA, not its footprint
- [x] Fixed production bug: Ship.detach() read c.dirName (never existed; dir is DEGREES), so every
      rotated component was reset to "up" on a ship split
- [x] Hyperdrive footprint: 2x4 head + 3x2 stem (Tom). Corpus is flat here (57 instances), so it
      rests on Tom alone. Joints still unrecovered
- [ ] **Multi-island is NOT an error metric** — some corpus ships are genuinely multiple ships
      (Tom). Reach-2 was partly selected by minimising it, which over-connects real multi-body
      designs. Pick the reach from the physical model instead; target figure unknown
- [x] Joint connectivity 1% -> 56%. The engine's tile frame is +y FORWARD (rotTile, Engine's aft
      nozzle, the renderer's flip all agree); the art SVG is +y down; the solver tried the
      no-flip fit first and every symmetric footprint matched it. Rotation sense was inverted too.
      Gap rule still 1%, so it is still not the missing physics
- [x] tools/corepox-draw.ts — footprints, joints, anchors and wired ports drawn from the engine's
      own tables. Built to let Tom check the choices; found the frame bug on the way
- [x] @tomlarkworthy/corepox-components — component browser IN the notebook, editable. Draws
      from the engine's own TYPES/JOINTS/PORTS, converts joints to ENGINE frame once on load,
      click to toggle a joint / add-remove a cell / move a connector, and emits the JS to paste
      back. In bootconf mains. Boots clean, 0 console errors
- [x] JOINTS landed in ENGINE frame; ARTCELLS/ALIGN/toEngineFrame gone from the runtime path
      (corepox-components and tools/corepox-draw.ts read the table straight through). Verified by
      round-trip: `bun tools/corepox-art-frame.ts` -> "all 10 types round-trip to the recovered art
      table". Fixed a third symptom nobody had attributed: LaserTurret2's entry was already engine
      frame, so the art fit returned null and the component page showed the turret with 0 joints
- [ ] Hyperdrive joints — the only type with no table, 52/892 ships (6%) contain one
- [x] Tom's corrections off the drawing: Lazer 6->4 joints, Hyperdrive negated in y (hammerhead
      leads), Binary side-slot mirror. The mirror was a TOOL bug -- Binary is the one type whose
      alignment does not negate y, so it is drawn mirrored and the slot order on vertical sides
      had to swap with the N/S names. Costs 9pp of one-piece ships; recorded, not undone
- [ ] Binary art grid vs footprint disagree on which end the T stem points. Both alternatives
      measured and both are worse (52%, 31% vs 56%), so it is unresolved, not settled
- [ ] TILE is 56 in corepox-assets but the art is exported at 56/59/64/135.5 per symbol — the
      renderer needs the per-symbol unit or sprites are misscaled
- [ ] Reach-2 connectivity is empirical (78% vs 57% for reach-1) and physically unjustified —
      the real `joints: CoordDir8[]` arrays died with the prefabs
- [ ] Hyperdrive footprint unresolved (no same-type pairs in corpus). Orb = 2x2 (Tom)
- [ ] Hinge joints (original already has `joints: CoordDir8[]`)
- [ ] Trig tables for cross-engine determinism, before anything hashes a match outcome
- [ ] Trim the quick_start payload out of the notebook (3.7 MB)

## Later
- [ ] Composite mechanic — corpus says 24.6% adoption with only 7 examples; make it the atproto object
- [ ] Campaign from the 12 recovered missions
- [ ] atproto: `com.corepox.ship`, ladder as re-simulating index
- [ ] Seed ladder with the 492 recovered player ships

## Direction: piloted roguelike — ideas, not decisions (raised 2026-08-19)

Raised in conversation after the comparable-game study (`plan/corepox-design.md` §comparables,
Cosmoteer deep dive). **Nothing here is measured and nothing is decided.** Each item names what
would settle it. The one already-settled thing is what these replace: async ladder-as-content is
out, because the study found no successful game on that loop.

**Caveat added 2026-08-20 (Tom): power/brownout is not a real mechanic.** `Ship.SUPPLY` and
`powerUp()` exist in the rebuilt engine but were INVENTED during the rebuild, not recovered from
the original — the same category as the three inventions already rolled back (power for brainless
hulls, recoil, impulse impact damage). Nothing below should rest on them until that is decided.
Where an idea was justified by brownout, the justification is struck.

One of these leans on structure that already exists:

- an encounter spawner already exists — `AimMission`'s `CircleSpawn` on a ring around the player,
  ported at `corepox-game.js:115-124` with arc, count and period.

### Control
- [ ] **Piloting as intent, not keys.** Player presses turn / go-to-waypoint; a solver actuates
      whatever surfaces the ship has (engines, turrets) to attempt it. Keeps the build load-bearing
      — a badly placed engine pilots badly — without asking the player to author a control loop.
      Unknown: whether the solver can be written so its failures read as *the ship's* fault rather
      than the solver's. The CoM/torque-arm finding (42% of corpus heavy ships steer badly) is the
      test case.
- [x] **The solver works, and its failures are the ship's.** Measured 2026-08-20, `tools/corepox-autopilot.ts`.
      `Ship.force` is linear in throttle, so throttles -> (ax, ay, alpha) is a constant 3xn matrix and
      allocation is a box-constrained least squares over f in [0,1]^n (median n = 3 engines, max 13;
      `tools/corepox-actuation.ts`). Flying 200 corpus ships to a waypoint 25 tiles off, 40s cap,
      arrival < 3 tiles, engine wires cut so the pilot owns the nozzles:

      ```
                              arrived   median   ships that can only yaw one way
        power budget ON        45.0%     12.6s    17.8% arrived  (n=73)
        power budget OFF       70.5%     12.6s     3.1% arrived  (n=32)
      ```

      The split is the point: **83.3% of ships that can torque both ways arrive, against 3.1% of those
      that cannot.** The solver does not distinguish them — it is handed the same matrix and returns
      the best throttle set either way — so the failure is the build's, which is what
      `:251` said had to be true and could not be assumed.
      Two findings fell out of getting there, both recorded as comments at the site:
      the sign of `geom.unit` (+Y down, clockwise from up) put every ship's thrust 180 degrees out
      while heading error read near zero; and an unpowered engine still accepts an input it will
      never act on, so leaving brownout-out engines in the matrix made the allocator commit thrust
      to dead nozzles and sit still.
- [ ] **Brownout costs 25pp of pilotability** (45.0% -> 70.5%, same run as above) and turns 41 of 200
      ships into one-way-yaw hulls that cannot be flown at all. Not an argument to remove it — it is
      an argument that the invented-mechanic decision at the top of this section is now load-bearing
      for the piloted mode, not just for combat balance.
- [x] **Manual control is in the game view.** 2026-08-20. `pilot`/`pilotActuators`/`pilotAllocate`/
      `flightModel` are cells of `@tomlarkworthy/corepox-engine`; `stepSession` calls `pilot` when a
      caller has set `S.cmd`, and `viewof game` sets it from the pointer while `S.state === "playing"`
      — tap names a waypoint, drag names a waypoint plus the heading to arrive on, F holds fire. A tap
      that lands on your own hull is left to the editor. Verified in the browser on mission 8
      (`tools/scratch/play-manual.mjs`): waypoint ring drawn, player transform
      `translate(0.0 0.0) rotate(0.00)` -> `translate(-16.3 -93.9) rotate(-39.73)` in 5s, no console errors.
      `tools/corepox-mission-pilot.ts` drives all twelve missions through the same `stepSession` path:
      the three hulls with free engines fly (ConnectionLite/Connection 12.0 tiles, FollowCourse 17.3,
      FollowCourseAdvanced 16.1); the seven with none do not move, which is correct — there is nothing
      to command. No mission outcome changed.
      The pilot only ever commands engines that are **on the Brain's own island, powered, and unwired**
      (Tom's rule, 2026-08-20: "it should not be able to control disconnected components, only its own
      island"). Islands are read from `Ship.islands()`, so wiring an engine is what hands it to a program.
- [x] **A selection menu, because the shipped board has no modes** (Tom, 2026-08-21 — "on DUEL
      REFIT I am unable to access the component menu to make connections", the second report of the
      same thing). The zoom fix below made the ports visible; it did not make them findable. The
      interaction was still `shipEditor`'s: pick a MODE from a toolbar, then click. What Tom is
      reaching for is the one corepox-game already documents at corepox-game.js:217 — "The shipped
      board has no modes. It has a SELECTION, and the selection's menu says what can be done to it."

      `shipEditor` gained a `select` mode carrying that: tap a part, its menu appears in the tray
      as `Constant at 0,1 · rotate · wire → · <param> · remove`. `wire →` primes `wireFrom` from
      that component's output and switches to connect, so wiring is one click to start and one to
      land instead of finding an unlabelled dot first; when the wire lands it drops back to the
      menu, because the component is still what the player is working on. The rotate and erase
      spec edits are now written once and shared by the menu and the mode, so they cannot drift.

      Added as a mode, not as a replacement — default stays `build`, so the shipyard and the lab do
      not move. The refit bench opens in `select`.

      `tools/corepox-bench-menu.ts` (deleted 2026-08-21) drives it without ever clicking a mode
      button, which is the point of the test:

      ```
      the bench opens on the selection, not a mode        mode=select
      tapping a part selects it                           {"px":0,"py":1}
      its menu names it                                   Constant at 0,1
      menu offers                                         rotate | wire → | remove
      the wire is already primed                          wiring from 0,1 (out) — click an input
      drops back to the menu when the wire lands          mode=select
      rotate from the menu                                Engine@0,-1:up -> Engine@0,-1:right
      remove from the menu                                3 -> 2 parts
      ```

      `tools/corepox-bench-drive.ts` still passes, so the mode bar is intact.

      Superseded 2026-08-21: the mode bar and both gates are gone — see the bench-gate entry in
      §Now. This entry is kept because the reasoning behind selection-over-modes is what turn 9
      then generalised to the whole board.

- [x] **The refit bench framed the origin, not the hull** (Tom, 2026-08-21 — "I can't see to add
      connection or access the component menu at all"). Nothing was broken: modes switched, the
      wire logic ran, the parameter panel opened. The board was zoomed so far out that a 3-part
      hull rendered ~130px tall on a 414px board and the connect affordances — circles at
      `TILE * 0.22` — were dots (`tools/screenshots/bench-connect.png`, before and after).

      Cause: `battlefield`'s `frame()` collects ONE point per ship, its origin cell, so with
      nothing else to see the whole board span came from `api.pad`, which defaults to 6 tiles a
      side. The comment at corepox-render.js:520 already said this — "the knob that actually sets
      the zoom on a small ship … minSpan below that does nothing" — and named the campaign editor
      as the thing that drops it. `shipEditor` never did.

      Two changes, the second only because of the first. `shipEditor` now feeds every occupied
      tile through `view.focus`, which `frame()` already honours, so the margin is a margin again;
      and it takes a `pad` option, left at 6 so no existing view moves, which the refit bench sets
      to 2.

      Driven in a browser through the map, `tools/corepox-bench-drive.ts` (deleted 2026-08-21,
      replaced by `corepox-bench-board.ts`) — every click goes through the editor's own `qa` tile
      map, never a re-derived one:

      ```
      hull Brain@0,0:up Constant@0,1:up Engine@0,-1:up   wires 0,1out->0,-1in
        rotate    Engine@0,-1:up -> Engine@0,-1:right
        connect   output -> input, wire committed
        build     Lazer from the hold lands, 3 -> 4 parts, hold Lazer 2 -> 1
        modify    clicking the Constant opens "Constant at 0,1" with 1 input
      ```

- [x] **`@tomlarkworthy/corepox-duel-encounter`: the map now fights** (Tom, 2026-08-21 — "wire in
      corepox-dual to the map … see and change the build of their ship before battle … a consistent
      inventory (and resources) throughout the journey"). A new module rather than a bigger duel
      module, at Tom's suggestion, because everything in it is campaign policy and none of it is
      match rules.

      One node runs **refit → battle → spoils** in a single element, because the run's state lives in
      that element and a caller that had to re-mount between phases would lose it. `runEncounter` is
      the same three phases headless.

      The bench does not grow a second build UI: it wraps `shipEditor` from corepox-shipyard and
      reconciles what came out of it against the hold. The editor knows about a palette and not
      about counts, and a `stock` hook inside it would put campaign rules into a module three
      notebooks use for something else, so an overdraft is caught outside and the last affordable
      design is reloaded. `parts` is the hold (spares) and `ship` is the hull; they never
      double-count, which is what makes "you cannot afford that Engine" decidable:

      ```
      hull {"Brain":1,"Engine":1,"Constant":1}  hold {"Engine":3,"Lazer":2,"Armour":4}
        3 spare Engines fit                              ok
        a 4th is refused                                 short {"Engine":1}
        fitting them empties the hold of Engines         {"Lazer":2,"Armour":4}
        removing them returns them                       {"Lazer":2,"Armour":4,"Engine":3}
      ```

      Losses persist: after a win the hull becomes `specOfShip(survivors)`, so a part shot off is
      not in the hold either. That is what a REFIT node is for.

      **Manual piloting.** corepox-duel declared `control: "human"` and gave a view no way to drive
      it. `humanControl(host, D, side)` is that half — WASD, space, and a click for a waypoint,
      exclusive (a key clears the waypoint; a ship obeying both reads as a ship ignoring you). Keys
      are taken on the window with a focused-input guard, so the player does not have to click the
      battle first. Two additive seams made it possible: `battlefield` now returns `tileAt(ev)` (the
      screen→tile map it already owned; corepox-game re-derives the same five lines and should
      delegate), and `duelView` hands its battlefield view up as `root.view`.

      Measured in the browser through the map, `tools/scratch/encounter-shot.mjs`:

      ```
      at n0-0 scrap 214 hull 100 -> n1-0:unknown, n1-1:duel, n1-2:shop
      refit  HOLD scrap 214 · Armour 4 · Constant 2 · Engine 2 · Lazer 2 · Radar 1   LAUNCH
      battle elimination vs 05EE7CCD (7 parts), control human
      w held 1.2s -> 5.14 tiles/s, no console errors
      ```

      **UNKNOWN resolves on arrival**, not at generation — the map's own text promises "could be any
      of the above", and resolving it in `genRun` would leak the answer through the icon. Verified
      stable across two calls per node.

      **The map's posted reward is the reward paid.** `ENCOUNTER_RULES.scrap` and `NODE_KINDS.r1`
      are two files apart, so `tools/corepox-encounter-check.ts` parses the panel string and asserts
      the number: duel 40, escort 65, infiltrate 90, race 50, debris 35, rescue 45. Mining posts no
      number (updated 2026-08-21, below) and the check asserts that it does not.

      Limits, stated rather than stubbed: SHOP and REFIT resolve as a stop with no transaction, and
      RACE / DEBRIS / RESCUE have no course, field or beacon — `ENCOUNTER_RULES`
      marks them `battle: false` instead of running a duel and calling it a race. (MINING was on
      that list until 2026-08-21; it now runs.) A node that posts
      no reward now pays none (a SHOP was handing out a free part per visit).

      Foes come from the corpus by SIZE, not rating: difficulty is how much ship is pointed at you,
      and the corpus ratings are another game's matchmaking. Armed designs only — an unarmed hull
      cannot end an elimination match. Deterministic in the run seed and the node id.

      ```
      parts by column, seed 41: [[0,8],[1,7],[2,12],[2,15],[4,13],[4,13],[6,29]]
      ```

      Not done: the shop, the non-duel node types, and a way to spend scrap. Scrap accumulates and
      buys nothing yet.
- [x] **`@tomlarkworthy/corepox-mining`: the seam** (Tom, 2026-08-21 — "let's do the mining
      encounter next. Should be timed, with asteroids that split, and ore as parts inside it. free
      parameters should be density and and volume of [rocks] and ore"). A MINING node on the map now
      opens a field instead of resolving as a stop.

      **The generator described here was replaced the same day** — see the mineral-types entry
      below. What survived is the encounter shell (the node, the clock, the spoils path, the view)
      and the two findings marked below as such. What did not is the rock itself.

      **A rock was a ship made of ship parts.** `rockSpec` random-walked a connected blob of
      `Armour` on team `rock` and replaced some of its cells with real components. Nothing new was
      added to the engine: a rock splits because `World.splitDetached()` already turns a hull cut in
      two into two hulls, and ore came loose the same way. That was also what made ore *have to be
      dug out* rather than picked up — a piece was collectable only when its body was down to at
      most 3 live cells with no `Armour` left (`loosePiece`), so the plates around it were the cost.
      Tom's verdict on it: "I could not find any ore in the astroids. Its weird having lazers in
      there."

      Ore therefore cannot go anywhere. Two bugs, both from getting "buried" wrong:

      ```
      four-neighbour interior  ore grew the rock to find room; rockVolume 4 and 8 BOTH gave 107 parts
      >=2 neighbours          rockVolume 4 -> 35 parts, 8 -> 72, 16 -> 141   (deepest cell first)
      Armour in the ore list   "loose" is defined as no Armour left, so an Armour ore was uncollectable
      ```

      **Four free parameters**, and `rockHp` is the one that was not asked for. A `LaserTurret2`
      fires once a second for 5 (`UNITS.BEAM_CYCLE`, `BEAM_DMG`), so a 100 hp plate is 20 seconds of
      one gun: every armed mission ship collected nothing in 90 s (`tools/scratch/mine-ships.ts`).
      Rock is softer than armour plate or a seam is not workable in the time on the clock.

      **The bug that every other check passed through.** `minerCmd` handed `pilot` a POINT where
      `pilot` wants an ANGLE (`cmd.face ?? ship.a`), so `geom.norm([x,y] - ship.a)` was NaN, the
      allocator asked for no torque, and the miner drifted broadside firing forward:

      ```
      before   180 shots, 4 hits, 20 damage in 60s        rock hp 1265 -> 1265   scrap 0
      after    same seed, same hull, face = bearing       rock hp 1265 ->  690   scrap 70
               ore {"Constant":4,"Lazer":1,"Engine":1}
      ```

      Everything above it passed while the field paid nothing, so `tools/corepox-mining-check.ts`
      now ends with the gate that would have failed: a hull that can cut brings scrap back, and —
      the control — the same hull with nothing steering it brings none.

      **`MINER`**, a starter rig, exists because the failure was legible and worth keeping. A
      `LaserTurret2` clamps to ±90 of its mounting, so a hull with no free engine can only mine what
      is already in front of it. `laserpost` sat for 60 s with its turret commanded to −138° and
      pinned at the stop (`tools/scratch/mine-trace.ts`); of the mission ships only `spike`, which
      rams, mined at all. Two unwired engines are what let the pilot turn. (It has four now, and the
      two that were added did not work for two days — see below.)

      Rocks are rejection-sampled apart. Two dropped on the same spot are in contact and `collide`
      charges them 5 a tick for it, so a field that looked untouched had already shed a body before
      the clock started — 9 rocks, 10 bodies at t=0.

      **Mining pays the haul, not a posted number.** `applySpoils` takes an optional haul that
      replaces the rolled spoils; without it the node paid the same 120 whether the seam was worked
      or drifted past. `NODE_KINDS.mining.r1` is now "scrap = what you cut", and
      `corepox-encounter-check.ts` asserts *both* directions: a `mine: true` node must post no
      number, every other kind must post one that matches. `runEncounter` grew the same branch, so
      the node played headless pays what the node played on screen pays — a check written against
      the old stop-resolving path would have been vacuous.

      Verified in the browser through the map (seed 1, galaxy 2): JUMP into MINING → refit bench →
      60 s field in the layer → spoils → "back to the map ▶" with the marker on 1/7 jumps and the
      node struck through.

      **A preflight hole this opened, now closed.** Adding a `miningView` parameter to
      `encounterView` without adding its input shifted every later argument by one slot: `htl`
      received `encCss`, a string, and the cell died with "htl.html is not a function" — with **0
      preflight findings**. `unused-dep` and `undeclared-ref` both stay silent on a pure shift,
      because each displaced dep still lands on a parameter the body uses and the inserted name is
      still in the parameter list. New `dep-mismatch` check: a parameter that holds *another of this
      cell's own input names* is always a shift. A free rename is not (`(G, _) => G.input(_)` names
      `Generators` G in 204 cells here), so only the permutation case fires. 9 findings on the
      reintroduced bug, **0 across all 233 notebooks** in both content repos.

      Still true after the redesign: the POINT-for-ANGLE bug and the gate written against it, the
      rejection sampling, the haul-replaces-spoils path, and the `dep-mismatch` preflight check.
      Superseded: everything about how a rock is generated, and `MINING_ORE`, which used to
      name ship-part types and now names the two mineral ones.
- [x] **Relic registry: a design may NAME a prefab instead of carrying it** (Tom, 2026-08-20 —
      "so we need a relic registry as well for resolving those"). `loadShipSpec` already spliced a
      `Composite`, which carries its whole sub-ship inline in `param`. 436 of the 2191 corpus designs
      instead name the prefab as a component type, and `new Ship` threw on them:

      ```
      LazerHardpoint      417 designs      BrautenbourgsFirst  225 designs
      DevouringLove         4 designs      (tools/scratch/unimpl.ts, 2026-08-20; the sets overlap)
      ```

      New engine cell `RELICS`, and the splice resolves a sub-ship from either source. It runs to a
      fixpoint with a depth cap of 4 rather than once, because a relic may hold a Composite — none of
      the four shipped ones does, and the cap is also what stops a relic that names itself.

      ```
      tools/corepox-corpus-load.ts     before          after
        constructed                    1755 / 2191     2187 / 2191  (99.8%)
        failures                       LazerHardpoint, BrautenbourgsFirst, DevouringLove
                                                       4x DevouringLove only
      ```

      The four definitions are lifted verbatim from the corpus pack's own `relics` field —
      BrautenbourgsFirst, LazerHardpoint, Minidrone, WeaponStation — not re-recovered. It is a copy
      because the pack is a shipyard FileAttachment and the shipyard imports the engine, so
      `tools/corepox-relic-parity.ts` compares the two component by component and wire by wire and
      exits non-zero on drift. It also asserts the converse: DevouringLove is still the only type any
      design names that has neither an implementation nor a definition. Minidrone and WeaponStation
      are shipped but named by no corpus design.

      Spliced designs fight, they do not merely construct (`tools/scratch/relic-fight.ts`):

      ```
      7AF4D35F  8c raw -> 17c  4w loaded   beats gunBoat at the 30s limit
      3947FF75 26c raw -> 39c 13w loaded   beats gunBoat at 19.6s
      ```

      Consumers that filtered on `TYPES` alone had to learn about relics too, or they would keep
      hiding 432 buildable designs: `corpusIndex.blocked` in the shipyard, `duelRoster` in the duel
      module, and the lab's "cannot be built" message, which said 436 and now says 4.
- [x] **`loadShipSpec` discarded a wire's declared port name** — reported by Tom 2026-08-20 as
      "gunBoat does not shoot". It re-derived every port from the cell the wire ends on, which is
      wrong whenever two ports of one component are addressed through the same cell. gunBoat's two
      wires both end on `[1, 4]`, the turret's `angle` cell (`fire` is `[2, 4]`), so `dist -> fire`
      was rewritten to `angle` and the trigger was never written:

      ```
      gunBoat, 6s against a stationary target 14 tiles away (tools/scratch/gunboat.ts)
        before   raw 52 beam-ticks   loaded 0    gun.in = {"angle":10.84}
        after    raw 52 beam-ticks   loaded 52   gun.in = {"angle":null,"fire":null}
      ```

      Fix: a declared `fromPort`/`toPort` is kept when the component at that cell actually has that
      port, and cell re-derivation is the fallback. The fallback is what the recovered corpus needs —
      its 3781 wires carry no port names at all. Blast radius measured over all 913 specs (2191
      corpus designs plus the mission ships) by `tools/corepox-port-fidelity.ts`: 9 wires declare a
      port, 0 are still rewritten, and `manualAim` / `laserpost` / `shooter` beam-ticks are unchanged
      (112 / 108 / 106, identical raw and loaded). Drops are untouched — `find()` decides those and
      it was not changed — so the `newSession` entry below still stands.
- [ ] **`newSession` bypasses `loadShipSpec`** — found 2026-08-20 while checking the missions, and it
      predates the pilot. Every other path loads a spec through `loadShipSpec`; `corepox-game.js:46`
      passes the raw mission spec to `new Ship()`. The two disagree:

      ```
        Avoid          raw conns 3  loaded 1  (2 dropped)   free engines raw 0, loaded 1
        FollowCourse   raw conns 4  loaded 0  (4 dropped)   free engines raw 2, loaded 2
      ```

      So mission player ships run with connections the loader rejects, and — because the pilot reads
      "is this engine wired?" off `ship.conns` — Avoid's engine looks like a program's and the pilot
      will not touch it. Unresolved on purpose: it is not obvious whether the loader is right to drop
      them or the missions are right to keep them, and mission fidelity is recovered work. Whoever
      decides should also check `Composite`, which `loadShipSpec` expands and `newSession` would not.
- [x] **Turrets are not auto-controlled** (Tom, 2026-08-20). The line: a fixed `Lazer` points where
      the hull points, so its trigger carries no aiming decision and the pilot may pull it; a
      `LaserTurret2` has an aim, and the aim is what a wire is for. So `pilot` writes `in` on unwired
      `Lazer`/`Explosive` and nothing at all on a turret — verified by snapshotting `c.in` on the
      turret missions and calling `pilot` with the world stopped, which is the only way to tell its
      writes from `propagate`'s: **pilot-only delta NONE** on both ManualAim and Aim.
      (ManualAim's turret does gain `angle: 0` during a run; that is its own Constant, not the pilot.)
      This is also the answer to the item below — radar-aimed point defence while you fly the hull is
      something hands cannot do at the same time, so it is a wire worth building.
- [x] **WASD drives directly** (Tom asked, 2026-08-20). Same allocator, different demand: instead of
      deriving a wrench from a waypoint the keys name one outright, as a fraction of the authority the
      build has in that direction. So the keys a hull cannot honour do nothing, measured
      (`tools/scratch/drive-check.ts`, 3s per key from rest):

      ```
        FollowCourse    W  ->  2.95 tiles/s      S  ->  0.00      A/D  ->  -+8 deg/s   [yaw 35/36]
        ConnectionLite  W  ->  4.94 tiles/s      S  ->  0.00      A/D  ->   0 deg/s    [yaw  0/0]
      ```

      S does nothing on either because neither can thrust aft; A/D do nothing on ConnectionLite because
      its single centred engine has no torque arm. Same "the failure is the build's" property as the
      waypoint mode, now legible one key at a time. Verified in the browser on mission 8:
      `rotate 0.00 -> 1.99` under D, `translate (0,-5.1) -> (2.1,-51.4)` under W, `rotate 3.66 -> 1.97`
      under A (`tools/scratch/wasd-final.mjs`). A key press clears the waypoint and a waypoint clears
      the keys — they command the same nozzles, so only one may hold them.
      Torque weight drops from 8 to 2 under direct drive: starving thrust to serve a held turn key
      reads as an unresponsive ship, where under a waypoint attitude-first is what makes the burn useful.
- [ ] **Wiring becomes automation, not a prerequisite.** If the player has hands, a wire must buy
      something hands cannot do at the same time (point defence while dodging, a range gate while
      turning). Undesigned. Falsifiable early: if a wire only replicates a key press, it is a chore.
- [ ] Architecture sketch, untried: the player is another source node — a `Pilot` component whose
      output ports are driven by input instead of by upstream wires. Enemy ships stay wired ships,
      one simulation, and headless tools substitute a scripted pilot.

### Duel: one match, callable from anywhere (built 2026-08-20)

`@tomlarkworthy/corepox-duel`. Tom asked for a standalone module with programmatic invocation so the
map's encounters and a multiplayer session can be callers rather than reimplementations.

```js
runDuel({                                        // headless -> {winner, seconds, ticks, a, b, duel}
  a: {spec, control: "auto" | "wired" | "human"},
  b: {spec},                                     // default "wired": it flies its own program
  placement: {separation: 18, bearing: 30},      // tiles, degrees; explicit x/y/a per ship wins
  mode: "elimination" | "attrition" | "survival",
  backdrop: {...} | false,                       // corepox-backdrops params, seeded off `seed`
  limit: 60, seed: 1
})
newDuel(cfg) / stepDuel(D)                       // the same match one tick at a time
duelView(cfg, {height, span, speed, onEnd})      // backdrop + battlefield + scoreboard
```

Verified (`tools/corepox-duel-check.ts`), and the three controls are what make it reusable:

```
  liteCore control=wired   separation 30.0 -> 30.0 tiles after 10s   (nothing drives its engine)
  liteCore control=auto    separation 30.0 ->  5.0 tiles after 10s   (closes to the 6-tile standoff)
  human, thrust held 5s    speed 5.17 tiles/s                        (caller writes D.cmd.a)
  same seed twice          b@10s vs b@10s -> IDENTICAL
```

`auto` is `chaseCmd` — close to a standoff, hold the nose on the target, fire inside 26 tiles and 25
degrees. Deliberately dumb: it exists so an unwired corpus hull can be a credible enemy without
hand-authoring a control program for each of the 892.

**Three copies of "run a match" existed and they disagree about who is alive.** `simulate`
(`corepox-engine.js`) and `tools/corepox-match.ts` both use `Ship.alive`, which requires a powered
Brain — so a brainless device is dead on the first tick, and a ProximityMine loses every match it is
in before it has done anything. `runMatch` (`corepox-lab.js:414`) uses the better rule: a ship that
*arrived* with a Brain needs one, a ship that never had one is alive while it has parts. The duel
module takes the lab's rule.

- [ ] Migrate the other three onto `runDuel`. **Not done deliberately**: the aliveness rule differs, so
      moving `tools/corepox-match.ts` over will move the recorded intransitivity result (1.4% cyclic,
      measured 2026-08-20) — the pairs it changes are exactly the ones involving brainless ships. That
      is a re-measurement, not a refactor, and it should be done as one.
- [ ] Most `SHIPS` pairs still draw. A full pairwise sweep with `control: "auto"` and a 45s limit
      (`tools/scratch/duel-matrix.ts`) found ~14 pairs that resolve after 3s; the demo default
      (manualAim vs gunBoat, ~10.6s, both sides ending on 3 parts) was picked off it. The lab's arena
      recorded the same thing independently. Whether that is a TTK problem or a roster problem is open.

### Controls — one surface, six gestures, no rule (raised 2026-08-20, Tom)

> "We have a lot of different controls fighting like pan and zoom, vs auto-pilot. I think we need
> more thought into the control systems including placement menus, connector drag placement,
> placing components."

Deferred on purpose: the right scheme depends on what the game turns out to be, so this is a record
of what is currently bound and where it collides, not a proposal. Everything below is read off the
code, line numbers as of 2026-08-20.

What the board listens to today:

```
  wheel                       zoom                  corepox-render.js:659
  left-drag on empty space    pan camera            corepox-render.js:676-696  (suppressed by panLock)
  left-drag from a port       draw a wire           corepox-game.js:1041-1055  (connect mode only)
  left-drag while playing     waypoint + heading    corepox-game.js:1022-1040
  click                       place / move / select corepox-game.js:1013, clickTile at :588
  F held (window)             fire                  corepox-game.js:229-230
```

Six behaviours on one pointer, disambiguated by mode and by what happens to be underneath. The
specific collisions, worst first:

- **Panning is gone while playing.** The pilot's drag takes empty space (`:1022`), which is exactly
  where a pan starts. Introduced by the manual-control work; a camera you cannot move during a match
  is a regression, not a trade.
- **`panLock` is a shared latch with two independent writers** — the pilot handler (`:1028`, cleared
  `:1039`) and the connect handler (`:1047`, cleared `:1050`). Release order decides who wins. Nothing
  today makes both fire on one drag, but nothing prevents it either.
- **Your own hull is a hole in the map.** A tap that lands on the ship is routed to the editor
  (`:1024`), so a waypoint cannot be placed there. Right for building, wrong for a waypoint just past
  your own nose.
- **F is bound to `window`.** In a lopepage layout that means typing "f" in another pane's editor
  fires the guns. It needs to be scoped to the board, or to focus.
- **No cancel.** There is no gesture that clears a waypoint or aborts a half-drawn wire.
- **Touch is unconsidered.** No pinch, and a one-finger drag is already claimed three ways.

Found while adding WASD, both now fixed, both worth remembering as the shape of this problem:
- **A focused `<select>` ate the drive keys.** The mission dropdown keeps focus after a change, and a
  focused select both swallows the keys and jumps its options on a letter -- pressing "d" changed the
  mission. It now blurs on change, and a pointerdown on the board takes focus back from anything holding it.
- **The intro cutscene swallows everything.** `start()` (`:739`) only runs after the cutscene finishes,
  so a live mission sits in `build` with the board visible and every control inert until the intro is
  dismissed. Nothing is wrong and it looks exactly like the controls being broken; it cost three
  debugging rounds here and it will cost a player the same confusion.

One thing decided, one still open:
- **Build-during-play stays** (Tom, 2026-08-20): "it adds immersion", and it will be on for some game
  modes. So the editor and the pilot competing for the same gestures at the same time is a permanent
  condition to design for, not a conflict to remove by making building modal.
- **Does the pilot keep the drag?** Waypoint-and-heading is one gesture doing two jobs; a tap for the
  waypoint and a separate control for facing would give the drag back to the camera. Now that WASD
  exists, the drag is no longer the only way to fly, which makes giving it up cheaper than it was.

### Heat
- [ ] Heat as a per-component scalar diffusing over the component-adjacency graph — the same graph
      power and structural breakup already need. Rate per material: copper fast, armour slow.
      High heat does damage.
- [ ] Intended effect, unverified: a duty cycle on lasers without nerfing laser damage, and a second
      job for armour (heat sink) that is independent of the TTK fix. Whether it actually moves the
      wall archetype is a tourney question, not an argument.
- [ ] Order matters: heat on top of a flat power model will not read. Power first.

### Damage economy
- [ ] Post-battle repair costs, so damage persists across a run and a pyrrhic win is a real outcome.
- [ ] Nanobot repair: bots consume nano particles and move through the ship to repair. This is the
      Cosmoteer corridor mechanic — resources as visible moving objects with routes and latency —
      applied to repair rather than to ammo. Unknown: whether Corepox's tile density leaves room for
      anything to walk.

### Weapons
- [ ] **EMP that triggers connections** — an attack at the signal layer rather than the HP layer:
      inject spurious values into wires. No other game in the study attacks the player's *program*.
      Undesigned, and probably the most Corepox-specific idea on this page.
- [ ] **Ion beam shaped by fields** (Tom, 2026-08-20) — a projectile whose path bends through
      emitted fields rather than flying straight. Aiming stops being a bearing calculation and
      becomes a field-placement problem, which is wiring-shaped: a field emitter takes an input the
      same way `Lazer` takes `fire` and `LaserTurret2` takes `angle`. Unknown whether a curved
      shot can be made legible enough for a player to aim deliberately rather than by trial.

### Fields — raised 2026-08-20 (Tom), no physics for this exists

- [ ] **Components held off-hull by electromagnetic force**, orbiting rather than bolted on.
      Today a detached component is a failure state — `splitDetached()` makes it its own body — and
      this would make detachment a *design choice*. It is the mechanic the decoy/splitter and swarm
      playstyles above are currently missing a reason for
- [ ] The concrete first case is already in the component table: `Orb` is 2x2, hp 75, pwr 2, joins
      on ONE side only, and does contact damage to anything touching it (`corepox-engine.js:971-975`).
      A component that already wants to be on the end of something. Tethered by a field it is a
      flail; the recovered game never gave it that
- [ ] **A field that fails drops what it was holding** — visible, dramatic, and it makes the
      tether a real risk. What makes it fail is open; the brownout answer is struck with the rest
      of the power model
- [ ] Physics not yet designed: connectivity today is rigid (reach-2 joints, islands). A held
      component needs a soft constraint — spring, orbit, or a constraint solver — and whatever it
      is has to stay reproducible tick-for-tick, because match outcomes are meant to re-simulate
      (see the trig-table entry under `## Next`)

### Run structure
- [ ] FTL-shaped run: node graph of events, one currency, fame as score, 20-40 minutes, no galaxy
      map and no trading (explicitly rejected as a time sink). Meta-progression unknown.
- [ ] Encounter roster from the 892-ship corpus, tiered by measured strength
      (`tools/corepox-tourney.ts`, `tools/corepox-archetype-vs-corpus.ts`) rather than by hand.
      This is the reason the content problem that sank the comparables (Nimbatus "repetitive",
      Reassembly "no end-game") may not apply here.

### Encounters — roster picked 2026-08-19 (Tom), none built

Two axes, so variety is a product rather than a sum: **verbs** (what you are doing) x
**environmental modifiers** (what the sky is doing to you). The corpus supplies opponents inside a
verb; it supplies no verbs, so verbs are authored. Verbs the engine has already shown, from the 9
recovered missions: aim/track (`Aim`, `ManualAim`, `TwinTurrets`), evade (`Avoid`), survive a spawn
ring (`Aim`), timed fuse (`delayBomb` spec), course-following (`FollowCourse`, no campaign slot).

Verbs:
- [ ] **Duel** — corpus ship, tiered by measured strength (`tools/corepox-tourney.ts`)
- [ ] **Escort** — keep a moving freighter alive; the enemy wants something that is not you.
      `defend` objectives exist and were fixed once already (they read as constraints, not goals)
- [x] **Mining** — ore against a clock (built 2026-08-21, above). No enemy, so it is where heat
      can be taught before it kills; heat is still not built
- [ ] **Debris field** — traverse, environment damage, no enemy. Tests the pilot solver alone.
      `FollowCourse` is the closest recovered mission and has no campaign slot
- [ ] **Race** — course + clock. The one node where mass is a pure liability, which is the only
      counter-pressure to "more guns" that does not come from a combat rule. Open: against a clock
      or against a rival ship. A rival is more legible; unmeasured
- [ ] **Rescue** — reach a target under a clock, then tow it. Towing changes CoM mid-node, so a ship
      that steered well empty may not steer loaded. Reuses the CoM/torque-arm work; unverified that
      the mass model takes an attached load
- [ ] **Infiltrate, then escape under fire** — two phases whose builds conflict (quiet and small vs
      armoured and fast). The only node on this list that cannot be answered by one build, which is
      why it is worth the extra work. Detection could ride on enemy `Radar`, which already computes
      bearing and dist

Modifiers (apply to any verb; must be visible BEFORE the player commits to the node, or they cannot
rebuild in response — which is the whole point of having them):
- [ ] **Stellar heat** — ambient heat per tick, scaled by proximity. Depends on the heat system
- [ ] **Cosmic rays** — random signal injection into wires. Same mechanism as the EMP weapon idea:
      write it once, consume it as both a hazard and a weapon
- [ ] ~~**Drain field** — cuts Brain supply, forcing brownouts~~ — struck 2026-08-20: rests on the
      invented power model. Revisit only if power is confirmed as a real mechanic
- [ ] Open: whether debris works as a modifier as well as a verb, and how many modifiers one node
      may carry

### Playstyles — framing 2026-08-19 (Tom), none verified

A roguelike needs several builds that all win differently. The generative rule, and the one the
game's own history proves: **a playstyle exists only if some system other than damage is a
bottleneck.** At 138s TTK the only lever that moved anything was more lasers, so there was exactly
one playstyle and the players found it (`plan/corepox-design.md` §1.3).

Bottlenecks available to design against:

```
power          20 per Brain, hop-order brownout   INVENTED in the rebuild -- see caveat
mass/handling  CoM, torque arms                   42% of corpus heavy ships steer badly
heat           -                                  PROPOSED
attention      what hands cannot do at once       arrives with piloting
detection      Radar bearing/dist                 EXISTS
```

Each playstyle below should answer a different one. None is verified viable.

- [ ] **Sniper / artillery** — beats detection with a range gate. Best in self-play (81% win),
      never confirmed against the corpus
- [ ] **Glass cannon** — massed weapons, no armour. Needs a cost other than mass to be a real
      choice; the power framing is struck (see caveat)
- [ ] **Distributed / redundant** — spread the critical components so no single hit ends the ship.
      Justified by damage geometry, not by power
- [ ] **Tank** — armour as plate and heat sink. Currently dominated; needs heat before it can earn
      its mass. `ships.json` says armour marks the heaviest, best-piloted corpus ships
- [ ] **Ram / kinetic** — impact damage is flat 5 per contact per tick (250/s). Blocked on
      steering (`rammer` CoM 2.8:1)
- [ ] **Speed / hit-and-run** — thrust-to-mass, Hyperdrive (6% of corpus). Rewarded by every node
      with a clock
- [ ] **Evasion** — Radar-driven avoidance wiring rather than thrust. The `Avoid` mission is this
- [ ] **Automation / high intelligence** — beats attention. The reason to keep the wiring layer once
      the player has hands, and it only pays in nodes where two things need doing at once (Escort,
      Infiltrate). Sniper's `Radar -> Binary(LT) -> Lazer` gate is the existing proof it can beat
      brute force
- [ ] **Decoy / splitter** — shed a body to draw fire. `splitDetached()` exists and the renderer
      already shows mid-match bodies
- [ ] **Swarm** — several minimal Brain+Engine+Lazer bodies released as independents. Multi-island
      ships already load and `alive` requires a powered Brain per body, so sub-bodies are already
      well defined. Decoy and swarm are the two styles no comparable game can copy, because
      elsewhere breakup is a death state rather than a build
- [ ] **Bomber** — Explosive area damage instead of penetration. 25.4% corpus adoption; the designed
      campaign ships ran Explosive 25 against Lazer 1
- [ ] **Economic** — a run-layer style, not a ship one: take risky nodes, run lean, buy late.
      Needs currency and repair sinks to exist first

Gate, when there is something to test: write each as a ship spec and run it against the 892-ship
corpus (`tools/corepox-archetype-vs-corpus.ts`). Require rough parity. A style that cannot reach it
is a trap, and shipping traps is what makes roguelike builds feel bad.

Status against that gate, 2026-08-19: **zero confirmed viable.** Last measurement was roster 10.1%
win / 21.6% loss / 68.3% draw against the corpus, and one real 9-part player ship took 24 of 28
duels against the whole roster. The steering retune under `## Next` is on the critical path for all
of them — four of seven archetypes barely reach engagement range, so most of these have never
actually been tested.

### The map arc — the run has no spine, measured (2026-08-21)

Tom, 2026-08-21: think about the large map arc and what it needs to be fun like Slay the Spire
or FTL. Before borrowing any device, what a run actually is today. All of this is measured, and
most of it was a surprise.

```
tools/corepox-attrition.ts -- 54 decisive wired duels over 9 roster ships, 22 tiles apart
  the winner loses a part in                 0% of wins
  the winner takes ANY hp damage in         11% of wins
  median fight length                       4.5 s
  pairings that DRAW at the 60s limit       50%
  survivingHull, one Armour destroyed  ->   7 of 7 components returned, at full hp
```

- **Nothing persists between nodes.** *(Fixed 2026-08-21 — see the ordered list at the end of
  this section. What follows is what was measured before the fix.)* `survivingHull` is commented *"After the battle the hull IS
  the survivors … parts shot off are not in the hold either, they are gone."* It calls
  `specOfShip`, which maps `ship.comps` — and `Ship.damage` never splices, it sets hp to 0, while
  the split path (`corepox-engine.js:976`) kills components into the parent rather than removing
  them. `specOfShip` writes `type/pos/dir/param/overrides` and **no hp**. So a destroyed component
  comes back at the next node, whole. The comment describes a design that was not built, and two
  entries in the economy section below were written trusting it — corrected there.
- **Winning is free even before that.** The winner is untouched in 89% of fights.
- **Half the board is not played.** `race`, `debris`, `rescue`, `mining`, `shop`, `repair` and
  `unknown` are `battle: false`, and `runEncounter` returns a win for any non-battle node. Ten of
  the 22 draws in `genRun`'s pool are fights; the rest are a click that pays.
- **A loss ends the run outright** (`over: "destroyed"`), so the only feedback a run carries is
  binary and terminal.
- **Every path is the same length**: seven columns, one node taken per column.
- **The boss is 29 parts against a ceiling of 20** (economy section below).

A run is therefore six independent 4.5-second coin flips, half of them a click, followed by a
boss that arithmetic says cannot be beaten — and the hull that arrives is the hull that left,
whatever happened on the way. **No state carries, so there is no arc.** That is one finding, not
six, and it is upstream of every balance question.

#### The four devices, and which ones are missing

1. **Something you carry that gets worse.** FTL's hull, Slay the Spire's HP and deck bloat. This
   is the spine: it makes winning a *cost*, which is what turns "which node" from a payout
   question into a risk question. Corepox has the strongest available version — losing a
   component is a **capability** loss, not a number going down — and currently has none of it,
   twice over: nothing is lost, and what is lost does not carry. **Carrying hp in the spec is the
   cheapest change in this document and the one the rest depends on.**
2. **A clock that forces the pace.** The rebel fleet is FTL's single most important structural
   device: it turns a tour into a race, makes a detour cost something, and makes "leave now" a
   decision. Nothing here does this — and it would fix "every path is the same length" without
   redesigning the board.
3. **Legible, optional risk.** A Slay the Spire elite is visibly harder, visibly better paid, and
   skippable. Corepox posts a reward and no difficulty; `band` exists and is never shown; and the
   risk at a battle node is not "a hard fight", it is "the run ends".
4. **A boss you prepare for, not one you arrive at.** Slay the Spire shows the act boss from the
   first room. The refit bench already draws the foe for the node being entered (2026-08-21) —
   showing the *boss* from turn 1 is a small step from code that exists.

#### What corepox has that neither comparable has

Build the arc on these rather than on imitation.

- **The opponent's program is public.** 892 corpus ships with readable wiring, and the bench
  already renders the foe. Showing its **circuit** before the fight makes encounter prep a puzzle
  with a right answer — *it fires when `dist < 20`, so fight it at 25* — which is a roguelike verb
  neither comparable can copy. Slay the Spire hides intents on purpose; here the information is
  the content.

  **The reveal should be earned, and the price should be hull space** (Tom, 2026-08-21): an
  upgrade, or simply *having a Radar fitted*. That is the better version of the idea and it is
  this game's idiom rather than a roguelike's — information is bought in **cells**, not in
  currency, so intel competes with guns for the same space, and a Radar gets a second job on top
  of the bearing/dist it already feeds in combat. It tiers naturally: no Radar, nothing; a Radar,
  the foe's silhouette and part count; something better, the wiring. `encounterFoe` is already
  pure in `(node, camp.seed)`, so the whole thing is a gate on a panel that exists — no new
  simulation.

  One consequence to take deliberately: the bench draws the foe **unconditionally** today
  (shipped 2026-08-21), so this *removes* something the player currently has. Fine for a run
  structure, but it is a takeaway and not an addition, and a player who has never seen the panel
  will not know what the Radar bought them. Whatever gates it has to advertise itself when it is
  missing — an empty AGAINST panel that says *fit a Radar* beats no panel.
- **Rewards can be capabilities, not statistics.** A Binary is a new sentence in the language, not
  +5 damage. That is progression without a tech tree, which was already rejected for gating ideas.
- **A reward can be unusable until the hull is re-laid-out.** The spatial version of "this card
  does not fit my deck", already in the 2026-08-19 sketch.
- **Failure is structural.** A hull can be cut in two and keep flying as two bodies. Neither
  comparable has partial structural failure, and it is the most legible possible form of carried
  damage — you can *see* what the run has cost you.

#### Failure modes to design against

- **The optimal line.** If one route dominates, the map is a menu with extra steps. A clock and
  per-node economics are what prevent it.
- **The unwinnable run** — FTL's worst failure mode. 29-against-20 means corepox is not
  occasionally in that state, it is always in it.
- **The fight as a formality.** 4.5 seconds means the build decided the fight and the fight
  reported the result. If combat has no middle, the battle node is the least interesting node on
  the board, which inverts the whole design. Caveat on that number: nine roster hulls of 3–16
  parts, wired, from a fixed 22-tile separation. Corpus ships are larger and may fight longer —
  worth re-measuring there before treating 4.5s as the game's TTK. Note also that
  `plan/corepox-design.md` §1.2 diagnosed the *opposite* problem in the pre-port build, so this
  may be an over-correction rather than an original defect.
- **The dead node.** Half the roster pairings draw at the 60s limit, and a draw pays nothing —
  `encounterSpoils` returns `{scrap: 0, parts: {}}` for any verdict that is not a win. A node that
  can end in nothing is a node the player wishes they had skipped.
- Already recorded from the comparables: Nimbatus "repetitive", Reassembly "no end-game".

#### The order I would do it in

Each one unlocks the next, and the numbers are the reason.

1. ~~**Carry hp, and carry destroyed parts, between nodes.**~~ **Built 2026-08-21.** Four
   modules, and one of them was not on the list.

   The spec gained `dmg`, damage carried in, as a field **separate from `hp`**: `hp` in a spec
   declares the part's maximum — a mining field builds its rock at `rockHp` per tile — so
   reusing it for a wound would make the part read as full and cap its repair at whatever was
   left of it. The constructor is now
   `hp: max(0, (c.hp ?? T.hp) - (c.dmg ?? 0)), maxHp: c.hp ?? T.hp`.

   `survivingHull` drops the destroyed components and the wires that touched them, and keeps
   the survivors' damage. `specOfShip` writes `dmg` **only when there is damage**, so an
   undamaged ship serialises byte for byte as before — 21 roster ships checked, none gains a
   field, which is what keeps saved designs, `shipSource` and the corpus round-trip out of it.

   **The module that was not on the list**: `shipBoard`'s own `specOf` in
   `@tomlarkworthy/corepox-board` is the writer the refit bench actually round-trips through,
   not `specOfShip` — two copies of one rule, and corepox-board sits below corepox-shipyard in
   the import graph so it cannot call the other. It wrote `hp: c.hp`, the *current* value, into
   the field the constructor reads as the *maximum*. That was invisible for as long as campaign
   hulls were never damaged and became a compounding bug the moment they were: a hull edited at
   43/50 came back as 43/43, and every later refit ratcheted the ceiling down again. Found by
   reading the bench's data path rather than by a test, then gated.

   Two gates, because the two writers need different instruments:
   - `tools/corepox-carry.ts` — headless, 11 assertions: the dead part is gone by position, its
     wires went with it, the survivor carries `dmg`, reloading gives the damaged hp with the
     full `maxHp`, spec → Ship → spec is a fixed point, no undamaged ship gains a field, and a
     severed bar keeps only its own island. The fixture picks a **wired** component to destroy,
     so the wire assertion cannot pass on "0 of 0".
   - `tools/corepox-bench-carry.ts` — in a browser, because `shipEditor` needs a DOM. Loads a
     wounded hull into the real bench and asserts it comes back at 43 hp with `maxHp` 50, and
     that a second round trip is a fixed point.

   Unchanged: engine-test, determinism (identical across 3 runs), missions 12/12 winnable and
   0/12 no-input, encounter-check, duel-check, preflight 0 NEW, qa-campaign 11/12 with
   FollowBoss still the only failure.

   **Known hole, recorded not fixed.** The hold is `{type: count}`, so removing a damaged part
   in the bench and putting it back repairs it for free. Closing it means the hold tracking
   damaged instances, which reaches `partsOf`, `refitCheck` and the chips. Under Tom's proposed
   energy-per-placement the laundering would at least cost energy, but that is unbuilt.
2. **Fix the boss arithmetic.** Until a run is winnable, no other change can be evaluated.
3. **Make the sink real** — the shop, or better the factory component, which does the same job
   from inside the hull.
4. **Give combat a middle.** The two numbers to move are 4.5s and 11%-of-winners-scratched. Most
   design risk, most payoff, and the tourney tools are the right instrument.
5. **Add the clock.**
6. **Show the boss, and the enemy's circuit, from turn 1.**

1–3 are arithmetic and plumbing. 4 is a balance question. 5–6 are new interface. Nothing here is
built.

### The run economy — played and it does not work (Tom, 2026-08-21). Nothing here is built

Tom played a run: "the boss is OP for what components we have and there are few chances to get
more components". Before any of the ideas below, the arithmetic, because two of the three
complaints are not tuning — they are a missing feature and a formula.

`tools/corepox-econ-audit.ts`, over three run seeds at `galaxy 2, jumps 7`:

```
start hull  wiredCore: 3 parts, 1 wire  [Brain Engine Constant]
start hold  Engine 2, Lazer 2, Armour 4, Constant 2, Radar 1 = 11 spares
start scrap 214

seed 41  greedy path escort -> duel -> infiltrate -> rescue -> duel -> debris -> boss
         scrap on that path 515  (start 214 -> 729), parts won <= 7
         boss band = 5 + col*2 + 12 = 29 parts
```

- **The boss is a 29-part ship and the player cannot field more than 20.** `encounterFoe` picks
  by size: `band = 5 + col*2 + R.band`, and `boss.band = 12` on top of the column's own +12. The
  player's ceiling at that node is 3 (hull) + 11 (starting hold) + 6 (one part per win, six nodes
  before the boss) = 20, and that is bolting on literally everything ever owned, including the
  Constants. The gap is structural, not a difficulty curve.
- **Scrap has no sink. There is no shop.** `ENCOUNTER_RULES.shop` is `{battle: false, scrap: 0}`
  and `runEncounter` resolves it as a stop; the only reader of `PART_COST` is the salvage
  weighting. `refitCheck` gates on part *counts* in the hold, never on scrap. So the panel's
  "buy parts / sell salvage" and REFIT's "Costs scrap; costs no time" are both promises with no
  implementation, and a run ends holding ~730 of a currency that was never spendable.
- **The part roll is worth about 16 scrap and is usually not a weapon.** Spoils are one item
  weighted `1/max(5, cost)`, so: Constant 32.0%, Armour 16.0%, Binary 13.3%, Explosive 8.9%,
  Engine 8.0%, Radar 6.4%, Lazer 5.3%, Orb 4.6%, LaserTurret2 2.9%, Hyperdrive 2.7%. Expected
  value **16.0 scrap**, P(weapon) **21.7%** — so a whole run's part income is ~96 scrap of value
  and **~1.3 weapons**, against 515 scrap that cannot be spent on anything.

That is the shape of "few chances to get more components", measured: the currency you earn most
of is the one with no sink, and the currency that matters arrives at one cheap item per node.

**Fix the shop before tuning anything.** Until scrap has a sink, no economy change is
measurable — every number below is unfalsifiable while the only real income channel is a
21.7%-weapon roll.

#### What Tom proposed

Recorded as said, 2026-08-21. None of it is built.

- **Fitting a component costs money, and removing one costs money too** — "so you want a ship
  that does not change too much as it's expensive refitting it".
- **Do not be stingy with component rewards**, because the upkeep is already a headwind.
- **"Scrap" is the wrong word.** Maybe **metal** and **energy**.
- **The ship generates resources every turn, depending on its loadout** — "so you have to pilot
  an economy too?"
- **The point of all of it**: a map turn with economic consequences makes movement a dimension of
  choice alongside combat.

#### Reactions, with what they cost

- **Two resources are only two if they do different jobs.** If metal and energy both buy parts
  they are one currency with an exchange step. The split that carries its weight is
  **metal = stock, energy = flow**: metal is conserved and buys/repairs/welds; energy is produced
  and consumed *per jump* by the loadout and does not bank (or banks to a small cap). Then a
  heavy ship is expensive to *move*, which is the headwind, and route choice becomes an energy
  question while refit stays a metal question. Falsifiable: if a player can convert one to the
  other at a stable rate, this collapses back to one currency and the second was a tax on
  attention.
- **Note what "energy" is not.** The game being ported has no power system —
  `ShipComponentStats` is `{hyperspeed, maxHp, panel}` and a per-tick power budget invented during
  the rebuild was removed on 2026-08-20 as unsourced. A per-jump strategic resource is a
  *designed addition* and should be labelled one, not smuggled in as fidelity. It is also a
  different object from the per-tick budget that failed: it is charged once per map turn, not
  inside the physics loop, so it cannot make a brainless hull refuse to move.
- **Charging for removal punishes the editor, which is where the game is.** Tom's aim —
  commitment, a hull with an identity — is right, but a flat removal fee taxes exactly the
  experimentation the build screen exists for. Three ways to keep the commitment and not the tax,
  cheapest first: free at REFIT/SHOP nodes and costly in the field; a per-jump allowance of one
  free part moved; a cost that scales with joints changed rather than parts touched, so
  re-siting a wing is dear and swapping one plate is not. Recommendation: the first two together
  — the node types already exist and the allowance is one integer on `camp`.
- **Do not charge twice for a bad fight.** ~~`survivingHull` already deletes the parts shot off
  you: attrition is an existing metal sink.~~ **Corrected 2026-08-21**: it does not. `specOfShip`
  maps `ship.comps`, destroyed components stay in `comps` at hp 0, and the spec carries no hp — a
  destroyed part comes back whole at the next node (`tools/corepox-attrition.ts`, and the arc
  section above). There is no existing sink. The recommendation survives the correction and
  becomes conditional: **if** attrition is made to persist, voluntary removal must not be charged
  on top of it, and destroyed slots must clear free.
- **Naming**: `ore` is already a real thing in the mining node and pays into `scrap` today. If
  the currency becomes **metal**, ore should refine into metal rather than sit beside it, or
  there are three currencies by accident.
- **Per-turn generation needs a readout or it cannot be piloted.** "+12 energy/jump" belongs on
  the refit bench next to the HOLD chips, live as the player builds — the bench already renders
  chips, so this is cheap, and without it the loadout-to-income link is invisible and the player
  is not making a choice, they are being surprised.
- **Where the generation comes from, three options.** A dedicated Reactor part: legible, and it
  is a tax slot every build must pay. Every component carrying a small yield and a small upkeep:
  richer, composition matters, invisible without the readout above. Income from what you *did*
  last turn — ore cut, ship killed: ties the economy to play rather than to inventory, and needs
  no new part. Recommendation: the third plus a Reactor, and keep per-component upkeep out of the
  first version.
- **The real risk of per-turn upkeep is the death spiral.** Income tied to loadout is a feedback
  loop: a bad fight costs parts, fewer parts earn less, the next fight is worse. Sublinear
  upkeep, a floored income, or a rubber-banded boss all break it — but a rubber band contradicts
  the principle the pilot is built on, that the failure is the build's. Flagging the tension
  rather than resolving it.

#### Other ideas this opens up

- **Economic verbs on the map, so route and loadout interact.** A node that pays energy and no
  metal (a gas skim), one that pays metal and no energy (a wreck), one that pays only if you are
  carrying the right component (a refinery that wants a Radar). Today every node pays the same
  currency, so the loadout has no say in which node is worth visiting.
- **Make some edges cost more than others.** The map is columns and edges already; a long jump
  or a hazard-covered column charging more energy turns the board from a menu into a plan.
  `genRun` already places STELLAR HEAT and COSMIC RAYS and **nothing consumes them** — they are
  drawn, labelled with an effect, and read by no other module. That is a free hook.
- **Weight the salvage roll by what you fought, not by price.** "Loot the ship you killed" is
  already on the older sketch; the measured 21.7%-weapon rate is the argument for it. A duel
  against a gunboat should drop a gun.
- **Sell the hold.** The inverse sink: if metal buys parts, parts should return metal at a loss,
  or a player who has built into a corner has no way to pivot and the commitment is a trap
  rather than a decision.
- **The boss band should be a function of the run, not a constant.** `+12` was picked with no
  reference to what a run can accumulate. If income changes, this number has to be re-derived
  from it, and the honest version is to compute the band from the player's *available* parts at
  that column rather than from the column index.
- **Sweep it, do not tune it.** The whole run is headless: `newRunCampaign` + `runEncounter` play
  a node without a screen, so an economy can be swept over seeds the way the mining field was.
  Worth a `corepox-econ-run.ts` reporting metal in/out, parts in/out and boss win rate per seed
  before any number is chosen. (`tools/corepox-econ.ts` already exists and its hit-rate column
  carries no information — do not read it as a baseline.)

#### Second pass (Tom, 2026-08-21): put the economy in the build

- **A factory component**: makes parts in exchange for metal, +1 part per jump.
- **Energy is used to place parts.**
- **Energy generators, or batteries to store energy.**
- **Energy + metal for repairs.**
- **Hard missions like rescue need to reward artifacts to be worth doing.**

**This is a better shape than the one above.** The previous pass put the economy in the wallet —
two currencies, upkeep, a shop. These four put it in the *hull*: a factory, a generator and a
battery are components, so they take cells, take mass, and compete with guns for the same space.
That makes the economy a build problem, which is where this game already lives, and it means
"pilot an economy" is not a second screen — it is the ship.

The costs, one at a time.

- **The factory is the missing sink, and it is a better one than a shop.** A run earns 515 scrap
  it cannot spend and ~6 parts it desperately needs (measured above); a factory converts the
  first into the second at a rate you control, and it does it *without* the run having to route
  through a SHOP node. It also doubles part income — 6 jumps at +1 is the same order as the whole
  salvage curve.
- **But on the current board the factory is not a route decision.** `genRun` gives every path the
  same length: seven columns, one node taken per column. A per-jump yield therefore pays the same
  whatever route is chosen, so it changes what you build and not where you go. To make it the
  map-turn mechanic Tom is after, one of these has to change: paths differ in length, or the
  factory's yield depends on the node it jumps *from* (a DEBRIS or MINING field feeds it, a
  RESCUE does not). The second is better — it makes route and loadout argue with each other,
  which was the stated goal.
- **What the factory produces has to be chosen at the last refit, not rolled.** A random output
  is a slot machine, and a free choice on arrival is a shop with a delay. A part named when you
  commit and delivered on arrival is a commitment device, which is the same thing Tom wants from
  expensive refitting, obtained from a component instead of from a fee.
- **The factory needs a rule against making factories**, or the first purchase every run is a
  second factory and the curve is exponential. Cheapest version: a factory cannot produce its
  own type.
- **Energy-for-placement is better than metal-for-placement**, which is what the section above
  proposed. It makes refitting compete with *moving and fighting* rather than with buying, so a
  player who rebuilds heavily arrives depleted — the cost lands where the player can feel it.
- **Energy needs a second consumer or it is just slower metal.** Placement alone makes it a
  one-purpose token. Repairs are one (below). The jump itself is the other, and there is a
  component already waiting for that job — see Hyperdrive below.
- **Generator and battery are the stock/flow split, relocated into components**, and that is the
  right place for it. Metal stays the only banked number; energy is produced per jump by
  generators and held only to the capacity of the batteries fitted. The consequence is the one
  Tom asked for, and it falls out rather than being imposed: **a hull with no battery cannot save
  up for a big refit, so it must refit little and often.** A hull that wants one big rebuild has
  to carry the capacity to afford it, in cells, all run.
- **Placement must be free onto a destroyed slot** — conditional on attrition existing at all,
  which today it does not (see the correction above and the arc section). Once it does: a player
  who is losing would otherwise pay the placement fee *and* the parts, and a player rebuilt down
  to nothing with no energy is a soft-lock.
- **Repair may not need to exist as a third mechanic.** Under factory-plus-placement, replacing a
  destroyed part is already priced: metal to make it, energy to fit it. What is *not* covered is a
  part that survived damaged — components carry `hp` and now `maxHp`, so topping one up is a real
  and distinct verb. Recommendation: repair restores hp on surviving parts and costs energy only;
  replacement is the factory loop and costs metal and energy. Two verbs, two prices, no overlap —
  rather than a repair system that duplicates the factory.
- **Every economy component is a slot not spent on a gun, and the ship is already too small.**
  The ceiling measured above is 20 parts against a 29-part boss. Adding a factory, a generator
  and a battery spends three of those twenty before a shot is fired, so the economy makes the
  boss problem worse before it makes it better. The factory pays back — one slot returns about
  six parts over a full run, so it is a clear buy on jump 1 and a clear loss on jump 5, which is
  a real decision curve. The generator and battery only *enable* spending, so their payback is
  indirect and they are the ones most likely to be a trap. Worth measuring before drawing them.

**Hard missions and artifacts.**

- **Rescue is not a hard mission. It is the easiest node in the game.** `ENCOUNTER_RULES` gives
  `race`, `debris` and `rescue` `battle: false`, and `runEncounter` returns
  `{verdict: "win"}` for any node that is not a battle. All three are a click that pays 35–50.
  Attaching artifacts to "hard missions" is the right instinct, but the difficulty has to be
  built before the reward means anything — otherwise it is a free artifact per run.
- **INFILTRATE already advertises an artifact roll it does not do.** `NODE_KINDS.infiltrate.r2`
  is `"+ artifact roll"` and `encounterSpoils` gives it the same price-weighted salvage roll as a
  DUEL. Same promise-with-no-implementation pattern as the shop, in the same module.
- **A run node minting artifacts bypasses every anti-farm rule the artifact design has.** The
  ladder design (§ Progression) is deliberately attack-side, with four rules — no repeat attack
  inside 24h, a strength threshold on the target, a combinatorial-richness threshold on the source
  island, and uniform indexed sampling — precisely so a shape cannot be farmed. An encounter is a
  pure function of `(camp.seed, node.id)`, which is exactly what makes a good seed replayable.
  Two ways out: run-minted artifacts live and die inside the run, contributing to that run's power
  curve and never entering the persistent inventory; or a run-minted artifact carries a proof of
  the run and is subject to the same thresholds. The first is much cheaper and is probably right
  for a single-player curve.

**Hyperdrive is the jump component and it is currently inert.** `TYPES.Hyperdrive` is 14 tiles,
hp 200, one `in` port, recovered from the real prefab and confirmed against the sprite to within
0.1 of a tile — and there is **no `case "Hyperdrive"` in the component tick**. It does nothing, in
the largest footprint in the game, in 57 corpus ships. If the jump costs energy, this is the part
that spends it, and that is the one economy component that does not have to be invented or drawn.
It also gives the map turn a component to argue about: 14 cells is an enormous commitment, so a
cheaper jump has to be worth it.

#### Against the 2026-08-19 guard

The older sketch below fixed one currency, no market, no price differences between nodes,
because a market is the time sink that was rejected with the galaxy map. Two resources is a
departure and should be argued for, not assumed: it is defensible only while metal and energy
cannot be traded for each other and no node prices anything differently from another. The moment
either is true, this is the market that was rejected.

### Shop and economy — sketch 2026-08-19 (Tom), the spend point still does not exist

Superseded in part by the section above. Its opening sentence is now wrong: currency and
inventory both exist (`newCampaign`, `applySpoils`, `refitCheck`). What does not exist is the
spend point it was written about — see the audit above.

No currency, no inventory and no between-node persistence exist today. Guard, from the same
conversation that rejected the galaxy map: one currency, no buy-low-sell-high, no price differences
between nodes. A shop is a spend point, not a market — the moment it becomes a market it is the
time sink that was rejected.

- [ ] **Sell composites — pre-wired sub-assemblies.** `LazerHardpoint` already reads
      bearing -> angle, dist -> fire as one unit. Bought as a part it hands a new player working
      automation they did not wire, and opening it up is how they learn the wiring layer. This is
      the entry-toll problem (see From the Depths, `plan/corepox-design.md` comparables) solved by
      the economy instead of by a tutorial, and it gives the composite mechanic a job in the run —
      it is currently 24.6% corpus adoption with only 7 examples and no purpose beyond atproto
- [ ] ~~**A Brain is budget, not a gun**~~ — struck 2026-08-20, same caveat
- [ ] **A purchase can be unusable until the ship is re-laid-out** — hull space has to be found. Elsewhere a shop purchase is a stat increase; here it is a spatial
      problem handed to the editor, which is where the game is
- [ ] **Loot the ship you killed** — a duel drops one of that corpus ship's actual components.
      Makes 892 anonymous opponents individual and ties acquisition to the encounter
- [ ] **Escalating prices within a visit**, from Build & Battle: each purchase makes the remaining
      options dearer this round, one may be banked for later. Commitment without a class system —
      the run's playstyle is discovered rather than chosen, which is the point if playstyles are
- [ ] **Sell back at a loss.** Corepox builds are spatial, so a player who has built into a corner
      cannot otherwise pivot. Untested whether this makes commitment meaningless
- [ ] Repairs are the second sink (see the damage-economy ideas above). The intended tension is
      repair now against a new gun; unverified that the numbers can be made to bite

### atproto: the match result is a proof, not a claim — design 2026-08-20 (Tom), nothing built

Raised as "users write ship designs into their PDS, but what else, and how does it last?" The
storage half is the boring half. **Nothing here is built.**

The load-bearing observation: Corepox already requires that matches re-simulate identically —
that requirement is why GPU particle simulation was ruled out for the renderer. That constraint,
which looked like a cost, is exactly what removes the need for a trusted server. A match is fully
determined by `(shipA@cid, shipB@cid, seed, engine, ruleset)`, so **anyone can recompute it**.

- [ ] Results are **cached computations, not reports**. Disputes resolve by re-running, not by
      appeal to an authority. Publishing a false result is *detectable*, so an app view can score
      publishers by how often their results verify — spam defence with no moderation.
- [ ] The ladder is a **pure function of the firehose**. Independent app views agree because they
      recompute the same deterministic thing.
- [ ] **The opponent need not participate.** A win is publishable and checkable without the loser
      being online, which deletes async matchmaking as a server problem.
- [ ] **Pin the engine by CID.** lopecode is already content-addressed, so the rules of a match are
      themselves a content-addressed module and a result stays verifiable after the engine moves on.
      This also gives seasons: a season *is* an engine CID plus constants, so changing one number
      re-ranks the entire existing corpus by re-simulation, with no player action. Content from a
      config change.

Record types beyond `ship`: `block` (a citable subassembly — `module-selection` applied to
circuits), `challenge` (names the opponent at a CID so it cannot be hot-swapped), `result`,
`season`, `bounty` (objective function public, solutions checkable, winning circuits readable).

**Limits, stated where they bite:**

- **No secrets, ever.** A PDS record is public, so there is no fog of war on designs. Commit-reveal
  buys blind tournaments; the default genre is chess, not poker. Decide deliberately.
- **Sybil resistance comes from computation, not identity.** Anyone can publish infinite ships for
  free. What is scarce is a verified win against a pinned opponent, because it cannot be faked, so
  rank on verified results and never on publishing volume.
- **You cannot gate anything on a PDS** — there is no server to refuse a write. Progression is
  *validated*, not withheld: entitlement is a fold over public history that anyone can recompute,
  and ranked/creative are two app views over the same records. Creative validates nothing, so
  sharing and copying stay unrestricted; only the ranked view enforces possession.

### Progression: artifacts and assembly levelling — design 2026-08-20 (Tom), nothing built

The atproto integration was raised as "users write ship designs into their PDS, but what else?"
This is the answer to the progression half. **Nothing here is built.** The corpus numbers are
measured and dated; the mechanics are not.

**Two ideas were raised and dropped the same day**, recorded so they are not re-proposed:

- **Budget-tier leagues** (6/12/20/40 components as parallel ladders). Dropped — Tom: *"That will
  not scale very far to have 4 leagues."* It fragments a player base that does not exist yet and
  has a fixed ceiling.
- **A component-type tech tree** (unlock Radar, then Binary, then Hyperdrive). Dropped because a
  locked component type is a locked *idea*, and the idea is the entire content of this game.
  Levelling replaces it: **capability is never gated, only power is.** A new player can express
  any design they can imagine, and copying a veteran's circuit works — you get the folk version.

#### What already exists, so this is not from nothing

- A `Composite` carries its whole sub-ship inline in `param` and is expanded at load, translated
  and rotated by placement (`corepox-engine.js:322-347`). Artifacts are therefore already
  self-contained and already travel inside the ship record.
- `composites.json` shipped **seven named fixed shapes** — Braitenberg 1 (5 components), Weapon
  Station (13), Mini Drone (4), Lazer Turret Hardpoint (10), Devouring Love (11), Unfinished Orb
  Drone (9). A seed roster.
- `server/match.ts` transferred captured composites into the winner's inventory. **Capture-on-win
  already existed in the original.**
- `knowledge/corepox-extracted-design.md:148` already reached this conclusion from the source:
  Composite is *"a subroutine system and a unit of reward and a tutorial device"*.

#### The mechanic

- [ ] An **artifact** is a frozen connected subgraph of a ship, minimum 4 components, with a rigid
      shape that cannot be edited. Every member gets **+20% on its one natural stat** — Lazer
      damage, Engine thrust, Armour hp. There is no roll over which stat: each type has one.
- [ ] **The level belongs to the assembly, not the component.** An Engine does not gain
      experience; the assembly was tuned in combat, and +20% is what tuning is worth. This is what
      makes salvage coherent (below) and removes a whole levelled-loose-parts inventory class.
- [ ] **Levels are integers, applied as `stat * (5 + level) / 5`.** L1 = 6/5, L2 = 7/5. Not floats:
      `1.2` is not exactly representable in binary floating point and compounding `1.2^2` drifts
      across platforms, which breaks cross-client verification. Same risk class as the `Math.sin`
      flag below, and cheap to get right now.
- [ ] **Re-looting a shape you already hold levels it rather than duplicating it.** Double-levelled
      is extremely rare (Tom). This doubles as the anti-farm mechanic: farming your ideal block
      yields one artifact creeping up a steepening curve, never a stack.
- [ ] **Salvage destroys the tuning** and returns base components. Keeps the choice sharp — rigid
      and strong, or flexible and ordinary — and guarantees no drop is worthless, which matters
      because most drops are junk by design.
- [ ] **Capture on defeat**, as the original did. Artifacts circulate rather than accumulate, so the
      ladder does not stratify and holding is ongoing work.

Why the +20% is modest and must stay so: if a levelled ship beats a better-designed one, the
open-information metagame stops working, because reading the winning circuit no longer tells you
how to beat it. Unverified — needs the intransitivity result below to even be meaningful.

#### Minting is attack-side

Defence-side minting was proposed (you cannot farm what you did not choose) and **rejected** —
Tom: *"its more fun attacking to get loot, that encourages engagement."* Waiting to be attacked is
passive. So opponent selection is back, and three rules replace it:

- [ ] **No repeat attack on the same ship inside 24 hours.**
- [ ] **Only opponents over a strength/history threshold can drop.** Beating a ship with no record
      mints nothing, which kills the sockpuppet-feeder — the puppet must first be credible, which
      costs real wins.
- [ ] **The source island must be combinatorially rich.** An artifact may only come from a connected
      island with at least T possible connected 4-subgraphs. This is the rule that defeats the
      multi-part exploit: a ship built as five separate 4-component islands has exactly one
      combination per island, every island fails the threshold, and it mints nothing.
- [ ] **Sample uniformly over the enumerated combinations**, indexed by `hash(result CID) mod C` —
      not by growing from a random seed component, which biases toward high-degree components and
      *is* shapeable by a farmer. Uniform indexing is deterministic, verifiable by anyone
      re-simulating, and unbiasable.

A bit of farming is acceptable (Tom). The threshold sets how much, in units: if the sample is
uniform over C combinations, hitting one *chosen* shape is `1/C`, so expected **wins** to pin a
chosen shape is `D x C` where D is one-drop-in-D-wins. D and C multiply, so a rare drop already
carries most of the rate limiting and C only has to be large enough that the *shape* is not yours
to choose.

#### Measured: how pinnable is a sample? (2026-08-20)

`bun tools/corepox-artifact-entropy.ts 4` — counts connected 4-subgraphs per island over all 892
corpus ships, using the engine's own reach-2 adjacency via `Ship.islands`, not a reimplementation.

```
k = 4   ships 892   islands 1048   multi-island 137/892 (15%)

connected 4-subgraphs in a ship's best island
   min 0   p25 25   median 150   p75 722   p90 2237   max 8228

ships with at least one PINNABLE island (1-3 combinations):  50/892 (6%)

could mint at threshold T:
   T >=  10    753/892 (84%)      T >=  50    594/892 (67%)
   T >=  25    672/892 (75%)      T >= 100    524/892 (59%)
```

**The exploit shape already exists in the corpus.** 6% of published ships have an island with only
1-3 possible 4-combinations, built by players who were not trying to farm anything. So the
threshold is not hypothetical protection.

**Recommended T = 10 to 25.** It excludes every pinnable island while leaving 84-75% of real
designs able to mint, which keeps the bottom of the ladder able to participate. Pushing T to 100
mostly excludes ordinary players without buying much, because D is doing the rate limiting.
Enumeration cost is bounded — the worst island in the whole corpus has 8228 combinations.

#### On atproto

- [ ] A ship record holds its design **inline**. Measured 2026-08-20: median 1366 bytes, p90 3183,
      max 5183, whole 892-ship corpus 1.4 MB. No blobs and no CID dedup, unlike
      `com.lopecode.bundle` (median block 7 KB, ~75 uploads per notebook, `specs/atproto.md`). The
      complete design travels on the firehose.
- [ ] **The mint must be a pure function of the replay** — drop/no-drop, which subgraph, which
      level — all seeded from `hash(result CID)`. Then loot is verifiable by re-simulation and
      cannot be forged, and the sampler must live inside the pinned engine, not in a client.
- [ ] **The shape is public, the instance is scarce.** Anyone can read your artifact and hand-build
      the same shape; it works, at base stats. Only an instance with a provenance chain back to a
      verified mint carries the +20%. Copying stays legal, so the knowledge economy and the loot
      economy do not fight.

#### What is unverified, and what it would cost

- **Per-instance stats are the real work item.** `TYPES` is a flat per-type table today
  (`corepox-engine.js:110-133`) — every Lazer in the game is `{hp, pwr, tiles, ins, outs}` and
  identical to every other. Levelling makes stats per-instance, which touches the whole simulation.
  The loot bookkeeping is the easy half.
- **Cross-platform determinism is assumed, not verified.** `Math.sin` is not bit-identical across
  JS engines. Everything above — verifiable results, verifiable loot, a serverless ladder — rests
  on it. The original used trig lookup tables; whether the rebuild does is not checked here.
- **One rule still undecided:** does a partially destroyed artifact still grant its bonus?
  Per-surviving-part is the safe default. All-or-nothing keyed to a core cell is more interesting,
  because the artifact is public and opponents can target the keystone, but it risks making
  artifacts not worth building around. Ship per-part, try keystone as a season rule.
- **A prior negative result bears on this.** The composite-as-tutorial device already shipped —
  Braitenberg 1 was handed to players precisely to teach sensor to actuator wiring — and it did not
  work. Across 492 real designs Binary appears once per fifteen components and Radar once per
  seventeen; players still built `Constant -> Engine` bricks
  (`knowledge/corepox-extracted-design.md:517`). **Artifact-as-loot is untested. Artifact-as-teaching
  has already failed once**, and leaning on it to solve onboarding would repeat that experiment.

#### Measured: is there a metagame at all? (2026-08-20) — NEGATIVE RESULT

This was the check that gates everything above. A transitive tournament has one strictly best ship
and a ladder collapses to "who has the strongest hull"; a metagame needs cycles (A beats B beats C
beats A). Reference points: fully transitive = 0% cyclic triads, coin-flip random = 25%.

`bun tools/corepox-intransitivity.ts 32 2` — 32 corpus ships spread evenly through the 502
that have >=6 parts and >=3 wires, every pair played 2 seeds x **both orientations** so a side
advantage cannot manufacture a cycle. Decisive means a win fraction outside 0.5 +/- 0.1.

```
1984 matches in 1203.6s  (606.7 ms/match)
side-A win rate across all matches: 49.3%   (50% = no positional bias)

decisive pairs        299/496 (60%)
fully decisive triads 1376
CYCLIC triads         19 (1.4%)          transitive = 0%,  random = 25%
ships beaten by nobody: 2      top win rate 79%,  bottom 2%
```

**1.4% against a 25% random baseline. The corpus matchup graph is very nearly a strict power
ordering.** Ship strength is close to a scalar, and as things stand there is almost no
rock-paper-scissors for counter-design to work with.

The harness is not the explanation: side-A wins 49.3%, so there is no positional bias. And the
thin sampling argues the same way — 4 matches per pair means noise, and noise *creates* spurious
cycles rather than hiding real ones, so 1.4% reads as an upper bound.

**What it does not say.** These are legacy designs from the original game, played on the rebuilt
engine whose constants are partly invented (see the `Ship.SUPPLY` caveat above). It measures the
rebuild's balance over old ships, not a designed metagame.

**What it changes.** Intransitivity has to be *engineered*; it cannot be assumed to emerge from
ship-vs-ship balance. The cheapest source is not balance tuning at all — it is **varying the
objective**. A ship optimised to duel is bad at escort, bad at a race, bad at mining under a
timer. That makes the encounter verb roster picked on 2026-08-19 the primary source of a
metagame rather than flavour, and the same is true of the environmental modifiers. Before any
ladder or economy is built on top, re-run this measurement *per verb* and check whether the
ordering actually differs between them. If it does not, the ladder collapses whatever the loot
system does.

**Second finding, on feasibility.** At 607 ms/match a full 892-ship round-robin is 397,386 pairs =
**~67 core-hours**. A client-side app view cannot re-simulate the whole ladder per season. Either
the engine gets much faster, the ladder samples rather than exhausts, or it needs an indexer of
the Contrail kind (`specs/atproto.md`).
