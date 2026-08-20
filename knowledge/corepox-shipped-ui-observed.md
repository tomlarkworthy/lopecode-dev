# The shipped Corepox, observed running (2026-08-20)

What the retail APK actually looks like and how it behaves, captured from the emulator on
2026-08-20 so the port can be worked on after the emulator is gone. Everything here was seen on
screen; where a number is measured, the screenshot it came off is named. Where something was
inferred rather than seen, it says so.

This is the companion to `knowledge/corepox-extracted-design.md`, which covers what was recovered
from the Unity project and the APK's assets. That document is about the *sources*; this one is
about the *running game*.

**Why it exists:** every finding before this date came from sprites and decompiled C#, and two of
them were wrong (`corepox-extracted-design.md`, "The shipped game runs"). Tom, mid-session:
*"I feel like the biggest gaps are in the dataflow conenctors, and also the mission feels in our
port so far."* Those two are the subject.

## Reproducing the capture

The emulator is `vendor/android-sdk` (gitignored, ~10 GB). Anonymous auth on the live
`corepox-staging` Firebase project must be enabled or the build stops at the splash — Tom enabled
it on 2026-08-20.

```
tools/corepox-emulator.sh setup     # one-shot: SDK, system image, AVD
tools/corepox-emulator.sh boot
tools/corepox-emu-drive.sh tap|swipe|shot|skip|log
```

The device is 1080x2340; every coordinate below is device pixels at that size. `skip` taps
(913, 2135), the cutscene skip button.

Raw captures land in `tools/screenshots/emu/`, which is **gitignored** — 172 files, 197 MB, and
they will not survive a clean. The 43 frames this document argues from were downscaled to 720 px
and converted to AVIF (13x smaller, and this is neon line-art on a photographic plate, which is the
case AVIF is good at) into **`data/corepox/shipped-ui/`**, which is tracked. Every image named
below is in there. So the document remains checkable with no emulator and no APK.

Two driving facts that cost time to find:

  - **A connection is not made by the drag — the drag only proposes it.** The proposal renders as a
    pale grey curve between the two ports and has to be confirmed with the tick at (141, 2182).
    Four attempts read as "the drag isn't registering" (`59`–`62`) before a native-resolution crop
    showed the curve was there all along (`data/corepox/shipped-ui/63-ports.avif`).
  - **`input swipe` is enough**; `input motionevent DOWN/MOVE/UP` was tried and behaves the same.

## The tile, in device pixels

One tile is **~129 device px** at the default board zoom, measured off the armour in
`data/corepox/shipped-ui/32-joints.avif` (a 460 px crop shown 624 wide, armour 175 px across → 129). The radar's circle is
**exactly 2 tiles** across on the same scale (`data/corepox/shipped-ui/63-ports.avif`), which is the independent check.

Everything below that is given in tiles is that measurement divided through, so the numbers carry
its error — call it ±3%.

## Screen flow

```
MISSION tab  ->  cutscene  ->  board (build)  ->  board (run)  ->  VICTORY  ->  next mission?
                    |                                    |
                 skip btn                          fail -> red X on the objective, restart btn
```

**MISSION tab** (`data/corepox/shipped-ui/06-missions-top.avif`, `data/corepox/shipped-ui/75-list.avif`) is a scrolling list of chapters.
`tutorial` is headed `tutorial  ★ n/7` and holds `birthing, cocoon, run, gunner, connection,
aiming, avoiding`. Each row is a wide dark pill with the mission name and, to its left, a square
button in one of three states: a **green star** once starred, a **green ▶ with a red `!` badge**
for anything unlocked and unstarred, `LOCKED` with a green padlock otherwise. More than one row can
be playable at a time — after `aiming` was won without starring, both `aiming` and `avoiding` sat
in the ▶ state (`data/corepox/shipped-ui/75-list.avif`, `tutorial ★ 5/7`). Below the chapter
sits a locked `Advanced Steering` / `INCREASE LEAGUE RATING` bar. A four-tab bar pins the bottom:
`BUILD  BATTLE  MISSION  SHOP`.

