# Corepox UX — a brief for whoever designs the next interface

**Status, 2026-08-21.** Nothing here is implemented. This is a handoff document: what the interface
does today (measured), why it does not work for the game we now have, and what the replacement has
to satisfy. Where a decision is open it says so; where a number is a guess it says so.

The one-line problem: **the port inherited a build-then-run interface, and half the campaign is a
realtime fight you build inside.** Six of the twelve missions set `live: true` and start with the
clock already running (`corepox-missions`, `grep -c "live: true"` → 6). The interface those six
missions get is a full-screen modal stack designed for a paused board.

---

## 1. What the current interface costs, measured

`tools/corepox-tap-count.ts` is `corepox-qa-campaign.ts` with a counter on every real click. It
plays the campaign to its recorded solutions through the UI, so these are the taps a player makes,
not an estimate:

```
TAPS    4  PlaceBrain            1 parts  0 wires   build 3   param 1
TAPS    7  Cocoon                3 parts  0 wires   build 6   param 1
TAPS    5  ConnectionLite        3 parts  1 wires   wire 5
TAPS   11  ManualAim             3 parts  1 wires   param 11
TAPS   17  Connection            3 parts  1 wires   param 12  wire 5
TAPS   11  Aim                  14 parts  2 wires   param 1   wire 10
TAPS    7  Avoid                 5 parts  3 wires   param 7
TAPS   10  FollowCourse         10 parts  6 wires   wire 10
TAPS   30  FollowCourseAdvanced 16 parts  6 wires   wire 30
TAPS   64  FollowBoss            7 parts  6 wires   build 18  param 16  wire 30
TAPS   29  SideShooter           5 parts  2 wires   build 6   param 13  wire 10
TAPS   41  TwinTurrets           9 parts  2 wires   build 18  param 13  wire 10
```

The counts are not noisy — they are exact multiples, because the flows are fixed-length:

| action | taps | what they are |
|---|---|---|
| place one part | **3** | wrench → a row in the full-screen `CHOOSE BUILD OPTION` panel → a ghost |
| draw one wire | **5** | the component → `connect` → source port → sink port → `FINISH CONNECTING` |
| set a Constant to 100 | **12** | the component → `+10` ten times → `CANCEL` |
| set a Binary to MINUS | **3** | the component → `MINUS` → `CANCEL` |

Check the arithmetic against the table: FollowBoss places 6 parts (18), draws 6 wires (30), sets one
Constant to 100 (12) and one Binary (3) = 63, plus one tap to start = **64**.

**Six missions are `live: true` — the clock is already running when you start clicking.** Every tap
in those six is made under fire, and there is no pause (§4):

```
ConnectionLite         5   ManualAim   11   Connection  17
FollowCourse          10   Avoid        7
FollowCourseAdvanced  30
```

**Thirty consecutive taps of wiring, in a moving fight, is FollowCourseAdvanced as it ships today.**
FollowBoss's 64 is worse in absolute terms but it is `live: false`, so those taps are made with the
clock stopped — it is the one mission with a real build phase, and `buildOnce` means you get that
phase once.

The stepper is the sharpest single number: **a Constant of 100 costs twelve taps** and there is no
other way to enter it. A mission needing 137 would cost 13 + 7 + 2 = 22. Nothing in the engine
requires this; `setParam` takes a value.

---

## 2. The state machine as it actually is

There is no single mode variable. There are six independent ones in `corepox-game`, and the
reachable combinations are the interface:

```
S.state   "build" | "playing" | "win" | "loss"          the mission
panel     "none" | "build" | "menu" | "info"            what covers the board
act       null | "connect" | "move" | "cut" | "info"    the armed verb
picked    null | <component type>                       a part in hand
wire      null | {from} | {from,to}                     a proposal, uncommitted
sel       null | {px,py}                                the selected component
```

`editable()` is `S.state === "build" || S.state === "playing"` — so every one of those overlay
states is reachable *during a live fight*, which is the design problem in one line.

What a mission permits is separate again, per-mission, and read by `canDo`:

```
allow: {build, connect, modify, rotate}      delete is gated on `build`
```

Across the twelve missions: `build` on 7, `connect` on 8, `modify` on 8, `rotate` on 3.
`PlaceBrain` and `Cocoon` allow only `build`; `ManualAim` and `Avoid` allow only `modify`;
`ConnectionLite` and `Aim` allow only `connect`. The last four missions allow all of it.

**This is a feature, not clutter.** The tutorial teaches one verb per mission by removing the
others. Any redesign has to keep per-mission capability gating — the new interface must be able to
show a *subset* of itself without looking broken.

---

## 3. What a gesture means today, and the collision

