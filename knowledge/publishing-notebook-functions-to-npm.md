---
scope: [local-development, in-notebook]
write-triggers:
  - "package/package\\.json"
  - "[\"'`]ustar"
  - "registry\\.npmjs\\.org[\\s\\S]{0,400}[\"'](PUT|put)[\"']"
  - "[\"'](PUT|put)[\"'][\\s\\S]{0,400}registry\\.npmjs\\.org"
---

# Publishing notebook functions to npm

A notebook page cannot publish to npm. Build the package tarball (`.tgz`) from the live cells, give
the user a button that downloads it, and tell them to run `npm publish <file>.tgz --access public`
on a machine where they are logged in to npm. Do not ask for an npm token: there is nothing in the
page that could use it.

## Why the page cannot publish

`npm publish` is `PUT https://registry.npmjs.org/<name>` with an `Authorization` header and a JSON
body. From a page that request needs a CORS preflight, and the registry answers the preflight with
`404` and no `Access-Control-Allow-Origin`. Measured 2026-09-29 (curl, and `fetch` in headless
Chromium from a `file://` page and an `https://` page):

| request | from a page |
|---|---|
| `GET /lodash/latest` | 200, `access-control-allow-origin: *` |
| `OPTIONS /@me%2fedge-helpers` (the preflight) | 404, no CORS header |
| `PUT /@me%2fedge-helpers`, with or without `authorization` | `TypeError: Failed to fetch` |
| `GET /-/whoami` | `TypeError: Failed to fetch` |

A token does not change this, and a `no-cors` fetch cannot send `PUT`. A token pasted into a cell
is also saved into the notebook file on the next save.

## What went wrong without this page

In run `20260929-0620-m66` (base) for *"Publish the functions in my module to npm as a package called
@me/edge-helpers"*, the agent wrote three separate download buttons (`package.json`, `index.js`,
`README.md`) whose `index.js` was a retyped string of the cells, and ended with: "I cannot run `npm
publish` from this browser environment — you need to … download the files manually, or provide an npm
auth token for registry API publishing." The token offer cannot work, the user was given no tarball,
and no command to run.

## Build the tarball from the cells

The example below uses a module of unit conversions (`ABSOLUTE_ZERO_C`, `cToF`, `fToC`) published as
`@me/units`. The source comes from the function cells' current values, as in
`packaging-notebook-functions-as-a-javascript-library.md` (`@tomlarkworthy/belief-geometry.workerSource`
builds a program with `fn.toString()`). Export every cell a function refers to, under the same name.

```js
const _index_js = function _index_js(ABSOLUTE_ZERO_C,cToF,fToC){return(
[
  "export const ABSOLUTE_ZERO_C = " + JSON.stringify(ABSOLUTE_ZERO_C) + ";",
  ...Object.entries({cToF, fToC}).map(([name, fn]) => "export const " + name + " = " + fn.toString() + ";")
].join("\n\n") + "\n"
)};
const _pkg = function _pkg(){return(
{name: "@me/units", version: "1.0.0", type: "module", main: "index.js", exports: "./index.js", license: "MIT", files: ["index.js", "README.md"]}
)};
```

An npm tarball is a gzipped ustar archive whose entries all start with `package/`
(`package/package.json`, `package/index.js`, …). npm rejects one without the prefix. There is no tar
library in this notebook; the format needs only 512-byte headers. The gzip step is the one
`@tomlarkworthy/import-wizard-file._gzipFile` uses (`lopecode/notebooks/quick_start.html`):
`stream().pipeThrough(new CompressionStream("gzip"))`.

```js
const _tgz = function _tgz(){return(
async function tgz(files) {
  const enc = new TextEncoder();
  const blocks = [];
  const oct = (n, len) => n.toString(8).padStart(len - 1, "0") + "\0";
  for (const [path, text] of Object.entries(files)) {
    const data = enc.encode(text);
    const h = new Uint8Array(512);
    const put = (s, off) => h.set(enc.encode(s), off);
    put(path, 0);
    put(oct(0o644, 8), 100);
    put(oct(0, 8), 108);
    put(oct(0, 8), 116);
    put(oct(data.length, 12), 124);
    put(oct(Math.floor(Date.now() / 1000), 12), 136);
    put("        ", 148);
    put("0", 156);
    put("ustar", 257);
    put("00", 263);
    let sum = 0;
    for (const b of h) sum += b;
    put(sum.toString(8).padStart(6, "0") + "\0 ", 148);
    blocks.push(h, data, new Uint8Array((512 - data.length % 512) % 512));
  }
  blocks.push(new Uint8Array(1024));
  return new Response(new Blob(blocks).stream().pipeThrough(new CompressionStream("gzip"))).blob();
}
)};
const _download = function _download(htl,tgz,pkg,index_js,readme){return(
htl.html`<button onclick=${async () => {
  const blob = await tgz({"package/package.json": JSON.stringify(pkg, null, 2), "package/index.js": index_js, "package/README.md": readme});
  const file = "units-" + pkg.version + ".tgz";
  const link = htl.html`<a download=${file} href=${URL.createObjectURL(blob)}>`;
  link.click();
}}>Download units-${pkg.version}.tgz</button>`
)};
```

The archive is built on click, so an edit to a function cell is in the next download
(`@tomlarkworthy/suminagashi._download` makes its `<a download>` the same way). `readme` is a string
cell like `index_js`.

`tgz` writes only the ustar fields npm needs. The name field is 100 bytes and the writer does not
fill the ustar `prefix` field, so keep each path under 100 bytes. No corpus cell wrote tar before this
page (`ustar` occurred in 0 notebooks on 2026-09-29), so it was checked against the format on
2026-09-29, with node 22 running the cell above on three files (`package.json`, `index.js`, a
713-byte `README.md`):

```
$ tar -tzvf units-1.0.0.tgz
-rw-r--r--  0 0      0         186 Sep 29 09:10 package/package.json
-rw-r--r--  0 0      0         150 Sep 29 09:10 package/index.js
-rw-r--r--  0 0      0         713 Sep 29 09:10 package/README.md
gunzipped: 4608 bytes (3 headers + 4 data blocks + 2 zero blocks); header 1 checksum field 011674 = 5052 = sum with the field as spaces
$ npm publish --dry-run --offline --access public units-1.0.0.tgz     # npm 11.19.0
+ @me/units@1.0.0      (exit 0; "total files: 3")
$ npm install --offline ../units-1.0.0.tgz && node -e "import('@me/units')"
[ 'ABSOLUTE_ZERO_C', 'cToF', 'fToC' ]
```

## Tell the user

- The command: `npm publish units-1.0.0.tgz --access public`. A scoped package is private by
  default, and a free account can only publish it public.
- The scope (`@me`) must be their npm username or an org they belong to; otherwise npm answers 403
  or 404. The name is set in the `pkg` cell.
- npm refuses a version that was already published: bump `version` in `pkg` before the next publish.
- Which functions were left out and why (cells that use `md`, `html`, `Inputs`, `FileAttachment` …
  do not run outside the notebook).
- Do not say the package was published: the page did not publish it.