**Cutscene** (`data/corepox/shipped-ui/07-birthing.avif`, `data/corepox/shipped-ui/16-cocoon.avif`) is a full-screen magenta-to-indigo vertical
gradient with one line of yellow text in a dark rounded box near the top, a large piece of art
centred, and a skip button bottom-right. `birthing` reads `I REMEMBER....`; `cocoon` reads
`I MUST SHELTER MYSELF FROM HARM`. The art is the Brain, drawn a metre wide with green circuit
traces radiating from it — the same drawing as the component, which is how the Brain's structure
got confirmed at three magnifications.

**VICTORY** (`data/corepox/shipped-ui/15-after-victory.avif`, `data/corepox/shipped-ui/34-victory2.avif`) is a dark panel: `VICTORY` in yellow,
`Campaign Progress` with a chapter-named progress bar reading `0 … 7` and a star with the count,
`REWARDS` as a row of bordered cards each naming a component and a `x1`, then
`PLAY NEXT MISSION?` with red `NO` / green `YES`. Rewards seen: birthing → `Armour x1, Armour x1`;
cocoon → `Explosive x1`.

## The board

The background is a **photographic nebula plate**, not procedural stars (`data/corepox/shipped-ui/18-cocoon-clear.avif`).
The port generates 260 random circles pinned to the viewport. Whether the shipped plate parallaxes
was not established — the camera never moved far enough in any capture to tell.

Board furniture:

  - back arrow, top-left (121, 240)
  - **objective chips** down the left: a green rounded pill per objective, text mixing white and
    colour-coded nouns (`protect core from mines` has `core` green and `mines` red). A circle at
    the left end fills with a green ✓ on completion and a red ✗ on failure (`data/corepox/shipped-ui/67-now.avif`).
  - a **restart** button top-right on missions that can be failed (circular arrow)
  - bottom-left: ▶ play, ⏸ pause while running, or nothing while a build is incomplete
  - bottom-right: 🔧 wrench while there is inventory left, ★ star when the mission is won
  - **jump zones** (`data/corepox/shipped-ui/36-run-board.avif`): yellow wireframe funnels — nested ellipses drawn in
    perspective — filling the top and bottom edges of the arena.

The `CLAIM VICTORY` / `SELECT` / `DRAG` / `ANGLE IN` / `ANGLE OUT` / `DANGER` / `KILL` labels are
**yellow rounded chips with a leader line** pointing at the thing they name. They are the game's
whole tutorial mechanism; there is no separate tutorial overlay.

## Building

1. Tap the wrench. A **`Choose build option`** panel covers the screen: one row per stock item,
   each row an icon of the component on the left, the name in yellow inside a red-outlined
   chevron, `xN` at the right, and a yellow `i` info button. `CANCEL` bottom-right.
2. Tap a row. The panel closes and **every legal placement appears at once as a ghost** of that
   component (`data/corepox/shipped-ui/19-armour-place.avif` shows two ghosts, above and below the core).
3. Tap one ghost. That one piece is committed; the others vanish (`data/corepox/shipped-ui/28-a.avif`).

The stock count does not decrement until the piece is committed — re-opening the panel after
step 2 still reads `x2` (`data/corepox/shipped-ui/27-s.avif`). Placement is not free-hand: only the ghosted cells are
legal, and pieces sit flush at the tile boundary with no gap.

`birthing` is `CORE x1` and one legal cell. `cocoon` is `ARMOUR x2` with the two cells that shield
the core from the mines above and below.

## Selecting a component

Tapping a placed component opens a menu headed with the component's type name, holding a 3x2 grid
of icon buttons (`data/corepox/shipped-ui/37-select.avif`, `data/corepox/shipped-ui/43-const-menu.avif`, `data/corepox/shipped-ui/57-radar-menu.avif`):

```
[ i info ]   [ o—o connect ]   [ ✕ cut ]
[ ✛ move ]   [ ⟳ rotate   ]   [ ✗ delete ]
```