Measured by `tools/corepox-gesture-probe.ts`. The play arm is a controlled pair — identical mission,
identical elapsed time, drag in one arm and an equal wait in the other — because during play the
camera follows the ship and a single reading cannot separate a pan from a follow.

```
BUILD   drag from (0.25,0.30) to (0.55,0.60)
        viewBox  -280 -174 560 348  ->  -448 -279 560 348      camera panned 168 x 105
        pilot cmd  {"target":null,"face":null}                 no move order

PLAY    the same drag
        pilot cmd  {"target":[-27.41,-13.63],"face":121.9}     a move order with a facing
        play viewBox, drag arm minus control arm:  0 0 0 0     the camera did not move at all
```

So: **the same gesture pans the camera in build and flies the ship in play, and there is no way to
pan during play.** The pan is not merely overridden, it is locked out — the flight handler sets
`view.panLock` on pointerdown.

The full current table:

| gesture | build | play |
|---|---|---|
| wheel | zoom, anchored on the pointer | same |
| drag on empty space | pan | **fly there, facing the drag direction** |
| drag on your own hull | pan | select the component under it |
| tap empty space | deselect | fly there |
| tap your own hull | select → 3×2 verb menu | same |
| tap a ghost (while `picked`) | place | place |
| tap a port (while `act==="connect"`) | wire endpoint | wire endpoint |
| `W A S D` | — | thrust / yaw |
| `F` | — | fire |

Two things fall out of this that the designer should know:

- **A drag has to carry two orthogonal quantities during play** — where to go, and which way to
  point on arrival. That is why it is a drag and not a tap. Any replacement must still express
  both, or the manual-flight missions lose a control.
- **Keyboard flight and pointer flight fight each other.** `applyDrive` clears `S.cmd.target` when a
  key is held, and the pointer handler clears `held`. They are two exclusive control schemes sharing
  one command object, and the interface never says which one you are in.

---

## 4. There is no pause — and in the original, **building was** the pause

Tom, reading the first draft of this brief: *"There is no pause, and there was one, I think in some
modes building should pause."* That is not a new idea. It is what shipped, and the recovered C# is
more specific than the proposal it replaces. Everything in this section is read out of
`vendor/corepox/Meritocracy/Assets/scripts`, not inferred.

### 4.1 Every edit verb paused the game, automatically

`UIState.cs`. Not a button the player presses — a side effect of starting to edit:

```
Build state init()      Controller.Instance.pause();  then BuildDialog.show(...)     UIState.cs:669
clickMove()             Controller.Instance.pause();                                 UIState.cs:471
clickRotate()           Controller.Instance.pause();                                 UIState.cs:479
clickDelete()           Controller.Instance.pause();                                 UIState.cs:497
clickConnect()          -- no pause --                                               UIState.cs:~440
clickDisconnect()       -- no pause --
clickInfo()             -- no pause --
```

**The asymmetry is the interesting part, and it is consistent.** Build, move, rotate and delete all
change the ship's *mass and geometry* while it is flying. Connect and cut change only the dataflow.
Only the first group stops the world.

`UIAction.Play` resumes, and the comment on it says what the pause is protecting against:

```csharp
// If the player has mutated the ship while paused, it might now be disconnected
if (Controller.Instance.game.playerShip)
    Controller.Instance.game.playerShip.maybeSplit();
Controller.Instance.play();
```

### 4.2 There are two kinds of pause, and the mission picks one

`Controller.pause()`, on `uiSettings.kinematicPauses`:

```csharp
public void pause() {
    paused = true;
    if (uiSettings.kinematicPauses) {
        foreach (Ship ship in space.ships.Keys) ship.body.isKinematic = true;
        Time.timeScale = timeScale;   // Even paused have simulation running for kinematic mdoe
    } else {
        Time.timeScale = 0;
    }
}
```

- **Hard pause** (`kinematicPauses = false`) — `Time.timeScale = 0`. Everything stops. This is the
  default (`UISettings.cs:5`) and therefore what every campaign mission gets.
- **Kinematic pause** (`kinematicPauses = true`) — the ships' rigidbodies freeze but *the clock keeps
  running*. Turrets still turn, radars still scan, dataflow still propagates, particles still fly.
  The only thing that stops is the ships moving. Set in exactly one place:
  `LiveDesignMission.cs:55` — the ship editor reached from the menu, which is the shipped equivalent
  of `corepox-shipyard`. (`ShipSnapshotController` sets it too, for server-side rendering.)

The comment's typo — *"mdoe"* — is quoted because it is the author's own note that this is a
deliberate mode and not an accident.

**Kinematic pause is a better idea than the "bullet time" this brief proposed in its first draft,
and it is already designed.** It answers the same question — how do you edit a live dataflow without
either freezing it or being shot — but it separates the two things a player needs to watch. The
*program* keeps running so you can see what your wire does. The *fight* stops so you are not hit
while doing it.

