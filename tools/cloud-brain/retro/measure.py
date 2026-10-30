#!/usr/bin/env python3
# measure.py  the daily retro's numbers, from the tracker's record and the deployer's log. No model, read-only.
#   python3 pull-sync.py                              # writes $S/events.json from issue.sync (brain.ts curl --owner)
#   python3 measure.py [--now ISO] [--json]           # reads $S/events.json and $S/deploys7d.json, prints the tables
# S defaults to /tmp/retro. The classes of an issue (product, loop, tracker, docs, tooling, owners) are regexes over
# `about` and the title (CLASS below): say so when quoting them. Written 2026-10-20 by the first retro.
import json,collections,re,os,sys,datetime,statistics
S=os.environ.get("S","/tmp/retro")
E=json.load(open(S+"/events.json"))
try: DEP=json.load(open(S+"/deploys7d.json"))
except Exception: DEP=None
args=sys.argv[1:]
NOW=E[-1]["at"]
if "--now" in args: NOW=int(datetime.datetime.fromisoformat(args[args.index("--now")+1].replace("Z","+00:00")).timestamp()*1000)
H=3600000; D1=NOW-24*H; D7=NOW-7*24*H
def iso(ms): return datetime.datetime.fromtimestamp(ms/1000,datetime.timezone.utc).strftime("%Y-%m-%dT%H:%MZ")
def who(e):
    b=e["by"]; h=(b.get("holder") or "").split(":")[-1]
    if b.get("tab"): return "owner (tab)"
    if b.get("caller","").startswith("worker:"): return b["caller"]
    return h.split("-")[0] or b.get("caller","?")
ISSUE={}
BYID=collections.defaultdict(list)
for e in E:
    if e.get("id"): BYID[e.get("id")].append(e)
for e in E:
    if e["type"]=="opened": ISSUE[e.get("id")]={"title":e.get("title",""),"about":e.get("about",""),"kind":e.get("kind",""),"opened":e["at"],"by":who(e),"labels":set(e.get("labels") or [])}
for e in E:
    if e["type"]=="labelled" and e.get("id") in ISSUE:
        ISSUE[e.get("id")]["labels"]|=set(e.get("add") or []); ISSUE[e.get("id")]["labels"]-=set(e.get("remove") or [])
LOOP_ABOUT={"cloud-brain-dev","brain-x-loop","brain-x-issues","brain-x-fly","brain-x-git","issue-loop","loop","issues","dev","tools","rules"}
OWNERS={"brain-core","brain-db","brain-deployer","brain-x-deployer","brain-x-kernel","brain-kernel","deployer","owners"}
LOOP_RE=re.compile(r"\b(drain|loop|triag|approver|reviewer|writer|run\.ts|ship\.ts|push\.ts|tracker|brief|persona|worktree|landing|unstick|orchestrat|redo|token|retro|post.?mortem)\b",re.I)
DOC_RE=re.compile(r"\b(docs?|document|reference|knowledge|record|readme|wiki|spec|philosophy|llms\.txt)\b",re.I)
def klass(i):
    a=i["about"]; t=i["title"]
    if a in LOOP_ABOUT or LOOP_RE.search(t): return "loop/tracker"
    if a in OWNERS: return "owners-four"
    if DOC_RE.search(t): return "docs"
    if a.startswith("brain-x-") or a in("brain","page","brain-x-page","brain-feedback","cloud-brain-docs","knowledge"): return "product"
    return "other"
def win(at): return "24h" if at>=D1 else ("7d" if at>=D7 else None)
out={}
def P(*a): print(*a)
# ---- 1 done, by class
P("## done moves, by window and class (class = regex over about and title)")
done=collections.defaultdict(lambda: collections.Counter()); done_ids=collections.defaultdict(set); done_about=collections.defaultdict(collections.Counter)
for e in E:
    if e["type"]=="moved" and e["to"]=="done":
        w=win(e["at"]); 
        if not w: continue
        i=ISSUE.get(e.get("id"),{"title":"","about":"?","kind":"?"}); k=klass(i)
        for ww in (["24h","7d"] if w=="24h" else ["7d"]): done[ww][k]+=1; done_ids[ww].add(e.get("id")); done_about[ww][i["about"]]+=1
for w in("24h","7d"): P(w,"done moves:",sum(done[w].values()),"issues:",len(done_ids[w]),dict(done[w].most_common())); P("   by about:",dict(done_about[w].most_common(12)))
P("product done, 7d, titles:")
for e in E:
    if e["type"]=="moved" and e["to"]=="done" and e["at"]>=D7:
        i=ISSUE.get(e.get("id")); 
        if i and klass(i)=="product": P("  ",iso(e["at"]),e.get("id"),"|",i["about"],"|",i["title"][:90])
