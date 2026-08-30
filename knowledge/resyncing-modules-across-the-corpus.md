---
scope: [local-development]
triggers:
  - "(^Bash |^|[;&|] )bun +tools/channel/sync-module\.ts"
  - "(^Bash |^|[;&|] )bun +tools/lope-sync\.ts +(pull|push|checkout)( |$)"
  - "(^Bash |^|[;&|] )bun +tools/lope-preflight\.ts"
---

# Resyncing modules across the corpus

A module is embedded in up to 220 notebooks and most copies are old. This is the
procedure for pushing the declared canonical out to those consumers without breaking
them. Measured on the corpus as of 2026-07-26: 221 notebooks, 217 managed modules,
3369 (notebook, module) pairs where the consumer differs from its canonical.

## Direction is declared, never inferred

`modules/canonical.json` is the only fact about which copy is authoritative. Content
hashes carry no ordering, so "this copy differs from 168 others" says nothing about
which is newer. `lope-sync audit` therefore reports drift but cannot report direction.

Before sweeping a module into ~170 notebooks, verify its canonical really is ahead:

```
bun tools/triage/cellwise.ts --all-minority
```

This compares each canonical, and the biggest non-canonical version, per cell against
ObservableHQ. Verdicts that need a human to read the cells are labelled as such —
"canonical differs while the majority matches upstream" is equally consistent with
unpublished local work and with a missed refresh. Both occur here: `at-write`'s
canonical holds unpublished bsky/standard.site work in `_publisher`, and
`blank-notebook`'s holds three local welcome cells. Neither is behind. Acting on the
distance alone would have destroyed both.

Last full triage: 22 minority canonicals, none behind.

## The three ways a resync breaks a notebook

Neither is visible in a source diff, which is why the gate is not optional.

1. **A dependency gap.** A newer module can import a block the target does not embed.
   This is already realised in the corpus: 186 notebooks carry an `editor-5` that
   imports `@tomlarkworthy/modules` without embedding it. The Observable runtime is
   lazy, so an unmet import outside the `bootconf.mains` closure never resolves and
   never throws — the notebook looks fine until something observes the cell.
   `sync-module --all-canonical` skips such targets by default and reports them; `--carry-deps` copies
   the missing blocks from the canonical notebook, the only place they are known
   current. 414 blocks were carried to cover all 3369 pairs; no canonical is itself
   missing a block it declares.

2. **A dependency that is present but too old.** This is the one that actually bit,
   and `--carry-deps` does not cover it: carrying only fills blocks a target LACKS.
   The sweep pushed a newer `observablejs-toolchain`, which imports `acorn_walk_url`,
   into 186 notebooks whose `@tomlarkworthy/acorn-8-11-3` predates that export. Every
   block present, nothing missing, 44 cells failing at runtime in one notebook alone.

   The cause is a module embedded corpus-wide but **not declared in canonical.json**,
   so the sweep never updates it while updating everything that depends on it. 92
   modules are undeclared; the 8 holding more than one version are the dangerous ones,
   and they are all vendored library wrappers (`acorn-8-11-3`,
   `isomorphic-git-1-30-1`, `lightning-fs-4-6-0`, `@mootari/access-runtime`,
   `jszip-3-10-1`, `@mbostock/safe-local-storage`, `escodegen`, `dexie-4`). Before
   sweeping a module, check what it imports is declared too.

   `lope-preflight`'s `missing-export` check exists because of this: it compares each
   generated `v.import("name", …)` against the names the source block `$def`s.

3. **Ordering.** A module's own content blocks must appear *before* its module block.
   Carried attachments are inserted immediately before the anchor, never appended.
   `lope-fix-attachment-order.ts` repairs existing violations; it asserts the byte
   count is unchanged, since the rewrite must be a pure permutation of inert
   `type="text/plain"` blocks.

## Procedure

