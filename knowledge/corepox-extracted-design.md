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

**Narrowed 2026-08-20.** Binary serialisation is not opaque for everything. A prefab's own object
ids are readable as raw int64s, which is enough to invert `PPtr` references pointing *at* it —
`tools/corepox-prefab-ids.py` uses that to decode every mission's `InventoryOverride` into component
names (see "Advanced Steering, ported"). The field *values* inside a binary prefab are still gone;
what is recoverable is identity, not tuning.

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

### The Sketch symbols are not what shipped (2026-08-19)

`design.sketch` is the *source* design. The APK carries the art that was actually built, and for at
least one component the two are different drawings, not two renderings of one drawing.

Tom, annotating `h_Radar` in the notebook: *"this was not the final design for radar. I think we
shipped something with a circle for the 2x2 top part. And range was indicated by a seperatly
animated dial."* The Sketch-derived trace is a stack of rectangles with magenta marks and a green
10px-stroked square. `data/corepox/sprites/radar.png`, pulled out of the APK, is a green ring 1.88
tiles across with a dot at its centre on a yellow base whose top edge dips. They are not the same
picture.

`tools/corepox-apk-sprite-png.py` dumps the images (`d.image` off a UnityPy `Sprite`); 13 of them
are in `data/corepox/sprites/`, 784K. The geometry-only tool that came first
(`corepox-apk-sprites.py`, July) reads `m_Rect`/`m_Pivot`/`m_PixelsToUnits` and was enough to fix
the anchors, but cannot answer *which design shipped* or *where is the glow*. Only the picture can.

**One tile is 192 px in every sprite.** `m_PixelsToUnits` is 300 for all of them and
`Metric.Tile2Pixel` is 0.64, so the conversion to the notebook's 56-units-to-the-tile grid is a
single constant, `56/192 = 0.291667` units per pixel. That constant is what makes the sprites usable
as a ruler.

**Measure against the sprite's ink, not its rect.** The rect carries the glow's transparent padding
— Constant's 222px rect holds a 174px square — and an SVG trace has none of it: its path bbox *is*
the ink. A first refit matched rect to viewBox and came out 27% large on Constant.
`data/corepox/sprite-ink.json` is the ink bbox per sprite, and `corepox-anchor-truth.ts` now reads
it.

Held: every trace was at its own scale, because each Sketch symbol is normalised to its own
artboard. `corepox-anchor-truth.ts` printed svg-units-per-tile from 47.2 to 64.0 where all of them
should read 56, so the board drew Armour 16% small and Brain 14% large from the start of the port.
After `corepox-art-refit.py`:

```
  Brain       82.0x 77.0 ->  53.0x 49.8   0.92x0.92 tiles   footprint 1x1
  Constant    56.0x 56.0 ->  50.8x 50.8   0.91x0.91         1x1
  Binary     193.0x128.0 -> 161.9x107.3   2.91x1.91         3x2
  Radar      118.0x171.0 -> 109.5x158.7   1.91x2.91         2x3
  Engine      56.0x119.0 ->  50.1x106.4   0.91x1.88         1x2
  Explosive   56.0x 56.0 ->  50.8x 50.8   0.91x0.91         1x1
  Armour      56.0x 56.0 ->  50.8x 50.8   0.91x0.91         1x1
  Hyperdrive 248.0x299.0 -> 218.6x263.6   3.91x4.70         4x5
```

Eight drawings land within 0.1 tile of eight footprints derived independently from the prefabs.
Nothing in the fit knows what a footprint is, which is why that agreement is worth something.

That table is the *path* bbox, and it was wrong by one stroke width for a few hours: a stroke is
centred on its path, so what a drawing covers is path bbox + one whole stroke, and after the halo
padding below the viewBox read 55.3 for 50.8 of ink — Armour and Constant 8.9% large.
`corepox-art-fit-ink.py` rescales so the viewBox *is* the rendered extent. `corepox-anchor-truth.ts`
is what caught it, and only because it was re-run; the run before the padding read 56.0 and nothing
would have re-read it. **A gate that is not re-run after the next change is not a gate.**

**The neon was never in the vectors** — in Unity it came from 2DxFX shaders at draw time — and two
separate things were eating it in the notebook:

1. Binary's trace holds five shapes drawn *twice, identically*. Everywhere else in the sheet that
   pair is a wide saturated stroke under a thin pale one, which is what the glow is. A cross-section
   of `binary.png` at x=500 reads, outside in: soft glow, saturated green, a 3px pale core
   `rgb(181,232,181)`, saturated green, then the body fill at alpha 76/255. The tracer emitted the
   pair and lost the distinction.
2. Every drawing's path sits *on* its bounding box and the halo is centred on the path, so half of
   it falls outside the viewBox. `symbolSheet` turns each drawing into a `<symbol>` and a `<use>` of
   a symbol clips to its viewport, so the outer half of every halo was cut off in play.
   `corepox-art-pad.py` moves each viewBox origin negative by half the widest stroke; no geometry
   moves. An anchor is a coordinate in the *path* space that origin sits in — `drawComponent` adopts
   the art's children and never its viewBox — so once the origin went negative, anything comparing an
   anchor to a pivot has to add it. `corepox-anchor-truth.ts` was not, and reported 2.9 units of
   error that was not there.

**A sensor need not sit on its component's transform.** `RadarFn.cs` opens with
`Vector3 here = center.transform.position` and measures from that child, not from the component. The
sprite says where the child is: ring centre (206.7, 204.6)px, pivot (111.8, 491.4)px, so (+0.494,
+1.494) tiles — the centre of the 2x2 top block to a hundredth of a tile. The engine measured from
the origin tile, i.e. 1.58 tiles off, so every `dist < k` in the corpus was reading against the wrong
point. Now `SENSOR` + `Ship.sensorOf`. Checked against the other components: `EngineFn`, `LaserFn`,
`ExplosiveFn`, `TurretFn` and `MeleeFn` all use `this.transform.position`, and `center` appears
nowhere else in `Assets/scripts/game/components/`, so Radar is the only one.

**The radar sightline is a drawn object, and it was wired to the wrong cell (2026-08-21).** Two
findings from the same report — *"the enemy with a gun turret is not aiming at the player properly …
the radar is not tracking"*.

The aiming half was a silently dropped wire. `Ship.at(x, y)` matches
`comps.find(c => c.px === x && c.py === y)` — the **anchor**, never the rest of the footprint.
`loadShipSpec` normalises cell→anchor for the recovered corpus, but `newSession` hands a MISSIONS
spec straight to `new Ship` and skips that path. `SHIPS.gunBoat`'s bearing wire read
`{from: [1, 1], fromPort: "bearing"}` — the Radar's bearing *cell*, not its anchor `[0, 1]` — so it
resolved to nothing and was dropped without a warning. The dist wire was on the anchor and did land,
which is why the turret fired continuously and never turned. Fixed by addressing the anchor;
`tools/corepox-wire-anchors.ts` now gates every wire in MISSIONS (74 wires, 0 bad) and
`tools/corepox-turret-track.ts` prints truth bearing against what the turret received:

