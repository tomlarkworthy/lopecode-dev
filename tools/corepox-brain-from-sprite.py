#!/usr/bin/env python3
"""Rebuild art_Brain from the shipped sprite.

Tom, annotating h_Brain, and the 2026-08-19 note agreeing with him: the trace has
the connector teeth OUTSIDE a sharp inner square and no outer frame. The shipped
sprite is the other way round -- a rounded outer frame with the teeth wholly
inside it. Confirmed 2026-08-20 at three magnifications in the running APK:
the build-menu icon, the placed core on the board, and the birthing cutscene
(tools/screenshots/emu/09-brain-icon.png, 11-brain-board.png, 07-birthing.png).

It also renders 27.7% too small (tools/corepox-art-ink.py), which
tools/corepox-anchor-truth.ts could not see: that gate checks the viewBox against
the sprite rect and Brain's viewBox is nearly right -- it is the ink inside it
that is short.

Every number below is measured off data/corepox/sprites/brain.png, in sprite
pixels with the origin at the ink bbox corner (35, 35), then scaled by
56/192 units per pixel (ppu 300, Metric.Tile2Pixel 0.64).

    tools/.venv-unity/bin/python tools/corepox-brain-from-sprite.py [--write]
"""
import re, sys

U = 56.0 / 192.0
INK = 176.0                  # data/corepox/sprite-ink.json -> brain [35,35,176,176]
# Where the ink's top-left corner sits in path space, which is also the viewBox
# origin because the drawing is built to fill its viewBox exactly. NOT free: the
# engine's declared Brain anchor is 24.2, and corepox-anchor-truth.ts reads the
# pivot as origin + 25.70, so any other origin moves the anchor off the pivot.
# Laying the ink from 0 instead cost 2.1 units of anchor error on 2026-08-20.
ORIGIN = -1.51

# --- measured ----------------------------------------------------------------
# corner: leftmost opaque x is 56 at y=35 and reaches the straight edge x=35 at
# y=57, so the arc runs (56,35)->(35,57) about a centre at (57,57).
R_OUT   = 22.0
# centre row y=123: opaque 35..68, amber from 39. Gap row y=85: the frame band is
# red at 36, pale at 38, red again at 42, and the interior gradient starts at 44.
# Modelled as one 6px red stroke with a 2px pale line down its middle, the pair
# inset half the wide stroke so nothing spills past the ink bbox.
W_FRAME = 6.0
W_PALE  = 2.0
# teeth: amber runs of 9 px, 5 per side. Centre row amber 39..68 = 30 px long
# starting 4 px in from the ink edge.
W_TOOTH = 9.0
L_TOOTH = 30.0
T_START = 4.0
# tooth centres, from the four band scans, symmetrised about 88 (the runs read
# 38/62/87.5/113/137 down one side and 39/63/88/114/138 up the other -- 1 px of
# measurement noise, not a real asymmetry).
CENTRES = [38.5, 62.5, 88.0, 113.5, 137.5]
# two teeth are cream instead of amber, and they are baked into the sprite: the
# placed core on the board shows them in the same two places (11-brain-board.png).
# LEFT band 4th from the top, BOTTOM band 5th from the left -- those are exactly
# the two entries missing from the amber runs of those two scans.
PINS = {("L", 3), ("B", 4)}

AMBER = "rgb(237,163,22)"    # px[50,73]
CREAM = "rgb(230,206,156)"   # px[50,148] and px[172,196], averaged
RED   = "rgb(206,87,53)"     # px[36,123]
PALE  = "rgb(236,168,134)"   # px[38,85]
# The interior is a gradient in the sprite: dark amber against the frame
# (px[44,85] = (134,74,16,202)) fading to flat black by 58 px in, where it stays
# (0,0,0,128) to the middle. A <linearGradient> would need an id, and the symbol
# sheet stamps every drawing into <symbol>/<use> where ids collide, so it is
# approximated by two flat fills -- the brown ring and the black centre.
# Row y=85 profiles the fade: (138,80,16,202) at rel 17, (93,54,4,162) at 41,
# then flat (32,18,0,138) from rel 60 to the middle. Two plateaus, so two fills,
# with the outer one HOLED (fill-rule evenodd) -- laying the dark centre over the
# brown instead of through it leaves a milky brown square, which is what the
# first attempt rendered.
RING  = "rgba(105,60,10,0.700)"
CORE  = "rgba(32,18,0,0.540)"
R_CORE = 52.0

