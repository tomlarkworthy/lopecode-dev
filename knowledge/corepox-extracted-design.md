# Corepox: what was recovered from the original source

Archaeology record, 2026-08-18. The original Corepox — an Android game where you wire up an
autonomous ship and it fights without you — is being rebuilt as a lopecode notebook. This file
records what could be read out of the 2016–2020 Unity source, what could **not**, and the findings
that change the rebuild. It is not a design for the new game; that is `plan/corepox.md`.

Source: `ssh://source.developers.google.com:2022/p/corepox-staging/r/corepox`, cloned to
`vendor/corepox` (untracked). 424 commits, `2016-03-06` to `db7f764 2020-06-10 "Stash:wq"`.

Everything below cites a file in that checkout. Paths are relative to
`vendor/corepox/Meritocracy/Assets/scripts/` unless stated.

## Getting it out at all

Four attempts failed before one worked, and the failures are worth recording because the remote is
[end-of-sale](https://docs.cloud.google.com/source-repositories/docs) and anyone re-fetching will
hit them again.

| attempt | result |
|---|---|
| `git clone` (SSH) | `Permission denied (publickey)` — key not registered at source.cloud.google.com |
| after registering key | `PERMISSION_DENIED … requires billing to be enabled on project #corepox-staging` |
| after enabling billing, clone into a sandboxed `/private/tmp` | downloaded all 2.79 GiB, then `fatal: could not open '…/tmp_pack_u7DgKb' for reading` |
| `git clone --depth 1` | `fatal: remote transport reported error` — **Gerrit/CSR does not support shallow fetch** |
| back-to-back retries | `Connection … closed by remote host` at handshake — server-side throttling |

What worked, and what anyone should use:

```bash
git clone --filter=blob:none --no-checkout ssh://…/corepox vendor/corepox   # 1.9 MB
cd vendor/corepox && git sparse-checkout set --no-cone \
  '/**/*.cs' '/**/*.ts' '/**/*.js' '/**/*.json' '/**/*.prefab' '/**/*.asset' '/**/*.unity'
git checkout                                                                # 29 MB on disk
```

Partial clone fetches commits and trees only; blobs arrive on demand. 2.79 GiB → 29 MB, and no
resumability problem to solve. The 2.8 GiB is deep history of binary art and audio.

**Unrelated but urgent:** three GCP service-account private keys are committed at
`firebase/accounts/{compute-admin,matchmaker-worker,corepox-dev-firebase-adminsdk-sv6at-*}.json`,
each containing a live `"private_key": "-----BEGIN …`. `corepox-dev` and `corepox-staging` are
still real projects. Revoke before this repo goes anywhere.

## Layout

```
Meritocracy/          Unity client. Game logic: 3,526 lines across scripts/game/
corepox_server/       headless Unity — Assets/* are SYMLINKS to the client's scripts
firebase/             3,291 lines TypeScript: matchmaker, ratings, leagues, tech tree
fmod/                 audio project
```

847 `.cs` files, but `find … | sed 's|/[^/]*$||' | sort | uniq -c` puts ~90% in vendored plugins
(2DxFX 151, YamlDotNet 128, FMOD, AdMob, a Twitter client). The game is `scripts/game/`, and
`wc -l` over it totals **3,526 lines**. Small enough to read completely, which is what happened.

The server sharing the client's scripts by symlink matters: there was exactly one simulation
implementation, run headless for match resolution. `firebase/data/sample_RunMatchRequest.json` is
its input format:

```json
{"ticks": 100, "ship_a": {…}, "ship_b": {…}, "match_type": "GlobalDeathMatch"}
```

## The ship is already a document

`loader/ShipSpec.cs:14-46` — the whole persisted form, and it is plain JSON:

```csharp
public struct ShipSpec {
    public String name;  public float hyperspeed;  public int hyperAngle;
    public float [] velocity;  public float angularVelocity;
    public ComponentSpec [] components;  public ConnectionSpec [] connections;
}
public struct ComponentSpec {
    public String type;  public int[] pos;  public string dir;  public string param;
    public OverrideSpec[] overrides;
}
public struct ConnectionSpec { public int[] from;  public int[] to; }
```

A real one, from `firebase/data/ships_sample.json`:

```json
{"components":[
   {"dir":"up","hp":50,"pos":[0,-1],"type":"Brain"},
   {"dir":"up","hp":95,"overrides":[{"name":"input","value":100}],"pos":[0,2],"type":"Lazer"},
   {"dir":"up","hp":50,"overrides":[{"name":"output","value":100}],"pos":[0,0],"type":"Constant"},
   {"dir":"up","hp":50,"overrides":[{"name":"input","value":100}],"pos":[0,-2],"type":"Engine"},
   {"dir":"up","hp":5,"pos":[0,1],"type":"Explosive"}],
 "connections":[{"from":[0,0],"to":[0,2]},{"from":[0,0],"to":[0,-2]}],
 "name":"Brain","velocity":[0,0]}
```

Small, human-readable, self-contained. This is the property the atproto plan depends on and it was
already true in 2016.

**Connections are addressed by grid coordinate, not by component + port name.**
`brain/InputConnector.cs:33` and `brain/OutputConnector.cs:31`:

```csharp
public Coord shipCoord() {
    return Coord.transform(componentParent.placement, this.coord);
}
```

Each connector carries a local `coord` offset; `Ship.cs:22-23` indexes
`Dictionary<Coord, OutputConnector> outputs` and `inputs` by the transformed ship coordinate. So a
multi-input component such as `Binary` must physically occupy more than one tile, one per port —
wiring is spatial, and port placement is a layout constraint, not a UI detail. **Not fully
verified**: the per-component connector offsets live in the prefabs, and those are binary (below),
so the exact tile each port sits on was not recovered.

## Two graphs over the same components

This is the structural finding, and it is what makes the game interesting.

1. **Physical adjacency.** Components occupy integer cells and join at 8-way joints
   (`game/Metrics.cs:316` `CoordDir8`). `Connectivity.cs:99-121` `disjointSets()` flood-fills the
   join graph; `Ship.cs:466` `maybeSplit()` calls it, so when a component dies the ship
   **physically fragments into independently-simulated islands**.
2. **Logical dataflow.** `connections[]` wires outputs to inputs across those same cells.

Destroying one component cuts both at once. You do not lose hit points, you lose *program
structure*, and the surviving fragment keeps running a mutilated program. The devlog phrase
"battle damage can break logical links causing your ship to malfunction in unexpected ways" is this
mechanism, and it is the thing worth keeping.

## Component catalogue

Behaviour is from `game/components/*.cs` and is reliable. **Stats are not** — see the next section.

| type | source | behaviour |
|---|---|---|
| Brain | — | critical; `Descriptions.cs`: "must be kept intact at all costs" |
| Constant | `ConstantFn.cs` | `param` = int → output |
| Binary | `BinaryFn.cs:44-79` | 2 in → 1 out. `PLUS MINUS DIVIDE TIMES LT GT EQ AND OR`. **`AND`=`Mathf.Min`, `OR`=`Mathf.Max`, `a/0`=`1`** |
| Radar | `RadarFn.cs:40-64` | outputs distance + relative bearing to nearest enemy; **`float.NaN` on both when no target** |
| Engine | `EngineFn.cs:12-27` | `f = clamp(in,0,100)/100`; also emits damage particles — exhaust hurts what is behind it |
| Lazer | `LaserFn.cs:4-27` | `RECHARGE_S=0.9`, `FIRE_S=0.1`, `dmg=5`, `length=100`, fires while `trigger > 0` |
| LaserTurret2 | `TurretFn.cs` | fire + angle inputs, occupies **12 tiles**, slews toward angle, clamped ±90° off ship axis |
| Explosive | `ExplosiveFn.cs:4-40` | `CHARGE_S=0.1` then self-destruct → `PARTICLES=32` radial, `DAMAGE=5`, `SPEED=2`, `TIME=3` |
| Orb / Melee | `MeleeFn.cs` | contact damage via collider; `Descriptions.cs`: "blocks incoming lazer fire" |
| Armour | — | `Armour.prefab` `maxHp: 100` |
| Composite | `ConstantFn`-style `param` | **`param` holds an entire embedded ship JSON** |

`Composite` is the standout and the user agrees it is the strongest mechanic: a named, nested
sub-assembly, which is a subroutine system *and* a unit of reward (`server/match.ts` transfers
captured composites into the winner's inventory) *and* a tutorial device (hand the player a working
sub-assembly instead of explaining it). 125 of 4,593 components in the corpus are Composites.

## What is NOT recoverable

`file -b --mime-encoding` over `prefabs/components/Resources/*.prefab`:

```
Armour.prefab      us-ascii   maxHp=100
Brain.prefab       us-ascii   maxHp=20
Binary.prefab      binary
Composite.prefab   binary     Constant, Engine, Explosive, Hyperdrive,
Radar.prefab       binary     LaserTurret2, Lazer, Orb — all binary
```

11 of 14 component prefabs are Unity **binary**-serialised, so `maxHp`, `hyperspeed`, occupancy
footprints and connector offsets are not extractable without opening the project in Unity.

Worse, the two readable ones disagree with the shipped data: `Brain.prefab` says `maxHp: 20`, and
every Brain in all 492 corpus ships carries `"hp":50`. One of those is stale and the source does not
say which.

**Consequence:** the balance numbers are gone. Combined with the user's own verdict — the game
"had many design flaws and bugs" and "was not that fun" — this removes the argument for a faithful
port. The recoverable asset is the *mechanism set*, not the tuning.

## The artwork is recoverable as vectors

The original art was drawn in Sketch and rasterized on the way into Unity — only the PNGs are in
`Meritocracy/Assets`. The vector sources survive in two places, and neither is at `HEAD` of the main
repo:

- **In history.** `943e501 "Removed art from this repo"` deleted `design.sketch` (80 MB),
  `patterns.sketch` (256 KB) and three Shutterstock `.eps`. Recover with
  `git show 943e501^:design.sketch > design.sketch`.
- **In a second repo**, `…/p/corepox-staging/r/corepox_art` (cloned to `vendor/corepox_art`), which
  is where they were moved to. It holds five Sketch documents — `design.sketch`, `patterns.sketch`,
  `UI.sketch`, `art/poster.sketch`, `art/serverless_visual_game_worlds.sketch` — plus 243 PNGs and
  8 Substance `.sbs`. **`UI.sketch` and the two `art/` files have not been examined yet.**

`design.sketch` is Sketch 45, which is the ZIP-of-JSON format, so the geometry is extractable
without owning Sketch. `meta.json` lists 13 pages; the one that matters is **Symbols**, with 20
artboards named for the components:

```
constant  binary  binary-2  engine  radar  brain  explosive  lazer
laser-beam  dmg-particle  input  output  tooth  connection-1-0
connection-2-0  connection-3-0  group  a4  enemy-panel  retry
```

`tools/sketch2svg.py` converts them: it walks `symbolMaster` → `shapeGroup` → `shapePath`, turning
Sketch's normalised `{x, y}` point strings and `curveFrom`/`curveTo` handles into SVG cubics.
Verified 2026-08-18 by rendering all 20 into `tools/screenshots/corepox-symbols.png` — every symbol
is recognisable, including the gold connector teeth ringing `brain` (the joint visual) and the
bezier wire with round endpoint nodes in `connection-*`.

```
$ python3 tools/sketch2svg.py design --page Symbols -o corepox-symbols.svg
wrote corepox-symbols.svg (38922 bytes, 20 symbols)
SKIPPED layer classes: ['symbolInstance', 'text']
```

Three things about the Sketch model had to be got right, and the first is the one that produces
garbage if missed:

1. **A `shapeGroup` is one shape, not a container of shapes.** Its children are subpaths that share
   the group's style. Emitting them as individually-styled shapes gives outlines where solids belong.
   They must be merged into a single `<path>`; `fill-rule="evenodd"` approximates the boolean ops.
2. **Point coordinates are normalised to the owning layer's frame**, so nesting needs a real affine
   applied to the points — subpaths inside one `<path>` cannot each carry an SVG `transform`.
3. **`symbolInstance` resolves by `symbolID`, not by name**, so the symbol table has to be built in a
   pass before emitting.

With those fixed (re-verified 2026-08-18, `tools/screenshots/corepox-symbols2.png`) nothing is
skipped, the 9 gradients emit as `<linearGradient>`/`<radialGradient>` defs, and `enemy-panel`
correctly nests the `brain` symbol via `<use>`.

**Still approximate:** angular gradients degrade to linear; `fill-rule="evenodd"` is not a real
boolean solver, so a subtract-heavy shape could fill wrongly; bitmap fills are skipped (8 in
`UI.sketch`) as is one `fillType 4` pattern fill. Shadows, blend modes and text alignment are
ignored. `a4` (882×462) and `group` (530×132) come out empty, which on inspection is because those
artboards are empty — not a converter failure.

### UI.sketch is the whole screen flow

`vendor/corepox_art/UI.sketch` → 13 artboards, 107 KB of SVG, 98 gradients:

```
main_screen:  artboard  settings  splash  artboard-2  artboard-3  artboard-4
Matchup:      matchup  matchup-2  victory  loss
Symbols:      brain  lazer
```

Rendered to `tools/screenshots/corepox-ui.png`. These are complete 720×1280 phone screens with live
text — the hangar with its ship roster and currency bar, a settings panel, a "EARLY ALPHA" splash, a
tutorial list reading `3/24` with entries like "aim learn how to control turrets", the VS matchup
screen, and VICTORY / DEFEEAT [sic] screens carrying league progress, a rewards strip with an
"Unlocked" row, a star rating and a "Watch Ad to Rematch" block.

So the UI is recoverable too. **Caveat, and it is load-bearing:** these are portrait mobile layouts
for a free-to-play game with ad gates and unlock counters. They are a source of *visual language*
and of *what screens the game needed* — not a layout to reproduce in a desktop notebook.

## The campaign, recovered from binary scenes

`Campaign.cs` holds `List<Mission> missions` as a serialised `MonoBehaviour` field, so the ordering
lives in a Unity scene, and **all 12 mission scenes plus the 4 enemy-ship scenes are binary** — same
wall as the prefabs. The object graph is gone.

But `MonoBehaviour` string fields survive verbatim in the binary, and that is where the author put
both the ship JSON and the on-screen prompts. `tools/corepox-extract-missions.py` runs `strings`
over each scene, brace-matches JSON blobs and filters prompt text; it recovered **79 ship specs and
51 prompts across 12 missions** into `scratch/corepox-missions.json` (2026-08-18).

Reconstructed order — inferred from difficulty and dependency, **not** read from the scene, since
that is exactly the part that was binary:

| # | mission | prompt | teaches |
|---|---|---|---|
| 1 | PlaceBrain | `pick core` → `place core` → `claim victory` | placing a component |
| 2 | ConnectionLite | `connect constant to engine` | the first wire |
| 3 | Connection | `adjust constant to affect engine` | that values matter |
| 4 | Cocoon | `protect core from mines` | armour / layout |
| 5 | Avoid | `get to jump zone` | Radar + Binary appear |
| 6 | FollowCourse | `Braitenberg 1` | sensor→motor cross-wiring |
| 7 | FollowCourseAdvanced | `destroy enemy core` | Orb Drone Chassis |
| 8 | FollowBoss | `destroy enemy core` | boss |
| 9 | Aim | `connect radar angle to turret angle` | the turret control loop |
| 10 | ManualAim | `adjust turret angle using constant` | open-loop vs closed-loop |
| 11 | TwinTurrets | `destroy enemy cores` | two independent loops |
| 12 | SideShooter | `defend your core` | free-form combat |

**The `FollowCourse` scene contains a Composite named `Brautenbourgs First`, and a prompt reading
`Braitenberg 1`.** Braitenberg vehicles are the canonical toy for teaching that crossing two
sensor→motor wires turns avoidance into pursuit. So the original design *already* used a pre-built
composite handed to the player as the device for teaching sensor→actuator wiring — which is
independent confirmation of the "composite as reward and tutorial in one" reading, arrived at from
the code rather than from the pitch.

Set against the corpus finding that Binary appears once per 15 components: the teaching existed and
players still ended up building `Constant → Engine` bricks. Whatever went wrong is downstream of the
tutorial, not a gap in it.

## Behavioural hazards in the original

Recorded because they are things to fix, not reproduce. All read from source; none re-run.

- **No defined evaluation order.** Every component reads its inputs in its own `FixedUpdate`
  (`BinaryFn.cs:44`, `EngineFn.cs:12`, `RadarFn.cs:40`). Unity's script execution order decides who
  runs first, so a signal crosses the graph in 1..N ticks depending on scheduler whim. A logic chain
  behaves differently run-to-run.
- **`ExplosiveFn.cs:22` uses `Time.deltaTime` inside `FixedUpdate`.** Mixing variable frame time into
  a fixed step: fuse timing varies with framerate. A bug, not a design choice.
- **Unseeded RNG** in `EngineFn.emitParticle` (`Random.value`) and `Misc.samplePoisson` (line 31).
- **`Misc.samplePoisson` looks wrong.** Line 39 accumulates `cfp += cfp * lambdaPowK / k`, which
  compounds the running total rather than adding the term `e^-λ λ^k / k!`. **Derived by reading, not
  tested** — but it means engine exhaust particle counts are not Poisson-distributed.
- **`NaN` is load-bearing.** Radar emits `NaN` with no target and `EngineFn`/`TurretFn` guard on
  `float.IsNaN`. Whatever the rebuild does, "no target" needs an explicit representation.

### The angle convention, which is where piloting breaks

Two conventions are in play and they cancel. **Derived by reading, not verified by running** — it
should be checked against the corpus once a simulator exists, because a sign error here is exactly
what stops a seeker ship closing on its target.

- `Misc.cs:89` — `SignedAngle(from,to) = Atan2(v.x, v.y)`, so **0° = +Y, positive = clockwise**.
  `Misc.angleDistance` (line 52) agrees: `(sin θ, cos θ)`.
- `Metrics.cs` `DirMethods.angle()` — `UP=0, RIGHT=90, DOWN=180, LEFT=270`, same convention.
- But components are rotated with `Quaternion.AngleAxis(placement.dir.angle(), Vector3.back)`
  (`ShipComponent.cs:124`) — about **−Z** — while `angle_deg()` (line 41) reads back
  `transform.eulerAngles[2]`, which is about **+Z**. So a component placed `RIGHT` reads back 270°,
  not 90°.
- `EngineFn.cs:20` then computes force as `(-sin θ, cos θ)`, whose sign on x is flipped relative to
  `angleDistance`.

The two inversions cancel: an Engine placed `RIGHT` thrusts `+X`. It is correct by accident, and any
rebuild that adopts one of the two conventions without the other gets ships that fly sideways.
`DirMethods.rotateClockwise` is a third wrinkle — it steps `UP→LEFT→DOWN→RIGHT`, which is
counter-clockwise by the `angle()` table.

Physics itself is thin: `Ship.cs:438` is the only force entry point —
`body.AddForceAtPosition(force, world_pos)` — with `ANGULAR_DRAG = 1`, `LINEAR_DRAG = 1`,
`MASS_SCALE = 0.1` (`Constants.cs`) and mass accumulated per component at `ShipComponent.cs:131`.

Note `Ship.cs:442` `weight()` returns `components.Keys.Count`, which is the number of occupied
**tiles**, while mass adds `0.1` per **component instance**. A 12-tile turret therefore scores as 12
weight but masses the same as a 1-tile Constant. Inconsistent; one of the "design flaws".

## The corpus is the most valuable artifact

```
firebase/data/ships_snapshot.json   492 ships,  4,593 components
firebase/data/ships_sample.json      50 ships,    399 components
firebase/data/ships.json             1.4 MB, not valid JSON (Firebase export, does not parse)
```

Counted 2026-08-18 with `json.load` + `collections.Counter` over `ships_snapshot.json`:

```
Engine 1183  Constant 889  Lazer 713  Brain 480  Binary 300
Explosive 284  Radar 277  LaserTurret2 213  Composite 125  Orb 108
```

492 designs by real players. That is a regression corpus for any new simulator, a difficulty ladder,
and — the reason it matters most — a **seed population**, so a relaunch does not open onto an empty
ladder. It is also evidence about what players actually built: Engines and Constants dominate,
Binary logic appears in fewer than one component in fifteen, and Radar in one in seventeen. Most
ships were not, in fact, doing much computation.

## The economy fights the atproto plan

`firebase/micro-services/src/server/match.ts:44-66` — on a win, `pickGains` awards items and
transfers the loser's **composites** into the winner's inventory. That is conserved-resource
progression with a central authority, which is precisely what single-writer atproto repos cannot
express: no cross-repo atomic transfer exists, and a self-signed "I captured your composite" record
is worth nothing.

Solvable — derive salvage from your own verified match history rather than moving it between repos —
but it is a design decision for `plan/corepox.md`, not a porting detail.

## Open questions

- Connector tile offsets per component type (blocked on binary prefabs).
- Whether `hp:50` or `maxHp:20` was the live Brain value.
- Whether the angle analysis above is right — needs a simulator and the corpus to check against.
- What `hyperspeed` / `Hyperdrive` actually did. `Ship.cs:448-465` computes the **minimum across
  islands of the maximum within each island**, which reads like "every fragment needs its own
  hyperdrive to escape", but no consumer of the value was read.