Enabled buttons are drawn with a bright border (yellow for info, blue for connect/cut, red for
delete); disabled ones are dimmed to a dark red outline. `cut` only lights up once the component
has a connection (`data/corepox/shipped-ui/51-s.avif`).

**A Constant additionally gets a stepper** below the grid (`data/corepox/shipped-ui/43-const-menu.avif`): a wide grey pad,
the value in green in a rounded box, a wide grey pad. Tapping the right pad increments by 1. The
value propagates immediately — the turret's angle socket and the barrel both follow while the menu
is still open (`data/corepox/shipped-ui/44-s.avif`, `data/corepox/shipped-ui/45-s.avif`).

## Connecting — the part the port does not have

`connect` puts the board in wiring mode:

  - the label chip changes to **`DRAG`**
  - **every legal port gets a black-and-white chequered ring**; ports that are not legal targets go
    flat grey (`data/corepox/shipped-ui/38-s.avif`, `data/corepox/shipped-ui/59-radar-conn-s.avif`, `data/corepox/shipped-ui/63-ports.avif`)
  - a **thumbnail of the ship with the proposed wire routed** appears bottom-left
  - drag from one port to another. The proposal draws as a **pale grey curve** along the route it
    would take (`data/corepox/shipped-ui/63-ports.avif`)
  - confirm with the green tick bottom-left, labelled `FINISH CONNECTING` (`data/corepox/shipped-ui/49-s.avif`)

Once committed the wire is drawn permanently, and this is the single most distinctive thing on
screen: **a thick bright-green glowing curve that leaves the source socket, arcs clear of the hull,
and comes back into the destination socket** (`data/corepox/shipped-ui/40-wire.avif`). It is a smooth bezier bulge, not an
orthogonal routing, and it passes *outside* the ship rather than through it. Stroke is roughly
0.08 tiles with a heavy bloom. Where source and destination are adjacent and aligned the wire
degenerates to a short straight beam through the joint (`data/corepox/shipped-ui/46-barrel31.avif`).

**A wire's brightness says whether a value is flowing through it, not whether it exists.** With
the source Constant at `0` no wire is visible at all (`data/corepox/shipped-ui/50-s.avif`); at `100` it is a bright green arc
(`data/corepox/shipped-ui/40-wire.avif`). The radar→turret wire in `aiming` sits as a **pale grey curve** for as long as the
radar has no target (`data/corepox/shipped-ui/70-check.avif`) — which reads exactly like an uncommitted proposal, and was
mistaken for one here. The test that separates them: re-open the source component's menu and look
at `cut`. It is enabled only when a connection exists (`data/corepox/shipped-ui/71-menu.avif`), and it was enabled, so the
pale curve was a real wire idling.

## The dataflow visual language

This is the whole of what the port is missing, so it is set out as rules.

**Every port is a disc with its live value written in it.** The disc sits on the component's face.
Reading `data/corepox/shipped-ui/40-wire.avif`, `data/corepox/shipped-ui/33-program.avif` and `data/corepox/shipped-ui/63-ports.avif` together:

| element | look | means |
|---|---|---|
| output port | white glowing disc, **green** numerals | a value this component produces |
| input port | dark disc, **orange** numerals, red/pink ring | a value this component consumes |
| unsatisfied input | dark disc, **red** `0` | connected to nothing |
| angle-typed port | the ring is a **green cog with teeth** | the value is an angle |
| plain numeric port | plain thin red circle | anything else |

The cog ring appears on the radar's `ANGLE OUT` and the turret's `ANGLE IN` and on nothing else
seen, which is what makes it read as a type marker rather than decoration. The turret's second
port — the `1` — is a plain red circle.

Port disc is ~0.28 tiles across; a cog ring around it ~0.6 tiles; a plain red port ~0.4 tiles
(measured in `data/corepox/shipped-ui/63-ports.avif`).

