#!/usr/bin/env python3
"""Compute unreachable @user/module blocks in a lopecode notebook.

Reachability = BFS from bootconf.mains (+ bootloader) through each module's
import("/@user/name.js?v=...") references. Prints kept vs orphan modules.
Does NOT modify the file. Feed the orphan list to strip-orphans.py.
"""
import re, sys, json
from pathlib import Path

path = Path(sys.argv[1])
html = path.read_text()

# All <script ...>...</script> blocks, capture attrs + body
block_re = re.compile(r'<script\b([^>]*)>([\s\S]*?)</script>', re.MULTILINE)
def attr(attrs, name):
    m = re.search(name + r'\s*=\s*"([^"]*)"', attrs)
    return m.group(1) if m else None

modules = {}   # id -> body   (id matches ^@x/y$  exactly one slash)
for attrs, body in block_re.findall(html):
    sid = attr(attrs, 'id')
    mime = attr(attrs, 'data-mime') or ''
    if not sid:
        continue
    if sid.startswith('@') and sid.count('/') == 1 and 'javascript' in mime:
        modules[sid] = body

# bootconf mains
bootconf = None
for attrs, body in block_re.findall(html):
    if attr(attrs, 'id') == 'bootconf.json' and len(body) < 4000:
        bootconf = json.loads(body.strip())
mains = list(bootconf['mains']) if bootconf else []

# dep edges
imp_re = re.compile(r'import\("/(@[^"?]+?)\.js')
def deps(mid):
    out = set()
    for ref in imp_re.findall(modules.get(mid, '')):
        if ref in modules:
            out.add(ref)
    return out

roots = set(mains)
for b in ('@tomlarkworthy/bootloader',):
    if b in modules:
        roots.add(b)

seen = set()
stack = list(roots)
while stack:
    m = stack.pop()
    if m in seen:
        continue
    seen.add(m)
    stack.extend(deps(m) - seen)

orphans = sorted(set(modules) - seen)
kept = sorted(seen)
print(f"# modules total={len(modules)} kept={len(kept)} orphan={len(orphans)}")
print("\n## KEPT")
for m in kept:
    print("  ", m)
print("\n## ORPHAN (strip these)")
for m in orphans:
    print("  ", m)
print("\n## orphan args:")
print(" ".join(orphans))
