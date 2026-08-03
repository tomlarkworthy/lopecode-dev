#!/usr/bin/env python3
"""Insert a markdown note into the @tomlarkworthy/notebook-kit title cell, recording
that the bundle could reuse the shared acorn instead of bundling its own copy.
Idempotent. The cell is a compiled template literal, so backticks are escaped (\\`)."""
import pathlib

TARGETS = [
    "lopebooks/notebooks/@tomlarkworthy_notebook-kit.html",
    "lopebooks/notebooks/@tomlarkworthy_notebook-kit-examples.html",
]
ANCHOR = "Examples [here](https://observablehq.com/@tomlarkworthy/notebook-kit-examples)"
MARKER = "ships its own acorn"
NOTE = (
    "\n\n"
    "Possible optimisation (not done): this bundle ships its own acorn (~116KB of ~177KB). "
    "It could reuse the shared acorn from \\`@tomlarkworthy/acorn-8-11-3\\` instead — build with "
    "acorn external (specifiers \\`/npm/acorn@8.11.3/+esm\\`, \\`/npm/acorn-walk@8.3.2/+esm\\`) and "
    "load via \\`decompress_url(FileAttachment(...gz), {overrides})\\`, the same pattern "
    "\\`parser-6.1.0.js.gz\\` uses. Would also let the attachment be stored gzipped."
)

for t in TARGETS:
    p = pathlib.Path(t)
    text = p.read_text()
    if MARKER in text:
        print(f"  {p.name}: note already present, skipped")
        continue
    if ANCHOR not in text:
        print(f"  {p.name}: anchor not found, skipped")
        continue
    text = text.replace(ANCHOR, ANCHOR + NOTE, 1)
    p.write_text(text)
    print(f"  {p.name}: note inserted")
