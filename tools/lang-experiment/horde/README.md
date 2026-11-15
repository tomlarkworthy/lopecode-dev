# horde

A feasibility prototype: a neon twin-stick horde shooter in a 161 × 101 tile maze, where the enemy simulation
is one pure SoundScript cell (`stepBatch` in `cells.ts`) run in batches on a worker pool, and every shape is
drawn by a WebGPU fragment shader. It tests whether a game-sized parallel workload fits SoundScript's checked
cells, and what the language costs. Round 1 (cheap sim, benches, renderer) and round 2 (playable game, strict
indexing) were both done on 2026-11-15. Everything below is from round 2 unless it says otherwise.

Machine for every number here: Apple M5 Max, `navigator.hardwareConcurrency` 18, macOS, Playwright 1.52's
bundled Chromium 136.0.7103.25 (Metal), viewport 1280 × 800, devicePixelRatio 1.

## Running it

```
open tools/lang-experiment/horde/proto/game.html          # file:// works: classic scripts, blob workers
bun tools/lang-experiment/horde/serve.ts 8765              # only for mode=sab (needs COOP/COEP); then open
                                                           # http://localhost:8765/game.html?mode=sab
```

Every other command in this file runs from `tools/lang-experiment/` (`horde/…`, `lite/…`).

To see the worker switch matter, open `game.html?n=100000&wave=6` and press T: at the default 50k both settings
hold 60 fps on this machine (table below). Only Playwright's Chromium 136 was run; other browsers are untried.

`game.html` parameters: `n` (agent slots, default 50000), `mode` (`main` | `copy` | `transfer` | `sab` | `lite`,
default `transfer`), `workers` (default hardwareConcurrency − 1), `wave` (start wave), `bot=1&god=1` (the bot plays,
the player cannot die), `measure=S` (bot plays S seconds of rAF, percentiles in `window.__measure`),
`shot=…&frames=N` (N frames back to back, no rAF, for screenshots; the HUD is hidden unless `hud=1`),
`dist` (fixed camera distance), `hide=enemies,particles,bullets`, `w`/`h` (canvas size). Only `transfer` and `main` were played
through the page; `sab`, `copy` and `lite` were exercised through `bench.html` only.