### 4.3 Pause is invulnerability, and that is the balancing cost

`ShipComponent.damage()`:

```csharp
public void damage(int amount) {
    if (Controller.Instance.paused) {
        // No damage taken on pause
        StartCoroutine("displayDamage");     // the flash still plays
    } else if (this.hp > 0) {
        this.hp -= amount;
        ...
```

So while paused you take **no damage at all** — the hit flashes and does nothing. `Ship.thrust()`
early-returns while paused too (`Ship.cs:439`), so you cannot fly either.

This is the piece that makes auto-pause-on-build safe to give away: pausing to build is not free,
because you also stop moving, stop shooting and give up the initiative. It is a *stance*, not a
timeout.

### 4.4 Live missions had no pause button

`UIStates.IDLE.init()`:

```csharp
if (settings.liveMode) {
    Controller.Instance.play();
    this.setBottomLeft(null);          // no play/pause control at all
} else if (Controller.Instance.paused) {
    this.setBottomLeft(UIAction.Play);
} else {
    this.setBottomLeft(UIAction.Pause);
}
```

In a live mission the only way to stop the clock is to **start an edit**. Once an edit has paused
you, the selection menu does offer `▶` to resume (`Selected.init()` sets bottom-left on
`Controller.Instance.paused`). So the control exists, it just cannot be reached without first
committing to doing something.

That is a real design decision and it should be preserved deliberately or overturned deliberately —
not lost again.

### 4.5 What the port has

None of it. `corepox-game` has `▶` in `build` and a clock in `playing`, and no pause anywhere
(`corners.bl`). Edits during play do not stop the world, and damage lands while the build panel
covers the board.

So the current answer to *"how do I build during a fight"* is: you do not stop, you just tap faster
through modals. That is the whole of it.

---

## 5. Two editors, two opposite interaction models

Both are in the notebook, and they disagree about the most basic question.

**`corepox-game` is noun-first.** Tap a component, get a 3×2 grid of verbs
(`info connect cut / move rotate delete`), disabled where inapplicable. This was a deliberate move
away from a toolbar, recorded at the time: *"The old toolbar (build/connect/rotate/modify) had the
player choose a verb before choosing a noun, which is backwards from the game and is most of why the
port 'is currently not very good'."*

**`corepox-shipyard` is verb-first**, and still has that toolbar:
`select build connect rotate modify erase`, six exclusive modes, plus an always-visible parts tray
while in `build`.

They are not the same product surface — the shipyard is a workbench and the game is a game — but a
player who uses both learns two contradictory models. Worth an explicit decision rather than drift.

**And the shipyard's tray is closer to what the game needs.** It is always visible, it does not
cover the board, and the picked part *stays picked*, so placing five parts is five taps and not
fifteen. The game threw that away to match the shipped modal.

---

## 6. Requirements

What the replacement has to satisfy. R1–R4 are hard; R5–R8 are what "immersive" has to cash out to.

- **R1 — Building during play is the normal case, not the exception.** Six of twelve missions start
  live. Building may *stop* the clock — that is what shipped and it is wanted (§4) — but nothing may
  require the player to have stopped it *first*, and no mission may be unbuildable while live.
- **R2 — Per-mission capability gating survives.** `allow: {build, connect, modify, rotate}` must
  still be able to show one verb and hide five without the interface reading as broken.
- **R3 — Nothing full-screen while the clock runs.** The board is the game; a panel over it during a
  fight is a hit you cannot see coming.
- **R4 — Every value stays legible.** Ports already draw a disc with the live value and read `–`
  when empty; wire brightness already encodes flow. This is the game's actual subject matter and it
  must not be traded for screen space.
- **R5 — Placing many parts costs about one gesture each.** Target: `build` taps ≈ parts placed.
- **R6 — Drawing a wire is one gesture.** Target: `wire` taps ≈ wires drawn.
- **R7 — Setting any Constant is one gesture, and its cost does not scale with the value.** Twelve
  taps for `100` and twenty-two for `137` is the defect.
- **R8 — The camera is controllable at all times**, including during a fight.

R5–R7 are checkable, not opinions: re-run `tools/corepox-tap-count.ts` against the new interface and
compare the table in §1. A design that hits them turns FollowCourseAdvanced's 30 taps-under-fire
into 6, and FollowBoss's 64 into roughly 15.

---

## 7. Proposed model

Recommended, with the alternatives and their costs. The designer should feel free to reject any of
it — but should read §3 and §6 as constraints rather than suggestions.

### 7.1 One mode axis, and it is the clock — not the verb

