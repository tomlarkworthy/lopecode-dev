# The pack is only useful if it is lossless, and "lossless on the fields I chose to
# keep" is how the first attempt silently dropped 24977 overrides. This compares
# EVERY field of every design, in both directions.
import json, gzip, sys, importlib.util
spec = importlib.util.spec_from_file_location("p", "tools/cloud/corpus-pack.py")
p = importlib.util.module_from_spec(spec); spec.loader.exec_module(p)

a = json.load(open(sys.argv[1])); r = json.load(open(sys.argv[2]))["ships"]
c = json.loads(gzip.open(sys.argv[3]).read())
ships, ratings = p.unpack(c)

def norm(s):
    return {"name": s.get("name") or "",
            "components": sorted(json.dumps({
                "type": x.get("type"), "pos": list(x.get("pos") or [0, 0]),
                "dir": x.get("dir") or "up",
                "param": str(x["param"]) if x.get("param") is not None else None,
                "hp": x.get("hp"),
                "overrides": sorted((o.get("name"), o.get("value")) for o in (x.get("overrides") or []))
            }, sort_keys=True) for x in (s.get("components") or [])),
            "connections": sorted(json.dumps([list(w.get("from") or [0,0]), list(w.get("to") or [0,0])])
                                  for w in (s.get("connections") or [])),
            "hyperspeed": s.get("hyperspeed", 0) or 0,
            "hyperAngle": s.get("hyperAngle", 0) or 0,
            "angularVelocity": s.get("angularVelocity", 0) or 0,
            "velocity": s.get("velocity") or 0}

bad = [sid for sid in a["ships"] if norm(a["ships"][sid]) != norm(ships[sid])]
print(f"designs  {len(a['ships']) - len(bad)}/{len(a['ships'])} identical field-for-field")
if bad:
    sid = bad[0]
    o, b = norm(a["ships"][sid]), norm(ships[sid])
    for k in o:
        if o[k] != b[k]: print(f"  {sid} field {k}\n    orig {str(o[k])[:200]}\n    back {str(b[k])[:200]}")
missing = [k for k in r if k not in ratings]
rbad = [k for k, v in r.items() if isinstance(v, dict) and k in ratings and
        (abs((v.get("rating") or 0) - (ratings[k].get("rating") or 0)) > 1e-3
         or (v.get("n") or 0) != (ratings[k].get("n") or 0))]
if missing: print(f"  MISSING RATINGS: {len(missing)} {missing[:5]}")
print(f"ratings  {len(r) - len(rbad)}/{len(r)} identical (rating to 1e-3, n exact)")
print(f"relics   {len(c.get('relics', {}))} carried")
ovo = sum(len(x.get("overrides") or []) for s in a["ships"].values() for x in (s.get("components") or []))
ovb = sum(len(x.get("overrides") or []) for s in ships.values() for x in (s.get("components") or []))
print(f"overrides {ovb}/{ovo} carried")
