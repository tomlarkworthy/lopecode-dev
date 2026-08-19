# Corepox rebuild — plan

Status: draft, 2026-08-18. Rebuilding Corepox as a lopecode notebook. **Not a port.** The original
(2016–2020 Unity, `vendor/corepox`) is a source of mechanisms, not of code or balance — see
`knowledge/corepox-extracted-design.md` for what was recovered and what was not.

Target: SVG throughout, no canvas. Single-player arc first, atproto multiplayer second.

## Why not a port

Three independent reasons, in increasing order of weight.

1. **The code doesn't transfer.** Unity C# against `Rigidbody2D`, `FixedUpdate` and prefab-authored
   stats. The game logic is only 3,526 lines but almost none of it is portable text.
2. **The balance numbers are gone.** 11 of 14 component prefabs are Unity binary-serialised, so
   `maxHp`, occupancy and connector offsets are unreadable without opening the project. The two
   readable ones already disagree with the shipped ship corpus (`Brain.prefab maxHp: 20` vs
   `"hp":50` on all 480 corpus Brains).
3. **The corpus says the game wasn't being played as designed.** This is the one that should drive
   the redesign.

### What 492 real ships say

Counted from `firebase/data/ships_snapshot.json`, 2026-08-18 — 492 ships, 4,593 components:

```
Engine 1183   Constant 889   Lazer 713   Brain 480   Binary 300
Explosive 284 Radar 277      LaserTurret2 213        Composite 125   Orb 108
```

Read as ships rather than parts: **Binary logic appears roughly once per 15 components and Radar
once per 17.** Meanwhile Constant — a component whose entire function is to emit a fixed number —
is the second most common thing in the game, at 889 instances. The dominant design was *brick,
engine, laser, constant-on*. Players overwhelmingly built ships that do not compute anything.

That is the design failure. The interesting mechanic was optional, and a dumb always-on ship was
competitive enough that most players never engaged with the programming. Any rebuild that does not
change this incentive will reproduce the same outcome.

**Design response (proposed, not settled):** make always-on strictly dominated. Candidates —
ammunition or heat that punishes firing at nothing; targets that only die to a held firing solution;
opponents that evade in a way a constant-thrust ship cannot answer. The spike (below) accidentally
produced evidence for the third.

## What the spike established

`scratch/corepox-spike.html` — a self-contained SVG prototype: rigid-body physics, dataflow
evaluation, Radar/Binary/Constant/Engine/Lazer/Armour, one seeker design, one target.
Measured in headless Chromium via `tools/corepox-spike-measure.mjs`, 2026-08-18.

### SVG is not the risk

```
n=  1  ships=  2  nodes=  20  fps=120  sim=0.03ms  dom=0.03ms
n=  8  ships= 16  nodes= 153  fps=120  sim=0.08ms  dom=0.05ms
n= 24  ships= 48  nodes= 457  fps=120  sim=0.13ms  dom=0.10ms
n= 60  ships=120  nodes=1141  fps=120  sim=0.34ms  dom=0.15ms
```

120 ships and 1,141 live SVG nodes cost **0.15 ms of DOM work per frame** and never left the 120 fps
cap. One `<rect>` per component with a per-ship `transform` is affordable at any scale this game will
reach. The canvas question is closed; SVG wins on hit-testing, CSS theming, accessibility and
export-to-static, and costs nothing measurable here.

**Limit:** measured with `transform` updates only, and beams rebuilt each frame via `innerHTML`. Not
yet measured with per-component damage states, particle effects, or 60 ships each shedding fragments.
Re-measure before assuming headroom for those.

### The seeker pilots

The test ship is a real Corepox program — Radar bearing → two comparator gates → differential thrust —
not a hard-coded steering function. Traced with `tools/corepox-spike-trace.mjs`:

```
t     head    bearing  engL  engR   dist   speed   omega
0.5   82.69  -165.84   0.00 100.00  41.07   1.15  -10.56
2.0   31.59  -118.65   0.00 100.00  45.77   1.61  -15.40
4.0  -42.85   -52.65   0.00 100.00  46.98   1.61  -15.54
5.5  -99.10    -0.14   0.00 100.00  42.77   1.61  -15.54
6.0  -96.63    -2.52   0.00 100.00  40.85   1.63   +9.97   <- overshoot, reverses
```

Bearing drives monotonically to zero, then the controller reverses. Over 20 s the seeker closed
`47.4 → 0.94` and stripped a target Armour `150 → 30`.

**Two bugs found, both mine, both worth recording** because they are exactly the class of error
`knowledge/corepox-extracted-design.md` predicted:

- Rotation sign. `worldOf()` used `+ly*s / -ly*k` where the SVG `rotate()` in the renderer implies
  `-ly*s / +ly*k`. Physics and rendering disagreed, so radar bearings were computed against mirrored
  positions. Symptom was `closed=-44%` — the ship confidently flying away.
- Comparator wired to the wrong port, so both turn gates fired on `bearing > 0`.

Neither was visible from the rendering. Both were found by tracing the control loop, which is an
argument for building the engine with a trace-out from the start.

### The stalemate

After closing to `dist < 1` the seeker overshoots, orbits, and **stops doing damage** — target HP
freezes at `30` from t=15 s to t=25 s. A bang-bang controller can close but cannot hold a firing
solution.

