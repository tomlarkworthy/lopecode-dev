# lopepage-urls: gaps and findings

Port done 2026-11-14 against RULES.md v0. Every error quoted below is real `bun check.ts` output from
a probe directory of minimal repros, one per construct (the source is pasted in §10; the directory was
in the session scratchpad and is not kept). Line numbers in the quoted errors refer to that probe.

Test assertions: none changed. One test's dependency edge moved (§2).

## 1. Ambient page state has no home (location, document.baseURI)

`isOnObservableCom` reads `location.href` when called, and `linkTo`'s defaults read `document.baseURI`
and call `isOnObservableCom()` when called. Both are reads of state that changes at run time: the hash
in `baseURI` changes on every `navigate` (`history.pushState`), and `linkTo` copies its params into
each link. The capability list (`now random fetch log invalidation`) has nothing for "read the page
URL now", so the only place to declare it is `foreign.d.ts`, and marking it `/** pure */` would be
false. Marked `/** effect */`, a checked cell may not take it:

```
cells.ts:7:1 [foreign-effect] isObs: location is an /** effect */ foreign; a checked cell may take only pure ones
cells.ts:15:47 [free-name] free name document (not an allowed intrinsic)
```

What was done: `isOnObservableCom` stays in the shell; `linkTo` is split into the checked
`linkToWith(target, {baseURI, onObservable, source?, op?})` (both world values required) and a
one-statement shell `linkTo` with the original signature and defaults. A `location: Clock`-like
capability (a reader typed `() => string`) would let all of `linkTo` and `isOnObservableCom` be
checked. Not invented here.

## 2. test_linkTo now targets linkToWith

Original: `linkTo(target, { baseURI: link, onObservable: false })`. Port:
`linkToWith(target, { baseURI: link, onObservable: false })`. The test passes both options that the
shell wrapper would otherwise default, so the code it runs is the same; the assertion (none: the test
passes if it does not throw) and the value are identical (differential check below). What changed is
that the test no longer depends on `isOnObservableCom` or `location`. The baseline lists `location` as
an external input of `test_linkTo`; that was a static edge only, never read by the test.
Consequence for the report: `test_linkTo` counts as a test with no shell cell in its support.

## 3. `new URL` is not an allowed intrinsic

```
cells.ts:6:44 [free-name] free name URL (not an allowed intrinsic)
```

`URL` parsing is pure. Ported as a `/** pure */` foreign `parseUrl(href): {hash, href}` in
`foreign.d.ts`, implemented in `foreign.runtime.ts` with `new URL`. One declaration of trust surface for
a constructor that arguably belongs on the intrinsic list (`URLSearchParams` likewise).

## 4. `viewof vars` does not fit the ref recipe

RULES says a `viewof x` ports as a ref cell `x` plus a shell `x_view`. Here the view is not a widget
with a known starting value; it is `variables(runtime)`, whose value is the live `runtime._variables`
Set from the first moment. A ref needs its initial value at the `ref(…)` site, and `vars_view` cannot
seed it during its own evaluation (an action called while a cell evaluates throws). The options
considered, reasoned from the rules and the harness, not run:

- `vars = (): RefCell<Js> => ref(undefined)`: `updateNotebookImports` would iterate `undefined` and
  throw before the view fires. Different behaviour.
- `ref([])`: `updateNotebookImports` runs once on an empty list that the original never sees.
  Different value in a checked cell.
- `vars = (vars_seed) => ref(vars_seed)` with a third shell cell: re-initialises the ref whenever the
  seed recomputes.

Kept both as shell (`vars_view`, `vars`). The value is a set of runtime `Variable` objects (`Js`) with
no checked consumer, so nothing was lost to the checked tier.

## 5. Rules that forced rewrites

**let-capture (parseViewDSL).** The parser is a closure over `let i` and `input`, with six nested
helpers, five of which advance `i` (`err` only reads it):

```
cells.ts:3:21 [let-capture] let i assigned from inside a nested function
```

Original vs port:

```js
function parseNumber() {                    function parseNumber(c: Mut<Cursor>): number | null {
  let start = i;                              const start = c.i;
  while (i < input.length && …) i++;          while (c.i < input.length && …) c.i++;
```

A `mut<Cursor>({ i: 0 })` is created once and passed to each helper as a `Mut<Cursor>` parameter
(passing a Mut to a Mut-typed parameter is allowed; capturing it is not). Every helper gains a
parameter and every `i` becomes `c.i` (58 uses of `i` in the original; 54 `c.i` in the helpers plus 4
`cursor.i` in the top-level loop). The alternative, threading `[node, pos]`
through return values, would make the cell `default` tier but changes every helper's return shape;
not taken. Assigning to a parameter from a closure instead of a `let` would pass `check` (known slip
`s7`) and was not used.

