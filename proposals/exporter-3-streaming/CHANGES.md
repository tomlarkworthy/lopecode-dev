# exporter-3: stream-first export

Makes `@tomlarkworthy/exporter-3` emit notebooks that boot from the **top** of the streaming
HTML download instead of after it. Productionizes the prototype proven in
`.claude/worktrees/tour-stream-load` (first-paint 3.5 s → ~0.1 s; title content during the
stream rather than after).

## What changed (all in `work/exporter-3.js`)

1. **`networking_script` — async, streaming-aware interceptor.**
   - Adds `window.__lopeStreaming` + `__waitForId(id)`: blocks until a block's `<script>` is fully
     parsed (`el.nextSibling != null`), bounded by the streaming flag so an absent id still 404s
     instead of hanging.
   - `dvfBytes`, the es-module-shims `fetch` and `source` hooks all `await __waitForId` — es-module-shims
     awaits both hooks (`c = await fetchHook(...)`, `await (sourceHook||default)(...)`), so a block a
     boot import needs can stream in late.
   - `resolve` stays synchronous (es-module-shims does not await it) but routes a not-yet-present
     notebook id to `file://` instead of the remote observablehq API.

2. **`lopebook` — main at the top + end sentinel.**
   - `main` moves from a deferred `<script type="module">` after the blocks to a classic async-IIFE
     `<script id="main">` **before** the blocks, so it runs while the document is still downloading.
   - Bootstrap now `await`s the async fetch hook: `.fetch(...).then(r => r.text())`.
   - Appends `<script id="streaming_sentinel">window.__lopeStreaming = false;</script>` after all
     blocks, marking the end of the stream.

3. **`book` — bootconf-prioritized module order** via new pure helper `streamingModuleOrder(mains, specByName)`:
   the `bootconf.json` mains first, then every other module — **each group sorted alphabetically**.
   Order depends only on the set of module names, not on the import graph, so re-exporting an unchanged
   notebook yields byte-identical block order (no diff churn). (`lopemodule` already emits a module's
   FileAttachment blocks *before* its source, so a module is never defined before its attachments have
   arrived — the invariant that lets `main` move to the top safely.)

## Tests (new `test_*` cells, run by the existing exporter-3 test harness)

- `test_networking_script_is_streaming` — asserts the generated interceptor has the streaming gate,
  `__waitForId`, async `dvfBytes`/`fetch`/`source`, and the local-resolve streaming branch.
- `test_lopebook_main_at_top_with_sentinel` — asserts main is a classic script before the blocks,
  the sentinel is after them, and the bootstrap awaits `.then(r => r.text())`.
- `test_streaming_order_prioritizes_mains` — pure-logic ordering test: mains-first then alphabetical,
  multiple mains alphabetical, order independent of insertion order, unknown main ignored.
- `test_streaming_order_runtime` — builds a real `new Runtime()`, derives specs the way `module_specs`
  does, and asserts the deterministic order. (Pattern: `@tomlarkworthy/modules`.)

Standalone run (no browser), from this directory: `node run-tests.mjs` (cells 1–3) and
`node run-test4.mjs` (the Runtime cell, against `@observablehq/runtime@6.0.0` in `runtime6.mjs`). All pass.

## Applying

```
bun tools/channel/sync-module.ts --module @tomlarkworthy/exporter-3 \
  --source .claude/worktrees/exporter-3-streaming/work/exporter-3.js \
  --target lopecode/notebooks/@tomlarkworthy_exporter-3.html
```
Then push the changed cells to ObservableHQ (source of truth) and re-export consumers. exporter-3 is
used by every self-serializing notebook, so re-export/QC broadly before publishing.

## Out of scope (separate module changes, not exporter-3)

The full ~2.4 s title in the prototype also needed: making the module-map force-load lazy (issue #27)
and deferring `lp2_background_jobs` until after first paint in lopepage-2. This change is the export-side
enabler; those two are independent follow-ups.

## Files in this proposal

- `exporter-3.js` — the full modified module source (the change).
- `exporter-3.streaming.diff` — unified diff vs current exporter-3 (the review artifact).
- `run-tests.mjs`, `run-test4.mjs`, `runtime6.mjs` — standalone test harness (scaffolding, not shipped).
  `runtime6.mjs` is `@observablehq/runtime@6.0.0` extracted from a notebook so `run-test4.mjs` runs in node.
