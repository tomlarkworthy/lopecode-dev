# Every ship prefab embeds the ShipLoader JSON it deserializes from, verbatim.
# Stronger than the scene extraction: it carries connections (cell-addressed),
# hp, dir and the saved connector overrides. Brace-balanced scan, because a
# non-greedy regex stops at the first "]}" inside a connection.
import json, io, glob, os
def blobs(b):
    s = b.decode("utf8", "replace")
    i = 0
    while True:
        i = s.find('{"name":"', i)
        if i < 0: return
        d = 0; instr = False; esc = False
        for j in range(i, min(len(s), i + 200000)):
            ch = s[j]
            if esc: esc = False; continue
            if ch == "\\": esc = True; continue
            if ch == '"': instr = not instr; continue
            if instr: continue
            if ch == "{": d += 1
            elif ch == "}":
                d -= 1
                if d == 0:
                    yield s[i:j+1]; i = j + 1; break
        else:
            i += 1
out = {}
for p in sorted(glob.glob("vendor/corepox/Meritocracy/Assets/prefabs/**/*.prefab", recursive=True)):
    for t in blobs(io.open(p, "rb").read()):
        try: spec = json.loads(t)
        except Exception: continue
        if not spec.get("components") or "connections" not in spec: continue
        out.setdefault(os.path.basename(p)[:-7], []).append(spec)
io.open("scratch/corepox-prefabs.json", "w").write(json.dumps(out, indent=1))
for k, v in out.items():
    for s in v:
        print(f"{k:16} {s['name']:22} {len(s['components']):2}c {len(s['connections']):2}w  " +
              " ".join(f"{c['type']}{tuple(c['pos'])}" for c in s["components"]))