```
  t   truth   radar.bearing  in.angle  turret  aim-err   dist  lock
5.0    26.2           23.7      23.6    22.6      3.6   25.1 yes
10.0    39.6           41.2      41.1    40.2     -0.6   22.9 yes
15.0    52.9           55.4      55.3    54.1     -1.1   17.9 yes
20.0    71.4           68.3      68.2    68.1      3.2   14.5 yes  radar.hp 0
```

The consequence is a real difficulty change: on the notebook's engine FollowBoss's reference
solution went from a comfortable win to **48.1s of a 60s limit** (`corepox-play-missions.ts`,
2026-08-21). That is fidelity, not a regression — the original aimed.

The legibility half is a shipped asset, not a debug overlay, and it had been guessed at. `RadarFn`'s
`trace` PPtr resolves (`tools/corepox-radar-trace-probe.py`) to a SpriteRenderer on a GameObject
named `radar_trace`:

```
m_Size = {"x": 0.19, "y": 10.0}   m_DrawMode = 2 (Tiled)   m_Color = white   m_SortingOrder = 0
Transform pos {"x": 0.0, "y": 0.64}   parent `arrow` at (0.32, 0.96), scale 1 all the way to the root
```

`arrow` is the transform that rotates onto the target, and `RadarFn` sets `trace.size.y =
nearest.distance - 0.64f`, with the sprite pivot at the bottom (`m_Pivot.y = 0.0`). So the trace
**starts one tile out from the sensor** and ends exactly on the target. The sprite itself
(`data/corepox/sprites/radar_trace.png`, dumped 2026-08-21, 57x60px at 300ppu = 0.19 x 0.2 world
units) is opaque on rows 15..44 — a **50% duty cycle**, which is where the dotted look comes from —
core ink across 38 of its 57 columns at RGB (230, 230, 104), with a faint halo either side peaking
at alpha 28/255. In tile units (1 tile = 0.64 world units): dash period 0.3125, core width 0.198,
halo width 0.297.

The port had a sightline already, but every number in it was invented: `#4dd47a` green,
`stroke-width 2`, `dasharray "10 12"`, `opacity 0.3`, starting at the sensor. It is now two strokes
in `corepox-render`'s `locks` group at the measured widths and colour, dashed on the measured
period, starting a tile out. Screenshot: `tools/screenshots/radar-9.png` (both radars locked, 23.9s
into FollowBoss).

**Pause is a game mechanic, not a convenience, and building is how you enter it (2026-08-21).**
Recovered while answering Tom's *"there is no pause, and there was one, I think in some modes
building should pause"* — which turned out to describe what shipped.

Every edit verb calls `Controller.Instance.pause()` on its way in, and it is a side effect rather
than a button: `Build` state's `init()` (`UIState.cs:669`, immediately before `BuildDialog.show`),
`clickMove` (`:471`), `clickRotate` (`:479`), `clickDelete` (`:497`). `clickConnect`,
`clickDisconnect` and `clickInfo` do **not**. The split is consistent: build, move, rotate and
delete change the ship's mass and geometry mid-flight; connect and cut change only the dataflow.
`UIAction.Play` resumes, and says what the pause was for —

```csharp
// If the player has mutated the ship while paused, it might now be disconnected
if (Controller.Instance.game.playerShip) Controller.Instance.game.playerShip.maybeSplit();
```

**There are two pauses.** `Controller.pause()` branches on `uiSettings.kinematicPauses`:

```csharp
if (uiSettings.kinematicPauses) {
    foreach (Ship ship in space.ships.Keys) ship.body.isKinematic = true;
    Time.timeScale = timeScale;   // Even paused have simulation running for kinematic mdoe
} else {
    Time.timeScale = 0;
}
```

So a *kinematic* pause freezes the bodies and leaves the clock alone — turrets turn, radars scan,
dataflow propagates, particles fly, and only the ships stop moving. It is set in exactly one gameplay
place, `LiveDesignMission.cs:55`, which is the ship editor reached from the menu (the shipped
equivalent of `corepox-shipyard`); `ShipSnapshotController` sets it too, for server-side rendering.
Everything else takes the `UISettings.cs:5` default of `false` and gets `Time.timeScale = 0`.

**And a pause is invulnerability.** `ShipComponent.damage()`:

```csharp
if (Controller.Instance.paused) {
    StartCoroutine("displayDamage");     // the flash plays, the hp does not move
} else if (this.hp > 0) { this.hp -= amount; ... }
```

`Ship.thrust()` early-returns while paused as well (`Ship.cs:439`). So pausing to build costs the
initiative — you also stop moving and stop shooting — which is what makes giving it away for free on
every build safe.

**Live missions had no pause button.** `UIStates.IDLE.init()` sets bottom-left to `null` when
`settings.liveMode`, to `Play` when already paused, and to `Pause` otherwise. In a live mission the
only way to stop the clock is to start an edit; `Selected.init()` then offers `▶` to resume. The
observed UI recorded "▶ play, ⏸ pause while running" without noticing that live missions get
neither.

None of this is in the port. `corepox-game` has `▶` in `build`, a clock in `playing`, and no pause
at all — so edits during a live mission are made while damage lands and a modal covers the board.
Written up for the designer in `plan/corepox-ux.md` §4 and §8.

**The shipped build runs in an emulator, but not past its login.** `tools/corepox-emulator.sh`
stands one up entirely under `vendor/android-sdk` — SDK, JDK and AVD, nothing installed on the
machine, since homebrew cannot run under the sandbox and the phone on the desk is not a test rig.
The game starts (`ApplicationInfo larkworthy.corepox version 1.49`, Unity 2019.2.14f1, il2cpp,
arm64, splash video decoded at 30fps) and then stops:

```
I Unity : FirebaseLoader:SigninAnonymously()
I Unity : FirebaseLoader: HandleSigninResult
I Unity : Login encountered an error.
```

Reproducible across a force-stop and relaunch, and the emulator has network (`ping 8.8.8.8`
succeeds from inside it), so this is the live project refusing anonymous sign-in rather than the
emulator. Getting past it would mean changing auth settings on a live Firebase project.

**Superseded 2026-08-20:** Tom enabled the Anonymous provider on `corepox-staging` and the same
build signed in on the next launch. See "The shipped game runs" below — every finding above this
line was made without watching the game run, and two of them turned out to be wrong.

**Corners.** The traces square off corners the sprites round. Measured off the top row of solid ink:
constant 20px, armour 19px, explosive 20px. `corepox-art-round.py` rounds only paths that are an
axis-aligned rectangle covering most of their own viewBox, which is the body.

**Not done.** Brain, Engine and Hyperdrive still have square corners where the sprites are rounded.
Brain is the awkward one: its trace is a 36.2-unit inner square with the connector teeth *outside*
it, while the sprite has a rounded outer frame enclosing the teeth and a grey inner square — it
needs redrawing, not rounding. `Lazer`, `Orb` and `LaserTurret2`
keep their Sketch scale: no single sprite maps onto them (turret2 is cap + gear + barrel), so there
is nothing to measure against. And the radar's moving parts are recorded but not built — `scan`
tweens its localScale 0→max on a 1s infinite loop, `arrow` rotates to the target and hides when
there is none, `trace.size.y` is set to `distance - 0.64` each frame.

### The shipped game runs (2026-08-20)

Anonymous auth was the only lock. With the provider enabled, the same APK in the same emulator
gets straight in:

