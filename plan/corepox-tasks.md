# Corepox — working task list

Updated 2026-08-20. Ticked only when verified, not when written.

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
- [ ] **Connectivity runs on distance, not joints — the binding mechanic is lost.** Tom,
      2026-08-20: "the game mechanic is components bind together via joints (which are not
      currently visualized). This mechanic seems to have been lost." Confirmed:
      `Ship.islands()` walks `NEIGHBOURS` (reach-2 tile distance) and the recovered `JOINTS`
      table is read by **nothing but** `corepox-components`, the table editor. Nothing in the
      simulation or the renderer touches it (`grep JOINTS modules/@tomlarkworthy/*.js`).
      What that costs: severing is a function of distance, so destroying ONE component never
      cuts a ship — reach 2 spans the hole — and a cut needs two adjacent cells gone. Measured
      with `tools/corepox-split-probe.ts` (a 6-tile bar: one hole → 1 island, two → 2 bodies)
      and over combat: 3 of 20 matches between single-island corpus designs produce a split.
      The split machinery itself is fine — `splitDetached`/`detach` do become independent
      bodies — so this is a connectivity-rule problem, not a physics one.
      **It is not a drop-in switch.** `tools/corepox-joint-connectivity.ts` scores the recovered
      table at 26-30% of the 892 corpus ships forming one piece, against reach-2's 70%, and it
      reports `LaserTurret2: FAILED` alignment and was written against the old art frame. So
      either the table or the frame is still wrong; wiring it in today would shatter most saved
      ships at t=0. Next step is to DRAW the joints (they are unvisualized, and the drawing is
      the instrument for finding which ones are misplaced), not to switch the rule.
- [ ] **A cut ship in level flight keeps formation.** `Ship.detach` gives the fragment
      `f.vx,f.vy = parent.velAt(piece)` and `f.w = parent.w`, so with no spin both pieces carry
      identical velocity forever: measured +0.000 tiles of separation in 3s, against +1.000 at
      rest (collision push) and +0.477 spinning. Whether the original applied a separation
      impulse is not recorded.
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
- [ ] `buildOnce: 1` is not modelled. FollowBoss is the only mission that sets it: the scene means
      you to get one build phase, and the port lets you rebuild between attempts.
- [ ] The build path cannot place a **relic**. FollowCourse and FollowCourseAdvanced both offer one
      in the inventory (a `PPtr` to a scene composite), and `commitBuild` takes a bare type name,
      so only the Brain is offered. Placing a relic means placing a `Composite` with its `param`.
- [ ] **Two campaigns, not one flat list.** The port shows 12 missions in one dropdown. The shipped
      game groups them: `tutorial` (7) and `Advanced Steering` (3), each with a `displayName` and a
      `minPlayerRating` gate that has not been read.
- [ ] `SideShooter` and `TwinTurrets` are in NO campaign and not in the 1.49 scene list. The port
      ships them as missions 11 and 12. Either mark them as an addition or drop them; right now the
      port silently presents them as recovered content.
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
- [ ] Orb damage radius disagrees with the shipped collider: engine says 1.2 tiles, the weapon's
      `CircleCollider2D` works out at 0.567. The 1.2 came from Tom, the 0.567 is measured.
- [x] Persist: sync modules to `corepox.html`, verify boot. corepox-missions + corepox-game
      inserted, canonical, in bootconf mains, spec minted, sitemap updated. Boots with 0 console
      errors; mission 1 completes through the DOM (corepox-qa-play.mjs); Aim runs 17.9s of sim in
      20s wall (corepox-qa-aim.mjs). lopebooks@2949e16f

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
- [ ] `corepox-designer` — place / rotate / wire
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
- [x] Connectivity resolved: reach-2 IS the physical model (connector stalks meet in the gap cell).
      Joints are NOT the gap (4-way is their ceiling and fails), footprints are NOT the gap
      (best sweep 33% costs 48% overlap). Engine dominates the residual bridging pairs
- [x] Engine 2x1 (nozzle behind), Lazer 3x1 (barrel forward) — earlier 1x1 call was a world-space
      vs local-space measurement bug. multi-island 22% -> 17%
- [x] Joints recovered off the SVG art (tools/corepox-joints-from-art.py). Engine came out as
      N[0,1] E[0] W[0] = exactly the "4 on top and top/left/right" Tom described from memory
- [~] **RETIRED: wire JOINTS into powerUp/islands.** It contradicts the entry above it. Re-measured
      2026-08-19 after the frame landing: joint stalks meeting in the gap cell leave 7/838 ships
      (1%) in one piece and plain joint adjacency 235/838 (28%), against reach-2's 84%. Doing this
      would take connectivity from 84% to 32%. `tools/corepox-joint-connectivity.ts`
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
- [ ] **Wiring becomes automation, not a prerequisite.** If the player has hands, a wire must buy
      something hands cannot do at the same time (point defence while dodging, a range gate while
      turning). Undesigned. Falsifiable early: if a wire only replicates a key press, it is a chore.
- [ ] Architecture sketch, untried: the player is another source node — a `Pilot` component whose
      output ports are driven by input instead of by upstream wires. Enemy ships stay wired ships,
      one simulation, and headless tools substitute a scripted pilot.

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

Two things worth deciding before any of the above, because they set the shape:
- Is build-during-play staying? `editable()` (`:571`) says yes, and it is why the editor and the pilot
  compete for the same gestures at the same time. If building were modal the conflict mostly vanishes.
- Does the pilot keep the drag? Waypoint-and-heading is one gesture doing two jobs; a tap for the
  waypoint and a separate control for facing would give the drag back to the camera.

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
- [ ] **Mining** — ore against a clock. No enemy, so it is where heat can be taught before it kills
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

### Shop and economy — sketch 2026-08-19 (Tom), nothing exists

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
