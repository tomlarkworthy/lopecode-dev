# Lopecode News Issue #2 — resource dossier

Working file for `@tomlarkworthy/lopecode-newsletter-002`. Assembled 2026-08-14, **restructured the
same day** on Tom's direction (below). Skeleton: `lopebooks/notebooks/@tomlarkworthy_lopecode-newsletter-002.html`.

**Window.** Issue #1 was first committed `lopebooks b98e05ee` on **2026-05-22**; its last content
edit is `8592220f` on **2026-08-09** (a corpus resync, not new prose). Issue #2 covers **2026-05-22 →
2026-08-14**, ~12 weeks.

## Editorial direction (Tom, 2026-08-14)

Verbatim, because the first draft was ordered by commit weight and that was the wrong axis:

> the bigger deal is annotate, svg-lens and the fact we have a plugin repository so we have the
> burger menu and swapped to lopepage-2. Also huge progress on SEO and async loading so we can
> support large notebooks, of which, the caged code and optical tracking are examples of. I would
> not mention linux-emu. Oh the big blog was live-2026 positioning lopecode as being source-last,
> which is what sticky, grid container, and annotate all exploit. Its a paradigm shift for how I
> think about permanence. save-in-place is massive. I still prefer using claude code locally but the
> plugin has been published!

Consequences applied to the skeleton:

- **The spine is source-last**, from the LIVE 2026 blog — not a changelog.
- **Dropped entirely: linux-emu / claude-emu.** The RISC-V emulator work is out. (It was also the
  weakest item to link — the saved artifact is 50.5MB, gitignored, and the original fork was deleted.)
- Caged Code and optical tracking are **demoted to examples** of the large-notebook capability, not
  headline features.
- save-in-place promoted to its own section.
- robocoop-5 kept but demoted, under "Agents" beside the published plugin.

**Epistemic status.** Filenames, commit hashes, URLs and counts were re-derived today from `git log`
and `bun tools/lope-reader.ts`. The *measurements* are quoted from the session records written when
the work was done — **not re-measured for this newsletter**. Re-run or attribute before publishing.

## The spine: source-last

`lopebooks/notebooks/@tomlarkworthy_lopecode-live-2026.html`, module
`@tomlarkworthy/lopecode-live-2026`. Its H1 is literally **"Source-last programming"**. Extract with
`bun tools/lope-reader.ts <file> --get-module @tomlarkworthy/lopecode-live-2026`.

The abstract, quotable as-is:

> Most existing programming systems are format-first: a canonical saved representation — `.ipynb`,
> an image dump, a document schema that the system loads. Lopecode is *source-last*: there is no
> external source code or canonical serialized representation; the only canonical representation is
> the live executing system. When source code is needed, functions are decompiled on demand starting
> from `Function.prototype.toString()`. Serialization becomes a projection to one of many formats: a
> standalone HTML file, a JavaScript IIFE or an ATProto PDS.

Two things in that paper the newsletter should carry:

