#!/usr/bin/env python3
"""Every ship JSON embedded in the BINARY mission and ship scenes, verbatim.

The scenes are binary-serialised, but MonoBehaviour string fields survive intact
and the mission author stored each ship as a JSON ShipSpec. `strings` recovers
them; the brace scanner below re-finds the object boundaries.

Kept as a file under data/ rather than re-run inline, because it is the ground
truth the fidelity checks diff against -- and because vendor/corepox is untracked,
so a checkout without it can still run the checks.

Unity writes float.PositiveInfinity for a latched connector; JSON has no such
literal, so it is written as the string "Infinity" and read back by the loaders.
"""
import subprocess, re, json, glob, os, math

SCENES = sorted(glob.glob('vendor/corepox/Meritocracy/Assets/scenes/missions/*.unity')) + \
         sorted(glob.glob('vendor/corepox/Meritocracy/Assets/scenes/ships/*.unity'))
START = re.compile(r'\{\s*"(?:name|type|components)"')

def blobs(t):
    for m in START.finditer(t):
        i = m.start(); d = 0; j = i; instr = False; esc = False
        while j < len(t):
            c = t[j]
            if instr:
                if esc: esc = False
                elif c == '\\': esc = True
                elif c == '"': instr = False
            elif c == '"': instr = True
            elif c == '{': d += 1
            elif c == '}':
                d -= 1
                if d == 0: break
            j += 1
        if d: continue
        try: yield json.loads(t[i:j+1])
        except Exception: pass

def clean(o):
    if isinstance(o, float) and math.isinf(o): return "Infinity" if o > 0 else "-Infinity"
    if isinstance(o, dict): return {k: clean(v) for k, v in o.items()}
    if isinstance(o, list): return [clean(v) for v in o]
    return o

out = {}
for p in SCENES:
    t = subprocess.run(['strings', '-n', '4', p], capture_output=True, text=True).stdout
    ships = []
    for o in blobs(t):
        if 'components' in o and o not in ships: ships.append(o)
    out[os.path.basename(p)[:-6]] = clean(ships)

with open('data/corepox/scene-ships.json', 'w') as f:
    json.dump(out, f, indent=1)
n = sum(len(v) for v in out.values())
print(f"{n} ships from {len(out)} scenes -> data/corepox/scene-ships.json")
