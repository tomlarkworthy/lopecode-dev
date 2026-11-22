# python3 lite/infer/attack/add-rows.py <rows.json>: put each row into spec.ojs after the last row of its statement
import json, sys, re
p = 'lite/soundscript/spec.ojs' if not sys.argv[1:2] == [] else None
spec = __import__('os').path.join(__import__('os').path.dirname(__file__), '../../soundscript/spec.ojs')
s = open(spec).read()
for r in json.load(open(sys.argv[1])):
    line = '  { statement: %s, rule: %s, source: %s }' % (json.dumps(r['statement']), json.dumps(r['rule']), json.dumps(r['source'], ensure_ascii=False))
    if line in s: continue
    rows = [m for m in re.finditer(r'^  \{ statement: "%s", [^\n]*$' % re.escape(r['statement']), s, re.M)]
    assert rows, r['statement']
    last = rows[-1]
    end = last.end()
    text = last.group(0)
    if text.endswith(','):
        s = s[:end] + '\n' + line + ',' + s[end:]
    else:
        s = s[:end] + ',\n' + line + s[end:]
open(spec, 'w').write(s)
