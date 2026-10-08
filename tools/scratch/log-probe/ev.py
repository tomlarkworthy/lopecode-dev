import sys, json, collections
d, _ = json.JSONDecoder().raw_decode(sys.stdin.read().lstrip())
if 'result' not in d: print(json.dumps(d)[:600]); sys.exit()
ev = d['result']['events'].get('events', [])
print(len(ev), dict(collections.Counter(e['$workers']['scriptName'] for e in ev)))
if len(sys.argv) > 1:
    for e in ev[:int(sys.argv[1])]: print(e['$workers']['scriptName'], json.dumps(e['source'])[:300], {k: e['$metadata'].get(k) for k in ('trigger','type','origin') if k in e['$metadata']})
