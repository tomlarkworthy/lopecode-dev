#!/usr/bin/env python3
"""Sketch 43+ (.sketch = zip of JSON) -> SVG <symbol> sprite.

Model notes, learned from vendor/corepox's design.sketch:
  * a shapeGroup is ONE shape. Its children are subpaths that share the group's
    style, so they must be merged into a single <path> (fill-rule evenodd
    approximates the boolean ops), not emitted as styled shapes each.
  * point coords are normalised to the layer frame, so nesting needs a real
    affine, not a stack of SVG transforms -- subpaths of one <path> cannot
    each carry their own.
  * symbolInstance -> <use>. Sketch resolves these by symbolID, not by name.

Not handled: bitmap fills, shadows, blend modes, angular gradients (approximated
as linear), text alignment. Anything unhandled is reported on stderr.
"""
import json, sys, re, math, argparse, os, zipfile, tempfile, shutil

NUM = re.compile(r'-?\d+\.?\d*(?:[eE]-?\d+)?')
warn = lambda m: print('  ! ' + m, file=sys.stderr)


def pt(s):
    a, b = NUM.findall(s)[:2]
    return float(a), float(b)


def col(c):
    if not c:
        return 'none'
    r, g, b = (int(round(c.get(k, 0) * 255)) for k in ('red', 'green', 'blue'))
    a = c.get('alpha', 1)
    return f'rgb({r},{g},{b})' if a >= .999 else f'rgba({r},{g},{b},{a:.3f})'


# --- affine ----------------------------------------------------------------
I = (1., 0., 0., 1., 0., 0.)


def mul(m, n):
    a, b, c, d, e, f = m
    A, B, C, D, E, F = n
    return (a * A + c * B, b * A + d * B,
            a * C + c * D, b * C + d * D,
            a * E + c * F + e, b * E + d * F + f)


def apply(m, x, y):
    a, b, c, d, e, f = m
    return (a * x + c * y + e, b * x + d * y + f)


def layer_tx(l):
    fr = l.get('frame') or {'x': 0, 'y': 0, 'width': 0, 'height': 0}
    m = (1., 0., 0., 1., float(fr.get('x', 0)), float(fr.get('y', 0)))
    w, h = float(fr.get('width', 0)), float(fr.get('height', 0))
    sx = -1. if l.get('isFlippedHorizontal') else 1.
    sy = -1. if l.get('isFlippedVertical') else 1.
    if sx < 0 or sy < 0:
        m = mul(m, (1., 0., 0., 1., w / 2, h / 2))
        m = mul(m, (sx, 0., 0., sy, 0., 0.))
        m = mul(m, (1., 0., 0., 1., -w / 2, -h / 2))
    rot = float(l.get('rotation', 0) or 0)
    if rot:
        t = -rot * math.pi / 180          # Sketch rotation is anticlockwise
        cs, sn = math.cos(t), math.sin(t)
        m = mul(m, (1., 0., 0., 1., w / 2, h / 2))
        m = mul(m, (cs, sn, -sn, cs, 0., 0.))
        m = mul(m, (1., 0., 0., 1., -w / 2, -h / 2))
    return m


# --- geometry --------------------------------------------------------------
def subpath_d(l, m):
    """Absolute path data for one shape layer under accumulated transform m."""
    p = l.get('path') or l
    pts = p.get('points')
    if not pts:
        return ''
    fr = l['frame']
    w, h = float(fr['width']), float(fr['height'])
    P = lambda s: apply(m, *(lambda xy: (xy[0] * w, xy[1] * h))(pt(s)))
    fmt = lambda xy: f'{xy[0]:.2f},{xy[1]:.2f}'
    closed, n = p.get('isClosed'), len(pts)
    d = ['M' + fmt(P(pts[0]['point']))]
    for i in range(n if closed else n - 1):
        a, b = pts[i], pts[(i + 1) % n]
        if a.get('hasCurveFrom') or b.get('hasCurveTo'):
            c1 = P(a['curveFrom']) if a.get('hasCurveFrom') else P(a['point'])
            c2 = P(b['curveTo']) if b.get('hasCurveTo') else P(b['point'])
            d.append(f'C{fmt(c1)} {fmt(c2)} {fmt(P(b["point"]))}')
        else:
            d.append('L' + fmt(P(b['point'])))
    if closed:
        d.append('Z')
    return ''.join(d)


SHAPES = {'shapePath', 'rectangle', 'oval', 'polygon', 'star', 'triangle'}


