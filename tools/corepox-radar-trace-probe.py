#!/usr/bin/env python3
"""What does the Radar's `trace` look like? RadarFn drives a SpriteRenderer whose
height is `nearest.distance - 0.64` and whose rotation follows the gear, so the
sightline in the shipped game is a drawn object, not a debug overlay. Follow
RadarFn's own `trace` PPtr rather than guessing at a child name.

    tools/.venv-unity/bin/python tools/corepox-radar-trace-probe.py
"""
import UnityPy, json, glob

P = 'vendor/corepox/Meritocracy/Assets/prefabs/components/Resources/Radar.prefab'
env = UnityPy.load(P)
by_id = {o.path_id: o for o in env.objects}

def tt(o):
    try: return o.read_typetree()
    except Exception: return {}

def go_of(d):
    g = by_id.get(d.get("m_GameObject", {}).get("m_PathID"))
    return tt(g) if g else {}

radar = None
for o in env.objects:
    d = tt(o)
    if o.type.name == "MonoBehaviour" and {"distanceOutput", "trace", "scan"} <= set(d):
        radar = d
if not radar:
    raise SystemExit("RadarFn not found")
print("RadarFn fields:", {k: v for k, v in radar.items()
                          if k in ("trace", "scan", "arrow", "center", "gearVisual")})

for field in ("trace", "arrow", "scan", "center"):
    pid = (radar.get(field) or {}).get("m_PathID")
    o = by_id.get(pid)
    if not o:
        print(f"\n{field}: PPtr {pid} not in this file")
        continue
    d = tt(o)
    g = go_of(d) if o.type.name != "GameObject" else d
    print(f"\n{field}: {o.type.name} on GameObject {g.get('m_Name')!r}")
    for k in ("m_Color", "m_Size", "m_DrawMode", "m_SpriteTileMode",
              "m_SortingOrder", "m_Sprite", "m_FlipX", "m_FlipY"):
        if k in d: print(f"    {k} = {json.dumps(d[k])}")
    # the transform that positions it
    for c in g.get("m_Component", []):
        co = by_id.get((c.get("component") or c)["m_PathID"])
        if co is not None and co.type.name == "Transform":
            td = tt(co)
            print(f"    Transform pos {json.dumps(td['m_LocalPosition'])} "
                  f"scale {json.dumps(td['m_LocalScale'])}")

# --- transform chain scales, so m_Size can be converted to world units ---
print("\n--- transform chain for trace ---")
def transform_of(godict, gopid):
    for o in env.objects:
        if o.type.name == "Transform":
            d = tt(o)
            if d.get("m_GameObject", {}).get("m_PathID") == gopid:
                return o, d
    return None, None

pid = (radar.get("trace") or {}).get("m_PathID")
sr = by_id.get(pid)
gopid = tt(sr).get("m_GameObject", {}).get("m_PathID")
o, t = transform_of(None, gopid)
while t:
    g = by_id.get(t["m_GameObject"]["m_PathID"])
    print(tt(g).get("m_Name"), "pos", t["m_LocalPosition"], "scale", t["m_LocalScale"])
    par = t.get("m_Father", {}).get("m_PathID")
    if not par: break
    po = by_id.get(par)
    if not po: break
    t = tt(po)
