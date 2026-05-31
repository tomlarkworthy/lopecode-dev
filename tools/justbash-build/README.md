# justbash-build

Vendors [just-bash](https://justbash.dev) (`just-bash@3.0.1`) into the
`@tomlarkworthy/justbash` notebook as a self-contained, gzipped `FileAttachment`
(so the notebook works offline with no CDN). Built 2026-05-31.

## Files
- `entry.js` — re-exports `just-bash/browser`.
- `zlib-stub.js` — stub for `node:zlib` (gzip/gunzip/zcat commands are unsupported in-browser; everything else works).
- `justbash.browser.bundle.js` / `.gz` — the bundled ESM (1.14 MB raw / 322 KB gzip / 429 KB base64).
- `embed.py` — injects the gzip as a base64 `<script>` FileAttachment into the notebook engine module and rewrites the `justBashModule` cell to gunzip+import it (CDN `esm.sh` kept as fallback).
- `smoke*.mjs` — Node API validations.

## Rebuild
```bash
cd tools/justbash-build
npm install just-bash@3.0.1 esbuild
node -e "require('esbuild').build({entryPoints:['entry.js'],bundle:true,format:'esm',platform:'browser',outfile:'justbash.browser.bundle.js',minify:true,legalComments:'none',alias:{'node:zlib':require('path').resolve('zlib-stub.js')},define:{'__BROWSER__':'true'}})"
gzip -9 -c justbash.browser.bundle.js > justbash.browser.bundle.js.gz
python3 embed.py   # run from repo root; edits lopebooks/notebooks/@tomlarkworthy_justbash.html
```

## ⚠ Do not re-export the notebook
`export_notebook` (exporter-3) drops the main module's cross-module `import`
bindings and the engine's FileAttachment wiring. If you must re-export, re-run
`embed.py` and re-add the three `main.define("createWorkspace"/"formatResult"/"terminal", …)`
lines before `return main;` in the `@tomlarkworthy/justbash` script block. A
CDN-only fallback was captured at `/tmp/justbash-cdn-working.html` during the build.
