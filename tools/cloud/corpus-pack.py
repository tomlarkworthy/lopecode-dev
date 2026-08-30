# Pack the 2191-design corpus small enough to embed in a notebook.
#
# The raw JSON is 6.8 MB and almost all of it is repeated key names: "type",
# "pos", "dir", "overrides", "name", "value" appear once per component, 45804
# times. Dictionary the strings, flatten each record to a fixed tuple, and the
# information that is left compresses to a fraction.
#
# `overrides` is NOT optional. A first pass dropped it as runtime state; it is on
# 24977 components and never empty ([{"name":"output","value":180}] is a
# Constant's value), so dropping it would have thrown away what most of the
# designs actually say. Verified by tools/cloud/corpus-verify.py, which round-trips
# every field back and compares.
import json, gzip, sys

def pack(ships, ratings):
    types  = sorted({c.get("type") for s in ships.values() for c in (s.get("components") or [])})
    onames = sorted({o.get("name") for s in ships.values() for c in (s.get("components") or [])
                     for o in (c.get("overrides") or [])})
    params = sorted({str(c["param"]) for s in ships.values() for c in (s.get("components") or [])
                     if c.get("param") is not None})
    dirs = ["up", "right", "down", "left"]
    ti = {t: i for i, t in enumerate(types)}
    oi = {n: i for i, n in enumerate(onames)}
    pi = {p: i for i, p in enumerate(params)}
    di = {d: i for i, d in enumerate(dirs)}
    out = []
    for sid, s in ships.items():
        comps = []
        for c in (s.get("components") or []):
            p = c.get("pos") or [0, 0]
            comps.append([ti[c.get("type")], p[0], p[1], di.get(c.get("dir"), 0),
                          pi[str(c["param"])] if c.get("param") is not None else -1,
                          c.get("hp", -1),
                          [[oi[o.get("name")], o.get("value")] for o in (c.get("overrides") or [])]])
        wires = [[*(w.get("from") or [0, 0]), *(w.get("to") or [0, 0])]
                 for w in (s.get("connections") or [])]
        rt = ratings.get(sid) if isinstance(ratings.get(sid), dict) else {}
        out.append([sid, s.get("name") or "", comps, wires,
                    round(rt.get("rating", 0), 4), rt.get("n", 0),
                    round(rt.get("mu", 0), 4), round(rt.get("sigma", 0), 4),
                    s.get("hyperspeed", 0), s.get("hyperAngle", 0),
                    s.get("angularVelocity", 0), s.get("velocity") or 0])
    # 5 ratings name a design that is not in assets/ships, and they carry ~4850
    # matches each -- heavily played ships whose spec is gone. Carried separately
    # rather than dropped: they are evidence that the corpus is incomplete.
    orphans = {k: v for k, v in ratings.items() if k not in ships}
    return {"v": 1, "types": types, "dirs": dirs, "params": params,
            "overrideNames": onames, "ships": out, "orphanRatings": orphans}

def unpack(c):
    types, dirs, params, onames = c["types"], c["dirs"], c["params"], c["overrideNames"]
    ships, ratings = {}, {}
    for sid, name, comps, wires, rating, n, mu, sigma, hs, ha, av, vel in c["ships"]:
        cs = []
        for t, x, y, d, p, hp, ov in comps:
            o = {"type": types[t], "pos": [x, y], "dir": dirs[d]}
            if p >= 0: o["param"] = params[p]
            if hp != -1: o["hp"] = hp
            if ov: o["overrides"] = [{"name": onames[i], "value": v} for i, v in ov]
            cs.append(o)
        ships[sid] = {"name": name, "components": cs,
                      "connections": [{"from": [w[0], w[1]], "to": [w[2], w[3]]} for w in wires],
                      "hyperspeed": hs, "hyperAngle": ha, "angularVelocity": av, "velocity": vel}
        ratings[sid] = {"rating": rating, "n": n, "mu": mu, "sigma": sigma}
    ratings.update(c.get("orphanRatings") or {})
    return ships, ratings

if __name__ == "__main__":
    a = json.load(open(sys.argv[1])); r = json.load(open(sys.argv[2]))["ships"]
    c = pack(a["ships"], r)
    c["relics"] = a["relics"]
    blob = json.dumps(c, separators=(",", ":")).encode()
    open(sys.argv[3], "wb").write(gzip.compress(blob, 9))
    print(f"  {len(a['ships'])} designs, {len(r)} ratings, {len(a['relics'])} relics")
    print(f"  compact {len(blob)/1024:.0f} KB -> gzip {len(gzip.compress(blob,9))/1024:.0f} KB  -> {sys.argv[3]}")
