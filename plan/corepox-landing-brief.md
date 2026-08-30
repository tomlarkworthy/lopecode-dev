# Corepox landing screen — design brief

Status 2026-08-23. **Nothing here is implemented.** This is a handoff document for the design
canvas, written the way `Shipyard Concepts` was: what exists today with the evidence for it, what
does not exist, and the constraints the replacement has to satisfy. Where a fact is read out of
code it names the file; where it is a guess it says so.

The one-line problem: **the notebook has three game modes and no way to choose one.** They are
three separate lopecode modules selected by a URL hash at boot, so today the "landing page" is
whatever `bootconf.json` happened to name.

```json
"hash": "#view=R100(S70(@tomlarkworthy/corepox-game),S30(@tomlarkworthy/claude-code-pairing))"
```

That is a developer layout with a pairing pane in it. A player opening `corepox.html` lands
directly inside tutorial mission 1 — `corepox-game.js` line 192 is `let mi = 0, S =
newSession(MISSIONS[0])` — and has no route to the map, the shipyard or the lab.

---

## 1. The three doors, and what is actually behind each one

Read off `lopebooks/notebooks/corepox.html`, 2026-08-23. The honest state matters here: a landing
screen that promises three equal modes when one of them does not exist is worse than one that says
so.

### TUTORIALS — built, 12 missions, plays end to end

`@tomlarkworthy/corepox-missions` holds `MISSIONS` (12) and `CAMPAIGNS` (3 groups):

```
tutorial          7   PlaceBrain  Cocoon  ConnectionLite  ManualAim  Connection  Aim  Avoid
Advanced Steering 3   FollowCourse  FollowCourseAdvanced  FollowBoss
not in a campaign 2   SideShooter  TwinTurrets            (shipped: false)
```

`bun tools/corepox-qa-campaign.ts` plays all twelve through the real UI and is **10/12** as of
2026-08-23 (Aim and FollowBoss fail; both are recorded in `plan/corepox-tasks.md`).

Each mission carries a `title`, a one-line `brief`, an `allow` set, and — for 9 of 12 — an `intro`
cutscene of one or two lines of caps text, verbatim from the shipped `cutscenes.yaml`. The first
two:

```js
{id: "PlaceBrain", title: "birthing", allow: {build: true},
 brief: "A ship is whatever you bolt to a core. Place one, then press play.",
 intro: ["I REMEMBER....", "MY MOTHER WAS SEED SHIP #342164"]}
{id: "Cocoon", title: "cocoon", allow: {build: true},
 brief: "Two bombs, north and south, on a one-second fuse. Armour is all you get."}
```

**The `allow` set is the teaching device and the landing screen should show it.** The tutorial
teaches one verb per mission by removing the others, and the counts across the twelve are
`build` 7, `connect` 8, `modify` 8, `rotate` 3. `PlaceBrain` and `Cocoon` allow only `build`;
`ConnectionLite` and `Aim` allow only `connect`; `ManualAim` and `Avoid` allow only `modify`.

**Six of twelve are `live: true`** (`grep -c "live: true"` → 6) — the clock is already running when
the mission opens.

Winning a mission offers three spoils cards and takes one, and what is taken is carried into every
mission after it (`plan/corepox-tasks.md`, 2026-08-22). A PERFECT clear buys a fourth card.

### EXPLORE — built, and it is the best-looking thing in the project

`@tomlarkworthy/corepox-map` is a generated roguelike run: `genRun({seed, galaxy, jumps})` lays out
7 columns of nodes, wires non-crossing edges, and drops one or two hazard ellipses on top.
Screenshot: `tools/screenshots/corepox-map.png`.

Eleven node kinds, from `NODE_KINDS`:

```
fight     duel  escort  infiltrate         boss
travel    race  debris
economy   mining  shop
support   rescue  repair  unknown
```

