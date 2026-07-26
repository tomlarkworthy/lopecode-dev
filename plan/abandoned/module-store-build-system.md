# ABANDONED — module store + build system

**Status: abandoned 2026-07-25. `lope-build.ts` / `lope-modules.ts` deleted. Replaced by `tools/lope-sync.ts`.**

Only the extractor half was ever run — once, in commit `e6a8bc5` — which bulk-added 190
module `.js` files that then froze and drifted. `lope-build --all` was never run.

## Why it was abandoned

1. **The store was a second source of truth that nothing kept fresh.** Notebooks are
   rewritten by save-in-place from the browser; the store had no way to learn about that.
   Measured 2026-07-25: 19 of 186 store files diverged from their home notebook, in *both*
   directions (10 store-newer, 8 notebook-newer). No rule decided which won, so either
   could silently clobber the other.

2. **Canonical was inferred from the filename and silently wrong.** `lope-modules.ts`
   derived a module id via `file.replace("_","/")`, which never produces the leading `@`.
   For `tomlarkworthy_svg-lens.html` (a jumpgate artifact that lost its `@` prefix) home
   detection failed and the module fell through to the mode fallback — the most-common copy
   across notebooks. 66 of 252 modules were elected that way.

3. **A popularity vote enshrines staleness.** `@tomlarkworthy/summarizejs` had 185 of 218
   copies missing a `cloneNode` fix. Any mode-based election picks the broken version and
   calls it canonical.

4. **One canonical per module, with no repo dimension.** 24 modules are legitimately
   canonical in *both* repos (lopebooks = staging, lopecode = published). The store
   collapsed that promotion pipeline into a single winner.

## What replaced it

`tools/lope-sync.ts`. The governing rule is that **nothing derivable is stored**: the module
index is re-derived from notebook HTML on every run (218 notebooks, ~10k blocks, ~1.0s), so
no writer can desynchronise it. A persisted hash would be silently invalidated by
save-in-place, which writes through a `FileSystemFileHandle` and cannot update a sibling
file — it would report "clean" while being wrong.

Only two non-derivable facts are stored: `modules/canonical.json` (which notebook is a
module's source, per repo — declared, never inferred; committed) and `modules/.sync.json`
(what a working copy was checked out from, and its base sha — session state; gitignored).
`sync-module` enforces both on the write path.

Original design retained below for history.

---

## Original design

Turns shared `@tomlarkworthy/*` module source into a canonical root-level store and makes
notebook HTML a build output, so a notebook can be rebuilt when a dependency changes.

## Layout

```
/modules/@tomlarkworthy/<name>.js   canonical module body (one per module)
/modules/index.json                 {module: {canonicalFrom, source, hash, versions, consumers}}
/modules/SKEW-REPORT.md             drift report
```

Scope (decided): first-party `@tomlarkworthy/*` only. Third-party (`@d3`, `@bumbeishvili`,
`@observablehq/*`) stay embedded in notebooks as-is. Store lives at repo root, outside both
submodules.

## Tools

- `bun tools/lope-modules.ts [--write]` — extract canonical store from the notebooks.
  Canonical per module = its HOME notebook copy (`@author_<name>.html`, where it is the main);
  fallback to most-common embedded copy (mode) for orphans. Dry-run by default.
- `bun tools/lope-build.ts <nb.html> [--dry-run]` — rebuild one notebook: re-inject each
  embedded `@tomlarkworthy/*` block from the store. Update-only (never adds a module a notebook
  doesn't already reference); leaves third-party blocks, bootloader, bootconf, theme untouched.
  - `--module @tomlarkworthy/x` — rebuild every notebook embedding x (reverse dep).
  - `--all` — rebuild all. `--watch` — watch `/modules/`, rebuild affected on change.
  - `--dry-run` exits 1 if anything would change → CI gate.

Both reuse `tools/channel/sync-module.ts`'s block helpers (now exported:
`extractModuleScriptTag`, `extractModuleContent`, `buildScriptBlock`, `inject`; CLI guarded by
`import.meta.main`). One block-handling implementation, shared.

## Findings that shaped this

- **Spec `hash` is NOT a content hash.** A notebook `.json`'s per-module `hash` does not reflect
  the embedded source bytes — `editor-5` showed 13 distinct spec-hashes but is byte-identical
  across all 203 notebooks. Skew detection must hash actual `<script>` content, never the spec
  field. (Applies to lopeyard's `sync-skew` check too.)
- **Compiled cell IDs are deterministic.** Identical Observable source compiles to identical
  bytes (incl. generated `_<id>` cell names) — proven by editor-5 = 1 byte-version across 203
  notebooks. So byte-level content comparison is a valid drift signal.
- **Exporter block format** (must be matched byte-exact for idempotent rebuilds):
  `<script id="ID" \n  type="text/plain"\n  data-mime="application/javascript"\n>\n<content></script>`
  — note the trailing SPACE after the id quote, newline after `>`, and NO newline before
  `</script>`. `buildScriptBlock` was fixed to emit this (it previously dropped the space and
  added a trailing newline → every re-sync produced a spurious full-block diff; this also
  silently affected `sync-module`'s `.js`-source path).

## Real drift (content-md5, the accurate measure)

48 of 223 modules are skewed. Worst stale-copy counts: `themes` (199), `exporter-3` (195),
`observablejs-toolchain` (195), `cells-to-clipboard` (189), `stream-operators` (189). Run
`tools/lope-modules.ts` to regenerate `SKEW-REPORT.md`.

## Status

Walking skeleton proven end-to-end: extract → store (223 modules) → build one notebook →
byte-exact for unchanged, only real drift flagged (editor-5 home: 5 stale deps / 36 clean) →
notebook still parses → restored. Not yet run repo-wide (`--all` would rewrite ~200 notebooks —
a deliberate, reviewable step).

## Next

- `lope-build --all` to canonicalize the whole repo (big but reviewable diff; one-time
  normalization to the canonical block format).
- Wire `lope-build --dry-run --all` as a CI gate (fails when a notebook drifts from the store).
- Feed the store + build into the lopeyard `sync-skew` check and its Re-sync action
  (see plan/lopeyard-design.md).
- Attachments: build is update-in-place so notebooks keep their own attachment blocks; only
  needed in the store if we ever generate a notebook from scratch.