def collect_subpaths(l, m, acc):
    m = mul(m, layer_tx(l))
    if l.get('_class') in SHAPES:
        d = subpath_d(l, m)
        if d:
            acc.append(d)
    else:
        for c in l.get('layers', []):
            if c.get('isVisible', True):
                collect_subpaths(c, m, acc)


# --- style -----------------------------------------------------------------
class Defs:
    def __init__(self):
        self.out, self.n = [], 0

    def gradient(self, g, m, fr):
        self.n += 1
        gid = f'g{self.n}'
        gt = g.get('gradientType', 0)
        stops = ''.join(
            f'<stop offset="{s.get("position",0):.3f}" stop-color="{col(s.get("color"))}"/>'
            for s in g.get('stops', []))
        f0, t0 = pt(g.get('from', '{0.5, 0}')), pt(g.get('to', '{0.5, 1}'))
        if gt == 1:
            r = math.hypot(t0[0] - f0[0], t0[1] - f0[1])
            self.out.append(
                f'<radialGradient id="{gid}" cx="{f0[0]:.3f}" cy="{f0[1]:.3f}" r="{r:.3f}">'
                f'{stops}</radialGradient>')
        else:
            if gt == 2:
                warn('angular gradient approximated as linear')
            self.out.append(
                f'<linearGradient id="{gid}" x1="{f0[0]:.3f}" y1="{f0[1]:.3f}"'
                f' x2="{t0[0]:.3f}" y2="{t0[1]:.3f}">{stops}</linearGradient>')
        return f'url(#{gid})'


def style_attrs(l, defs, m, name=''):
    st = l.get('style') or {}
    fill, stroke, sw, extra = 'none', None, 0, ''
    for f in (st.get('fills') or []):
        if not f.get('isEnabled'):
            continue
        ft = f.get('fillType', 0)
        if ft == 1 and f.get('gradient'):
            fill = defs.gradient(f['gradient'], m, l.get('frame'))
        elif ft == 0:
            fill = col(f.get('color'))
        else:
            warn(f'unsupported fillType {ft} on {name or l.get("name")}')
    for b in (st.get('borders') or []):
        if b.get('isEnabled'):
            stroke, sw = col(b.get('color')), b.get('thickness', 1)
    a = f'fill="{fill}"'
    if stroke:
        a += f' stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round"'
    op = (st.get('contextSettings') or {}).get('opacity')
    if op is not None and op < .999:
        a += f' opacity="{op:.3f}"'
    return a


# --- emit ------------------------------------------------------------------
SKIPPED = {}


def emit(l, m, out, defs, symmap):
    if not l.get('isVisible', True):
        return
    cls = l.get('_class')
    lm = mul(m, layer_tx(l))

    if cls == 'shapeGroup' or cls in SHAPES:
        acc = []
        if cls in SHAPES:
            d = subpath_d(l, lm)
            if d:
                acc = [d]
        else:
            for c in l.get('layers', []):
                collect_subpaths(c, lm, acc)
        if acc:
            rule = ' fill-rule="evenodd"' if len(acc) > 1 else ''
            out.append(f'<path d="{"".join(acc)}" {style_attrs(l, defs, lm)}{rule}/>')
        return

    if cls == 'symbolInstance':
        sid = l.get('symbolID')
        target = symmap.get(sid)
        fr = l.get('frame', {})
        if not target:
            SKIPPED['symbolInstance(unresolved)'] = SKIPPED.get('symbolInstance(unresolved)', 0) + 1
            return
        name, sw, sh = target
        a, b, c, d, e, f = lm
        w, h = float(fr.get('width', sw)), float(fr.get('height', sh))
        out.append(f'<g transform="matrix({a:.4f} {b:.4f} {c:.4f} {d:.4f} {e:.2f} {f:.2f})">'
                   f'<use href="#cp-{name}" width="{w:.2f}" height="{h:.2f}"/></g>')
        return

    if cls == 'text':
        s = ((l.get('attributedString') or {}).get('string') or '').strip()
        if not s:
            return
        attrs = ((l.get('attributedString') or {}).get('attributes') or [{}])
        at = (attrs[0].get('attributes') if attrs else {}) or {}
        size = ((at.get('MSAttributedStringFontAttribute') or {}).get('attributes') or {}).get('size', 12)
        fc = col(at.get('MSAttributedStringColorAttribute')) if at.get('MSAttributedStringColorAttribute') else '#000'
        a, b, c, d, e, f = lm
        out.append(f'<g transform="matrix({a:.4f} {b:.4f} {c:.4f} {d:.4f} {e:.2f} {f:.2f})">'
                   f'<text x="0" y="{size:.1f}" font-size="{size:.1f}" fill="{fc}"'
                   f' font-family="sans-serif">{s.replace("&","&amp;").replace("<","&lt;")}</text></g>')
        return

    if cls in ('group', 'symbolMaster', 'artboard', 'page'):
        for c in l.get('layers', []):
            emit(c, lm, out, defs, symmap)
        return

    SKIPPED[cls] = SKIPPED.get(cls, 0) + 1


