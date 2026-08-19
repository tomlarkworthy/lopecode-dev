#!/usr/bin/env python3
"""Rescale each component drawing so one tile is exactly ART_TILE svg units.

corepox-anchor-truth.ts prints, per component, the trace's own scale --
W / (rect / (ppu * Metric.Tile2Pixel)) -- and it should read 56 for every one or
the trace is not the sprite. It read 47.2 to 64.0: the traces were each
normalised to their own drawing rather than to a common tile, so the game has
been drawing Armour 16% small and Brain 14% large the whole time. Binary is the
one that shows it, 3.45 tiles of art on a 3-tile footprint, which is what
"the binary SVG does not fit inside its footprint" was reporting.

Every sprite is ppu 300 and Metric.Tile2Pixel is 0.64, so one tile is 192 px in
every one of them and the conversion is a single constant:

    56 svg units / 192 px = 0.291667 units per pixel

The scale is taken from the sprite's INK, not from its rect. A first pass used
the rect and came out 27% large on Constant: the rect carries the glow's
transparent padding (Constant's 222 px rect holds a 174 px square), and the SVG
traces have no such padding -- their path bbox IS the ink. Matching rect to
viewBox therefore matches the wrong two things.

    tools/.venv-unity/bin/python tools/corepox-art-refit.py
    bun tools/corepox-anchor-truth.ts        # svg/tile 56.0,56.0, anchors exact
"""
import json, re, math, sys
import numpy as np
from PIL import Image

TILE, TILE2PIXEL, ALPHA = 56.0, 0.64, 200
SRC = "modules/@tomlarkworthy/corepox-components.js"
SPRITE_FOR = {"Brain": "brain", "Constant": "constant", "Binary": "binary",
              "Radar": "radar", "Engine": "engine", "Explosive": "explosive",
              "Armour": "armour", "Hyperdrive": "hyperdrive"}

sprites = json.load(open("data/corepox/apk-sprites.json"))
src = open(SRC).read()
NUM = re.compile(r"-?\d*\.?\d+(?:[eE]-?\d+)?")

def ink(name):
    """bbox of the sprite's solid ink, in pixels from the rect's top-left."""
    a = np.array(Image.open(f"data/corepox/sprites/{name}.png").convert("RGBA"))
    ys, xs = np.nonzero(a[..., 3] > ALPHA)
    return xs.min(), ys.min(), xs.max() - xs.min() + 1, ys.max() - ys.min() + 1

def fmt(v):
    return f"{v:.2f}".rstrip("0").rstrip(".") if abs(v) >= 0.005 else "0"

def scale_d(d, s):
    out, prev_num = "", False
    for t in re.findall(r"[A-Za-z]|-?\d*\.?\d+(?:[eE]-?\d+)?", d):
        if t.isalpha(): out += t; prev_num = False
        else:
            out += ("," if prev_num else "") + fmt(float(t) * s); prev_num = True
    return out

def scale_cell(body, s):
    body = re.sub(r'\bd="([^"]*)"', lambda m: 'd="%s"' % scale_d(m.group(1), s), body)
    body = re.sub(r'stroke-width="([\d.]+)"',
                  lambda m: 'stroke-width="%s"' % fmt(float(m.group(1)) * s), body)
    # matrix(a b c d e f): a uniform scale commutes with the linear part, so only
    # the translation moves.
    def mat(m):
        a, b, c, d, e, f = [float(x) for x in NUM.findall(m.group(1))]
        return "matrix(%s %s %s %s %s %s)" % tuple(fmt(v) for v in (a, b, c, d, e * s, f * s))
    return re.sub(r"matrix\(([^)]*)\)", mat, body)

report = []
for type_, sname in SPRITE_FOR.items():
    sp = sprites[sname][0]
    u = TILE / (sp["ppu"] * TILE2PIXEL)                     # svg units per sprite pixel
    ix, iy, iw, ih = ink(sname)
    pat = re.compile(r"(const _art_%s = function _art_%s\(svg\)\{return\(\nsvg`)(.*?)(`\n\)\};)"
                     % (type_, type_), re.S)
    m = pat.search(src)
    if not m: sys.exit("no art cell for " + type_)
    body = m.group(2)
    vbs = re.search(r'viewBox="([^"]*)"', body).group(1)
    W, H = [float(x) for x in NUM.findall(vbs)][2:4]
    nW, nH = iw * u, ih * u
    s = ((nW / W) + (nH / H)) / 2                           # uniform: the traces keep their aspect
    nb = scale_cell(body, s)
    nb = nb.replace('viewBox="%s"' % vbs, 'viewBox="0 0 %.2f %.2f"' % (W * s, H * s), 1)
    k = 320 / max(W * s, H * s)
    nb = re.sub(r'(<svg viewBox="[^"]*") width="[\d.]+" height="[\d.]+"',
                r'\1 width="%.1f" height="%.1f"' % (W * s * k, H * s * k), nb, count=1)
    src = src[:m.start(2)] + nb + src[m.end(2):]
    # The pivot is a fraction of the RECT; the drawing starts at the ink.
    ax = (sp["pivot"][0] * sp["rect"][2] - ix) * u
    ay = ((1 - sp["pivot"][1]) * sp["rect"][3] - iy) * u
    src = re.sub(r'(\n  %s:\s*\["[\w-]+",)\s*[\d.]+,\s*[\d.]+\]' % type_,
                 lambda mm: '%s %7.1f, %5.1f]' % (mm.group(1), ax, ay), src, count=1)
    report.append((type_, W, H, W * s, H * s, s, nW / TILE, nH / TILE, ax, ay))

open(SRC, "w").write(src)
print(f"{'type':<12}{'viewBox was':>14}{'now':>14}  scale   ink tiles      anchor")
for t, W, H, nW, nH, s, tw, th, ax, ay in report:
    print(f"{t:<12}{W:7.1f}x{H:5.1f}{nW:8.1f}x{nH:5.1f}  {s:5.3f}"
          f"  {tw:4.2f}x{th:4.2f}  {ax:7.1f},{ay:6.1f}")
print("\nLazer, Orb and LaserTurret2 are untouched: no single sprite maps onto them.")