**A Binary component IS the dataflow node.** `data/corepox/shipped-ui/77-binary.avif` is the clearest frame, from
`avoiding`; `data/corepox/shipped-ui/33-program.avif` shows the same thing on an enemy mine in `cocoon`. The green rounded
T-panel that the port already draws as `art_Binary` is, in the shipped game, carrying:

  - a large **purple circle** centred in the panel's wide row, with the **operator glyph** drawn
    inside it — a thick bar for `−` (`data/corepox/shipped-ui/77-binary.avif`), a cross for `+` (`data/corepox/shipped-ui/33-program.avif`)
  - **an output port in the dome** — the semicircular bump on the panel's long edge — drawn as a
    white disc with green numerals
  - **two operand ports**, left and right, on the operator circle's own axis, joined to it by short
    purple stems, drawn as dark discs with a pink ring and orange numerals
  - **beams along the wires** to whatever the node drives — magenta where a value is moving, pale
    grey where it is idle

The footprint agrees with the port exactly. Measured on `data/corepox/shipped-ui/77-binary.avif` (tile = 62 device px in
that mission, the camera being zoomed out about 2.6x from `aiming`): panel 179 x 111 device px =
**2.9 x 1.8 tiles**, i.e. the 3 x 2 grid that `ARTCELLS` already records as
`Binary: [[1,0],[0,1],[1,1],[2,1]]` — `(1,0)` is the dome holding the output, the other three are
the operand/operator row.

| part | tiles |
|---|---|
| operator circle | 0.90 diameter |
| operator glyph | 0.28 wide, 0.10 thick |
| operand port disc | 0.35 |
| output port disc | 0.33 |
| purple stem | 0.06 thick |

The port's `art_Binary` (`data/corepox/shipped-ui/port-art-Binary.avif`) has the panel, the purple circle and
the three stems and **none of the operator glyph, the ports, or the beams**. The panel geometry is
right; the live layer on top of it is absent. That is the single largest visual gap in the port.

**The dome is where an output goes, and it is not unique to Binary.** The turret has the same
semicircular bump on its top edge, and the radar's `ANGLE OUT` sits in a matching yellow housing.
Rotating a component moves its dome — the `cocoon` mine's Binary has its dome pointing down
(`data/corepox/shipped-ui/33-program.avif`) while `avoiding`'s points up (`data/corepox/shipped-ui/77-binary.avif`).

**Joints are lime-green pins, two per shared edge.** `data/corepox/shipped-ui/32-joints.avif` at native resolution: each
seam between two components carries two bright green rounded rectangles straddling it, about
0.22 x 0.09 tiles, centred at about ±0.25 tiles either side of the edge midpoint. A 2-tile-wide
edge therefore carries four (`data/corepox/shipped-ui/46-barrel31.avif`). They are drawn on the seam, half in each
component. When a ship is destroyed they come loose and drift as separate debris (`data/corepox/shipped-ui/67-now.avif`).

## Per-component notes from the running game

**Brain / core.** Rounded outer frame in pale salmon over a red glow; an amber band inside it
slotted into teeth, five per side, wholly enclosed by the frame; a brown-to-black gradient
interior; two cream pins baked into the sprite (left band 4th from top, bottom band 5th from left).
Rebuilt on 2026-08-20 by `tools/corepox-brain-from-sprite.py` — see `corepox-extracted-design.md`
for the measurements. **A lone core rotates slowly on the spot** with nothing attached, about 20°
over 10 s (`data/corepox/shipped-ui/11-core-placed.avif` → `data/corepox/shipped-ui/13-playing2.avif`).

**Armour.** Deep-indigo fill inside a thick white-lavender neon border, small corner radius. The
port already matches.

**Constant.** A square outline holding one output port. Border is green normally, **yellow when
selected** (`data/corepox/shipped-ui/36-run-board.avif` vs `data/corepox/shipped-ui/40-wire.avif`).

**Engine.** Two tiles tall. Upper tile: a green outline with a rounded bottom carrying the thrust
input port. Lower tile: an indigo arch over a dark red block — the nozzle. The port's `art_Engine`
matches the silhouette but renders 5.7% narrow and 4.1% short (`tools/corepox-art-ink.py`), for the
reason recorded in `corepox-extracted-design.md`.

