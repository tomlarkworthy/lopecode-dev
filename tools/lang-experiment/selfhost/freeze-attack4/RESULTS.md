# Freeze attack, round 4 (2026-11-22, 23:15–23:37 CET)

Target: the tree after rule set R round 2 (NOTES-checker-port.md, last section). The claim under attack, as the brief
for this round put it: for a program of checked cells that the checker accepts, a value another cell holds (or an
earlier delivered value of the same cell, or what a held function, promise or generator later gives) never changes
silently; a throw at the write or at publish is a pass. T1 = silent with everything on. T2 = silent only with closure
registration off (`SS_MEASURE_REG=0`, freeze.ts) and the freeze kept. The owner's question: is the known T2 mechanism
(a kept function returning a Mut held inside a captured local, e.g. `{ readonly t: Mut<number[]> }`) the only reason
registration exists?

Rerun:
```
./runall.sh        # c0 b1 b2 b3 b4 b5 erg through ../freeze-attack3/run.ts, shipped -> out-a.txt,
                   # then SS_MEASURE_REG=0 -> out-b.txt; summary.txt is its output
bun probe.ts p6.ts # checker verdict plus every message, for a list of [name, src]
```
freeze-attack3's `harness.ts`/`run.ts` are imported, not copied (verdictOf rules on, runCells, `checked`, promise
snapshots, every function called again at the end). `W` in sources below is `for (let i = 0; i < 300; i++) await null;`
(harness.ts:13). Nothing outside this folder was written.

## Counts (23:37 run)

