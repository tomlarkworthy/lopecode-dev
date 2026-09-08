import json, os, re, sys
S = os.environ['S']
phase = sys.argv[1]
live = json.load(open(f'{S}/glpk-canonicalization.json'))['nodes']

def cellname(v):
    b = re.sub(r'^\s*(?://[^\n]*\n)*', '', v).lstrip()
    for pat in (r'(viewof |mutable )?([A-Za-z_$][\w$]*)\s*=', ):
        m = re.match(pat, b)
        if m: return (m.group(1) or '') + m.group(2)
    for pat in (r'(?:async )?function\s+([A-Za-z_$][\w$]*)', r'class\s+([A-Za-z_$][\w$]*)'):
        m = re.match(pat, b)
        if m: return m.group(1)
    return None

norm = lambda s: re.sub(r'\s+', '', re.sub(r'^(viewof |mutable )?[A-Za-z_$][\w$]*\s*=\s*', '',
                        re.sub(r'^\s*(?://[^\n]*\n)*', '', s).lstrip()))

def unmangle(src):
    # the decompiler wraps a cell whose body opens with a comment as `name = {return(\n…\n)}`;
    # Observable wants the comment above the assignment
    m = re.match(r'^([\w$]+) = \{return\(\n((?:\s*//[^\n]*\n)+)(.*)\n\)\}$', src, re.S)
    return f'{m.group(2)}{m.group(1)} = {m.group(3)}' if m else src

ops = []
if phase == 'A':
    for p in json.load(open(f'{S}/rename-plan.json')):
        node = next(n for n in live if n['id'] == p['id'])
        if cellname(node['value']) == p['name']: continue   # already applied
        assert cellname(node['value']) is None, (p['id'], node['value'][:60])
        ops.append({'type': 'modify', 'id': p['id'], 'value': p['new']})
    # toLeq -> withOperator, in place (a rename by delete+insert would move the cell)
    dump = json.load(open(f'{S}/canon-cells.json'))
    bysrc = {}
    for c in dump:
        for nm in c['names']:
            if nm: bysrc[nm] = unmangle(c['source'])
    # cells whose live node is anonymous: they cannot be matched by name, so pin the id
    livebyid = {n['id']: n for n in live}
    for nid, nm in ((239, 'withOperator'),
                    (1436, 'test_canonicalize_scale_10k'),
                    (1575, 'test_isCanonical_1'), (1597, 'test_isCanonical_2'),
                    (1583, 'test_isCanonical_3'), (1662, 'test_isCanonical_4')):
        if norm(livebyid[nid]['value']) != norm(bysrc[nm]):
            ops.append({'type': 'modify', 'id': nid, 'value': bysrc[nm]})
    for nid in (12, 8, 957, 1471):   # viewof tests, testing import, fromLeq, equalsIsSlow
        if nid in {n['id'] for n in live}:
            ops.append({'type': 'remove', 'id': nid})
else:
    dump = json.load(open(f'{S}/canon-cells.json'))
    livenames = {}
    for n in live:
        nm = cellname(n['value'])
        if nm: livenames.setdefault(nm, n)
    for c in dump:
        names = [x for x in c['names'] if x]
        if not names: continue
        nm = names[0]
        n = livenames.get(nm)
        if n is None:
            print(f'  (local-only cell, not handled: {nm})', file=sys.stderr); continue
        src = unmangle(c['source'])
        if norm(n['value']) != norm(src):
            ops.append({'type': 'modify', 'id': n['id'], 'value': src})
json.dump(ops, open(f'{S}/canon-ops-{phase}.json', 'w'), indent=1)
print(f'phase {phase}: {len(ops)} ops', file=sys.stderr)
