#!/usr/bin/env python3
"""The Orb's damage area, off Orb.prefab.

MeleeFn.FixedUpdate calls damageArea.GetContacts and damages EVERY ShipComponent
touching it by damageAmount. So the numbers that matter are the damageArea
collider's radius and offset, in the Orb's own frame, and damageAmount itself.

    tools/.venv-unity/bin/python tools/corepox-orb-melee-probe.py
"""
import UnityPy, json

P = 'vendor/corepox/Meritocracy/Assets/prefabs/components/Resources/Orb.prefab'
env = UnityPy.load(P)
by_id = {o.path_id: o for o in env.objects}

def name_of(o):
    try:
        d = o.read_typetree()
    except Exception:
        return "?"
    g = by_id.get(d.get("m_GameObject", {}).get("m_PathID"))
    try:
        return g.read_typetree().get("m_Name") if g else "?"
    except Exception:
        return "?"

for o in env.objects:
    try:
        d = o.read_typetree()
    except Exception:
        continue
    t = o.type.name
    if t in ("CircleCollider2D", "BoxCollider2D", "PolygonCollider2D"):
        print(f"{t:20} on {name_of(o)!r}")
        for k in ("m_Radius", "m_Size", "m_Offset", "m_IsTrigger", "m_Enabled"):
            if k in d: print(f"    {k} = {json.dumps(d[k])}")
    elif t == "MonoBehaviour" and {"damageArea", "damageAmount"} <= set(d):
        print(f"MeleeFn on {name_of(o)!r}: damageAmount = {d['damageAmount']}, "
              f"damageArea -> {d['damageArea']}")
    elif t == "Transform":
        g = by_id.get(d.get("m_GameObject", {}).get("m_PathID"))
        nm = g.read_typetree().get("m_Name") if g else "?"
        if nm in ("Orb", "weapon"):
            print(f"Transform {nm!r} pos {d['m_LocalPosition']} scale {d['m_LocalScale']}")