```
## out-a.txt (shipped)                       ## out-b.txt (SS_MEASURE_REG=0)
-- controls 7, fired 6                       -- controls 7, fired 7
-- 223 candidates, accepted 135, silent 5    -- 223 candidates, accepted 135, silent 56
```
223 = 192 attack programs (b1 52, b2 66, b3 28, b4 21, b5 25; 118 accepted) + 30 ergonomics (16 accepted) + 1
checked positive control. Of the 7 controls (checker skipped), 4 are attack3's and 3 are new (`ctl-let-counter`,
`ctl-let-async`, `ctl-typed-shared`); the new 3 fire in both modes. Shipped mode does not fire attack3's
`ctl-promise-typed` (the freeze throws at publish on a promise among a function's captures), as round 1 recorded.
The positive control `k-h9-r2-kept-returns-field` (checker on) is silent only with REG=0, so the switch takes effect.

## T1: silent with everything on

**Detector-counted: 5, all a kept function reading a capability.** `cap-now`
(`const a = (now: Clock) => () => now();`, out-a: `fn(3975.181125) -> fn(3980.770375)`), `cap-random`,
`cap-now-gen`, `cap-now-in-record`, `cap-random-stored`. Nothing is written. The claim's wording ("what a held
function later gives") covers them; whether that is intended is the owner's call. I do not count them as a hole.

**Read by hand: a published FetchResponse whose body one reader uses up (5 cross-cell programs + 1 within a cell).**
This is attack3's "resp-shared" with a `catch` added. freeze.ts `kindOf` gives a Response kind 0, so it is published
as it is; intrinsics.ts types `text`, `json`, `arrayBuffer` as reads (no `@mutates`). The harness passes
`async () => new Response(body)`; without a `caps.fetch` the runner uses `globalThis.fetch.bind(globalThis)`
(lite/browser/run.ts:111), so a shipped cell also gets the native Response. I did not check the notebook build.
```
const r = async (fetch: Fetch) => await fetch("https://x.test/");
const b = async (r: FetchResponse) => await r.text();
const c2 = async (r: FetchResponse) => { W W try { return await r.text(); } catch (e) { return "used: " + messageOf(e); } };
out-a:  show b = "body" | E[]      show c2 = "used: Body already used" | E[]
```
Cross-cell: `fr-two-readers` (above), `fr-in-record` (`c3 = "used"`), `fr-json` (`"used"`), `fr-ab` (`-1`),
`fr-gen-twice` (`[true,"used"]`). Within one cell: `fr-same-cell-twice` (`["body","used"]`). Which reader wins
depends on the schedule: in `fr-gen-reader-race` the reader that waited is in error (`Body already used`), which is a
throw at a read, not at the write. `fr-held-fn` gives `["used","used"]` because the observer's own zero-argument call
took the body first. The first `text()` is the write and it succeeds; the other reader sees the change only as a
rejection it can catch, so the detector (which compares serialised values) cannot count it. Whether that is T1 is the
owner's call: no value at a fixed place changes, but what the held value gives does.

**No registration form escapes.** Each b1 form (below) is stopped in shipped mode. Evidence in out-a: `error c:
Attempted to assign to readonly property.` for the consumer-writer rows; for the self-writer and nested-holder rows a
drive that calls each function once after the run, e.g.
```
k1-self-writer-box   drive -> a() threw Attempted to assign to readonly property.
k1-map-nested        drive -> set() threw set on a frozen Map: a value cannot change after its cell returns; m() = 0
k1-url-nested        drive -> w() threw setting pathname on a frozen URL: ...; m() = "https://x.test/a"
k1-typed-nested      error a: a typed array where it cannot be replaced by a copy (among a function's captures, ...)
```

## T2: silent only with registration off

50 programs (plus the positive control). **All have the known root**: a captured local whose type holds a Mut that
is not its own type (S5.8), which R-K does not look into. No other mechanism was found.

- **41 in b1**: the known root in every function and binding form I could find: `"m"()` method, duplicate method,
  function declaration (also in a nested block), named function expression, `catch` block, `for…of` const, annotated
  destructuring (object and array), a helper's local, parameter and default parameter, a closure made when a consumer
  calls the published function (also across cells), spread literal, nested literal, array element, Map value (literal
  and `set`), `map` callback, IIFE result, recursion, default argument returned, a cell input function's result.
  Holder types: tuple, `readonly Mut<…>[]`, `Map<string, Mut<…>>`, alias, generic holder, function-typed const.
  Writers: a consumer cell, the kept function itself, an action (driven), nested `Mut<Map>`, `Set`, `Uint8Array`,
  `URL`, `Error` and record fields. Minimal (`k1-self-writer-box`):
  ```
  const a = () => { const r: { readonly b: Mut<{ n: number }> } = { b: { n: 0 } }; return () => { r.b.n++; return r.b.n; }; };
  REG=0: CHANGED a (value #1 of 1): fn(2) -> fn(3)        shipped: a() threw Attempted to assign to readonly property.
  ```
- **3 in b2**: `t-param-rest` (`(...ps: Mut<number[]>[]) => () => ps[0]`, an array of Mut), `hk-tojson` and
  `hk-tostring` (a consumer's `JSON.stringify(a)` / `` `${a}` `` runs the producer's hook, which writes `r.b.n`).
- **6 in b4, a store channel (`sc-*`)**. Cell `reg` keeps `box: { readonly l: Mut<(() => number)[]> }` and exports
  `add`; another cell passes `() => c0.length` (`c0: readonly number[]` aliasing its own `xs`) to `add`, then writes
  `xs`: sync (`sc-sync`), generator, or an async cell after an `await` in its own body (S5.7 allows it). REG=0:
  `{add:fn(0),all:fn([])} -> {add:fn(0),all:fn([3])}`. Shipped: `box.l` is frozen when `reg` publishes and `add`
  throws. The function leaves before the writing cell publishes, so no late code is needed there; the store is the
  known root.

The denominator for "no other root". Of the 118 accepted attack programs, 50 are the known root. Of the remaining
68, which hold no Mut in any captured type (or were stopped before a capture), none is silent with REG=0 except the 5
`cap-*` rows, which are silent in both modes. b5 (25) repeats b1's forms with a local that is plainly `Mut`
(`const xs = [0]`), to see whether R-K misses any capture form: 22 rejected (`[mut-capture]` 21,
`[mutating-method]` 1), 3 accepted (`array-destr`, `ternary-alias`, `map-get-elem`, none of which can write), silent 0
in both modes. The ways tried to hide a Mut at the binding's own type were all rejected, so they tested the checker,
not registration:
```
t-alias, t-alias-generic, t-typeof, t-param-alias, t-param-default, t-inferred-ret, t-ret-ann-fn   [mut-capture]
t-union-cond/-undef/-num, t-param-union, t-param-optional   [type] number[] is not assignable to Mut<number[]> | null
t-generic-ext(-explicit), t-generic-holder-fn, t-generic-record   [iterator-capture] (a type parameter)
```
Not tried: intersection, conditional, `keyof`/indexed-access types; pools (`pool`); `Error` `cause` (the
intrinsics declare `new Error(message?)` only, so there is no way to set one).

## Rejected, not reached, and detector limits

- Consumer-side writes on intrinsic inputs (p2.ts, 30, probe only): 27 rejected, among them every typed-array
  writing method, `new X(t.buffer)` under each binding form, an `ArrayBuffer` input viewed by `new Uint8Array`,
  `Error.message`, `RegExp` (`[regexp-state]`), `URLSearchParams.set`, `transfer` (unsupported), `structuredClone`
  with `transfer` (`[arity]`). The 3 accepted (`ta-map-fresh`, `ta-filter-fresh`, `ta-from-buffer`) write a fresh
  copy. `Date`, `Proxy`, `class`, getters, `bind`, `Promise.withResolvers` and computed keys are rejected or unsupported.
- `compile` islands: a function cannot leave one (`[compile-boundary] y: () => number cannot cross to a worker`).
  Not tried further.
- Loop closures: `for (let i…)` gives `[let-capture]`; `const out = []` gives `[type] … never`; an accumulator typed
  `(() => number)[]` gives `[mutating-method]`. With `Mut<…>` the `for…of` and copy forms are accepted and not silent.
- `let` of a union across a yield: primitive unions accepted, not silent; `string | readonly number[]` and record lets
  give `[mut-yield]`.
- Reruns and events (`rr-*`, `ev-*`): each drive ran (`drive -> bump.` etc.) and nothing changed, but I did not check
  that the consumer ran again, so these are not evidence of anything. `ev-listener` has no drive.
  `ev-action-in-state` crashed (below).
- Accepted and not silent with REG=0, so they measure nothing: `k1-dup-method-rev` (the writing method is overridden),
  `k1-set-of-fn` (no writer), `k1-async-method` (a new promise per call), `k1-then-writer` (the write runs before the
  first reading), `k1-invalidation-writer` (runs at dispose, after the last reading).
- Side finding: a cell named `h` is accepted and the run crashes, `Cannot declare a const variable twice: 'h'`
  (`nm-cell-named-h`, and `ev-action-in-state`). Presumably the JSX factory name; not looked into.
- Dead ends: b1's writers first wrote a constant (`set("k", 1)`); the observer calls a writer at the first reading
  and again at the end, so a constant write shows no change; changed to increments. The `sc-*` store first took
  `add(f)`; the observer's zero-argument call pushed `undefined` and `all()` threw.

## Ergonomics (erg.ts, `bun probe.ts p6.ts`)

| program | verdict | the message | fixes it names, applied literally |
|---|---|---|---|
| e1 sum in a `let` loop | ACCEPT | | |
| e2 `const out = []`, push, return | `[type]` | `number is not assignable to never` | none. `: number[]` gives `[mutating-method]`; `: Mut<number[]>` is accepted (e2g) |
| e3 build a Map, return a lookup | `[mut-capture]` | bind under its plain type (`const c: Map<string, number> = m`) | works (e3f) |
| e4 animation generator, one buffer | `[mut-yield]` ×2 | yield a copy; declare in the loop body; build in a helper call; or bind a plain `const c` to only read it | `slice()` alone fails (e4f), loop body alone fails (e4g); loop body + `slice()` works (e4h). The read-only fix does not apply (the buffer is written each frame; e4i). Helper call not tried |
| e5 fetch then `json()` | ACCEPT | | |
| e6 fetch, a state cell, an action | ACCEPT | | weak: the listener cell does not call `on` |
| e7 click counter (state, action, JSX) | ACCEPT | | |
| e8 todo add via `update` | ACCEPT | | |
| e9 group by into `Map<string, number[]>` | `[mutating-method]` | `write to a number[], which is not Mut` | none. `Map<string, Mut<number[]>>` works (e9f) |
| e10 memoised recursive function | `[mut-capture]` | `written by a function the cell keeps … frozen where the function is made` | none possible: a kept function cannot keep a cache. A precomputed table works (e10f) |
| e11 async ticker with `let last` | ACCEPT | | |
| e12 generator yielding history | `[type]` + `[mut-yield]` | loop body; helper call; "bind it under its plain type (`const c: never[] = …`)" | the helper call works (e12h); `never[]` is wrong; annotated `Mut<number[]>` (e12f) and a readonly `let` (e12g) are still `[mut-yield]` |
| e13 `[...xs].sort(…)` | `[mutating-method]` | `write to a number[], which is not Mut` | none. A spread copy is fresh (S4.3) but not as an unbound receiver. `toSorted` (e13f) and bind-then-sort (e13g) work |
| e14 closure over a config input | ACCEPT | | |
| e15 retry loop collecting errors | `[type]` | `string is not assignable to never` | none. `Mut<string[]>` works (e15f) |

7 of 15 accepted as written. Of the 8 rejected: the message names a fix that works on its own for 2 (e3, e12's helper
call); for e4 two named fixes work only together; 4 messages name no fix (e2, e9, e13, e15), and for 3 of these the
fix is `Mut<…>`; e12 also names a wrong one (`never[]`); e10 has no fix. A probe outside the table:
`{ toJSON: () => c.length }` over a Mut `c` suggests `const c: number[] = c`, which declares `c` in terms of itself.

## Files

`c0.ts` controls · `b1.ts`–`b5.ts` attack batches · `erg.ts` ergonomics · `probe.ts` verdict and messages ·
`p1.ts`–`p6.ts` probe lists · `runall.sh` · `out-a.txt`, `out-b.txt` full logs · `summary.txt`. The folder is not
committed.