`JUMP` opens `encounterView` from `@tomlarkworthy/corepox-duel-encounter`, which resolves the node
against `ENCOUNTER_RULES`. **Four of eleven kinds run a real match today** — `duel`, `escort`,
`infiltrate`, `boss` (`battle: true`). `mining` runs `runMining`, `shop`/`repair` open
`@tomlarkworthy/corepox-station`, and `race` / `debris` / `rescue` are `battle: false` stops that
pay their posted scrap and nothing else. That is deliberate and recorded in the module comment: *"A
RACE is a course and a MINING node is a quota; neither is two ships shooting."*

A run starts from `newRunCampaign`: a bare `lonelyCore` hull, 214 scrap, and
`{Engine: 3, Lazer: 2, Armour: 4, Constant: 3, Radar: 1}` in the hold.

**Two limits the landing screen must not paper over.** The three-galaxy progression in the top bar
is chrome: `galaxy` is a debug slider (`corepox-map.js:370`, `Inputs.range([1,3])`), and nothing
advances it on a boss win. And **there is no persistence anywhere** — `grep -i localStorage` over
`corepox-map`, `corepox-duel-encounter` and `corepox-game` returns nothing. A reload is a new run.

### MULTIPLAYER — designed, nothing built

No `corepox-atproto` module exists. `@tomlarkworthy/at-login` and `@tomlarkworthy/at-write` are in
the notebook's `mains`, so the plumbing is present and unused.

The design is in `plan/corepox-design.md` §3 and it is unusual enough to be worth a designer
knowing, because it changes what the screen can honestly offer:

- The simulation is deterministic (`bun tools/corepox-determinism.ts`: identical across 3 runs).
  **You never publish a match result — you publish a ship, and anyone recomputes the match.**
- So it is an asynchronous ghost ladder, not live play. Super Auto Pets' Arena is the reference.
- The atproto-native object is arguably the **composite**, not the ship: a small named working
  sub-ship someone else can drop into their build. 7 shipped composites appear in 24.6% of 492 real
  player ships.

**And one measured negative result that bears directly on how much this door can promise.**
`bun tools/corepox-intransitivity.ts 32 2`, 1984 matches, 2026-08-20:

```
decisive pairs        299/496 (60%)
CYCLIC triads         19 (1.4%)     transitive = 0%, random = 25%
side-A win rate       49.3%          (no positional bias)
```

1.4% against a 25% random baseline: the corpus matchup graph is very nearly a strict power
ordering. There is almost no rock-paper-scissors for counter-design to work with yet. A landing
screen that sells MULTIPLAYER as the destination is selling something that has not been shown to be
a game.

---

## 2. What the original shipped, and where to see it

The original Corepox (2016–2020 Unity) had a landing surface and it is recoverable. Two sources.

**The art file.** `scratch/corepox-art/art-UI.sketch`, rendered at
`tools/screenshots/corepox-ui.png`. Thirteen artboards including `splash` ("EARLY ALPHA"), the main
`artboard`, `settings`, a tutorial list, `matchup`, `victory` and `loss`. The main artboard is a
header with currency (`1000 ◆`) and stars (`★ 1286`) and a gear, a large `Battle` panel, and a
**persistent four-icon bottom tab bar**: 🔧 wrench, ◈ diamond, ⚑ flag, `$`.

**The capture read.** `knowledge/corepox-shipped-ui-observed.md` §"Screen flow" names the same bar
as `BUILD  BATTLE  MISSION  SHOP` and describes the MISSION tab
(`data/corepox/shipped-ui/06-missions-top.avif`, `75-list.avif`):

> a scrolling list of chapters. `tutorial` is headed `tutorial ★ n/7` and holds `birthing, cocoon,
> run, gunner, connection, aiming, avoiding`. Each row is a wide dark pill with the mission name
> and, to its left, a square button in one of three states: a **green star** once starred, a **green
> ▶ with a red `!` badge** for anything unlocked and unstarred, `LOCKED` with a green padlock
> otherwise. … Below the chapter sits a locked `Advanced Steering` / `INCREASE LEAGUE RATING` bar.

So the original's answer was a bottom tab bar and a chapter list gated on a rating. That is a
reference, not a requirement — the rebuild's mode set is different (there is no separate BUILD tab;
the shipyard is reached from the map, and the shop is a node).

### 2.1 The promo reel — the menu in motion, and the game's own pitch