```
I Unity : FirebaseLoader:SigninAnonymously()
I Unity : FirebaseLoader: HandleSigninResult
I Unity : Login completed for o4L2XUoCe9R3NY7gS65WcNpy7DF3
I Unity : FirebaseLoader: syncUsersRef fired
I Unity : FirebaseLoader: New Player o4L2XUoCe9R3NY7gS65WcNpy7DF3
```

Both follow-on blockers predicted on 2026-08-19 were wrong. `syncUsersRef` never raised
`PermissionDenied`, so the RTDB rules on `/users/$uid` admit an anonymous uid and
`runAnonRelogin` never fired; and the `corepox-staging` RTDB instance still exists and still hands
a new player their starter inventory. Neither needed doing.

Driving is `tools/corepox-emu-drive.sh` (`tap` / `swipe` / `shot` / `skip` / `log`) against
`emulator-5554` at 1080x2340. Screens land in `tools/screenshots/emu/`.

**The tutorial campaign is 7 missions, and the port's first 7 are those 7.** Read off the
MISSION tab (`data/corepox/shipped-ui/06-missions-top.avif`): `birthing, cocoon, run, gunner,
connection, aiming, avoiding`, headed `tutorial  0/7`. The port's `MISSIONS` ids
(`corepox-missions.js`) line up one-for-one in the same order, and the last two sit outside the
tutorial chapter:

```
birthing  cocoon  run              gunner      connection  aiming  avoiding   -- shipped, "tutorial 0/7"
PlaceBrain Cocoon ConnectionLite   ManualAim   Connection   Aim     Avoid      SideShooter TwinTurrets
```

So the "9 vs 7" is not a discrepancy. Whether each pair *plays* the same is a separate question and
is answered mission by mission in `knowledge/corepox-shipped-ui-observed.md`.

**What direct observation changed.**

*The Brain drawing is 27.7% too small, and no gate was watching.* `drawComponent` scales by
`art unit / ART_TILE` (`corepox-components.js:177`), so the viewBox does not set the rendered size —
the ink extent does. `corepox-anchor-truth.ts` checks anchors and `corepox-art-frame.ts` checks the
joint frame; neither looks at how big the drawing comes out, so Brain passed both while rendering
at two thirds of a tile. `tools/corepox-art-ink.py`, written 2026-08-20, measures it directly
against the sprite ruler (192 px = 1 tile, so 1 sprite px = 56/192 units):

```
cell         drawn w x h          sprite wants         error
Brain          37.09 x   37.08      51.33 x   51.33     -27.7%  -27.8%   <-- OFF
Constant       50.75 x   50.75      50.75 x   50.75      +0.0%   +0.0%
Binary        158.81 x  106.51     162.75 x  106.75      -2.4%   -0.2%
Radar         106.47 x  160.33     106.75 x  162.75      -0.3%   -1.5%
Engine         47.85 x  100.73      50.75 x  105.00      -5.7%   -4.1%   <-- OFF
Explosive      50.75 x   50.75      50.75 x   50.75      +0.0%   +0.0%
Armour         50.75 x   50.75      50.75 x   50.75      +0.0%   +0.0%
Hyperdrive    218.68 x  263.47     218.75 x  263.38      -0.0%   +0.0%
```

The tool bounds cubics by their control points, so a curvy drawing reads at most a hair *large* —
never small. Every negative number above is therefore a floor, not an estimate.

Engine's shortfall has a different cause from Brain's and is a bug in the earlier fit pass:
`corepox-art-pad.py` pads the viewBox by half the *widest* stroke in the drawing, and
`corepox-art-fit-ink.py` then removes that same amount from the extent. Engine's widest stroke is
4.2 (an interior detail); the path that actually sets its boundary is stroked 0.84:

```
viewBox="-2.09 -2.09 51.20 104.08"          <- -2.09 = 4.2 / 2
<path d="M0,0C0,0,0,23.83,...L0,0Z" ... stroke-width="0.84"/>   <- the boundary
```

So the correction was several times too large. The rule the pair of tools needs, and did not have:
**the padding is set by the widest stroke, but the fit is set by the stroke on the boundary path.**

*Brain needs redrawing, and now there is something to draw from.* The 2026-08-19 note called this
from the sprite alone; the running game confirms it at three magnifications — the build-menu icon
(`data/corepox/shipped-ui/09-brain-icon.avif`), the placed core at board scale (`data/corepox/shipped-ui/11-brain-board.avif`), and the cutscene
render, which is the same art a metre wide (`data/corepox/shipped-ui/07-birthing.avif`). All three agree with
`data/corepox/sprites/brain.png` and disagree with the trace. The structure is:

  - a rounded-square **outer** frame, thick, pale-salmon stroke over a red glow;
  - an amber band inside it, slotted — the teeth are cuts *through* the band, wholly enclosed by
    the frame, never protruding past it;
  - a dark rounded square in the middle (grey in the sprite, tinted dark on the board);
  - two pale-cream pins, one low on the left band and one right-of-centre on the bottom band.
    These are **baked into the sprite**, not a runtime connection indicator — the placed core shows
    them in the same two places as the flat PNG.

The current trace is a thin sharp-cornered square with the teeth reaching inward from it and no
outer frame at all. It is a different drawing, not a mis-scaled one.

*Armour is filled, not an outline.* The reward icons and the two pieces auto-placed in `cocoon`
render as a deep-indigo fill inside a thick white-lavender neon border with a small corner radius
(`data/corepox/shipped-ui/19-stack.avif`). `armour.png` carries a grey fill that the game tints. The port already fills
`rgba(16,9,44,0.500)`, so this one matches.

*Components sit flush.* Selecting `ARMOUR x2` places both pieces itself, above and below the core,
with no gap at the tile boundary (`data/corepox/shipped-ui/19-armour-place.avif`). Placement is not free-hand.

*A lone core rotates.* After `PLAY` in `birthing` the single placed core turns slowly on the spot
with nothing attached (`data/corepox/shipped-ui/11-core-placed.avif` -> `data/corepox/shipped-ui/13-playing2.avif`, about 20 degrees over ~10 s).
Whether the port does this is not yet checked.

**The enemy ships carry their program on the board, and the port has nothing like it.** This is the
largest gap direct observation has turned up. In `cocoon` each of the two mine ships
(`data/corepox/shipped-ui/18-cocoon-clear.avif`) is drawn as two red Explosive tiles plus an attached green rounded panel
holding a live dataflow graph: a purple `+` node, an operand bubble `1` on one side and `-48` on the
other, an output reading `-48` in green at the junction, and animated pale beams travelling along
the wires. A `DANGER` chip points at the group. The game is about async programming and it *shows
the program next to the ship it runs*. The port draws components and no program. Size of this job
is not estimated here.

**The starfield is a photograph.** The board background is a nebula plate, not procedural dots
(`data/corepox/shipped-ui/18-cocoon-clear.avif`). Relevant to the zoom annotation: the port generates 260 random circles and
pins them to the viewport. Whether the shipped plate parallaxes or is fixed has not been measured —
the camera did not move in any capture taken so far.

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

### The Orb is a glow, not a diagram (2026-08-20)

Tom, on mission 8: *"The orb graphic is completely wrong, this is apparent in Yin Opposses Yang
mission"*. It was four purple rings in a 2x2 box — the components page's own **occupancy sketch**,
one ring per cell, which had been wired up as if it were ship art. No sprite in the APK looks
anything like it.