```
LIVE          the clock runs, ships move, damage lands.
KINEMATIC     the clock runs, ships are frozen, no damage.   the program keeps going
HARD          the clock is stopped.                          nothing moves at all
```

All three shipped (§4.2). Which of the two pauses a mission uses is a per-mission property; the
transition into one is a side effect of starting a build-class edit, not a button. **Free camera and
every permitted edit are available in all three** — that is the change from today, where the overlay
states are their own mode axis on top of this one.

That is the whole mode axis. `win` and `loss` are end screens, not modes. Everything the current
`panel` / `act` / `picked` / `wire` variables encode becomes **transient gesture state** — what your
finger is currently doing — rather than a mode you enter and must leave.

**Why not keep a build/fly mode split:** a mode switch in the middle of a realtime fight is the
thing that makes building-under-fire feel bad, and R1 says that is the normal case. The cost of
dropping it is that the pointer has to be disambiguated some other way — §7.2.

**What `▶` becomes.** The transition between the two is mostly *implicit*: starting a build-class
edit pauses, exactly as the shipped game did, and `▶` resumes (§4.1). Whether a manual pause button
also exists is a per-mission decision the original made deliberately — live missions had none
(§4.4). This is a restoration, not an invention, and it hands the game a tempo lever it currently
lacks: see §8.

### 7.2 What a press means: decided by what is under it, not by a mode

| press starts on | drag | tap |
|---|---|---|
| **a port** | draw a wire to wherever you release | select the component |
| **your own hull** (not a port) | move that component to a legal cell | select the component |
| **an enemy or empty space** | fly: go there, facing the drag | fly: go there |
| **the parts shelf** | carry that part onto the board and place it | pick it up (sticky) |
| **two fingers / middle button / space-drag** | pan the camera | — |

The hull/sky split is already half-built — the flight handler has
`if (S.player.at(lx, ly)?.hp > 0) return; // tapping your own hull is an edit`. This makes that line
the rule rather than an exception to it.

**Camera pan needs its own gesture** because the board no longer has a spare one. Options, all
costly in a different way:

- *Two-finger drag.* Standard on touch, free on trackpads, **impossible on a mouse** — and the game
  is played on both.
- *Middle-drag or space-drag.* Free on desktop, **absent on touch**.
- *Both, plus an on-screen nub.* The honest answer. The nub only appears when the camera has
  actually been moved, exactly as the `⌖` recentre pad does now.

**Recommendation:** both, plus the nub. Do not try to find one gesture that works everywhere; there
isn't one, and pretending otherwise is how the drag ended up meaning two things.

### 7.3 Placing parts — the Bad Piggies shelf

Tom's reference. **Caveat: this description of Bad Piggies is from memory, not from a capture.**
Someone should spend ten minutes with the real thing before the shelf is designed around it. What is
being borrowed, as best as it is remembered:

- the parts shelf is a **persistent bottom strip**, never a modal, and the board stays visible
  behind and above it;
- you **drag a part off the shelf straight onto the grid in one continuous gesture** — it follows
  your finger, snaps to the nearest legal cell, and commits on release;
- **the shelf does not close** when you place something, so the second part is another single drag;
- illegal placement is shown continuously by the ghost rather than by refusing the tap;
- there is a persistent eraser and an undo.

Mapped onto Corepox:

- The `CHOOSE BUILD OPTION` modal becomes a shelf along the bottom: one chip per stock item, icon +
  name + `xN`, greyed at `n === 0`. It replaces the `⚒` wrench entirely.
- **Drag from a chip onto the board.** While the drag is live, every legal cell for that part ghosts
  — this is exactly today's `legalCells()`, just driven by a held drag instead of by `picked`.
  Release on a ghost commits; release anywhere else cancels.
- **Tap a chip to make it sticky** for players who would rather tap-tap. Sticky survives a
  placement, which is the single change that turns 3 taps per part into 1 + 1 per part.
- Stock decrements on commit, not on pick. That is already the shipped behaviour and already true
  here.

Cost, stated plainly: a bottom shelf eats vertical board space permanently. On a phone in portrait
that is real. Mitigation is a collapsed state — the shelf shrinks to a single handle when it has
nothing in stock, which is already most of the campaign after the build.

**What survives from the shipped game:** ghosts of the *real component art* at every legal cell,
appearing all at once. That is a good affordance and it is already built.

### 7.4 Wiring — no mode

**Recommendation: wiring is not a separate mode.** A drag that starts on a port is a wire. Nothing
else.

Tom asked "is wiring a separate mode to placing components? Probably?" — the argument for *no* is
that `connect` exists today only to do two things, and both can be done on press:

1. chequer the legal targets — do it on pointerdown instead, for the port you are actually holding;
2. arm the source port — the port you pressed *is* the source.