`data/corepox/video/reel-CE4bDuaCGIe.mp4`, 720×720, 30fps, 56.9s with audio. Tom's own Instagram
post, retrieved 2026-08-23. It is the only moving record of the shipped game we have, and it
carries two things the Sketch artboards and the still captures do not.

**A frame of the live main menu, at t=46** (`stills/t46-MENU-shipped-main-menu.png`). Caught
mid-transition, which is what makes it informative — three pages are on screen at once:

```
top bar     [Brain avatar] unity_player          ★ 1133        [gear]
centre      Crystalis League / 1000 - 1300
            <square artwork card, crimson>
            [ BATTLE ]                            large, green
right edge  `tutorial` panel sliding out — rows of [★] or [▶ with red !] + mission name
left edge   a hull, a wrench, part counts, an `Explosive` chip — the BUILD page sliding away
bottom      [🔧 BUILD] [◈ BATTLE] [⚑ MISSION •] [$ SHOP]     BATTLE filled green = selected
```

Four things here that the still captures did not show:

1. **The tab bar is labelled, not icon-only**, and the selected tab is a filled green block.
2. **`MISSION` carries a red `!` badge on the tab itself** when something is playable and unstarred
   — a notification dot at the navigation level, not just on the row.
3. **BATTLE is the default landing tab, not MISSION.** The centre of the shipped landing screen is
   a league band and one large button.
4. **`Crystalis League  1000 - 1300`** — a named league with a rating band. This is the ancestor of
   the MULTIPLAYER door, and it corroborates `INCREASE LEAGUE RATING` in the shipped-ui read and
   `LEAGUE PROGRESS` on the victory panel. The `★ 1133` in the top bar is the same number that
   appears on the victory panel's progress bar.

**Inferred, from one transition frame:** the four tabs are sibling pages laid out side by side in a
horizontal pager — BUILD off to the left, BATTLE centre, MISSION off to the right — rather than
four screens that replace each other. You only see three pages at once if they are adjacent.
*Falsified by:* scrubbing the reel and finding a cross-fade or a push rather than a swipe, or
finding tab order in the Unity source that disagrees with `BUILD BATTLE MISSION SHOP`. This is
worth settling because it is the evidence bearing on open question 1.

**Five tagline cards**, which are the game's own pitch in the author's voice — the strongest
material available for R6, and already written:

```
t≈3    COREPOX                        wordmark, wide-tracked white sans, blue nebula
t≈6    DESIGN MODULAR SPACESHIPS
t≈14   FIGHT PLAYERS
t≈23   FULLY AUTONOMOUS BATTLES
t≈44   FOR MOBILE
t≈49   SURVIVAL OF THE SMARTEST
```

**`FULLY AUTONOMOUS BATTLES` is the one to take.** It states the premise the rebuild is built
around — the ship fights by its own wiring, not by your hands — and `plan/corepox.md` records that
the corpus says players never engaged with it (Binary once per 15 components across 492 ships). A
landing screen that leads with that claim is making the promise the tutorial then has to keep.

Two cautions on using the reel as a visual reference.

- **The taglines are set in a serif face** (`FOR MOBILE`, `SURVIVAL OF THE SMARTEST` are clearly
  serif with a lens-flare wipe). The rebuild is monospace throughout, by a constraint that has a
  reason behind it (§3, no webfont). The reel's type is period marketing, not the game's UI type,
  and the landing screen is the one surface where that tension has to be resolved deliberately.
- **The wordmark treatment does carry over.** `COREPOX` at t≈3 is a white sans with very wide
  letter-spacing over a nebula — which is what `corepox-map`'s top bar already does at 700/14px
  with `.28em` tracking. That continuity is real and free.

---

## 3. The visual language is already fixed — do not invent a new one

Three surfaces have shipped with a consistent look and the landing screen has to join them, not
lead them.

The palette is a real constant, `corepox-board.js:69`:

