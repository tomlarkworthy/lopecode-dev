# Sheet: a spreadsheet as a lens over module scope

Status **prototype, 2026-08-30**, branch `worktree-sheet-lens`, module
`@tomlarkworthy/sheet` in `lopebooks/notebooks/@tomlarkworthy_sheet.html`
(lopebooks `798bf4d7`). Written from the session that built it.

The brief was to layer spreadsheet concepts over ordinary notebooks with as little new
machinery as possible: no new language, no specialised cell type, intuitive copy/paste with
relative addressing, and — the acceptance test Tom set — **delete the spreadsheet component and
the notebook should still work.**

## The one choice everything else follows from

**The coordinate is the name.** The cell at B3 is a variable literally named `B3`. Position is a
parse of the name, not data stored beside it.

That is the whole difference from `@tomlarkworthy/grid-container`, which is otherwise the same
shape of thing. grid-container needs an `include:` list and a `layout:` literal because cell names
carry no position, and those two lists can drift apart: an atom in `layout` but not `include`
never mounts, and Observable's lazy runtime never computes an unobserved cell, so the cell is
silently dead. That is a realised bug, not a hypothetical — it silenced two sequencers in the DAW
and presented as "pads work, song doesn't"
(`feedback_grid_include_layout_drift_silences_cells`).

A sheet has no such literal to drift, so the class of bug does not exist here. The view is a pure
function of `module._scope`. Deleting the `sheet()` cell leaves every cell computing, and
re-adding it reconstructs the identical grid, because nothing about the grid was ever stored.

**Unverified:** the delete-and-still-works property is argued from the construction, not yet
demonstrated by actually deleting the `widget` cell and reloading. It should be, and it is the
cheapest test in this document.

## Observable cell syntax already is formula-bar syntax

```
formula bar:   = A1 * taxRate
cell source:   B1 = A1 * taxRate
```

The `=` a spreadsheet user types is the name binding; the name comes from where they clicked. The
formula bar is `source.slice(source.indexOf("="))`. There is no translation layer to write, which
is the reason "no new language" is achievable rather than aspirational.

Two runtime facts make the rest of the mapping hold, both read out of the vendored runtime rather
than assumed:

- A reference to an undefined name creates a `TYPE_IMPLICIT` variable — `// created on reference`
  (`vendor/observable-runtime/src/variable.js:8`), minted in `module_resolve`
  (`vendor/observable-runtime/src/module.js:145`). So a formula may reference a blank cell; it
  errors as `A5 is not defined`, which is the `#NAME?` slot.
- Defining that name later *takes over* the placeholder rather than creating a duplicate —
  `variable.js:165`, whose own comment is `// Are the variable references broken?` … `// Now
  they're fixed!`. So formulas can be typed in any order, which is what a spreadsheet user
  expects and what a notebook user is usually denied.

| spreadsheet | notebook | new code needed |
|---|---|---|
| cell / formula | named cell / cell source | none |
| `A1` reference | variable name | none |
| recalculation | reactive runtime | none |
| circular reference | `RuntimeError: circular definition` | none |
| `#NAME?` on a blank ref | `TYPE_IMPLICIT` variable | none |
| forward reference | implicit-variable takeover | none |
| named range / `$A$1` | an ordinarily-named cell | none |
| sheet | module | none |
| cross-sheet reference | `import {A1 as rate} from "@you/sheet2"` | none |
| undo | `local-change-history` | none |
| data-entry vs formula cell | `viewof A1` vs `A1` | none |
| copy/paste, relative refs | decompile → rewrite → compile | ~40 lines |
| number formatting | a custom Observer | ~20 lines |
| `A1:A10` | — | not built, see below |

## Names as well as positions: the placement cell

The open question when the encoding was proposed was whether a cell can carry a semantic name as
well as a grid position, given that the name *is* the position. It can, by splitting definition
from placement:

```js
taxRate = 0.2        // definition — the semantic name
E1 = taxRate         // placement — "this lives at E1"
```

The sheet recognises a placement cell and labels the grid cell with the name it points at.
Detection reads `_inputs`, not the source, so it stays synchronous during render:

