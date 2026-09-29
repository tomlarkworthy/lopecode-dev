# Switchboard: a prompt annotation and a prose cell, routed to one agent

Designed 2026-09-29 as "robocoop-5 entrances" (`plan/rc5-entrances.md` until this rename); Tom approved the
design and answered §6 the same day, and the build started then. After steps 1-3 shipped he changed the
design: the entrances become an agent-agnostic switchboard (§7). §§2-5 describe the robocoop-only design and
are kept as the record of how it was reached; where they disagree with §7, §7 holds. Tom's request, verbatim:

> I would like new ways to start a robocoop session. From an annotation, but then I want a real UI to
> appear at that point in a thread from the prompt annotation, quite like Feeling_of_Computing, and also
> when you add a new cell and just type prose, it should switch to a robocoop session and try to solve
> it. There are hard functions to make compositional, so you need to think about how to properly
> decouple these from the canonicals (annotate) and (lopepage-2) that are their entrances.

He wrote "robocoop-3"; he confirmed robocoop-5 on 2026-09-29 (§6). robocoop-5 is the agent that has
sessions, a `robocoop5(options)` builder and guardrails; robocoop-3 has none of them.

Sources were read from the canonicals at lopebooks `0682da59` and lopecode `14c6ecf`, extracted with
`bun tools/lope-reader.ts <html> --get-module <id>`. Every `file:line` below is a line of the notebook HTML.

## 1. What exists

### 1.1 The bus

`@tomlarkworthy/plugin-registry` is `add(name, value, {invalidation}) → remove` and `get(name) → Generator<value[]>`
(`lopebooks/notebooks/@tomlarkworthy_plugin-registry.html:3118`, `:3137`). Neither side imports the other.
Four sets are in use:

| set | consumer | provider(s) |
|---|---|---|
| `lp2-menu` | lopepage-2 `lp2MenuItems` (`lopecode/notebooks/@tomlarkworthy_lopepage-2.html:4032`); items take `children` for a submenu (`:4024`) | annotate, command-palette |
| `lopecode_commands` | command-palette | annotate (`@tomlarkworthy_annotate.html:10818`) |
| `import_plugins` | lopepage-2 drop wizard (`lopepage-2.html:4592`) | any |
| `rc5-tools`, `rc5-context` | robocoop-5-tools | robocoop-5 |

A consumer that is expensive to rebuild does not depend on the set directly. command-palette builds its
overlay once and a small `command_provider_sync` cell pushes the set into `overlay._setProviders(arr)`
(`lopecode/notebooks/@tomlarkworthy_command-palette.html:2105-2106`). Both extension points below use that
shape, for the reason in §1.4.

### 1.2 annotate

An annotation is two cells in the module it annotates, `annotation_<id> = annotation({...})` and
`annotation_<id>_note`, and the note can be any cell. Tom rejected a registry and an SDK for *creating and
finding* annotations: "the cell is the API" (`@tomlarkworthy_annotate.html:8853`, `plan/annotate-api-design.md` §1).
What matters here:

- `a2Store.create(anchor, fields)` already takes `fields.src`, the note's source
  (`@tomlarkworthy_annotate.html:9746`, `:9753`, `:9757`). No caller passes it: the chip and the armed
  gesture both call `store.create(anchor)` (`:10467`, `:10500`), so every note starts as ``md`note…` `` (`:9614`).
- The note is compiled with toolchain `compile()` and `new Function` (`:9618-9622`) and mounted in the box
  through runtime-sdk `observe` + `Inspector` (`:10067`). The box body is `max-height:340px; overflow:auto` (`:10031`).
  The default box is `{dx:120, dy:-80, w:240}` and `state:"open"` (`:9469`); nothing in the layer reads `state`.
- `ensureImport(mod, moduleVar, name, load)` (`:9578`) adds an import to the annotated module. Its comment
  (`:9570`) records why the loader must contain its module URL as a string literal: toolchain's
  `findModuleName` parses it, and a loader without one was exported as `id="<unknown 0.x>"`.
