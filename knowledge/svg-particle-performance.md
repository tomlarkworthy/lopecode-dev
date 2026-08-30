# What a particle costs in SVG

Measured 2026-08-20 for the corepox engine exhaust, on an Apple M4 Max / macOS 26.6, Chromium
1.52.0 driven **headed** by Playwright at 1280x720. Headed matters: headless rasterises on
SwiftShader and misprices every filter and gradient on this page.

Instruments, both kept:

- `tools/bench/svg-particles.html` + `svg-particles.ts` — 22 draw techniques over one shared
  ballistic particle sim, so the only thing that differs between runs is the draw.
- `tools/bench/svg-particles-slow.ts` — the same sheet under CDP `Emulation.setCPUThrottlingRate`.
- `tools/bench/svg-particles-shots.ts` — a frame of every technique to `tools/bench/shots/`.
  A technique that paints nothing benchmarks perfectly, so every row got looked at.

The metric is the **frame interval**, not script time. A technique can be cheap in JS and still miss
vsync in raster or composite, and only the interval sees that; script time is reported beside it so
the two can be told apart. This display runs at 120Hz, so the floor is 8.3ms.

## The sheet

Largest particle count holding >=60fps (median frame <= 16.7ms), unthrottled. 16000 was the top of
the sweep, so rows at 16000 are "did not break", not "broke here".

| technique | budget | script @16000 |
|---|---|---|
| one path per colour, dots (`M x y h0`, round linecap) | >=16000 | 2.7ms |
| the same under `cp-bloom` | >=16000 | 2.7ms |
| one path, velocity streaks | >=16000 | 4.9ms |
| one path, filled triangles | >=16000 | 6.2ms |
| one path, gradient *stroke* | >=16000 | 3.8ms |
| canvas2d (control) | >=16000 | 1.1ms |
| pooled `<circle>`, cx/cy | 8000 | 7.3ms |
| pooled `<circle>`, transform / CSS transform | 8000 | 6.0 / 5.5ms |
| pooled `<polygon>` triangles | 8000 | 7.6ms |
| pooled `<ellipse>` streaks | 8000 | 8.5ms |
| pooled `<circle>` + per-particle `opacity` | 4000 | 10.8ms |
| pooled `<circle>` with a radial-gradient fill | 4000 | 7.2ms |
| recreate `<circle>`s every frame | 4000 | 19.4ms |
| `<use>` of a `<symbol>` | 2000 | 23.6ms |
| **recreate `<circle>`s every frame, bloomed** | **2000** | — |
| CSS-animated spawn-and-forget | 1000 | — |

On an M4 Max almost every row clears 60fps at the counts corepox reaches, so the sheet above ranks
techniques it cannot really separate. Under 6x CPU throttling at n=2000 the ordering is the one a
mid-range machine feels — fps, script ms in brackets:

```
path-dots-buckets-bloom   120 (2.3)     <- one path per colour
path-dots-bloom           120 (3.1)
path-streak-buckets       120 (3.9)
path-tris                 120 (5.1)
canvas2d                  120 (0.9)
circle-attr-bloom          40 (8.4)     <- pooled nodes
poly-tri                   39 (6.6)
ellipse-streak             31 (6.7)
circle-attr-opacity        30 (11.5)
circle-gradient            29 (8.1)
circle-recreate-bloom      13 (19.8)    <- what corepox-render did
use-symbol                 13 (22.4)
```

Throttling slows the **main thread only**. Raster and composite run full speed, so these numbers
price script cost and are kind to the filter rows. On a machine with a weak GPU the bloom rows would
be worse than this and the ordering between them could change; not measured.

## Four findings

**1. Node count is the whole cost; the shape drawn is nearly free.** Every single-path variant beats
every per-node variant by 3-9x. Inside one path, dots vs streaks vs triangles differ only by string
building (2.3 / 3.9 / 5.1 ms at n=2000 throttled) and none of them broke 60fps. Triangles are
affordable; what is not affordable is one node each.

**2. The bloom filter is free.** `path-dots` and `path-dots-bloom` are identical at every count,
throttled and not — the same 16000 budget, the same 2.7ms. An SVG filter is priced per
filter-region *area*, not per particle, and these particles already covered the full 1280x720. So
the neon is the cheapest embellishment on the page.

The exception proves the rule: `circle-recreate` is 4000 and `circle-recreate-bloom` is 2000. The
filter does not cost per particle, but replacing every node underneath one each frame does.

**3. Per-particle gradients and per-particle opacity are the expensive embellishments**, each
roughly halving the budget (8000 -> 4000). A gradient *stroke* on a single path costs nothing —
one paint server, one node. And the radial-gradient blob looks *worse* than a flat dot under bloom
(`shots/circle-gradient.png` against `shots/path-dots-buckets-bloom.png`), because the bloom already
supplies the soft falloff you were paying the gradient for.