- Cell `s2p1` already names the editing surfaces that coexist *because* the runtime is canonical:
  editor-5 (source), editable-md (prose), sticky ("a higher order UI lens that transforms user
  manipulations into function updates"). That is the bridge to the modules below.
- The paper states its own limit: **"No closures means not general JavaScript."** `toString()` cannot
  capture a closure environment, so source-last recovery is a property of the closure-free cell shape
  the Observable Runtime encourages, not of the language. Keep this — it is what makes the claim
  falsifiable rather than a slogan.
- Three field episodes are already written (CSV tool into a locked-down corporate environment;
  liberating a program from a notebook SaaS; freezing an AI music jam into a shareable document).
  Reuse one; retelling all three duplicates the paper.

**Unresolved:** the submission's status is not recorded anywhere I can check. Do not imply acceptance.

## The second pillar: lenses

**Missed in the first two passes, and actively mis-stated** — the first dossier said "verify before
claiming invertibility". It was already measured. Correcting that here.

Source-last says the runtime is canonical. **Lenses** are what make it liveable: every editing
surface is a lawful bidirectional view onto the runtime, not a one-way renderer. `get` and `put`
obeying the lens laws.

The framing is stated in `knowledge/svg-editor-architecture.md`, which is human-authored — the doc
opens by calling svg-lens "lawful lenses, one gesture, one attribute" and §3 lays out the layering:

```
L2  lens algebra   element / children / attr / microsyntax   (svg-source)
L0  substrate      cell source <-> literal (acorn spans)     (js-source-lens)
    lens core      lens / compose / iso / laws               (~60 lines, generic)
```

**Do not write those as modules.** §3 is headed *"Proposed layering"* and carries an explicit
decision, 2026-07-21: *"Not split into separate modules … The layering below is real and holds at the
cell level, but svg-lens ships as one self-contained artifact."* None of `@tomlarkworthy/lens`,
`js-source-lens` or `svg-source` is declared in `modules/canonical.json` — I checked. It is a
structure inside a 1450-line module, not a set of packages. The newsletter cell was corrected after
first stating this wrongly.

The observation that survives: the source-lens layer "is not SVG-specific at all — the same primitive
lenses a markdown, CSS or JSON editor would need". And the discipline the doc names: **tools emit
commands, commands are lens puts, one writer.**

Surfaces that are the same idea: svg-lens (drawing ↔ `svg` literal), sticky (value ↔ literal),
editable-md (prose ↔ cell), and the compiler (source ↔ `_definition`).

### The compiler is the measured case

`@tomlarkworthy/observablejs-toolchain`, 2026-07-18 (`project_toolchain_decompile_source_preserving`),
merged 2026-07-23 (`project_toolchain_escodegen_removal`, lopecode#203 → `51b1ac8`).

Both directions were rewritten from **escodegen regeneration** to **source-slicing**: parse with
acorn (`ranges: true`), slice the original text verbatim, and splice only what must change (right-to-
left range splices, never `replaceAll`). `decompile` first, then `observableToJs` for the compile
direction.

```
decompile ∘ compile   exact fixpoint, 1789 / 1789 non-import cells   (0 drift)
sweep                 2244 real cells, 0 decompile errors, 0 recompile errors
exotic battery        28 / 29 byte-identical
```

The 457 apparent "drifts" are all import-bridge cells (`import {x} from …` ↔ `runtime.module`), a
separate construction, excluded deliberately. The single genuine non-identity: a leading comment on
an *expression* cell is dropped **by compile**, because Observable's cell model has nowhere to store
it — unrecoverable, not a codegen bug. Print that; it is the honest limit.

Consequences worth a line each: escodegen is gone from the toolchain **and** exporter-3, removing
`escodegen.browser.min.js.gz` (~44KB) from every bundle and stopping 24 module blocks being
reformatted on every export. Class of bugs killed at the root: the ASI break (`return` + comment →
`return;`), param-name corruption inside string literals, quote/whitespace drift.

**Why this matters to the spine, not just to tidiness:** source-last recovers source by decompiling
the live runtime. If that recovery is not faithful, the claim is weaker. This is the measurement that
backs it.

Numbers are dated 2026-07-18 and have not been re-run.

## What exploits source-last

The claim to make: if the runtime is canonical, an edit does not have to be a source edit — it only
has to end up in the runtime.

| module | what it turns into a cell | record |
|---|---|---|
| `annotate` | a margin note | `project_annotate_module` |
| `sticky` | a knob you turned | `project_lope_daw_sticky` |
| `grid-container` | where you dragged a widget | `project_snap_grid_notebook` |
| `save-in-place` | all of it, back into the file | `project_lopepage2_menu_plugins` |

### annotate

`lopebooks/notebooks/@tomlarkworthy_annotate.html`, built 2026-07-27, renamed from annotate-2 on
2026-08-01. Design: `plan/annotate-design.md`. Suite `tools/test-annotate.js`, 130/130.

- An annotation is a variable `annotation_<id>` **in the module it annotates**, and its note is its
  own editable-md cell. No separate storage layer — local-change-history, save-in-place and export
  all handle it because it is code.
- Anchors are stored in each surface's own units and converted to screen at paint time: text is a
  `{prefix, exact, suffix}` quote re-found in the rendered text; SVG is user-space coordinates via
  `getScreenCTM().inverse()`. So a note survives reflow.
- **Cost, and it belongs beside the feature:** the text layer re-walks the document on every DOM
  mutation — measured at **23ms/frame** on an animating page, more than the coded-landmark detector
  it was running next to (`project_annotate_costs_25ms_per_animated_frame`).
- The notebook ships its own six annotations as documentation. Screenshot material.

### save-in-place

`lopecode/notebooks/@tomlarkworthy_save-in-place.html` — new in this window.

- Writes through the File System Access API to the notebook's own file, not a download. The
  `FileSystemFileHandle` is persisted in IndexedDB keyed by notebook path, so the second save needs
  no picker.
- Bakes the current `view=` as the boot hash but **strips volatile params** (`cc`, `open`, `close`,
  `filesync`) so a pairing token never lands in a saved file.
- First module written against the burger-menu plugin API rather than into lopepage-2 (lopecode
  `8706684`).
- Limits, adjacent: Chromium, secure context. And an edit in a tab that is never saved is still lost.

### sticky and grid-container

`project_lope_daw_sticky`, built 2026-07-13, renamed from snap-grid/lope-daw the same day.

- `sticky(view, remembered)` parses its own `_definition` with acorn, splices only the literal's byte
  span, and swaps `_definition` **silently**. Inputs unchanged → no `define()`, no recompute, no
  remount, no focus loss, no audio glitch.
- Known gap, WONTFIX per Tom 2026-07-19: a silent swap is invisible to local-change-history until the
  next variables-set churn, so knob-turn-then-reload loses the change. save-in-place is the answer.
- `grid-container` does the same for arrangement — named cells as atoms on a snap-to-grid surface,
  the layout written back into its own source.
- The DAW is the worked example; the jam is preserved as literals in the patch, not a session file.

## svg-lens

155 commits, the largest single line of work. `lopebooks/notebooks/tomlarkworthy_svg-lens.html`
(note: no leading `@` — renamed, see `project_notebook_at_rename_404_shim`).

- Written as an interactive paper in one self-contained module (`project_svg_lens_paper`).
- Capability-parity backlog §9.5 **closed 2026-07-29**; only text-on-path creation deferred.
- Gradients/`defs`/markers G1–G6 shipped 2026-07-24. `mutableSvg` is "editable-md, for SVG"
  (lopebooks 2026-07-30).
- Architecture doc is human-authored: `knowledge/svg-editor-architecture.md` — the three write-back
  sinks and the T-laws. Source for one paragraph on why bidirectional editing is hard. Do not
  summarise it whole.
- It belongs under source-last: a canvas drag lands in the `svg` template literal that produced the
  drawing.
- Hero-interactive candidate: the animated Lopecode-disk boot scene (lopebooks 2026-07-26).

## Plugin registry → burger menu → lopepage-2

`project_plugin_registry_notebook`, `project_lopepage2_menu_plugins`,
`project_lopepage2_immortal_panes`.

- API is deliberately minimal: `createPlugins()` → `{add, get, listenerCount}`; `plugins` maps a name
  to a Set. A richer design (ids, predicates, `registerPlugin`, …) was written and **rejected**
  2026-07-06 — "we are just synchronizing named sets". Worth reporting as a design decision.
- Cross-module import reaches the **same live bus** because lopecode dedupes modules by URL. That is
  the mechanism lopepage-2 already relied on, generalised from "N providers → 1 hardwired consumer"
  to N↔M.
- Consumers: lopepage-2's burger menu (`lp2_registerMenuItem`, upsert-by-id, returns a disposer),
  command-palette (CMD+K). First external provider: save-in-place.
- Constraint to state: a plugin must be **booted** — in `bootconf.mains` — for its registration cell
  to be reachable. Being in the file is not enough (`feedback_dormant_module_blocks_need_lazy_boot`).
- lopepage-2 itself: panes that own their DOM and survive relayout, scroll anchored by persistent id,
  replacing GoldenLayout.

## Getting started — quick_start

**Missed in the first two passes. See "How the first pass under-counted" below.**

`lopecode/notebooks/quick_start.html` and `lopebooks/notebooks/quick_start.html`; module id is still
`@tomlarkworthy/blank-notebook` (the file was renamed 2026-08-04, the module id was not — 8 notebooks
embed it). Record: `project_blank_notebook_template_gallery`.

**54 quick_start + 40 blank-notebook = 94 commits** across the repos, third-largest line of work in
the window after svg-lens (156) and robocoop-4 (147). It is the direct answer to issue #1's *"Further
investment in UX is needed. Especially around adding cells, getting started and managing bundles."*

- The launcher carries every module (3.72MB) and hands out slim starters. Landing page is a
  **type × module matrix chooser** (2026-08-04): template on one axis, modules to tick on the other.
- `spawnNotebook({template, name, title, modules})`: `new Runtime()` → `importShim` each chosen
  module into it → compile the template's cells with the real toolchain `compile` and define them
  onto a fresh module → `exportToHTML` → Blob → download.
- **Subsetting `mains` alone shrinks nothing.** exporter-3 derives blocks from the runtime it is
  handed, so the saving comes from the *fresh runtime*, not the mains list. Forks land at **72–74%**
  of the launcher (2.67–2.73MB, 73–74 blocks).
- Templates: blog post, data visualisation, UI (grid-container). Per template: `modules` (hard
  requirements → mains), `suggest` (pre-ticked), `imports`, `optionalImports`.
- Per-module tutorials "in the medium that fits it" with a table of contents (2026-08-07/08); the
  guide teaches the editor and the reactive model and what to do when a cell fails (2026-08-04).
- Honest detail worth publishing: the modules the chooser hands out had to be **declared in
  `bootconf.mains`**, because a dormant block does not survive a save — `save-in-place` exports by
  walking mains through imports, so a block reachable from neither is silently dropped. Saving the
  launcher once produced a chooser offering modules the file no longer carried
  (`feedback_dormant_module_blocks_need_lazy_boot`, abandoned 2026-08-06).
- Layout rule learned by looking: content cells first, plumbing last — import bridges and
  `thisModule()` render as visible cells.

Related but separate: `@tomlarkworthy_getting-started.html` (2026-07-14) is a curated demo notebook —
13 mains, robocoop-5 plus 7 creative modules. `project_getting_started_demo` says it was never
committed or pushed. **Check its status before mentioning it.**

## Big notebooks: async loading

The measurements, each from its commit:

```
coded-landmark-tracking (15.1MB) cold mount  10.7s -> 8.7s   lazy payload to the tail (2026-08-13)
                                              8.7s -> 4.8s   lazy data-module import (2026-08-13)
exporter-3 v17222 block end marker            boot starts at 0.90MB, not 14.66MB; stream 1.70MB/s
moduleMap / cellMap                           all 51 modules known 3.4s into a 15.4s stream
```

- **The block marker is the mechanism worth explaining.** exporter-3 v17222 (2026-08-13) closes every
  emitted block with `</scr`+`ipt><!--/-->`; the loader scans for that comment node. The old test was
  `el.nextSibling != null`, and a still-streaming block is the last child of `<body>`, so anything
  boot appended became its `nextSibling` — half-streamed blocks were called complete and failed to
  parse. Raw evidence in `project_exporter3_streaming_block_marker`:
  ```
  825ms  @tomlarkworthy/annotate  read=36990  final=97815  sib=DIV.lp2-menu
  ```
  Rejected alternatives are recorded there too: `data-len` works but makes the HTML no longer
  hand-editable (Tom rejected); a `<div id="lope-blocks">` container took boot from 783ms to 8969ms.
- `lp2_bootDormant` loads a module on demand: ~10ms from a block already in the file (svg-lens is
  521KB), ~1s from Observable if the file never carried it. That is what makes "open any module by
  name" work.
- Lazy cells reserve height from a localStorage-learned measurement so a long page does not jump on
  the second visit (2026-08-08, released 2026-08-12).

## Big notebooks: SEO

```
virtual-monorepo   raw-source prose            0 -> 42,413 chars   (light-DOM prerender + hoist)
svg-lens           Googlebot UA, t=3s          78,643 chars of body text
lopebooks indexed  before sitemaps             4 of 180
sitemaps built     2026-08-14                  181 lopebooks urls + 51 lopecode urls
```

- **The prerender was never the problem** — verified with headless Chromium on a Googlebot UA. Don't
  re-debug it (`project_notebook_seo_discoverability`).
- The 2026-08-04 change that mattered: the snapshot moved from Declarative Shadow DOM to light DOM
  with a script that hoists it into a shadow root before boot. Under DSD the text sat inside
  `<template>` and a raw-HTML read of a 4MB notebook yielded **0 chars**.
- The natural experiment says the only discriminator was **how old the README link is** — not page
  weight (2.5–6.7MB pages all indexed) and not gallery membership (linux-sbc is indexed with no
  `content.json` entry).
- Sitemaps required the root site (`tomlarkworthy.github.io`, branch **master**) to become a
  submodule, because `robots.txt` is only read at the domain root. `encodeURI`, never
  `encodeURIComponent` — filenames start with `@` and `%40` would be a distinct URL to Google,
  splitting ranking signal off the four pages that already rank.
- **Report the outcome, not the intervention.** The sitemaps are one day old and have proved nothing
  yet. Re-check the index count before publishing.

### Example: Caged Code

`lopebooks/notebooks/Caged_Code.html`, module `@tomlarkworthy/claude-code-browser` (2026-08-12).

- The frame's fetch interceptor **answers `http://notebook.local/mcp`**, so the in-page Claude Code
  pairs with its host notebook with no channel server, port or `cc=` token. `/mcp` connected in 24ms
  (`project_in_page_mcp_pairing`).
- `/local-disk` maps a real folder into the session, read and write, via the File System Access API —
  the same capability save-in-place uses (`project_local_disk_mount`).
- Glob and Grep are ripgrep **subprocesses** in `cli.js`, so they were dead until `rg` was
  reimplemented in JS (`project_caged_code_ripgrep_shim`).
- Phone typing and image paste landed 2026-08-14.

### Example: optical tracking

`lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html` (15.1MB — the file the loading work
was measured against) and `lopebooks/notebooks/tomlarkworthy_flat-trace.html`.

```
detector        220ms -> 33ms per frame        (2026-08-01)
worker pool     2.38x, output identical to 4dp
AssemblyScript  2.06x on stage 1, shipped in-notebook
WebGPU          rejected — edge finding is 4.5% of stage 1, the branchy cascade is 95%
glass-to-glass  144ms
flat-trace      0.17mm median outline, in simulation
```

Pick one. The rejected WebGPU experiment is a better story than any of the speedups.

## Agents

### The plugin is published

`@lopecode/channel` **0.4.0**, tag `v0.4.0` in `tomlarkworthy/lopecode-plugin` (public, created
2026-08-03). That repo is simultaneously the marketplace (`lopecode-plugins`) and the plugin, and
releases itself on a `v*` tag.

```
claude mcp add lopecode -- npx -y @lopecode/channel       # tools only, one line, no plugin
/plugin marketplace add tomlarkworthy/lopecode-plugin     # plus inbound push
/plugin install lopecode-channel@lopecode-plugins
```

- The design point: MCP **tools** never needed a plugin. Only **inbound push** (notebook chat,
  `variable_update`, `cell_change`) is gated, behind an allowlist Claude Code controls. Splitting the
  two is what made a one-line install possible (`project_channel_node_build_and_allowlist`).
- Tom's own verdict, to state plainly: **he still prefers running Claude Code locally.** Publishing
  was so others can try it.

### robocoop-5

`lopebooks/notebooks/@tomlarkworthy_robocoop-5.html`. Bash-less successor to robocoop-4.

```
HumanEval-JS (MultiPL-E) pass@1   0.963  vs raw 0.932
aider-polyglot JS                 0.776  vs raw 0.735   (v1 prompt was 0.633)
tau-bench retail                  0.791  vs raw 0.791   (exact tie after the yield fix, -6.1pp)
```

The claim is that the notebook's scaffolding beats the raw model on two of three. **Name the model** —
all three rows are one family and a reader will assume otherwise. Method: `knowledge/training-robocoop-5.md`.

## Pairing a phone

Tom flagged this as "quite interesting workflow" — record `project_pairing_a_phone_via_adb_reverse`,
working 2026-08-03. Tool: `tools/phone-cdp.ts`.

The pairing module dials `ws://` + a hardcoded `127.0.0.1` + the port encoded in the token. From a
phone that is the phone's own loopback, which is why it was written off as unreachable.
`adb reverse tcp:P tcp:P` inverts exactly that — the **phone's** 127.0.0.1 forwards to the Mac's — so
the hardcoded address becomes the right address and **the notebook needs no change**. The phone then
appears on the channel like any local tab: `eval_code`, `define_cell`, `watch_variable`.

- Mixed content is not a problem: Chrome treats loopback as potentially trustworthy, so `ws://` from
  an https page is not blocked. Verified, not assumed.
- **Both parts are required**: the pairing module in the *layout* and `cc=` in the hash. It is a lazy
  dependency of lopepage-2, so `cc=` alone never boots it and nothing reads the token.
- The port is the one stamped into the token (`LOPE-<port>-XXXX`), not a config value —
  `cc_config`'s 8787 is only a token-less fallback, so tunnelling 8787 does nothing.
- Running it from inside the metadev sandbox needed USB grants (`tools/safehouse-adb.sb`);
  `iokit-open` was deny-by-default.

**The two payoffs are the newsletter material, not the recipe:**
- flat-trace ran on a real phone (Nord 2T, 2026-08-09) and the camera path could be measured from the
  desk: 7.75fps, and **113 of the 127ms frame period was a fixed sleep plus a slow-path frame grab** —
  the mark detector was not the bottleneck (`project_flat_trace_phone_frame_budget`).
- 2026-08-10: eleven calibration frames existed **only in a live tab's memory** on the phone (`shots`
  is not persisted) and were pulled off the device over adb+CDP into a local receiver. A tab is not
  storage, but it is reachable.

## Shorter items

- **Notebook 2.0 syntax** — `knowledge/js-toolchain-notebook-kit-2-cells.md`,
  `knowledge/diagnosing-new-observable-platform-differences.md` and the `newobs-*` probes. (The
  compiler rewrite itself is under Lenses above — it is not a footnote.)
- **compile-dataflow** — compiles a runtime subgraph into a plain function; `instantiateDataflow`
  measured 21 primary vars/events per editor-5 panel open → 0. It does **not** replace the heavy
  editor panel, only the cell shell. Record the boundary.
- **ATProto** — `at-write` already implements standard.site + versioning; `specs/atproto.md` is stale,
  write from the code (`project_atproto_stdsite_already_built`).
- **Corpus tooling** — 231 modules (`modules/canonical.json`), `lope-sync.ts`, browserless
  `lope-preflight.ts`. The honest sentence: content hashes carry no ordering, so an audit reports
  drift but cannot report direction.

## Deliberately out

- **linux-emu / claude-emu** — Tom's call. (Also: 50.5MB, gitignored, original fork unrecoverable.)
- daw as its own section — it is the worked example under sticky/grid-container instead.
- markdown-wiki, justbash, belief-state-geometry, aws-dashboard, assembly_script — supporting or
  one-off; at most a line each.
- The commit-velocity chart is in the skeleton as an appendix with a decision marker on it. Issue #1
  had one; a second only says "I was busy".

## How the first pass under-counted, and the corrected sweep

Recorded because the same mistake is easy to repeat on issue #3.

**What went wrong.** Three compounding errors, none of them a shortage of data:

1. **I counted one repo and truncated the table.** The ranking came from
   `git log --format=%s | sed 's/:.*//' | sort | uniq -c | sort -rn | head -60` run on
   `lopecode-dev` alone, then on `lopebooks` alone, each truncated. quick_start read as 14 and
   blank-notebook as 12. Summed across all three repos with no cut they are **54 and 40** — 94
   together, ahead of daw (67) and coded-landmark (50).
2. **I selected by "has a memory record with a measurement in it."** That axis systematically favours
   perf and algorithm work, which carries numbers, and hides UX and onboarding work, which does not.
   quick_start's record exists and is detailed; it just has no millisecond in it.
3. **I never asked the question the newsletter answers** — *what can a reader do now that they could
   not in May* — which is exactly where onboarding lives. Ranking by commit weight answers "what did
   I spend time on", which is a different question and the wrong one for a reader.

**The corrected sweep** (all three repos, no truncation, `Bump*` folded):

```
156 svg-lens        67 daw               18 flat-trace       14 Caged Code
147 robocoop-4      54 quick_start       18 annotate         13 grid-container
104 Bump*           50 coded-landmark    16 robocoop-5       13 file-sync
                    40 blank-notebook    16 lopepage-2        8 lopeteam
                    24 claude-emu        16 exporter-3        8 runtime-sdk
                                         14 editor-5          6 lopecode-tour
```

**Surfaced by the sweep and still not in the skeleton** — deliberate, but they are Tom's call, not
mine: `editor-5` (14 — hotbar drag-reorder, the self-import hang), `file-sync` (13 — bidirectional
disassembly, already covered in issue #1), `lopecode-tour` (6), `lopeteam` (8 — an internal agent
skill, not user-facing), `local-change-history` (4), `cell-map` (4), `phone-cdp` (4 — pairing a
phone over `adb reverse`), `rmbt` (6), `visualizer` (3).

## Open questions for Tom

1. LIVE 2026 status — is it submitted, accepted, or in review? The skeleton says nothing.
2. Hero interactive: svg-lens boot scene, a coded-landmark camera demo, or the daw? Issue #1 opened
   with the robot arm.
3. ~~Known defect that shows on any notebook booting `claude-code-pairing`:
   `RuntimeError: fileSyncTools is not defined` — the cell it imports exists in no copy, canonical or
   upstream. Fix before publishing, or link around it?~~ **Resolved 2026-08-17.** Pairing now
   declares `setup_file_sync` through `@tomlarkworthy/plugin-registry` instead of importing a name
   file-sync never defined; swept to all 232 notebooks and pushed to Observable (pairing 1889).
   Nothing to link around.

## Skeleton build notes

- Base: copy of issue #1's HTML. `annotate` + `annotate-data` synced in from their canonical (only 2
  of annotate's 28-module closure were missing); issue #1's own module block and its `sample.pdf`
  stripped as orphans.
- `bootconf.mains` = newsletter-002, editable-md, annotate, annotate-data, lopepage-2, save-in-place,
  at-login, at-write, parametric-svg. Hash `#view=S100(@tomlarkworthy/lopecode-newsletter-002)`, no
  `cc=` token baked in.
- Verified: boots with zero page and runtime errors; preflight reports the same three pre-existing
  findings as its base and nothing new.
- One inherited oddity: an aborted request to `notebookwebhook.mov` from `@tomlarkworthy/flow-queue`'s
  own doc cell. Harmless, not introduced here.