- The only verb is `a2Layer.arm()` → `arm("new")` (`:10570`). It reaches the page through two plugins,
  `lp2-menu` (`:10774`) and `lopecode_commands` (`:10818`). When the layer is disabled, arming hands the
  intent across the recompute on a stable element (`$1.__a2armOnEnable`, `:9870`, consumed at `:10579`).
- `a2Layer` depends on 11 cells (`:10874`); making it depend on a plugin set would rebuild the layer, its
  boxes and its listeners on every registration.

### 1.3 Feeling_of_Computing

`@tomlarkworthy/foc-annotations` has "no annotation record and no note cell — only messages"
(`lopebooks/notebooks/Feeling_of_Computing.html:2857`). What the user sees:

- select text → a `💬 Annotate` chip (`:3361`) → a 380px popover at the selection (`:3051`, `:3302`) with the
  quote as its title, one line saying where the thread will go (`:3337`), and a focused composer (`:3353`);
- afterwards a `💬 N` badge beside the highlighted text (`:3226`); a click opens the thread in the chat
  pane (`:3218`), not in place;
- resolved = a ✅ reaction, which dims the badge (`:2979`).

It imports `a2Anchors` from annotate and removes annotate from mains, so it paints its own layer. Tom
rejected every annotation-record, indexer, CRDT and Spaces design for it
(memory `project_foc_annotations_are_colibri_threads`, 2026-09-14). This design adds no record: the
thread is an rc5 session module, found by reflection like every other session.

### 1.4 robocoop-5

- `robocoop5({group, model, system, tools, hooks, persist, height, settings, watches, invalidation})`
  (`lopebooks/notebooks/@tomlarkworthy_robocoop-5.html:4580`). A chat picks its session by **group**:
  `rc5_lastShown.get(group) ?? rc5_controller.create({group})` (`:4596`). There is no way to ask for one
  session by id.
- `controller.create({group})` sets `id: null` (`:49044`); `ensureLog` already forwards `entry.id` to
  `createSessionLog` (`:48992`), which accepts an `id` (`:48726`). So a caller-chosen id is one parameter away.
- A session is saved iff its module is a main, as `@<group>/<id>` (`:48879`), moved into a fresh
  `createModule` so it is named correctly (`:48855`; memory `feedback_module_joining_mains_late_stays_named_main`).
  `persist: true` saves after the first turn (`:5138`).
- Sessions are found by reflection over `session_meta` cells (`:48836`, `refresh()` at `:49031`). `refresh`
  is async; the builder chooses its entry synchronously.
- The guard refuses writes to `@tomlarkworthy/robocoop-5-*` and to saved session modules; `@tomlarkworthy/robocoop-5`
  itself is writable (`:49191`, `:49199`). User modules are not restricted.
- `watches` are values the agent is told each step (`:4562`). This is where anchor context goes.

### 1.5 Where a new cell is created and typed

lopepage-2 does not create cells. It keeps editor-5's `auto_attach` alive (`lopepage-2.html:3561`). The
entrance Tom called lopepage-2 is editor-5:

- ➕ (`lopebooks/notebooks/@tomlarkworthy_editor-5.html:6873`) sends `createCell`, which compiles `'{}'`
  (`:7075`) and opens the new cell's editor pinned.
- Every path that applies typed source — ➕, Shift-Enter (`:7456`), ▶ apply, paste — goes through
  `compile_and_update(source, variables, cell)` (`:7910`). It calls `sourceLanguage` (`:7914`), then `compile`
  (`:7917`), and swallows any exception with `console.error` (`:7973-7974`).
- `sourceLanguage` returns `"ojs"` without parsing when the module has no Notebook Kit cell (`:7852`).
  toolchain `compile()` does not throw on a syntax error; it returns a variable whose definition throws
  (memory `feedback_compile_swallows_syntax_errors`, not re-checked here). So today prose becomes an
  anonymous cell showing `SyntaxError`.
- `compile_and_update` is a template cell (`:6392`). A redefinition rebuilds every open editor panel
  (`:6602`; memory `feedback_editor5_hot_replacement_boundary`). If it depended on a plugin set, each
  registration at boot would rebuild every editor. That is why the hook below reads a holder cell.

