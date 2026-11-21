# The renderer's decisions as checked cells (2026-11-21)

Paths are relative to `tools/lang-experiment/`. Nothing outside `selfhost/render-cells/` was changed. The notebook
was not built. Another agent was editing `lite/runtime.ss.ts`, `lite/runtime-ss.ts` and `prelude.runtime.ts` during
this work. The runtime cell count went from 14 to 13, and one import of `prelude.runtime.ts` failed mid-edit. `shell.ts`
imports `prelude.runtime.ts` for `equals`. Every number below comes from the last run, against those files as they
were then.

| file | role |
|---|---|
| `render.ss.ts` | 17 checked cells: prop changes for one element, the children of one element as operations |
| `shell.ts` | `create` and `patch` with render.ts's signatures. It describes the element and the DOM children as data, applies the operations and recurses. `useCells` relinks with some cells replaced (negative controls). |
| `check.ts` | the real checker on `lite/runtime.ss.ts` plus `render.ss.ts`, as one module (tsx on; `--no-tsx` off) |
| `run-tests.ts` | runs a test file unchanged, with every import of `lite/jsx/render.ts` resolved to `shell.ts`; `RENDER_BREAK=1` is the negative control |
| `cells.test.ts` | the decision cells called alone with plain values |
| `diff.ts` | random trees a, b, c drawn as `create(a)`, `patch(b)`, `patch(c)` by render.ts and by shell.ts, compared |
| `bench.ts`, `bench.txt` | µs per patch |
| `measure.ts`, `measure.txt` | code lines per file and per statement, counted from the parse |
| `repro-defects.ts`, `repro-defects.txt` | renderer defects, run against the unchanged render.ts |
| `test-runs.txt` | the output of every test run below |
| `probe-elem.ss.ts` | what a checked cell can read from an `Elem` |

## Numbers

- **Original:** `lite/jsx/render.ts` has 61 code lines (`patch` 48, `create` 9, `asText` 2, imports 2). `lite/jsx/h.ts` (10 code lines) is unchanged and unchecked. `mount` in
  `lite/stdlib/runtime.ts` adds 7 more and was not redirected (see Integration).
- **Checked:** `render.ss.ts` has 102 code lines: 15 of types and 87 in 17 cells. Cell sizes: max 12, median 4, none
  over 20.
  - drawnTag 2, eventOf 4, removesAttribute 1, propSet 8, propGone 2, propOps 7, slotId 1, keyedIds 8, drawnId 1,
    matchKeyed 11, keptByKey 4, mustPlace 11, keyedOps 12, keepsNode 1, childAt 6, positionalOps 4, childOps 4.
  - `check.ts`: 30 cells (13 from runtime.ss.ts and 17 from render.ss.ts), 0 not ok, 0 module errors, with tsx on
    and with tsx off.
- **Unchecked shell:** `shell.ts` has 68 code lines: imports 7; linking and the test hooks 5; asText, keyOf, kidOf and
  drawnOf 6; create 11; applyProp 16; applyChildren 15; patch 8. The unchecked part did not shrink: 61 lines became 68.
- **Tests** (`test-runs.txt`):

  ```
  lite/jsx/proof.ts via run-tests.ts        20 checks pass, 0 fail; 1 import of render.ts redirected
    RENDER_BREAK=1 (keepsNode never)        18 pass, 2 fail ("the canvas is the same DOM node ..." x2; 4 canvases made, not 1)
  lite/jsx/proof.ts --browser               fails before any change: TypeError root.querySelector is not a function
                                            (proof.ts:52); fails the same way through the redirect
  cells.test.ts                             17 pass, 0 fail (37 expects)
  diff.ts 20000 7                           20000 triples (12353 with a keyed child at the top level), 0 differ
    diff.ts 3000 1 --break (mustPlace never) 2822 of 3000 differ
    diff.ts 3000 1 --with-defects           1428 of 3000 differ (defect 1 below: the cells fix it, render.ts does not)
  ```

  `lite/stdlib/runtime.test.ts` never mounts or patches. The fixture that `proof.ts` drives
  (`fixtures/lite-jsx/accept-suminagashi-controls`) contains no `key=`. So none of the existing tests reaches keyed
  matching, and the negative control sits in `keepsNode`, which `proof.ts` does reach. Keyed matching is covered by
  `cells.test.ts` and `diff.ts`. `diff.ts` compares the HTML, which node of `create(a)` each final node is, `value`,
  `checked` and `disabled`, the handler a click on each element calls, and the counts of insertions, removals and
  replacements. Its keys include both 1 and `"1"`, and its values are primitives and two functions. The spec and tutorial tests run only in the notebook and were not run.
