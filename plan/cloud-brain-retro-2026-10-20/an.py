import json,collections,re,statistics,datetime,os
S=os.environ["S"]
D=json.load(open(S+"/retro/issues.json"))
P=lambda s: datetime.datetime.fromisoformat(s.replace("Z","+00:00"))
day=lambda e: e["at"][5:10]
W0=P("2026-10-18T00:00:00Z")
# A throughput
done=collections.defaultdict(list)
for id,d in D.items():
    i=d["issue"]
    for e in d["events"]:
        if e["type"]=="moved" and e["to"]=="done" and P(e["at"])>=W0: done[day(e)].append((id,i["about"],e["move"],e["by"]))
print("== A: issues reaching done, per day (move: approve=owner/session approve, pass=reviewer pass)")
for dd in sorted(done): 
    c=collections.Counter(x[1] for x in done[dd]); print(dd,len(done[dd]),dict(c.most_common(6)))
tot=sum(len(v) for v in done.values()); print("total",tot)
LOOPABOUT={"cloud-brain-dev","brain-x-loop","brain-x-issues","brain-deployer","brain","brain-core","brain-db","brain-kernel","brain-x-kernel","brain-x-git","owners"}
loopish=sum(1 for v in done.values() for x in v if x[1] in LOOPABOUT); print("done that are about the loop/tracker/infra:",loopish,"of",tot)
prod=collections.Counter(x[1] for v in done.values() for x in v if x[1] not in LOOPABOUT); print("product/service done:",sum(prod.values()),dict(prod.most_common(12)))
# B approvals
links=collections.defaultdict(set); 
for id,d in D.items():
    for e in d["events"]:
        if e["type"]=="commented" and e.get("body") and "Approve at https://" in e["body"] and "auth/request?id=" in e["body"]:
            m=re.search(r"request\?id=(dp-[0-9a-f]+)",e["body"]); 
            if m: links[id].add((m.group(1),e["at"]))
nl=sum(len(v) for v in links.values()); print("\n== B: approval links created",nl,"for",len(links),"issues; distinct ids",len({a for v in links.values() for a,_ in v}))
shipped=0; never=[]
for id,v in links.items():
    st=D[id]["issue"]["state"]
    (never if st not in("done","closed") else []).append((id,len(v),st))
    if st in("done","closed"): shipped+=1
print("issues with a link that are done now:",shipped,"; still not done:",len(never)); print(sorted(never,key=lambda x:-x[1])[:15])
print("links per issue distribution:",collections.Counter(len(v) for v in links.values()))
# owner approve events
ap=collections.Counter(); 
for id,d in D.items():
    for e in d["events"]:
        if e["type"]=="moved" and e["move"]=="approve" and P(e["at"])>=W0: ap[(day(e), "owner/session" if str(e["by"]).startswith(("out","owner","claude")) else "approver-agent")]+=1
print("approve moves by day/actor:",sorted(ap.items()))
# C redo
ch=collections.Counter(); rw=0; 
for id,d in D.items():
    n=sum(1 for e in d["events"] if e["type"]=="reviewed" and e["verdict"]=="changes"); 
    if n: ch[id]=n
print("\n== C: 'changes' reviews",sum(ch.values()),"on",len(ch),"issues; top",ch.most_common(8))
redo=[id for id,d in D.items() if re.match(r"redo of",d["issue"]["title"],re.I) or "redo" in id]
print("issues titled/named redo:",len(redo))
sr=collections.Counter()
for id,d in D.items():
    for e in d["events"]:
        if e["type"]=="commented" and e.get("body","").startswith('{"kind":"run-stop"'):
            try: sr[json.loads(e["body"].split("\n")[0])["outcome"]]+=1
            except Exception: m=re.search(r'"outcome":"([^"]+)"',e["body"]); sr[m.group(1) if m else "?"]+=1
print("\n== D: run-stop comments by outcome",sr.most_common(14), "total",sum(sr.values()))
# E cost
cr=collections.Counter(); cd=collections.Counter(); oc=collections.Counter()
for id,d in D.items():
    for e in d["events"]:
        if e["type"]=="cost": cr[e["role"]]+=1; cd[day(e)]+=1; oc[(e["role"],e["outcome"])]+=1
print("\n== E: agent runs recorded:",sum(cr.values()),dict(cr)); print("per day",sorted(cd.items())); print("outcomes",oc.most_common(16))
# F lead time
lt=[];pd=[]
for id,d in D.items():
    ev=d["events"]; r=[P(e["at"]) for e in ev if e["type"]=="moved" and e["to"]=="ready"]; dn=[P(e["at"]) for e in ev if e["type"]=="moved" and e["to"]=="done"]
    if r and dn: lt.append((dn[-1]-r[0]).total_seconds()/3600)
    ps=[P(e["at"]) for e in ev if e["type"]=="reviewed" and e["verdict"]=="pass"]
    if ps and dn and dn[-1]>=ps[-1]: pd.append((dn[-1]-ps[-1]).total_seconds()/3600)
print("\n== F: ready->done hours median %.1f p75 %.1f max %.1f n=%d"%(statistics.median(lt),statistics.quantiles(lt,n=4)[2],max(lt),len(lt)))
print("last pass->done hours median %.1f p75 %.1f max %.1f n=%d"%(statistics.median(pd),statistics.quantiles(pd,n=4)[2],max(pd),len(pd)))
