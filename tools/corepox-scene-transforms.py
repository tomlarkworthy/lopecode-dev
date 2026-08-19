#!/usr/bin/env python3
"""Where mission objects actually SIT, from the binary scenes.

Every x/y/angle in corepox-missions was authored, because the earlier extractor
(tools/corepox-extract-transforms.py) recovers float triples by shape and cannot
attach them to objects. UnityPy walks the real object graph instead, so a
GameObject's name and its Transform arrive together. PrefabInstance overrides are
folded in, since a ship dropped into a scene is a prefab with its position
overridden.

    tools/.venv-unity/bin/python tools/corepox-scene-transforms.py [scene ...]
"""
import UnityPy, glob, os, sys, json

SCENES = sys.argv[1:] or sorted(glob.glob('vendor/corepox/Meritocracy/Assets/scenes/missions/*.unity'))

def quat_to_deg(q):
    import math
    # planar game: rotation about z only
    return round(math.degrees(2 * math.atan2(q.get("z", 0), q.get("w", 1))), 2)

out = {}
for p in SCENES:
    env = UnityPy.load(p)
    byid = {o.path_id: o for o in env.objects}
    tree = {}
    for o in env.objects:
        if o.type.name in ("Transform", "RectTransform", "GameObject", "PrefabInstance"):
            try: tree[o.path_id] = (o.type.name, o.read_typetree())
            except Exception: pass
    # a SHIP in a scene is the GameObject carrying a ShipLoader whose `json` holds
    # the spec. Anything else in the graph is prefab-internal (joints, connectors,
    # highlights) and sits at a sub-tile offset that means nothing here.
    ships = {}
    for o in env.objects:
        if o.type.name != "MonoBehaviour": continue
        try: d = o.read_typetree()
        except Exception: continue
        j = d.get("json")
        if isinstance(j, str) and '"components"' in j:
            go = d.get("m_GameObject", {}).get("m_PathID")
            ships[go] = j
    # MissionController.initialShip names the PLAYER's ship (MissionController.cs:63,
    # `Controller.Instance.game.playerShip = initialShip`). Without this the gate
    # cannot tell a foe from the player, and in two scenes the answer is surprising:
    # SideShooter's and TwinTurrets' player is a lone Brain, not the armed ship.
    player = None
    for o in env.objects:
        if o.type.name != "MonoBehaviour": continue
        try: d = o.read_typetree()
        except Exception: continue
        if "initialShip" in d and "liveMode" in d:
            ref = d["initialShip"].get("m_PathID")
            tgt = byid.get(ref)
            if tgt is not None:
                try: player = tgt.read_typetree().get("m_GameObject", {}).get("m_PathID")
                except Exception: pass
    rows = []
    for pid, (kind, d) in tree.items():
        if kind != "GameObject" or pid not in ships: continue
        for c in d.get("m_Component", []):
            cid = c.get("component", {}).get("m_PathID") or c.get("m_PathID")
            e = tree.get(cid)
            if not e or e[0] != "Transform": continue
            t = e[1]
            pos, rot = t.get("m_LocalPosition", {}), t.get("m_LocalRotation", {})
            import re as _re
            nm = _re.match(r'\{"name":"([^"]*)"', ships[pid])
            # Unity is +y UP and rotates counter-clockwise; the port is +y DOWN and
            # rotates clockwise, so y and the angle both flip. 1 tile = 0.64 world
            # units (Metric.Tile2Pixel).
            rows.append({"go": d.get("m_Name"), "ship": nm.group(1) if nm else "?",
                         "player": pid == player,
                         "wx": round(pos.get("x", 0), 3), "wy": round(pos.get("y", 0), 3),
                         "tx": round(pos.get("x", 0) / 0.64, 2), "ty": round(-pos.get("y", 0) / 0.64, 2),
                         "a": round(-quat_to_deg(rot), 2)})
    out[os.path.basename(p)[:-6]] = rows

os.makedirs('data/corepox', exist_ok=True)
with open('data/corepox/scene-transforms.json', 'w') as f:
    json.dump(out, f, indent=1)
for scene, rows in out.items():
    print(scene)
    for r in rows:
        print(f"   {'P' if r['player'] else ' '} {r['go'][:16]:18}{r['ship'][:22]:24} world {r['wx']:7}, {r['wy']:7}"
              f"   ->  tile {r['tx']:7}, {r['ty']:7}   a={r['a']}")