```js
const placementLabel = (v) => {
  if (v?._inputs?.length !== 1) return "";
  const dep = v._inputs[0]?._name;
  if (!dep || parseAddr(dep) || dep.startsWith("@")) return "";
  const body = String(v._definition).replace(/\s+/g, "");
  return body.includes("return(" + dep + ")") || body.endsWith("=>" + dep) ? dep : "";
};
```

Verified in the browser: `E1` renders with `label: "taxRate"` and text `"taxRate20.0%"`.

Three things fall out that were not designed for:

1. **Absolute and relative addressing with no syntax.** An `A1`-shaped name is relative and shifts
   on copy; any other name is absolute and does not. That is Excel's `A1` vs `$A$1`, and the
   absolute form is the one with a readable name, which is the incentive a spreadsheet-hygiene
   guide would want anyway. (`$A$1` is a legal JS identifier, so the Excel spelling remains
   available later as an alias if it is ever wanted.)
2. **Moving a named cell is one edit.** Rename the placement; `taxRate` is untouched and every
   referrer that used the name follows. Named-range semantics for free.
3. **Any cell can be placed.** `D5 = revenuePlot` puts a chart authored elsewhere in the module
   onto the grid — grid-container's `include:` list, expressed as cells instead of a literal.

Cost: one extra variable per *named* cell. Anonymous positional formulas stay one cell each.

## Deleting the sheet

The claim the whole design rests on, run 2026-08-30 in Chromium: delete the `widget` cell (the
only cell that calls `sheet()`), then perturb an input with no sheet on the page.

```
before delete   A1 120  B1 24  C1 144  C3 114  E1 0.2
after delete    A1 120  B1 24  C1 144  C3 114  E1 0.2      document.querySelectorAll('.sh-frame').length -> 0
A2.define(() => 999), sheet still absent
                B2 199.8   C2 1198.8
```

`B2 = A2 * taxRate` and `C2 = A2 + B2` recomputed with no container in existence, which is the
falsifiable form of "the sheet is a lens". What is lost is the `format:` map, since that is the
one thing the sheet cell owns (`C1` reverts from `$144.00` to `144`).

## Sparseness

Only defined cells are variables, and only defined cells have DOM. The grid lines are a CSS
background and the headers are recycled per scroll; empty positions have no node at all. Measured
on the demo sheet: an 8-column × 18-row grid with 11 defined cells has exactly

```
document.querySelectorAll('.sh-viz > .observablehq').length  ->  11
```

nodes, not 144. Extent is `max(defined, minimum)` and grows as cells are added, so the sheet is
open-ended rather than bounded.

## Overflow is a rule, not a format

Asked whether a DOM node should be allowed to overflow its cell box as a formatting option or as
a general rule. It has to be a general rule, because it is a different lens from formatting:
formatting is `value -> text`, overflow is `content -> footprint`. A per-cell span stored in the
sheet would be `layout:` creeping back in, and `layout:` is the thing this design exists to
delete.

The rule is Excel's, generalised: **content spills into empty neighbours and clips at the first
occupied one.** Nothing is stored. The size *request* comes from the node itself
(`E3 = Inputs.range(...)` asks for 368px), and how much of it is granted is a function of which
neighbours are in scope — a Map lookup, since scope is sparse. CSS does the rest with no
measurement pass:

```js
node.style.minWidth  = CW - 1 + "px";
node.style.maxWidth  = CW * freeSpan(occupied, a.col, a.row, 1, 0) - 1 + "px";
```

Vertical spill is granted only to cells whose value is a DOM node, so a long string widens but
does not push down through a column.

Measured 2026-08-30 on `viewof E3`, whose natural width is 368px:

```
neighbours F3..T3 empty   maxWidth 1407px (SPILL_MAX 16)   rendered 368px
G3 = 7 committed          maxWidth  175px (E3+F3)          rendered 175px
G3 deleted                                                 rendered 368px
```

