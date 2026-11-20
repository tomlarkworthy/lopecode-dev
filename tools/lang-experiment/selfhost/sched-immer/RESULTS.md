# immer and in-place variants of the delivery step (2026-11-20)

Paths relative to `tools/lang-experiment/`. Nothing outside `selfhost/sched-immer/` was changed. immer 11.2.10,
installed with `npm install immer` into `selfhost/sched-immer/node_modules` (own `package.json`; `bun add` failed
with `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`).

| file | role |
|---|---|
| `core.ts` | the decisions of `../sched/step.ss.ts` over a mutable view (live records, so each helper reads before it writes); plain TS, unchecked |
| `variants.ts` | `copy` (`../sched/step.ss.ts` linked unchanged), `inplace-patch`, `inplace-replace`, `immer-{map,obj,bucket}-{freeze,nofreeze}` |
| `factory.ts` | `../sched/shell.ts` as `makeShell(impl)`; `shell.ts` is one instance picked by `SCHED_VARIANT` |
| `bench.ts` | `../sched/bench.ts` over all variants plus `cells.ts`; arm order rotates per round |
| `run-tests.ts` | `../sched/run-tests.ts` redirecting `cells.ts` to `shell.ts` |
| `check.ts`, `probes.ss.ts`, `probes-inplace.ss.ts` | the real checker over the probe files |
| `demo/hazards.ts`, `demo/micro.ts` | immer runtime behaviour; one-produce cost |

## Bench

`bun selfhost/sched-immer/bench.ts`: 20000 values, one warm-up, 5 rounds, min-max µs per value.

Run 1 (`bench-all.txt`), all variants, eagerly reading all five state maps per step. The checker probes and demos
ran at the same time, so this run is noisy (`original` 0.11-0.20 here against 0.08-0.09 in `../sched/DESIGN.md`).

```
variant                L=1 H=0       L=3 H=0       L=1 H=100     L=1 H=1000
original (cells.ts)    0.11-0.20     0.18-0.22     0.12-0.15     0.14-0.20
copy                   1.01-1.16     1.51-1.57     7.00-7.15     20.01-21.64
inplace-patch          0.92-1.13     1.34-1.49     0.90-0.99     0.93-1.08
inplace-replace        1.00-1.09     1.48-1.65     0.98-1.06     1.07-1.21
immer-map-freeze       19.39-19.88   30.44-34.14   33.29-37.15   126.80-135.89
immer-map-nofreeze     12.82-13.59   20.86-22.74   16.63-19.23   24.30-25.96
immer-obj-freeze       20.99-21.19   32.89-34.97   112.66-119.17 1227.90-1299.13
immer-obj-nofreeze     15.04-15.52   23.89-28.03   47.96-51.21   305.05-388.09
immer-bucket-freeze    21.79-22.68   34.43-37.92   23.86-30.15   31.05-36.24
immer-bucket-nofreeze  14.29-14.61   22.15-23.98   14.63-16.22   16.21-18.54
```

Run 2, quiet machine: `core.ts` reads `at`/`ls`/`lat`/`born` through the view at each use, so immer drafts only
the maps a step touches (`bench-lazy.txt`); then the same with immer's `enableArrayMethods()`
(`IMMER_ARRAY_METHODS=1`, `bench-lazy-arraymethods.txt`):

```
                       L=1 H=0       L=3 H=0       L=1 H=100     L=1 H=1000
original               0.11-0.15     0.15-0.26     0.10-0.16     0.12-0.16
copy                   0.95-1.14     1.40-1.56     6.62-7.68     19.59-22.22
inplace-patch          1.08-1.26     1.58-1.64     1.09-1.23     1.11-1.23
inplace-replace        1.16-1.37     1.74-1.90     1.18-1.35     1.26-1.38
immer-map-freeze       17.66-18.10   28.16-29.83   30.65-36.16   120.46-123.38
immer-map-nofreeze     11.22-11.68   18.71-21.38   14.62-16.89   22.47-23.21
immer-bucket-freeze    20.20-22.32   33.23-35.74   21.81-27.57   28.08-33.99
immer-bucket-nofreeze  12.46-13.12   20.94-22.31   13.09-14.64   14.14-15.68
+ enableArrayMethods:
immer-map-nofreeze     10.57-11.74   16.09-16.96   13.75-15.24   21.23-25.15
immer-bucket-nofreeze  11.75-12.46   18.02-19.00   12.19-16.01   13.04-17.57
```

