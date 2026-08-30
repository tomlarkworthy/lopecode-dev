#!/usr/bin/env python3
"""Generate a lopecode module from DRAFT.md: one editable-md `md` cell per markdown block."""
import re, sys

DRAFT = "scratch/blogs/llm_bash/DRAFT.md"
OUT = "modules/@tomlarkworthy/why-claude-code-codes-well.js"
MODNAME = "@tomlarkworthy/why-claude-code-codes-well"

src = open(DRAFT, encoding="utf-8").read()

# Split into blocks separated by blank lines, but keep multi-line tables intact.
lines = src.split("\n")
blocks, cur = [], []
for ln in lines:
    if ln.strip() == "":
        if cur:
            blocks.append("\n".join(cur))
            cur = []
    else:
        cur.append(ln)
if cur:
    blocks.append("\n".join(cur))

def esc(s):
    s = s.replace("\\", "\\\\")
    s = s.replace("`", "\\`")
    s = s.replace("${", "\\${")
    return s

# Whole-line angle-bracket placeholders (<graph of mimo>) -> visible TODO callout.
def transform(b):
    if re.fullmatch(r"<[^>]+>", b.strip()):
        return "> **TODO placeholder:** `" + b.strip() + "`"
    return b

cells = []
for i, b in enumerate(blocks):
    cells.append((f"p{i}", f"_blog{i}", transform(b)))

out = []
for pid, fn, body in cells:
    out.append(f"const {fn} = function {fn}(md){{return(\nmd`{esc(body)}`\n)}};\n")

out.append("export default function define(runtime, observer) {\n")
out.append("  const main = runtime.module();\n")
out.append("  const $def = (pid, name, deps, fn) => {\n")
out.append("    main.variable(observer(name)).define(name, deps, fn).pid = pid;\n")
out.append("  };\n")
out.append('  main.define("module @tomlarkworthy/editable-md", async () => runtime.module((await import("/@tomlarkworthy/editable-md.js?v=4")).default));\n')
for pid, fn, body in cells:
    out.append(f'  $def("{pid}", null, ["md"], {fn});\n')
out.append('  main.define("md", ["module @tomlarkworthy/editable-md", "@variable"], (_, v) => v.import("md", _));\n')
out.append("  return main;\n")
out.append("}\n")

open(OUT, "w", encoding="utf-8").write("".join(out))
print(f"wrote {OUT}: {len(cells)} cells")
for pid, fn, body in cells:
    print(f"  {pid} {fn}: {body[:60].splitlines()[0] if body else ''!r}")