And it is already known that the mode has a cost. From
`knowledge/corepox-shipped-ui-observed.md`: `connect` on a single-port component "asked a question
with one answer, and made the player answer it", which is why `armConnect()` now auto-arms. That fix
is a mode being partly dismantled from the inside.

**The counter-argument, which is real.** A port is addressed by *cell* (`PORTS` in `corepox-engine`
maps a port name to a cell offset — `Radar: {bearing: [1,0], dist: [0,0]}`), so the target is one
whole tile. At the shipped zoom that is **≈129 device px** — a very generous target
(`knowledge/corepox-shipped-ui-observed.md`, "The tile, in device pixels"). At the port's *current*
zoom in a wide fight it is much smaller. So:

> **Constraint for the designer:** direct port-to-port dragging is only safe while a tile is at
> least ~44 device px on screen. Below that, either the board must zoom in when a wire drag starts,
> or wiring must fall back to something with bigger targets.

**Confirmation stays.** `FINISH CONNECTING` is not ceremony — it is the shipped behaviour, and
removing it broke the gate once already: an earlier attempt cancelled the wire on a tap that players
actually make and `corepox-qa-campaign.ts` fell from 9/9 to 5/9. The recommendation is to keep the
confirm but **make it free**: release the drag on a valid port and the wire commits; the confirm
appears only when the proposal is ambiguous or the release missed. That is 1 gesture for the common
case and preserves the escape hatch.

### 7.5 Adjusting a Constant — in-game, not in a menu

Tom: *"What about adjusting components like the constant, that should be more in-game than it
currently is."* Agreed, and §1 says why: twelve taps, scaling with the value.

The Constant's value already renders on its port disc. **Make the disc the control.**

- **Drag vertically on the disc to scrub the value.** Fine near the start of the drag, coarse
  further out — the standard "pull away to accelerate" ramp, which makes 0→100 and 0→7 both one
  gesture. The value propagates live while dragging, which is already what the engine does and
  already what the shipped game did: *"the turret's angle socket and the barrel both follow while
  the menu is still open"*.
- **Keep ± pads as a secondary affordance** for the last digit, but not as the only route.
- **Binary's operator** is a small enumeration, so a tap on its disc cycling `+ − × ÷` in place is
  enough; a long-press can open the full set.

Open question the designer should settle: whether a scrub during LIVE should be slowed or paused
(§8), because scrubbing a thrust value while dodging is either the best thing in the game or
unplayable, and that cannot be decided on paper.

### 7.6 Selecting a component, and what "info" is for

Tom asked: *"Clicking on a component (should [it] always open the info?)"*

**Recommendation: no, and `info` should stop being a button.**

A tap selects. Selection shows a small anchored affordance next to the component — not a panel over
the board (R3) — carrying only the verbs that `allow` permits for *that* component. Six-icon grids
where four are dim are mostly wasted.

The reason `info` feels necessary is that it explains what a component does. But the port already
draws every live value on the hull, and wire brightness already shows flow — the state is on screen
already. So:

- **What a component *is*** — its one-line description, its ports, its cost — belongs on the shelf
  chip and on first placement, not behind a button on a component you already own.
- **What a component *is doing*** is already visible and should stay visible.
- Keep a long-press → description for reference. Do not spend a slot in the primary affordance on
  it.

---

## 8. Realtime building, and the tempo dial

The first draft of this brief presented this as three competing options and recommended an invented
one ("bullet time"). §4 replaced that with recovered design, so this section is now about **which of
the shipped settings each mission gets**, not about inventing a mechanic.

### 8.1 The dial, as recovered

Three settings, all of which shipped, and they are per-mission:

| setting | the clock | ships move | you take damage | shipped on |
|---|---|---|---|---|
| **running** | runs | yes | yes | everything, until an edit verb is used |
| **kinematic pause** | **runs** | no | no | `LiveDesignMission` — the ship editor |
| **hard pause** | stopped | no | no | every campaign mission (`UISettings` default) |

And the transition into a pause is not a button. It is `Build` / `move` / `rotate` / `delete`
(§4.1). `connect` and `cut` do not pause.

### 8.2 What should be decided

**Decided, because it shipped and because Tom has asked for it:** starting a build-class edit pauses
the game, and which kind of pause is a per-mission property. `corepox-missions` already carries
`live` and `allow` per mission, so this is a third field of the same kind — the port has the right
shape for it already.

**Open, and this is the actual design question:** *which* missions get the kinematic pause rather
than the hard one. The shipped answer was "none of them — kinematic is for the editor only". But the
port has six `live: true` missions where you are wiring under fire, and kinematic pause is exactly
the setting for that: your program keeps running so you can watch the wire you just drew do
something, while the fight stops so you are not killed watching it.