`SPILL_MAX = 16` is a cap so a runaway value cannot paint over the whole sheet. The 175px reading
is the load-bearing one: it is the only evidence that the clip is driven by occupancy rather than
by the node's own size.

## The formula bar is one editor-5 CodeMirror

The first bar was a plain `<input>`, and it had the defect that motivates a formula bar in the
first place: putting the caret inside an existing expression and typing was a *whole-cell* edit,
not a text edit. It is now one `EditorView` for the entire sheet, retargeted on selection.

`cellEditor(variable, {pinned})` — editor-5's own per-cell component — is the wrong reuse. It
clones a whole hotbar shell per instance through `cloneViaSandbox`, which is the right cost for an
editor that owns a cell and the wrong cost for a strip that changes address on every arrow key.
The pieces to take are editor-5's exported extensions plus the CodeMirror bundle from
`@tomlarkworthy/codemirror-6-v2`:

```js
observableJS_language,
codemirror.syntaxHighlighting(observableJS_highlightStyle),
codemirror.autocompletion({ override: [sheetCompletions, literalCompletions] }),
```

`sheetCompletions` walks `module._scope` and offers every name in it, tagged `cell` for
`A1`-shaped names and `named` for the rest, so the completion list *is* the sheet's namespace.
`literalCompletions` is editor-5's, carried over unchanged.

Verified 2026-08-30, in Chromium, through real clicks and keystrokes (not synthetic events):

```
click F5, type "A1 * tax"     tooltip open, options ["taxRate  named"]
Tab                           doc "A1 * taxRate"       (completion accepted, no commit)
Enter                         history op:"new"  pid _3zvtv7  _inputs ["A1","taxRate"]  F5 renders 24
                              selection -> F6, focus back on the frame, bar cleared
click into the bar at the end of "A1 * taxRate", type " + 1", Enter
                              history op:"upd"  SAME pid _3zvtv7  "(A1 * taxRate + 1)"
```

The `op:"upd"` on an unchanged pid is the point of the whole section: a caret edit redefines the
existing variable rather than replacing it, so undo, diff and export see one cell with a history.

The keymap has to hand back to the completion, because a `keymap.of([...])` listed before
`autocompletion()` outranks `completionKeymap` and would otherwise swallow Enter, Tab and Escape
whenever the tooltip is open:

```js
{ key: "Enter",  run: (v) => codemirror.acceptCompletion(v) || (commitBar(), true) },
{ key: "Tab",    run: (v) => codemirror.acceptCompletion(v) || (commitBar(1, 0), true) },
{ key: "Escape", run: (v) => codemirror.closeCompletion(v)  || (syncBarForce(), frame.focus(), true) }
```

The format chooser is now `Inputs.select(FORMATS, {format: f => f || "plain"})` rather than a
hand-rolled `<select>`. Note `Inputs.select` returns a `<form>`, not the `<select>` — it is
wrapped in a flex div and the `<select>` inside is width-pinned, or the form stretches to the
whole bar (measured at 208px before the pin, 90px after).

## Copy and paste

`@tomlarkworthy/grid-container` already copies cells with renaming, for template instantiation:
`decompile` → `src.split(rootName).join(instName)` → `compile` → `module.variable().define(...)`.
The textual rename is the part that does not survive contact with a spreadsheet, because it would
rewrite `A1` inside a string literal or a property name.

The fix is not a hand-rolled parser. `parser.parseCell(source, {ranges: true})` returns
`cell.references` — the free references, **with spans**, from the Observable parser's own scope
analysis. That is the same array `compile` derives `_inputs` from
(`Array.from(cell.references || []).flatMap(...)`, observablejs-toolchain). Shadowed names, string
contents and comments are excluded by construction, so the rewriter is:

```js
rewriteRefs = (src, fn) => {
  const edits = [];
  for (const r of cellRefs(src)) {
    const to = fn(r.name, r);
    if (to && to !== r.name) edits.push({ start: r.start, end: r.end, text: to });
  }
  let out = src;
  for (const e of edits.sort((a, b) => b.start - a.start))
    out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return out;
};
```

