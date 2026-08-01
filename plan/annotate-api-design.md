# annotate: the cell *is* the API

Built 2026-08-01. Suite: `tools/test-annotate.js`, 121/121.

## 1. The shape

An annotation is two cells in the module it annotates:

```js
annotation_review_1 = annotation({
  cell: "revenueChart",
  quote: { exact: "linear extrapolation" },
  author: "robocoop-5",
  severity: "warn"
})

annotation_review_1_note = md`This assumes stationarity — the series is seasonal.`
```

Anything that can define a cell can create an annotation: the editor, `define_cell` over the
pairing channel, an agent calling `runtime` define, or a person typing. `a2Store` is a
convenience over that, not a gatekeeper.

## 2. Why the `annotation()` wrapper earns its place

Because the cell takes `annotation` as an **input**, the runtime's own dependency graph is the
index. Discovery walks `annotationVar._outputs`, following import bridges one hop into other
modules. Verified: cells in the defining module and in a second module are both found, and
deleting the cell removes it from `_outputs` immediately.

That deletes `annotation_index` outright — the cell that used to force every writer through
`store.create`, and the only piece of bookkeeping that could fall out of step with reality.

The wrapper also normalises at author time, so a hand-written spec needs almost nothing:

- **Flat anchor keys.** `{cell, quote}` is lifted into `{anchor: {cell, quote}}`. The explicit
  `{anchor: {...}}` form still round-trips.
- **Inferred surface.** `quote` → text, `data` → plot, `svg` → svg, `frac` → image, otherwise the
  cell itself.
- **Defaults.** `box: {dx: 120, dy: -80, w: 240}`, `state: "open"`.
- **Everything else is kept verbatim** — `author`, `severity`, whatever an agent wants. No `meta`
  field was needed; unknown keys already survive create → patch → export.

Three fields are *derived at discovery*, not stored: `id` (from the cell's own name, minus a
leading `annotation_`), `home` (the module the cell lives in), and `cell` (the note, by
convention `<varName>_note`). `varName` is carried on the in-memory record so `patch`/`remove`
know which cell to rewrite. A cell need not be called `annotation_*` at all — `agentNoteB =
annotation({...})` gets id `agentNoteB`.

## 3. Discovery, in two passes

| pass | finds | why it is needed |
|---|---|---|
| `cellsInGraph()` | `annotation`'s `_outputs`, through import bridges | the primary index; catches any cell name |
| `cellsByName()` | `/^annotation_\w+$/` in every main's scope, minus `*_note` | legacy records (plain literals, no dependency to walk), and wrapper cells in a module with **no pane** — nothing observes them, so they never compute and the import bridge never binds |

`readRecords(force)` fills a value that is still `undefined` with `mod.value(name)`. A cell that
has never been evaluated is not yet an annotation; forcing at boot and on retry is what makes
"in a module nobody is looking at" work anyway.

Externally authored cells arrive through `onCodeChange` (runtime-sdk) — debounced 150ms, one
forced retry at 250ms if anything is still pending, and the cache commits only when the record
list actually differs, so the store's own writes do not loop.

## 4. What changed in the store

- Boot: index read → graph walk + name scan.
- `create`/`patch` emit **compiled source** (`annotation_<id> = annotation({...})`) instead of a
  JSON literal built with `new Function`. The record cell is now readable, editable source in
  editor-5 and legible in local-change-history, rather than `function anonymous()`.
- `remove` deletes two cells and nothing else.
- `annotation_index` is no longer written, and any surviving one is deleted at boot.
- `ensureAnnotation(mod)` injects `annotation` into an annotated module, reusing the same
  `ensureImport` helper as the editable-md `md` injection. Cheaper than `md`: it shadows nothing.
- `store.refresh()` is exposed for a caller that wants to force a rescan.

**Getting the owning module.** runtime-sdk's `myModule` is the *sdk's* module, not the importer's
— `myModule.value("annotation")` rejects with "annotation is not defined". The only way to reach
the module a cell lives in is the runtime's `@variable` builtin (`_v._module`). Also note
`lookupVariable` is **async**; inside the store, `mod._scope.get(name)` is the synchronous
equivalent.

**`RECORD_RE` must allow underscores.** `/^annotation_[A-Za-z0-9]+$/` silently skipped
`annotation_remote_c`, which read as "cross-module discovery is broken" when the regex was the
bug. `/^annotation_\w+$/` plus an explicit `_note` exclusion.

## 5. Example: an agent leaves review notes

```js
review = {
  const found = await analyse(cellsUnderReview);   // [{module, cell, quote, message, severity}]
  for (const f of found) {
    const id = "annotation_" + slug(f.cell) + "_" + hash(f.quote);
    define(id,        `annotation({module: ${q(f.module)}, cell: ${q(f.cell)},
                                   quote: {exact: ${q(f.quote)}},
                                   author: "robocoop-5", severity: ${q(f.severity)}})`);
    define(id + "_note", "md`**" + f.severity + "** — " + f.message + "`");
  }
  return found.length + " notes";
}
```

`define` is whatever that context uses to define a cell — the MCP `define_cell` tool, editor-5,
`runtime.module().define`. No import of annotate's store, no registration call. The notes
appear as soon as the cells compute.

Reading back is the reactive array:

```js
mine = annotations.filter(a => a.author === "robocoop-5")
```

with `a.anchor.quote.exact` for what a note points at and the note cell's own value/source for
what it says. An annotation whose anchor no longer resolves reports `adrift` (§13 of
`annotate-design.md`) — the agent should read that as "the code moved under me".

## 5b. The second wrapper: `surface()`

A coordinate space is contributed the same way a note is:

```js
mySurface = surface({
  name: "waveform", order: 15,
  pick: (el) => el.closest("canvas.waveform"),
  describe: (el, cx, cy) => ({surface: "waveform", t: pxToSeconds(el, cx)}),
  find: (loc) => loc.hostNode && loc.hostNode.querySelector("canvas.waveform"),
  place: (el, a) => ({kind: "point", x: secondsToPx(el, a.t), y: el.getBoundingClientRect().top})
})
```

Finding the node is not the surface's job — `pid → cell → region → path` is shared, and `loc`
arrives with `hostNode`/`target` already resolved. A surface only says how a click inside that
node becomes numbers (`describe`) and how those numbers become a screen point again (`place`).
`order` decides who claims a click; `element` (90) matches everything, so anything more specific
must sort before it.

Built in: **text** (0), **plot** (10, data space via Plot's `scale().invert`), **svg** (20,
user units through `getScreenCTM()`), **image** (30), **element** (90). An anchor naming a
surface this build has never heard of goes adrift with `why: "unknown surface …"` rather than
being painted at a guessed fraction.

## 5c. Anchors people write, versus anchors placements record

A hand-written anchor names a cell and a quote and stops there. Two things assumed the full
recorded shape and broke on it: `locate` found the pane only through `anchor.module` (so the
box was painted in viewport space and clamped to the window), and `patch` recomputed
`home` as `anchor.module || DATA` (so patching migrated the annotation into the data module,
and the next export dropped it from the notebook). Both now derive from where the cell
actually is. The lesson generalises: every field of an anchor is optional, and the resolver
has to work from whatever subset is present.

## 6. Costs, unchanged

Every annotation is two cells in the user's notebook, and the first one placed in a module
injects editable-md (making that module's markdown click-to-edit) plus the `annotation` import.
An agent leaving fifty notes has made a hundred cells of edit history.