**Prose detection, measured 2026-09-29** with `@observablehq/parser` 6.1.0 (the copy in
`scratch/notebook-kit-fork/node_modules`; the version toolchain bundles was not checked):

```
"make a bar chart of rows by month"   fails col 5  firstGap 5  prose=true
"plot sales"                          fails col 5  firstGap 5  prose=true
"what is 2+2?"                        fails col 5  firstGap 5  prose=true
"add a slider for n"                  fails col 4  firstGap 4  prose=true
"x = foo("                            fails col 8  firstGap 2  prose=false
"x = [1, 2,"                          fails col 10 firstGap 2  prose=false
"const x = 1;"                        fails col 0  firstGap 6  prose=false
"viewof x = Inputs.range("            fails col 24 firstGap 7  prose=false
"let me think about this"             fails col 0  firstGap 4  prose=false
"foo bar"                             fails col 4  firstGap 4  prose=true
"chart"                               PARSES
```

The rule "the parse fails exactly at the gap after the first word" separates prose from half-typed code
on every case tried. Its misses: a one-word request parses as a reference; a sentence starting with a
keyword (`let`, `const`, `import`) fails at column 0 and reads as code. `"foo bar"` counts as prose, so
the rule needs a minimum word count as well (3 is a guess, not measured). The rule belongs to robocoop-5,
not editor-5: editor-5 should only report "this does not parse" and let a handler decide what it is.

## 2. robocoop-5 pieces both entrances share

All of this is in robocoop-5's own modules. None of it touches a shared canonical.

**A new module `@tomlarkworthy/robocoop-5-entrances`**, in the robocoop-5 notebook's mains, `upstream: null`
until published. It holds the two registrations and `rc5Thread`. Registration cells in `@tomlarkworthy/robocoop-5`
itself would not run in a notebook that only imports `robocoop5`, because imported cells compute only when
observed; a separate main is an explicit opt-in.

**`robocoop5` gains three options**, all backwards compatible:

```js
robocoop5({
  group: "rc5-threads",
  session: "a2k3j9x0qp",   // pick this session by id: an existing entry, a saved @group/id found by refresh(),
                           // else controller.create({group, id}). Does not read or write rc5_lastShown.
  compact: true,           // no session bar, settings, model line or ⟲; transcript + input + a link to the full chat
  start: "…",              // optional first message, sent once (see below)
  persist: true,
  height: 280,
  watches: () => [...defaultWatches(), { label: "anchor", read: () => anchor }],
  invalidation
})
```

`controller.create({group, id})` takes the id. The compact chat is the same builder with sections left
out, so there is one transcript renderer. `rc5_lastShown` stays keyed by group for the non-session case.

**`start` is sent once per page life, not once per cell run.** A cell re-runs on every reload and on every
upstream change; a literal `start:` in cell source would re-send the prompt each time. The handoff is a
constant cell `rc5_pendingStarts = new Map()` (session id → text). The entrance puts the text there; the
chat takes it out on its first render and calls its own `submit`. After a reload the map is empty and
nothing is sent. This copies annotate's arm-on-enable handoff (`@tomlarkworthy_annotate.html:9870`, `:10579`).
The `start:` option exists for programmatic callers who accept that behaviour.

**`rc5Thread({id, context, invalidation})`** is a cell in the entrances module that returns
`robocoop5({group: "rc5-threads", session: id, compact: true, persist: true, height: 280, watches: …context…})`.
Generated cell source calls `rc5Thread`, never `robocoop5` with every option spelled out, so later changes
to the defaults reach cells that were already written.

## 3. Entrance A: a prompt annotation

### 3.1 Extension point in annotate: a plugin set `"annotate-kinds"`

A kind is a way to start an annotation. annotate's own note becomes the built-in kind; any notebook can add
more without annotate importing it.