Both in-place variants remove the growth with H. No immer shape removes it: flat `Map` and plain object still grow
(the first write copies the whole container, and finalize walks it); the bucketed shape (`Map<hid >> 6, Map<hid, Hs>>`,
64 hids per bucket) costs O(H/64 + 64) per write and grew 14.29 → 16.21 (nofreeze, run 1) over H = 0 → 1000. Every immer
variant is 10.6-22 µs per value at H = 0. Lazy map reads took 0.5-1.6 µs off; `enableArrayMethods` another 0.5-2.

- `inplace-patch` writes fields of the live record (`Object.assign`); `inplace-replace` mutates the Maps but replaces
  each record with a spread (readonly `Hs`, the form the checker accepts, see below). They differ by ≤ 0.1 µs.
- At H = 0, `inplace-*` ≈ `copy` (0.92-1.13 against 1.01-1.16). The ~0.9 µs over `cells.ts` is not copying; it is
  the event/effect protocol and the closures `step` makes per call. Not profiled further.
- immer's floor, `demo/micro.ts`: one produce patching one field of a 1-entry Map is 0.54 µs (autoFreeze off) /
  1.19 µs (on); touching the other four maps adds 0.25. A value is L+3 steps, so the produce floor is about 2-6 µs
  per value at L = 1 against 10.6-13 measured. The rest (draft arrays through `slice`/spread/`includes`,
  `Object.assign` through the proxy, `core.ts` closures) was not broken down; a recipe written for immer from
  scratch might land nearer the floor. Not tried.

Correctness: `lite/stdlib/runtime.test.ts` through `run-tests.ts`, 2026-11-20: `inplace-patch`, `inplace-replace`,
`immer-bucket-freeze`, `immer-map-nofreeze` each `67 pass, 0 fail`, 14721 steps (the same step count as
`../sched`), on run 1's `core.ts`; after the lazy-read edit, `inplace-patch` and `immer-bucket-nofreeze` (with and
without `enableArrayMethods`) again `67 pass, 0 fail`, 14721 steps. An intermediate edit that left two
`[...lat.values()]`/`[...at.values()]` reading a destructured name that no longer existed gave `59 pass, 9 fail`,
11662 steps; that is the only negative control. Not run: `delivery.test.ts`, the other variants.

## immer from SoundScript

Proposed built-in: `produce<T>(base: T, recipe: (draft: Draft<T>) => void): T`, where `Draft<T>` is a deep `Mut`.
`Mut<T>` alone is not enough: it is shallow (`[mut-deep-write]`), so `(draft: Mut<T>) => void` can only replace
top-level fields, which is the copy again.

Probes model `produce` as a helper `(b: S, recipe: (d: Mut<S>) => void): S => { const d = mut({ ...b }); recipe(d); return freeze(d); }`.
`bun selfhost/sched-immer/check.ts` → 32 cells; controls `ok_control`, `ok_control_block_fn` ok. Runtime behaviour
from `bun selfhost/sched-immer/demo/hazards.ts`.

