# Which component prefab is inventory item m_PathID N? An InventoryItem's `item`
# PPtr names an object inside a prefab file, so the prefab that contains that id is
# the answer. Text prefabs (Armour, Brain) declare it as `--- !u!1 &<id>`; binary
# ones (2019.2 SerializedFile, format 20) carry it in the object table as an
# int64. Search for both rather than parsing the format, because these files ship
# the type tree inlined and walking it is not worth it here.
import glob, os, re, struct, sys

files = sorted(glob.glob("vendor/corepox/Meritocracy/Assets/prefabs/**/*.prefab", recursive=True))
want = [int(x) for x in sys.argv[1:]]
hits = {}
for p in files:
    b = open(p, "rb").read()
    text = b[:5] == b"%YAML"
    ids = set(int(m) for m in re.findall(rb'^--- !u!\d+ &(\d+)', b, re.M)) if text else None
    for w in want:
        found = (w in ids) if text else (struct.pack("<q", w) in b)
        if found: hits.setdefault(w, []).append(os.path.basename(p)[:-7] + ("" if text else "*"))
for w in want:
    print(str(w).rjust(20), "->", ", ".join(hits.get(w, ["-- not found --"])))
print("\n* = matched as a raw int64 in a binary prefab, not a YAML anchor")