and paste semantics are one line on top of it: *every `A1`-shaped name shifts by the delta, every
other name is absolute.*

**Two clipboard flavours.** `text/plain` carries the *values* as TSV so a copy pastes into Excel
or Sheets and a paste from them lands as literal cells; a private MIME carries the *sources* with
their offsets. `@tomlarkworthy/cells-to-clipboard` already established this pattern with
`application/vnd.observablehq+json`.

### The test

Copy `B1:B3`, paste at `D1`. `B1 = A1 * taxRate`, so a correct paste shifts `A1` two columns to
`C1` and leaves `taxRate` alone. Captured from the live page, 2026-08-30:

```
clipboard text/plain   "24.00\n68.00\n19.00"
clipboard rich         [{"dc":0,"dr":0,"src":"B1 = A1 * taxRate"}, … ]

D1  src "D1 = C1 * taxRate"   value 28.8
D2  src "D2 = C2 * taxRate"   value 81.60000000000001
D3  src "D3 = C3 * taxRate"   value 22.8
B1  src "B1 = A1 * taxRate"   value 24     (source unchanged)
C1  src "C1 = A1 + B1"        value 144
```

144 × 0.2 = 28.8, so the runtime recomputed through the shifted reference. The pasted cells are
ordinary cells, not a private representation — `local-change-history` recorded them as three
`op: "new"` events with pids `_yiz757`, `_ij7yzl`, `_10tgtrb` and
`_definition: "function _D1(C1,taxRate) {return (C1 * taxRate);}"`, which is how a hand-authored
cell is recorded. They therefore export, diff and undo like any other cell.

**Standard of proof, stated because it is weaker than it looks:** the clipboard events were
dispatched synthetically (`new ClipboardEvent('copy', {clipboardData: new DataTransfer()})`) on
the sheet frame. That exercises the handlers on their real event path but does **not** prove OS
clipboard integration. Playwright's `keyboard.press('Meta+C')` was tried first and does not work —
Chromium's built-in clipboard commands are not driven by CDP-injected key events, so the copy
handler never fired and the paste was a silent no-op. Cross-application copy/paste is untested.

## Four bugs the browser found that reading the code did not

Recorded because each is a class, not an incident.

**1. The host frame overrides your positioning.** Cells were laid out at a 43px row pitch against
a 22px grid:

```
inline style        A1 top 18px   A2 top 40px    (22 apart)
getBoundingClientRect   A1 y 295      A2 y 338    (43 apart)
```

Equal spacing in the style and unequal on screen means the elements are not absolutely
positioned. lopepage-2 styles `#lopepage-2 .lope-viz .observablehq {position: relative}` with an
ID selector, which outranks any class selector, so `top` offset from each cell's flow position
instead of from the canvas. grid-container carries the identical `!important` workaround with the
identical comment. **This is a tax on every container that positions adopted cell nodes**, and it
is the fourth such hand-rolled workaround in the corpus.

**2. `editor.style.display` is not the editing state.** The inline editor's `display: none` comes
from its CSS class, so `editor.style.display` reads `""`, and `!== "none"` is true before the
editor has ever been opened. Every guard was inverted from the first frame. The visible symptom
was that the first click on any cell deleted `A1`: `pointerdown` → `closeEditor(true)` → commit
the editor's empty value → delete the cell. The channel reported it before the screenshot did:

```
{op: "del", source: "runtime", pid: "_sha1", module: "@tomlarkworthy/sheet", _name: "A1"}
```

Fixed with an explicit `editing` flag. The general rule: **never derive state from a computed
style you did not write.**

**2b. A key handler on the container swallows the editor inside it.** The same class again, one
level up. The frame's `keydown` handler treats any single character as "start editing this cell",
so every keystroke typed into the newly embedded CodeMirror bubbled out of the editor, hit that
handler, was `preventDefault()`ed, and moved focus to the in-cell input. The symptom was that the
bar looked focused and would not accept text:

```
document.activeElement  ->  .sh-input, value "A1 * taxR"
CodeMirror doc          ->  unchanged
```