This is a genuine finding about the original design, not an artifact of my test ship. `Engine` takes
an analog input (`clamp(in,0,100)/100`), so proportional control is expressible — but nothing in the
game *teaches* it, and `Constant` → `Engine` is the path of least resistance. The corpus shows which
one players took.

**This is the strongest argument for Composite as the core teaching device**: ship the player a
working proportional-steering composite as a reward, so they see damped control working before they
have to build it. Reward and tutorial in one mechanic, which is the property the user identified.

## Architecture

Separate lopecode modules, so the heavy asset payload is not on the boot path.

| module | contents | why separate |
|---|---|---|
| `@tomlarkworthy/corepox-assets` | SVG symbol defs for every component, ship chrome, UI glyphs | Largest payload. Lazy-loaded so the shell paints before art arrives; see `feedback_dormant_module_blocks_need_lazy_boot` |

| `@tomlarkworthy/corepox-engine` | physics, dataflow evaluation, damage, fragmentation. No DOM | Headless-testable via `tools/notebook-import.ts`; reused by the ladder verifier |
| `@tomlarkworthy/corepox-render` | engine state → SVG | Swappable; keeps the engine DOM-free |
| `@tomlarkworthy/corepox-designer` | ship component designer — place, rotate, wire | The main authoring surface |
| `@tomlarkworthy/corepox-levels` | level/encounter designer | Content authoring, not needed at play time |
| `@tomlarkworthy/corepox` | game shell, campaign, progression | The `main` |
| `@tomlarkworthy/corepox-atproto` | publish/fetch ships, ladder | Phase 2; builds on `at-write` / `at-read` |

Boot order matters: a big data main delays the mount (`feedback_a_big_data_main_delays_the_mount`),
and module blocks must precede user blocks in the HTML
(`feedback_boot_blocks_must_precede_userblocks`).

### Art is a port, not a redraw

Corrected 2026-08-18: the original art was **drawn as vectors in Sketch and rasterized on the way
into Unity**. The Sketch sources survive (main repo history at `943e501^`, and the separate
`corepox_art` repo), and `tools/sketch2svg.py` already converts the 20-symbol component set to SVG —
39 KB for the lot, verified by render. So the original look ports directly and stays vector this
time, which is the outcome the rasterization step originally prevented.

`corepox-assets` therefore ships **converted originals**, not new drawings. Remaining converter work
— `symbolInstance` nesting, `text`, gradient fills, and fill/stroke inheritance through
`shapeGroup` — is listed in `knowledge/corepox-extracted-design.md`. `UI.sketch` and the two `art/`
documents in `corepox_art` are unexamined and may cover the designer and menu surfaces too.

**Open:** whether `corepox-engine` should be the spike code promoted, or rewritten. The spike is
~330 lines and already carries the corrected angle convention and a topological evaluator. Leaning
promote-and-extend.

## Design decisions to settle

Listed with the alternative, because none of these are forced.

1. **Spatial ports vs named ports.** The original addressed connections by grid coordinate
   (`InputConnector.shipCoord()`), which forces multi-input components to occupy several tiles and
   makes wiring a layout puzzle. The spike used named ports for speed. Spatial is the more
   interesting game and the more expensive UI. *Leaning spatial* — it is the thing that makes
   damage-breaks-links bite.
2. **Evaluation order.** Original had none (Unity scheduler). Spike topologically sorts and breaks
   cycles with last-tick values, so combinational logic settles within one tick. Alternative is a
   one-tick delay per hop, which is more "circuit-like" and makes deep logic sluggish.
   *Settled: topological*, unless playtesting says the delay is fun.
3. **Mass model.** Original charged `0.1` per *component* but scored `weight()` per *tile*, so a
   12-tile turret massed the same as a 1-tile Constant. Spike uses per-component. *Proposed:
   per-tile* for both, which is coherent and makes big weapons feel heavy.
4. **Progression.** The original transfers captured composites between players
   (`micro-services/src/server/match.ts`). Atproto cannot express that (single-writer repos, no
   cross-repo atomic transfer, self-signed claims worth nothing). *Proposed:* salvage derived from
   your own verified match history; a defeated opponent's composite becomes *readable* to you, not
   *removed* from them. Non-rival rewards, which suits a public-repo network anyway.
5. **What replaces always-on dominance.** Unsettled; see above.

## Milestones

**Phase 1 — single player, no network.**

1. `corepox-engine` as a notebook module, headless-testable, with a trace-out. Validate by replaying
   the 492-ship corpus and checking nothing throws and mass/CoM/fragmentation are sane.
2. `corepox-assets` + `corepox-render`: the spike's rectangles become real SVG components.
3. `corepox-designer`: place, rotate, wire, run. This is the game; everything before it is plumbing.
4. Campaign + the composite reward loop. Ship a proportional-steering composite as an early reward.

**Phase 2 — atproto.** Ship record as `com.corepox.ship`, engine version pinned, parent strongRef
for lineage. Ladder as a derived index that re-simulates rather than trusting self-reported results.
Seed the ladder with the 492 recovered designs.

Phase 2 details are in the earlier analysis and are deliberately not expanded here — the single-
player game has to be fun first, and the corpus says that is the unsolved problem.

## Not doing

- Bit-reproducibility. Explicitly dropped by the user, 2026-08-18. Verification for the ladder needs
  *behavioural* agreement, not identical bytes — revisit only if ladder disputes actually appear.
- FMOD audio, Google Play services, ads, the Firebase matchmaker.
- Recovering exact original stats. Not possible without Unity, and not wanted.
