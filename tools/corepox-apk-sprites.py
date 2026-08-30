#!/usr/bin/env python3
"""Sprite geometry out of the SHIPPED game.

The Unity project in vendor/corepox has no art -- the sprites were never
committed -- so every SYMBOL_FOR anchor in corepox-assets was measured off the
SVG by eye. The APK carries the built sprites, and a Unity Sprite stores exactly
what an anchor is: m_Rect (the region of the atlas) and m_Pivot (the point of
that rect the Transform sits on, in 0..1 of the rect). Those two are the
definition of where a component's art hangs off its anchor cell.

    tools/.venv-unity/bin/python tools/corepox-apk-sprites.py
"""
import UnityPy, glob, json, os, sys

DATA = 'vendor/corepox_apk/base/assets/bin/Data'
out = {}
# Not just sharedassets*: half the component art (binary, hyperdrive, turret2_cap,
# joint, the lazer beam) sits in the hash-named per-asset files beside them.
for p in sorted(glob.glob(DATA + '/*')):
    if '.split' in p or not os.path.isfile(p) or os.path.basename(p) == 'boot.config':
        continue
    try:
        env = UnityPy.load(p)
    except Exception as e:
        print(f"  skip {os.path.basename(p)}: {e}", file=sys.stderr)
        continue
    for o in env.objects:
        if o.type.name != "Sprite":
            continue
        try:
            d = o.read_typetree()
        except Exception:
            continue
        r, pv = d.get("m_Rect", {}), d.get("m_Pivot", {})
        out.setdefault(d["m_Name"], []).append({
            "file": os.path.basename(p),
            "rect": [r.get("x", 0), r.get("y", 0), r.get("width", 0), r.get("height", 0)],
            "pivot": [pv.get("x", 0), pv.get("y", 0)],
            "ppu": d.get("m_PixelsToUnits"),
            "offset": [d.get("m_Offset", {}).get("x", 0), d.get("m_Offset", {}).get("y", 0)],
        })

os.makedirs('data/corepox', exist_ok=True)
json.dump(out, open('data/corepox/apk-sprites.json', 'w'), indent=1, sort_keys=True)
print(f"{len(out)} distinct sprite names")
for n, v in sorted(out.items()):
    s = v[0]
    print(f"  {n:28} rect {s['rect'][2]:7.1f}x{s['rect'][3]:<7.1f} pivot {s['pivot'][0]:6.3f},{s['pivot'][1]:6.3f}  ppu {s['ppu']}")
