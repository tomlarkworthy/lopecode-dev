# suminagashi: gaps and findings

Port done 2026-11-14 against RULES.md (v0 with the "v1, after the pilot" paragraphs). Every
`check`/`run` output quoted below is real, either from this port or from three probe ports of minimal repros in the session scratchpad (not kept;
their source is pasted in §12, line numbers in quoted errors refer to it).

Test assertions: none changed. Call sites inside two tests changed because the contours API changed
(§1). `runTests` starts `true` instead of `false` (§7).

## 1. Per-frame mutable state has no home: the contours

The original `createContours(w, h)` returns an object whose `curves` array holds one record per drop,
each with two `Float32Array`s (`xy` and a `spare` it swaps with on every re-spacing). Three parties
mutate it: `contours.advect` (CPU), `mainLoop` (`birth` every touch), and `contourPainter.respace`
(`unpack` + `resample` from GPU read-back). The rules offer three opt-ins; none fits.

**Mut locals.** A Mut may not be placed in a literal, so there is no array or record of mutable
buffers:

```
probe/cells.ts:2:73 [mut-escape] Mut a placed in a literal          const xs = [a]
probe/cells.ts:7:81 [mut-escape] Mut a placed in a literal          const s: S = { xy: a }   (S has a Mut<Float32Array> field)
```

A deep write `c.curves[0].xy[0] = 1` through `const c = mut({curves: [...]})` passes `check` (probe
cell `p2`, no error reported), but only because `member-write` accepts any write whose access-chain
root is Mut: this is known slip `s6`. Not used.

**Owner cell.** An owner generator mutates what it owns between yields and lends it read-only. Here
the mutation is driven by the consumer (the animation loop decides when to birth, advect, respace),
and `Borrowed` is read-only to that consumer. The contours also outlive any one generator: `mainLoop`
restarts when `view` or `params` change and must resume the same picture. An owner would have to
absorb the whole loop.

**Ref.** Each commit re-runs every value dependent. At 60 solves a second a ref holding the contours
would restart `mainLoop` every frame if it took the value, and give it nothing to read if it took the
`Ref` (§3). Writes are also impossible from the loop's own steps (§4).

**Untried: a flat layout.** All curves in one Mut buffer plus an offsets array would keep in-place
writes legal (one Mut binding, written through directly). Cost: every re-spacing that changes a
curve's vertex count repacks the buffer behind it, `curves[k].xy` disappears from the API that
`contourPainter` and the tests use, and the buffer still could not persist across frames outside a
generator (owner/ref problems below apply unchanged). Not tried.

**What was done.** The contours became an immutable value (`createContours`, tier mut-local). `birth`,
`advect`, `resample(k?)` and `unpack` return the next value; every new buffer is a `Mut` local frozen
on return. The current value lives in a plain `let` in the shell `mainLoop`, written back to
`tray.contours` each frame so a restarted loop resumes it. That `let` is neither owner nor ref: the
per-frame state sits in the shell, unchecked. `differential.ts` holds the value semantics to the
original (§11). One difference it does not cover: `resample(k)` with `k` out of range throws in the
original (`curves[k]` is undefined) and in the port re-maps nothing and bumps `version`.

The loop's other private state (`emitters`, `owed`, `lag`, `busy`, `stroked`, `lastTouch`) would
fit a checked generator's locals. It is in the shell only because the same generator drives the GPU.

Call sites change shape. Original vs port, `test_lines_keep_their_area`:

```js
contours.birth({ x: 64, ... });                          contours = contours.birth({ x: 64, ... });
for (...) contours.advect(velocity, 1);                  for (...) contours = contours.advect(velocity, 1);
```

and `contourPainter.respace(onGpu, 1)` became `onGpu = contourPainter.respace(onGpu, 1)` in
`test_gpu_and_cpu_carry_lines_alike`.

## 2. Buffers reused across frames

