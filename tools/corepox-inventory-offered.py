#!/usr/bin/env python3
"""What the BUILD menu actually offers, per mission.

An InventoryOverride quantity is not what the player gets. UIState.buildOptions
subtracts `placedQty` before offering an item, and drops it entirely when
`placedQty >= quantity`:

    composite -> space.findComposites(model.id == item.model.id, team "player")
    component -> space.findComponents(candidate.composite == null &&
                                      name == item.name, team "player")

So a scene can list an item the player is never offered -- and two of them do.

Items are resolved by m_PathID against the prefabs (the same trick
corepox-prefab-ids.py uses), because the .meta files that carry the GUIDs are not
in this checkout, so the scene's external GUID list resolves to nothing.

    tools/.venv-unity/bin/python tools/corepox-inventory-offered.py
"""
import UnityPy, glob, os, json, re, struct, collections

SCENES = 'vendor/corepox/Meritocracy/Assets/scenes/missions'
settings = json.load(open('data/corepox/mission-settings.json'))

# m_PathID -> component prefab. Only the component prefabs can be inventory items,
# which is what keeps this unambiguous: 161910 also appears inside Controller.
PREFABS = sorted(glob.glob('vendor/corepox/Meritocracy/Assets/prefabs/components/Resources/*.prefab'))
BLOBS = [(os.path.basename(p)[:-7], open(p, 'rb').read()) for p in PREFABS]
def prefab_of(pid):
    hit = [n for n, b in BLOBS
           if (str(pid).encode() in b if b[:5] == b'%YAML' else struct.pack('<q', pid) in b)]
    return hit[0] if len(hit) == 1 else "/".join(hit) or f"?{pid}"

for p in sorted(glob.glob(SCENES + '/*.unity')):
    scene = os.path.basename(p)[:-6]
    inv = settings[scene].get("inventory")
    if not inv:
        print(f"{scene:22} no InventoryOverride -- the account's carried inventory")
        continue
    env = UnityPy.load(p)
    by_id = {o.path_id: o for o in env.objects}

    # what the initial ship already carries
    pid = settings[scene]["mission"][0]["initialShip"]["m_PathID"]
    loose, comps, inside, kids = collections.Counter(), collections.Counter(), collections.Counter(), []
    mb = by_id.get(pid)
    if mb is not None:
        gd = by_id[mb.read_typetree()["m_GameObject"]["m_PathID"]].read_typetree()
        tr = next((by_id[(c.get("component") or c)["m_PathID"]] for c in gd["m_Component"]
                   if by_id.get((c.get("component") or c)["m_PathID"]) is not None
                   and by_id[(c.get("component") or c)["m_PathID"]].type.name == "Transform"), None)
        for ch in (tr.read_typetree().get("m_Children", []) if tr else []):
            cho = by_id.get(ch["m_PathID"])
            if cho is None: continue
            g = by_id.get(cho.read_typetree()["m_GameObject"]["m_PathID"])
            if g is None: continue
            g2 = g.read_typetree()
            for c in g2.get("m_Component", []):
                co = by_id.get((c.get("component") or c)["m_PathID"])
                if co is None or co.type.name != "MonoBehaviour": continue
                try: cd = co.read_typetree()
                except Exception: continue
                if "model" in cd and "occupancy" in cd:
                    comps[(cd.get("model") or {}).get("id")] += 1
                    for sc in (cd.get("model") or {}).get("components", []):
                        inside[sc["type"]] += 1
                elif "joints" in cd and "placement" in cd:
                    kids.append(g2.get("m_Name"))
        loose = collections.Counter(kids) - inside

    print(f"\n{scene}")
    print(f"  ship carries loose {dict(loose)}  composites {dict(comps)}")
    for it in inv[0]["items"]:
        fid, ipid = it["item"]["m_FileID"], it["item"]["m_PathID"]
        if fid == 0:
            o = by_id.get(ipid)
            mid = None
            for c in (o.read_typetree().get("m_Component", []) if o else []):
                co = by_id.get((c.get("component") or c)["m_PathID"])
                if co is None or co.type.name != "MonoBehaviour": continue
                try: cd = co.read_typetree()
                except Exception: continue
                if "model" in cd and "occupancy" in cd: mid = (cd.get("model") or {}).get("id")
            name, placed = f"composite {mid}", comps.get(mid, 0)
        else:
            name = prefab_of(ipid)
            placed = loose.get(name, 0)
        left = it["quantity"] - placed
        print(f"    {name:30} qty {it['quantity']}  placed {placed}  -> "
              f"{'OFFERED x' + str(left) if left > 0 else 'NOT OFFERED'}")