```js
C: {ink: "#e8ecf5", dim: "rgba(232,236,245,.42)", faint: "rgba(232,236,245,.28)",
    cyan: "#4fd8e8", green: "#56e39f", lime: "#8fe64a", amber: "#ffc42e",
    orange: "#ff9a3c", hull: "#ffb066", red: "#ff5c72", purple: "#c46bff",
    panel: "rgba(6,8,14,.94)", line: "rgba(255,255,255,.1)"}
MONO: "'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace"
```

The comment under it is a hard constraint, not a preference:

> No webfont: JetBrains Mono is the design's face and is named first, but a lopecode notebook is a
> single file with no network, so the stack has to land on something the machine already has.

Established idioms, all visible in `tools/screenshots/corepox-map.png`:

- monospace everywhere, wide letter-spacing on labels, small caps-style uppercase
- `COREPOX` wordmark at 700/14px with `.28em` letter-spacing, top-left, with a run id beside it
- panel chrome is `rgba(6,8,14,.94)` over a starfield with `backdrop-filter: blur(6px)`
- amber `◆ 214` for scrap, green/red `HULL 82%`, node families colour-coded by the four families
- **line-art SVG symbols on `currentColor`**, 48×48 viewBox, `stroke-width` 2.2–2.6, no fills except
  small accent dots. Eleven node symbols and nine component symbols already exist and are reusable
  (`corepox-map.js` `mapSymbols`, and the `m-*` symbols in `data/corepox/shipyard-concepts.dc.html`).

Everything renders as SVG in one self-contained HTML file. No external fonts, no external images,
no canvas.

---

## 4. Requirements

R1–R4 are hard. R5–R7 are what the screen has to earn its space with.

- **R1 — Three doors, honestly labelled.** TUTORIALS and EXPLORE are playable. MULTIPLAYER is not
  built (§1). The screen must be able to show a door as *coming* without it reading as a bug or as
  a locked reward the player can unlock.
- **R2 — No persistence exists.** Anything the design shows that implies saved state — `★ 5/7`, a
  CONTINUE RUN button, a completion ring, "last played" — is a request for a feature that does not
  exist. Show it if it is worth building, but flag it in the design so it is costed rather than
  assumed.
- **R3 — It is one lopecode module in one HTML file.** Self-contained SVG, system fonts, no network.
  Reuse the existing symbol sets rather than adding a new icon language.
- **R4 — Phone and desktop from the same layout.** The board already ships a `PHONE` mode at
  390×844 (`tools/screenshots/board-9-phone.png`); the map is drawn on a ~1600×900 stage. The
  landing screen is the one surface a player meets on both, first.
- **R5 — Getting to play is one gesture from cold.** Today it is a URL hash. The target is: open the
  file, press one thing, be in a mission or on a map.
- **R6 — The screen says what the game is.** A first-time player has no idea Corepox is about wiring
  a ship's dataflow. The doors are the only place to say it before they are in it. The strongest
  material available is the tutorial's own `brief` lines and the cutscene text — *"A ship is
  whatever you bolt to a core"*, *"I CAN CREATE CIRCUITRY"* — which are already written and already
  in the right voice.
- **R7 — Returning is different from arriving.** A player who has cleared four tutorial missions
  wants mission five, not a pitch. Whether that is one screen with two states or two screens is
  yours to decide; see §5.

## 5. Open questions — please answer these in the design, with the alternative

Stated as questions because they are genuinely open, not as leading ones.

1. **Is the landing a screen you leave, or a shell you stay inside?** The original chose a shell —
   a persistent four-tab bar (§2), and the reel frame suggests the tabs were adjacent pages you
   swiped between rather than screens that replaced each other (§2.1, inferred). The rebuild's
   modes are heavier (a map run is 7 jumps long) and a persistent bar costs board space permanently
   on a phone. A screen you leave is cheaper and makes returning a deliberate act. **This is the
   question the rest depend on**, so answer it first.
2. **What is the fourth thing?** Three doors is the ask, but `@tomlarkworthy/corepox-shipyard` (a
   standalone ship workbench, `tools/screenshots/corepox-shipyard.png`) and
   `@tomlarkworthy/corepox-lab` (an arena/level bench, `boot-corepox-lab.png`) both exist and are
   currently unreachable. Are they doors, a workshop behind one door, or dev-only surfaces the
   landing screen should not admit exist?
