# Composite definitions are NOT in Firebase. A CompositeSpec is a JSON string, and
# it appears in three places, all of them local:
#   SpoilsOverride.composites  -- a string[] field on a mission scene object
#   AimMission.getComposites() -- hard-coded in the C#
#   a Composite component's `param` -- carried inside any ship that uses one
import json, io, glob, os, re
def blobs(text, key='{"id":"'):
    # A CompositeSpec can be pretty-printed (AimMission.cs holds one across several
    # lines), so the opening is matched as a pattern, not a literal.
    pat = re.compile(re.escape(key[0]) + r"\s*" + re.escape(key[1:]))
    pos = 0
    while True:
        m = pat.search(text, pos)
        if not m: return
        i = m.start(); pos = i + 1
        d = 0; instr = False; esc = False
        for j in range(i, min(len(text), i + 200000)):
            ch = text[j]
            if esc: esc = False; continue
            if ch == "\\": esc = True; continue
            if ch == '"': instr = not instr; continue
            if instr: continue
            if ch == "{": d += 1
            elif ch == "}":
                d -= 1
                if d == 0:
                    yield text[i:j+1]; pos = j + 1; break
        else:
            pass

found = {}
roots = ["vendor/corepox/Meritocracy/Assets/scenes", "vendor/corepox/Meritocracy/Assets/prefabs",
         "vendor/corepox/Meritocracy/Assets/scripts"]
for root in roots:
    for p in glob.glob(root + "/**/*", recursive=True):
        if not os.path.isfile(p): continue
        try: t = io.open(p, "rb").read().decode("utf8", "replace")
        except Exception: continue
        # Three escapings in play: plain JSON in a scene field, C# verbatim strings
        # that double every quote, and a CompositeSpec nested inside another JSON
        # string, where every quote is backslash-escaped.
        for key, fix in [('{"id":"', lambda x: x),
                         ('{""id"":""', lambda x: x.replace('""', '"')),
                         ('{\\"id\\":\\"', lambda x: x.replace('\\"', '"'))]:
          for raw in blobs(t, key):
            for cand in (fix(raw),):
                try: c = json.loads(cand)
                except Exception: continue
                if not isinstance(c, dict) or "components" not in c: continue
                cid = c.get("id") or c.get("name")
                if cid in found: break
                found[cid] = {"from": os.path.relpath(p), "spec": c}
                break
# and from the corpus: any Composite component's param
for line in io.open("vendor/corepox/firebase/data/ships.json", encoding="utf8", errors="replace"):
    i = line.find(",")
    if i < 0: continue
    try: s = json.loads(line[i+1:])
    except Exception: continue
    for c in (s.get("components") or []):
        if c.get("type") != "Composite" or not c.get("param"): continue
        try: sub = json.loads(c["param"])
        except Exception: continue
        cid = sub.get("id") or sub.get("name")
        if cid and cid not in found:
            found[cid] = {"from": "firebase/data/ships.json", "spec": sub}
io.open("scratch/corepox-composites.json", "w").write(json.dumps(found, indent=1))
print(f"{len(found)} distinct composite definitions\n")
for k, v in found.items():
    sp = v["spec"]
    print(f"{k:24} {len(sp.get('components',[])):2}c {len(sp.get('connections') or []):2}w  {v['from']}")
    print("     " + " ".join(f"{c['type']}{tuple(c['pos'])}" for c in sp["components"]))
