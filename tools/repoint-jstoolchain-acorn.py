#!/usr/bin/env python3
"""Repoint @tomlarkworthy/js-toolchain's acorn/acorn_walk reactive imports from
@tomlarkworthy/observablejs-toolchain to @tomlarkworthy/acorn-8-11-3, scoped to the
js-toolchain module <script> block only (other modules keep importing from
observablejs-toolchain)."""
import re, sys

TGT = "lopebooks/notebooks/@tomlarkworthy_notebook-kit.html"

html = open(TGT, encoding="utf-8").read()

# isolate the js-toolchain module script block
m = re.search(
    r'<script\b[^>]*\bid="@tomlarkworthy/js-toolchain"[^>]*>.*?</script>',
    html, re.DOTALL)
if not m:
    sys.exit("js-toolchain module block not found")
block = m.group(0)

repls = [
    # module loader
    ('main.define("module @tomlarkworthy/observablejs-toolchain", async () => runtime.module((await import("/@tomlarkworthy/observablejs-toolchain.js?v=4")).default));',
     'main.define("module @tomlarkworthy/acorn-8-11-3", async () => runtime.module((await import("/@tomlarkworthy/acorn-8-11-3.js?v=4")).default));'),
    # acorn binding
    ('main.define("acorn", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("acorn", _));',
     'main.define("acorn", ["module @tomlarkworthy/acorn-8-11-3", "@variable"], (_, v) => v.import("acorn", _));'),
    # acorn_walk binding
    ('main.define("acorn_walk", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("acorn_walk", _));',
     'main.define("acorn_walk", ["module @tomlarkworthy/acorn-8-11-3", "@variable"], (_, v) => v.import("acorn_walk", _));'),
]

new_block = block
for old, new in repls:
    n = new_block.count(old)
    if n != 1:
        sys.exit(f"expected exactly 1 occurrence in js-toolchain block, found {n}:\n  {old[:80]}...")
    new_block = new_block.replace(old, new)

html = html[:m.start()] + new_block + html[m.end():]
open(TGT, "w", encoding="utf-8").write(html)
print("repointed js-toolchain acorn/acorn_walk -> @tomlarkworthy/acorn-8-11-3")
