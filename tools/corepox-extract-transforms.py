#!/usr/bin/env python3
"""Recover Transform positions from Unity's BINARY .unity scenes.

No type tree, so this goes by shape. A serialised Transform is
  m_LocalRotation : 4 floats (a UNIT quaternion)
  m_LocalPosition : 3 floats
  m_LocalScale    : 3 floats
laid out contiguously little-endian. A run of 10 floats whose first four have
magnitude 1 is a strong signature: random bytes almost never normalise.
"""
import struct, sys, glob, math, json, os

def floats(b):
    n = len(b) // 4
    return struct.unpack("<%df" % n, b[:n*4])

def sane(v, lim=1e5):
    return all(math.isfinite(x) and abs(x) < lim for x in v)

def transforms(path):
    b = open(path, "rb").read()
    out = []
    for off in range(0, len(b) - 40, 4):
        f = struct.unpack_from("<10f", b, off)
        q, p, s = f[0:4], f[4:7], f[7:10]
        if not (sane(q, 2) and sane(p) and sane(s, 1e4)):
            continue
        n = math.sqrt(sum(x*x for x in q))
        if abs(n - 1) > 1e-4:
            continue
        if not all(abs(x) > 1e-6 for x in s):        # scale is never zero
            continue
        if not all(0.001 < abs(x) < 1000 for x in s):
            continue
        out.append({"off": off, "rot": [round(x, 5) for x in q],
                    "pos": [round(x, 4) for x in p], "scale": [round(x, 4) for x in s]})
    return out

res = {}
for p in sorted(glob.glob("vendor/corepox/Meritocracy/Assets/scenes/missions/*.unity")):
    name = os.path.basename(p)[:-6]
    ts = transforms(p)
    # de-duplicate overlapping windows: keep the first of any run within 4 bytes
    keep, last = [], -99
    for t in ts:
        if t["off"] - last > 8: keep.append(t)
        last = t["off"]
    res[name] = keep
    zs = [t for t in keep if abs(t["pos"][2]) < 0.001]
    print(f"{name:22} {len(keep):4} transforms, {len(zs):4} at z=0 "
          f"(game plane), x {min([t['pos'][0] for t in keep], default=0):8.2f}"
          f" .. {max([t['pos'][0] for t in keep], default=0):8.2f}")
json.dump(res, open("scratch/corepox-transforms.json", "w"), indent=1)
print("\nwrote scratch/corepox-transforms.json")