```
# 0. baseline the corpus (static ~4s; --boot ~60min, reuses bulk-smoke-test-worker.js)
bun tools/lope-preflight.ts --json tools/preflight-baseline.json

# 1. verify direction for anything whose canonical is a minority version
bun tools/triage/cellwise.ts --all-minority

# 2. dry run, read the dependency-gap report
bun tools/channel/sync-module.ts --all-canonical

# 3. apply a batch  (--module/--repo/--limit scope it)
bun tools/channel/sync-module.ts --all-canonical --write --carry-deps

# 4. gate: non-zero exit only for findings that were NOT there before
bun tools/lope-preflight.ts --baseline tools/preflight-baseline.json

# 5. carrying a module in leaves the sibling .json spec incomplete, which blocks
#    the pre-commit hook. --rebuild adds the missing entries (one runtime boot).
bun tools/lope-sync.ts spec-sync --rebuild
```

A clean sheet is not the bar — the corpus carries 265 pre-existing static findings.
The gate is differential.

The sweep lives in `sync-module` rather than in a tool of its own: it is the same
block injection, sourced from `canonical.json` and aimed at every consumer instead of
at hand-listed targets. Unlike single-module mode it defaults to a dry run.

## Result of the 2026-07-26 sweep

3369 pairs updated, 414 blocks carried, every notebook touched. The gate reported 0
new findings and 263 resolved; corpus static findings went 265 -> 2. `lope-sync audit`
went from 116 modules with drifted consumers to 14 (all one notebook another session
was mid-export on) and from 32 minority smells to 0. A repeat run is a no-op.

It also broke 186 notebooks, caught afterwards by the `missing-export` check added in
response (see hazard 2) and fixed by declaring `acorn-8-11-3` canonical and resyncing
it. Corpus `missing-export` findings: 735 before the sweep, 691 after the fix. The two
that dominate what remains are pre-existing and unrelated — `exporter-3`/`module-map`
import `sourceModule` from `observablejs-toolchain` (447) and `claude-code-pairing`
imports `fileSyncTools` from `file-sync` (221); neither source defines the name any
more, and both are latent until those cells are observed.

One thing the sweep exposed rather than caused: two notebooks embed
`@tomlarkworthy/bootloader` twice — the compiled block followed by a raw
Observable-format copy. `contentSync` resolves by id so the first wins and the second
is dead weight, but `blocksIn` was hashing the last, which made audit report all 220
bootloader consumers permanently stale against a block that never runs. `blocksIn`
now takes the first occurrence, matching both the runtime and `extractModuleScriptTag`.
The duplicate blocks themselves are still there; preflight reports them as `duplicate`.

## Swapping the frame (lopepage -> lopepage-2)

`sync-module --modernize-frame` is a resync of a different kind: it changes which
modules boot, not just what a block contains.

```
bun tools/channel/sync-module.ts --modernize-frame          # dry run
bun tools/channel/sync-module.ts --modernize-frame --write
```

Per notebook it rewrites only the `"mains"` array of the last parseable
`bootconf.json` block (`lopepage` -> `lopepage-2`, `save-in-place` appended),
installs the two frame modules if absent, and **deletes the old lopepage block**.
The deletion is the part that is easy to get wrong: dropping a module from `mains`
does not stop it running, because module discovery instantiates every module
`<script>` in the DOM. A lopepage block left behind boots a competing GoldenLayout
overlay on top of lopepage-2.

Layout hashes are left alone — lopepage-2 parses the same `R`/`C`/`S` DSL,
recursively, so `R100(S70(x),C30(S50(y),S50(z)))` renders unchanged. (What it does
reject is a stack containing a group, `S(S(),S())`; nothing in the corpus had one.)

Two skips, both mandatory:

- **The module's own canonical notebook.** Deleting the block there destroys the
  module, and the notebook cannot host both frames at once. Caught the hard way —
  the first run emptied `@tomlarkworthy_lopepage.html`, which the next
  `--all-canonical` dry run reported as "canonical has no block".
- **Notebooks where a surviving module still imports lopepage** (`jumpgate` does, in
  two notebooks). Deleting the block there creates a `missing-import`.

