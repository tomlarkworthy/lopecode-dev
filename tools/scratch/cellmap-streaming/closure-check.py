"""Report module blocks a notebook imports but does not carry (transitive closure)."""
import re, sys

def blocks(h):
    out = {}
    for m in re.finditer(r'<script[^>]*?id="([^"]+)"[^>]*?>', h):
        i = m.group(1)
        # module blocks only: javascript mime, no path segment after the module name
        seg = h[m.start():m.end()]
        if 'application/javascript' in seg and i.count('/') == 1:
            end = h.find('</script>', m.end())
            out[i] = h[m.end():end]
    return out

for path in sys.argv[1:]:
    h = open(path, errors='ignore').read()
    bs = blocks(h)
    missing = {}
    for mid, body in bs.items():
        for dep in set(re.findall(r'main\.define\("module (@[\w.-]+/[\w.-]+)"', body)):
            if dep not in bs:
                missing.setdefault(dep, []).append(mid)
    print(f"{path}: {len(bs)} module blocks")
    if not missing:
        print("  closure complete")
    for dep, needers in sorted(missing.items()):
        print(f"  MISSING {dep}  (needed by {', '.join(sorted(needers))})")
