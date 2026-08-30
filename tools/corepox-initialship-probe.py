#!/usr/bin/env python3
"""Is a mission's initialShip built from loose components or from a CompositeFn?

UIState.buildOptions subtracts what is already on the player ship before offering
an inventory item: composites are matched by `model.id`, components only when
`candidate.composite == null`. So this decides whether an inventory item is
offered at all -- and both live Follow scenes list their OWN hull as an item.

    tools/.venv-unity/bin/python tools/corepox-initialship-probe.py
"""
import UnityPy, glob, os, json

SCENES = 'vendor/corepox/Meritocracy/Assets/scenes/missions'
settings = json.load(open('data/corepox/mission-settings.json'))

for p in sorted(glob.glob(SCENES + '/*.unity')):
    scene = os.path.basename(p)[:-6]
    pid = settings[scene]["mission"][0]["initialShip"]["m_PathID"]
    env = UnityPy.load(p)
    by_id = {o.path_id: o for o in env.objects}
    mb = by_id.get(pid)
    if mb is None:
        print(f"{scene:22} initialShip {pid} -> MISSING"); continue
    d = mb.read_typetree()
    go = by_id.get(d["m_GameObject"]["m_PathID"])
    gd = go.read_typetree() if go else {}
    print(f"\n{scene:22} {gd.get('m_Name')!r}  fields {sorted(k for k in d if not k.startswith('m_'))}")
    tr = None
    for c in gd.get("m_Component", []):
        co = by_id.get((c.get("component") or c).get("m_PathID"))
        if co is not None and co.type.name == "Transform": tr = co
    if tr is None: continue
    def walk(t, depth):
        for ch in t.read_typetree().get("m_Children", []):
            cho = by_id.get(ch["m_PathID"])
            if cho is None: continue
            g = by_id.get(cho.read_typetree()["m_GameObject"]["m_PathID"])
            if g is None: continue
            g2 = g.read_typetree()
            tags = []
            for c in g2.get("m_Component", []):
                co = by_id.get((c.get("component") or c).get("m_PathID"))
                if co is None or co.type.name != "MonoBehaviour": continue
                try: cd = co.read_typetree()
                except Exception: continue
                if "model" in cd and "occupancy" in cd:
                    tags.append("Composite:" + str((cd.get("model") or {}).get("id")))
                elif "joints" in cd and "placement" in cd:
                    tags.append("comp")
            print("   " * (depth + 1) + f"{g2.get('m_Name')} {tags}")
            if depth < 1: walk(cho, depth + 1)
    walk(tr, 0)
