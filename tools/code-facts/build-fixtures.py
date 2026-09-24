import json,glob,re,os,sys
T='/Users/tom.larkworthy/dev/lopecode-dev/tools/robocoop-5/eval/tbs/trajectories'
OUT='/Users/tom.larkworthy/dev/lopecode-dev/tools/code-facts/fixtures'
REL='tools/robocoop-5/eval/tbs/trajectories'
DATA_RE=re.compile(r'localDisk|FileAttachment|/local-disk|fetch\(|readText|readBytes|py\.run')
DELIV_RE=re.compile(r'''localDisk\.write\(\s*['"`][^'"`]*(results|output|outputs|submission)|/local-disk/[^'"`]*/(results|output|outputs|submission)\b''')
FN_RETURN_RE=re.compile(r'\breturn\b[\s(]*(?:async\s+)?(?:function\b|(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>)')
BUILTINS=set('md html Inputs Plot d3 FileAttachment localDisk py width invalidation now Generators Mutable htl require DOM Promises visibility Files tex svg mermaid dot __ojs_runtime'.split())
def fnv(t):
  h=2166136261
  u=t.encode('utf-16-le')
  for i in range(0,len(u),2):
    c=u[i]|(u[i+1]<<8)
    h=((h^c)*16777619)&0xffffffff
  return '%x.%d'%(h,len(u)//2)
def parse_src(path):
  s=open(path).read()
  defs={}
  for m in re.finditer(r'\$def\("([^"]*)", "([^"]*)", (\[[^\]]*\]), (_[\w$]+)\)',s):
    defs[m.group(2)]={'pid':m.group(1),'inputs':json.loads(m.group(3)),'fn':m.group(4)}
  others=[]
  for m in re.finditer(r'main\.(?:variable\([^)]*\)\.)?define\("([^"]+)"',s):
    others.append(m.group(1))
  # function texts
  starts=[(m.start(),m.group(1),m.end()) for m in re.finditer(r'^const (_[\w$]+) = ',s,re.M)]
  end_all=s.find('export default function define')
  texts={}
  for i,(st,nm,bodyst) in enumerate(starts):
    en=starts[i+1][0] if i+1<len(starts) else end_all
    seg=s[bodyst:en].split('\n')
    if seg[0].rstrip().endswith('};'): lines=[seg[0]]
    else:
      lines=[seg[0]]
      for ln in seg[1:]:
        lines.append(ln)
        if re.match(r'^\)?\};\s*$',ln): break
    t='\n'.join(lines).rstrip()
    if t.endswith(';'): t=t[:-1]
    texts[nm]=t
  return s,defs,others,texts
def cellsOf(srcfile, moduleId):
  s,defs,others,texts=parse_src(srcfile)
  cells={}
  for name,d in defs.items():
    t=texts.get(d['fn'],'')
    body=re.sub(r'^(?:async\s+)?function\b[^(]*\([^)]*\)\s*\{','',t,count=1)
    nonbuiltin=[x for x in d['inputs'] if x not in BUILTINS]
    data=bool(DATA_RE.search(t))
    fnish=bool(FN_RETURN_RE.search(body))
    deliv=bool(DELIV_RE.search(t))
    cells[name]={'inputs':d['inputs'],'pid':d['pid'],
      'source_head':t[:120],'definition':t,
      'definition_hash':fnv(t),
      'matches_DATA_RE':data,'matches_DELIVERABLE_RE':deliv,
      'nonbuiltin_inputs':nonbuiltin,
      'returns_function_by_source':fnish,
      'given': (data or (not nonbuiltin and not fnish)) and not deliv,
      'deliverable': deliv}
  return cells,others
def tool_calls(conv):
  calls=[];res={}
  for m in conv:
    for tc in (m.get('tool_calls') or []):
      calls.append((tc['id'],tc['function']['name'],tc['function'].get('arguments')))
    if m['role']=='tool': res[m.get('tool_call_id')]=m.get('content')
  return calls,res
def parse_cs(text):
  core=[];blocked=[];tail=None
  for l in text.split('\n'):
    m=re.match(r'CORE \(\d+[^)]*\): (.*)$',l)
    if m: core=[] if m.group(1)=='(none)' else m.group(1).split(', ')
    m=re.match(r'  (\S+) → (.*)$',l)
    if m: blocked.append(l.strip())
    if l.startswith('task_complete still blocked on: ') or l.startswith('every cell upstream'): tail=l
  return core,blocked,tail
def build(walk,turn,with_text=True):
  w=f'{T}/{walk}'
  d=json.load(open(f'{w}/variable-star-vetting-{turn}.json'))
  L=json.load(open(f'{w}/snap-{turn}/ledger.json'))
  conv=d['conversation']
  bundle=(re.findall(r'bigcap-(df\d+)',json.dumps(conv[1])) or ['?'])[0]
  srcs=sorted(glob.glob(f'{w}/snap-{turn}/src/**/*.js',recursive=True))
  files=[f'{REL}/{walk}/variable-star-vetting-{turn}.json',f'{REL}/{walk}/walk-variable-star-vetting-{turn}.md',f'{REL}/{walk}/snap-{turn}/question.txt',f'{REL}/{walk}/snap-{turn}/ledger.json']+[p.replace(T,REL) for p in srcs]
  cells={};mods={};extra={}
  for p in srcs:
    mid=p.split('/src/')[1][:-3]
    c,o=cellsOf(p,mid); mods[mid]=c; extra[mid]=o
  calls,res=tool_calls(conv)
  missing=[]
  exp={}
  cs=[(cid,a) for cid,nm,a in calls if nm=='core_status' and cid in res]
  RO={'read_file','grep','glob','inspect_value','task_complete','list_values','core_status','fetch_text'}
  if with_text and cs:
    cid,args=cs[-1]
    idx=[c[0] for c in calls].index(cid)
    after=[nm for _,nm,_ in calls[idx+1:]]
    assert all(a in RO for a in after),after
    text=res[cid]
    core,blocked,tail=parse_cs(text)
    exp={'module':json.loads(args).get('module'),'core':core,'blocked':blocked,'blocking_line':tail,'core_status_text':text,
         'core_status_call':{'tool_call_id':cid,'index_in_turn':idx,'calls_after':after}}
  else:
    exp={'core':None,'blocked':None,'core_status_text':None}
    missing.append('no core_status call in this turn after its last mutating tool call: expected.core/blocked come only from the collected table (expected.recorded_core_table)')
  exp['recorded_core_table']=L.get('core')
  exp['note']='core_status_text is the verbatim tool result of the turn\'s last core_status call (only read-only tools follow it). recorded_core_table is __rc5CoreAll() read by LEDGER_COLLECT at turn end (snap ledger.json .core). Both are copied, not derived.'
  # check text vs table
  if exp.get('core') is not None:
    t=L['core'].get(exp['module'],{})
    exp['text_matches_table_core']=sorted(t.get('core',[]))==sorted(exp['core'])
  # hash check
  hchk=[]
  for row in L['attest']:
    for e in row['list']:
      mid=e['module']; c=mods.get(mid,{})
      ch=c.get(e['cell'],{}).get('definition_hash'); eh=c.get(e['evidence'],{}).get('definition_hash') if e['kind'] not in('proof','crossing') else None
      hchk.append({'cell':e['cell'],'evidence':e['evidence'] if e['kind']!='proof' else '(proof text)','kind':e['kind'],
        'cellHash_recorded':e['cellHash'],'cellHash_from_src':ch,'cell_fresh_by_hash':ch==e['cellHash'] if ch else None,
        'evidenceHash_recorded':e.get('evidenceHash'),'evidenceHash_from_src':eh,'evidence_fresh_by_hash':(eh==e.get('evidenceHash')) if eh else None})
  missing.append('cells: inputs/source come from the /src snapshot of the module file at turn end; runtime-only facts are NOT recorded: whether a zero-input cell\'s VALUE holds a function (isFunctionCell checks _value first), the resolved upstream set through imports, pids of variables defined by main.define, and the attest-time sensitivity run (only its result, attest[].list[].anchor, is recorded)')
  missing.append('cells[*].given / deliverable are DERIVED by this fixture builder from the src text with the bundle\'s DATA_RE / DELIVERABLE_RE / FN_RETURN_RE (not recorded); the recorded GIVEN list is in expected.recorded_core_table[module].given')
  if not L.get('entries'): missing.append('crossChecks: the ledger had no cross_check entries this turn (empty, not lost)')
  BN={'df34':'recorded under df34: every rule in core-rules.md applies as written.',
      'df33':'recorded under df33, NOT df34: a real-anchored null DOES satisfy the anchoring rule here (df34 R6 D2 closed that), and destroy() permuted numeric columns instead of redrawing them. A df34 re-implementation is expected to DIFFER on cells anchored only by a null (here: lombScargle, anchored by realNullRef).',
      'df32':'recorded under df32: no anchoring rule (df33/df34 absent: no anchor field, no anchored lines); seed roots and GIVEN demotion (df29), path kinds (df22), freeze (df32) apply. With __rc5SeedRoots set a df34 re-implementation would additionally require real-anchored evidence.',
      'df18':'recorded under df18: no seed-root demotion (df29), no path-kind rule (df22), no latest-per-evidence dedupe (df26), no freeze (df32), no anchoring (df33/34). Included as the only recorded ledger with cross_check entries and crossing attestations.'}
  missing.insert(0,BN.get(bundle,'bundle '+bundle))
  fx={'source':{'walk':walk,'turn':turn,'bundle':bundle,'files':files,
      'seedRoots':re.findall(r'the task\'s data under ([^,)]+)',exp.get('core_status_text') or '')[:1] or None,
      'applyCount':L.get('applyCount'),'mayEdit_from_core_status':(lambda m: m.group(1).split(', ') if m and m.group(1)!='none' else ([] if m else None))(re.search(r're-opened this turn: ([^)]*)\)',exp.get('core_status_text') or '')),'mayEdit_question':'see snap-%d/question.txt (the note\'s May edit: line drives __rc5MayEdit)'%turn},
      'attest':L['attest'],'crossChecks':L.get('entries',[]),
      'cells':mods if len(mods)>1 else list(mods.values())[0] if mods else {},
      'cells_module':list(mods.keys()),
      'non_def_variables':extra,
      'hash_check':hchk,
      'expected':exp,'missing':missing}
  out=f'{OUT}/{walk}-turn{turn}.json'
  json.dump(fx,open(out,'w'),indent=1,ensure_ascii=False)
  print(out, bundle, 'core',exp.get('core'), 'match',exp.get('text_matches_table_core'), 'hash ok', sum(1 for h in hchk if h['cell_fresh_by_hash']), '/', len(hchk))
for walk,turn,wt in [('walk-20260906g-variable-star-vetting',7,1),('walk-20260924ai-variable-star-vetting',6,1),('walk-20260924ai-variable-star-vetting',7,1),('walk-20260924ai-variable-star-vetting',8,1),('walk-20260924ai-variable-star-vetting',11,0),('walk-20260924ah-variable-star-vetting',5,1),('walk-20260923ag-variable-star-vetting',4,1),('walk-20260923ag-variable-star-vetting',9,1)]:
  build(walk,turn,bool(wt))