`Orb.prefab` is the ruler, and it is the only component prefab whose root is not at scale 1:

```
Orb            localScale 0.33      sprite `orb`         339 x 48 px @ ppu 100   material pulse
 \_ weapon     localPos (0.96,0.96) sprite `orb_weapon`  813 x 813 px @ ppu 100  material addative
```

A tile is 0.64 world units (`Metric.Tile2Pixel`, and the collider sizes agree — Constant 0.550,
Engine 0.550 x 1.200, LaserTurret2 1.193 x 0.602), so at 0.33:

- **the glow** is `8.13 * 0.33 = 2.683` world = **4.192 tiles across**, centred at
  `(0.96,0.96) * 0.33 = 0.495` tiles up and right of the origin tile — the middle of the 2x2.
- **the rail** is `3.39 x 0.48 * 0.33` = **1.748 x 0.248 tiles**, centred `(+0.433, -0.322)`, which
  lays it along the bottom edge of the footprint.

Three independent numbers say the 0.33 is real and not an editor leftover:

1. the root `BoxCollider2D` is `3.39 x 0.48` — the rail, not the 2x2, so the component's clickable
   body really is that thin bar and the rest is light;
2. `JOINTS.Orb` puts all four joints on the bottom side of the bottom row, which is where the rail
   lands and nowhere near where the four rings were;
3. the weapon's `CircleCollider2D` radius `1.1 * 0.33 = 0.567` tiles falls at r/R 0.27 of the glow,
   which is exactly where the sprite stops being white and starts being magenta.

The gradient in `art_Orb` is a radial sample of `data/corepox/sprites/orb_weapon.png` about
(406,406), r/R against straight RGBA:

```
   r/R     R    G    B    A
  0.00   251  253  251  255     white core, flat
  0.24   251  253  251  255
  0.27   245  136  226  254     white -> magenta, and the damage collider is here
  0.30   252  102  227  246
  0.50   202   65  178  208
  0.74   146   49  130  126
  0.97   121   44  107   13
```

`addative` resolves to Unity's **Mobile/Particles/Additive** (`Blend SrcAlpha One`), so the glow adds
light rather than painting over — the path carries `mix-blend-mode:plus-lighter`. **Limit:** the
component art sits inside the ship's `cp-bloom` group in `shipNode`, and a filter isolates, so the
orb blends additively with the ship's own art (the rail washes to white under it, as it should) but
still occludes the board behind it. Faithful additive would need the glow painted outside that group.

`corepox-art-ink.py` gates the size at 234.75 art units and carries the ppu/scale derivation, because
nothing else in the pipeline knows the Orb is the exception.

**The damage radius does not match.** `corepox-engine` gives the Orb contact damage within 1.2 tiles;
the shipped `CircleCollider2D` works out at 0.567. Not changed — the 1.2 came from Tom — but the two
numbers disagree by 2x and only one of them is measured.

### A paint server in a display:none `<svg>` does not paint (2026-08-20)

The Orb's gradient was correct and invisible for an hour. `symbolSheet` parked the symbol sheet in
`<svg style="display:none">`, and Blink builds no layout object for such a root, therefore no paint
server for anything in its `<defs>`. A three-step probe (`tools/corepox-orb-probe.ts`) separated it:

```
$ bun tools/corepox-orb-probe.ts     # centre pixel of a circle filled url(#cpx-orb-glow)
sheet display:none                 -> (0, 0, 0)
host visible, sheet display:none   -> (0, 0, 0)
sheet laid out, defs in <symbol>   -> (251, 253, 251)
```

A clone of the same gradient moved into a rendered `<defs>` painted straight away, which is what
ruled out the markup. The sheet is now `position:absolute;width:0;height:0;overflow:hidden`.

**Filters are not affected**, and that asymmetry is why this survived: `cp-bloom` resolved out of the
same hidden defs the whole time, which is why every board screenshot before this has neon on it. The
sheet looked like it worked because for five months everything referencing it was a filter.

**Rejected fix, recorded so it is not tried again:** the first hypothesis was that `<symbol>` was the
problem, and `symbolSheet` hoisted each drawing's `<defs>` into the sheet's own. It made no
difference, because the sheet was still hidden. Re-tested afterwards with the sheet laid out — a
gradient inside the `<symbol>` and a gradient in the sheet's `<defs>` paint identical pixels — so the
hoist was removed and the drawing keeps its own `<defs>`.

## The campaign, recovered from binary scenes

`Campaign.cs` holds `List<Mission> missions` as a serialised `MonoBehaviour` field, so the ordering
lives in a Unity scene, and **all 12 mission scenes plus the 4 enemy-ship scenes are binary** — same
wall as the prefabs. The object graph is gone.

But `MonoBehaviour` string fields survive verbatim in the binary, and that is where the author put
both the ship JSON and the on-screen prompts. `tools/corepox-extract-missions.py` runs `strings`
over each scene, brace-matches JSON blobs and filters prompt text; it recovered **79 ship specs and
51 prompts across 12 missions** into `scratch/corepox-missions.json` (2026-08-18).

Reconstructed order — inferred from difficulty and dependency, **not** read from the scene, since
that is exactly the part that was binary. **Superseded on 2026-08-20**: the real order was read out
of the shipped APK, and this table is wrong in both its ordering and its premise that there is one
campaign. See "The campaign, read from the shipped build" below. Kept because the inference is what
the port was built on and the diff is the interesting part.

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

The three `Follow*` rows above are wrong in every column that matters — they are one campaign
later, they teach the opposite of what the prompts suggested, and the player flies the ship the
table calls the lesson. See "Advanced Steering, ported (2026-08-20)".

**The `FollowCourse` scene contains a Composite named `Brautenbourgs First`, and a prompt reading
`Braitenberg 1`.** Braitenberg vehicles are the canonical toy for teaching that crossing two
sensor→motor wires turns avoidance into pursuit. So the original design *already* used a pre-built
composite handed to the player as the device for teaching sensor→actuator wiring — which is
independent confirmation of the "composite as reward and tutorial in one" reading, arrived at from
the code rather than from the pitch.

Set against the corpus finding that Binary appears once per 15 components: the teaching existed and
players still ended up building `Constant → Engine` bricks. Whatever went wrong is downstream of the
tutorial, not a gap in it.

## The campaign, read from the shipped build (2026-08-20)

Tom, 2026-08-20: *"I feel like you are missing a lot of mission content on e.g. braitenberg. So I
think this is an old APK"*. The APK was not the problem. `vendor/corepox_apk` is **Corepox 1.49**,
Unity **2019.2.14f1**, and `assets/bin/Data/globalgamemanagers` carries the build's scene list
verbatim — 17 scenes, of which **ten are missions**:

```
Assets/scenes/missions/PlaceBrain.unity      Assets/scenes/missions/Aim.unity
Assets/scenes/missions/Cocoon.unity          Assets/scenes/missions/FollowCourse.unity
Assets/scenes/missions/ConnectionLite.unity  Assets/scenes/missions/FollowCourseAdvanced.unity
Assets/scenes/missions/Connection.unity      Assets/scenes/missions/FollowBoss.unity
Assets/scenes/missions/Avoid.unity           Assets/scenes/missions/ManualAim.unity
```

