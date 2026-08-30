#!/usr/bin/env python3
"""Rebuild art_Radar from the shipped sprite.

Tom, annotating h_Radar in the notebook: "this was not the final design for radar.
I think we shipped something with a circle for the 2x2 top part. And range was
indicated by a seperatly animated dial."

data/corepox/sprites/radar.png says the same thing and is measurable: a green
ring 2 tiles across with a small dot at its centre, sitting on a yellow base
whose top edge dips. The trace that was in the notebook is a stack of rectangles
with magenta marks -- an earlier design, not this one.

Everything below is measured off that PNG at 56/192 units per pixel (ppu 300,
Metric.Tile2Pixel 0.64), with the drawing's origin at the ink's top-left corner
(24, 21). Curves are least-squares cubics; the residuals are printed so the fit
can be judged rather than trusted.

    tools/.venv-unity/bin/python tools/corepox-radar-from-sprite.py
"""
import numpy as np, re
from PIL import Image

U = 56 / 192.0
OX, OY = 24, 21
a = np.array(Image.open("data/corepox/sprites/radar.png").convert("RGBA")).astype(int)
solid = a[..., 3] > 200
yellow = solid & (a[..., 0] > 150) & (a[..., 1] > 150) & (a[..., 2] < 140)
green = solid & (a[..., 1] > 150) & (a[..., 0] < 160) & (a[..., 2] < 160)

def runs(mask):
    idx = np.nonzero(mask)[0]
    return [] if not len(idx) else np.split(idx, np.where(np.diff(idx) != 1)[0] + 1)

X = lambda px: (px - OX) * U
Y = lambda py: (py - OY) * U

# --- the ring, from the green pixels that are not the centre dot
ys, xs = np.nonzero(green)
cx, cy = xs.mean(), ys.mean()
ring = np.hypot(xs - cx, ys - cy) > 20
cx, cy = xs[ring].mean(), ys[ring].mean()
R = np.hypot(xs[ring] - cx, ys[ring] - cy).mean()
dot = ~ring
dr = np.hypot(xs[dot] - cx, ys[dot] - cy).max() if dot.sum() else 0
print(f"ring  centre ({cx:.1f},{cy:.1f}) r {R:.1f}px  sd {np.hypot(xs[ring]-cx, ys[ring]-cy).std():.1f}"
      f"   dot r {dr:.1f}px")

# --- the base outline's centre-line
left = [(runs(yellow[y])[0].mean(), y) for y in range(362, 560) if runs(yellow[y])]
top = [(x, runs(yellow[:, x])[0].mean()) for x in range(82, 334) if runs(yellow[:, x])]
MIRROR = 206.5                                    # left 81 <-> right 332, 24.5 <-> 388.5

def fit_cubic(pts, p0, p3):
    """least-squares control points for a cubic through pts, endpoints pinned"""
    P = np.array(pts, float)
    t = np.r_[0, np.cumsum(np.hypot(*np.diff(P, axis=0).T))]
    t /= t[-1]
    B1, B2 = 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t ** 2
    rhs = P - np.outer((1 - t) ** 3, p0) - np.outer(t ** 3, p3)
    A = np.column_stack([B1, B2])
    sol, *_ = np.linalg.lstsq(A, rhs, rcond=None)
    fit = (np.outer((1 - t) ** 3, p0) + np.outer(B1, sol[0]) +
           np.outer(B2, sol[1]) + np.outer(t ** 3, p3))
    return sol[0], sol[1], np.hypot(*(fit - P).T).max()

SHOULDER, SIDE_END, STRAIGHT_END = (81.0, 362), (24.5, 488), 558
lp = [p for p in left if p[1] <= SIDE_END[1]]
l1, l2, lerr = fit_cubic(lp, SHOULDER, SIDE_END)
t1, t2, terr = fit_cubic(top, SHOULDER, (332.0, 362))
print(f"side  cubic residual {lerr:.1f}px over {len(lp)} rows")
print(f"top   cubic residual {terr:.1f}px over {len(top)} columns")

# bottom: the straight run, then a corner into the bottom edge
bot_y = max(y for y in range(560, 600) if runs(yellow[y]))
bot_y -= 2.5                                      # stroke is ~6px, take its centre
corner = 24.5 + 14.5
f = lambda v: f"{v:.2f}".rstrip("0").rstrip(".")
def P(px, py): return f"{f(X(px))},{f(Y(py))}"
mir = lambda px: 2 * MIRROR - px

