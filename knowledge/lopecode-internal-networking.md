# Lopecode Internal Networking

## Overview

Lopecode notebooks override `fetch`, `XMLHttpRequest.prototype.open`, `Document.prototype.createElement` (for `<script src>`), and es-module-shims hooks to intercept network requests and serve embedded content from `<script>` elements in the HTML file.

## Patched APIs

All patches are in the bootloader section at the top of each notebook HTML file.

### es-module-shims hooks (`esmsInitOptions`)

```javascript
window.esmsInitOptions = {
  shimMode: true,
  resolve(id, parentUrl, defaultResolve) { ... },
  source(url, fetchOpts, parent, defaultSourceHook) { ... },
  fetch(url, options, parent) { ... }
};
```

- **`resolve`**: Normalizes the specifier (strips `https://api.observablehq.com/` prefix, `/.js?v=4...` suffix), looks up `document.getElementById(normalized)`. If found, returns `file://<id>`. Otherwise, if `isNotebook(id)`, rewrites to Observable API URL.
- **`source`**: For `file://` URLs, reads from `<script>` element's `textContent` (JS/JSON).
- **`fetch`**: For `file://` URLs, returns a synchronous Response from embedded content via `dvfResponseSync()`. For other URLs, delegates to native `fetch`.

### `globalThis.fetch` override (`patchFetch`)

```javascript
const _fetch = globalThis.fetch;
globalThis.fetch = function(url, init) {
  // normalize URL, check for embedded element
  // if found: serve from dvfBytes(id)
  // else: return _fetch(url, init)
};
```

Normalizes the URL and checks for an embedded `<script id="...">` element. If found, serves bytes from the embedded content. Otherwise falls through to the original `fetch`.

### `XMLHttpRequest.prototype.open` override (`patchXHR`)

```javascript
const _open = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(method, url, ...rest) {
  if (url.startsWith("file://")) {
    blobUrlForId(url.slice(7)).then(u => _open.call(this, method, u, ...rest));
    return; // NOTE: returns before _open is called (async)
  }
  return _open.call(this, method, url, ...rest);
};
```

Only intercepts `file://` URLs. Non-file URLs pass through to native XHR.

**Bug**: For `file://` URLs, `_open` is called asynchronously (inside `.then()`), but the function returns immediately. Callers that call `.send()` right after `.open()` will send before open completes.

### `Document.prototype.createElement` override (`patchScriptSrc`)

Patches the `src` setter on `<script>` elements to intercept `file://` URLs and embedded element IDs, redirecting them to blob URLs.

## The `normalize()` function

Central to all hooks:

```javascript
const normalize = (url) =>
  url
    .replace(/^(?:https:\/\/api\.observablehq\.com)?\/(.*?)\.js(?:\?.*)?$/, "$1")
    .replace(/^(d\/[a-f0-9]{16})@\d+$/, "$1");
```

Strips:
- `https://api.observablehq.com/` prefix
- Leading `/`
- `.js` suffix and any query params (`?v=4`, `?v=4&resolutions=...`)
- Version pinning from hash IDs (`d/abc123@456` → `d/abc123`)

Examples:
- `/@tomlarkworthy/runtime-sdk.js?v=4` → `@tomlarkworthy/runtime-sdk`
- `https://api.observablehq.com/@tomlarkworthy/notes.js?v=4&resolutions=...` → `@tomlarkworthy/notes`
- `@tomlarkworthy/notes` → `@tomlarkworthy/notes` (passthrough)

## How `import` statements resolve

When a cell contains `import {foo} from "@tomlarkworthy/notes"`:

1. **Compile** generates: `async () => runtime.module((await importShim("@tomlarkworthy/notes")).default)`
2. **importShim resolve hook** normalizes `@tomlarkworthy/notes`, checks for `<script id="@tomlarkworthy/notes">`:
   - **Found (embedded)**: Returns `file://@tomlarkworthy/notes` → served from embedded content
   - **Not found**: `isNotebook()` check → rewrites to `https://api.observablehq.com/@tomlarkworthy/notes.js?v=4` → fetched from network
3. **es-module-shims** rewrites `import()` inside the loaded module to `importShim()` with the parent URL, so transitive imports also go through the resolve hook
4. **`runtime.module(define)`** caches by `define` function reference — if the same `define` is returned (same resolved URL via es-module-shims cache), no duplication occurs

## Transitive import deduplication

When an externally loaded module (from Observable API) has transitive `import()` calls for modules already embedded in the notebook:

1. es-module-shims rewrites `import("/@tomlarkworthy/runtime-sdk.js?v=4&resolutions=...")` → `importShim("/@tomlarkworthy/runtime-sdk.js?v=4&resolutions=...", parentUrl)`
2. The resolve hook normalizes → `@tomlarkworthy/runtime-sdk` → finds embedded element → returns `file://@tomlarkworthy/runtime-sdk`
3. es-module-shims has already loaded this URL during bootloader init → returns the **same module object** → same `define` function reference
4. `runtime.module(define)` finds the cached module → **no duplication**

This deduplication depends on es-module-shims being in the import path (shimMode). If `import()` bypasses es-module-shims (e.g., from `eval()`'d code), the resolve hook doesn't run and duplication can occur.

## Agent testing notes

When testing in Playwright under the safehouse sandbox, Chromium's own sandbox (`--sandbox`) conflicts with safehouse, blocking outbound network. Launch with `--no-sandbox --disable-setuid-sandbox` to allow network requests from `file://` pages.