`SideShooter` and `TwinTurrets` are **not in it**. They exist as scenes in the repo and the port
ships them as missions 8 and 9; that is a divergence the port introduced, not recovered content.

The campaign objects are `MonoBehaviour`s, and their string fields survive in `level0` the same way
the mission prompts survived in the scenes. Read at 4-byte-length-prefixed offsets 11112-11896,
they come out as ordered triples and then the campaign's own display name:

```
seed        birth       birthing    PlaceBrain
armour      cocoon      cocoon      Cocoon
connectlite connectlite run         ConnectionLite
manualaim   manualaim   gunner      ManualAim
connect     connect     connection  Connection
aim         aim         aiming      Aim
avoid       avoid       avoiding    Avoid
                                    tutorial          <- campaign displayName
follow1     Yin opposses Yang       FollowCourse
follow2     Zero Negates Something  FollowCourseAdvanced
followBoss  Boss: The Assassin      FollowBoss
                                    Advanced Steering <- campaign displayName
```

**There are two campaigns, not one.** `tutorial` is the seven the port ships, in the port's order and
under the port's display names — that part was right. `Advanced Steering` is three missions the port
does not have at all, and its titles are the Braitenberg content: "Yin opposses Yang" against
"Zero Negates Something" is the crossed-versus-uncrossed sensor→motor pair, stated as a mission
title. `FollowCourse`'s recovered ship is `Radar → Binary MINUS → two Engines` with a Constant,
which is a Braitenberg vehicle spelled out in parts.

**The port now shows the two campaigns, and took two titles off this table.** `CAMPAIGNS` in
`@tomlarkworthy/corepox-missions` groups the picker; a mission the table does not name still appears,
in a trailing "not in a campaign" group, so SideShooter and TwinTurrets are labelled rather than
hidden or silently promoted. The header reads `tutorial 1/7`, `Advanced Steering 3/3` instead of a
running `1/12`. Two mission titles were wrong against this read and are corrected: the port had
"Zero negates something" (case) and "Boss: the Gun Boat" — the latter was the enemy composite's name
(`SHIPS.gunBoat`), not the mission's, which is **"Boss: The Assassin"**.

The field mapping inside a triple is **not pinned**. `Mission.cs` declares
`intro, outro, name, displayName, scene, starRequirement`, which is five strings, and the tutorial
rows carry four while the Advanced Steering rows carry three — an empty string serialises to a
length of 0 and is skipped by the extractor, so which of `name`/`displayName` is absent is a guess.
The left column is the cutscene key either way: `Mission.load` calls
`Cutscenes.lookup(request.mission.intro)`, and `seed`/`armour`/`follow1` are cutscene names, not
mission names. **No `starRequirement` or `minPlayerRating` value has been read**; they are ints, not
strings, and the extractor only recovers strings.

### The cutscenes are one TextAsset, and it is recovered (2026-08-20)

The whole shipped script is 1103 bytes. `Cutscenes.load` does
`Resources.Load<TextAsset>("cutscenes")`, so it survives in the APK as a TextAsset
of that name, and `tools/corepox-apk-sprite-png.py`'s sibling walk over
`vendor/corepox_apk/base/assets/bin/Data` finds it in `3c75bcdb…`. Written out to
`data/corepox/cutscenes.yaml`; **9 scenes, 11 frames, every one of them
`BrainProfile`**:

```
seed         I REMEMBER....  /  MY MOTHER WAS SEED SHIP #342164
armour       I MUST SHELTER MYSELF FROM HARM
connectlite  I CAN CREATE CIRCUITRY
manualaim    I MUST KILL TO SURVIVE
connect      I MUST MOVE TO SURVIVE
avoid        COLLISION COURSE DETECTED  /  I MUST TURN MYSELF AROUND
aim          I MUST SENSE INCOMING DANGERS AND REACT
follow1      WHEN I COMBINE WITH THE FALLEN, I RELIVE THEIR PAST
follow2      I MUST LEARN HOW TO SURVIVE, IN ORDER TO SURVIVE
```

`Mission.load` looks the scene up by the mission's `intro` field and the campaign
read above gives that field per mission, so the mapping needs no guessing.
**`followBoss` is a key with no scene** — `Cutscenes.lookup` returns null and
FollowBoss plays no cutscene. That is shipped behaviour, not a gap in the
recovery. SideShooter and TwinTurrets have no key at all, which is consistent with
their not being in a campaign.

The behaviour is `CutsceneController`, and it is small enough to quote:
`animateMainText` yields `WaitForSecondsRealtime(.2f)` per word and plays
`event:/COMPUTER_SPEAKING` on word 1; `call(UIAction.Next)` calls `next()`, which
**advances the frame whether or not the line has finished typing**. The port is
faithful to that, including the impatience trap. No audio — none of the FMOD banks
are recovered.

`Mission.cs` also declares an **`outro`** beside `intro`. No outro key appears in
the campaign read and `cutscenes.yaml` has no scene that is not an intro, so
either the outros were never written or the campaign rows carry an empty string.
Not resolved.

**The portrait is drawn, not shipped.** `BrainProfile` is a 1265x1290 PNG
(`data/corepox/sprites/BrainProfile.png`, 361 KB) of the Brain chip with circuit
traces radiating off it. The chip is already a symbol in the sheet, so the port
draws `componentNode({type: "Brain"})` at 2.1x under 40 generated stepped
polylines in four greens, and the cutscene costs no attachment bytes. The traces
are hashed off the trace index rather than `Math.random`, because a cell that
recomputes must not redraw a different picture.

### Advanced Steering, ported (2026-08-20)

All three are in the port and all three complete by clicking:
`corepox-play-missions.ts` 12/12 with the reference build, `corepox-qa-campaign.ts` 12/12 through the
browser UI, `corepox-mission-fidelity.ts` "all 12 missions match the original".

They are the **best-recovered missions in the game**, and the reason is that they have no
`MissionController` subclass under `Assets/scripts/scenes/missions/`. Everything the subclass would
have held in C# is instead sitting in the scene as an override component, and overrides serialise
as data. Four things came out that the earlier write-up above lists as unrecoverable:

**Who the player is.** `data/corepox/scene-transforms.json` carries a `player` flag per ship, set
from `MissionController.initialShip`, plus `tx`/`ty` in tile coordinates — the same pair that puts
Avoid's mine at `-9.73`, which is how the units were checked. It contradicted every reading arrived
at from the prompt lists:

```
FollowCourse          player = UnfinishedOrbDrone  (3.12, 0)     enemy = Brautenbourgs First (-2.55, -11.52) a=149.36
FollowCourseAdvanced  player = UnwiredOrbDrone     (0, 1.56)     enemy = Brautenbourgs First (15.16, -16.09) a=226.62
FollowBoss            player = Brain               (0, 0)        enemies = GunBoatBoss (35.94, -19.22), Spike (-46.88, 1.56), Spike (1.56, 46.88)
```

You fly the *unfinished* drone and the Braitenberg vehicle is the enemy — the opposite of the
reading the prompts suggested, where "Brautenbourgs First/Brain" looked like a label on your own
ship. Positions in the port are enemy-minus-player, because `newSession` always starts you at the
origin. Two rows per scene sit at `(648.79, -512.56)`; those are inactive template copies, and the
fidelity gate now filters anything past 200 tiles.

