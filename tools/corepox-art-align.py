# Is the drawing CENTRED on the cells it occupies? corepox-art-ink.py measures the
# ink's SIZE and corepox-anchor-truth.ts measures the declared anchor against the
# sprite pivot -- neither says where the ink sits inside the frame, which is what
# Tom reported on 2026-08-20: "the engine or binary do not look properly aligned to
# their grids yet".
#
# Ink bbox in symbol units, minus the anchor, over TILE, against the footprint
# TYPES declares. Positive dx means the drawing sits to the RIGHT of its cells.
#
#   tools/.venv-unity/bin/python tools/corepox-art-align.py
import re, subprocess, sys, json, math

TILE = 56.0
src = open("modules/@tomlarkworthy/corepox-components.js").read()
eng = open("modules/@tomlarkworthy/corepox-engine.js").read()

anchors = {}
m = re.search(r"const _SYMBOL_FOR = .*?\{(.*?)\n\}\n\)\};", src, re.S)
for name, sym, ax, ay in re.findall(r"(\w+):\s*\[\"([\w-]+)\",\s*([\d.]+),\s*([\d.]+)\]", m.group(1)):
    anchors[name] = (sym, float(ax), float(ay))

tiles = {}
m = re.search(r"const _TYPES = .*?\n\{(.*?)\n\}\n\)\};", eng, re.S)
body = m.group(1)
for name in anchors:
    t = re.search(re.escape(name) + r":\s*\{.*?tiles:\s*(\[\[.*?\]\])", body, re.S)
    if t: tiles[name] = json.loads(t.group(1).replace(" ", ""))

# ink bbox: bound every path by its ON-CURVE and CONTROL points, plus <use> boxes.
def bbox_of(svg_text):
    xs, ys = [], []
    for d in re.findall(r'\sd="([^"]+)"', svg_text):
        nums = [float(v) for v in re.findall(r"-?\d+\.?\d*(?:e-?\d+)?", d)]
        cmds = re.findall(r"[MmLlCcSsQqTtAaHhVvZz]", d)
        # absolute-only art (sketch2svg emits absolute), so pair them off
        if any(c.islower() and c != "z" for c in cmds):
            print("relative path in art, not handled", file=sys.stderr); continue
        for i in range(0, len(nums) - 1, 2):
            xs.append(nums[i]); ys.append(nums[i + 1])
    for tag in re.findall(r"<use[^>]*>", svg_text):
        g = dict(re.findall(r'(\w+)="([^"]+)"', tag))
        if "width" in g:
            xs += [0.0, float(g["width"])]; ys += [0.0, float(g["height"])]
    return (min(xs), min(ys), max(xs), max(ys)) if xs else None

print(f"{'cell':<13}{'ink centre vs cells (tiles)':<30}{'ink extent vs cells (tiles)'}")
bad = 0
for name, (sym, ax, ay) in anchors.items():
    if name not in tiles: continue
    art = re.search(r"const _art_" + name + r" = .*?svg`(.*?)`\n\)\};", src, re.S)
    if not art: continue
    b = bbox_of(art.group(1))
    if not b: continue
    x0 = (b[0] - ax) / TILE; x1 = (b[2] - ax) / TILE
    y0 = (b[1] - ay) / TILE; y1 = (b[3] - ay) / TILE      # y DOWN in symbol units
    tx = [t[0] for t in tiles[name]]; ty = [t[1] for t in tiles[name]]
    cx0, cx1 = min(tx) - 0.5, max(tx) + 0.5
    cy0, cy1 = -(max(ty) + 0.5), -(min(ty) - 0.5)          # y down
    dcx = (x0 + x1) / 2 - (cx0 + cx1) / 2
    dcy = (y0 + y1) / 2 - (cy0 + cy1) / 2
    flag = "   <-- OFF" if max(abs(dcx), abs(dcy)) > 0.08 else ""
    if flag: bad += 1
    print(f"{name:<13}dx {dcx:+.3f}  dy {dcy:+.3f}        "
          f"x [{x0:+.2f},{x1:+.2f}] vs [{cx0:+.2f},{cx1:+.2f}]  "
          f"y [{y0:+.2f},{y1:+.2f}] vs [{cy0:+.2f},{cy1:+.2f}]{flag}")
print(f"\n{len(anchors) - bad}/{len(anchors)} drawings centred on their cells to 0.08 tiles")
sys.exit(1 if bad else 0)
