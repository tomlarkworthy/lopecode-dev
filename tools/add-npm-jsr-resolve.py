#!/usr/bin/env python3
"""Insert npm:/jsr: resolution into the es-module-shims `resolve` hook of a lopecode
bootstrap. Idempotent. Mirrors notebook-kit's resolveNpmImport/resolveJsrImport so verbatim
`npm:pkg` / `jsr:pkg` import specifiers (as produced by @tomlarkworthy/js-toolchain) resolve
at load time.

The bootstrap appears twice per notebook: once as live code, once as a serialized string
(a template literal the exporter re-emits). The inserted block is deliberately free of
backticks, ${} and backslashes, so it is byte-identical in both copies (a regex would need
its backslashes doubled inside the template literal — avoided by using string checks).

Usage: add-npm-jsr-resolve.py <file.html> [<file.html> ...]
"""
import sys, pathlib

ANCHOR = "if (isNotebook(id)) id ="          # present in both the live and serialized hooks
MARKER = 'id.startsWith("npm:")'             # idempotency guard
BLOCK = '''      else if (id.startsWith("npm:")) {
        const s = id.slice(4), p = s.split("/");
        const nr = s.startsWith("@") ? p.shift() + "/" + p.shift() : p.shift();
        const at = nr.indexOf("@", 1), nm = at > 0 ? nr.slice(0, at) : nr, rg = at > 0 ? nr.slice(at) : "";
        const pa = p.length ? "/" + p.join("/") : "";
        const last = pa.slice(pa.lastIndexOf("/") + 1);
        id = "https://cdn.jsdelivr.net/npm/" + nm + rg + (pa ? (pa.endsWith("/+esm") || pa.endsWith("/") || last.includes(".") ? pa : pa + "/+esm") : "/+esm");
      }
      else if (id.startsWith("jsr:")) id = "https://esm.sh/jsr/" + id.slice(4);'''

for arg in sys.argv[1:]:
    p = pathlib.Path(arg)
    lines = p.read_text().split("\n")
    if any(MARKER in l for l in lines):
        print(f"  {p.name}: already has npm:/jsr: resolution, skipped")
        continue
    out, hits = [], 0
    for l in lines:
        out.append(l)
        if ANCHOR in l:
            out.append(BLOCK)
            hits += 1
    if hits == 0:
        print(f"  {p.name}: anchor not found, skipped")
        continue
    p.write_text("\n".join(out))
    print(f"  {p.name}: inserted at {hits} hook copy/copies")