**4. `<use>` of a `<symbol>` is the worst technique measured** — 2000, below raw circles, 23.6ms of
script at 16000. Right for the 58 component sprites, wrong for particles.

Caveat on transferring that to hulls: the bench moves every node every frame. Corepox draws a ship's
components once and moves the whole hull under one group transform, so its `<use>` cost is not this
number. Untested.

## Dead ends

**Bucketing brightness on remaining `ttl` made the whole plume dark.** Exhaust is born with
`ttl = World.rng()`, already in 0..1, so it looks like it can index an 8-lane ramp directly with no
birth ttl recorded. It cannot. A population born uniform on [0,1) and dying at 0 has a
steady-state remaining-life density of 2(1-x), so the lanes fill like this:

```
lane 0 (#20406e, near-black navy)  23.4%
lane 1                             20.3%
lane 2                             17.2%
lane 3                             14.1%
lane 4                             10.9%
lane 5                              7.8%
lane 6                              4.7%
lane 7 (#ffffff)                    1.6%
```

Exactly inverted from a plume. Tom, on a screenshot of a ship under thrust: "there are no visible
particles leaving the engine". Sampled ttls at that moment were 0.028, 0.039, 0.102, 0.095, 0.022 --
every one of them lane 0.

**Every particle was being drawn correctly the whole time.** A `setAttribute` trap over the running
arena recorded 1656 writes of `d` on the exhaust lanes, 337 of them non-empty, the last being
`M59.4 6.2h0M51.4 -301.0h0`. Coordinates, lane count, node count and frame cost were all exactly as
designed. So "is the renderer drawing anything" was the wrong question, and the gate that asks it
passes while the plume is invisible. `tools/corepox-exhaust-probe.mjs` asserts the **distribution**
across lanes instead, which is the thing that decides visibility.

The fix is `ttl / ttl0`, which is uniform across the ramp by construction, plus lifting the dim end
of the ramp off black (`#3f6fb0`, roughly where the old flat `#8fd0ff` at opacity 0.5 sat over
black) so the tail of the plume stays at least as visible as the whole plume used to be. After:
6/7/9/9/8/8/9/8 across the eight lanes.

Two things nearly hid this. The bench sim seeds `age` uniformly and never reproduces the
steady-state skew, so every bench shot looked right. And the in-game A/B reported "66 particles" on
mission `avoiding` -- those were **not particles**: the DOM counter was matching backdrop paths
inside a bloomed group. Neither number was wrong about what it measured; both were about something
else.

**CSS/SMIL spawn-and-forget collapsed.** Declarative animation looks like the free option — JS only
spawns and reaps, the compositor runs the motion. It held 120fps at 1000 and then fell off a cliff:
29fps at 2000, **2fps at 4000** (median frame 600ms, p90 1083ms). Each element carries its own
animation. Do not reach for this at a particle count.

**The first in-game A/B was noise, and it was convincing.** Comparing the old and new builds on
mission `aiming` gave `67.1ms -> 33.8ms (1.99x)` and it was wrong. Adding a counter to the same probe
showed why: median **4** particles on screen, peak 31. Re-run with the count instrumented, both arms
read 67.2 and 67.3ms — 1.00x, the correct null result. A frame time without the particle count it
was paid for is not comparable between runs, which is why `corepox-particle-ab.mjs` now reports both.

**The browser-based particle census could not finish.** Playing all 9 missions in one tab kept losing
the play button to the game's own win screen, and reloading did not help because mission progress
persists (`file://` is one shared origin) so the `1/9` boot wait never matched again. Replaced by
`tools/corepox-particle-census.ts`, which drives the real engine headless through the same reference
solutions `corepox-play-missions.ts` uses.

## What corepox actually reaches

`bun tools/corepox-particle-census.ts` — live `world.particles.length` sampled every tick, 60s cap:

```
mission              med   p90  peak
PlaceBrain             0     0     0
Cocoon               104   118   128
ConnectionLite        50    56    62
ManualAim              1     2    33
Connection           146   164   193
Aim                   23    49    60
Avoid                 32   614   784     <- a mine field detonating
SideShooter           47    56    65
TwinTurrets           55   205   218
```

784 is the campaign peak, and it arrives as a burst when Explosives go off — the worst possible
moment to drop frames. Against the throttled sheet the old draw is ~35-40fps there and the lane
draw is 120fps.

The rate comes from the engine, not from the renderer: `DT` is 0.02 (50Hz), `EXHAUST_RATE` is 1, so
lambda is 2 per tick at full thrust (`corepox-engine.js:843`), and exhaust `ttl` is `World.rng()`,
mean 0.5s. That is **~50 live particles per engine at full thrust**.