The original re-spacing writes into `curve.spare` (grown to 6n when shorter than 4n) and swaps it with
`xy`, so a steady-state `advect` allocates nothing. The port allocates a 2n buffer per curve in
`advect` and a 4n buffer per curve in `resampleCurve`, every call. Measured 2026-11-14 with
`bun ports/suminagashi/differential.ts` (one `advect` call, which re-spaces every curve; 200 reps,
median; the original's state restored untimed before each rep, the two sides alternated):

```
bench advect: 60 curves, 5210 vertices in, 5232 out, 200 reps
  original median 0.363 ms, port median 0.367 ms, ratio 1.01
bench advect: 800 curves, 51224 vertices in, 51195 out, 200 reps
  original median 3.457 ms, port median 3.498 ms, ratio 1.01
bench test_lines_keep_their_area: original median 0.901 ms, port median 0.944 ms, ratio 1.05
```

`mut`, `freeze` and `borrow` are the identity at run time (`prelude.runtime.ts`), so the measured cost
is allocation alone. In this loop the bilinear sampling dominates and the allocation is about 1%.
Not measured: GC pauses over minutes of frames, and the GPU path, where the CPU only re-spaces about
12% of vertices per solve (`respace` share 0.12) and the allocation share would be larger.

`tray.read(what, into)` also reuses a caller's buffer; it is shell, and kept as it was.

## 3. Reading current state without depending on it

The original event handlers and the animation loop read `$0.value` (a `Mutable`) at call time:
`canvas`'s pointerdown reads `finished`, `tool` and `turn`; pointermove and release read `pointer`;
`mainLoop` reads `pointer` and `finished` every frame. A `Ref` has no read:

```
probe/cells.ts:10:39 [ts2339] Property 'value' does not exist on type 'Ref<number>'.
```

A value parameter is the wrong semantics: it would rebuild `canvas` (and with it `ctx`, `gl`,
`programs`, `createTray`, `tray`) on every touch, and restart `mainLoop` on every pointer move.

What was done, by case:

- **One ref read and written together**: `update` covers it. pointermove is
  `pointer.update((p) => (p && p.down ? { ...p, x, y } : p))`, release likewise. One difference: the
  original writes nothing when the pointer is not down; `update` returning `p` still commits, so
  `pointer` re-yields the same value.
- **Reading a widget**: `canvas` takes the shell cells `tool_view` and `reset_view` and reads
  `tool_view.value` and clicks `reset_view`'s button at event time, as the original reads `$2.value`.
  So the `tool` ref has no consumer at all.
- **Several refs, or per frame**: a shell box `live` and three mirror cells `live_turn`,
  `live_pointer`, `live_finished` that copy each committed value into it. pointerdown reads
  `live.finished` and `live.turn` and computes the fluid from `live.turn + 1` itself, because the
  original's `turn++` followed by a read of `turn` cannot see a queued write. `mainLoop` reads
  `live.pointer` and `live.finished`.

The mirror box is Observable's `mutable` rebuilt in the shell, unchecked. Two pointerdowns inside
one macrotask would both read the old `live.turn` (the write commits in a `setTimeout(0)`); not
reproduced, reasoned from `prelude.runtime.ts` `action`. A non-subscribing read (a `peek` on `Ref`
allowed in shell or in actions) would remove the four mirror cells. Not invented here.

## 4. Writes during an evaluation: `tray` and `mainLoop`

`tray` writes `$0.value = false; $1.value = 0` while it evaluates (a new tray is a new picture), and
`mainLoop` writes `finished = {at, why}` inside a generator step. Both throw at run time in shell:

```
rejected   shell.ts:p5  action called during a cell evaluation           (generator step calls an action)
rejected   shell.ts:p6  Ref r: set/update called outside an action       (cell body calls r.set)
```

and the checked form is rejected statically:

```
probe/cells.ts:13:47 [action-call] bump(): an Action may be called only inside action(...)
```

Alternative considered for `tray`: make `turn` and `finished` refs that depend on `tray`, so a new
tray resets them (the `accept-ref-deps` semantics). Rejected: `canvas` takes `turn: Ref<…>`, which
would then depend on `tray`, and `tray` depends on `canvas` through `createTray → gl → ctx`: a cycle.

What was done: both shell cells call the action in `queueMicrotask`, after their synchronous part.
Probe 3 (§13) shows the pattern commits, from a cell body and from each step of a generator:

```
fulfilled  cells.ts:r  3          (one deferred bump from q1 + one per step from the 2-step generator q2)
fulfilled  shell.ts:seen  3
```

In `mainLoop` the write commits a frame later than the original's, so the loop keeps its own copy
(`finishing`) and the frame that finishes the picture takes the finished branch, as in the original.
`tray` and `mainLoop` themselves were not executed (no GPU headless).

## 5. Identity-keyed GPU caches

`contourPainter` keys what the GPU holds by the contours object (`tended: Map<contours, …>`, for
`retain`/`forget` across trays) and by each curve object. With immutable contours every `advect`
produces new objects. The port gives each value a `lineage` field, the same `{}` in every value
derived from one `createContours` call, and keys curves by index (curves are only appended). The
field exists only so the shell has an identity to key on; `===` on objects is banned in checked code
(`strict-eq-object`), so only the shell compares it. Not executed.

## 6. viewof inputs

All eight fit the recipe: a ref in `cells.ts`, a `*_view` shell cell that calls `set` in an action.
Costs:

- The initial value is written twice, in the ref and in the widget (`ref(570)` and
  `Inputs.range(…, { value: 570 })`), for `tool`, `view`, `height`, `cellSize`, `backgroundFilm`,
  `runTests`. Giving the widget the value as a dependency would rebuild the slider during a drag.
  `params` avoids it: both take `defaults`.
- `Inputs.button`'s value is its click count; `reset = ref(0)` assumes 0 is its initial value (from
  the @observablehq/inputs docs, not checked here, since `Inputs` is not loaded).

