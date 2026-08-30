# exporter-mcp — a blob-free serialization for sandboxed hosts

Research prototype. Goal: make a lopecode notebook run inside Claude for Work's MCP-app sandbox,
where `blob:` script URLs are unavailable. Nothing in the existing corpus is modified — the
prototype is an offline transformer plus a browser-side loader, both under `tools/exporter-mcp/`.

Status: **proven end-to-end offline against measured host constraints.** A blank-notebook and an
editor-5 export reach byte-identical runtime state versus their exporter-3 originals under a CSP
that bans `blob:` and `data:` scripts *and* with `URL.createObjectURL` returning an unreadable
handle. The same originals under that CSP render a blank page.

## 0. Measured host constraints

From a probe run in a real `www.claudeusercontent.com` artifact frame (2026-07, `org=null`):

| | | consequence |
|---|---|---|
| `new Function(body)` | works to **≥2MB** of source | the whole design is viable; largest corpus payload is 512KB |
| injected classic `<script>` | executes **synchronously** | the `<script src>` inlining path is safe |
| `URL.createObjectURL` | returns `blob-request://…` — unreadable by `fetch`, `import` **or** `<img src>` | object URLs are not URLs here; never key off the `blob:` scheme |
| `import("data:…")` | **blocked** | no native module URL scheme survives → `Function` is the only option |
| `<img src="data:…">` | works | image attachments must become data URLs |
| `<link href="data:…">` as stylesheet | **blocked** | CSS must be adopted as a constructed `CSSStyleSheet` |
| import maps, injected module scripts, `https:` imports, arbitrary egress | work | only locally-generated URLs are refused |

Two of these overturned assumptions in the first draft of this design, and both are now fixed and
regression-tested (§3, §4). The probe page that produces this table is
`tools/exporter-mcp/sandbox-probe.html`.

## 1. Why exporter-3 output dies in the sandbox

exporter-3 ships every dependency as an inert `<script type="text/plain" id="…">` block and boots
es-module-shims to serve them. es-module-shims executes a module by minting a `blob:` URL for the
rewritten source and doing a native `import()` of it. A host whose `script-src` omits `blob:` blocks
every one of those imports, and the boot dies before the runtime is constructed:

```
Loading the script 'blob:null/6d867307-…' violates the following Content Security Policy
directive: "script-src 'unsafe-inline' 'unsafe-eval'"
boot error TypeError: Failed to fetch dynamically imported module: blob:null/2cb1f993-…
```

`__ojs_runtime` undefined, 0 cells, empty body. Reproduced locally by injecting that CSP into an
unmodified `@tomlarkworthy_blank-notebook.html`.

blob URLs appear in four more places, all of which had to be handled:

| Site | Use |
|---|---|
| es-module-shims | one blob per module — **fatal** |
| `generate_define`'s FileAttachment map | `URL.createObjectURL(new Blob(bytes))` per attachment, consumed by `fetch` |
| library modules (`acorn-8-11-3`, `codemirror-6-v2`, `observablehq-lezer`, …) | `unzip(FileAttachment(x))` → `createObjectURL` → `import(url)` — cell-level, so no exporter change can remove it |
| bootloader `wrapFile` | `Inputs.file()` → a FileAttachment over a blob URL |
| `patchScriptSrc` | `<script src=blob:>` for the UMD builtins d3-require pulls (lodash, htl, marked, highlight) |

## 2. What the linker actually has to support

Measured, not assumed — `tools/mcp-scan-esm.ts` parses every JS payload in a notebook with
`Bun.Transpiler` (regexes are useless here: markdown cells quote `import`/`export` constantly).

Across `@tomlarkworthy_blank-notebook.html` (78 JS payloads: 60 module blocks, 18 vendored bundles):

- **0** payloads use static `import … from` — except one: `observablejs-toolchain/parser-6.1.0.js.gz`
  imports `/npm/acorn@8.11.3/+esm` and `/npm/acorn-walk@8.3.2/+esm`.
- **0** re-exports (`export * from`, `export {x} from`).
- Export shapes: 60 × `default` only (every exporter-generated module block is
  `export default function define(runtime, observer)`), the rest a flat list of named exports.
- **37** payloads use dynamic `import()`; that is how the whole graph is wired.
- `import.meta` in 2 payloads.

So the linker is mostly a dynamic-`import()` engine. Static imports need to work but never carry
cycles or live-binding requirements in this corpus.

## 3. Design

