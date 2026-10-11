import json,subprocess,os,glob,re,sys,collections
S='/tmp/claude-502/-Users-tom-larkworthy-dev-lopecode-dev/f40304e6-f5ee-4efc-9919-e4221793ad04/scratchpad/lean/'
POST='--post' in sys.argv
# 1. every cost comment
ev=[];after=0
while True:
    out=subprocess.run(['bun','tools/cloud-brain/brain.ts','curl',f'/xrpc/com.lopecode.brain.issue.sync?after={after}&limit=200','--as','issues-implementer-2'],capture_output=True,text=True,timeout=40,env={**os.environ,'BRAIN_BASE':'cb4'}).stdout
    e=json.loads(out).get('events',[])
    if not e: break
    ev+=e; after=e[-1]['seq']
costs=[];done=set()
for e in ev:
    b=str(e.get('body',''))
    if e.get('type')!='commented': continue
    if b.startswith('cost-usage '):
        try: done.add(json.loads(b[11:])['of'])
        except Exception: pass
    if b.startswith('cost {'):
        try: c=json.loads(b[5:].split('\n')[0])
        except Exception: continue
        c['id']=e['id']; c['seq']=e['seq']; costs.append(c)
# 2. index of subagent transcripts: first prompt -> (role, issue), and the tracker seqs each one saw written
home=os.path.expanduser('~'); idx=[]
for f in glob.glob(home+'/.claude*/projects/*/*/subagents/agent-*.jsonl'):
    first=None;ts=None
    with open(f) as fh:
        for l in fh:
            try:o=json.loads(l)
            except Exception: continue
            if o.get('type')=='user':
                c=o['message'].get('content'); first=c if isinstance(c,str) else ' '.join(x.get('text','') for x in c if isinstance(x,dict)); ts=o.get('timestamp'); break
    if not first: continue
    m=re.search(r'brain-maintenance/agents/([a-z-]+)\.md',first); i=re.search(r'Issue: *(\S+)',first)
    if m and i: idx.append({'file':f,'role':m.group(1),'issue':i.group(1),'ts':ts,'agent':os.path.basename(f)[6:-6],'session':f.split('/')[-3]})
def use(args):
    o=subprocess.run(['bun','tools/cloud-brain/agent-usage.ts']+args,capture_output=True,text=True).stdout.strip()
    return json.loads(o) if o else None
def wrote(f,seq):
    t=open(f).read(); return bool(re.search(r'\\*"seq\\*":\s*%d,\s*\\*"event\\*":'%seq,t))
byagent=collections.defaultdict(list)
for c in costs:
    if c.get('agent'): byagent[c['agent']].append(c)
out=[];why=collections.Counter()
for c in costs:
    if c['seq'] in done or c.get('usage'): why['has usage already']+=1; continue
    u=None;how=None
    if c.get('light') and c.get('session'):
        u=use(['--session',c['session']]); how='session'
    elif c.get('agent') and c.get('session'):
        runs=sorted(byagent[c['agent']],key=lambda x:(x.get('round') or 1,x['seq']))
        n=runs.index(c)+1
        total=0
        while use(['--session',c['session'],'--agent',c['agent'],'--run',str(total+1)]): total+=1
        if total==0: why['no transcript']+=1; continue
        if total!=len(runs): why['runs in transcript differ from cost lines']+=1; continue
        u=use(['--session',c['session'],'--agent',c['agent'],'--run',str(n)]); how='agent, run %d of %d'%(n,total)
    else:
        role=c.get('role'); cand=[x for x in idx if x['issue']==c['id'] and x['role']==role]
        ok=[x for x in cand if c.get('event') and wrote(x['file'],c['event'])]
        if len(ok)!=1: why['no agent id and %s'%('no transcript wrote its event' if not ok else 'several did' ) if c.get('event') else 'no agent id and no event to match']+=1; continue
        x=ok[0]
        total=0
        while use([x['file'],'--run',str(total+1)]): total+=1
        if total!=1: why['matched transcript has several runs']+=1; continue
        u=use([x['file']]); how='matched by event %d'%c['event']; c['agent']=x['agent']; c['session']=x['session']
    if not u: why['no transcript']+=1; continue
    why['ok: '+how.split(',')[0].split(' by')[0]]+=1
    out.append({'id':c['id'],'key':'cost-usage-%s-%s-%s'%(c['id'],c.get('role'),c.get('round') or 1)+('' if not c.get('light') else '-light')+'-%d'%c['seq'],
      'body':'cost-usage '+json.dumps({'of':c['seq'],'role':c.get('role'),'round':c.get('round') or 1,'backfilled':True,'how':how,'agent':c.get('agent'),'session':c.get('session'),'usage':u},separators=(',',':'))})
print(len(costs),'cost comments;',len(out),'to post'); [print('  ',v,k) for k,v in why.most_common()]
json.dump(out,open(S+'backfill.json','w'))
if POST:
    n=0
    for o in out:
        r=subprocess.run(['tools/cloud-brain/issue-as.sh','issues-implementer-2','comment',json.dumps(o)],capture_output=True,text=True)
        if '"seq"' in r.stdout: n+=1
        else: print('FAILED',o['key'],(r.stdout+r.stderr)[:120])
    print('posted',n)
