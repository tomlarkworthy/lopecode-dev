import re, os, subprocess
OLD_H = 'lopebooks/notebooks/@tomlarkworthy_reactive-annotations.html'
NEW_H = 'lopebooks/notebooks/tomlarkworthy_code-facts.html'
s = open(OLD_H).read()
m = open('tools/reactive-annotations/module.js').read()
i = s.find(m); assert i > 0
outside_before, outside_after = s[:i], s[i + len(m):]

def rep(t, old, new, count=None):
    c = t.count(old)
    if count is not None: assert c == count, (old[:60], c)
    else: assert c > 0, old[:60]
    return t.replace(old, new)

# module text
m = rep(m, '# Reactive annotations', '# Code facts', 1)
m = rep(m, 'reactive-annotations', 'code-facts')                 # module id, tool path, test regex
m = m.replace('_annotations(', '_facts('); m = re.sub(r'\bannotations\b', 'facts', m)                        # the builder cell and its callers
ra_tokens = re.findall(r'(?<![A-Za-z0-9$])ra(?=[A-Z]|-[a-z]|["\'`\s{\[.:)])', m)
m2 = re.sub(r'(?<![A-Za-z0-9$])ra(?=[A-Z]|-[a-z]|["\'`\s{\[.:)])', 'cf', m)
print('ra tokens replaced:', len(ra_tokens))
m = m2
assert 'annotations' not in m, [m[k-40:k+40] for k in [mm.start() for mm in re.finditer('annotations', m)]]
open('tools/reactive-annotations/module.js', 'w').write(m)

# html outside the module
out = outside_before + m + outside_after
out = rep(out, '@tomlarkworthy/reactive-annotations', '@tomlarkworthy/code-facts')
out = rep(out, '<title>Reactive annotations</title>', '<title>Code facts</title>', 1)
out = rep(out, 'content="Reactive annotations"', 'content="Code facts"', 1)
assert 'reactive-annotations' not in out and 'Reactive annotations' not in out
open(NEW_H, 'w').write(out)
os.remove(OLD_H)
print('wrote', NEW_H, len(out))

# supporting files
os.rename('tools/reactive-annotations', 'tools/code-facts')
for p in ['tools/code-facts/core-fixtures.test.ts', 'scratch/ra-patch-export.py', '.gitignore']:
    t = open(p).read()
    t = t.replace('@tomlarkworthy_reactive-annotations.html', 'tomlarkworthy_code-facts.html').replace('reactive-annotations', 'code-facts')
    open(p, 'w').write(t)
    print('updated', p)