def u(v): return round(v * U + ORIGIN, 2)   # a position
def w(v): return round(v * U, 2)             # a length (no origin)

# --- build -------------------------------------------------------------------
i  = W_FRAME / 2                      # frame path inset: keeps the stroke inside the ink
a, b = i, INK - i
O  = ORIGIN / U                       # the same offset, back in sprite pixels
r  = R_OUT - i
frame = (f"M{u(a+r)},{u(a)}L{u(b-r)},{u(a)}C{u(b-r*0.448)},{u(a)},{u(b)},{u(a+r*0.448)},{u(b)},{u(a+r)}"
         f"L{u(b)},{u(b-r)}C{u(b)},{u(b-r*0.448)},{u(b-r*0.448)},{u(b)},{u(b-r)},{u(b)}"
         f"L{u(a+r)},{u(b)}C{u(a+r*0.448)},{u(b)},{u(a)},{u(b-r*0.448)},{u(a)},{u(b-r)}"
         f"L{u(a)},{u(a+r)}C{u(a)},{u(a+r*0.448)},{u(a+r*0.448)},{u(a)},{u(a+r)},{u(a)}Z")

c0, c1 = R_CORE, INK - R_CORE
cr = 10.0
core = (f"M{u(c0+cr)},{u(c0)}L{u(c1-cr)},{u(c0)}C{u(c1-cr*0.448)},{u(c0)},{u(c1)},{u(c0+cr*0.448)},{u(c1)},{u(c0+cr)}"
        f"L{u(c1)},{u(c1-cr)}C{u(c1)},{u(c1-cr*0.448)},{u(c1-cr*0.448)},{u(c1)},{u(c1-cr)},{u(c1)}"
        f"L{u(c0+cr)},{u(c1)}C{u(c0+cr*0.448)},{u(c1)},{u(c0)},{u(c1-cr*0.448)},{u(c0)},{u(c1-cr)}"
        f"L{u(c0)},{u(c0+cr)}C{u(c0)},{u(c0+cr*0.448)},{u(c0+cr*0.448)},{u(c0)},{u(c0+cr)},{u(c0)}Z")

lines = [f'<svg viewBox="{ORIGIN} {ORIGIN} {round(INK*U,2)} {round(INK*U,2)}" width="320.0" height="320.0">',
         f'  <path d="{core}" fill="{CORE}" stroke="none"/>',
         f'  <path d="{frame} {core}" fill="{RING}" fill-rule="evenodd" stroke="none"/>',
         f'  <path d="{frame}" fill="none" stroke="{RED}" stroke-width="{w(W_FRAME)}" stroke-linejoin="round"/>']
p0, p1 = T_START, T_START + L_TOOTH
for side in ("T", "B", "L", "R"):
    for n, c in enumerate(CENTRES):
        col = CREAM if (side, n) in PINS else AMBER
        if   side == "T": d = f"M{u(c)},{u(p0)}L{u(c)},{u(p1)}"
        elif side == "B": d = f"M{u(c)},{u(INK-p0)}L{u(c)},{u(INK-p1)}"
        elif side == "L": d = f"M{u(p0)},{u(c)}L{u(p1)},{u(c)}"
        else:             d = f"M{u(INK-p0)},{u(c)}L{u(INK-p1)},{u(c)}"
        lines.append(f'  <path d="{d}" fill="none" stroke="{col}" stroke-width="{w(W_TOOTH)}"/>')
# the pale centre line goes on last so it reads over the teeth, as it does in the sprite
lines.append(f'  <path d="{frame}" fill="none" stroke="{PALE}" stroke-width="{w(W_PALE)}" stroke-linejoin="round"/>')
lines.append("</svg>")
art = "\n".join(lines)

cell = f"const _art_Brain = function _art_Brain(svg){{return(\nsvg`{art}`\n)}};"
print(f"ink {INK:.0f} px -> {round(INK*U,2)} units; viewBox needs no padding because the "
      f"frame path is inset {i:.0f} px, half its own stroke", file=sys.stderr)

if "--write" in sys.argv:
    p = "modules/@tomlarkworthy/corepox-components.js"
    s = open(p).read()
    pat = re.compile(r"const _art_Brain = function _art_Brain\(svg\)\{return\(\nsvg`.*?`\n\)\};", re.S)
    assert pat.search(s), "art_Brain cell not found"
    open(p, "w").write(pat.sub(lambda _: cell, s, count=1))
    print("written to " + p, file=sys.stderr)
else:
    print(cell)