3. **How does MULTIPLAYER read before it exists?** Options with costs: a dimmed door with a one-line
   explanation (honest, dull); a door that opens onto the *design* — publish your ship, watch it be
   recomputed — as a stub with a real atproto login (honest, and builds the thing incrementally);
   omit it until it works (cleanest, and loses the chance to explain what makes it unusual).
4. **Does the screen show a ship?** Every other surface in the game is a hull on a starfield. A
   landing screen with no ship on it would be the only one. A slowly drifting hull with live wires —
   the components already animate (`m-core` pulses, `m-sensor` sweeps) — is the obvious move and it
   costs a running engine instance on the boot path, which `plan/corepox.md` warns against
   ("a big data main delays the mount").
5. **Is EXPLORE one door or two?** Right now it is: start a run, and the run contains a shop, a
   refit bench, mining, and duels. A player who wants to fiddle with a ship has to start a run to
   get to a bench.

## 6. What to hand back

Match `Shipyard Concepts`: numbered turns, several options per turn, each option a self-contained
artboard on the canvas with the reasoning stated as a claim about what the screen must *not* be.
That doc's turn-10 line is the model — *"A shop is the place a roguelike is most tempted to open a
catalogue over the game. This one does not."* — because it is falsifiable and it survived into code
as four named rules.

The import path is proven: `data/corepox/shipyard-concepts.dc.html` was pulled through the design
MCP and its SVG rewritten by coordinate transform, then checked rather than eyeballed —
`tools/corepox-art-check.mjs` rasterises both sides at the same pixel size and diffs. Four of five
components came back pixel-identical (0 of 12544 / 25088 / 37632 / 75264). So artboards drawn to
the palette and symbol conventions in §3 land in the notebook with almost no translation loss.

## 7. Reference material in this repo

| what | where |
|---|---|
| **The original's whole UI, 13 artboards incl. main menu + splash** | `tools/screenshots/corepox-ui.png` (from `scratch/corepox-art/art-UI.sketch`) |
| **The shipped main menu, live, mid tab transition** | `data/corepox/video/stills/t46-MENU-shipped-main-menu.png` |
| **The game's own taglines** | `data/corepox/video/stills/t{6,14,23,44,49}-tag-*.png` |
| The wordmark, and the original build grid | `data/corepox/video/stills/t3-wordmark.png`, `t9-build-grid.png` |
| The promo reel itself, 57s | `data/corepox/video/reel-CE4bDuaCGIe.mp4` (+ `contact-sheet.png`) |
| The original's screen flow, read off captures | `knowledge/corepox-shipped-ui-observed.md` §"Screen flow" |
| Original mission list, victory, cutscene captures | `data/corepox/shipped-ui/{06-missions-top,75-list,15-after-victory,07-birthing}.avif` |
| **EXPLORE as it looks today** | `tools/screenshots/corepox-map.png`, `corepox-map-inbook.png` |
| The play surface (shelf, ports, wiring, pause chip) | `tools/screenshots/board-{1-shelf,3-ports-visible,4-wire-mid-drag,5-wired,8-verbs}.png` |
| Phone layout, 390×844 | `tools/screenshots/board-9-phone.png`, `board-10-phone-holding.png` |
| Station / shop | `tools/screenshots/station-repair.png` |
| Encounter (map → fight) | `tools/screenshots/bench-corepox-duel-encounter.png`, `corepox-encounter.png` |
| Shipyard and lab, the two unreachable surfaces | `tools/screenshots/corepox-shipyard.png`, `boot-corepox-lab.png` |
| Component art, current | `tools/screenshots/corepox-components.png`, `corepox-art-sheet.png` |
| Component art, neon variant (unused) | `tools/screenshots/corepox-neon.png` |
| The prior design canvas to match | `data/corepox/shipyard-concepts.dc.html` |
| Mode/pause model, gesture table, tap counts | `plan/corepox-ux.md` |
| Multiplayer design + the intransitivity result | `plan/corepox-design.md` §3, `plan/corepox-tasks.md` tail |