`if (bar.contains(e.target)) return;` at the top of the frame handler, and the same guard on
`copy`/`paste` so a copy in the bar stays a text copy. **A container that owns the keyboard has to
name the regions it does not own** — there is no capture-phase trick that fixes this, because the
editor is a legitimate descendant.

**3. `decompile` is async.** It returns a `Promise<string>`, so the formula bar, the editor seed
and the clipboard handler were all calling `.indexOf` on a Promise —
`TypeError: src.indexOf is not a function`, 21 occurrences at boot. The clipboard handler *cannot*
await, because a `copy` listener must populate `clipboardData` synchronously. The fix is a source
cache refreshed whenever the scope changes, which serves all three call sites and is the only
arrangement that works for the clipboard one.

## What was decided against

- **`instantiateDataflow` / `cloneDataflow`** (`plan/dataflow-templating-2.md`) also copies a
  group of variables with renaming, and is more sophisticated: sandbox runtime, refcounted
  bridges per captured name. It is the wrong tool here. Its clones are ephemeral instances,
  deliberately kept *out* of the primary runtime; a pasted spreadsheet cell must be a permanent,
  exportable cell of the module. grid-container's cruder decompile → compile → define path is the
  right one, with the rename made exact.
- **A range helper that reads module values at call time** (`sum(range("A1:A10"))`). It registers
  no dependencies, so the total would never recompute. Rejected on that ground alone.
- **Storing formats as sibling cells or in the value.** Formatting is the one thing with no home
  in the data, so the sheet cell owns a `format:` map and rewrites its own source, the way
  grid-container owns `layout:`. Deleting the sheet loses formats, not values. This is the single
  deliberate exception to "the container stores nothing", and it is the boundary worth defending:
  the sheet owns *presentation*, never *meaning*.

## Not built, in the order I would build it

1. **`A1:A10`.** The one place sugar is unavoidable. Expand at commit time — the bar accepts
   `A1:A10`, the stored source becomes `[A1,A2,…,A10]`, the bar renders it back. The code stays
   honest JS with real dependencies and survives deleting the sheet; the cost is source length, so
   ranges are bounded at a few dozen. Past that the notebook-native answer is one cell holding an
   array, which is a *different* lens (a table over one array-valued cell) and should be named
   separately rather than smuggled in here.
2. **Fill-down**, which is `paste` repeated — no new machinery.
3. **Cut-paste**, which is the *other* rewrite: referrers follow the cell. `descendants` /
   `ascendants` in runtime-sdk give the referrer set exactly.
4. **Column/row insert and delete.** Mass rename plus referrer rewrite. Well-defined, and the
   operation most likely to be slow or fragile.
5. **Extracting the writer.** `svg-lens`, `grid-container`, `editable-md`, `sticky` and now
   `sheet` each hand-roll "re-read the definition, splice, compile, redefine, record to
   local-change-history". `knowledge/svg-editor-architecture.md` §3 already flagged this as worth
   extracting; a fifth caller is enough.

## Limits

- **One variable per cell.** `plan/dataflow-templating-2.md` measured `check_for_code_change` at
  0.33 ms over 3107 variables (2026-08-09), and that scan runs on every mutation of
  `runtime._variables`, debounced through `setTimeout(0)`. Workable to a few thousand cells. This
  is a **model sheet, not a data grid**; a real spreadsheet's 10⁵ cells are out of scope by
  construction, not by omission.
- **Blank referenced cells error rather than reading 0.** Honest, and different from Excel.
- **Formats are keyed by address and do not travel with a copied cell.** Visible in the
  screenshot: pasted `D1:D3` show `28.8 / 81.6 / 22.8` unformatted while their `B` sources show
  `24.00 / 68.00 / 19.00`. Excel copies the format with the cell. Not yet decided which is right
  here.
- **Shadowing.** A local `const A1` inside a cell body is excluded correctly by the parser's scope
  analysis, so the rewriter is safe — but this was reasoned from `cell.references` semantics and
  **not tested**.
- **Formats, and only formats, die with the sheet.** See the deletion test above; the `format:`
  map is the one thing the container owns.