# ---- 2 deploys
P("\n## deploys (deployer log, logs.deploys)")
if DEP:
    L=DEP["lines"]
    for w,lo in(("24h",D1),("7d",D7)):
        c=collections.Counter(l["at"] for l in L if l["t"]>=lo); ver=collections.Counter(l["target"] for l in L if l["t"]>=lo and l["at"]=="deploy.verified")
        P(w,"verified:",sum(ver.values()),dict(ver),"| put-back:",c["deploy.put-back"],"waiting:",c["deploy.waiting"],"approved:",c["deploy.approved"],"refused:",c["deploy.refused"],"failed:",c["deploy.failed"])
    P("by (who deployed), 7d:",dict(collections.Counter(l.get("by") for l in L if l["at"]=="deploy.reason")))
    P("restores 7d:",[(r["target"],iso(r["putBack"]),round(r["ms"]/H,1) if r["ms"] is not None else "not restored") for r in DEP["restores"]])
    # A line of the four kinds that label an issue, made while a live wait named its Worker@hash12, and no receive/ comment
    # of that kind on that issue: the tracker never heard it. issue.receive refused keys over 100 characters until
    # brain-x-issues db051d31b47f (retro 2026-10-28: five approvals of fb-loop-assign-step-reads-every-list lost).
    WAITS=collections.defaultdict(list); ENDAT={}
    for e in E:
        if e["type"]=="waits":
            for w in str(e.get("note") or "").split():
                if w.startswith("deploy:"): WAITS[w[7:]].append((e["id"],e["at"],e.get("until") or 9e15))
        if e["type"]=="moved" and e.get("to") in ("done","closed","rejected"): ENDAT.setdefault(e["id"],e["at"])
    GOT={m.groups() for e in E if e["type"]=="commented" for m in [re.match(r"receive/[^/]+/([a-z.-]+)/(.+)/comment$",e.get("key",""))] if m}
    for w,lo in(("24h",D1),("7d",D7)):
        lost=set()
        for l in L:
            k=l["at"][7:]
            if l["t"]<lo or k not in ("waiting","approved","confirmed","put-back") or not l.get("target") or not l.get("hash"): continue
            for i,a,u in WAITS.get(l["target"]+"@"+l["hash"][:12],[]):
                if a<=l["t"]<u and not ENDAT.get(i,9e15)<l["t"] and (k,i) not in GOT: lost.add((iso(l["t"]),k,l["target"]+"@"+l["hash"][:12],i))
        P(w,"deploy lines a live wait named that never reached the issue:",len(lost),sorted(lost)[:12])
# pass -> live on the tracker: a pass review then a comment that says deployed/live
P("hours from a pass to a `live`/`deployed` comment, 7d, service issues:")
lat=[]
for id,i in ISSUE.items():
    ev=BYID.get(id,[])
    passes=[e for e in ev if e["type"]=="reviewed" and e["verdict"]=="pass"]
    lives=[e for e in ev if e["type"]=="commented" and (e["key"].startswith("ship-") or "live" in e["key"] or "deployed" in (e.get("body") or "")[:40].lower()) and ("deployed the patch" in (e.get("body") or "") or "live" in e["key"] or "Deployed by ship.ts" in (e.get("body") or ""))]
    if passes and lives and passes[0]["at"]>=D7:
        h=(min(l["at"] for l in lives)-passes[0]["at"])/H; lat.append((round(h,1),id,i["about"]))
lat.sort()
P("  n=",len(lat),"median h=",round(statistics.median([x[0] for x in lat]),1) if lat else None,"max=",lat[-1] if lat else None); P("  ",lat)
# ---- 3 owner acts
P("\n## the owner's acts (by.tab true)")
for w,lo in(("24h",D1),("7d",D7)):
    acts=[e for e in E if e["by"].get("tab") and e["at"]>=lo]
    P(w,"events:",len(acts),dict(collections.Counter(e["type"]+(":"+e["move"] if e["type"]=="moved" else "") for e in acts).most_common()))
    appr=[e for e in acts if e["type"]=="moved" and e["move"] in("approve","owner-reject")]
    P("   approvals/rejects by class:",dict(collections.Counter(klass(ISSUE.get(e.get("id"),{"title":"","about":""})) for e in appr)))
    for e in appr: i=ISSUE.get(e.get("id"),{"title":"","about":""}); P("    ",iso(e["at"]),e["move"],e.get("id"),"|",i["about"],"|",i["title"][:80])
    cm=[e for e in acts if e["type"]=="commented"]; 
    for e in cm: P("    comment",iso(e["at"]),e.get("id"),"|",(e.get("body") or "")[:120].replace("\n"," "))
    op=[e for e in acts if e["type"]=="opened"]; 
    for e in op: P("    opened",iso(e["at"]),e.get("id"),"|",e.get("kind"),"|",(e.get("title") or "")[:90])
