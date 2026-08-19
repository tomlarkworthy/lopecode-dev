#!/usr/bin/env python3
"""Per-mission inventory, build envelope, spoils, UI settings and spawners.

Every mission scene carries these as MonoBehaviours next to the ships:
InventoryOverride.items, BuildOverrideSquare(width,height), SpoilsOverride
(spoils + composites), InitialSettingsOverride (six booleans that hide UI actions),
CircleSpawn (period/radius/arc) and MissionController.liveMode. Our MISSIONS table
authored all of those by hand, so this is the check on the authoring.

The scenes are binary, so identify each script by its field signature -- the
typetree gives field names, not the class name.

    tools/.venv-unity/bin/python tools/corepox-mission-settings.py
"""
import UnityPy, glob, os, json

SCENES = 'vendor/corepox/Meritocracy/Assets/scenes/missions'
SIGS = [
    ("inventory", {"items"}),
    ("envelope",  {"width", "height"}),
    ("spoils",    {"spoils", "composites"}),
    ("settings",  {"no_building", "no_removing", "no_connection_creation"}),
    ("spawn",     {"radius", "angle_min_deg", "angle_max_deg"}),
    ("mission",   {"initialShip", "liveMode"}),
]
DROP = {"m_ObjectHideFlags", "m_CorrespondingSourceObject", "m_PrefabInternal",
        "m_GameObject", "m_Script", "m_Enabled", "m_EditorHideFlags", "m_Name",
        "m_EditorClassIdentifier"}

out = {}
for p in sorted(glob.glob(SCENES + '/*.unity')):
    scene = os.path.basename(p)[:-6]
    env = UnityPy.load(p)
    found = {}
    for o in env.objects:
        if o.type.name != "MonoBehaviour":
            continue
        try:
            d = o.read_typetree()
        except Exception:
            continue
        ks = set(d)
        for name, sig in SIGS:
            if sig <= ks:
                found.setdefault(name, []).append(
                    {k: v for k, v in d.items() if k not in DROP})
    out[scene] = found

os.makedirs('data/corepox', exist_ok=True)
json.dump(out, open('data/corepox/mission-settings.json', 'w'), indent=1, sort_keys=True)

def items(lst):
    return ", ".join(f"{i.get('type','?')}:{i.get('name','?')}"
                     f"{'x' + str(i['count']) if i.get('count') else ''}" for i in lst)

for scene, f in out.items():
    print(f"\n{scene}")
    for m in f.get("mission", []):
        print(f"  liveMode {m['liveMode']}")
    for i in f.get("inventory", []):
        print(f"  inventory  {items(i['items'])}")
    for e in f.get("envelope", []):
        print(f"  build box  {e['width']} x {e['height']}")
    for s in f.get("spoils", []):
        print(f"  spoils     {items(s['spoils'])}  composites {s['composites']}")
    for s in f.get("settings", []):
        on = [k for k, v in s.items() if v == 1]
        print(f"  ui         {on or 'all allowed'}")
    for s in f.get("spawn", []):
        print(f"  spawn      period {s.get('period')} radius {s['radius']} "
              f"arc [{s['angle_min_deg']}, {s['angle_max_deg']}] "
              f"offset {s['spawn_angle_offset_deg']} team {s.get('team')!r} "
              f"type {s.get('type')}")


# --- resolve InventoryOverride item references -------------------------------
# InventoryItem.item points at an Item asset in another file: m_FileID indexes the
# scene's external list (1-based), which carries a GUID, and the GUID is what the
# .meta beside the asset records. Without this the inventories read as "?:?".
import re
GUIDS = {}
for meta in glob.glob('vendor/corepox/Meritocracy/Assets/**/*.meta', recursive=True):
    m = re.search(r'guid: ([0-9a-f]{32})', open(meta, errors='ignore').read())
    if m:
        GUIDS[m.group(1)] = meta[:-5]

def swap(g):                      # Unity stores the GUID with each 4-byte group reversed
    b = bytes(g)
    return "".join(b[i:i+4][::-1].hex() for i in range(0, 16, 4))

print("\n=== inventories")
for p in sorted(glob.glob(SCENES + '/*.unity')):
    scene = os.path.basename(p)[:-6]
    inv = out[scene].get("inventory")
    if not inv:
        continue
    env = UnityPy.load(p)
    ext = list(env.files[p].externals)
    names = []
    for it in inv[0]["items"]:
        fid = it["item"]["m_FileID"]
        if fid == 0 or fid > len(ext):
            names.append(f"?x{it['quantity']}")
            continue
        g = ext[fid - 1].guid
        path = GUIDS.get(swap(g)) or GUIDS.get(bytes(g).hex())
        names.append(f"{os.path.basename(path) if path else swap(g)[:8]}x{it['quantity']}")
    print(f"{scene:22} {', '.join(names)}")
