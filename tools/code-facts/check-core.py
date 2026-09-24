# Recomputes CORE membership from each fixture's attest ledger + cells (rules of core-rules.md, gated per bundle)
# and compares it with the recorded core table. Anchoring uses the recorded attest-time anchor status.
import json,glob,re,os
BUILTINS=set('md html Inputs Plot d3 FileAttachment localDisk py width invalidation now Generators Mutable htl require DOM Promises visibility Files tex svg mermaid dot __ojs_runtime'.split())
EXEC=['reference','null','metamorphic','library']
here=os.path.dirname(os.path.abspath(__file__))
for f in sorted(glob.glob(here+'/fixtures/*.json')):
  d=json.load(open(f)); mod=d['cells_module'][0]; cells=d['cells']
  if len(d['cells_module'])>1: cells=cells[mod]
  roots=d['source']['seedRoots']
  def up(n):
    s=set(); st=[i for i in cells[n]['inputs'] if i not in BUILTINS and i in cells]
    while st:
      x=st.pop()
      if x in s: continue
      s.add(x); st+=[i for i in cells[x]['inputs'] if i not in BUILTINS and i in cells]
    return s
  def reads(n):  # approximation of readsTaskData for this corpus's loaders
    src=cells[n]['definition']
    return any(bool(re.search(r'localDisk\.\w+\(\s*["\'`]'+re.escape(r[len('/local-disk/'):]), src)) or r in src for r in roots or [])
  given={n for n,c in cells.items() if c['given']}
  hc={(h['cell'],h['evidence'],h['kind']):h for h in d['hash_check']}
  info={}
  for row in d['attest']:
    for e in row['list']:
      if e['module']!=mod: continue
      h=hc[(e['cell'],e['evidence'] if e['kind']!='proof' else '(proof text)',e['kind'])]
      if not h['cell_fresh_by_hash'] or h['evidence_fresh_by_hash'] is False: continue
      if e['kind']=='crossing':
        x=[c for c in d['crossChecks'] if c['name']==e['evidence']]
        if not (x and x[0]['independent'] and x[0]['agree']): continue
      info.setdefault(e['cell'],{})[e['evidence']]=e
  score=lambda n: sum(0.5 if e['kind'] in('proof','literature') else 1 for e in info.get(n,{}).values())
  def anch(e):
    if e['kind'] not in EXEC or e['evidence'] not in cells or not any(reads(u) for u in up(e['evidence'])): return 'synthetic'
    if e['kind']=='null': return 'real-anchored'
    a=e.get('anchor'); return a['status'] if a and a.get('status') in('real-anchored','demoted') else 'unmeasured'
  b=int(d['source']['bundle'][2:])  # df33 added anchoring; df34 stopped a null from anchoring alone
  anchorBy={n:any((b<34 or e['kind']!='null') and anch(e)=='real-anchored' for e in es.values()) for n,es in info.items()} if roots and b>=33 else {}
  core=set()
  while True:
    ch=False
    for n in cells:
      if n in given or n in core or score(n)<1.5 or (n in anchorBy and not anchorBy[n]): continue
      if all(u in given or u in core for u in up(n)): core.add(n); ch=True
    if not ch: break
  rec=set(d['expected']['recorded_core_table'][mod]['core'])
  print(os.path.basename(f), d['source']['bundle'], 'MATCH' if core==rec else 'DIFF computed-recorded=%s recorded-computed=%s'%(sorted(core-rec),sorted(rec-core)))
