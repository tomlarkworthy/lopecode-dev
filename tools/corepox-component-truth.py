#!/usr/bin/env python3
"""Occupancy and joints straight out of the component prefabs.

Every ShipComponent serialises `occupancy` (the cells it fills) and `joints`
(CoordDir8[], a cell plus one of eight edge slots). Assets/prefabs/components/
Resources/*.prefab holds one prefab per type, so this is the definition, not a
sample -- which retires the parts of TYPES.tiles and JOINTS that were recovered
by corpus overlap search or from recollection.

Dir8 is verbatim from Metrics.cs:

    UP_LEFT = 0, UP_RIGHT = 7,  RIGHT_UP = 6, RIGHT_DOWN = 5,
    DOWN_RIGHT = 4, DOWN_LEFT = 3,  LEFT_DOWN = 2, LEFT_UP = 1

Unity is +y UP, which is the engine's forward, so N/E/S/W below are already in
engine frame. Slot 0 is the end nearer the smaller coordinate, matching JOINTS.

Ten of the twelve prefabs are binary and go through UnityPy; Armour and Brain
were left as YAML text and are parsed directly.

    tools/.venv-unity/bin/python tools/corepox-component-truth.py
"""
import UnityPy, glob, os, json, re, sys

DIR8 = {0: ("N", 0), 7: ("N", 1), 2: ("W", 0), 1: ("W", 1),
        3: ("S", 0), 4: ("S", 1), 5: ("E", 0), 6: ("E", 1)}

DIR = 'vendor/corepox/Meritocracy/Assets/prefabs/components/Resources'


def from_yaml(path):
    """Unity's YAML omits zero fields, so an occupancy entry reads `- {}` and a
    joint reads `pos: {}` -- both mean (0,0). Defaulting to 0 rather than
    skipping the entry is the difference between 8 joints and none."""
    src = open(path).read().splitlines()

    def xy(frag):
        m = re.search(r'x: (-?\d+)', frag)
        x = int(m.group(1)) if m else 0
        m = re.search(r'y: (-?\d+)', frag)
        y = int(m.group(1)) if m else 0
        return [x, y]

    occ, js, hp = [], [], None
    i = 0
    while i < len(src):
        ln = src[i].strip()
        if ln == "occupancy:":
            i += 1
            while i < len(src) and src[i].lstrip().startswith("- "):
                occ.append(xy(src[i]))
                i += 1
            continue
        if ln == "joints:":
            i += 1
            while i < len(src) and src[i].lstrip().startswith("- pos:"):
                x, y = xy(src[i])
                d = 0
                if i + 1 < len(src):
                    m = re.search(r'dir: (\d+)', src[i + 1])
                    if m:
                        d = int(m.group(1))
                js.append({"pos": {"x": x, "y": y}, "dir": d})
                i += 2
            continue
        m = re.search(r'maxHp: (\d+)', ln)
        if m and hp is None:
            hp = int(m.group(1))
        i += 1
    return occ, js, hp


def record(type_name, occ, js, hp):
    joints = {}
    for j in js:
        side, slot = DIR8[j["dir"]]
        joints.setdefault(f'{j["pos"]["x"]},{j["pos"]["y"]}', {}).setdefault(side, []).append(slot)
    for cell in joints.values():
        for side in cell:
            cell[side] = sorted(cell[side])
    return {"hp": hp, "tiles": occ, "joints": joints, "nJoints": len(js)}


out = {}
for p in sorted(glob.glob(DIR + '/*.prefab')):
    type_name = os.path.basename(p)[:-7]
    if open(p, 'rb').read(5) == b'%YAML':
        occ, js, hp = from_yaml(p)
        out[type_name] = record(type_name, occ, js, hp)
        continue
    try:
        env = UnityPy.load(p)
    except Exception as e:
        print(f"  {type_name}: unreadable ({e})", file=sys.stderr)
        continue
    for o in env.objects:
        if o.type.name != "MonoBehaviour":
            continue
        try:
            d = o.read_typetree()
        except Exception:
            continue
        if "occupancy" not in d or "joints" not in d:
            continue
        out[type_name] = record(type_name,
                                [[c["x"], c["y"]] for c in d["occupancy"]],
                                d["joints"],
                                d.get("stats", {}).get("maxHp"))
        break

os.makedirs('data/corepox', exist_ok=True)
with open('data/corepox/component-truth.json', 'w') as f:
    json.dump(out, f, indent=1, sort_keys=True)
for t, v in sorted(out.items()):
    print(f"{t:14} hp={str(v['hp']):4} {len(v['tiles']):2} cells  {v['nJoints']:2} joints")
