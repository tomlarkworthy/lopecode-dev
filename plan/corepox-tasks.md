# Corepox — working task list

Updated 2026-08-19. Ticked only when verified, not when written.

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
      (+-1,-1) and they now sit at (+-2,-3), so the torque arms doubled. Draws 81-100%
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