## 7. Tests

| test | headless | why |
|---|---|---|
| `test_lines_keep_their_area` | pass, both orders | CPU only; was already the one passing baseline test |
| `test_film_is_conserved` | blocked | `ctx.format.bits` and `ringExperiment` → `createTray` (WebGL2) |
| `test_ink_becomes_a_ring` | blocked | `ringExperiment` → `createTray` |
| `test_fluids_stay_apart` | blocked | `ringExperiment` → `createTray` |
| `test_film_settles_flat` | blocked | `ringExperiment` → `createTray` |
| `test_pressure_stays_centred` | blocked | `ringExperiment` → `createTray` |
| `test_water_settles_on_an_odd_tray` | blocked | `createTray` directly |
| `test_gpu_and_cpu_carry_lines_alike` | blocked | `createTray`, `contourPainter` (transform feedback) |

Newly runnable: 0. Every blocked test's subject is a GPU simulation run, so separating CPU logic from
WebGL frees none of them. The baseline blocks them on `width`/`DOM` only because `ctx` is made from
the page's `canvas`; with those supplied they would, by reading, fail next at
`getContext("webgl2")` (happy-dom has no WebGL; not run). A WebGL2
context not derived from the page canvas would change the dependency structure; that is a design
change, not a port, and was not tried.

`test_lines_keep_their_area`'s value in both orders is the baseline's string:

```
fulfilled  [pass] cells.ts:test_lines_keep_their_area  "a quarter turn changed the area by 6.0e-7 and left the centre 2.6e-4 cells off, on 76 vertices"
```

`runTests`: the original toggle starts `false`, and every test returns `"not run: …"` until it is
on, which would pass vacuously. The baseline forced it `true` (`baseline/baseline.ts` OVERRIDES);
`run.ts` has no override hook, so the port's ref starts `true`. The shipped default differs.