**LaserTurret2.** Two tiles wide. A yellow-outlined panel with a **semicircular dome bump** on its
top edge, two input ports on its face (`ANGLE IN` with a cog ring, and a plain `1`), and a small
pale-green triangular aim indicator by the dome. The **barrel** is a salmon-outlined tube with
magenta rungs across it, pivoting about the dome centre. While aiming, a **dashed yellow ray**
extends from the barrel across the whole arena showing the line of fire (`data/corepox/shipped-ui/55-aiming.avif`).

  - **The angle input is in degrees, positive clockwise from the ship's forward direction.**
    Measured directly: with the Constant at 31 the barrel sits 31.3° clockwise of vertical — pivot
    at the dome centre (390, 250) in the crop, tip at (530, 20), `atan(140/230) = 31.3°`
    (`data/corepox/shipped-ui/46-barrel31.avif`). At 0 the barrel is vertical. This is one measurement at one value, so it
    fixes the sign and the unit but not linearity.
  - The turret fires on its own once a target is in line; there is no fire button (`data/corepox/shipped-ui/47-s.avif`).

**Radar.** Three tiles tall by two wide. The top 2x2 is a **thin green circle exactly 2 tiles
across** with a small green dot at its centre and a **needle** — a thin green line from the centre
to the rim, one tile long, ending in a hollow triangular arrowhead — which points at the target.
The bottom row is a yellow rounded housing carrying the `ANGLE OUT` port with its cog ring. A
second small green triangle sits at the lower right of the circle.

  - **The scan ping is real and visible**: while running, a bright green ring grows from the centre
    out to the rim inside the circle (`data/corepox/shipped-ui/65-s2.avif`), matching the `scan` localScale 0→max 1 s loop
    recorded from the C#.
  - This confirms Tom's annotation on `h_Radar` — *"I think we shipped something with a circle for
    the 2x2 top part"* — and the trace that was in the notebook before
    `tools/corepox-radar-from-sprite.py` was a different, earlier design.

**Explosive / mine.** A dark red rounded square with a yellow-and-orange starburst filling it, and
a port disc at the centre of the starburst. Idle it shows a plain yellow disc; armed it carries a
value (`data/corepox/shipped-ui/33-program.avif` shows `-48`).

## Mission feel, mission by mission

The thing the port is being measured against. Ordered as shipped, with the port's id.

**1 birthing / PlaceBrain.** One build option, `CORE x1`, one legal cell, and the objective
`place core` ticks the moment it lands. Press play; the lone core drifts and rotates; `CLAIM
VICTORY`. There is no opposition. It exists to teach the wrench and the ghost-slot placement.

**2 cocoon / Cocoon.** `protect core from mines`. Two mine ships, one above and one below, each
drawn as **two Explosives plus a Binary panel running `-48 + 1`** with its beams live on the board
(`data/corepox/shipped-ui/18-cocoon-clear.avif`). Build `ARMOUR x2` into the two shielding cells, play, the mines run in and
detonate, the armour absorbs it, the objective ticks. The lesson is that the enemy's program is
readable before you commit — you can see what the mine computes.

**3 run / ConnectionLite.** `get to jump zone`, `connect constant to engine`. A four-cell ship —
Constant, Brain, Engine (2 tiles) — with the Constant's output green `0` and the Engine's input red
`0`. One connect gesture wires them, the Constant reads `100`, the Engine fires and the ship
crosses to the jump zone. Both objectives ticked on the same action (`data/corepox/shipped-ui/39-drag.avif`). This is where
the arcing green wire is introduced.

**4 gunner / ManualAim.** `eliminate threats`, `adjust turret angle using constant`. One enemy
marked `KILL`. A turret already wired to a Constant; the whole mission is opening the Constant's
stepper and walking the value up until the dashed ray crosses the target — 31 in this run. The
turret then fires unprompted. Teaches the stepper and the angle convention.

**5 connection / Connection.** `get to jump zone`, `connect constant to engine`, `adjust constant
to affect engine`. `run` again with the third objective, and **two rival ships flying the same
puzzle alongside**, each with its own green wire and its Constant reading `100`
(`data/corepox/shipped-ui/51-s.avif`). It is a race, and the rivals are visibly running the program you are about to write.