**The build envelope.** `BuildOverrideSquare` 5 wide by 7 high, all three.

**The inventory.** An `InventoryOverride` item is a `PPtr<GameObject>` — `m_FileID` into the scene's
external references and `m_PathID` into that prefab. The externals table needs the `.meta` guids and
the recovered tree has none, so the map was built the other way round:
`tools/corepox-prefab-ids.py` searches every prefab for the id itself. `Armour.prefab` and
`Brain.prefab` are text YAML and declare it as an anchor (`--- !u!1 &1235298670980640`); the other
nine are binary format 20 with the type tree inlined, and carry it as a little-endian int64 in the
object table, which is findable without parsing the format.

```
1235298670980640  Armour        184678            Radar
161910            Brain         186134            Binary
146962            Lazer         193166            Explosive
158382            Engine        195828            LaserTurret2
169670            Constant      1417436553097400  Orb
```

Two items resolve to no prefab (`m_FileID` 0, so a scene object): FollowCourse's `1819882399` and
FollowCourseAdvanced's `1417313534`, both in scenes whose `SpoilsOverride` carries a relic
composite. Read as the relic — **wrong, corrected below**. That gave:

```
FollowCourse          Brain 1, relic 1                                    spoil: BrautenbourgsFirst (relic)
FollowCourseAdvanced  Brain 1, relic 1, Constant 2                        spoils: Orb, Binary
FollowBoss            Engine 10, Binary 4, Constant 4, Radar 2, Lazer 2,  spoils: Orb, Binary
                      LaserTurret2 2, Orb 2, Armour 2, Brain 1
```

**`liveMode`.** FollowCourse and FollowCourseAdvanced are `liveMode: 1` — the clock is running when
you arrive, like Avoid. FollowBoss is `liveMode: 0` with `buildOnce: 1`: a build phase, and the
scene means you to get exactly one.

That last field is what caught a wrong reading. Both live missions arrive with their core already
placed — FollowCourse's own copy of the player ship has `Brain@[0,-2]` — so the Brain in the
inventory looked like a spare. Building the port with the core moved into the inventory made both
missions lose at t=0 the moment they went live, and the browser gate said so
(`MISSING PARTS Brain@0,-2`) where the headless gate had passed.

### An inventory quantity is not what the player is offered (2026-08-20)

The scene's `InventoryOverride` is the ceiling, not the offer. `UIState.buildOptions` subtracts
first, and drops the item entirely when nothing is left:

```csharp
if (composite != null)
    placedQty = space.findComposites(c => c.model.id == composite.model.id && c.ship.team == "player").count();
else
    placedQty = space.findComponents(c => c.composite == null && c.name == component.name && c.ship.team == "player").count();
if (placedQty < item.quantity) options.Add(new BuildOptionSpec(item.setQuantity(item.quantity - placedQty)));
```

Two details carry the whole result: a composite is matched by `model.id`, and a component counts
only when `candidate.composite == null` — a part inside a composite is invisible to the count.

`tools/corepox-inventory-offered.py` applies the rule to every scene, reading the initial ship's
child list to separate loose components from composite members. The two `m_FileID` 0 items are not
relics at all: each is a second copy of **the mission's own hull**, and the mission's own hull is
already on the board as a `CompositeFn` of the same `model.id`.

```
FollowCourse          ship: composite UnfinishedOrbDrone + loose Brain
    composite UnfinishedOrbDrone   qty 1  placed 1  -> NOT OFFERED
    Brain                          qty 1  placed 1  -> NOT OFFERED
FollowCourseAdvanced  ship: composite UnwiredOrbDrone + loose Brain, Constant x2
    Brain                          qty 1  placed 1  -> NOT OFFERED
    composite UnwiredOrbDrone      qty 1  placed 1  -> NOT OFFERED
    Constant                       qty 2  placed 2  -> NOT OFFERED
FollowBoss            ship: loose Brain
    Brain                          qty 1  placed 1  -> NOT OFFERED
    the other eight                                 -> OFFERED in full
```

**Both live Follow missions have an empty BUILD menu.** That is consistent with everything else
about them — `liveMode: 1`, a brief that only ever talks about wires, and a `solution` that adds
connections and no components. The port had been offering a spare Brain in all three and two spare
Constants in FollowCourseAdvanced; those are cut.

It also closes the open item "the build path cannot place a relic". No scene offers a placeable
composite, because the only two composite items are cancelled by the ship carrying them. The
`Composite` splice in `loadShipSpec` still does the work for ships that arrive containing one.

The five tutorial scenes with no `InventoryOverride` at all (PlaceBrain, Cocoon, ConnectionLite,
ManualAim, Connection, Aim, Avoid) draw on the account's carried inventory, which is `GameState` and
not in any scene. Those quantities in the port stay authored.

### The Orb is MeleeFn, and it was doing a fifth of its damage in the wrong place (2026-08-20)

Tom: *"The orb doesn't seem to do damage when it is overlapping an enemy"*.

`Descriptions.cs:19` says an Orb "causes massive damage to touching components, and blocks incoming
lazer fire". The behaviour is `MeleeFn`, and it is short enough to quote whole:

```csharp
public void FixedUpdate() {
    int n = damageArea.GetContacts(colliders);
    for (int i = 0; i < n; i++) {
        ShipComponent other = colliders[i].GetComponent<ShipComponent>();
        if (other != null) other.damage(damageAmount);
    }
}
```

Every contact, every fixed step. `tools/corepox-orb-melee-probe.py` reads the numbers off
`Orb.prefab`:

```
Transform 'Orb'      scale 0.33
Transform 'weapon'   pos (0.96, 0.96)  scale 1.0
CircleCollider2D on 'weapon'   m_Radius 1.1   m_Offset (0,0)   m_IsTrigger true
BoxCollider2D    on 'Orb'      m_Size (3.39, 0.48)             m_IsTrigger false
MeleeFn on 'Orb': damageAmount = 5
```

The root is at localScale 0.33, so the child numbers scale with it: the trigger is
`1.1 * 0.33 = 0.363` world units = **0.567 tiles**, sitting `0.96 * 0.33 = 0.317` world units
diagonally off the pivot = **0.495 tiles** — the centre of the Orb's own 2×2, to within a rounding.
(The non-trigger `BoxCollider2D` is the body: `3.39 x 0.48` at 0.33 = 1.748 × 0.248 tiles, the rail
along the joint edge, which is what the art work measured independently.) `DT` is already 0.02, so
`damageAmount` needs no rescaling — 5 per tick is 250 dmg/s, the same rate as ramming.

The port had:

```js
const [wx, wy] = s.worldOf(c);
const n = this.nearestEnemy(s, wx, wy);
if (n && n.d < 1.2) n.ship.damage(n.comp, 1);
```

Three errors compounding, and the reported symptom is the first one:

- `worldOf(c)` is the component's **origin tile**, and the Orb is 2×2. The damage circle sat half a
  tile off in both axes. An enemy against the far corner is 1.4 tiles from the origin tile — outside
  the test — while looking thoroughly overlapped, all the more so because the Orb is *drawn* 4.19
  tiles across.
