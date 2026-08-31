---
scope: [local-development, in-notebook]
triggers:
  - "^(Edit|Write|MultiEdit) .*tools/robocoop-5/eval/(fixtures|evals-vendoring-patterns)\.mjs"
  - "(^Bash |^|[;&|] )node +tools/scratch/vendor-(pattern-probe|fixture-negative-control)"
---

# Vendoring an npm dependency into a notebook

Vendoring = the package's bytes live inside the HTML file, so the notebook runs with the network
unplugged. A cell that does `import("https://esm.sh/…")` reads almost identically and is not the same
thing: it works until the reader is offline, or esm.sh is down, or the page is opened from a USB stick.

Two separate problems, and they fail differently:

1. **Storage** — getting the bytes into the one store that both the runtime and the exporter read.
2. **Shape** — most npm packages are not in a form a browser can `import()` at all. This is the part
   that eats the time.

Everything below with a `→` was measured on 2026-08-30 in
`lopebooks/notebooks/@tomlarkworthy_robocoop-5.html` by `tools/scratch/vendor-pattern-probe.mjs` and
`vendor-pattern-probe2.mjs`, and (the `N` results) by `vendor-fixture-negative-control.mjs`. Error
strings are verbatim.

## 1. Storage: the runtime FileAttachment map is the only store that counts

A module's attachments live in a `Map` closed over by its `FileAttachment` builtin.
`@tomlarkworthy/exporter-3` reaches into exactly that map when it serializes:

```js
const _15bukmh = function _getFileAttachments(){return(
module => {
  let fileMap;
  const FileAttachment = module._builtins.get('FileAttachment');
  …                                     // monkey-patch Map.prototype.get, call FileAttachment('')
  return fileMap;
}
)};
```

and `module_specs` emits `<script id="@module/name">` blocks from `getFileAttachments(module)` and
nothing else. So that one `Map` decides **both** whether `FileAttachment("x")` resolves now and
whether the bytes survive an export.

### The trap: a `<script type="text/plain" id=…>` block is not an attachment

Bundled libraries *appear* in the file as `<script type="text/plain" id="@user/mod/lib.js.gz">`
blocks, so the obvious move is to write one. Injecting that block genuinely works for
`window.lopecode.contentSync` — `{status: 200, mime: "application/gzip", bytesLen: 322}` — and it is
still wrong twice over: the module's `FileAttachment` map never learns about it, so cells keep
answering

```
⚠ 2 cells ERRORING at runtime — tinyChunk: File not found: tiny-chunk-3.1.4.js.gz
```

and exporter-3 never re-emits it, because it reads the map rather than the DOM. Both robocoop-5
baseline runs (2026-08-30) took this route, looped on that error, and scored 0. The block route is a
dead end for vendoring; it is only how *already-exported* attachments happen to be stored.

### Writing the map at run time

In a robocoop-5 session, use the `attach_file` tool (added 2026-08-31) — it resolves the owning
module, preserves bytes when given a `url` (so binary/gzip works and the library never passes
through your context), and recomputes erroring cells:

```
attach_file({ module: "@user/chunker", name: "tiny-chunk.js", url: "https://…/index.js" })
attach_file({ module: "@user/chunker", name: "shim.js", content: "<the transformed source>" })
```

Everywhere else (pairing `eval_js`, browser console), call `setFileAttachment` directly:

```js
// eval_js scoped to @tomlarkworthy/fileattachments
const pkgText = await (await fetch(url)).text();
const pkgFile = new File([pkgText], "tiny-chunk.js", { type: "text/javascript" });
await setFileAttachment(pkgFile, window.__ojs_runtime.mains.get("@user/chunker"));
```

Three things that silently do the wrong thing on the direct route:

- **`setFileAttachment(file)` attaches to the WRONG module.** Its signature is
  `setFileAttachment(file, module = main)`, and that `main` is `@tomlarkworthy/fileattachments`'s own
  module. Omit the second argument and the write succeeds while `FileAttachment(name)` in your module
  still reports `File not found`. Always pass the owning module.
- **`myModule` from `@tomlarkworthy/runtime-sdk` is not your module** under robocoop-5's apply path —
  probed `{"found":true,"same":false}` against `runtime.mains.get("@user/vendor")`.
  `runtime.mains.get(<module id>)` is the lookup that resolves.
- **`eval_js` binds every cell name your snippet mentions as a parameter**, and `file` IS a cell of
  `@tomlarkworthy/fileattachments` — so a local `const file = …` there dies with
  `syntax error: Identifier 'file' has already been declared`. Name locals `pkgFile`, not `file`.

