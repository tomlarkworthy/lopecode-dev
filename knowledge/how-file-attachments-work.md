# How File Attachments Work in Lopecode

File attachments let notebooks embed binary and text assets (images, CSS, gzipped JS libraries, JSON state) directly in the HTML file. This document covers storage, resolution, runtime access, and serialization.

## Storage in HTML

File attachments are stored as `<script>` tags with `type="text/plain"` and a structured `id`. There are two ID conventions:

### 1. Module-scoped attachments: `@org/module/filename`

The primary pattern. The `id` is `{module_name}/{encoded_filename}`:

```html
<script id="@tomlarkworthy/acorn-8-11-3/acorn-8.11.3.js.gz"
  type="text/plain"
  data-encoding="base64"
  data-mime="application/gzip"
>
...base64 data...
</script>
```

These are associated with a specific module and resolved via `window.lopecode.contentSync()` at runtime.

### 2. Standalone attachments: `file://filename`

A legacy/alternative pattern used by `lope-reader.ts` for detection:

```html
<script id="file://syntax.css"
  type="text/plain"
  data-mime="text/css"
>
...raw CSS text...
</script>
```

### Attributes

| Attribute | Purpose |
|-----------|---------|
| `id` | Lookup key (module-scoped path or `file://` URI) |
| `type` | Always `"text/plain"` (prevents browser execution) |
| `data-encoding` | `"base64"` for binary, `"text"` or absent for text |
| `data-mime` | MIME type of the decoded content |

## Resolution at Runtime (Bootloader)

The bootloader (`<script>` at the top of every lopebook) creates `window.lopecode.contentSync()`, which resolves file attachments by DOM lookup:

```javascript
window.lopecode = {
  contentSync: (id) => {
    const el = document.getElementById(id);
    if (!el) return { status: 404 };
    const mime = el.getAttribute("data-mime");
    if (!mime) return { status: 415 };
    const enc = (el.getAttribute("data-encoding") || "text").toLowerCase();
    const text = el.textContent || "";
    if (enc === "text") {
      return { status: 200, mime, bytes: new TextEncoder().encode(text) };
    }
    if (enc === "base64") {
      return { status: 200, mime, bytes: b64ToBytes(text) };
    }
    return { status: 422 };
  }
}
```

Key: it uses `document.getElementById(id)` to find the `<script>` tag, reads the encoding, and returns raw bytes.

## Wiring into Observable Modules

Each module's `define()` function sets up its own `FileAttachment` builtin. The generated code (from exporter-2) looks like:

```javascript
export default function define(runtime, observer) {
  const main = runtime.module();
  const fileAttachments = new Map(["acorn-8.11.3.js.gz"].map((name) => {
    const module_name = "@tomlarkworthy/acorn-8-11-3";
    const {status, mime, bytes} = window.lopecode.contentSync(
      module_name + "/" + encodeURIComponent(name)
    );
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime }));
    return [name, {url: blob_url, mimeType: mime}];
  }));
  main.builtin("FileAttachment",
    runtime.fileAttachments(name => fileAttachments.get(name))
  );
  // ...cell definitions...
}
```

The flow:
1. Module lists its attachment names in the `Map` constructor
2. For each name, calls `contentSync(moduleName/encodedFileName)` to get bytes
3. Creates a blob URL from the bytes
4. Registers the name-to-blob mapping as the module's `FileAttachment` resolver

## Using FileAttachment in Cell Code

Cells reference attachments via the standard Observable `FileAttachment` API:

```javascript
const _acorn_url = async function(unzip, FileAttachment) {
  const blob = await unzip(FileAttachment("acorn-8.11.3.js.gz"));
  return URL.createObjectURL(blob);
};
```

The `FileAttachment(name)` call returns an object with `.url()`, `.blob()`, `.text()`, `.json()`, `.arrayBuffer()` methods, just like on observablehq.com.

## Programmatic Access (@tomlarkworthy/fileattachments)

The `@tomlarkworthy/fileattachments` module provides runtime CRUD for file attachments:

