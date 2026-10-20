import json,collections,re,os,datetime
S=os.environ["S"]
D=json.load(open(S+"/retro/issues.json"))
P=lambda s: datetime.datetime.fromisoformat(s.replace("Z","+00:00"))
W0=P("2026-10-18T00:00:00Z")
multi=[];afterback=[]; owner_ap=0
for id,d in D.items():
    ev=d["events"]
    ap=[e for e in ev if e["type"]=="moved" and e["move"]=="approve" and P(e["at"])>=W0]
    if len(ap)>=2: multi.append((id,len(ap)))
    for a in ap:
        later=[e for e in ev if e["seq"]>a["seq"] and e["type"]=="moved" and e["move"] in("rework","back","not-done","requeue")]
        if later: afterback.append((id,a["seq"],later[0]["move"])); break
print("issues approved 2+ times:",len(multi),sorted(multi,key=lambda x:-x[1])[:10])
print("issues whose approve was followed by rework/back/requeue/not-done:",len(afterback))
# approvals of kind: how many 'approve' moves from awaiting-approval by non-approver agents
who=collections.Counter()
for id,d in D.items():
    for e in d["events"]:
        if e["type"]=="moved" and e["move"]=="approve" and P(e["at"])>=W0: who[re.sub(r"[0-9a-f]{6}$","",str(e["by"]))]+=1
print(who.most_common(10))
# to-approval moves: awaiting-approval waiting time (to-approval -> approve)
w=[]
for id,d in D.items():
    ev=d["events"]
    for a in ev:
        if a["type"]=="moved" and a["move"]=="to-approval":
            n=[e for e in ev if e["seq"]>a["seq"] and e["type"]=="moved" and e["from"]=="awaiting-approval"]
            if n: w.append((P(n[0]["at"])-P(a["at"])).total_seconds()/3600)
import statistics
print("awaiting-approval wait hours: n=%d median %.2f p75 %.2f p90 %.1f max %.0f"%(len(w),statistics.median(w),statistics.quantiles(w,n=4)[2],statistics.quantiles(w,n=10)[8],max(w)))
# sessions' opened issues
op=collections.Counter()
for id,d in D.items():
    o=[e for e in d["events"] if e["type"]=="opened"][0]
    if P(o["at"])>=W0: op[re.sub(r"[0-9a-f]{6}$","",str(o["by"]))]+=1
print("opened since 10-18 by:",op.most_common(10))
# issue chain depth: issues whose title says fix/guard/post mortem
pm=[d["issue"]["id"] for d in D.values() if re.search(r"post.?mortem|pm-",d["issue"]["title"]+d["issue"]["id"],re.I)]
print("post-mortem issues:",len(pm),pm[:10])
# symptom histogram: ship comments
sym=collections.defaultdict(collections.Counter)
pat={"ship waits for approval (link)":"the deployer waits for an approval","drain ran ship, ended 1, nothing deployed":"drain.ts ran ship.ts after the pass","stale patch":"does not go on what the Brain runs now","tests-failed on dry":"tests-failed","unsticker 'left/not mended'":"Unsticker"}
for id,d in D.items():
    for e in d["events"]:
        b=e.get("body") or ""
        if e["type"]=="commented":
            for k,p in pat.items():
                if p in b: sym[k][e["at"][5:10]]+=1
for k,v in sym.items(): print(k,sorted(v.items()),sum(v.values()))