The 2026-07-26 run modernised 191 notebooks. `lope-preflight` reported 0 new
findings: every notebook already carried lopepage-2's dependency closure
(`modules`, `visualizer`, `themes`, `runtime-sdk`, `plugin-registry`,
`command-palette`, `claude-code-pairing`, `local-change-history`, `editor-5`) from
the earlier resync sweep, so no `--carry-deps` pass was needed.

Static checks cannot see a frame regression, so sample-boot a handful in a browser
across the layout variants (plain `S`, `R`+`S`, nested `C`, one with file
attachments). Run them **one at a time** — several headless Chromiums loading 2 MB
notebooks concurrently produce screenshot timeouts that look exactly like a wedged
renderer, and a 30-minute A/B chasing one is 30 minutes wasted.

## Switching the theme

The theme is **not** a `bootconf` field. `sync-module --set-theme <name>` switches it
in the three places it is actually baked:

1. The bootloader's `importShim(...css)` list and `document.adoptedStyleSheets`.
2. The `<script id="<url>" data-mime="text/css">` blocks holding those bytes. Nothing
   is fetched at boot, so a URL with no matching block is a silently blank stylesheet.
3. The sibling `.json` spec's `bootconf.theme` — `lope-jumpgate` reads it to pick the
   theme on the next export, so skipping it means the next jumpgate reverts the switch.

A theme is a triple: `theme-X.css` + `abstract-{light,dark}.css` +
`syntax-{light,dark}.css`. Going from a light theme to a dark one swaps all three, so
the target list and its bytes are copied from a **donor notebook already on that
theme** rather than reconstructed from a table — the donor is known to boot.

The other five stylesheets (`global`, `inspector`, `highlight`, `plot`, `index`) and
`file://syntax.css` are theme-independent and byte-identical across themes.

A fourth place exists but is rare: three notebooks ship a baked prerender snapshot
(`<style id="lope-prerender-style">` plus a copy inside the shadow root), holding the
concatenated theme CSS — `themeCss` in exporter-3, the style block contents joined by
`\n` in bootloader order. `--set-theme` rebuilds it. `prerender: true` in bootconf is
a flag for the *next* export, not evidence a snapshot is already baked; check for a
`lope-prerender-style` occurrence that is not the `${ themeCss }` template inside the
exporter-3 module source.

The 2026-07-26 run moved 209 notebooks (207 parchment, 2 near-midnight) to
`ocean-floor` and updated 202 specs; `lope-preflight` reported 0 new findings.

## Cost

The sweep rewrites a block in every one of the 221 notebooks, ~652 MB of new git
blobs. The two submodule object stores are already 3.3 GB and 9.3 GB over 1410
commits (~9 MB/commit), so this is roughly 70 commits' worth of ordinary churn.

## What the static checks catch

`lope-preflight.ts`, browserless, whole corpus in ~4s:

| check | meaning |
|---|---|
| `syntax` | a module block does not parse as ESM |
| `missing-import` | `main.define("module @x/y")` with no embedded `@x/y` block |
| `missing-attachment` | a loader-map name with no matching block |
| `missing-export` | an imported symbol the source block does not define |
| `attachment-after-module` | a module's content block emitted after the module |
| `missing-main` | a `bootconf.mains` entry that is not embedded |
| `duplicate` | a repeated block id |

Findings outside the `bootconf.mains` closure get a `-lazy` suffix: real, worth fixing,
but not a boot regression, so they do not gate.

Two exclusions matter, both false-positive sources found the hard way:
`data-encoding="base64+gzip"` blocks hold encoded bytes rather than source, and
`main.define("module 1")` / `"module d/<hex>@n"` / `"module ${m}"` are Observable
document-id imports and exporter codegen inside string literals, not block ids.

## The `--boot` layer is differential only

`--boot` really instantiates each notebook in node and runs its in-notebook tests. It
catches what static analysis cannot, but its absolute signal is not clean: notebooks
embedding the toolchain tests report `Module status must not be unlinked or linking`
under the node harness on git-clean files that nobody has touched. Compare against a
boot baseline; never read a raw `--boot` count as breakage.
