#!/usr/bin/env python3
"""Round the corners the tracer squared off.

Tom on h_Constant: "should have slightly rounded corners". The shipped sprites
round the same corner on four more components and the Sketch-derived traces
square all of them -- measured off the top row of solid ink in each PNG:

    constant   20px    armour   19px    explosive  20px

at 56/192 units per pixel. Only paths that are an axis-aligned rectangle covering
most of their viewBox are touched, which is the component's body; Brain's 41
other paths (the connector teeth) are left alone.

    tools/.venv-unity/bin/python tools/corepox-art-round.py
"""
import re, numpy as np
from PIL import Image

U = 56 / 192.0
SRC = "modules/@tomlarkworthy/corepox-components.js"
# Brain is deliberately absent. Its trace is a 36.2-unit inner square with the
# connector teeth OUTSIDE it; the sprite has a rounded outer frame enclosing the
# teeth and a grey inner square. Rounding a corner there would not make it the
# shipped drawing, it would just move one line -- Brain needs redrawing, not
# rounding.
TARGETS = {"Armour": "armour", "Explosive": "explosive"}

def radius_px(name):
    a = np.array(Image.open(f"data/corepox/sprites/{name}.png").convert("RGBA"))
    c = a[..., 3] > 200
    ys, xs = np.nonzero(c)
    return np.nonzero(c[ys.min()])[0].min() - xs.min()

def rect_of(d):
    """(x0,y0,x1,y1) if d is an axis-aligned rectangle, else None"""
    if not re.fullmatch(r"M[\d.,\-]+(L[\d.,\-]+){3,4}Z", d): return None
    pts = [tuple(float(v) for v in p.split(",")) for p in re.split(r"[MLZ]", d) if p]
    if len(pts) > 4 and pts[-1] == pts[0]: pts = pts[:-1]
    if len(pts) != 4: return None
    xs, ys = {p[0] for p in pts}, {p[1] for p in pts}
    if len(xs) != 2 or len(ys) != 2: return None
    return min(xs), min(ys), max(xs), max(ys)

f = lambda v: f"{v:.2f}".rstrip("0").rstrip(".")
def rounded(x0, y0, x1, y1, r):
    a = r - 0.5523 * r
    return (f"M{f(x0+r)},{f(y0)}L{f(x1-r)},{f(y0)}C{f(x1-a)},{f(y0)},{f(x1)},{f(y0+a)},{f(x1)},{f(y0+r)}"
            f"L{f(x1)},{f(y1-r)}C{f(x1)},{f(y1-a)},{f(x1-a)},{f(y1)},{f(x1-r)},{f(y1)}"
            f"L{f(x0+r)},{f(y1)}C{f(x0+a)},{f(y1)},{f(x0)},{f(y1-a)},{f(x0)},{f(y1-r)}"
            f"L{f(x0)},{f(y0+r)}C{f(x0)},{f(y0+a)},{f(x0+a)},{f(y0)},{f(x0+r)},{f(y0)}Z")

s = open(SRC).read()
for type_, sprite in TARGETS.items():
    r = radius_px(sprite) * U
    m = re.search(r'(const _art_%s = function _art_%s\(svg\)\{return\(\nsvg`)(.*?)(`\n\)\};)'
                  % (type_, type_), s, re.S)
    body = m.group(2)
    vb = [float(v) for v in re.search(r'viewBox="([^"]*)"', body).group(1).split()]
    span = max(vb[2], vb[3])
    n = 0
    def sub(dm):
        global n
        rc = rect_of(dm.group(1))
        if not rc or (rc[2] - rc[0]) < 0.9 * span or (rc[3] - rc[1]) < 0.9 * span:
            return dm.group(0)
        n += 1
        return 'd="%s"' % rounded(*rc, r)
    nb = re.sub(r'\bd="([^"]*)"', sub, body)
    s = s[:m.start(2)] + nb + s[m.end(2):]
    print(f"{type_:<11} r {radius_px(sprite)}px = {r:.2f} units   {n} body path(s) rounded")
open(SRC, "w").write(s)
