# patchwork-lopecode (prototype)

Proves **Direction A1**: a lopecode/Observable notebook can be embedded inside
Ink & Switch's Patchwork as a `patchwork:datatype` + `patchwork:tool` pair.

## The seam

Automerge owns the **source**; Observable owns the **compute**.

- The document is a notebook's source only — `{ title, order, cells }` where each
  cell is `{ inputs: string[], body: string }`. `body` is function-source *text*,
  which Automerge's text CRDT can merge across concurrent edits.
- The tool boots the Observable runtime and reconciles those cells into runtime
  variables. Redefining a changed cell lets the runtime propagate recomputation
  downstream — the reactive dataflow lopecode has and Patchwork/Automerge does not.
- This mirrors lopecode's real boot path (bootloader → `importShim`/`contentSync`
  → `runtime.module()`), with the source coming from the Automerge doc instead of
  `<script type=text/plain>` blocks.

## Files

| File | Role |
|---|---|
| `index.js` | Entry: `export const plugins` (datatype + tool, thin `load()`s) |
| `datatype.js` | `init`/`getTitle`/`setTitle` — the document schema by example |
| `tool.js` | The Patchwork render contract `(handle, element) => cleanup` |
| `runtime-adapter.js` | The seam: reconcile doc cells → Observable runtime variables |
| `harness.html` | Standalone test harness (mock DocHandle) — no Patchwork host needed |
| `harness-test.mjs` | Playwright driver asserting the reactive behaviour |

## Run the test

```bash
python3 -m http.server 8791          # serve the repo (file:// blocks ESM imports)
node tools/patchwork-lopecode/harness-test.mjs
```

Verifies, in real Chromium: initial mount computes; a **data edit**
(`count`) propagates; a **logic/source edit** (`doubled`) recompiles; a cell can
be **added/removed**; a simulated **remote merge** propagates; `cleanup()` tears
the runtime down. All via the exact `(handle, element) => cleanup` contract
Patchwork calls.

## What this does NOT yet do

- Full notebook fidelity: no importmap/file-attachments/lopepage-2 layout. Cells
  are a minimal `{inputs, body}` form, not compiled Observable/lopecode modules.
  Next step is to feed real lopecode content blocks (materialize them into the
  page and reuse lopecode's own bootloader) rather than the mini-compiler here.
- No `@automerge/automerge-codemirror` cursor wiring — editing is via the doc,
  not yet editor-5. Both are CodeMirror 6, so that binding is the natural follow-up.
- Not pushed to a real Patchwork instance (`pushwork sync`); the mock handle
  stands in for automerge-repo's DocHandle.
