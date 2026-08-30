"""Recover joint slots from the vector art, using Tom's rule: a curved corner does
not admit a connector. Straight boundary segments take joints, curves do not.

The art grid is 64 units/cell (Binary snaps to 0/64/128/192 x, 0/32/64/96/128 y),
and each cell side carries 2 slots of 32 units, matching the in-game screenshot
(dots ~89px apart against a 178px cell pitch)."""
import re, sys, math
# The art was exported at inconsistent scales -- Binary is 64 units/cell, the
# components-page variants 56, Radar ~59 -- so the unit is derived per symbol from
# the footprint established against the corpus, not assumed globally.
CELLS = {'binary': (3,2), 'radar': (2,3), 'orb': (2,2), 'armour-2': (1,1),
         'constant-3': (1,1), 'explosive-3': (1,1), 'engine-3': (1,2),
         'lazer-2': (1,3), 'turret2': (5,3), 'brain': (1,1), 'energy-store': (1,1)}
# Only these cells are real body; the rest of the bounding box is empty. Binary is a
# T inside a 3x2 box, so its two upper notch cells must not report joints.
MASK = {'binary': {(0,1),(1,1),(2,1),(1,0)}}
U = 64.0
S = 32.0

src = open('modules/@tomlarkworthy/corepox-assets.js').read()

def outline(name):
    m = re.search(r'<symbol id="cp-%s"[^>]*viewBox="0 0 ([\d.]+) ([\d.]+)"[^>]*>(.*?)</symbol>' % name, src, re.S)
    if not m: return None
    w, h, body = float(m.group(1)), float(m.group(2)), m.group(3)
    d = re.search(r'<path[^>]*d="([^"]+)"', body)
    return (w, h, d.group(1)) if d else None

def segments(d):
    """Yield (kind, p0, p1) where kind is 'L' (straight) or 'C' (curve).
    A cubic whose control points are collinear with its endpoints is straight."""
    toks = re.findall(r'([MLCZ])([^MLCZ]*)', d)
    cur = start = None
    for cmd, arg in toks:
        n = [float(v) for v in re.findall(r'-?[\d.]+', arg)]
        if cmd == 'M': cur = start = (n[0], n[1])
        elif cmd == 'L':
            p = (n[0], n[1]); yield ('L', cur, p); cur = p
        elif cmd == 'C':
            c1, c2, p = (n[0],n[1]), (n[2],n[3]), (n[4],n[5])
            def off(c):
                ax, ay = p[0]-cur[0], p[1]-cur[1]
                L = math.hypot(ax, ay)
                if L < 1e-9: return 1e9
                return abs((c[0]-cur[0])*ay - (c[1]-cur[1])*ax) / L
            straight = off(c1) < 1.0 and off(c2) < 1.0
            yield ('L' if straight else 'C', cur, p); cur = p
        elif cmd == 'Z':
            if cur and start and cur != start: yield ('L', cur, start)
            cur = start

def straight_spans(d):
    """Straight boundary segments, as ('H'|'V', fixed, lo, hi) in art units."""
    out = []
    for kind, a, b in segments(d):
        if kind != 'L': continue
        if abs(a[0]-b[0]) < 1.5 and abs(a[1]-b[1]) > 1.5:
            out.append(('V', (a[0]+b[0])/2, min(a[1],b[1]), max(a[1],b[1])))
        elif abs(a[1]-b[1]) < 1.5 and abs(a[0]-b[0]) > 1.5:
            out.append(('H', (a[1]+b[1])/2, min(a[0],b[0]), max(a[0],b[0])))
    return out

def analyse(name):
    o = outline(name)
    if not o: return f"{name}: no outline"
    w, h, d = o
    cw, ch = CELLS.get(name, (round(w/64), round(h/64)))
    U = max(w/cw, h/ch); S = U/2
    spans = straight_spans(d)
    def covered(axis, fixed, lo, hi):
        for k, f, a, b in spans:
            if k != axis: continue
            if abs(f - fixed) > U*0.18: continue      # on this face line
            if a <= lo + U*0.12 and b >= hi - U*0.12: return True
        return False
    out = [f"{name}: {cw}x{ch} cells, {U:.1f} units/cell"]
    total = 0
    for cy in range(ch):
        for cx in range(cw):
            x0, y0 = cx*U, cy*U
            f = {}
            for side, axis, fixed, base in (('N','H',y0,x0), ('S','H',y0+U,x0),
                                            ('W','V',x0,y0), ('E','V',x0+U,y0)):
                got = [i for i in (0,1)
                       if covered(axis, fixed, base+i*S, base+(i+1)*S)]
                if got: f[side] = got; total += len(got)
            if MASK.get(name) and (cx,cy) not in MASK[name]: continue
            if f:
                out.append("   cell (%d,%d)  " % (cx,cy) +
                           "  ".join(f"{s}:{f[s]}" for s in 'NESW' if s in f))
    out.append(f"   -> {total} joint slots")
    return "\n".join(out)

for n in (sys.argv[1:] or ['binary','radar','orb','armour-2','constant-3',
                           'explosive-3','engine-3','lazer-2','brain']):
    print(analyse(n)); print()