The GPU tests could not go in `cells.ts`: they call `ringExperiment()`/`createTray()`, which seen
from `cells.ts` are `Js` and cannot be called, and declaring them in `foreign.d.ts` would have to
mark them `/** pure */` to be taken by a checked cell, which they are not. They are in `shell.ts`
with bodies unchanged (except §1's reassignments in `test_gpu_and_cpu_carry_lines_alike`).

## 8. Harness findings

**A `test_*` cell in `shell.ts` that is skipped counts as `fail`, not `blocked`.** Probe:

```
shell-skip shell.ts:dom  DOM is not defined
shell-skip [fail] shell.ts:test_shell  DOM is not defined
order forward: tests pass 0, fail 1, blocked 0; settled true
```

`run.ts` `results()` sets `test = "fail"` for any status other than fulfilled or blocked, and gives
a shell cell `shell-skip` before the `blocked` check runs. So this port's runs print
`tests pass 1, fail 7, blocked 0` and exit 1, and `report.ts` prints `1/8` with no blocked note. The
7 are blocked exactly as in the baseline, rejected with `width is not defined` (forward) or
`DOM is not defined` (reverse). No workaround: the only alternative was moving the tests, which §7
rules out. Not fixed (harness is out of scope).

**An `any`-valued shell cell is `unknown` to its shell consumers.** `canvas` returns
`DOM.canvas(…)`, which is `any` (stdlib parameters are `any`). Its consumer `ctx` got 257 errors of
this kind on first check:

```
ports/suminagashi/shell.ts:156:5 [ts18046] 'canvas' is of type 'unknown'.
ports/suminagashi/shell.ts:211:20 [ts18046] 'gl' is of type 'unknown'.
```

Cause, reasoned from `prelude.d.ts`: `__CellValue<any>` matches the first branch,
`[any] extends [RefCell<infer T>]`, and `infer T` from `any` gives `unknown`. Worked around by
annotating seven parameters `: any`: `tool_view` and `reset_view` in `canvas`, `canvas` in `ctx` and
`download`, `gl` in `programs`, `createTray` and `contourPainter`.

**Skip messages differ by order** (`width` vs `DOM`, `html` vs `Inputs`): whichever undefined stdlib
name rejects first. `compareOrders` ignores shell values, so the report says identical.

**`report.ts` mixes units.** Checked tiers come from `check` (cells: default 24 includes the 5
port-only action cells) and shell/prose/import from `MAP.md` (rows). The 38%/5%/17%/41% split is over
that mixed denominator. `MAP.md` gives row counts: default 19, mut-local 3, ref 17, shell 26.

**`run.ts` never calls an action.** The 5 action cells are only `fulfilled` as values. They were
exercised separately with `bun ports/suminagashi/drive-actions.ts` (uses `run.ts`'s exported
`loadPort`, calls each action outside any evaluation, settles), both orders identical. Forward, abridged:

```
initial: turn=0 pointer=undefined finished=false
pointerMove while no pointer: turn=0 pointer=undefined
pointerDown brush: turn=1 pointer={"touch":1,"tool":"brush","fluid":0,"x":10,"y":20,"down":true}
pointerMove while down: ... "x":11,"y":21,"down":true}
pointerUp: ... "x":11,"y":21,"down":false}
pointerMove after up: ... "x":11,"y":21,"down":false}
finishPicture: finished={"at":123,"why":"why"} live={...,"finished":{"at":123,"why":"why"}}
resetPicture: turn=0 finished=false live={"turn":0,...,"finished":false}
```

`live` tracked every commit. The widget writes (`*_view` cells' `set`) were not exercised:
`Inputs` is not loaded.

No known slip from the README was needed (`s6` was probed and declined, §1). `subarray` appears in
`pack` and `unpack` only as a read source on a non-Mut value (`packed.set(xy.subarray(0, 2 * n))`),
never returned or written through.

## 9. Values crossing the checked/shell boundary

By parameter (`check --json` `inputs[].source`): shell → checked, none; checked → shell, 44
distinct values over 62 edges: 16 shader strings, `fluids`, `sequence`, `defaults`, `absorbance`,
`createContours`, the 5 actions, 11 ref values (`tool` has no value consumer, so 10 of them) and 8
`Ref`s (to the `*_view` cells).

At run time, from the shell into checked state or code:

- 8 `set` calls, one per `*_view` widget;
- 5 action calls: `pointerDown(pointer, rotate)`, `pointerMove(x, y)`, `pointerUp()` from `canvas`,
  `resetPicture()` from `tray`, `finishPicture(at, why)` from `mainLoop`;
- 3 mirror reads of committed ref values (`live.turn`, `live.pointer`, `live.finished`);
- checked functions called with data the shell made: `createContours(tray.width, tray.height)`,
  `contours.birth({…, color: flat(fluid)})`, `contours.advect(tray.read("velocity"), 1)` (a GPU
  read-back) and `contours.unpack(k, packed)` with `packed` from `gl.getBufferSubData`.

The last group enters checked code already typed (`Float32Array`, `number`), with no `Js` decoder.
RULES requires a decoder only for a shell *cell's value* seen from `cells.ts`; it says nothing about
a shell cell passing arguments to a checked function value it holds. Here that is safe in the sense
that the checked code only reads what it is given, but the type is the shell's assertion, unchecked.

## 10. CPU code left in the shell

Under "do not split a function into a checked half and a shell wrapper", three CPU loops stay in
shell because the function they live in drives the GPU:

- `ringExperiment`'s summary over the read-back film (ink, mixed ink, least/most, the ring row,
  pressure mean);
- `createTray`'s `read` interleave of two RGBA textures into 8 fluids per cell;
- `test_water_settles_on_an_odd_tray`'s fastest-speed loop.

## 11. Verification beyond the tests

`bun ports/suminagashi/differential.ts` loads the original cell functions from the module source and
the port's `cells.ts`/`shell.ts`, and compares (typed arrays elementwise with `Object.is`, records by
key order). Inputs from a seeded PRNG:

