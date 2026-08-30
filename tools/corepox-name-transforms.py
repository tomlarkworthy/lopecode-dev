#!/usr/bin/env python3
"""Pair recovered Transforms with the nearest GameObject name in the file.

Unity's binary layout has no back-references we can read without a type tree, but
objects are written in order, so a name and its Transform land close together.
This is a HEURISTIC pairing -- it is right often enough to read a level off, and
each pairing prints its byte gap so an implausible one is visible.
"""
import re, json, sys, os, glob, struct, math

NAME = re.compile(rb'[ -~]{3,40}')
SKIP = re.compile(rb'^(m_|_|PPtr|Unity|Assets/|Library/|[0-9a-f]{32}$)')

def names(b):
    out = []
    for m in NAME.finditer(b):
        s = m.group(0)
        if SKIP.match(s): continue
        try: t = s.decode()
        except: continue
        if len(t) < 3: continue
        out.append((m.start(), t))
    return out

def pair(scene, transforms):
    b = open(scene, "rb").read()
    ns = names(b)
    rows = []
    for t in transforms:
        best, bd = None, 10**9
        for off, s in ns:
            d = abs(off - t["off"])
            if d < bd: bd, best = d, s
        rows.append({**t, "name": best, "gap": bd})
    return rows

tr = json.load(open("scratch/corepox-transforms.json"))
out = {}
for scene in sorted(glob.glob("vendor/corepox/Meritocracy/Assets/scenes/missions/*.unity")):
    nm = os.path.basename(scene)[:-6]
    if nm not in tr: continue
    rows = pair(scene, tr[nm])
    out[nm] = rows
    if nm in ("SideShooter", "TwinTurrets", "Cocoon", "ManualAim"):
        print(f"===== {nm}")
        for r in sorted(rows, key=lambda r: r["off"]):
            if abs(r["pos"][2]) > 0.001: continue
            if r["gap"] > 400: continue
            print(f"  {r['name'][:34]:34} pos {r['pos'][0]:8.2f},{r['pos'][1]:8.2f}  gap {r['gap']}")
json.dump(out, open("scratch/corepox-named-transforms.json", "w"), indent=1)