A first proposal, to be argued with rather than implemented:

```
PlaceBrain, Cocoon              hard      teaching placement; nothing to watch run
ConnectionLite, Connection      kinematic the wire IS the lesson; it must be visibly live
ManualAim, Aim, Avoid           kinematic modify missions: you are watching a value propagate
FollowCourse, FollowCourseAdv   kinematic wiring under fire, which is the case this exists for
FollowBoss, SideShooter,        hard      real fights with a real build phase; buildOnce already
TwinTurrets                               makes the build a commitment
```

The claim behind the middle rows is testable and nobody has tested it: **that watching your dataflow
run while the ship is frozen is what teaches the dataflow.** If it is true, the wiring tutorials
should use kinematic pause. If it is false, hard pause everywhere is simpler and shipped.

### 8.3 What this does not settle

- **Whether `connect` and `cut` should stay unpaused.** They shipped that way and the reasoning
  reconstructs (they do not change mass or geometry, so `maybeSplit()` is not needed). But wiring is
  the slowest action in the port — 5 taps, 30 of them in FollowCourseAdvanced (§1) — and it is the
  one that most needs the clock stopped. **Recommendation: pause on connect too, at least while the
  wire drag is live.** This is a deliberate departure from the shipped behaviour and should be
  labelled as one.