- **µs per patch** (`bench.txt`; happy-dom, bun 1.4.0): a `<div>` with 100 `<li key>` children, each child
  `{ key, title }` and one text child. Every patch is a new value. 2000 patches per round, 5 rounds after one
  warm-up, arm order rotated, min-max:

  ```
  one child moved (first to the end and back)   render.ts  85.6-103.7   shell.ts 139.3-154.2
  no move (control)                             render.ts  43.5-51.8    shell.ts  86.0-101.4
  the cells alone, on the inputs of one patch of the moved case:
    childOps, 100 keyed                         20.1-24.5
    propOps x100                                19.0-21.6
    childOps of one text child x100              6.5-9.0
  ```

  The one-moved case alternates two patches. A to B places 99 children and B to A places 1, in both arms; that is
  render.ts's algorithm, which the cells keep. From the range ends, the prototype is 1.3-1.8x render.ts on the
  moved case and 1.7-2.3x on the control: 34-69 µs more per patch, about 0.3-0.7 µs per child. Before the slot ids
  were computed once per child list (`keyedIds`, `drawnId`), `childOps` of 100 keyed children took about 30 µs. That
  was a single scratch run, not kept. Nothing was measured in a real browser DOM.

## Decisions

The checker's `Elem` has only `tag` and `children`. A cell therefore cannot read `props`, and with it the key, from
an `Elem`. The cells cannot tell an element `h` made from a record shaped like one either: that is the WeakSet in
`h.ts`, and a `typeof` test in a cell would bring back `repro-elem-forged.ts`. So the shell projects each child into
a `Kid` (`{ k: "elem", tag, key }` or `{ k: "text", text }`) and each DOM child into a `Drawn` (`Kid`, or
`{ k: "other" }`), and passes the prop records as `{ readonly [k: string]: unknown }`. Prop values travel as
`unknown`. The cells compare them with literals and pass them on, but `propSet` also calls `String(value)` and
`equals(was, value)`, and `equals` walks an object value. The no-inspection ruling forbids that walk. It is open (see
Checker messages): a primitive-typed value would check with `===` (`samePrim` in `probe-elem.ss.ts` is ok), but
typing the values that way needs either a typed `props` on `Elem` or a projection with `typeof` in the shell.

| decision | where | why |
|---|---|---|
| a fragment (tag `""`) is a `<span style="display: contents">` | moved: `drawnTag` | plain data |
| `key` and `children` are not attributes | moved: `propSet`, `propOps` | plain data |
| a prop is an event prop, and its DOM event | moved: `eventOf` | `DOM_EVENTS` is already a cell; own keys only (defect 1) |
| an event prop adds a DOM listener once, after that only its handler changes | moved: `propSet` | takes the set of props the node listens for, as data |
| a DOM property (`value`, `checked`, `disabled`) is set | moved: `propSet` emits `prop` | |
| ... unless the live property already holds the value | stayed: `applyProp` | reads the DOM (`node[k] !== v`; the user may have typed) |
| an attribute is removed (false, null, undefined), set, or left as it is | moved: `removesAttribute`, `propSet` | `equals(was, value)` (checker message 2) |
| a prop that is gone: handler cleared, property reset to `""` or false, attribute removed | moved: `propGone` | plain data |
| keyed or by position: every child an element with a key | moved: `keyedIds` | |
| a key's identity is `${tag}:${key}` (1 and `"1"` are one key) | moved: `slotId`, `drawnId` | kept from render.ts |
| which old child each keyed child reuses (the last old duplicate wins; each is used once) | moved: `matchKeyed` | a function of two id lists |
| which old children the first pass removes | moved: `keptByKey` | |
| whether each child must be inserted at its index | moved: `mustPlace` | simulated on data: after i placements the DOM is the first i new children, then the kept old children not yet placed, in old order |
| unused old duplicates are removed at the end | moved: `keyedOps` | render.ts trims them |
| by position: patch the same tag, set the text, replace, append, remove the surplus | moved: `keepsNode`, `childAt`, `positionalOps` | the old text comes from the shell's description of the text node |
| the value is an element `h` made | stayed: `kidOf` | nominal; `isElement` is the WeakSet |
| a non-element child drawn as text (`asText`); an untyped key as text (`keyOf`) | stayed | inspects `unknown` with `typeof` |
| the same value as last time: nothing to do (`old === x`) | stayed: `patch` | `[strict-eq-object]` on two `Elem`s; `equals` is a deep comparison, which is a different decision |
| decoding a DOM event into the action's arguments | already a cell (`DOM_EVENTS`) | the listener calls it |
| `mount`: reuse the previous root for an element of the same tag | not moved | it lives in `lite/stdlib/runtime.ts`, which was not redirected. `keepsNode` is the same decision |

Moved: the logic of about 30 of `patch`'s 48 lines: the prop loops and both child loops, without the DOM calls
(an estimate, not counted).
They became 87 lines of cells because each decision is now named, the keyed simulation is explicit, and operations
are values.

## Checker messages met

- `[unknown-type] unknown type ReadonlySet` for a `ReadonlySet<string>` parameter. Written as `Set<string>` instead.
- `[strict-eq-object] === on two non-primitive operands; use equals(a, b)` on `was === value`, where both are
  `unknown`. render.ts uses identity. The cell uses `equals` (prelude; `Object.is`, then deep). The difference: a
  deep-equal object value, or `NaN`, no longer rewrites the same attribute text. `diff.ts` uses primitive values
  and found no difference. The prelude must now include `equals` (shell.ts passes it to `link`). Probe:
  `(a: string | number | boolean | null | undefined, b: …) => a === b` is ok, and the same with `unknown` is rejected. A
  typed attribute value would remove `equals` and the deep walk on `unknown`.