# ---- 4 dollars
# A resumed run's usd was its session's total until drain2.ts keyed a run's own cost /run-cost (accept.ts runUsd, retro
# 2026-10-24): each cost event's usd is replaced by what that run cost, the same reading of the record.
_before=collections.defaultdict(float); _since=collections.defaultdict(float)
for e in E:
    if e["type"]!="cost" or not e.get("session"): continue
    u=e.get("usd") or 0; s=e["session"]
    if str(e.get("key","")).endswith("/run-cost"): _since[s]+=u
    else: e["usd"]=max(0,u-_before[s]-_since[s]); _before[s]=max(_before[s],u)
P("\n## dollars (cost events; a resumed run's session total turned into the run's own cost)")
for w,lo in(("24h",D1),("7d",D7)):
    # test-retro-cost-* are run.sh's checks of its cost path; test-retro-cost-1792527157 carried the real 12.58 of retro-2026-10-20
    cs=[e for e in E if e["type"]=="cost" and e["at"]>=lo and not str(e.get("id","")).startswith("test-retro-cost-")]
    byrole=collections.defaultdict(float); n=collections.Counter(); byclass=collections.defaultdict(float)
    for e in cs: byrole[e.get("role")]+=e.get("usd") or 0; n[e.get("role")]+=1; byclass[klass(ISSUE.get(e.get("id"),{"title":"","about":""}))]+=e.get("usd") or 0
    tot=sum(byrole.values()); prod=done[w]["product"]
    P(w,"runs:",len(cs),"usd:",round(tot,2),"by role:",{k:(n[k],round(v,2)) for k,v in sorted(byrole.items(),key=lambda x:-x[1])})
    P("   usd by issue class:",{k:round(v,2) for k,v in sorted(byclass.items(),key=lambda x:-x[1])},"| product done:",prod,"| usd per product done:",round(tot/prod,2) if prod else "n/a")
    top=collections.defaultdict(float)
    for e in cs: top[e.get("id")]+=e.get("usd") or 0
    P("   top issues by usd:",[(k,round(v,2)) for k,v in sorted(top.items(),key=lambda x:-x[1])[:8]])
# ---- 5 retries, rework, stuck
P("\n## retries, run-stops, rework, stuck")
for w,lo in(("24h",D1),("7d",D7)):
    stops=collections.Counter(); per=collections.Counter()
    for e in E:
        if e["type"]=="commented" and e["at"]>=lo and (e.get("body") or "").startswith('{"kind":"run-stop"'):
            try: o=json.loads(e["body"]).get("outcome")
            except Exception: o="?"
            stops[o]+=1; per[e.get("id")]+=1
    rew=[e for e in E if e["type"]=="reviewed" and e["at"]>=lo and e["verdict"]=="changes"]
    nd=[e for e in E if e["type"]=="moved" and e["at"]>=lo and e["to"]=="not-done"]
    runs0=[e for e in E if e["type"]=="cost" and e["at"]>=lo and (e.get("usd") or 0)==0]
    P(w,"run-stops:",sum(stops.values()),dict(stops.most_common(8)),"| top issues:",per.most_common(5))
    P("   reviews=changes:",len(rew),"| moves to not-done:",len(nd),"| cost events with usd 0:",len(runs0),dict(collections.Counter(e.get("outcome") for e in runs0).most_common(6)))
# stuck: replay state
state={}; since={}
for e in E:
    if e["type"]=="opened": state[e.get("id")]=e.get("state","open"); since[e.get("id")]=e["at"]
    if e["type"]=="moved": state[e.get("id")]=e["to"]; since[e.get("id")]=e["at"]