**6 aiming / Aim.** `connect radar angle to turret angle`, `destroy 4 incoming enemies`, `defend
your core`. A shell of eight Armour around a Brain, a Radar, and a turret. The connect is
radar `ANGLE OUT` → turret `ANGLE IN`, and from then the turret tracks by itself. **This mission
can be lost**: in the captured run the core died with one enemy left, the third objective took a
red ✗, and the ship came apart into drifting components and loose joint pins (`data/corepox/shipped-ui/67-now.avif`).
Restarting and wiring the radar properly won it on the second attempt (`data/corepox/shipped-ui/73-s.avif`).

An objective chip is not necessarily a tracked condition. `connect radar angle to turret angle`
never ticked, on either attempt — not when the wire was committed (`cut` enabled, `data/corepox/shipped-ui/71-menu.avif`),
not while the turret was demonstrably tracking, and not when the mission was won. The mission
completed with that chip still empty, and the star was awarded. So some chips are prompts. The
enemies are kamikaze mine ships — engine, a Constant of `40`, an Explosive.

**7 avoiding / Avoid.** `get to jump zone`, and one `JUMP ZONE` funnel directly below the
ship. The ship is the tutorial's finale and its whole point: a Constant labelled `CONTROL`, a Brain,
a **Binary node running `−`**, and **two Engines side by side** (`data/corepox/shipped-ui/76-avoid.avif`, `data/corepox/shipped-ui/77-binary.avif`).
The Binary subtracts and drives the two engines differentially, so the Constant steers the ship
rather than accelerating it — raising `CONTROL` to 10 visibly rotates the hull while it is still in
the menu (`data/corepox/shipped-ui/79-s.avif`). `connect` and `cut` are both disabled on the Constant here: the wiring is
fixed and the mission is purely about the value. Three mines hang across the top of the arena to be
steered around.

This is the mission that names the game. Everything before it teaches one piece — placement,
shielding, a wire, a constant, a race, a sensor — and this one puts a computation between the input
and the actuators.

## What is still unknown

  - Nothing past the tutorial chapter was played. All 7 tutorial missions were.
  - Which operators the Binary node can show beyond `+` (`data/corepox/shipped-ui/33-program.avif`) and `−`
    (`data/corepox/shipped-ui/77-binary.avif`).
  - Whether the nebula plate parallaxes with the camera.
  - Whether the turret angle mapping is linear beyond the single point at 31.
  - The turret's second input (the `1`) was never changed, so what it does is unknown.
  - Nothing was measured about timing — thrust per unit of Constant, mine speed, scan period in
    seconds. The scan looks like about a second, which is consistent with the C#, but it was not
    timed.

## What the port does with this, as of 2026-08-20

The observations above were made to be spent. This section is the ledger: what changed in the
notebook the same day, and what is still only written down. Both halves matter — the second one is
the work list.

**Ported.** All of these are in `lopebooks/notebooks/corepox.html` and driven by
`tools/corepox-qa-campaign.ts`, which plays all nine missions by clicking (9/9 after the rewrite,
same as before it).

| shipped thing | where it now lives |
|---|---|
| tap a component → 3×2 action menu, disabled where inapplicable | `corepox-game._MENU_ACTIONS`, `menuPanel()` |
| wrench → `CHOOSE BUILD OPTION` rows with icon, name, `xN`, `i` | `buildPanel()` |
| ghosts of the real component at every legal cell, tap one | `paintOverlay()`, `legalCells()` |
| Constant stepper, value propagating live | `menuPanel()`, ±1 / ±10 pads |
| connect: chequered legal ports, grey illegal, pale proposal curve, `FINISH CONNECTING` | `paintOverlay()`, `commitWire()` |
| objective pills with a ✓/✗ circle | `paintHud()` |
| jump zone as a yellow perspective funnel with a leader-line chip | `paintOverlay()` |
| `KILL` chips on the mission's target | `boardChip()` |
| the wire as a bright curve arcing **outside** the hull, coloured by its value | `corepox-render._wireNode` |
| board zoom near the shipped tile size | `battlefield` `api.pad`, `view.pad` |
| three mines in `avoiding`, two rivals in `connection`, shipped mission names | `corepox-missions` |