**member-write / no-delete (normalizeWeights).**

```
cells.ts:14:73 [member-write] write to node.size: receiver is not Mut
cells.ts:14:92 [no-delete] delete is banned
```

The original sets `child.size`, deletes `child.weight`, recurses, and returns undefined. A `Mut` would
not help (reasoned from the README's `member-write` row, not tried): the writes go to children bound by
`for (const child of …)`, a fresh binding that is not a Mut root. Rewritten to
return a new tree. Key order is kept by spreading (`{ ...withoutWeight(child), size }` keeps `size` in
its existing slot, or appends it when absent, as the assignment did). The function's contract changed
from "mutates its argument" to "returns the result"; `parseGoldenDSL` is its only consumer in the
corpus (grep of `modules/@tomlarkworthy/*.js` for `v.import("normalizeWeights"`: no hits).

**mutating-method (Map in linkTo, arrays elsewhere).** `hashParams.set` became a `Mut<Map>`; the
`Map.set` overwrite-in-place order matters when `op` equals a key already in the hash, so a rebuild
from entries would have had to reproduce that. `_getModuleTitles`' `titles.push`/`concat` became
`flatMap` and a spread. `parseList`'s `items.push` became a `Mut` array frozen on return.

## 6. Typing costs that are not rules but come with "checked"

- **Exhaustive throws.** `throw new Error("Unknown node type: " + item.nodeType)` after both
  branches of the `ViewNode` union reads a property of `never`:
  `[ts2339] Property 'kind' does not exist on type 'never'.` Kept the throw by binding
  `const nodeType: string = item.nodeType` before the branches.
- **Errors the original got from JS.** The original throws a `TypeError` from `node.size.endsWith`
  when `size` is missing and from `ast.title.split` when `title` is missing. With `GLNode` typed with
  optional fields (one flat type covers component, stack, row, column, before and after
  normalisation), strict mode rejects the reads, and `!` is banned. Each became an explicit
  `if (x === undefined) throw new TypeError(…)`. The message differs: original (JSC)
  `undefined is not an object (evaluating 'node.size.endsWith')`, port `node.size is undefined`. A
  discriminated union per node type would remove the guard for `title` but makes the spread-based
  `normalizeWeights` hard to type (`Omit` does not distribute over a union).
- **`navHref`/`linkToWith` intent check.** `const isIntent = typeof target === "object" && … ("module" in target || …)`
  followed by `target.module` in the else branch does not narrow `target`; it became
  `const intent = (…) ? target : null` and the branches read `intent.module`.
- `let notebook;` (implicitly typed) became `let notebook: string;`.
- **A branch only reachable with a non-string.** `serializeGoldenDSL`'s `!node.size.endsWith` gives
  `"100"` for a numeric `size`. A first port typed `size` as `string` and dropped that branch; the
  differential did not catch it because every hand-made layout used string sizes. `size` is now
  `string | number` and the branch is `typeof s !== "string"`; `{type:"row", size:50, content:[]}` gives
  `R100()` on both sides.
- **Behaviour on inputs outside the types.** `navHref`/`linkTo` accept `string | NavIntent | null |
  undefined`; the original accepted anything `String()` can print. Not compared.
- **No sanctioned way to share a type between `cells.ts` and `shell.ts`.** The shell `linkTo` names its
  target type as `Parameters<import("./cells").__V_linkToWith>[0]`, which reaches into the
  harness-generated alias `__V_linkToWith`. RULES allows `type` declarations in `cells.ts` but says
  nothing about exporting them, and `export type` was not tried.

## 7. Harness findings

- **Unsupplied foreign became `undefined` (fixed).** A foreign declared in `foreign.d.ts` and absent
  from `foreign.runtime.ts` was injected as `undefined`, so `_3` failed with
  `tests is not a function. (In 'tests()', 'tests' is undefined)` as `rejected`, and `run.ts` exited 1.
  The baseline treats unsupplied imports as blocked. Fix in `run.ts`: such a foreign rejects with
  `<name> is not defined`, the same message an unsupplied stdlib name gives, so shell consumers become
  `shell-skip`. Fixture `fixtures/accept-foreign-unsupplied`. `bun fixtures.ts`: 52/52 pass.
- **A foreign named like a DOM global takes the DOM type, silently.** `foreign.d.ts` declares
  `location: { readonly href: string }`. No redeclaration error is reported, and the shell parameter
  `location` is typed as DOM `Location`, not the declaration: a probe shell cell
  `(location) => location.reload` passes `check`, and `(location) => location.zzz` fails with
  `[ts2339] Property 'zzz' does not exist on type 'Location'.` The trusted signature in `foreign.d.ts`
  is therefore not what the checker uses for this name. Harmless here (only `.href` is read); a
  checked cell taking a `/** pure */` foreign named `name`, `status` or `origin` would get the DOM
  type. Not fixed.
- **README is stale** on the fixture count (says 51/51; now 52/52 after the fixture above). Outside
  this port's edit scope; not changed.
- A checked cell whose inner function has the cell's own name (`normalizeWeights = () => function
  normalizeWeights(node) { … normalizeWeights(child) … }`) is not reported as `cell-by-name`;
  resolution is by symbol, as the README says.
- No approximation from the README's known-slips list was needed.

## 8. Verification beyond the 8 tests

Seven of the eight tests assert nothing; they pass if they compute. `differential.ts` in this
directory (`bun ports/lopepage-urls/differential.ts`) loads the original cell functions from the module
source and the port's `cells.ts` and `shell.ts`, and compares outputs key-order-sensitively
(`Object.entries`, Map entries; thrown errors by class and message):

- 33 DSL strings including malformed ones (parser messages carry `pos` and the input) through
  `parseViewDSL`, `convertToGoldenLayout`, `parseGoldenDSL`, `serializeGoldenDSL`, the round trip,
  `listModules`, `getCell`; 7 hand-made layouts for `serializeGoldenDSL`; 4 inputs for `normalizeWeights`
  (including weight 0 and a root stack, which keeps its `weight`).
- 39 `navHref` calls; 784 `linkToWith` calls against the original `linkTo` (7 base URIs including an
  invalid one, 14 targets, 4 option sets, both `onObservable` values).
- The shell `linkTo` wrapper (imported from `@tomlarkworthy/lopepage-urls` by 21 modules in the frozen
  `modules/` extraction: `grep -h 'module @tomlarkworthy/lopepage-urls"' modules/@tomlarkworthy/*.js | grep -c 'v.import("linkTo"'`) with a stub `globalThis.document = {baseURI}`,
  against the original with the same stub and the same `location`, over 3 page URLs (file, an
  observableusercontent host, a `blob:` URL) × 14 targets × 7 option sets, so the default path runs.
- 14 `extractNotebookAndCell` inputs; the four data cells against the original literals; `layouts` and
  all eight test cells end to end, original dependencies against port dependencies.

Result on 2026-11-14:

```
DIFF serialize {"type":"row"}
  orig throw:TypeError:undefined is not an object (evaluating 'node.size.endsWith')
  port throw:TypeError:node.size is undefined
1388 comparisons, 1 differ
```

The one difference is the message in §6. Not exercised: `navigate`, `updateNotebookImports`, `_3`,
`vars_view`, `vars` (they need a browser, a runtime or the `tests` import).

## 9. Readability

Better:
- `normalizeWeights` as a function that returns its result; `parseGoldenDSL` no longer depends on a
  side effect of a call whose return it discards.
- `_getModuleTitles` as `[...own, ...ast.content.flatMap(getModuleTitles)]`.
- Typed node shapes (`ViewNode`, `GLNode`, `NavIntent`, `LinkOpts`) document what `linkTo` and the DSL
  accept, which the original left to the reader.

Worse:
- `parseViewDSL`: `c.i` and a `c` parameter on every helper; the parser now reads as threaded state.
- `linkTo` split across two files to keep two default parameter expressions out of the checked file.
- `undefined` guards with hand-written TypeError messages where the original relied on JS throwing.

## 10. Probe source

The minimal repros behind the errors quoted in §1, §3, §5, §6 (`cells.ts`, with `foreign.d.ts`
declaring `/** effect */ declare const location: { readonly href: string };`). `check` output:
8 errors, one per construct, as quoted above, plus `[mutating-method] out.push(): mutating method on a
non-Mut value` for the last line.

```ts
export let parseA = () => function p(input: string) {
  let i = 0;
  function next() { i++; return input[i]; }
  return next();
};
export let urlA = () => (s: string) => new URL(s).hash;
export let isObs = (location) => () => location.href.includes("x");
type N = { readonly kind: "a" } | { readonly kind: "b" };
export let exh = () => (n: N): string => {
  if (n.kind === "a") return "a";
  else if (n.kind === "b") return "b";
  throw new Error("Unknown: " + n.kind);
};
export let norm = () => (node: { size?: string; weight?: number }) => { node.size = "1fr"; delete node.weight; };
export let lt = () => (t: string, { baseURI = document.baseURI } = {}) => baseURI + t;
export let tl = () => (xs: string[]) => { let out: string[] = []; out.push("a"); return out; };
```