- `nearestEnemy` returns one component. Four enemy parts inside the trigger took damage on one.
- 1 damage where the prefab says 5.

Now: centre on the centroid of `c.tiles` (which are absolute ship cells, already rotated by `c.dir`,
so this holds for a turned Orb), radius `ORB_R + HIT_R = 0.567 + 0.5 = 1.067` tiles, 5 damage to
every enemy component inside. Targets are modelled as one `HIT_R` disc at their origin tile, which
is how the particle path already models them — a beam and an Orb agree about what they are touching.

`tools/corepox-orb-damage-probe.ts` walks a one-tile enemy across a stationary Orb with `collide`
stubbed out, because ramming also does 5 per contact per tick and would be indistinguishable:

```
        -1.5   -1 -0.5    0  0.5    1  1.5
  -1.5     0    0    0    0    0    0    0
    -1     0    0    0    5    0    0    0
  -0.5     0    0    5    5    5    0    0
     0     0    5    5    5    5    5    0
   0.5     0    0    5    5    5    0    0
     1     0    0    0    5    0    0    0
   1.5     0    0    0    0    0    0    0

symmetric about the Orb's centre: true
two components inside, damage each: [5,5]
```

**Blast radius.** This is a balance change, not only a bug fix: an Orb now does 5× the damage to
every part it touches instead of 1× to one. Any corpus arena number computed before today was
computed against the old Orb, and 228 corpus ships carry one.

**Amended 2026-08-21, when footprints became solid.** Two of the three sentences above are now
wrong, and the reason is the same defect one level up: measuring from a single point.

- *Reach.* `ORB_R + HIT_R = 1.067` tiles about the centre of a square whose own cell centres are
  already `0.707` out stops **0.36 tiles short of the Orb's own edge**. That was survivable only
  while hulls could interpenetrate. Once every cell blocks, two ships come to rest at a cell
  separation of 1.0 and a centre-measured Orb reaches nothing at all: an Orb driven into a Brain
  at 20 tiles/s left it on full health (`tools/corepox-ram.ts`, and it is why FollowCourse --
  which is won by ramming an Orb drone into a core -- went from a 10s win to a 60s timeout). The
  reach is now measured from each of the Orb's four **cells**, giving 1.067 against contact at
  1.0. That is what "touching" means, and `MeleeFn` is `damageArea.GetContacts`, i.e. touching.
- *Targets.* Modelled per cell too, not as one disc at the target's origin tile. A Radar with a
  cell dead centre inside an Orb but its anchor 2.00 tiles away took nothing.