## Scaling to large ships

The shipped corpus does not stress this. Over the 892 ships in
`vendor/corepox/firebase/data/ships.json`: components per ship median 10, p90 26, max **40**; engines
median 2, max 13. The most engine-heavy ship in the corpus is 13 engines in 28 components, about 650
particles at full thrust. Engines are **22.6%** of all components placed by players.

Hold that ratio and each component is worth ~11.3 live particles at full thrust:

```
1,000-component ship   ~226 engines   ~11,300 particles
5,000-component ship  ~1,130 engines  ~56,500 particles
```

So the ceiling matters. Pushing the sweep past 16000, unthrottled:

```
                        32000        64000        128000
one path per colour   120fps 6.4ms  60fps 14.3ms  30fps 28.9ms
canvas2d              120fps 2.4ms  60fps  4.9ms  30fps 29.3ms
```

**SVG lanes and canvas hit the same 64,000-particle 60fps ceiling.** Past ~30k the cost stops being
the DOM and becomes per-particle work and fill rate, which both approaches pay alike. There is no
DOM wall to escape by moving particles to canvas — a 1000-component ship is comfortable in SVG, a
5000-component ship is at the edge in either.

This is the argument for staying in SVG: the particles keep sharing the hull's coordinate space,
the camera viewBox, and `cp-bloom`, and buy nothing by leaving.

## What changed in corepox-render

`corepox-render.js` built one `<circle>` or `<line>` per particle every frame inside the bloomed
`fx` group and dropped them all with `fx.textContent = ""` on the next — the worst row in the sheet.
It now writes one `<path>` per colour: 8 lanes for exhaust, 5 for fragments, 1 for beams, built once
at setup and given a new `d` each frame.

A dot is a zero-length segment under a round linecap: `M x y h0` paints a disc of diameter
`stroke-width`. Verified visually (`tools/bench/shots/path-dots.png`), not only in the timings.

The fade is which lane a particle is filed into, so it costs no per-node `opacity` — itself the
second most expensive thing in the sheet. Exhaust `ttl` is already 0..1, so it indexes the ramp
directly with no birth-ttl recorded to normalise against: a particle is born at a random brightness
and dims monotonically to death, and that randomness reads as shimmer in the plume.

Before and after at 800 particles, same mission, same throttle
(`tools/screenshots/cp-stress-{before,after}.png`): the old layer is a uniform pale-blue soup that
buries the hull; the new one has bright cores against deep blue, and the ship stays readable through
it. The brightness ramp is doing double duty as depth.

Gates after the change: `corepox-qa-campaign.ts` 9/9, `corepox-camera-probe.ts` all pass,
`corepox-boot-check.mjs` 0 console errors.

## Particles are not corepox's bottleneck yet

This is the finding that most changes what to do next. In the real notebook at 6x throttle:

```
mission "avoiding"                   before 75.9ms  ->  after 75.7ms   (1.00x)
mission "aiming"                     before 67.2ms  ->  after 67.3ms   (1.00x)
800 particles injected via the QA seam   157.6ms  ->  125.3ms   (1.26x)
```

The per-mission particle counts those first two rows were labelled with (66 and 4) came from a DOM
counter that was also matching backdrop paths, so treat them as "few", not as measurements. The
headless census below is the trustworthy count.

At the counts the tutorial campaign reaches, the particle draw is not measurable in the frame — a
frame costs 67-76ms at 6x throttle while carrying 4 to 66 particles. The change buys headroom at the
detonation peak and at large-ship counts, and it buys the look; it does not buy the current frame
rate back, because the frame is going somewhere else.

Where has not been measured. The candidates are the hull layer and the port numerals, which are
redrawn per frame with live values (`valueNode`). For ships of 1000s of components that layer, not
the exhaust, is the thing to measure next.

`tools/corepox-particle-stress.mjs` is the instrument for this: it tops `world.particles` up to N
each frame through the game's QA seam (`qa.session()`), inside the camera's viewBox so every
injected particle actually costs a raster, with both arms carrying identical injection and
collision cost so the difference between them is the draw alone.

## Unrelated pre-existing defect, seen while doing this

`<rect> attribute height: A negative value is not valid. ("-3")` appears intermittently in the
console — 55 occurrences in one before-build run, 0 in the next, and it reproduces on the
**pre-change** build, so it is not from this work. `corepox-qa-campaign.ts` prints it too. A
`setAttribute` trap over a 14s match (`tools/scratch/cp-rect-trap.mjs`) did not catch it firing, so
whatever sets it is rarer than that window. Not chased.