ENDED={"done","closed","rejected","stopped","not-done"}
stuck=[(id,state[id],round((NOW-since[id])/H/24,1)) for id in state if state[id] not in ENDED and NOW-since[id]>24*H]
P("open issues:",dict(collections.Counter(s for s in state.values() if s not in ENDED)))
P("stuck > 1 day in a state:",len(stuck),dict(collections.Counter(s for _,s,_ in stuck)))
for id,s,d in sorted(stuck,key=lambda x:-x[2])[:25]: i=ISSUE.get(id,{"about":"?","title":"","labels":set()}); P("  ",d,"d",s,id,"|",i["about"],"|",sorted(i["labels"]),"|",i["title"][:70])
# ---- 6 openers
P("\n## who opened issues")
for w,lo in(("24h",D1),("7d",D7)):
    op=[e for e in E if e["type"]=="opened" and e["at"]>=lo]
    P(w,"opened:",len(op),"by:",dict(collections.Counter(who(e) for e in op).most_common()),"| kind:",dict(collections.Counter(e.get("kind") for e in op)),"| class:",dict(collections.Counter(klass(ISSUE[e.get("id")]) for e in op)))
# ---- 7 machine idle with work waiting (from runs' cost events: start = at - seconds)
P("\n## runs active vs doable issues, 24h, 30-min buckets (from cost events; doable = not ended, labelled needs-<a persona>, no after link to an issue not ended; needs-owner counts needs-owner and needs-token)")
B=30*60000; buckets=[D1+k*B for k in range(48)]
runs=[(e["at"]-(e.get("seconds") or 0)*1000,e["at"]) for e in E if e["type"]=="cost" and e["at"]>=D1-6*H]
# state and labels at time t: replay
timeline=sorted([e for e in E if e["type"] in ("moved","opened","labelled") or (e["type"]=="linked" and e.get("rel")=="after")],key=lambda e:e["at"])
# The labels a persona of drain2 takes (loop.status personas, 2026-10-24); needs-token waited on the owner and was counted
# doable until then (all 20 idle half-hours of the 2026-10-24 retro's window).
PERSONA_LABELS={"needs-worker","needs-reviewer","needs-spec","needs-spec-reviewer"}; OWNER_LABELS={"needs-owner","needs-token"}
st={}; lab=collections.defaultdict(set); aft=collections.defaultdict(set); ti=0; idle=[]
for b in buckets:
    while ti<len(timeline) and timeline[ti]["at"]<=b:
        e=timeline[ti]; ti+=1; i=e.get("id")
        if e["type"]=="moved": st[i]=e["to"]
        elif e["type"]=="opened": st[i]=e.get("state","open"); lab[i]=set(e.get("labels") or [])
        elif e["type"]=="linked": (aft[i].discard if e.get("remove") else aft[i].add)(e.get("to"))
        else: lab[i]=(lab[i]|set(e.get("add") or []))-set(e.get("remove") or [])
    # Linked after an issue not ended is no work (brain-x-loop, "Before after"); its label flapped 10-25 23:40 to 10-26 02:16.
    doable=sum(1 for i,v in st.items() if v not in ENDED and lab[i]&PERSONA_LABELS and not any(st.get(t,"open") not in ENDED for t in aft[i]))
    owner=sum(1 for i,v in st.items() if v not in ENDED and lab[i]&OWNER_LABELS)
    active=sum(1 for s,t in runs if s<b+B and t>b)
    flag="  <- idle with work" if doable and not active else ""
    P(" ",iso(b),"doable",doable,"needs-owner",owner,"runs active",active,flag)
    if flag: idle.append(b)
P("buckets idle with work:",len(idle),"of 48 (",len(idle)/2,"h )")

# ---- unrouted: an open issue no route reads (retro 2026-10-30: services-own-sqlite-objects, an owner's project opened with
# `owner` alone, waited 4.7 days and was never doable above). Routing labels as route.js `routed`; standing and superseded left.
P("\n## issues at open with no routing label for over an hour (no needs-*, *-processing or waiting-*; not standing or superseded; a project at building waits on its parts and is left)")
ROUTED=lambda l: l.startswith("needs-") or l.endswith("-processing") or l.startswith("waiting-")
since={}
for i,v in st.items():
    if v!="open" or any(ROUTED(l) for l in lab[i]) or lab[i]&{"standing","superseded"}: continue
    last=max([e["at"] for e in BYID.get(i,[]) if e["type"] in("labelled","moved","opened")] or [0])
    if NOW-last>H: since[i]=last
for i,t in sorted(since.items(),key=lambda x:x[1]): P(" ",iso(t),v if (v:=st.get(i)) else "",i,"|",ISSUE.get(i,{}).get("kind",""),sorted(lab[i]),"|",ISSUE.get(i,{}).get("title","")[:70])
P("unrouted:",len(since))
