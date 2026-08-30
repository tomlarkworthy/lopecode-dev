#!/usr/bin/env python3
"""Make each drawing's RENDERED extent equal the sprite's ink.

The refit set each trace's PATH bbox to the sprite's ink, and the pad then added
half the widest stroke on each side so the halo is not clipped. Those two are
inconsistent: a stroke is centred on the path, so what the drawing actually
covers is path bbox + one stroke width, and every component came out that much
too big -- 8.9% on Armour. corepox-anchor-truth.ts is what caught it, reading
61.0 svg units per tile where it should read 56.

Fixing it is a uniform rescale by ink / current-viewBox, since after the pad the
viewBox IS the rendered extent. Anchors are recomputed from the pivot rather
than scaled, so they do not accumulate the error.

    tools/.venv-unity/bin/python tools/corepox-art-fit-ink.py
    bun tools/corepox-anchor-truth.ts     # 56.0 svg/tile, anchors exact
"""
import json, re, numpy as np

TILE, TILE2PIXEL = 56.0, 0.64
SRC = "modules/@tomlarkworthy/corepox-components.js"
SPRITE_FOR = {"Brain": "brain", "Constant": "constant", "Binary": "binary",
              "Radar": "radar", "Engine": "engine", "Explosive": "explosive",
              "Armour": "armour", "Hyperdrive": "hyperdrive"}
sprites = json.load(open("data/corepox/apk-sprites.json"))
ink = json.load(open("data/corepox/sprite-ink.json"))
NUM = re.compile(r"-?\d*\.?\d+(?:[eE]-?\d+)?")
f = lambda v: f"{v:.2f}".rstrip("0").rstrip(".") if abs(v) >= 0.005 else "0"

def scale_d(d, s):
    out, prev = "", False
    for t in re.findall(r"[A-Za-z]|-?\d*\.?\d+(?:[eE]-?\d+)?", d):
        if t.isalpha(): out += t; prev = False
        else: out += ("," if prev else "") + f(float(t) * s); prev = True
    return out

s_all = open(SRC).read()
rows = []
for type_, sname in SPRITE_FOR.items():
    sp = sprites[sname][0]
    u = TILE / (sp["ppu"] * TILE2PIXEL)
    ix, iy, iw, ih = ink[sname]
    m = re.search(r'(const _art_%s = function _art_%s\(svg\)\{return\(\nsvg`)(.*?)(`\n\)\};)'
                  % (type_, type_), s_all, re.S)
    body = m.group(2)
    vbs = re.search(r'viewBox="([^"]*)"', body).group(1)
    x0, y0, W, H = [float(v) for v in vbs.split()]
    k = ((iw * u / W) + (ih * u / H)) / 2
    if abs(k - 1) < 1e-4:
        rows.append((type_, W, H, W, H, k, 0, 0)); continue
    nb = re.sub(r'\bd="([^"]*)"', lambda mm: 'd="%s"' % scale_d(mm.group(1), k), body)
    nb = re.sub(r'stroke-width="([\d.]+)"',
                lambda mm: 'stroke-width="%s"' % f(float(mm.group(1)) * k), nb)
    nb = re.sub(r"matrix\(([^)]*)\)", lambda mm: "matrix(%s)" % " ".join(
        f(v * k) if i >= 4 else f(v) for i, v in enumerate(float(x) for x in NUM.findall(mm.group(1)))), nb)
    nx0, ny0, nW, nH = x0 * k, y0 * k, W * k, H * k
    nb = nb.replace('viewBox="%s"' % vbs,
                    'viewBox="%.2f %.2f %.2f %.2f"' % (nx0, ny0, nW, nH), 1)
    sc = 320 / max(nW, nH)
    nb = re.sub(r'(<svg viewBox="[^"]*") width="[\d.]+" height="[\d.]+"',
                r'\1 width="%.1f" height="%.1f"' % (nW * sc, nH * sc), nb, count=1)
    s_all = s_all[:m.start(2)] + nb + s_all[m.end(2):]
    # anchor: the pivot's offset into the ink, placed relative to the viewBox origin
    ax = nx0 + (sp["pivot"][0] * sp["rect"][2] - ix) * u
    ay = ny0 + ((1 - sp["pivot"][1]) * sp["rect"][3] - iy) * u
    s_all = re.sub(r'(\n  %s:\s*\["[\w-]+",)\s*-?[\d.]+,\s*-?[\d.]+\]' % type_,
                   lambda mm: '%s %7.1f, %5.1f]' % (mm.group(1), ax, ay), s_all, count=1)
    rows.append((type_, W, H, nW, nH, k, ax, ay))
open(SRC, "w").write(s_all)
print(f"{'type':<12}{'viewBox was':>14}{'now':>14}  scale     anchor")
for t, W, H, nW, nH, k, ax, ay in rows:
    print(f"{t:<12}{W:7.1f}x{H:5.1f}{nW:8.1f}x{nH:5.1f}  {k:5.3f}  {ax:7.1f},{ay:6.1f}")
