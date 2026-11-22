# Freeze attack, round 3 (2026-11-22)

`./run-all.sh`: checker (`verdictOf`, rules ON), then `runCells` on compiled text; `harness.ts` adds `checked`, promise snapshots, two-reads-per-run.

## Counts

`-- 360 candidates, accepted 149, silent 88`. No accepted cell was still pending. `-- controls 4, fired 4` (c0.ts, checker skipped).

## Causes

`W` = `for (let i = 0; i < 300; i++) await null;`

**1. Islands run on the page (10, b2).** `[compile-boundary]` does not check type arguments (`walks.ss.ts:16`), `unknown` (`:21`), or depth > 8 (`:11`). Island text is erased and unregistered (`stdlib/runtime.ts:124`). Its functions are kind 0 (`freeze.ts:69`), so `deepFreeze` (`stdlib/runtime.ts:133`) skips them. Arguments pass by reference, and values pass between island cells unfrozen (`workers.ts:37-38`).
```ts
const x = () => [1];
const y = (x: number[]) => new Map([["g", () => x.length]]);
const go = async (compile: Compile) => { const f = compile({ inputs: ["x"], refs: [], outputs: ["y"] }); const xs = [0]; const r = await f({ x: xs }); const h = async () => { W xs.push(1); }; h(); return r.y; };
```
Result: `go: Map{"g"=>fn(1)} -> fn(2)`. The notebook bundle's `compiler` does the same (`nb-island.ts`). The pool throws `can not be cloned`.

**2. A promise captured by a published function (68: b4 14, b5 5, b9 48, b11 1).** The promise is held (`freeze.ts:143`). Its value is walked in keep mode (`:177`), which returns leaves as they are and makes no copies (`:131`, `:166-168`). `Object.freeze` on a native Map does not stop `set`, because only `SsMap` reads `FROZEN` (`:180-181`). `[mut-capture]` does not see a native Map from `structuredClone`:
```ts
const a = () => { const t = structuredClone(new Map<string, number>()); const mk = async (x: Map<string, number>) => x; const p = mk(t); const h = async () => { W t.set("k", 1); }; h(); return () => p; };
```
The promise's value goes from `Map{}` to `Map{"k"=>1}`. A typed array gets through the same way with `mk: (x) => Promise<unknown>` (b9, 48). holes7 lists that typed-array gap; `Promise<unknown>` is how these programs pass `[mut-capture]`.

**3. Rejection reasons are never frozen (10: b5 8, b7 2).** `then(deepFreeze)` has no rejection handler (`freeze.ts:87`, `:195`). A held promise's rejection is dropped (`:177`).
```ts
const a = function* () { const e = new Error("x"); const mk = async (x: Error): Promise<number> => { throw x; }; yield { p: mk(e) }; e.message = "y"; yield 1; };
```
In rej-catch-republish, two consumers of one rejection read `["x"]` and `["y"]`.

## Not reached

- JSX renderer events: bun has no renderer.
- `.next(x)`: the host never passes an argument.
- A listener `on(g, add)`: every variant was `[inject-events]`.
- Action arguments and `set`/`update` of these payloads: accepted only with the write inside the action, before commit, and not silent (b11).
- b4's 30 `-obs` rows died on my `[no-member]` error.
- The browser was not run.
- The built-ins in b6/b10 (DataView … sparse arrays) are all rejected or unsupported.

## Surprising, not silent

- act-partial-freeze: an action call throws on its second argument after freezing the caller's first argument in place. The caller's `catch` then throws at `xs.push`.
- resp-shared: of two readers of one published `FetchResponse`, the second throws `Body already used`.
- A `d`-flag match array is frozen, but its `indices` and `groups` are not (probe; no accepted program writes them).