- `[type] unknown[] is not assignable to PropOp[]` on `propOps`'s single-expression return. It came from the
  `ReadonlySet` error: with `Set` the inline form checks too (tried once, not kept).
- Probes in `probe-elem.ss.ts`: `[no-member] no property props on Elem` (read props or a key);
  `[type] { tag: "div"; children: never[] } is not assignable to Elem` (a forged record: `Elem` is nominal, which is
  correct); `[strict-eq-object]` on `(a: Elem, b: Elem) => a === b`.
- Typed inputs: a cell's inputs carry the producing cell's type. A wrong argument to an input
  (`giveStr("one")` where it takes a number) is `[type] "one" is not assignable to number`. The cells compose checked.

Not met: no `[mut-capture]` or `[mut-escape]`. Every cell that builds a list makes a local `mut([])`, fills it in a
`for…of` and returns `freeze(…)`.

## Defects found

`bun selfhost/render-cells/repro-defects.ts` (`repro-defects.txt`), against the unchanged render.ts:

1. A prop named like an `Object.prototype` member is treated as an event prop. `DOM_EVENTS[k]` finds the
   prototype's `constructor`, so `h("div", { constructor: "x", title: "t" })` draws `<div title="t"></div>` and
   registers a listener for event `"undefined"`. For the same reason, `k in x.props` never removes such a prop.
   The checker rejects the prop (`[excess-property] property constructor is not in CommonProps`), so only an
   unchecked cell reaches this. `eventOf` reads own keys only, and `diff.ts --with-defects` shows the difference
   (1428 of 3000).
2. `patch(node, x)` with an element of another tag keeps the old node and records the new tag:
   `create(<div>)` then `patch(node, <span>)` leaves `<div title="b">y</div>` with `__elem.tag` `"span"`. After
   that, `mount(<span>, node)` reuses the div. `mount` checks the tag before it patches and children are matched by
   tag, so only a direct caller of the exported `patch` reaches this (`proof.ts`'s `rerender`, `lite/browser/entry.ts`).
   shell.ts keeps the behaviour.
3. A DOM property given `undefined` is assigned it. `<input value="5">` then `<input value={undefined}>` gives
   `node.value === "undefined"`; removing the prop gives `""`. The checker rejects it (`[possibly-undefined]
   undefined is not assignable to string | number`), so only unchecked cells reach this. Kept in shell.ts.
4. A symbol key throws `TypeError: Cannot convert a symbol to a string` in `${tag}:${key}`; an object key's
   `toString` is called. Only unchecked cells reach this: the checker gives `[unsupported] intrinsic Symbol has no
   signature`. shell.ts's `keyOf` takes such a key as its `asText`.

These are behaviours rather than defects, noted for the record:

- Mixed keyed and unkeyed children are matched by position, and their keys are ignored.
- Moving one keyed child back by k places costs k insertions. For example, the first of 100 moved to the end is 99
  `insertBefore` calls. A longest-increasing-subsequence placement would cost 1. That change now belongs to
  `mustPlace` alone and can be tested there; it was not made.

## Integration would need

- `lite/runtime-ss.ts` to link `render.ss.ts`'s cells, and the notebook build to compile them into
  `@tomlarkworthy/soundscript-runtime` (the other agent's files).
- `equals` in that link's prelude. `runtime-ss.ts` cannot import `prelude.runtime.ts`, which imports it, so `equals`
  must be passed in some other way or move into the runtime cells. In the notebook, the cell takes the runtime
  module's `equals`.
- `render.ts` replaced by `shell.ts` without `useCells`/`cellsNow` (5 lines), and `mount` changed to call `keepsNode`
  on `drawnOf(prev)` and `kidOf(x)`.
- Optionally, a typed `props` on `Elem` in `JSX_DECLS`. That would remove only `kidOf`'s key read, because the
  "made by h" test has to stay in the shell.

## Recommendation

The decisions do move. Every choice of what to change in one element is now a checked cell of 12 lines or fewer,
callable alone: 17 unit tests, and 20000 random triples identical to render.ts. Defect 1 is fixed by moving the code.
The cost has three parts:

- 102 checked lines, against about 30 lines of decision logic before (an estimate).
- An unchecked shell that is no smaller (68 lines against 61).
- 34-69 µs more per patch of 100 keyed children in happy-dom (1.3-2.3x, from the range ends).
- `equals` and `String` applied to `unknown` prop values, which a typed attribute value would remove.

If the aim is checked decisions and a keyed algorithm that can be tested and improved alone, integrate it. If the
aim is less unchecked code, this split does not deliver it: the DOM application and the data projection replace
the lines that moved.

Not done: a fresh-agent review of this file (`/review-notebook`); the `document` skill was not loaded for it; a
measurement in a real browser.