d_base = (
  f"M{P(*SHOULDER)}"
  f"C{P(*l1)},{P(*l2)},{P(*SIDE_END)}"
  f"L{P(24.5, STRAIGHT_END)}"
  f"C{P(24.5, STRAIGHT_END + 10)},{P(corner - 10, bot_y)},{P(corner, bot_y)}"
  f"L{P(mir(corner), bot_y)}"
  f"C{P(mir(corner - 10), bot_y)},{P(mir(24.5), STRAIGHT_END + 10)},{P(mir(24.5), STRAIGHT_END)}"
  f"L{P(mir(24.5), SIDE_END[1])}"
  f"C{P(mir(l2[0]), l2[1])},{P(mir(l1[0]), l1[1])},{P(mir(SHOULDER[0]), SHOULDER[1])}"
  # the top edge is walked right-to-left here, so its controls come back in
  # reverse order -- NOT mirrored, which turned the dip inside out first try
  f"C{P(*t2)},{P(*t1)},{P(*SHOULDER)}Z")

k = 0.5523 * R
d_ring = (f"M{P(cx, cy - R)}C{P(cx + k, cy - R)},{P(cx + R, cy - k)},{P(cx + R, cy)}"
          f"C{P(cx + R, cy + k)},{P(cx + k, cy + R)},{P(cx, cy + R)}"
          f"C{P(cx - k, cy + R)},{P(cx - R, cy + k)},{P(cx - R, cy)}"
          f"C{P(cx - R, cy - k)},{P(cx - k, cy - R)},{P(cx, cy - R)}Z")
kd = 0.5523 * dr
d_dot = (f"M{P(cx, cy - dr)}C{P(cx + kd, cy - dr)},{P(cx + dr, cy - kd)},{P(cx + dr, cy)}"
         f"C{P(cx + dr, cy + kd)},{P(cx + kd, cy + dr)},{P(cx, cy + dr)}"
         f"C{P(cx - kd, cy + dr)},{P(cx - dr, cy + kd)},{P(cx - dr, cy)}"
         f"C{P(cx - dr, cy - kd)},{P(cx - kd, cy - dr)},{P(cx, cy - dr)}Z")

ys, xs = np.nonzero(solid)
W, H = (xs.max() - xs.min() + 1) * U, (ys.max() - ys.min() + 1) * U
sc = 320 / max(W, H)
# Stroke pairs measured off the cross-sections: 6px of solid with a ~2px pale
# core, both for the ring (column x=207) and for the base (row y=520). Fills are
# the interior alphas: 76/255 inside the ring, 129/255 inside the base.
art = f'''<svg viewBox="0 0 {W:.2f} {H:.2f}" width="{W*sc:.1f}" height="{H*sc:.1f}">
  <path d="{d_base}" fill="rgba(0,0,0,0.506)" stroke="rgb(226,226,56)" stroke-width="{f(6*U)}" stroke-linejoin="round"/>
  <path d="{d_base}" fill="none" stroke="rgb(229,229,212)" stroke-width="{f(2*U)}" stroke-linejoin="round"/>
  <path d="{d_ring}" fill="rgba(0,0,0,0.298)" stroke="rgb(128,227,128)" stroke-width="{f(6*U)}" stroke-linejoin="round"/>
  <path d="{d_ring}" fill="none" stroke="rgb(195,231,195)" stroke-width="{f(2*U)}" stroke-linejoin="round"/>
  <path d="{d_dot}" fill="none" stroke="rgb(128,227,128)" stroke-width="{f(2*U)}" stroke-linejoin="round"/>
</svg>'''

SRC = "modules/@tomlarkworthy/corepox-components.js"
s = open(SRC).read()
m = re.search(r'(const _art_Radar = function _art_Radar\(svg\)\{return\(\nsvg`)(.*?)(`\n\)\};)', s, re.S)
open(SRC, "w").write(s[:m.start(2)] + art + s[m.end(2):])
print(f"\nviewBox {W:.2f} x {H:.2f}  ({W/56:.2f} x {H/56:.2f} tiles, footprint is 2x3)")
print(art)
