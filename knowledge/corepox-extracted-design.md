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
