# Authoring a blog lopebook (editable + atproto-publishable)

Recipe for a prose lopebook on **lopepage-2** where every paragraph is edit-in-place (SHIFT+ENTER) and the notebook can publish itself to atproto. No browser needed to scaffold; open it only to write/publish.

## Template

Fork `lopebooks/notebooks/@tomlarkworthy_coding_harness_tuning_blog.html` — the cleanest blog already on lopepage-2 with the full edit + publish stack. First worked example: `@tomlarkworthy_virtual-monorepo.html`.

## Steps

1. **Author the content module** `modules/@tomlarkworthy/<slug>.js`. Copy the shape from `@tomlarkworthy/why-claude-code-codes-well.js` or `@tomlarkworthy/virtual-monorepo.js`:
   - Prose cells: `const pN = function _anonymous(md) {return (md`…`);};`
   - The `define()` must re-import `md` from editable-md so prose is editable:
     ```js
     main.define("module @tomlarkworthy/editable-md", async () => runtime.module((await import("/@tomlarkworthy/editable-md.js?v=4")).default));
     main.define("md", ["module @tomlarkworthy/editable-md", "@variable"], (_, v) => v.import("md", _));
     ```
   - For external links carry the `external_link_svg` + `externalLink` helper cells over.
   - Cross-reference the repo with real GitHub URLs (`.gitmodules`, `CLAUDE.md`, submodules).

2. **Copy the template** to `lopebooks/notebooks/@tomlarkworthy_<slug>.html`.

3. **Sync the module in**:
   ```
   bun tools/channel/sync-module.ts --module @tomlarkworthy/<slug> \
     --source modules/@tomlarkworthy/<slug>.js \
     --target lopebooks/notebooks/@tomlarkworthy_<slug>.html --insert-ok
   ```

4. **Fix the `bootconf.json` block** (the real one near the end of the file, not the exporter's inline copy). Minimal edit/publish set:
   ```json
   {
     "mains": ["@tomlarkworthy/<slug>","@tomlarkworthy/editable-md","@tomlarkworthy/save-in-place","@tomlarkworthy/at-login","@tomlarkworthy/at-write","@tomlarkworthy/lopepage-2"],
     "hash": "#view=S100(@tomlarkworthy/<slug>)",
     "headless": true
   }
   ```
   Also set `<title>`.

5. **Validate**: `bun tools/lope-reader.ts lopebooks/notebooks/@tomlarkworthy_<slug>.html` — check title/mains/hash and the module cells.

## Roles of each main

| module | role |
|--------|------|
| `editable-md` | provides the enhanced `md` — SHIFT+ENTER edits any paragraph in place |
| `save-in-place` | FSA save-back so edits persist to the `.html` on disk |
| `at-login` / `at-write` | atproto identity + publish (the `com.lopecode.bundle` path) |
| `lopepage-2` | reader layout + burger-menu chrome |

## Prune unused modules

The coding-harness template carries robocoop-4 + just-bash + butter-synth demo blocks. Once your `mains` are set, tree-shake everything unreachable:

```
# 1. compute what's unreachable from mains (dry run, prints the kill list)
python3 tools/compute-orphans.py lopebooks/notebooks/@tomlarkworthy_<slug>.html
# 2. strip the @tomlarkworthy/* orphans (NOT the @observablehq/* infra — those load via importmap)
python3 tools/strip-orphans.py lopebooks/notebooks/@tomlarkworthy_<slug>.html @tomlarkworthy/robocoop-4 @tomlarkworthy/just-bash ...
# 3. verify: no new orphans, then boot in a headless browser and check qa_console_logs errors === []
```

`compute-orphans.py` does BFS from `bootconf.mains` through each module's `import("/@user/x.js")` refs. Reachability is exact: it correctly *keeps* jszip / isomorphic-git / lightning-fs (pulled in by `exporter-3` + `file-sync` for save/export), which a manual guess would wrongly delete. It flags the two `@observablehq/*` libs as "orphans" because they load via importmap, not module imports — never strip those. For `@tomlarkworthy_virtual-monorepo` this took 3.27MB → 2.40MB (16 modules), booting clean.