| case | existing checker | immer at runtime | gap, est. checker lines |
|---|---|---|---|
| draft returned from recipe | `[mut-escape] Mut d returned` | becomes the new state | none |
| draft kept in a closure | `[let-capture] let f assigned from a function that escapes`, `[mut-capture] Mut d captured by a function that escapes` | revoked proxy | none |
| draft in a record | `[mut-escape] Mut d placed in an object literal` | | none |
| draft passed to a plain parameter | `[mut-escape] Mut d argument to a parameter not typed Mut<…>` | | none |
| draft passed to a `Mut<S>` helper | ok (`p24`) | fine | none |
| draft aliased / frozen | `[mut-escape] Mut d bound to a second name`; `[mut-freeze-param] freeze(d): only a Mut created by mut() in this function can be frozen` | | none |
| sub-object read out, used after (`let sub = d.inner`) | `[let-capture] let sub assigned …` | `throws Proxy has already been revoked` | covered only because the recipe is an escaping lambda; see next row |
| recipe pushes into an outer Mut (effects list) | `[mut-capture] Mut out captured by a function that escapes` | | the recipe must be marked called-once/non-escaping so it can push effects (~15); once it is, `out.push(d.inner)` passes: `p25` (a `Mut<S>` helper doing `out.push(x.inner)` into another Mut) is ok, because `x.inner` is typed `I`, not Mut. Reads from a `Draft` must stay `Draft` (default-deny) (~30) |
| sub-object passed to a plain function (`keep(d.inner)`) | ok (`p26`) | fine while `keep` cannot retain it; SoundScript functions can retain only through a Mut or `let`, both covered | none today; with the `Draft` read rule it becomes `[mut-escape]` unless the parameter is `Draft` |
| sub-object returned from the recipe (`d => d.inner`) | ok (`p27`) | becomes the new state (wrong type, `I` for `S`) | covered by the return-must-be-`undefined` rule below |
| async recipe | ok (`p08`) | `throws [Immer] An immer producer returned a new value *and* modified its draft` | reject async/generator at the `produce` argument (~5) |
| generator recipe | ok (`p09`) | state replaced by the generator object (`result.n` = `undefined`) | same rule |
| mutates and returns a value | ok (`p10`: a `number`-returning lambda is accepted where `=> void` is declared) | throws (as above) | recipe return must be `undefined` exactly (~5) |
| `base` is a Mut | `[mut-escape] Mut m argument to a parameter not typed Mut<…>` | result keeps its own copy (`result.n` 1 after `base.n = 9`) | none |
| nested produce with a draft as base | `[mut-escape] Mut d argument …` | inner result discarded, outer `n` 0 | none |
| nested produce on a plain value | ok (`p13`) | fine | none |
| Mut inserted into the draft | `[mut-escape] Mut xs assigned to a binding` | autoFreeze freezes it | none |
| immutable value inserted | ok (`p15`) | autoFreeze freezes it (`inserted user object frozen: true`); harmless for SoundScript values, but the shell's `args` array and delivered user objects get frozen | none in the checker; shell must accept it or turn autoFreeze off |
| Map/Set draft read | ok (`p16`) | draft of the value | covered by the `Draft` read rule above |
| Map draft write / nested record write | `[mut-deep-write] write below the first level of a Mut (Map<number, I> is not Mut)` | intended use | `Draft<T>`: allow writes at any depth through draftable types (record, array, Map, Set) (~30-40) |
| identity draft vs base | `[strict-eq-object] === on two non-primitive operands; use equals(a, b)` | `false` for both `d === base` and `d.inner === base.inner` | none |
| typed array / Date in the draft | `[mut-deep-write] … (Float32Array is not Mut)`; Date not probed in the checker | not drafted: write reaches base (`base.buf[0]` 7, `base.d.getTime()` 5), result shares it | `Draft` must stop at non-draftable types, i.e. keep this rejection (~5) |
| `produce` signature itself | | | intrinsic `.d.ts` line + `Draft` in `types.ts`/`infer.ts` (~20) |

Estimated total for a safe `produce`: 110-130 checker lines (unverified estimate; no code written). The largest part
is `Draft<T>` as a deep Mut whose reads stay drafts.

