#!/usr/bin/env python3
"""Put what a Worker runs into its seed, when the Worker was changed by someone else.

  BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts curl "/xrpc/com.lopecode.brain.getSource?worker=brain" --owner > live.json
  python3 tools/cloud-brain/merge-live.py live.json tools/cloud-brain/brain-kernel.ojs
  bun tools/cloud-brain/build.ts, then: brain.ts saw brain

The base is the module in the built notebook, so build first and have no edit of your own in the seed: this is not a
three-way merge. A changed block is found in the seed by its text. A new or removed cell is printed and left to do by hand.
"""
import json, difflib, re, sys
livef, seedp = sys.argv[1:3]
raw = open(livef).read()
j = json.loads(raw[:raw.rindex("}") + 1])
html = open(re.sub(r"tools/cloud-brain/[^/]+$", "lopebooks/notebooks/@tomlarkworthy_cloud-brain.html", seedp)).read()
base = re.search(r'<script[^>]*id="' + re.escape(j["module"]) + r'"[^>]*>(.*?)</script>', html, re.S).group(1)
cut = lambda s: s[:s.index("export default function define")]
a, b = cut(base).splitlines(), cut(j["text"]).splitlines()
seed = open(seedp).read().split("\n")
find = lambda block: [i for i in range(len(seed) - len(block) + 1) if seed[i:i + len(block)] == block]
HEAD = re.compile(r"const \w+ = (?:async )?function _(\w+)\(")
ANON = re.compile(r"const _\w+_anon_[0-9a-f]+ = function _anonymous")
print(j["worker"], j["hash"][:12])
for tag, i1, i2, j1, j2 in reversed([o for o in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes() if o[0] != "equal"]):
    old, new = a[i1:i2], b[j1:j2]
    if len(old) == 1 and len(new) == 1 and ANON.match(old[0]) and ANON.match(new[0]): continue
    if any(HEAD.match(l) for l in old + new):
        print("BY HAND, a cell added or removed near:", (new or old)[0][:120]); continue
    if old:
        h = find(old)
        if len(h) != 1: print("BY HAND, not found once in the seed:", old[0][:120]); continue
        seed[h[0]:h[0] + len(old)] = new; print("replaced at", h[0] + 1, len(old), "->", len(new))
    else:
        k = 1
        while len(h := find(a[i1 - k:i1])) > 1: k += 1
        if not h: print("BY HAND, no place found for:", new[0][:120]); continue
        seed[h[0] + k:h[0] + k] = new; print("inserted at", h[0] + k + 1, len(new))
open(seedp, "w").write("\n".join(seed))