```js
plugins.add("annotate-kinds", {
  id: "rc5",
  label: "Ask robocoop",
  icon: "💬",                          // chip text prefix; an SVG string for the menu
  order: 10,                           // the built-in "note" kind is 0
  box: { w: 380, h: 320 },             // merged into the record's box
  imports: [{ name: "rc5Thread", module: "@tomlarkworthy/robocoop-5-entrances",
              load: () => importShim("/@tomlarkworthy/robocoop-5-entrances.js?v=4")
                .then(m => runtime.module(m.default)) }],   // URL as a string literal (annotate.html:9570)
  note: ({ id, anchor }) => `rc5Thread({id: ${JSON.stringify(id)}, context: ${ctx(anchor)}, invalidation})`,
  created: ({ id }) => {}              // optional; runs after both cells exist
}, { invalidation });
```

What changes in annotate:

1. `a2Kinds = plugins.get("annotate-kinds")` plus a constant holder `a2KindsRef = ({current: []})` and a sync
   cell that copies the set into it. `a2Layer` reads the holder, so it is not rebuilt when a kind registers (§1.2).
2. `arm(kindId = "note")`; `status.arm(kindId)`. `armedUp` and the chip pass `kind` to `store.create`.
3. `store.create(anchor, {kind})`: mint the id, run `kind.imports` through the existing `ensureImport`,
   then `defineSource(mod, noteName, kind.note({id, anchor}))`, merge `kind.box`, store `kind: kind.id` in the
   record (unknown keys are already kept verbatim, `plan/annotate-api-design.md` §2), then `kind.created?.(…)`.
   Today's `fields.src` stays.
4. `a2MenuItem` registers `Annotate` with `children` (one per kind) when more than one kind exists, else as
   today. `a2Commands` offers one command per kind. The selection chip becomes one button per kind
   (`✎ note`, `💬 ask`).

annotate never names robocoop. Records written before the change have no `kind` and behave as today.
Estimated size: ~40 lines in `a2Store`/`a2Layer`, two new cells, changes to two plugin cells (an estimate,
not counted from a diff).

### 3.2 What robocoop-5 registers

`rc5_annotateKind` in the entrances module, the object above. `ctx(anchor)` bakes a JSON literal into the note
source: `{module, cell, pid, quote: anchor.quote?.exact}`. `created({id})` puts `{focus: true}` in
`rc5_pendingStarts`, so the compact chat opens with its textarea focused, like the FoC composer
(`Feeling_of_Computing.html:3353`). The anchor watch also reads the anchored cell's current source by name
through runtime-sdk, so the agent sees the cell as it is now and not as it was when the annotation was created.

### 3.3 Flow

1. ≡ → Annotate → Ask robocoop (or ⌘K, or the `💬 ask` chip) → a drag over text or a click.
2. annotate writes `annotation_a2k3j9x0qp = annotation({anchor, kind: "rc5", box: {…}})` and
   `annotation_a2k3j9x0qp_note = rc5Thread({id: "a2k3j9x0qp", context: {…}, invalidation})` into the anchored
   module, plus `import {rc5Thread}` if the module lacks it.
3. The box mounts the note: a 380×320 compact chat at the anchor, with a leader line. It is annotate's
   existing box, not a popover.
4. The user types. The first send creates session log `a2k3j9x0qp` in group `rc5-threads`. After the turn,
   `persist` saves it as `@rc5-threads/a2k3j9x0qp`, a fresh `createModule`, so it is named correctly.
5. Replies are further turns. The same session appears in the full chat's picker as `rc5-threads: <title>`,
   where it can be continued at full size.

### 3.4 Save and export

- Both annotation cells live in the anchored module, which is a main, so they are saved (existing behaviour).
- The thread is saved once its first turn commits (`persist`). Before that, a reload shows an empty thread
  under the annotation. That is correct: nothing was said.
- The `import {rc5Thread}` bridge is saved with the module. The robocoop-5 blocks must be in the file for the
  note to boot. In a notebook without them, the note shows a load error in its box and the annotation
  itself still paints.
- The rc5 transcript renders inside shadow roots, which exporter-3 does not clone, so a thread does not leak
  into the prerender (memory `project_rc5_multi_session`, lopebooks 3f0e0630). Inside an annotate box this is
  not verified.

### 3.5 Failure modes

