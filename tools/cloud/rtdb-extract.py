# Pull top-level subtrees out of the 569 MB dump and write them in the shape the
# REST API returns, so a local copy and a live fetch are interchangeable.
#
# The Realtime Database stores arrays as children keyed "0","1",...; the REST API
# coerces dense numeric-keyed objects back to arrays and a backup dump does not.
# Skipping this step makes every ship in the corpus look different from its live
# copy -- it is what made all four relics report as changed when nothing had.
import gzip, sys, json

def denum(x):
    if isinstance(x, dict):
        ks = list(x)
        if ks and all(k.isdigit() for k in ks):
            idx = sorted(int(k) for k in ks)
            if idx == list(range(len(idx))):
                return [denum(x[str(i)]) for i in idx]
        return {k: denum(v) for k, v in x.items()}
    if isinstance(x, list):
        return [denum(v) for v in x]
    return x

def subtree(path, key):
    needle = ('"%s":' % key).encode()
    buf = b""; depth = 0; started = False; out = bytearray()
    with gzip.open(path, "rb") as f:
        while True:
            chunk = f.read(1 << 20)
            if not chunk: break
            if not started:
                buf += chunk
                i = buf.find(needle)
                if i < 0:
                    buf = buf[-len(needle):]
                    continue
                chunk = buf[i + len(needle):]; started = True
            for b in chunk:
                c = bytes([b])
                if not out and c in b" \t\r\n": continue
                out += c
                if c in b"{[": depth += 1
                elif c in b"}]":
                    depth -= 1
                    if depth == 0: return json.loads(bytes(out))
    raise SystemExit("not found: " + key)

dump = sys.argv[1]
for key, out in [a.split("=") for a in sys.argv[2:]]:
    d = denum(subtree(dump, key))
    with open(out, "w") as f: json.dump(d, f)
    n = len(d) if hasattr(d, "__len__") else "?"
    print(f"  {key:10} -> {out}  ({n} children)")
