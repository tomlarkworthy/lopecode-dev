# Does each art cell DRAW at the size the shipped sprite draws at?
#
# The other art gates check anchors (corepox-anchor-truth.ts) and the joint
# frame (corepox-art-frame.ts). Neither looks at how big the drawing comes out,
# so a cell whose ink is 28% short of the sprite passes both -- which is exactly
# what Brain was doing on 2026-08-20.
#
# drawComponent scales by `art unit / ART_TILE = tile` (corepox-components.js:177),
# so the viewBox does NOT set the size -- the ink extent does. The sprite ruler is
# 192 px per tile, so one sprite pixel is 56/192 units.
#
#   python3 tools/corepox-art-ink.py [--tol 0.04]
import json, re, sys, math

U = 56.0 / 192.0
SRC = "modules/@tomlarkworthy/corepox-components.js"
INK = json.load(open("data/corepox/sprite-ink.json"))
# art cell -> sprite key. Lazer/Orb/LaserTurret2 have no single sprite to measure.
FOR = {"Brain": "brain", "Constant": "constant", "Binary": "binary",
       "Radar": "radar", "Engine": "engine", "Explosive": "explosive",
       "Armour": "armour", "Hyperdrive": "hyperdrive"}

# The Orb cannot share the ruler above: its prefab is the only one not at scale 1
# and its sprite is not at ppu 300. Orb.prefab (Assets/prefabs/components/Resources)
# has root localScale 0.33 and a child `weapon` drawing orb_weapon, 813 px @ ppu 100.
# A glow has no ink threshold -- the alpha runs to zero at the rect edge, so the
# whole rect IS the extent. Converting to the ppu-300 pixels U expects:
#   813 * (300/100) * 0.33 = 804.9 px = 4.192 tiles across.
# Verified twice over: the rail sprite `orb` (339 x 48) comes out 1.75 x 0.25 tiles
# at the same 0.33, which is the size of the root BoxCollider2D, and the weapon's
# CircleCollider2D radius 1.1 comes out at r/R 0.27, where the white core ends.
SPECIAL = {"Orb": "orb_weapon"}
SPECIAL_PX = {"Orb": (813 * 3 * 0.33, 813 * 3 * 0.33)}

src = open(SRC).read()
tol = float(sys.argv[sys.argv.index("--tol") + 1]) if "--tol" in sys.argv else 0.04

NUM = re.compile(r"-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?")

def cell(name):
    m = re.search(r"const _art_%s = function[^`]*`(.*?)`\n\)\};" % name, src, re.S)
    return m.group(1) if m else None

def ink(body):
    """Bounding box of everything drawn, stroke included. Cubic control points
    bound the curve, so a curvy drawing reads at most a hair large -- never small,
    which is the direction that matters here."""
    lo = [math.inf, math.inf]; hi = [-math.inf, -math.inf]
    for tag in re.finditer(r"<path\b[^>]*>", body):
        t = tag.group(0)
        d = re.search(r'\sd="([^"]*)"', t)
        if not d: continue
        sw = re.search(r'stroke-width="([\d.]+)"', t)
        w = float(sw.group(1)) / 2 if sw and 'stroke="none"' not in t else 0.0
        n = [float(x) for x in NUM.findall(d.group(1))]
        for i in range(0, len(n) - 1, 2):
            lo[0] = min(lo[0], n[i] - w);   hi[0] = max(hi[0], n[i] + w)
            lo[1] = min(lo[1], n[i+1] - w); hi[1] = max(hi[1], n[i+1] + w)
    return hi[0] - lo[0], hi[1] - lo[1]

bad = 0
print(f"{'cell':<12} {'drawn w x h':<20} {'sprite wants':<20} {'error'}")
for name, key in list(FOR.items()) + list(SPECIAL.items()):
    b = cell(name)
    if b is None: print(f"{name:<12} NO CELL"); bad += 1; continue
    # a y-mirror <g> does not change extents, so the flat path scan is enough
    dw, dh = ink(b)
    px = SPECIAL_PX[name] if name in SPECIAL else (INK[key][2], INK[key][3])
    wx, wy = px[0] * U, px[1] * U
    ex, ey = dw / wx - 1, dh / wy - 1
    flag = "" if max(abs(ex), abs(ey)) <= tol else "   <-- OFF"
    if flag: bad += 1
    print(f"{name:<12} {dw:7.2f} x {dh:7.2f}    {wx:7.2f} x {wy:7.2f}    "
          f"{ex*100:+6.1f}% {ey*100:+6.1f}%{flag}")
n = len(FOR) + len(SPECIAL)
print(f"\n{n-bad}/{n} within {tol*100:.0f}% of the shipped sprite")
sys.exit(1 if bad else 0)