Since 2026-08-31, attaching recomputes the module's `FileAttachment`-dependent cells (and
`setFileAttachment` throws if the write cannot be read back). Before that fix the cells stayed in
their `File not found` error until the module file was re-written — see the implicit-variable trap
in `how-file-attachments-work.md`.

## 2. Shape: what a browser will actually import

The artifact you attach must be **one file with zero unresolved specifiers**. That is the whole rule,
and it is forced by the blob URL: `import()` of a blob has no hierarchical base, so nothing relative
or bare can resolve from it.

| you attach | `import(blobUrl)` does | fix |
|---|---|---|
| self-contained ESM | works | none |
| ESM with a bare import | `Failed to resolve module specifier "lodash". Relative references must start with either "/", "./", or "../".` | bundle it |
| ESM with a relative import | `Failed to resolve module specifier "./util.js". Invalid relative url or base scheme isn't hierarchical.` | bundle it, or § 3 |
| UMD, `root` falls back to `this` | `Cannot set properties of undefined (setting 'MyLib')` | § 2.1 |
| UMD, `root` is `typeof self !== "undefined" ? self : this` | **imports clean and exports nothing** — `LOADED []` | § 2.1 |
| CommonJS | `module is not defined` | § 2.2 |

The second row is why the corpus is full of names like `aws4fetch.esm.js.gz`,
`just-bash.browser.js.gz`, `lezer-lr-bundled.js.gz`, `prosebundle@5.js.gz`,
`isomorphic-git-1@1.30.1.bundle.js.gz` — every one is a pre-bundled single file. Get one from the
package's own `dist/` browser or ESM build, or from a CDN that bundles on demand (jsDelivr `/+esm`,
esm.sh `?bundle`). *(How the existing bundles were produced is recorded only in their file names and
in `@tomlarkworthy/notebook-kit`'s prose — not re-verified here.)*

`importShim(blobUrl, parentUrl)` does **not** rescue a relative specifier: supplying a parent still
gives `Invalid relative url or base scheme isn't hierarchical`. Do not reach for it.

### 2.1 UMD

A UMD bundle never yields exports through `import()` — which of the two failures in the table you get
depends on how its prologue names the global. Evaluate it as a script and read the global instead —
`@tomlarkworthy/p5-sandbox`:

```js
const text = await (await unzip(FileAttachment("p5.min.js.gz"))).text();
const prevDefine = window.define;
try { window.define = undefined; new Function(text).call(window); }
finally { window.define = prevDefine; }
return window.p5;
```

That `window.define` dance is load-bearing, and it is a finding rather than superstition: **this page
has an AMD loader**. Probed: `{"define":"function","amd":true}`. A UMD bundle run as-is takes the AMD
branch and the global is never assigned —

```
UMD with AMD define present     → {"global":null,"defineIsAmd":true}
same UMD inside the wrapper     → {"via":"global"}
```

The second table row above is the one to watch, and it was found on 2026-08-30 by
`tools/scratch/vendor-fixture-negative-control.mjs` rather than reasoned: the earlier probe used a UMD
whose root fallback is a bare `this`, which is `undefined` in module scope and therefore throws. Most
real bundles instead write `typeof self !== "undefined" ? self : this`, and `self` exists inside a
module — so with an AMD loader on the page the import **succeeds**:

```
N3 UMD — import paintbox as a module                          LOADED []
N4 UMD — run paintbox as a script WITHOUT shadowing define     {"global":null,"defineIsAmd":true}
```

`LOADED []` is the dangerous outcome, because nothing throws. A cell that does
`const lib = await import(url)` gets an empty namespace object and fails later, somewhere else, with
`lib.mix is not a function`. If a UMD import returns a namespace with no keys, this is what happened.

`@tomlarkworthy/claude-code-browser` wraps rather than mutates, which is the safer form because it
never leaves a global clobbered if the bundle throws:

```js
const wrapped = "(function(define, module, exports){\n" + src + "\n}).call(globalThis, void 0, void 0, void 0);";
```

`@tomlarkworthy/escodegen` shows a third variant for a bundle whose UMD prologue does not cooperate —
`eval(source.replace(".call(this,this)", ""))`, then `window.escodegen`. Reach for that only when the
wrapper fails; it edits the vendor's bytes and so breaks silently on a version bump.

### 2.2 CommonJS

`import()` gives `module is not defined`. Supply the two names it wants:

```js
const mod = { exports: {} };
new Function("module", "exports", src)(mod, mod.exports);
return mod.exports;
```

Bundles that are ESM wrappers around a CJS default (`jszip`, `lightning-fs`) import fine but hand you
a namespace object — `@tomlarkworthy/jszip-3-10-1` and `@tomlarkworthy/lightning-fs-4-6-0` both end
`return (await import(objectURL)).default;`. If your cell's value is a namespace with one `default`
key, that is this case.

## 3. Multi-file packages

Two routes, and they trade differently.

**Rewrite the specifier before making the blob.** Attach each file, mint a blob URL for the
dependency, and string-replace the specifier in the entry file:

```js
const patched = mainSrc.replace('"./util.js"', JSON.stringify(utilUrl));
const m = await import(URL.createObjectURL(new Blob([patched], {type:"text/javascript"})));
→ {"v":"helped"}
```
Works, and it is brittle: it is a textual edit of vendor source, so it must be redone per version and
it does not scale past a handful of files.

**Or use `<script id>` blocks, where relative specifiers DO resolve.** The notebook's
es-module-shims resolve hook gives block ids a hierarchical namespace, which blob URLs lack:

```
two blocks @user/plib/index.js + @user/plib/util.js, entry does import {helper} from "./util.js"
  → importShim("@user/plib/index.js")  loaded helped-by-block
bare specifier naming another block (@user/plib2/dep)
  → loaded helped-bare
```

**Cost, and it is the deciding one:** those blocks are not in any module's `FileAttachment` map, so
by § 1 they do not survive an export. This route is only durable if the same files are ALSO real
attachments of a module — an attachment named `util.js` on `@user/lib` is exported as block id
`@user/lib/util.js`, which is exactly the shape the resolve hook wants. That the two line up is an
inference from the id format, **not tested end-to-end**; the round trip (attach both files → export →
reload → `importShim("@user/lib/index.js")`) is the obvious next experiment and has not been run.

Recommendation until that is tested: prefer a single bundled file. Reach for multi-file only when
bundling is genuinely impossible, and then use the rewrite route, which is at least known to export.

## 4. Gzip

Every JS attachment in the corpus is stored gzipped; 49 library attachments across the two content
repos, and the loader is near-identical in all of them:

```js
const _unzip = function _unzip(Response, DecompressionStream){return(
  async (attachment) =>
    await new Response((await attachment.stream()).pipeThrough(new DecompressionStream("gzip"))).blob()
)};
const _lib = async function lib(unzip, FileAttachment) {
  const blob = await unzip(FileAttachment('mylib.js.gz'));
  const objectURL = URL.createObjectURL(new Blob([blob], { type: 'application/javascript' }));
  try { return await import(objectURL); } finally { URL.revokeObjectURL(objectURL); }
};
```

Round trip verified in-notebook (`CompressionStream` → `DecompressionStream` → blob → `import`):
`{"gzBytes":45,"v":"gz-ok"}`. Do not use `data-encoding="base64+gzip"` for an attachment — see
`knowledge/how-file-attachments-work.md`.

`FileAttachment(name)` takes a **literal string only** — Observable static-analyses the call and
rejects `FileAttachment(variable)`. `@tomlarkworthy/assembly-script` works around it with a lookup
table of literal calls:

```js
const FILES = {
  "binaryen-slim-131.js.gz": FileAttachment("binaryen-slim-131.js.gz"),
  "asc-0.28.20.js.gz":       FileAttachment("asc-0.28.20.js.gz"),
  …
};
```

## 5. Where this is tested

Five evals, one per row of the § 2 table plus § 3 and § 4, live in
`tools/robocoop-5/eval/evals-vendoring-patterns.mjs` (category `vendoring-patterns`). Each serves a
purpose-built package of the shape under test from a stubbed URL, asserts this doc was read, and grades
on the package's bytes reaching the module's attachment map *and* a live cell value only the real
library can produce. Each carries a scripted reference solution — `node tools/robocoop-5/eval/run.mjs
--oracle --category vendoring-patterns` runs them with no model and no key, and scored 1.00 on all five
on 2026-08-30.

`tools/scratch/vendor-fixture-negative-control.mjs` is their control: it runs the NAIVE route on the
same bytes. All six naive routes failed (N1–N6 above and in § 2), which is what makes the evals hard
rather than decorative. Re-run it if a fixture changes.

## 6. Known unknowns

- The attachment → export → `importShim` by block id round trip of § 3 is untested.
- Nothing here has been checked on `new.observablehq.com`, whose `FileAttachment` is a runtime-level
  builtin keyed by resolved href; see `knowledge/diagnosing-new-observable-platform-differences.md`.
  The **write** path (`createFileAttachment`) is known-broken there.
- WASM siblings (`@tomlarkworthy/compile-zig`, `@tomlarkworthy/linux-emu`,
  `@tomlarkworthy/assembly-script`) attach `.wasm.gz` next to the JS and hand the bytes to the
  library explicitly. Not covered above; read those modules.
