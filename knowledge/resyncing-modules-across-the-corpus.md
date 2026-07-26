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

## The two ways a resync breaks a notebook

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

2. **Ordering.** A module's own content blocks must appear *before* its module block.
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

One thing the sweep exposed rather than caused: two notebooks embed
`@tomlarkworthy/bootloader` twice — the compiled block followed by a raw
Observable-format copy. `contentSync` resolves by id so the first wins and the second
is dead weight, but `blocksIn` was hashing the last, which made audit report all 220
bootloader consumers permanently stale against a block that never runs. `blocksIn`
now takes the first occurrence, matching both the runtime and `extractModuleScriptTag`.
The duplicate blocks themselves are still there; preflight reports them as `duplicate`.

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