- **Deleting the annotation orphans the session.** `store.remove` deletes both cells (`:9792`), but
  `@rc5-threads/<id>` is still a main and stays in every later save. Proposed: rc5 flags a `rc5-threads`
  session with no `annotation_<id>` cell on the page as orphaned and offers a delete in the picker. This is
  reflection, with no hook into annotate. An `onRemove` on the kind would be simpler, and it is more annotate API.
- **Dragging or re-anchoring the box redefines the record cell** (`patch`). The note does not reference the
  record, so the chat is not rebuilt. `ctx` was baked at creation, so the quote the agent sees can be stale;
  the live cell-source watch covers the part that matters.
- **Re-anchoring into another module moves the note by copying its `_definition` and inputs** (§1.2). The
  new module needs `rc5Thread`; `patch` runs `ensureMd` only. The kind's `imports` must run there too.
- **The session is found late.** `refresh()` is async, so on reload the chat may create a new empty entry
  before the saved `@rc5-threads/<id>` is found. `session:` must switch to the discovered entry and drop the
  placeholder. The multi-session work hit the same race, where CMD+K could not find a session.
- **A box of about 380px holds the chat.** The chat's minimum height is 200px (`robocoop-5.html:4601`),
  and annotate's body max-height is 340px, which holds only when `box.h` is set. `compact` has to fit that.