```javascript
import {
  getFileAttachment,
  setFileAttachment,
  removeFileAttachment,
  createFileAttachment,
  jsonFileAttachment
} from '@tomlarkworthy/fileattachments'
```

| Function | Purpose |
|----------|---------|
| `setFileAttachment(file)` | Add/replace a file attachment at runtime |
| `getFileAttachment(name)` | Get a FileAttachment object by name |
| `removeFileAttachment(name)` | Remove a file attachment |
| `createFileAttachment(url, name, mime)` | Create a FileAttachment from a blob URL |
| `jsonFileAttachment(name, obj)` | Create a FileAttachment from a JSON-serializable object |

`setFileAttachment` works by extracting the internal `Map` from the `FileAttachment` builtin (via a clever hack that temporarily monkey-patches `Map.prototype.get`) and inserting the new file's blob URL.

### The getFileAttachmentsMap hack

The runtime's `FileAttachment` function closes over a private `Map`. To access it, `getFileAttachmentsMap` temporarily replaces `Map.prototype.get` and `Map.prototype.has`, calls `FileAttachment("")` (which internally calls `map.has(name)`), captures `this` (the map), then restores the original methods:

```javascript
(FileAttachment) => {
  let fileMap;
  const backup_get = Map.prototype.get;
  const backup_has = Map.prototype.has;
  Map.prototype.has = Map.prototype.get = function (...args) {
    fileMap = this;
  };
  try { FileAttachment(""); } catch (e) {}
  Map.prototype.has = backup_has;
  Map.prototype.get = backup_get;
  return fileMap || new Map();
}
```

## Serialization (exporter-2)

When a notebook exports itself, exporter-2's `lopemodule` function serializes each module's file attachments back to `<script>` tags:

1. **Reads `module.fileAttachments`** - a Map of `name => FileAttachment`
2. **For each attachment**, checks if there's already a `<script type="lope-file">` in the DOM (to reuse existing base64 data without re-fetching)
3. **If not cached locally**, fetches the blob URL and converts the ArrayBuffer to base64
4. **Emits** a `<script id="{module}/{name}" type="text/plain" data-encoding="base64" data-mime="{mime}">` tag

The `module_specs` cell also merges main module attachments into sub-modules when `main_files !== false`, so files attached at the top level are available everywhere.

## Module Name Resolution at Runtime

The lopecode bootloader populates `runtime.mains` — a `Map<string, Module>` mapping module names (e.g. `"@tomlarkworthy/fileattachments"`) to their runtime module instances. This is the most reliable way to find a module by name at runtime.

For imported (non-main) modules, look for variables named `module @author/name` — the variable's `_value` (NOT `_module`) is the imported module instance. The `_module` property points to the *importing* module, not the imported one.

```javascript
// Build a name → module map from the runtime
const nameMap = new Map();
for (const v of runtime._variables) {
  if (v._name?.startsWith("module ")) {
    const modName = v._name.slice(7);
    if (v._value?._scope) nameMap.set(v._value, modName);
  }
}
// Also include mains
if (runtime.mains) {
  for (const [name, mod] of runtime.mains) nameMap.set(mod, name);
}
```

This pattern is used by `tools.js` `findModule()` and by the `all_module_files` cell in `@tomlarkworthy/fileattachments`.

## Node.js Support (lope-node-runner.js)

For headless execution, `lope-node-runner.js` patches `runtime.fileAttachments` to resolve file attachments without a browser DOM. It reads from the same Map structure but resolves blob URLs via an in-memory `blobUrls` Map or filesystem paths.

## Summary: The Full Lifecycle

```
1. AUTHORING:   User drops file via UI  -->  setFileAttachment() stores blob URL in runtime Map
2. RUNTIME:     Cell calls FileAttachment("name")  -->  resolver returns {url, mimeType}
3. EXPORT:      exporter-2 reads fileAttachments Map  -->  fetches blobs  -->  base64-encodes
                -->  writes <script id="@module/name" type="text/plain" data-encoding="base64">
4. LOAD:        Bootloader's contentSync() finds <script> by id  -->  decodes base64  -->  creates blob URL
                -->  module define() registers as FileAttachment builtin
5. Back to step 2
```
