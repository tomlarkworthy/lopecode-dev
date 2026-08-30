#!/usr/bin/env python3
"""What is an InventoryOverride item whose PPtr has m_FileID 0?

corepox-mission-settings.py resolves an item by GUID through the scene's external
file list, and prints "?" for the three whose m_FileID is 0 -- those point INSIDE
the scene, so they have no GUID and no .meta. Resolve them here by path_id.

    tools/.venv-unity/bin/python tools/corepox-inventory-local.py
"""
import UnityPy, glob, os, json

SCENES = 'vendor/corepox/Meritocracy/Assets/scenes/missions'
settings = json.load(open('data/corepox/mission-settings.json'))

for p in sorted(glob.glob(SCENES + '/*.unity')):
    scene = os.path.basename(p)[:-6]
    inv = settings[scene].get("inventory")
    if not inv:
        continue
    local = [it for it in inv[0]["items"] if it["item"]["m_FileID"] == 0]
    if not local:
        continue
    env = UnityPy.load(p)
    by_id = {o.path_id: o for o in env.objects}
    for it in local:
        pid = it["item"]["m_PathID"]
        o = by_id.get(pid)
        print(f"\n{scene}  path_id {pid}  quantity {it['quantity']}  -> "
              f"{o.type.name if o else 'MISSING'}")
        if not o:
            continue
        d = o.read_typetree()
        name = d.get("m_Name")
        if o.type.name == "GameObject":
            print(f"  GameObject {name!r}, {len(d.get('m_Component', []))} components")
            for c in d.get("m_Component", []):
                cid = (c.get("component") or c).get("m_PathID")
                co = by_id.get(cid)
                if not co:
                    continue
                try:
                    cd = co.read_typetree()
                except Exception:
                    print(f"    {co.type.name}")
                    continue
                keys = [k for k in cd if not k.startswith("m_")]
                print(f"    {co.type.name}  {keys}")
                for k in keys:
                    v = cd[k]
                    s = json.dumps(v)
                    print(f"      {k} = {s}")
        else:
            print("  " + json.dumps({k: v for k, v in d.items()
                                     if not k.startswith("m_")})[:800])