- **Escape inside the textarea** deselects the annotation (annotate's document keydown). This is harmless
  but visible.

### 3.6 Alternatives

| | cost | verdict |
|---|---|---|
| **A1. `annotate-kinds` set (above)** | about 40 lines in annotate plus a push to Observable; every annotate consumer (24 files) needs a resync to get kinds | recommended |
| A2. rc5 imports `a2Anchors` and writes the two cells itself, as FoC does | no annotate change. rc5 re-implements the arm gesture, chip and click-swallow (`:10467-10560`, about 60 lines), two chips appear on every selection when both are on the page, the entrances module imports annotate's 96KB block, and the next kind (a review note, a ticket) copies it again | rejected: it forks annotate's gesture, which is the difficult part |
| A3. No new gesture: a `💬 ask` button in the note header of any annotation turns its note into `rc5Thread` | needs a "note header actions" plugin set, the same kind of annotate change as A1, and takes two gestures | possible follow-up; does not answer "start from an annotation" |

A1 does not conflict with Tom's rejection of a plugin bus in annotate. He rejected one as the index of
annotations (`plan/annotate-api-design.md` §1-2), and the graph walk remains the index. `annotate-kinds`
lists ways to *start* one, in the same way `lp2-menu` lists menu items.

## 4. Entrance B: a new cell that holds prose

### 4.1 Extension point in editor-5: a plugin set `"cell_source_handlers"`

```js
plugins.add("cell_source_handlers", {
  id: "rc5-prose",
  order: 10,
  // editor-5 calls this only when the source does not parse as the cell's language
  claim: (source, { error, module, cell }) => boolean,
  // returns replacement source; editor-5 compiles that instead, through the normal path
  rewrite: async (source, { module, cell, variables }) => string,
  // optional; runs after the replacement is defined
  applied: ({ source, variables, module }) => {}
}, { invalidation });
```

What changes in editor-5:

1. `cellSourceHandlers = plugins.get("cell_source_handlers")`, a constant holder
   `cellSourceHandlersRef = ({current: []})` and a sync cell. `compile_and_update` depends on the holder, not
   the set (§1.5). editor-5 does not import plugin-registry today. The module is in all 248 files that
   carry editor-5, so the import adds no blocks.
2. In `compile_and_update`, before `sourceLanguage`: if the source parses as neither ojs (`parser.parseCell`)
   nor, in a js module, `transpileJavaScript`, walk the holder in order. The first handler that `claim`s it
   gets `rewrite`, and its result replaces `source` for the rest of the function. `parser` is already
   imported (`@tomlarkworthy_editor-5.html:8833`). With no handler, or no claim, the behaviour is unchanged.
3. The hook covers source typed in the editor only. `define_cell` over pairing, rc5's own file tools and
   `update_cell` do not go through `compile_and_update`, so an agent writing a bad cell is not turned into
   a prompt.

This is a generic "source that does not parse" hook. editor-5 does not know about prose. Estimated size:
about 20 lines and three cells (an estimate).

### 4.2 What robocoop-5 registers

`rc5_proseHandler` in the entrances module:

- `claim` applies the §1.5 rule: the error column equals the first word gap, and there are at least 3 words.
- `rewrite` mints `id = "p" + random`, runs the same `ensureImport` pattern for `rc5Thread` into
  `ctx.module`, puts the prose in `rc5_pendingStarts`, and returns
  ``prompt_<id> = rc5Thread({id: "<id>", context: {prose: "<escaped>", module, after: "prompt_<id>"}, invalidation})``.
  The prose is JSON-escaped with `<` as `<` (memory `feedback_escape_data_interpolated_into_generated_cells`).
- The context watch tells the agent which module it is in and that new cells go after `prompt_<id>`.

### 4.3 What the cell is, before and after

- **While the agent works:** the cell *is* the compact chat, inline where the user typed, streaming. The
  editor shows `prompt_<id> = rc5Thread({…})` after Shift-Enter, because editor-5 writes the canonical source
  back (`:7456` block). The prose is visible there as `context.prose`.
- **After:** the agent's cells are defined in the same module. The prompt cell stays as a record of how they
  were made and as the place to ask again. The user deletes it when done. The session module outlives it,
  with the same orphan rule as §3.5.
- Alternative after-state: replace the prompt cell with ``md`> <prose>` `` and link to the session. It
  preserves the text but loses the in-place follow-up. Not recommended as the default; offer it as a "done"
  action in the compact chat.

### 4.4 Save and export

`prompt_<id>` and its import live in the user's module and are saved with it. The session is saved after its
first turn (`persist`). A reload shows the finished thread and does not re-run it (§2 `start`). A save made
while a turn is running captures the prompt cell but not the in-flight turn. The turn commits when `send`
settles (`robocoop-5.html:49070`), and the next save includes it.

### 4.5 Failure modes

- **A false positive swallows a typo.** Half-typed code that happens to fail at the first gap
  (`foo bar`-shaped) becomes a prompt. Mitigation: a 3-word minimum, and the compact chat shows
  "↩ keep as code", which restores the source and deletes the session. Not measured on real typing.
- **The agent edits or deletes its own prompt cell.** File-tool writes cover the whole module. Unverified:
  whether rc5's srctools redefines unchanged cells on a write. If it does, every write rebuilds the chat UI
  (memory `feedback_variable_churn_rebuilds_rc5_chat_ui`). A running turn survives a rebuilt UI (`:4664`). `hooks.beforeTool` in `rc5Thread` can refuse an edit whose `old_string` contains `prompt_<id> =`.
- **The prose cell sits in a module with no robocoop-5 block.** The handler only exists when the entrances
  module is booted, so the claim never fires there. That is correct by construction.
- **The editor's pinned state.** `createCell` pins by pid (`:7075` block). The rewrite reuses the variable
  slot, so the pid and pin are kept. Unverified.

### 4.6 Alternatives

| | cost | verdict |
|---|---|---|
| **B1. `cell_source_handlers` in editor-5 (above)** | about 20 lines in editor-5, two canonicals (lopebooks and lopecode), an Observable push, and a resync of 248 copies before it works in any given notebook | recommended |
| B2. rc5 watches `onCodeChange` for a new variable whose definition throws `SyntaxError`, recovers the source with `decompile` and rewrites the cell | no canonical change. The source has already been compiled into a throwing cell, a red error flashes first, decompiling a throwing definition to recover prose is unverified, and it fires for every writer (pairing, agents), not just typing | fallback for notebooks whose editor-5 is stale |
| B3. An explicit marker such as `? make a chart` or `/ask` | removes false positives; editor-5 still needs the hook; Tom asked for "just type prose" | offer as an option on top of B1 |
| B4. Put the hook in lopepage-2 | lopepage-2 does not create or compile cells (§1.5) | no |

## 5. Implementation plan

Each step has a probe that needs no model call: rc5's makeSession can be replaced by a fake agent, as
`test_session_controller` does (`robocoop-5.html:49115`).

| # | step | canonical(s) changed | probe (model-free) | Observable push |
|---|---|---|---|---|
| 1 | `controller.create({group, id})`; `robocoop5({session, compact})`; `rc5_pendingStarts` | robocoop-5, robocoop-5-sessions (lopebooks) | `test_*` cell: two `session:` chats with a fake agent map to two entries with the given ids; save → reload → `session:` finds the saved `@g/id`, and there is one entry, not two; `rc5_pendingStarts` sends once, then an empty reload sends nothing | yes, both published |
| 2 | new module `robocoop-5-entrances` with `rc5Thread`; add to robocoop-5 mains; `canonical.json` entry `upstream: null` | robocoop-5 notebook only | define `x = rc5Thread({id:"t1", context:{}})` in a scratch module; export; the file boots it; `lope-preflight.ts` clean | no (upstream null) |
| 3 | `annotate-kinds` in annotate (§3.1), built-in `note` kind | annotate (lopebooks) | extend `tools/test-annotate.js`: register a stub kind whose note is ``md`stub ${id}` ``; arm it; click; assert the record has `kind`, the note source contains the id, the box has the kind's `w/h`, and a menu item has children; the existing 130 tests unchanged | yes (`lope-push-ws.js … --cells` per cell; mirror per `reference_annotate_observable_target`) |
| 4 | `rc5_annotateKind` in entrances | robocoop-5 notebook | page with annotate + entrances: arm "Ask robocoop", click prose, send with a fake agent; `@rc5-threads/<id>` is in mains and named correctly in `currentModules`; export → reload → the thread shows the turn; delete the annotation → the orphan is flagged | no |
| 5 | `cell_source_handlers` in editor-5 (§4.1) | editor-5 (lopebooks + lopecode) | `editor-5-tests` `ui.scenario` behind `&e5_tests`: a stub handler claiming `/^zz /` rewrites `zz a b` to `1+1`; the cell shows 2 with the same pid; `x = foo(` is unclaimed and unchanged; `test_editor_hot_patch` still passes | yes |
| 6 | `rc5_proseHandler` in entrances, with the §1.5 rule as a pure function plus `test_prose_rule` over the table in §1.5 | robocoop-5 notebook | the `test_prose_rule` table; UI: ➕, type prose, Shift-Enter → a `prompt_*` cell holding the compact chat, a fake agent defines `y = 1` after it; reload → no second send | no |
| 7 | resync annotate and editor-5 into consumers | all consumers | `sync-module.ts --all-canonical` for both; `lope-preflight.ts` differential against `tools/preflight-baseline.json` | no |

Steps 1-2 are robocoop-5's own and ship without any shared-module change. Step 3 and step 5 are independent.
Entrance A (steps 1-4) can ship without entrance B.

## 6. Decisions (Tom, 2026-09-29)

The five open questions, as answered. Each is now a requirement of the build, not an option.

1. **robocoop-5**, not robocoop-3.
2. **Threads fold to a `💬 N` badge at the anchor**, as in Feeling_of_Computing, and expand on click. The
   fold is a compact-mode behaviour of the rc5 chat; annotate only learns to draw a folded box small.
3. **Threads can be resolved**, through the annotation record's existing `state` field
   (`"resolved"`). A resolved thread dims. `task_complete` does not resolve a thread.
4. **Deleting an annotation or prompt cell keeps its session** and flags it as orphaned (reflection,
   §3.5); the full chat's picker offers the delete.
5. **Prose detection is the heuristic**: the parse fails right after the first word and there are at
   least 3 words. No explicit marker.

## 7. Switchboard (Tom, 2026-09-29, after steps 1-3 shipped)

Tom, verbatim: "robocoop-5-entrances should be a SWITCHBOARD, because Claude Code pairing will also want to
connect into it." Decided the same day, with these requirements:

- **`@tomlarkworthy/switchboard`**, agent-agnostic, depends on `@tomlarkworthy/plugin-registry` and nothing
  agent-specific. It replaces `@tomlarkworthy/robocoop-5-entrances`, which shipped in step 1
  (lopebooks `f8ce9ac0`) and is refactored away rather than kept beside it.
- **Entrances are sources, agents are listeners.** The annotate kind and the prose-cell handler (the
  sources) route to ONE selected destination. Destinations register into the plugin set
  `"switchboard_listeners"`; robocoop-5 registers itself, and so does `@tomlarkworthy/claude-code-pairing`.
  The registrations are hard-coded in those two modules.
- **A settings select picks the destination.** One of, never both. The default at notebook start is
  robocoop-5, because it is built in; an id with no registered listener falls back to it. Pairing takes
  over by setting the select's value and dispatching `input`, not through a separate takeover plugin.
- **The annotate kind names the destination**: "Ask robocoop" or "Ask Claude".
- **The anchored thread UI works for either destination**: badge fold, resolved state and orphan flag as
  decided in §6.
- **Pairing replies land in their thread.** A prompt goes to Claude Code over the channel carrying the
  anchor, quote and cell context; Claude's `reply` must be addressable to a thread id. The channel server
  is a separate repo (`lopecode-plugin`), so a server change is described and asked about before release.

### 7.1 The listener interface

```js
plugins.add("switchboard_listeners", {
  id: "robocoop-5",            // what a thread cell records as `to`, and the select's value
  label: "robocoop",           // "Ask robocoop"
  icon: "\u{1F4AC}",
  order: 10,                   // select order; also the fallback order after the default
  // either: the listener draws its own thread (robocoop-5 does: its compact chat)
  open: ({ id, context, pending, invalidation }) => element,
  // or: the switchboard draws a plain thread and the listener only carries text
  send: ({ thread, text, context, reply }) => {}   // reply(markdown) appends to that thread, any time later
}, { invalidation })
```

`pending` is `{text}` (a prose cell: send it) or `{focus: true}` (a new annotation), handed over once per page
life as `rc5_pendingStarts` was (§2). A listener with `open` owns fold and resolve itself, through the
`a2-fold` / `a2-state` events annotate already handles; the switchboard's plain thread does the same.

### 7.2 What a thread cell holds

```js
annotation_<id>_note = switchboardThread({id: "<id>", to: "robocoop-5", context: {…}, invalidation})
prompt_<id>          = switchboardThread({id: "<id>", to: "claude-code", context: {…}, invalidation})
```

`to` is baked in at creation, so a thread keeps its destination when the select changes. `switchboardThread`
mounts the listener registered under `to`, and remounts when that listener registers later (module boot
order is not fixed). With no such listener it shows the thread with sending disabled and says which
destination is missing; it does not reroute an existing thread to the default.

### 7.3 How pairing finds the select without importing the switchboard

`claude-code-pairing` is embedded in almost every notebook, so an import of the switchboard would have to
be carried into all of them on the next resync. The switchboard instead registers its select element into
the plugin set `"switchboard_destination"`; pairing reads that set, and when the channel reports `connected`
it sets `.value = "claude-code"` and dispatches `input`. On disconnect pairing unregisters its listener, and
the destination falls back to robocoop-5.

### 7.4 Addressing a reply to a thread

Works with the released channel server, no change:

- the notebook sends `{type: "message", content}` where `content` starts `[thread:<id>]` and carries the
  context and the instruction to start the reply's markdown with the same tag;
- pairing routes a `reply` whose markdown starts `[thread:<id>]` to that thread and strips the tag. The
  reply also stays in the pairing chat.

The cleaner form needs a four-line server change, **not made or released**, pending Tom:

- `message`: pass `msg.thread` through as `meta.thread` on the channel notification;
- `reply`: an optional `thread` argument, forwarded as `{type: "reply", markdown, thread}`.

Pairing already reads `msg.thread` first and the tag second, so the server change needs no notebook release.

### 7.5 Limits

- A plain (pairing) thread's messages live in page memory. After a reload the thread cell is there and the
  history is not; robocoop-5 threads keep theirs in `@rc5-threads/<id>`.
- The listener registrations run only where their module computes: robocoop-5 and the switchboard are
  mains in the robocoop-5 notebook, pairing is a main in almost every notebook.
