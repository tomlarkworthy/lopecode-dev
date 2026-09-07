import re, subprocess, sys
BUILTINS = set("""md html svg tex dot Inputs Plot d3 _ htl now width invalidation visibility FileAttachment
Generators Promises Mutable DOM Files require document window location fetch console navigator
indexedDB Event HashChangeEvent TextEncoder TextDecoder URL URLSearchParams @variable""".split())
mods = ["@tomlarkworthy/foc-data","@tomlarkworthy/foc-chat","@tomlarkworthy/foc-wiki",
        "@tomlarkworthy/foc-demos","@tomlarkworthy/foc-projects","@tomlarkworthy/foc-people"]
bad = 0
for m in mods:
    src = subprocess.run(["bun","tools/lope-reader.ts",
        "lopebooks/notebooks/@tomlarkworthy_foc-viewer.html","--get-module",m],
        capture_output=True, text=True).stdout
    defined = set(re.findall(r'\$def\("[^"]*",\s*"([^"]+)"', src))
    defined |= set(re.findall(r'main\.define\("([^"]+)"', src))
    deps = set()
    for d in re.findall(r'\$def\("[^"]*",\s*(?:"[^"]*"|null),\s*\[([^\]]*)\]', src):
        deps |= set(re.findall(r'"([^"]+)"', d))
    missing = sorted(d for d in deps if d not in defined and d not in BUILTINS)
    print(f"{m}: {len(defined)} defined, {len(deps)} deps, missing={missing}")
    if missing: bad += 1
sys.exit(1 if bad else 0)