- **Whether a Constant scrub pauses** (§7.5's open question). Same dial, same argument; kinematic
  pause is the obvious answer, because the whole point of scrubbing is watching the value propagate.
- **Whether live missions keep the shipped "no pause button" rule** (§4.4). It is a strong
  design decision — you cannot stop the clock without committing to an action — and it interacts
  with everything above.

### 8.4 The regression net

Any change here changes the difficulty of every live mission. The twelve reference solutions in
`corepox-missions` are the net: `tools/corepox-play-missions.ts` will say immediately if a tempo
change makes a mission unwinnable, and `tools/corepox-tap-count.ts` will say what it cost in taps.

## 9. Constraints the design must respect

Hard facts from the engine and the recovered assets. Violating any of these means rework, not a
tweak.

- **A component is not 1×1.** Radar is 6 cells, Orb 4, LaserTurret2 spans several
  (`plan/corepox-design.md` §10). Ghosts, hit-testing and the shelf icons all have to carry the real
  footprint.
- **A component is addressed by its ANCHOR, not its footprint.** `Ship.at(x, y)` matches
  `c.px === x && c.py === y`. Any affordance that lets a player point at a *cell* has to map back to
  the anchor. This has already caused one silent bug — a wire addressed to a Radar's bearing cell
  instead of its anchor was dropped without a warning and a turret fired without ever turning
  (`tools/corepox-wire-anchors.ts` is the gate; `knowledge/corepox-extracted-design.md`, 2026-08-21).
- **Ports are per-cell, one port per cell.** `PORTS` maps a name to a cell offset. Sizing follows
  from the tile, not from a sub-cell hitbox.
- **1 tile ≈ 129 device px at the shipped zoom**, measured ±3%. That is the zoom the shipped game
  played at, and it is what makes tile-sized touch targets viable. A design that assumes a wide
  tactical view will not have those targets.
- **A value can be `NaN`**, and that is load-bearing — a Radar with no target emits `NaN` on both
  outputs, and `EngineFn`/`TurretFn` guard on it. The disc must render "no value" as a state, not
  vanish. It vanished once and the mission that teaches radar had no visible outputs.
- **Editing rebuilds the ship.** `rebuild()` reconstructs the whole `Ship` and corrects for the
  centre of mass moving, because x,y is the centre of mass and a naive rebuild teleports the hull.
  Anything that edits during play inherits this.
- **Wires arc outside the hull**, thick, bright green, brightness encoding flow. This is the single
  most distinctive thing on screen in the shipped game and it is already ported.

---

## 10. What is deliberately not decided here

- **The visual language.** Colour, type, iconography, the look of the shelf. This brief is about
  what the interface *does*.
- **Portrait vs landscape.** The shipped game was portrait phone; the port is played in a browser
  pane. Whether the shelf is a bottom strip or a side rail follows from that and it has not been
  chosen.
- **Whether the shipyard converges on the same model** (§5), or stays a separate workbench with its
  own toolbar. Argument either way; someone should just pick.
- **The mission list, the cutscenes and the victory screen.** All three are shipped-observed
  (`knowledge/corepox-shipped-ui-observed.md`, "Screen flow") and none is ported. They are out of
  scope for the board redesign and should not block it.
- **Undo.** Mentioned in §7.3 as part of the Bad Piggies borrowing and then not designed. Building
  under fire without undo is a different proposition from building with it, and it interacts with
  §8. It needs its own decision.

---

## 11. How to tell whether the redesign worked

Four checks, all of which exist today:

1. **`tools/corepox-tap-count.ts`** — the §1 table, re-run. R5–R7 say what the numbers should be.
   This is the primary acceptance test and it is already written.
2. **`tools/corepox-qa-campaign.ts`** — all twelve missions still completable *by clicking*, with a
   clean console. This gate has caught a UX regression before (9/9 → 5/9 on the connect change), and
   it will need rewriting alongside the interface, which is the point: if the campaign cannot be
   driven, a player cannot drive it either.
3. **`tools/corepox-play-missions.ts`** — all twelve still winnable with the reference solutions.
   Guards against a tempo change (§8) quietly making a mission impossible.
4. **A person playing FollowBoss.** None of the above measures whether building under fire feels
   good. Nothing does except playing it.

---

## 12. What was built — 2026-08-21

The board in `@tomlarkworthy/corepox-game` is now the design's. Imported from the Claude Design
project `f9a1c3c2` ("Shipyard Concepts") with the `claude_design` MCP: turn 7 is the board, turn 7b
the press table, turn 7c the three metered flows, turn 8 the 390×844 phone. Both layouts are live
behind a `DESKTOP` / `PHONE` toggle on the mission bar.

### 12.1 The counts, re-run

`tools/corepox-tap-count.ts` was rewritten alongside the interface (§11.2 said it would have to be),
so it now drives shelf chips, port drags and value discs instead of the menus. A drag counts as
**one**, because a gesture is the unit the redesign trades taps for.

```
                       before   after
PlaceBrain                  4       2   build 1  play 1
Cocoon                      7       3   build 2  play 1
ConnectionLite              5       2   wire 1   play 1
ManualAim                  11       2   param 1  play 1
Connection                 17       3   wire 1  param 1  play 1
Aim                        11       3   wire 2   play 1
Avoid                       7       2   param 1  play 1
FollowCourse               10       3   wire 2   play 1
FollowCourseAdvanced       30       7   wire 6   play 1
FollowBoss                 64      16   build 6  wire 6  param 3  play 1
SideShooter                29       6   build 2  wire 2  param 1  play 1
TwinTurrets                41      10   build 6  wire 2  param 1  play 1
```

Per action, against the §1 table:

| action | before | after |
|---|---|---|
| place one part | 3 | **1** — drag off the chip, or tap a ghost while it is stuck |
| draw one wire | 5 | **1** — press a port, release on a port |
| set a Constant to 100 | 12 | **1** — one press on its disc |
| set a Binary operator | 3 | **1** — tap the disc, it cycles |

FollowCourseAdvanced's thirty consecutive taps under fire (§1) are **six drags**, and every one of
them now pauses the clock while it happens (§12.3). FollowBoss's 64 is 16.

Check the arithmetic the same way §1 does: FollowBoss places 6 parts (6), draws 6 wires (6), scrubs
one Constant (1) and cycles one Binary to MINUS (2, because PLUS→MINUS is read then tapped), plus one
to launch = **16**. Nothing is a fixed-length flow any more except the launch.

### 12.2 Where the design's model needed a decision the mock did not make

Three collisions only show up once the press table is real:

1. **A Constant is one cell and two targets.** Its port and its value disc both want it. Routing at
   tile resolution gave the whole tile to the port and the disc could never be pressed: one full
   scrub drag moved the value `100 -> 100` (`tools/corepox-board-shots.ts`). The cell is split
   instead — the disc owns a 0.32-tile bullseye, the port takes the ring around it and is drawn
   pushed out to the cell edge along the way the component faces.
2. **Two ports can share a cell.** FollowCourse's Binary at `(-1,-1)` is turned 90°, which puts its
   `out` on `(0,-1)` — where the Radar's `dist` already is. The old modal flow hid this, because
   tapping `connect` on a component scoped the legal set to that component; a modeless board has no
   such scope and wired the wrong one in silence, six attempts out of six. Colliding ports now fan
   apart toward their own component's anchor and the press resolves to the nearest **point**, not to
   a tile. A wire endpoint names a component and a port, never a cell.
3. **The shelf cannot float over the board.** The mock draws it at `bottom: 0` over the board svg,
   which on a mission whose ship sits low in frame eats the ship: FollowBoss's last wire could not be
   started at all, because the Binary's `out` port was drawn at page y=687 and the shelf covered
   584–700 (`tools/scratch/followboss-wire.ts` — the press resolved to no port, no component and no
   selection). The shelf now gets its own band. The phone layout never had the fault, because there
   the shelf already sat above a thumb bar.

### 12.3 Pause, implemented as §4 recovered it

`World.step()` already separates the two halves the mechanic needs — `propagate` + `evaluate` is the
program, `integrate` / particles / `collide` / `splitDetached` is the bodies — so the kinematic step
is the first two and nothing else. No engine change was required.

Two corrections the first implementation needed, both measured:

- **`isKinematic` has to freeze velocity, not just position.** `Ship.force` writes straight to
  `vx/vy/w` rather than into an accumulator that `integrate()` drains, so skipping `integrate` alone
  left an Engine building speed for the whole pause and firing the ship across the board the instant
  it resumed. Avoid lost at t=10.5s off a correct 5-part 3-wire build that the same gate had won
  before the pause existed.
- **`Explosive` is skipped while paused.** `detonate()` is the only damage an `evaluate` can do on
  its own, and `ShipComponent.damage()` no-ops under a pause in the C# (§4.3). Without the skip a
  charged bomb kills your own ship while you are invulnerable.

Entering a pause is still a side effect of an edit and never a button: `editPause()` is called from
every mutator, and the only control offered is a resume.

**One verb is exempt, and it diverges from §4.1 on purpose.** Adjusting a value does *not* pause.
Tom, 2026-08-21: *"I think its better if the game is not paused on adjusting values like constant.
You need the feedback"*. A Constant is the one edit whose effect can only be judged by watching —
turn the turret's angle and you want to see where it points; raise the thrust and you want to see
the ship move. Pausing hides exactly the thing being tuned. The structural edits (place, move,
rotate, delete, wire, cut) still pause, because there the pause is what buys the time to make them.

That is a real cost, not a free choice: a live mission's clock now runs for the whole of a scrub, so
the six `live: true` missions pay for tuning in seconds rather than in taps. §12.4 records what the
campaign gate says about it.

### 12.4 What the gates say

| gate | result |
|---|---|
| `corepox-play-missions.ts` | 12/12 winnable, 0/12 winnable with no input |
| `corepox-mission-fidelity.ts` | all 12 match the original |
| `corepox-qa-campaign.ts` | **11/12**, every part and every wire built by dragging |
| `corepox-board-shots.ts` | chip drag places, port drag wires, disc scrubs, phone renders, clean console |
| `corepox-board-shots.ts`, on the pause rule | wire → `paused true`; scrub → `paused false` |
| `lope-preflight.ts` | 0 new findings from `corepox-game` |

The one red is FollowBoss, and it is not the interface. It builds 7/7 parts and 6/6 wires, matching
the reference solution part for part, and then loses at t=5.0s. See §12.5.

Re-run after the scrub exemption (§12.3): **11/12, unchanged**. The four `live: true` missions that
now pay for a Constant in seconds rather than in taps — ConnectionLite, ManualAim, Connection,
Avoid — all still win with the clock running through the whole scrub. That is what makes the
exemption affordable; it was not assumed.

### 12.5 A ship built part by part does not sit where the same ship built in one go sits

`rebuild` compensates for the centre of mass moving as parts go down, so the parts already on the
board stay under the player's fingers — the alternative was reported as *"when i place a component
the center of the ship shifts"*. The consequence is that the finished hull is positioned so the
**seed's** centre of mass is still at the world origin, not the finished hull's.

Measured, in the browser (`tools/scratch/pose-read.ts`):

```
FollowBoss    x -0.429 y 0.679        fresh construction puts the same hull at x 0 y 0
TwinTurrets   x -0.444 y 0.722
```

`tools/corepox-build-pose.ts` runs each mission's own reference solution at both poses in the same
engine, so the pose is the only variable:

```
FollowBoss    fresh WIN  14.7s    ui(-0.429,0.679)  LOSS 5.0s   <-- POSE-FRAGILE
TwinTurrets   fresh WIN  26.5s    ui(-0.444,0.722)  ----  60s   <-- POSE-FRAGILE
```

FollowBoss is confirmed end to end: LOSS at 5.0s headless, and the campaign loses it in the browser
at t=5.0s. TwinTurrets is **not** confirmed — the browser wins it from the same pose — so that
mission sits near a boundary and the A/B is a warning about it, not a verdict on it.

`corepox-play-missions.ts` constructs fresh and therefore cannot see any of this; it reports
FollowBoss winnable. That is the gap the new tool fills.

**Not fixed here, and deliberately.** Two repairs are available and neither is this task's:
re-seating the ship at `play()` so the launched hull matches the searched one, which changes game
behaviour; or searching solutions at the pose the UI actually produces, which belongs to whoever
owns `corepox-boss-rebuild.ts`. `corepox-qa-campaign.ts` now prints the built pose on every failure,
because a spec that matches the solution exactly and loses anyway reads as a UI fault until you can
see it.