Controls: WASD move · mouse aims (from the ship's projected screen position) · hold left button: spread shot,
7 bullets over 0.48 rad every second frame · hold right button or space, release: shockwave (charge up to 1 s,
radius 6–16 tiles, 3 s cooldown) · P pause · R restart · O overview camera · T workers on/off. The HUD's button
does the same as T and its slider sets the pool size; both apply between steps (`engine.configure`).

Rules (`proto/engine.js`): health 100, each contacting enemy costs 0.25 a frame, an exploding chevron 3,
regeneration 1.5/s. A wave lasts 20 s; wave w activates `min(n, 0.1·n·1.5^(w−1))` agents. 10 points a kill by bullet or shockwave; a chevron that explodes on contact counts as a kill and scores 0.
The horde reaches the start room about 10 s in (`node horde/kill-probe.cjs 10000 1800`: first kills at t=10 s).

Enemy kinds, all decided inside `stepBatch`:

```
chevron   40%  speed 5.2, explodes on contact (damage 99 to itself, 3 to the player)
diamond   35%  speed 3.0, splits into two shards when killed (its odd-id twin is a dormant slot that wakes the next frame)
hexagon   25%  speed 1.8, 5 hp, hit radius ×1.4; inner rings show remaining hp
shard          speed 4.4, hit radius ×0.8
```

## Files

| file | what |
|---|---|
| `cells.ts` | the simulation, 37 SoundScript cells; the only copy of the sim |
| `gen.ts` | refuses unless `checkSources` passes in default (strict) mode, then erases `cells.ts` into `proto/sim.gen.js`; also writes `proto/sim-raw.gen.js` (checked reads turned back into `a[i]`) for the cost comparison |
| `proto/engine.js` | player, weapons, waves, health, the bot, and the five ways of running `stepBatch` |
| `proto/render.js` | WebGPU renderer |
| `proto/game.html`, `proto/bench.html` | the game; the headless step bench |
| `lite-job.ts` | builds `proto/lite-job.js` / `lite-pool.js`: the job SoundScript's `compile` would send, run on lite's own `pagePool` |
| `bench.ts`, `cost-bench.ts`, `determinism.ts`, `play-measure.ts`, `play-input.ts`, `shots.ts` | the measurements below |
| `try-compile.ts` | the real `compile` from `lite/stdlib/runtime.ts` on `batchOnPool` |
| `smoke.cjs`, `sep-probe.cjs`, `kill-probe.cjs` | the sim in node |
| `proto/blank.html`, `gpu-probe.ts`, `probe-page.ts`, `lite-pool-entry.ts` | round 1: WebGPU launch probe, one-page bench runner, the lite pool bundle entry |
| `*-results.json`, `*-run.log`, `play-input-*.log` | the raw outputs the tables below are copied from |
| `proto/sim-strict1.gen.js`, `proto/sim-raw1.gen.js` | hand-kept copies of the first strict step and its raw twin, the "before" arms of `cost-bench.ts`; `gen.ts` cannot regenerate them, although their header says GENERATED |
| `strictify.ts` | the one-shot code mod that moved every read to a helper (already applied; kept as the record) |
| `probe/`, `probe-at/` | checker probes: round 1's constructs; round 2's helper forms |
| `render-bench.ts`, `render-results.json` | round 1 only; superseded by `play-measure.ts` |

## The simulation

Agents are 8 floats: x, y, vx, vy, life, kind, hp, flash. Per frame the main thread builds the inputs (flow
field from the player, only when the player changes tile; `neighOf`, a counting sort of last frame's live
positions into half-tile cells; `binsOf`, bullets per tile), then each batch steps independently: steer along
the flow field, short-range separation from at most 14 neighbours in the 3 × 3 half-tile cells, shockwave kick,
walls, damage. Hits come back as (agent, cause, killed) triples and the main thread applies them to score,
health and bullets. Batches must start at an even index so a diamond and its twin are in one batch.

Separation, measured in node (`node horde/sep-probe.cjs`, 50k agents, 600 frames, 8283 live agents sampled,
nearest-neighbour distance in 0.06-tile bins):

```
separation on   444 1515 2228 1823 1224 1049
separation off  8282    0    0    0    0    1      (SEP_OFF=1: sepR 1e-4)
```

Without it the crowd collapses onto single points. With it 444 of 8283 (5%) are still within 0.06 tiles of a
neighbour; in the screenshots dense corridors read as packed rivers of shapes rather than separate enemies.

## Measurements

### Step time per arm (headless, `bench.ts`, 2026-11-15T08:39Z)

`bench.html`: the bot plays (spread shot, shockwave every 5 s), every slot active, god mode. 900 warm-up
frames (the horde is at the player and being shot), then 240 measured. Mean / p90 ms of the whole step
(main-thread prep + pool round trip + applying hits). Every arm at each n produced the same agent+bullet hash.

```
      n    main/0  transfer/8  transfer/17     sab/8    sab/17   copy/17    lite/8
  10000  1.43/1.7    0.91/1.3     1.26/1.6  0.56/0.8  0.60/0.9  1.18/1.6  1.10/1.7
  50000  8.48/8.7    2.60/3.0     2.48/3.3  2.10/2.5  1.53/1.9  2.74/3.2  3.93/6.1
 100000 18.28/18.5   4.59/4.9     4.16/4.7  3.81/4.0  2.40/2.7  4.41/4.9  5.84/6.1
 200000 38.23/38.8  10.39/13.9    9.40/10.2 7.65/8.0  4.99/5.7  9.69/10.3 13.77/18.1
 400000 76.61/80.6  20.87/24.1   17.97/21.8 14.85/15.6 9.31/10.0 19.29/23.0 26.18/29.3
```

Where the time goes (medians, ms):

```
n 100000  transfer/17  prep 0.90  post 1.80  round 3.10     <- posting = structured clone of neigh, bins, flow
          sab/17       prep 0.81  post 0.10  round 1.46
          main         prep 0.80             step 17.2
n 200000  transfer/17  prep 1.70  post 4.60  round 7.40
          sab/17       prep 1.60  post 0.14  round 3.05
```

The per-worker broadcast (neighbour index ~260 KB plus 8 bytes per live agent, bullet bins ~65 KB, flow 195 KB
when it changes) is copied to every worker, so going from 8 to 17 `transfer` workers gains only 9–14% at 100k–400k; SAB writes it once.
Separation made this the dominant transfer cost: round 1's step had no neighbour index.

### Playing: rAF loop, 60 s of bot play (`play-measure.ts`, 2026-11-15T08:46–08:52Z)

The loop overlaps: each frame awaits the step started last frame, draws it, then starts the next step, so the
pool computes while the main thread waits for the next rAF. The sim is fixed at 60 steps/s; on a 120 Hz display
every other frame only draws. Start at wave 6, so 76k of 100k slots are active at once and ~81k live at the end.

```
                         fps   frame ms p50/p90/p99   step ms p50/p99   main thread busy p50/p99
headless  100k off      55.6   16.7 / 16.8 / 33.4     16.3 / 18.1       18.0 / 20.0
headless  100k on ×17   60.0   16.7 / 16.7 / 16.8      3.8 /  7.0        4.1 /  5.3
headless   50k off      60.0   16.7 / 16.7 / 16.8      8.1 /  8.8        9.3 / 10.6
headless   50k on ×17   60.0   16.7 / 16.7 / 16.8      2.5 /  6.3        2.6 /  4.7
headed    100k off      67.7   16.6 / 24.9 / 25.6     15.9 / 18.7       17.6 / 20.6
headed    100k on ×17  120.0    8.3 /  9.6 / 10.3      3.5 /  6.7        2.4 /  4.9
```

Headless Chromium paces rAF at 60 Hz; the headed window ran on the laptop's 120 Hz display. **n = 100k from
wave 6 is the count where the worker switch is visible**: off, the step alone (16–18 ms) fills the frame; on,
the main thread is busy 2–5 ms. At 50k both hold 60 fps headless. Not measured: fps on any other machine, or
with a human playing rather than the bot.

### Real input (`play-input.ts`, headless and headed, 2026-11-15)

Playwright keyboard and mouse events, no bot, checked against `window.__engine`: D and W move, the mouse
aims, left button fires (63 bullets in flight while held, 0 after release), space charges and fires a
shockwave (cooldown 2.92 s after release), right button is ignored during cooldown, P pauses and resumes,
T and the HUD button switch `transfer/4` ↔ `main/0`, the slider sets the pool to 12, R restarts. Standing still
at wave 8 with 60k slots: game over after 12 s, then R restarts with health 100. 15/15 in both modes (`play-input-headless.log`, `play-input-headed.log`; rerun 2026-11-15 after the first runs, which were not saved).

### Determinism (`determinism.ts`, 2026-11-15)

Same seed, bot firing and shockwaves. 10k agents for 1500 frames (25 s, 3179 kills); 200k for 900 frames
(1562 kills).

```
n 10000   main, copy/1,2,8,17, transfer/1,2,8,17, sab/1,2,8,17, lite/8   hash 02469a73:cf00c2c5
n 200000  main, transfer/17, sab/8, lite/8                               hash 011c5407:b4e6a257
all 18 runs bit-identical within each n
```

A first run at 600 frames recorded 0 kills on every arm: the horde had not reached the player, so hits and
splits were not exercised. The frame count was raised for that reason. `cells.ts`'s own test,
`test_batches_do_not_matter` (2048 agents, 240 frames, batches of 256 vs 1024), also passes.

## Strict indexing

Tom's decision (2026-11-15): strict indexing stays; `a[i]` on a typed array is `number | undefined`.
`bun lite/check.ts horde` now passes in the default strict mode, 37 of 37 cells. `grep -nE '[a-zA-Z0-9_)\]]!([^=]|$)|\?\?| as [A-Z]' cells.ts`
finds nothing: no non-null assertion, no `??`, no `as` cast.
Every typed-array read (104 of them) goes through a helper that throws:

```ts
export const oob = (): Oob => (i: number, n: number): number => {
  throw new RangeError("index " + i + " out of " + n);
};
export const atF = (oob: Oob): AtF => (a: Float32Array, i: number): number => {
  const v = a[i];
  if (v === undefined) return oob(i, a.length);
  return v;
};
```

`gen.ts` refuses to write the page's sim unless the default checker passes, so what is played and benchmarked
is what strict accepted.

What lite accepts as the helper (`probe-at/cells.ts`, `bun lite/check.ts horde/probe-at`):

```
(a: Float32Array | Int32Array | Uint8Array, i) => number        ok
(a: Mut<Float32Array>, i) => number                              ok
(a: Mut<Float32Array> | Mut<Int32Array> | Mut<Uint8Array>, i)  [type] Mut<Int32Array> is not assignable to MNum
(a: { readonly [i: number]: number }, i)                        [unsupported] non-string index signature
<T>(a: ArrayLike<T>, i) => T                                    [unsupported] intrinsic member ArrayLike.length
<T>(xs: readonly T[], i) => T injected into another cell        [inject-type] … is not assignable to <T>(xs: T[], …) => T
```

The Mut helpers (`atMF`, `atMI`, `atMU8`) are split because the checker requires it: no union of `Mut<…>`, and a
Mut array passed to a parameter not typed `Mut<…>` is a `mut-escape` error. The plain helpers (`atF`, `atI`,
`atU8`) are split for speed only; the union form is accepted (steps 1 and 3 below). Other code-shape costs:
`parts.forEach((p) => all.set(…))` became an indexed loop (`mut-capture`: a Mut captured by an escaping
closure), and `parts[i]` on a plain array became `parts.at(i)` with an undefined check.

### What it costs in milliseconds (`cost-bench.ts`, 2026-11-15T08:20Z)

`bench.html`, arms interleaved with the order rotated each of 3 reps, median of the 3 means. Shorter runs than
the step-time table (warm-up / measured frames: 10k 200/300, 100k 150/200, 400k 60/80), so the absolute ms are
not comparable with it; only the ratios within a row are the result.
`raw` arms are the same generated code with every helper call rewritten back to `a[i]` (`proto/sim-raw.gen.js` from `gen.ts`, `proto/sim-raw1.gen.js` kept by hand),
so they isolate the reads. "Before" is the round-2 step as first made strict; "after" is the current one.
Every arm at each (n, mode) produced the same hash.

```
                      before: raw   strict           after: raw   strict
 10000 main              1.60   2.59  +62%               1.25   1.32  +5%
 10000 transfer/8        0.93   1.20  +29%               0.85   0.90  +6%
100000 main             19.93  32.38  +62%              16.57  17.40  +5%
100000 transfer/8        4.92   7.12  +45%               4.27   4.51  +6%
400000 main             45.42  76.90  +69%              40.34  42.02  +4%
400000 transfer/8       10.29  14.65  +42%               9.59   9.91  +3%
```

What moved it, in order:

1. **One helper over the union type**, the first form the checker accepted: +29–69%. The single load inside
   it sees Float32, Int32 and Uint8 elements.
2. **Restructured loops, union helper kept** (player and shockwave read into locals once per batch; one index
   range per row of three neighbour cells instead of three): raw got 6–22% faster, strict did not, so the
   overhead grew to +21–90%. That run's JSON was overwritten by the next run; the figures are from its printed
   summary (100k main: raw 16.77, strict 31.87).
3. **One helper per array type**, throw inline: +35% (100k main, 21.5 vs 16.0 ms, two interleaved runs each,
   not the full harness).
4. **The throw moved into `oob`**: +3–6%, the table's "after" column. With the message concatenation inline the
   helper was evidently too large for V8 to inline into the loops; that is inferred from the timing, not
   confirmed with `--trace-turbo-inlining`.
5. Tried and dropped: an explicit bounds compare (`if (!(i >= 0 && i < a.length)) throw …; return a[i]`) ran
   24.2 ms against raw 15.9 at 100k main.

The strict step after step 4 is faster than the first strict version and the first raw version alike, because
of the loop restructuring in step 2.

### `compile` with strict passing

`bun horde/try-compile.ts`:

```
check as compile runs it (tsx, default index mode): not ok = none
compile returned function
compiled island run in-thread on 4096 agents: nextAgents bit-identical to stepBatch, hits 0
```

Round 1's refusal (`compile refused: batchOnPool, stepBatch not ok by the checker`) is gone, and no new
refusal appeared. The compiled function was run only in-thread (bun has no `pagePool`); `hits 0` because the
agents had not reached the bullet in that 31-frame run, so the hits output is unexercised there. The page's
`lite` arm runs the same job shape on lite's `pagePool` (`lite-job.ts`), not through `compile` itself.

## SoundScript gaps found

Typed-array index reads are no longer listed: strict stays, and its cost is the section above.

- `Math.imul` is rejected (`no-member`); the hash (`hash01`) is xorshift32 rounds over (seed, frame, agent, k), which need no multiply.
- The `random` capability is banned in an island, so randomness is a pure hash of (seed, frame, agent, k).
- Function values cannot cross into an island; the step takes data only.
- Inputs are copied to the pool; only top-level typed-array outputs are transferred. There is no way to say
  "transfer this input" or "share this buffer", which is what made `sab` 1.6–2.1× faster than `transfer` at 17 workers here (1.2–1.6× at 8).
- lite's pool is capped at 8 workers and takes one job per call.
- An `action` that updates after an `await` would throw (read from `prelude.runtime.ts` `action()`, not run);
  the checker accepts it.
- Canvas and WebGPU are not reachable from checked cells (`navigator` is `inject-unknown`), so the renderer and
  the game loop are plain JS.
- A per-frame `Source` feeding a pool is untested.
- Mut arrays need their own helper types (above): no union of `Mut<…>`, no `ArrayLike<T>`, no index signatures,
  and a generic function type does not match itself when injected.

## Screenshots (`shots/`, `bun horde/shots.ts`)

All 1280 × 800, headless, frames stepped back to back with the bot in god mode.

| file | shows |
|---|---|
| `play-wave1.png` | 50k slots, wave 1 at 15 s: HUD, the ship (cyan arrow, dark halo, ring) firing a spread into a crowd; the kill pile stays coloured, not white |
| `play-wave-late.png` | 100k slots from wave 6, 61.5k alive: corridors packed with chevrons, diamonds and hexagons; camera pulled back, sprites scaled down |
| `shockwave.png` | 50k, wave 3, eight frames after a full-charge release: the grid bowl and the particle ring |
| `hud.png` | the HUD at wave 3: score, wave timer, health and charge bars, alive/active/max, workers button, pool slider, sim and main-thread ms |
| `workers-off.png`, `workers-on.png` | the same frame of the same run, main vs transfer ×17: step 13.3 ms vs 2.6 ms in the HUD |
| `overview.png` | the O camera over the whole maze at wave 6 |
| `ship-check.png` | close camera, particles and bullets hidden: the ship drawn above its halo |

Earlier files in `shots/` (`closeup*`, `explosion*`, `dense`, `overview-v*`) are round 1's sim and renderer.

Defects the round-2 iterations found and fixed, each seen in a screenshot first: the spark upload was dropped in
a refactor (no ship, no particles); the hurt flash grew without bound under constant contact and drove the ship's
colour to ±200, which bloomed into a white-green disc the size of a room; sparks summed to white in kill zones
(now max-blended); enemies brighter than the ship merged into one sheet when dense (now dimmed to 0.7, flash
capped).

## Not done, or not verified

- Only `transfer` and `main` were played in the page; `sab` in the page needs `serve.ts` and was not run there.
- The sim runs at a fixed 60 steps/s with at most one step per frame, so a slow frame slows the game rather
  than skipping steps. Not tested on a 60 Hz display headed.
- fps with a person playing is not measured; all fps figures are the bot.
- Audio: none.
- The first 10 s of wave 1 have no enemies on screen (spawns are far from the start room).
- 5% of sampled agents are still within 0.06 tiles of a neighbour; separation strength was not tuned further.
- GPU time per frame was not re-measured for round 2 (round 1: 0.98 ms at 10k to 7.9 ms at 1M).