Two of those were bugs the observation found rather than features it added:

  - **The wire was invisible on the mission that teaches wires.** It was the recovered
    `connection-N-0` sprite, which bows about 4% of its length, drawn *under* the hull — so on
    `run` it ran straight through the Brain and could not be seen at all. `40-wire.avif` shows the
    shipped wire arcing clear of the hull and crossing the Constant's own box, so it is now a cubic
    with controls offset 0.36 L, drawn over the hull. Measurement and the discarded sprite are
    recorded in the cell.
  - **The team tint was destroying the value colouring.** `hue-rotate(190deg)` sat on the whole ship
    group, so a positive connector's green came out the same magenta a negative one paints. Found by
    `tools/corepox-wire-probe.ts`, which read `rgb(190,255,119)` off the paths under a filter that
    then moved them. The tint is on the hull only now.

Three more went in the same day off Tom's own screenshot of `aiming`:

  - **The barrel hung off the panel.** It turned about the anchor (111,124), which is the gear ring
    at the centre of the angle-port cell. The art joins the two at the dome: the barrel's butt quad
    centroid is (144.95, 93.56) and the panel's peak sits on the top edge between (111, 91.73) and
    (172.43, 91.73), midpoint (141.7, 91.73) — 3 units apart, which is what says the butt is the
    hinge. `ART_TURRET_DEG` moved with it, 64.2 → 68.82, because the authored angle is measured
    from the hinge (`atan2(119.1, 46.2)` to the muzzle tip at (264.05, 47.41)); the old value came
    off the anchor and the corner of a bounding box.
  - **A port vanished when it had no value.** A Radar with no target sets `dist`/`bearing` to `NaN`,
    and the renderer hid the whole disc — so the component the mission is about had no visible
    outputs, and connect mode chequered a ring around nothing. `63-ports.avif` has a disc on every
    port of that ship. A port is a socket now: it draws regardless and reads `–` when empty.
  - **The camera followed the opponents.** `framed = null` meant it had to contain every ship in the
    world, so `connection`'s rivals and `avoiding`'s mines pulled it open until the hull was a few
    pixels. It frames the player only; `minSpan` is per-mission and already sized to the fight.

**Not ported.** Each of these is described above and none of it is in the notebook:

  - **The turret's dome is a triangular peak in our art, a semicircle in the shipped game**
    (`46-barrel31.avif` against `art_LaserTurret2`, whose panel path is
    `L111,91.73 L143.46,57.53 L172.43,91.73`). The recovered Sketch file is a different design pass,
    the same way its radar trace was — Tom's note on `h_Radar`, "I think we shipped something with
    a circle for the 2x2 top part". The barrel's butt is meant to be hidden inside that dome and
    ours overhangs.
  - **The aim indicator does not turn.** The pale-green triangle at (139.6,111.6)-(154.8,109.8) is
    authored into `turret2-base`; in `46-barrel31.avif` it sits inside the dome pointing along the
    barrel. Moving it means splitting the art a third time.

  - **Joints as lime-green pins.** Two per shared edge, ~0.22 × 0.09 tiles, coming loose as debris
    when a ship breaks. Measured in `32-joints.avif`; nothing draws them.
  - **The turret's dashed yellow line of fire** (`55-aiming.avif`) and **the radar's scan ping**
    (`65-s2.avif`). The engine has both states; the renderer draws neither.
  - **The thumbnail of the ship with the proposed wire routed**, bottom-left during connect.
  - **The cutscene**, the mission list with its star counts, and the `VICTORY` panel's reward cards.
    The port shows spoils as one line of text.
  - **`move` is best-effort.** It re-anchors the component and shifts every wire that ended on it,
    but the shipped game's move affordance was never watched closely enough to say whether that is
    what it does.
  - **Which side a wire bows to.** One frame, one direction. A rule that routed around the hull
    would need the ship's occupancy and no observation demands one yet.