## In-place from SoundScript

`bun selfhost/sched-immer/check.ts selfhost/sched-immer/probes-inplace.ss.ts` → 14 cells.

- ok: `(hs: Mut<Map<number, H>>, at: Mut<Map<string, number>>, ev: Ev): readonly Fx[]` with a local helper that
  `get`s, `set`s a spread record, pushes to a local `mut` effects list, a `switch`, and `return freeze(fx)`.
- ok: a caller cell `mut(new Map(...))`, two steps, `freeze` each map.
- ok: returning a record (`H | undefined`, immutable) or a copy `[...hs.keys()]`.
- rejected: `return hs` `[mut-escape] Mut hs returned`; `[{ fx: "keep", hs }]` `[mut-escape] Mut hs placed in an
  object literal`; `() => hs.size` `[mut-capture] Mut hs captured by a function that escapes`; `hs.keys()` returned
  `[mut-view] a view aliasing a Mut buffer, returned`; `freeze(hs)` `[mut-freeze-param]`; pushing `hs` into another
  list `[mut-escape] … parameter not typed Mut<…>`.
- rejected, limits the shape: `st: Mut<{ hs: Map<…>; placer: boolean }>` with `st.hs.set(...)` →
  `[mut-deep-write] write below the first level of a Mut (Map<number, H> is not Mut)` (top-level `st.placer = …` is
  ok); `h.busy = true` on a record from the map → `[member-write] write to a H, which is not Mut`. So the checked
  form is one `Mut` parameter per map plus a `Mut` record for the scalars, records replaced, not patched, which is
  `inplace-replace` (0.98-1.21 µs).
- gap: `async (hs: Mut<…>, ev) => { await …; hs.delete(…) }` is ok; a Mut parameter held across `await` lets the
  caller interleave. Rule: no `await`/`yield` in a function with a `Mut` parameter (~5 lines, next to
  `borrowed-await`).

What the shell has to promise (not checkable by the checker, since the shell is unchecked):
1. It holds the only reference to the state maps; queries (`running`, `pulling`, ...) read them between steps only.
2. `step` is not re-entered while it runs (`feed` calls `step` from one loop; a re-entrant `feed` from a listener
   runs between steps, not inside one).
3. A throw inside `step` leaves the maps half-written. `copy` and immer are atomic (the old state is kept). The
   shell must treat a throw as fatal or snapshot first.

## immer's delivery cost

`node_modules/immer/dist/immer.production.mjs`: 16269 bytes, 6638 gzip, one ESM file with no imports;
`enableMapSet`, `current` and `Immer` are in it. It would have to be vendored into the notebook as a file
attachment or module. Not vendored.

## Recommendation (2026-11-20)

If the `step(state, ev) -> { state, effects }` signature stays, immer on its own terms: `immer-bucket-nofreeze`
(two-level `hs`, autoFreeze off, `enableArrayMethods`) at 11.75-12.46 µs per value at H = 0 and 13.04-17.57 at
H = 1000. That is slower than `copy` below H ≈ 500 (copy 6.62-7.68 at H = 100, 19.59-22.22 at H = 1000) and costs
~110-130 checker lines and 6.6 kB gzip vendored. autoFreeze off loses immer's freeze of the result; SoundScript's
types already forbid writing it, so the freeze guards only the unchecked shell.

In-place gives up that signature (the state goes in as `Mut` and is not returned) and gives 1.08-1.38 µs at every H
measured, checkable today with one `Mut` parameter per map, no dependency. The cost is the shell's three promises
above; non-atomicity on a throw is the one with behaviour, and snapshot-on-throw or treating a throw as fatal are the
ways out. A structure-sharing map inside the `copy` design keeps both the signature and atomicity; not tried.

I recommend in-place, with the step still pure in the sense that matters for testing (same events in, same effects
out, given the same starting maps).

Not done: a fresh-agent review of this file.
