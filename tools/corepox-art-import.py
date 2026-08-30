# Import the component drawings from Tom's claude.ai design project, "Shipyard
# Concepts" (data/corepox/shipyard-concepts.dc.html, pulled through the design MCP
# on 2026-08-21), into the art frame corepox-components authors in.
#
#   doc frame   112 units to the cell, drawn with a 4-unit margin
#   art frame    56 units to the cell (ART_TILE), origin on the footprint corner
#   so           art = doc*0.5 - 2
#
# Two things are dropped on the way in: the input/output sockets (portNode draws
# those live, with the value in them, and a static disc under a live one is two
# discs) and the port name labels. The leads that run from the socket position
# toward the joints are kept -- they are what the doc calls "signal to metal".
#
#   python3 tools/corepox-art-import.py     # writes tools/parts.json + refs.json
#   node tools/corepox-art-check.mjs        # rasterises both frames and diffs
import re, json, sys
import xml.etree.ElementTree as ET

# The design doc is one HTML page of option cards; each card holds two SVGs, the
# lattice diagram first and the drawing second. Only the drawing is wanted.
def extract(html):
    out = {}
    for k, block in re.findall(r'<div class="dv-opt" id="(5[a-f])">(.*?)\n</div></div>', html, re.S):
        out[k] = [re.findall(r'<svg([^>]*)>', block), re.findall(r'<svg[^>]*>(.*?)</svg>', block, re.S)]
    return out
sys.path.insert(0, 'tools')
from corepox_art_xform import xf_el, fmt

DOC = "data/corepox/shipyard-concepts.dc.html"
doc = extract(open(DOC).read())
NS = "http://www.w3.org/2000/svg"

def parse(frag):
    root = ET.fromstring('<svg xmlns="%s">%s</svg>' % (NS, frag))
    def go(e):
        return (e.tag.split('}')[-1], dict(e.attrib), [go(k) for k in e])
    return [go(k) for k in root]

def ser(el, ind=1):
    tag, a, kids = el
    at = ''.join(' %s="%s"' % (k, v) for k, v in a.items())
    pad = '  ' * ind
    if not kids: return '%s<%s%s/>' % (pad, tag, at)
    return '%s<%s%s>\n%s\n%s</%s>' % (pad, tag, at,
        '\n'.join(ser(k, ind + 1) for k in kids), pad, tag)

PORT_STROKE = {"#ff9a3c", "#8fe64a"}
def strip_ports(el):
    tag, a, kids = el
    if tag == 'text': return None
    if tag == 'circle' and a.get('stroke') in PORT_STROKE and float(a.get('r', 0)) >= 9:
        return None
    if a.get('stroke') == '#8fe64a': return None          # radar output glyphs
    kids = [k for k in (strip_ports(k) for k in kids) if k]
    if tag == 'g' and not kids: return None
    return (tag, a, kids)

# The design doc's own ids and keyframe names are global; the sheet clones every
# drawing into three places, so both get a cpx- prefix on the way in (artKids
# namespaces ids, not @keyframes).
def rename(el):
    tag, a, kids = el
    a = {k: (v.replace("url(#bloomA)", "url(#cpx-bloom)")
              .replace("animation:breathe", "animation:cpx-breathe")
              .replace("animation:crawl16", "animation:cpx-crawl16")
              .replace("animation:spin", "animation:cpx-spin"))
         for k, v in a.items()}
    return (tag, a, [rename(k) for k in kids])

KEYFRAMES = {
  "cpx-breathe": "0%,100%{opacity:.5}50%{opacity:1}",
  "cpx-spin":    "to{transform:rotate(360deg)}",
}
def extras(uses, S):
    out = []
    if "bloom" in uses:
        out.append(('defs', {}, [('filter', {'id': 'cpx-bloom', 'x': '-60%', 'y': '-60%',
            'width': '220%', 'height': '220%'}, [('feGaussianBlur', {'stdDeviation': fmt(4 * S)}, [])])]))
    css = "".join("@keyframes %s{%s}" % (k, KEYFRAMES[k]) for k in uses if k in KEYFRAMES)
    if "crawl" in uses:
        css += "@keyframes cpx-crawl16{from{stroke-dashoffset:0}to{stroke-dashoffset:%s}}" % fmt(-16 * S)
    if css: out.append(('style', {}, [], css))
    return out

def ser_style(el, ind=1):
    return "%s<style>%s</style>" % ('  ' * ind, el[3])

def build(key, cols, rows, keep=lambda e: e, uses=()):
    frag = doc[key][1][1]
    els = [strip_ports(e) for e in parse(frag)]
    els = [rename(e) for e in els if e]
    def emit(S, TX, TY):
        e2 = keep([xf_el(e, S, TX, TY) for e in els])
        return [x for x in extras(uses, S)] + e2
    def dump(nodes, vb, w, h):
        body = '\n'.join(ser_style(n) if n[0] == 'style' else ser(n) for n in nodes)
        return '<svg viewBox="%s" width="%s" height="%s">\n%s\n</svg>' % (vb, w, h, body)
    art = dump(emit(.5, -2, -2), "0 0 %d %d" % (56 * cols, 56 * rows), 56 * cols * 4, 56 * rows * 4)
    # the cell box, not the doc's viewBox: the doc art is drawn with a 4-unit
    # margin, so only "4 4 112w 112h" frames the same world rectangle the art
    # frame does and the two rasters are comparable pixel for pixel.
    ref = dump(emit(1, 0, 0), "4 4 %d %d" % (112 * cols, 112 * rows), 112 * cols, 112 * rows)
    return 'svg`%s`' % art, ref

parts = {}
refs = {}
parts['Brain'], refs['Brain'] = build('5a', 1, 1, uses=('bloom','cpx-breathe','crawl'))
parts['Engine'], refs['Engine'] = build('5b', 1, 2)
parts['Lazer'], refs['Lazer'] = build('5d', 1, 3)
parts['Radar'], refs['Radar'] = build('5f', 2, 3, uses=('cpx-spin',))

def turret(els):
    base, barrel = [], []
    for e in els:
        tag, a, kids = e
        if tag == 'g' and 'rotate' in a.get('transform', ''):
            a2 = {k: v for k, v in a.items() if k != 'transform'}
            barrel.append((tag, a2, kids))
        elif tag == 'circle' and a.get('cx') == '112' and a.get('cy') == '174' and float(a.get('r',0)) < 8:
            barrel.append(e)                              # pivot cap, drawn over the arm
        else:
            base.append(e)
    return [('g', {'id': 'turret2-base'}, base), ('g', {'id': 'turret2-barrel'}, barrel)]
parts['LaserTurret2'], refs['LaserTurret2'] = build('5e', 4, 4, turret)

json.dump(parts, open("tools/parts.json", "w"))
json.dump(refs, open("tools/refs.json", "w"))
for k, v in parts.items():
    print("%-14s %5d chars of svg -> tools/parts.json" % (k, len(v)))
