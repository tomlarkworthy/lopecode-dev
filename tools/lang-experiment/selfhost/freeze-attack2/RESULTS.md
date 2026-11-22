# Freeze attack, round 2 (2026-11-22)

The checker is `lite/core.ts checkSources`, called through `run-sets.ts verdictOf`. Each accepted program is run by
`observe.ts observeProgram`, which uses `lite/browser/run.ts runCells`. A value a cell was fulfilled with is read
again after the run. If it reads differently and the cell is not in error, the change is SILENT. The runner ran the
registered text: the stack traces show `ss_closure(` inside run.ts's compiled functions, and tdz-fn-decl throws at
its write.

```
cd tools/lang-experiment/selfhost/freeze-attack2
./run-all.sh                                  # b0-b11 -> all.out.txt
bun run.ts b9.ts --only tdz-done --compiled
```

## Counts

309 candidates, 110 accepted, 67 silent: 16 under cause 1, 30 under 2, 10 under 3, 9 under 4 and 2 under 5. None of
these shapes appears in freeze-attack/, mut-groups-attack2/, b-attacks.ts, h6-attacks.ts or variants.ts. b-attacks has
searchParams only as a read of, or a write to, an input.

## Breaks

**1. th-arr-async: thenables are adopted without being frozen.** The Observable runtime resolves a cell value, a
yield or a state value that has a `then`. `out()` freezes the record, and then the runtime publishes the value that
`then` passes to `r`. `out()` handles only `instanceof Promise`.

```ts
const a = () => ({ then: (r: (v: number[]) => void) => { const xs = [0]; const h = async () => { for (let i = 0; i < 300; i++) await null; xs.push(1); }; h(); r(xs); } });
const c = (a: unknown) => () => a;
```

ACCEPT. `a: [0] -> [0,1]`, `c: fn([0]) -> fn([0,1])`. It also breaks typing: in th-consumer-type-lie a reader typed
`{ n: number }` gets `"str"`. An async cell, or `Promise.resolve(thenable)`, is frozen, and the write throws.

**2. nm-rec-field: the copy of a typed array lands in the producer's own container.** `walkNode` writes the copy
into a slot of the cell's own record, array, Map or Set (`a[i] = y`, `r[key] = y`, refill). The cell keeps that
container, so a later read gives it the published copy. A copy is not frozen. When the container is built from a
named local, its element type is `Mut`, and an async helper that is not kept may write the copy.

```ts
const a = () => { const t = new Uint8Array(2); const o = { t }; const h = async () => { for (let i = 0; i < 300; i++) await null; o.t[0] = 1; }; h(); return o; };
const b = (a: { t: Uint8Array }) => ({ v: a });
```

ACCEPT. `b: {v:{t:[0,0]}} -> {v:{t:[1,0]}}`. The write also lands through forEach, for-of, a Map key, a Set member,
`snapshot(t)` and a state initial value. `{ t: new Uint8Array(2) }` written inline is rejected by `[member-write]`.

**3. usp-consumer-reads: URLSearchParams is published unfrozen, still bound to the cell's URL.** `kindOf` returns 0
for it. The URL itself is never published, so the checker allows writes to it.

```ts
const a = () => { const u = new URL("https://x.test/?q=1"); const h = async () => { for (let i = 0; i < 300; i++) await null; u.search = "?q=2"; }; h(); return { p: u.searchParams }; };
const b = (a: { p: URLSearchParams }) => () => a.p.get("q");
```

ACCEPT. `b: fn("1") -> fn("2")`. Yields are rejected by `[mut-yield]`.

**4. tdz-done: a captured const is written before `ss_tdz()` runs.** `fnreg.ts` emits `ss_tdz()` at the end of the
declaration statement (`at: n.end`), so a later declarator can yield and then write the capture. In
tdz-write-no-republish the function is published once, and `late.push(9)` succeeds with no cell in error. A second
publish does not catch it either: `deepFreeze` puts the parent record in DONE (only the PENDING function is kept out),
so republishing the parent skips the walk.

```ts
const a = function* () { const r = { g }; yield r; const late = [0], z = yield r, w = late.push(9); yield 2;
  function g(): number { return late.length; } };
```

ACCEPT. Value #2 changes `{g:fn(1)} -> {g:fn(2)}`. With the declarations as separate statements, the write throws.

**5. tdz-exit-only (the owner decides whether this is covered).** With no write at all, a held function's answer
changes from `fn(-1)` (it catches its dead-zone error) to `fn(1)` when `late` is initialised.

## Accepted, harmless

- The ctl-* controls (array, typed array, URL, Error, Map, Set, structuredClone): the write throws or hits the
  original.
- th-async-*, th-await-*, th-promise-resolve, th-in-record-field, th-fn-cell: awaited inside an async boundary, then
  frozen.
- tdz-fn-decl, param-assign-gen, rg-shadow, rg-recursive, pr-cap-arr: the write throws.
- usp-action-set: the write happens before the commit. upd-keeps-old, act-reenter, ev-listener-writes-arg,
  th-records-equal, th-action-set-typed, th-state-update-thenable: no change.

## Held

- `[mut-capture]`: every registration probe in b8.
- `[let-capture]`: destructuring, logical, compound and for-header assignment, and reassigning a catch binding or a
  parameter.
- `__proto__` is `[banned-member]`. Getters, setters, computed keys and symbol keys are unsupported.
- A consumer writing a typed-array input: `[member-write]` or `[type]`.
- An action called from an async helper: `[action-call]`.

## Not reached, doubts

- Not reached: workers and islands (observe.ts passes no `checked`, so `compile` throws), JSX handlers with renderer
  events, and thenables through events (`[inject-events]`).
- The host is bun (JavaScriptCore) and runCells, not the notebook's browser boot. Cause 1 depends on the Observable
  runtime adopting thenables. Cause 3 depends on searchParams being bound to its URL, which was seen only under bun.
  Causes 2 and 4 are in freeze.ts and fnreg.ts.
