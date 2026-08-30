#!/usr/bin/env python3
"""Give every component drawing room for its own halo stroke.

A trace's path sits ON its bounding box, and the halo is a wide stroke CENTRED on
that path, so half of it falls outside the viewBox and is clipped. In the section
that shows as bright square notches at Constant's corners once the corners were
rounded; in the game it is worse and quieter, because symbolSheet turns each
drawing into a <symbol> and a <use> of a symbol clips to its viewport too -- the
outer half of every halo has been cut off on the board the whole time.

The fix costs no geometry: the viewBox origin goes negative by half the widest
stroke. Path coordinates, anchors in SYMBOL_FOR and drawComponent's frame maths
are all unchanged (drawComponent already reads vb[0]/vb[1]).

Idempotent -- a drawing whose viewBox origin is already negative is left alone.

    python3 tools/corepox-art-pad.py
"""
import re
SRC = "modules/@tomlarkworthy/corepox-components.js"
s = open(SRC).read()
out = []
for m in list(re.finditer(r'(const _art_(\w+) = function _art_\w+\(svg\)\{return\(\nsvg`)(.*?)(`\n\)\};)',
                          s, re.S))[::-1]:
    type_, body = m.group(2), m.group(3)
    vbm = re.search(r'viewBox="([^"]*)"', body)
    x0, y0, W, H = [float(v) for v in vbm.group(1).split()]
    if x0 < 0 or y0 < 0:
        out.append((type_, "already padded")); continue
    widths = [float(w) for w in re.findall(r'stroke-width="([\d.]+)"', body)]
    h = (max(widths) / 2) if widths else 0
    if h == 0:
        out.append((type_, "no strokes")); continue
    nW, nH = W + 2 * h, H + 2 * h
    nb = body.replace(vbm.group(0), 'viewBox="%.2f %.2f %.2f %.2f"' % (-h, -h, nW, nH), 1)
    k = 320 / max(nW, nH)
    nb = re.sub(r'(<svg viewBox="[^"]*") width="[\d.]+" height="[\d.]+"',
                r'\1 width="%.1f" height="%.1f"' % (nW * k, nH * k), nb, count=1)
    s = s[:m.start(3)] + nb + s[m.end(3):]
    out.append((type_, f"pad {h:.2f}  {W:.1f}x{H:.1f} -> {nW:.1f}x{nH:.1f}"))
open(SRC, "w").write(s)
for t, msg in out[::-1]: print(f"{t:<13}{msg}")
