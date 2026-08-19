#!/usr/bin/env python3
"""Dump the shipped sprite images out of the APK, so the traces can be looked at.

corepox-apk-sprites.py takes the geometry (m_Rect / m_Pivot / ppu) and that was
enough to fix the anchors. It is not enough to answer "this was not the final
design for radar" or "I cannot see any neon glow" -- those need the picture.

    tools/.venv-unity/bin/python tools/corepox-apk-sprite-png.py radar binary
    -> data/corepox/sprites/<name>.png
"""
import UnityPy, glob, os, sys

DATA = 'vendor/corepox_apk/base/assets/bin/Data'
OUT = 'data/corepox/sprites'
want = set(sys.argv[1:]) or None
os.makedirs(OUT, exist_ok=True)
found = set()
for p in sorted(glob.glob(DATA + '/*')):
    if '.split' in p or not os.path.isfile(p) or os.path.basename(p) == 'boot.config':
        continue
    try:
        env = UnityPy.load(p)
    except Exception:
        continue
    for o in env.objects:
        if o.type.name != "Sprite":
            continue
        try:
            d = o.read()
            name = d.m_Name
        except Exception:
            continue
        if want and name not in want:
            continue
        try:
            img = d.image
        except Exception as e:
            print(f"  {name}: no image ({e})", file=sys.stderr); continue
        img.save(f"{OUT}/{name}.png")
        found.add(name)
        print(f"{name:<16} {img.width}x{img.height}")
if want:
    for m in sorted(want - found):
        print(f"MISSING {m}", file=sys.stderr)