- the 16 shaders, `fluids`, `defaults`; the 17 markdown cells' raw text (through a `String.raw` tag);
- `sequence` and `absorbance` on the real fluid list and 300 generated ones (1 to 8 fluids, a quarter
  with `color: null`);
- `createContours`: 60 runs on trays of 8 to 127 cells a side (non-square), spacing 0.5/1/2/3 or
  default, three velocity fields (swirl+radial, ×6 fast, noisy), 40 random steps each among `birth`
  (drops partly outside the tray, `outline` absent/true/false), `advect` (dt 0.1 to 4), `resample(k)`
  and `resample()`, and `pack` then `unpack` of a perturbed copy. After every step the whole state is
  compared: width, height, spacing, version, count, each curve's color/outline/n and the first 2n of
  `xy`, `area(k)` and `pack(k)` of every curve;
- `test_lines_keep_their_area` end to end.

Result on 2026-11-14:

```
data/shader cells: 18
prose cells (raw text): 17
sequence + absorbance inputs: 301
contours operation steps: 2400
test cells: 1
3441 comparisons, 0 differ
```

Bitwise equal, including after 2400 operation steps; only the first 2n of `xy` is compared, since
the original's buffers carry stale capacity beyond it. Not exercised: everything in `shell.ts` except
`live*` (no browser, no GPU), including the re-keyed `contourPainter` and the rewritten `mainLoop`.

## 12. Readability and typing costs

Better:
- The contours as a value: `contours = contours.advect(v, 1)` says what changed, and the CPU/GPU
  aliasing (CPU `xy` stale between re-spacings while the GPU holds newer vertices) is now visible as
  two different values rather than one object read at different times.
- `sample(out, …)` taking its output buffer instead of closing over a shared one.
- Types (`Contours`, `Curve`, `Pointer`, `Finished`) document what the mutables hold; the original
  leaves `finished` as `false | {at, why}` to the reader.

Worse:
- Four mirror cells and a box to do what `$0.value` did (§3).
- Two deferred action calls with a hand-kept local copy (§4).
- `lineage`, a field that exists for the shell's caches (§5).
- `absorbance`: `forEach` became an index loop because the callback would capture the Mut.
- `unpack`: the buffer is frozen into a temporary before `curves.map`, for the same reason:

```js
curves[k].xy.set(packed.subarray(0, 2 * curves[k].n));    const xy = mut(new Float32Array(2 * n));
                                                          xy.set(packed.subarray(0, 2 * n));
                                                          const taken = freeze(xy);
                                                          return make(curves.map((c, i) => (i === k ? { ...c, xy: taken } : c)), version, lineage);
```

Typing costs: explicit type arguments `ref<Tool>("brush")`, `ref<Finished>(false)`,
`mut<Curve[]>([])`; in the shell, `any` on WebGL values and on inner-function parameters
(`noImplicitAny` applies to `shell.ts`), and `ReturnType<ValueOf<"createContours">>` to name the
contours type there.

## 13. Probe source

`probe/cells.ts` (`check`: the 4 errors quoted in §1, §3, §4):

```ts
export let p1 = () => { const a = mut(new Float32Array(2)); const xs = [a]; return xs.length; };
export let p2 = () => { const c = mut({ curves: [{ xy: new Float32Array(2) }] }); c.curves[0].xy[0] = 1; return 1; };
type S = { readonly xy: Mut<Float32Array> };
export let p2b = () => { const a = mut(new Float32Array(2)); const s: S = { xy: a }; return s.xy.length; };
export let r = (): RefCell<number> => ref(0);
export let p3 = (r: Ref<number>) => r.value;
export let bump = (r: Ref<number>) => action(() => r.update((v) => v + 1));
export let p4 = function* (bump) { for (;;) { bump(); yield 1; } };
```

`probe2/` (`check` 0 errors; `run` output quoted in §4 and §8): `cells.ts` is `r` and `bump` above;
`shell.ts`:

```ts
export let p5 = function* (bump) { bump(); yield 1; };
export let p6 = (r: Ref<number>) => { r.set(2); return 1; };
export let dom = (DOM) => DOM.canvas(1, 1);
export let test_shell = (dom) => 1;
```

`probe3/` (`check` 0 errors; `run` output quoted in §4): `cells.ts` is `r` and `bump` above;
`shell.ts`:

```ts
export let q1 = (bump) => { queueMicrotask(() => bump()); return 1; };
export let q2 = function* (bump) { for (let i = 0; i < 2; i++) { queueMicrotask(() => bump()); yield i; } };
export let seen = (r) => r;
```
