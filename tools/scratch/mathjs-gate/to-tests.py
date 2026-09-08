# Convert @tomlarkworthy/glpk-canonicalization's createSuite/expect suite to test_* cells.
# Rewrites the working copy .js and emits the matching Observable node plan.
import json, re, sys, collections

S = '/tmp/claude-502/-Users-tom-larkworthy-dev-lopecode-dev/fde6819f-8a1a-4f44-9281-3e40cead7bad/scratchpad'
JS = 'modules/@tomlarkworthy/glpk-canonicalization.js'
doc = json.load(open(S + '/canon.json'))
src = open(JS).read()

HELPER_ARG = {'check': 1, 'checkStep': 1}
GROUP = {'checkExtract': 'extract', 'canonicalExample': 'canonicalize',
         'step2Example': 'step2', 'simplifyStepExample': 'simplifyStep'}
norm = lambda t: re.sub(r'\s+', '', re.sub(r'^(?:\s*//[^\n]*\n)*', '', t).lstrip())

# --- 1. name every assertion node, in document order ---
cnt = collections.Counter()
plan = []          # {id, name, new}
byNorm = collections.defaultdict(list)
for n in doc['nodes']:
    v = n['value']
    body = re.sub(r'^(?:\s*//[^\n]*\n)*', '', v).lstrip()
    m = re.match(r'([A-Za-z_$][\w$]*)\s*\(', body)
    if not m or m.group(1) not in (*HELPER_ARG, *GROUP):
        continue
    h = m.group(1)
    if h in HELPER_ARG:
        a = re.match(r'\w+\(\s*([A-Za-z_$][\w$]*)\s*,', body)
        group = a.group(1) if a else 'addZeroToRHS_then_constantsToRHS'
    else:
        group = GROUP[h]
    cnt[group] += 1
    name = f'test_{group}_{cnt[group]}' if group != 'addZeroToRHS_then_constantsToRHS' else 'test_addZeroToRHS_then_constantsToRHS'
    lead = re.match(r'((?:\s*//[^\n]*\n)*)', v).group(1)
    plan.append({'id': n['id'], 'name': name, 'new': lead + name + ' = ' + v[len(lead):]})
    byNorm[norm(v)].append(name)

# --- 2. rename the same cells in the working copy ---
renamed = 0
queue = {k: list(v) for k, v in byNorm.items()}
def js_cells(s):
    for m in re.finditer(r'const (_\w+) = (?:async )?function (_\w+)\(([^)]*)\)\{return\(\n(.*?)\n\)\};\n', s, re.S):
        yield m
out = src
for m in list(js_cells(src)):
    key = norm(m.group(4))
    if key not in queue or not queue[key]:
        continue
    name = queue[key].pop(0)
    pid, fn = m.group(1), m.group(2)
    out = out.replace(f'const {pid} = function {fn}(', f'const {pid} = function _{name}(', 1)
    old_def = re.search(r'\$def\("' + pid + r'", null, (\[[^\]]*\]), ' + pid + r'\);', out)
    assert old_def, pid
    out = out.replace(old_def.group(0), f'$def("{pid}", "{name}", {old_def.group(1)}, {pid});', 1)
    renamed += 1
leftover = sum(len(v) for v in queue.values())
print(f'renamed {renamed} assertion cells in the .js; {leftover} plan entries unmatched', file=sys.stderr)
open(JS, 'w').write(out)
json.dump(plan, open(S + '/rename-plan.json', 'w'), indent=1)
print(f'plan: {len(plan)} nodes', file=sys.stderr)