# --- driver ----------------------------------------------------------------
def load(path):
    if os.path.isdir(path):
        return path, None
    tmp = tempfile.mkdtemp()
    with zipfile.ZipFile(path) as z:
        z.extractall(tmp)
    return tmp, tmp


def slug(s, taken):
    n = re.sub(r'[^a-zA-Z0-9]+', '-', s or 'sym').strip('-').lower() or 'sym'
    taken[n] = taken.get(n, 0) + 1
    return n if taken[n] == 1 else f'{n}-{taken[n]}'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('sketch', help='.sketch file or already-unzipped dir')
    ap.add_argument('--page', action='append', help='page name (repeatable; default all)')
    ap.add_argument('--list', action='store_true', help='list pages and exit')
    ap.add_argument('--groups', action='store_true',
                    help='also emit named top-level groups as symbols')
    ap.add_argument('-o', '--out', default='-')
    a = ap.parse_args()

    root, tmp = load(a.sketch)
    try:
        meta = json.load(open(os.path.join(root, 'meta.json')))
        pages = meta['pagesAndArtboards']
        if a.list:
            for pid, p in pages.items():
                print(f'{len(p["artboards"]):3d}  {p["name"]}')
            return

        # symbolID -> (slug, w, h), needed before emitting so <use> can resolve
        taken, symmap, masters = {}, {}, []
        for pid in pages:
            pg = json.load(open(os.path.join(root, 'pages', pid + '.json')))

            def scan(l, top=False):
                # Named top-level groups are how the `components` page stores art --
                # they are not symbolMasters, so --groups is needed to reach them.
                if top and a.groups and l.get('_class') == 'group' and l.get('name'):
                    n = slug(l.get('name'), taken)
                    masters.append((n, l, pages[pid]['name']))
                    return
                if l.get('_class') in ('symbolMaster', 'artboard'):
                    n = slug(l.get('name'), taken)
                    fr = l['frame']
                    masters.append((n, l, pages[pid]['name']))
                    if l.get('symbolID'):
                        symmap[l['symbolID']] = (n, fr['width'], fr['height'])
                    return
                for c in l.get('layers', []):
                    scan(c)
            for l in pg.get('layers', []):
                scan(l, top=True)

        want = set(a.page) if a.page else None
        defs = Defs()
        body = []
        for n, l, pgname in masters:
            if want and pgname not in want:
                continue
            fr = l['frame']
            inner = []
            for c in l.get('layers', []):
                emit(c, I, inner, defs, symmap)
            body.append(f'  <symbol id="cp-{n}" viewBox="0 0 {fr["width"]:.2f} {fr["height"]:.2f}">')
            body += ['    ' + s for s in inner]
            body.append('  </symbol>')
            print(f'{n:34} {fr["width"]:7.1f}x{fr["height"]:<7.1f} {len(inner):4d} nodes  [{pgname}]',
                  file=sys.stderr)

        parts = ['<svg xmlns="http://www.w3.org/2000/svg" style="display:none">']
        if defs.out:
            parts.append('  <defs>' + ''.join(defs.out) + '</defs>')
        parts += body + ['</svg>']
        svg = '\n'.join(parts)
        if a.out == '-':
            print(svg)
        else:
            open(a.out, 'w').write(svg)
            print(f'\nwrote {a.out} ({len(svg)} bytes, {sum(1 for s in body if s.lstrip().startswith("<symbol"))} symbols, '
                  f'{len(defs.out)} gradients)', file=sys.stderr)
        if SKIPPED:
            print('SKIPPED: ' + ', '.join(f'{k}x{v}' for k, v in sorted(SKIPPED.items())),
                  file=sys.stderr)
    finally:
        if tmp:
            shutil.rmtree(tmp, ignore_errors=True)


main()