- *Teams.* The port skipped same-team ships. `MeleeFn.FixedUpdate` has no team check -- it damages
  every `ShipComponent` the trigger touches. What it cannot touch is its **own ship**: all of a
  ship's components share one `Rigidbody2D` and Unity generates no contacts between colliders on
  the same body. So the exemption is the ship, not the team, and a friendly that drifts into your
  Orb takes 5 a tick. (Tom, 2026-08-21: "perhaps a component from the same team does not collide?
  That seems wrong as well".)

The zone is wider and squarer for it -- same 1.067, but from four centres instead of one:

```
        -1.5   -1 -0.5    0  0.5    1  1.5
  -1.5     0    0    5    0    5    0    0
    -1     0    5    5    5    5    5    0
  -0.5     5    5    5    5    5    5    5
     0     0    5    5    5    5    5    0
   0.5     5    5    5    5    5    5    5
     1     0    5    5    5    5    5    0
   1.5     0    0    5    0    5    0    0
```

Held by `tools/corepox-orb-damage-probe.ts` (which now asserts the reach from a cell, and that
`(1.5, 0.5)` -- exactly touching -- is damaged) and by `tools/corepox-hitbox.ts`.

### buildOnce, modelled (2026-08-20)

`buildOnce` is FollowBoss and only FollowBoss (`data/corepox/mission-settings.json`, twelve scenes).
It does two things and neither is "you may not edit":

- `hasBuildBuildOptions()` is `settings.buildOnce && settings.hasPlayed ? false : ...`, and its only
  callers are `setBottomRight(... ? UIAction.Build : null)`. So pressing play takes the **BUILD**
  button away and nothing else. Move, rotate, delete and wire are options on the `Selected` menu,
  and FollowBoss's `InitialSettingsOverride` leaves `no_building`, `no_removing` and
  `no_connection_creation` all 0.
- `MissionController.call(modifiedShip)` saves the ship as `current_json` on every change while
  `!hasPlayed()`, and the retry pad calls `MissionResponse.retry(request, current_json)`. So a retry
  hands back the ship you took into the fight, not the bare core the scene starts from.

The port models both: `stock()` returns `[]` once `S.hasPlayed`, and `play()` snapshots the spec and
the remaining inventory into a per-mission `kept` map that `reset()` restores. The inventory rides
along because a retry re-applies the override and then subtracts `placedQty`, which is the same
number the session is already holding.

`tools/corepox-buildonce-probe.ts` drives it in a browser and asserts the difference rather than the
behaviour of one mission:

```
ok   Cocoon      stock 1->1  parts 1->2 restart 1     <- buildOnce 0: build stays, restart forgets
ok   FollowBoss  stock 9->0  parts 1->2 restart 2     <- buildOnce 1: build goes, restart remembers
```

What is still authored: the wires the player is expected to add (a scene stores no connections for
a loosely placed component), and the reference `solution` builds, which are one answer each.
FollowBoss's is searched rather than chosen — `tools/corepox-boss-search.ts` rejects layouts that
overlap, come apart or exceed the core's 20 power, then simulates. Every fixed-`Lazer` hull it tried
killed nothing in 240s, because a ship that steers by bearing never lines a fixed gun up; swapping
in the auto-aiming `LaserTurret2` takes a core in 41s and loses no parts.

### The a/b question, settled, and an engine bug it found (2026-08-20)

`FollowCourse`'s enemy composite carries the values the game last saved into it, and they are a
four-way cross-check nobody had used:

```
TIMES  a=102.83528137207031   <- a radar angle
       b=180.0                <- the Constant at [2,1]
       output=18758.390625
MINUS  b=18758.390625         <- the TIMES output
       output=-19004.55078125
```

`loadShipSpec` resolved **every one of those to the opposite port**. Both Binaries in that composite
are sideways (`dir: "left"` and `dir: "right"`), and two rotations in `loadShipSpec` were the
forward rotation where they should have been its inverse — invisible for `up`/`down`, which are
their own inverses, and exactly backwards for `left`/`right`. `rotTile` is the authority, since it
is what decides where a component's cells actually land; `find()` maps world→local and must invert
it, and the Composite splice maps local→world and must match it. Neither did.

`tools/corepox-rot-probe.ts` loads all 892 corpus ships under each convention:

```
baseline               wired 4621  dropped 63 (1.35%)  multi-island 137  overlapping 53
find swapped           wired 4559  dropped 125 (2.67%) multi-island 137  overlapping 53
find+splice swapped    wired 4683  dropped  1 (0.02%)  multi-island 100  overlapping  0
```

Fixing only `find` makes it worse, which is why this survived: the splice still places sub-components
the wrong way round, so the port cells stop matching. **Fifty-three player-saved ships self-overlapped
before and none do after** — a ship a player built and saved cannot self-overlap, so zero is the
answer that has to be right. Blast radius checked: `corepox-play-missions` unchanged at 9/9 before
the new missions, `corepox-spec-fidelity`, `corepox-type-fidelity`, `corepox-selfoverlap` and
`corepox-engine-test` all unchanged.

The comment on `PORTS.Binary` had claimed FollowCourse's TIMES Binary as independent confirmation
that `a` is the left cell. Under the old rotation it confirmed nothing — it resolved the radar into
`b`. It does now.

### What the cloud added, and what it did not

The GCP projects are live and were scanned read-only on 2026-08-20 (`tools/cloud/`, tokens minted
with `cloud-platform.read-only`, GETs only). `corepox-staging` holds 15 buckets:

- `corepox_builds/match_linux64.zip` (34 MB, 2019-01-05) is the **headless match server** — Unity
  2018.2.20f1, three scenes (`InitializeCommandline`, `DeathMatch`, `ShipSnapshotter`). No missions.
- `corepox-staging-backups` is **3,487 objects, 175 GB** of daily Realtime Database dumps running
  from 2017-11-28 to **2022-07-11**, two years past the source snapshot.
- The rest (`corepox_datasets`, `corepox-staging-boardingparty`, …) are an ML recommender experiment
  and terraform state.

The **live** database still answers, and `assets` is the content half of it:
`{"metadata": …, "relics": …, "ships": …}`.

- `assets/relics` is 2.1 KB and holds four wired assemblies: `BrautenbourgsFirst`, `LazerHardpoint`,
  `Minidrone`, `WeaponStation`. The local `composites.json` has **seven**, these four plus
  `BasicOrbHomer`, `UnfinishedOrbDrone`, `UnwiredOrbDrone` — so the cloud is the smaller set. Three
  of the four are byte-identical to the local copy after normalising key order.
- The fourth differs, **and only in its name**: local `"Braitenberg 1"`, cloud
  `"Brautenbourgs First"`. Same five components, same four connections. So the cloud is not a richer
  source of Braitenberg content; it is the same vehicle under the shipped name.
- `assets/metadata` is 128 KB and indexes **1,441 player ship designs**, created 2017-11-23 to
  2022-02-23, 263 of them with a known creator id.

Counted with `tools/cloud/rtdb-census.ts`, which uses `?shallow=true` so it reads child *keys* and
never a value — `users` is personal data and the tool must not be able to pull it:

```
  assets/ships              2191 children
  assets/metadata/ships     1441 children
  ratings/ships             2140 children
  users                      865 children
  assets/relics                4 children
  public/news                  5 children
  matches                      1 child
```

**The design corpus is 2,191 ships, not 492.** The "Binary appears once per fifteen components"
finding — the one the whole composite-as-tutorial argument rests on — was computed on 492 designs
(§"The corpus is the most valuable artifact"). 2,140 of the 2,191 carry a rating, which is the
other half of what that analysis wanted and did not have. **Not re-run.**

### The corpus, extracted and packed (2026-08-20)

`tools/cloud/rtdb-extract.py` pulls the `assets` and `ratings` subtrees out of the 569 MB dump and
normalises the numeric-keyed objects, so a local copy and a live fetch are interchangeable.
`tools/cloud/rtdb-verify.ts` then checked ten designs spread across the key order against the live
database — **10/10 identical**, so the 2022-07-11 backup is current.

What came out: **2,191 designs, 2,140 ratings, 4 relics**, 6.8 MB of JSON.

The ratings are **TrueSkill**, not a win count: `{mu, sigma, rating, n}` with `n` the number of
matches, up to 4,945 for a single design. `rating` is the conservative estimate. That is the half
the 492-design analysis did not have.

Packed to **394 KB gzipped, losslessly** (`tools/cloud/corpus-pack.py`, verified field-for-field by
`corpus-verify.py`), which is 8.7% of the notebook and small enough to be a file attachment.
Almost all of the 6.8 MB is repeated key names — `type`, `pos`, `dir`, `overrides`, `name`, `value`
once per component, 45,804 times. Dictionary the strings, flatten each record to a fixed tuple, and
what is left compresses 17×.

**The first pack was lossy and the round-trip caught it.** It dropped `overrides` as runtime state.
`overrides` is on 24,977 components, is never empty, and looks like
`[{"name": "output", "value": 180}]` — it is a Constant's actual value. Dropping it would have
thrown away what most of the designs say while reporting "2191/2191 identical", because the
comparison only checked the fields the packer had chosen to keep. The verifier compares every
field now, in both directions, and reports the override count as its own line. 33,624 carried.

Five ratings name a design that is not in `assets/ships`, each with ~4,850 matches. They are carried
as `orphanRatings` rather than dropped: heavily played ships whose spec is gone is evidence that the
corpus is incomplete, and silently discarding them would hide that.

### What the ratings say, at a glance

Not the re-analysis — one histogram, over the 1,455 designs with a rating and at least 30 matches:

```
                 n     parts/ship   Binary   Radar   Constant   Engine   Armour
  bottom 25%    363        7.1        4.6%    6.0%     19.7%     22.7%     6.2%
  top 25%       363       30.7        7.3%    4.4%     17.2%     21.8%    15.1%
```

Corpus-wide, Binary is 1 per 16.6 components (the 492-design figure was 1 per 15, so that holds).
But **the top quartile carries 59% more Binary than the bottom** (7.3% against 4.6%) and two and a
half times the Armour, on ships four times the size. The earlier reading — "the teaching existed and
players still built `Constant -> Engine` bricks" — is unchanged as a statement about the *median*
design, but the bricks are also what **loses**. That is a different claim from the one in
§"The corpus is the most valuable artifact" and it is **one histogram, not an analysis**: size
confounds everything here, a 30-part ship has more of every component, and no attempt has been made
to separate composition from mass.

### A negative result on the relics

The 2022-07-11 backup's `relics` subtree was extracted with `tools/cloud/rtdb-subtree.py` (byte-scan
and brace-match, so a 569 MB dump does not have to be parsed) and compared to the live one. The
first comparison said all four differ. **It was a formatting artifact.** The Realtime Database
stores arrays as children keyed `"0"`, `"1"`, …; the REST API coerces dense numeric-keyed objects
back into arrays and a backup dump does not:

```
2022 backup: "pos": {"1": 0, "0": -1}
live       : "pos": [-1, 0]
```

After normalising dense numeric-keyed objects back to lists, **the whole subtree is identical** —
all four relics, component for component and wire for wire. So nothing was added or lost between
2022-07-11 and 2026-08-20, and the differ was reporting representation. Same failure mode as
`feedback_cellwise_differ_can_be_a_formatting_artifact`.

So the answer to "is the missing content in the cloud" is **no**. It is in the APK, and it was
missed. The cloud's contribution is the corpus and the shipped relic names.

### The other APK

`TargetAquiredWithRelicV2.apk` (Tom, 2026-08-20) is **older**, not newer: Unity **5.4.0f3** (2016),
package `com.google.firebase.unity.auth.testapp`, five scenes and no missions at all. It is a
development build — it ships `PlayerConnectionConfigFile`, which only a profiler-enabled build has.
Its one point of interest is `Assets/scenes/screens/Interstellar.unity`, a screen that is **not** in
the 1.49 scene list, so something was cut between 2016 and 2019. Not extracted.

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