Keep the file format exactly as it is — same `<script type="text/plain">` blocks, same ids, same
`normalize()` resolution. Change only *how a payload is executed*.

```
exporter-3:   source ──▶ es-module-shims ──▶ blob: URL ──▶ native import()
exporter-mcp: source ──▶ es-module-lexer  ──▶ rewrite to a Function body ──▶ new Function()
```

Three files, ~19KB of new boot code, replacing 20KB of es-module-shims:

**`lope-esm-rewrite.js`** — ESM → Function body. Uses es-module-lexer for import positions; for
exports the lexer only gives name ranges, so it walks back to the nearest `export` keyword, which is
safe because only code (never a string or comment) can sit between `export` and an exported name.
The generated body receives one argument:

| | |
|---|---|
| `__lope.x` | namespace object exports write into |
| `__lope.imp(spec, opts?)` | both static imports and `import()` |
| `__lope.meta` | `import.meta` |
| `__lope.star(ns)` | `export * from` |

**`lope-linker.js`** — replaces `networking_script`. Keeps exporter-3's streaming gate, `dvfBytes`
and `window.lopecode.contentSync` verbatim, and adds:

- an **object-URL registry** keyed by whatever the host hands back — *not* by the `blob:` scheme,
  because the artifact frame returns `blob-request://…`. Every read (`fetch`, `import`,
  `<script src>`) checks registry membership first, so the bytes are served in-process and the
  host's URL never has to be readable. A boot probe records whether object URLs are usable at all;
  when they are not, `<img src>` assignments of a registered handle are swapped for a `data:` URL
  (measured to work) so `FileAttachment(x).url()` still renders.
- `window.importShim = lopeImport`. This is the load-bearing naming decision: the bootloader,
  `generate_define`'s `main.define("module X", …)` lines and every rewritten `import()` already
  route through that name, so **not one module in the corpus needs to change**.
- `<script src>` interception that inlines the bytes as script *text* instead of pointing at a blob
  URL — d3-require's UMD builtins load with no CSP source beyond the `'unsafe-inline'` the page
  already needs. Insertion is deferred until the bytes arrive, then `load` fires, so `onload`
  callers still work.
- XHR `file://` interception that answers from the page instead of a blob URL.

**`build.ts`** — the offline stand-in for the exporter. Splices three blocks and copies everything
else byte-for-byte: `networking_script` → the boot core, `main` → the same boot sequence with
`importShim` bound to the linker, `es-module-shims@2.6.2` → deleted. `--csp` injects the hostile
policy; `--sandbox` adds it plus an emulation of the artifact frame's crippled
`URL.createObjectURL`, so neither constraint can regress unnoticed.

## 4. Results

`bun tools/exporter-mcp/test-rewrite.ts <html>…` rewrites every JS payload and compiles it exactly
as the linker will:

```
lopecode/notebooks/*.html    3302 payloads rewrote + compiled, 0 failed
lopebooks/notebooks/*.html  12433 payloads rewrote + compiled, 0 failed
```

Runtime parity, offline (`--offline` aborts every non-`file:` request), MCP builds additionally
under the blob-free CSP **and** the crippled-`createObjectURL` emulation (`--sandbox`):

| | variables | fulfilled | cells | errored vars |
|---|---|---|---|---|
| blank-notebook, exporter-3 | 3039 | 1714 | 81 | 0 |
| blank-notebook, exporter-mcp | 3039 | 1714 | 81 | 0 |
| blank-notebook, exporter-3 **+ CSP** | — | — | 0 | never boots |
| editor-5, exporter-3 | 3093 | 1781 | 129 | 0 |
| editor-5, exporter-mcp | 3093 | 1781 | 129 | 0 |

`tools/exporter-mcp/interact.ts` clicks an `edit` affordance in the editor-5 MCP build under
`--sandbox --offline`: CodeMirror mounts with highlighted content and 8 modules resolve from
`blob-request://` handles the platform cannot read at all — the `unzip → createObjectURL →
import()` chain that no exporter-side change can remove works purely because the linker owns both
`import()` and the registry.

Cost: **+8KB** on a 2.9MB file (lexer 20KB + rewriter 8KB + linker 11KB, minus 20KB of
es-module-shims) and **~50ms** slower to first cell (895ms vs 845ms, 3 runs each). The lexer is the
asm.js build, so no `wasm-unsafe-eval` is assumed.

## 5. Known gaps

1. **Static imports are not hoisted, bindings are snapshots, cycles are unresolved.** One payload in
   the corpus uses static imports and it has none of those needs. A vendored bundle with an import
   cycle would deadlock on the module promise.
2. **`FileAttachment.url()` handed to the platform.** `fetch`/`.text()`/`.stream()` and `<img src>`
   are covered. `<video>`, `<audio>`, `<source>`, `<a download>`, `window.open` and `url()` inside a
   stylesheet are **not** — each needs the same data-URL swap as `HTMLImageElement.prototype.src`.
   None of them appear in the notebooks tested; add them when one does.
3. **Web Workers** would need the same treatment (`new Worker(objectUrl)`). The corpus has none.
4. **`document.currentScript` is null** inside a Function body. No payload uses it.
5. **Genuinely remote dependencies stay remote.** `@observablehq/highlight.js@2.0.0/async-languages/
   index.js` is fetched from jsDelivr by both serializations; it is not embedded in the file at all.
   Non-fatal, but a notebook meant for an offline sandbox should bundle it.
6. **Self-export.** A notebook in the sandbox that re-exports itself must carry `exporter-mcp`, not
   `exporter-3`, or it will emit a file that cannot run where it was made.

## 6. Why a lexer rather than a regex

A regex transform gets a long way here — 50 of 53 blocks in a notebook are the single shape
`export default function define(runtime, observer)` — and it is tempting to skip the 20KB lexer.
Two things break it, both in the payloads a block-level scan does not see, because they are gzipped
FileAttachments rather than `<script>` blocks:

- **Multiple top-level export sites.** 241 of 3351 payloads in `lopecode/notebooks/` have more than
  one — `acorn-8.11.3.js.gz`, `acorn-walk-8.3.2.js.gz`, `parser-6.1.0.js.gz`,
  `isomorphic-git-http`, `modern-screenshot` among them. A first-match-only
  `replace(/^export\s*\{…\}/m, …)` leaves a stray `export` and `new Function` throws a
  `SyntaxError`. Loading acorn is what `editor-5` does on its first edit.
- **`import(` inside string literals.** A line-based rewrite of `import(` corrupts the markdown
  cells that document usage, and the corpus is full of them.

`tools/exporter-mcp/test-rewrite.ts` is the gate: it rewrites and compiles every payload, gz
attachments included. That is the check worth keeping regardless of which transform ships.

## 7. Turning this into `@tomlarkworthy/exporter-mcp`

The notebook module is a fork of exporter-3 touching four cells. Everything that computes *what* to
serialize — `module_specs`, `generate_module_source`, `generate_definitions`, `generate_define`,
`variableToDefine`, `lopemodule`, `getFileAttachments`, `report`, the exporter UI — is unchanged,
because the block format does not change.

| exporter-3 cell | change |
|---|---|
| `_networking_script` | replace with the boot core (lexer + rewriter + linker) |
| `_lopebook` | drop the es-module-shims bootstrap from the `<script id="main">` template; `importShim` comes from the linker |
| `_book` | drop `inlineGzipModule('es-module-shims@2.6.2', …)` from `systemBlocks` |
| `_es_module_shims` | replace with `_es_module_lexer` (gzipped asm.js build) |

`generate_define`'s FileAttachment expression keeps using `URL.createObjectURL` — the registry makes
that work unchanged, so it is deliberately left alone.

Suggested order: build a candidate with `build.ts --sandbox` and load it in the real host first —
that costs one reload and settles whether anything outside the emulated constraint set bites. Then
port the four cells into a new notebook, export with it, and run
`tools/exporter-mcp/smoke.ts --offline` plus `interact.ts` against the result to confirm the
notebook-side path matches the offline transformer.

## Files

| Path | Role |
|---|---|
| `tools/exporter-mcp/lope-esm-rewrite.js` | ESM → Function body rewriter |
| `tools/exporter-mcp/lope-linker.js` | browser-side loader (replaces `networking_script`) |
| `tools/exporter-mcp/build.ts` | offline exporter-3 → exporter-mcp transformer (`--csp`, `--sandbox`) |
| `tools/exporter-mcp/test-rewrite.ts` | corpus-wide rewrite + compile gate |
| `tools/exporter-mcp/smoke.ts` | boot parity check (`--offline`) |
| `tools/exporter-mcp/interact.ts` | CodeMirror-mount check (the blob-import chain) |
| `tools/exporter-mcp/timing.ts` | boot-time comparison |
| `tools/exporter-mcp/sandbox-probe.html` | host capability probe |
| `tools/mcp-scan-esm.ts` | ESM syntax inventory of a notebook |
