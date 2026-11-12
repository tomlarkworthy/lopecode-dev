#!/usr/bin/env python3
# measure.py  the daily retro's numbers, from the tracker's record and the deployer's log. No model, read-only.
#   python3 pull-sync.py                              # writes $S/events.json from issue.sync (brain.ts curl --owner)
#   python3 measure.py [--now ISO] [--json]           # reads $S/events.json and $S/deploys7d.json, prints the tables
# S defaults to /tmp/retro. The classes of an issue (product, loop, tracker, docs, tooling, owners) are regexes over
# `about` and the title (CLASS below): say so when quoting them. Written 2026-10-20 by the first retro.
import json,collections,re,os,sys,datetime,statistics,bisect
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
    # a title word ("token", "reviewer") does not make a service's own issue the factory's (delve-invite-request, mcp-kernel-oauth)
    if a in LOOP_ABOUT or (LOOP_RE.search(t) and not (a.startswith("brain-x-") or a in OWNERS or a=="brain")): return "loop/tracker"
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
    # Keyed by Worker@hash12 too: an issue that heard an approval of one hash had hid a lost approval of the next (retro 2026-11-06).
    GOT={m.groups()+(h,) for e in E if e["type"]=="commented" for m in [re.match(r"receive/[^/]+/([a-z.-]+)/(.+)/comment$",e.get("key",""))] if m
         for h in [next((r["value"].split("@")[0]+"@"+r["value"].split("@")[1][:12] for r in e.get("refs") or [] if r.get("kind")=="deployed" and "@" in r.get("value","")),None)]}
    for w,lo in(("24h",D1),("7d",D7)):
        lost=set()
        for l in L:
            k=l["at"][7:]
            if l["t"]<lo or k not in ("waiting","approved","confirmed","put-back") or not l.get("target") or not l.get("hash"): continue
            for i,a,u in WAITS.get(l["target"]+"@"+l["hash"][:12],[]):
                if a<=l["t"]<u and not ENDAT.get(i,9e15)<l["t"] and (k,i,l["target"]+"@"+l["hash"][:12]) not in GOT: lost.add((iso(l["t"]),k,l["target"]+"@"+l["hash"][:12],i))
        P(w,"deploy lines a live wait named that never reached the issue:",len(lost),sorted(lost)[:12])
    # Late, not lost: the topic holds every line behind one it pushes again, and a review-first hold's waiting line, which no
    # wait names, held them 15 min each from 11-07 (retro 2026-11-09: p90 73 to 107 s a day before, 816 and 731 s on 11-07 and 11-08).
    SAID=collections.defaultdict(list)
    for l in L:
        if l.get("target") and l.get("hash"): SAID[(l["at"][7:],l["target"],l["hash"])].append(l["t"])
    for v in SAID.values(): v.sort()
    for w,lo in(("24h",D1),("7d",D7)):
        late=[]
        for e in E:
            m=re.match(r"receive/[^/]+/([a-z.-]+)/(.+)/comment$",e.get("key","")) if e["type"]=="commented" and e["at"]>=lo else None
            ref=next((r["value"] for r in e.get("refs") or [] if r.get("kind")=="deployed" and "@" in r.get("value","")),None) if m else None
            ts=SAID.get((m.group(1),)+tuple(ref.split("@",1))) if ref else None
            j=bisect.bisect_right(ts,e["at"])-1 if ts else -1
            if j>=0: late.append((e["at"]-ts[j])/1000)
        late.sort()
        P(w,"s from a deploy line to its issue's comment: n",len(late),"median",round(statistics.median(late)) if late else None,"p90",round(late[int(.9*len(late))]) if late else None,"max",round(late[-1]) if late else None,"over 300 s:",sum(1 for x in late if x>300))
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
# brain-x-loop's budgetUsd (the owner, 2026-10-17: 200) is "the budget of the loop" a UTC day; drain2.ts picks from the
# lists and gives each assign back with usd 0, so nothing holds the runs to it (retro 2026-11-08: 11-07 cost 314 USD).
try: BUDGET=json.load(open(S+"/loopcfg.json")).get("values",{}).get("budgetUsd")
except Exception: BUDGET=None
_day=collections.defaultdict(float); _dn=collections.Counter()
for e in E:
    if e["type"]=="cost" and e["at"]>=D7-24*H and not str(e.get("id","")).startswith("test-retro-cost-"):
        k=iso(e["at"])[:10]; _day[k]+=e.get("usd") or 0; _dn[k]+=1
P("   by UTC day, usd (runs); brain-x-loop budgetUsd",BUDGET,"(not enforced):"," ".join(f"{k[5:]} {round(v,2)} ({_dn[k]}){' OVER' if BUDGET and v>BUDGET else ''}" for k,v in sorted(_day.items())))
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
P("\n## runs active vs doable issues, 24h, 30-min buckets (from cost events; doable = not ended, labelled needs-<a persona>, no after link to an issue not ended unless a worker session has run on it; needs-owner counts needs-owner and needs-token)")
B=30*60000; buckets=[D1+k*B for k in range(48)]
runs=[(e["at"]-(e.get("seconds") or 0)*1000,e["at"]) for e in E if e["type"]=="cost" and e["at"]>=D1-6*H]
# state and labels at time t: replay
WSTART=lambda e: e["type"]=="commented" and '"kind":"started"' in (e.get("body") or "") and '"persona":"worker"' in (e.get("body") or "")
timeline=sorted([e for e in E if e["type"] in ("moved","opened","labelled","held") or (e["type"]=="linked" and e.get("rel")=="after") or WSTART(e)],key=lambda e:e["at"])
# The labels a persona of drain2 takes (loop.status personas, 2026-10-24); needs-token waited on the owner and was counted
# doable until then (all 20 idle half-hours of the 2026-10-24 retro's window).
PERSONA_LABELS={"needs-worker","needs-reviewer","needs-spec","needs-spec-reviewer"}; OWNER_LABELS={"needs-owner","needs-token"}
st={}; lab=collections.defaultdict(set); aft=collections.defaultdict(set); worked=set(); hold={}; ti=0; idle=[]; starved=[]
for b in buckets:
    while ti<len(timeline) and timeline[ti]["at"]<=b:
        e=timeline[ti]; ti+=1; i=e.get("id")
        if e["type"]=="moved": st[i]=e["to"]
        elif e["type"]=="opened": st[i]=e.get("state","open"); lab[i]=set(e.get("labels") or [])
        elif e["type"]=="linked": (aft[i].discard if e.get("remove") else aft[i].add)(e.get("to"))
        elif e["type"]=="commented": worked.add(i)
        elif e["type"]=="held": hold[i]=0 if e.get("remove") else (e.get("until") or 0)
        else: lab[i]=(lab[i]|set(e.get("add") or []))-set(e.get("remove") or [])
    # Linked after an issue not ended is no work before its first worker session (route.js beforeAfter; the drain took
    # topic-dbsql-slow, linked after an open issue at its 9th round, on 2026-11-01).
    # A live hold is no work (route.js takes): delve-scout-by-post-advert-check, held with needs-worker 11-11 06:45 to 11-12 00:30, read "idle with work" 30 of 48 (retro 2026-11-12).
    doable=sum(1 for i,v in st.items() if v not in ENDED and lab[i]&PERSONA_LABELS and hold.get(i,0)<=b and (i in worked or not any(st.get(t,"open") not in ENDED for t in aft[i])))
    owner=sum(1 for i,v in st.items() if v not in ENDED and lab[i]&OWNER_LABELS)
    active=sum(1 for s,t in runs if s<b+B and t>b)
    # Held by an after link to an issue not ended (retro 2026-11-11: 10 parts of rows-atomic-writes chained 83 h behind owner deploys read "idle with work: 0").
    chained=sum(1 for i,v in st.items() if v not in ENDED and "waiting-issue" in lab[i] and any(st.get(t,"open") not in ENDED for t in aft[i]))
    flag="  <- idle with work" if doable and not active else ("  <- nothing doable, chained" if chained and not doable else "")
    P(" ",iso(b),"doable",doable,"needs-owner",owner,"chained",chained,"runs active",active,flag)
    if doable and not active: idle.append(b)
    if chained and not doable: starved.append(b)
P("buckets idle with work:",len(idle),"of 48 (",len(idle)/2,"h )")
P("buckets with nothing doable while issues wait on an after link:",len(starved),"of 48 (",len(starved)/2,"h )")

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

# ---- an ask on a closed issue (retro 2026-10-31: 23 passes of 2026-10-22/23, done at the pass, then "For your decision … Land
# it with push.ts" on the done issue; the page's open work and issue.flow leave a closed issue out, and 21 never landed).
P("\n## needs-owner put on at or after the move that closed the issue (an ask no list the owner reads shows)")
CLOSED_ST={"done","closed","rejected","reverted","not-done"}
late=[]
for i,v in st.items():
    if v not in CLOSED_ST or "needs-owner" not in lab[i]: continue
    ev=BYID.get(i,[]); end=max([e["seq"] for e in ev if e["type"]=="moved"] or [0])
    put=[e for e in ev if e["type"]=="labelled" and "needs-owner" in (e.get("add") or []) and e["seq"]>=end]
    if put: late.append((put[-1]["at"],i,v))
for t,i,v in sorted(late): P(" ",iso(t),v,i,"|",ISSUE.get(i,{}).get("title","")[:80])
P("asks on closed issues:",len(late),"| 7d:",sum(1 for t,_,_ in late if t>=D7),"| closed issues carrying needs-owner:",sum(1 for i,v in st.items() if v in CLOSED_ST and "needs-owner" in lab[i]))

# ---- an ask that is only a read of the owner's session (retro 2026-11-01: topic-dbsql-slow had three fixes deployed in 9 days
# that no persona could measure, since logs.query is the owner's alone; its reads waited 2.5 days and then 11 h). The retro holds
# that session: it makes the read and comments the figures (brief, step 2, People). Not logs.query alone: delve-strangers-owner-check
# asked a delve.strangers read (rule caller.session) and waited 4.7 days, listed by four retros as "a look of his" (retro 2026-11-03).
SESSION_READ=re.compile(r"logs\.query|caller\.session|your tab alone|no token (?:of mine )?can call|only your session")
P("\n## open issues at needs-owner whose comments since the label name a read only the owner's session makes (the retro makes it; judge each)")
reads=[]
for i,v in st.items():
    if v in ENDED or "needs-owner" not in lab[i]: continue
    ev=BYID.get(i,[]); put=max([e["seq"] for e in ev if e["type"]=="labelled" and "needs-owner" in (e.get("add") or [])] or [0])
    if any(e["type"]=="commented" and e["seq"]>=put-3 and SESSION_READ.search(e.get("body") or "") for e in ev):
        reads.append((min(e["at"] for e in ev if e["seq"]>=put-3),i))
for t,i in sorted(reads): P(" ",iso(t),i,"|",ISSUE.get(i,{}).get("title","")[:80])
P("reads asked of the owner:",len(reads))

# ---- a wait on a deploy line that no line answers (retro 2026-11-03: rls-7-specs-ws-line waited 2.3 days at waiting-deploy for
# a deploy.confirmed of a page hash that a shared-only apply never uploads). The newest deploy wait of an open waiting-deploy issue,
# over an hour old, with no deployer line for its hash since that ends or answers it: the retro reads what runs and hands it on.
P("\n## open issues at waiting-deploy whose wait names a hash with no deployer line since that ends it (over 1 h)")
DL=(DEP.get("lines",DEP) if isinstance(DEP,dict) else DEP) or []
ENDS={"deploy.confirmed","deploy.put-back","deploy.failed","deploy.approved","deploy.refused"}
dead=[]
for i,v in st.items():
    if v in ENDED or "waiting-deploy" not in lab[i]: continue
    ws=[e for e in BYID.get(i,[]) if e["type"]=="waits" and "deploy:" in (e.get("note") or "")]
    if not ws or NOW-ws[-1]["at"]<3600e3: continue
    w=ws[-1]; hs=re.findall(r"deploy:([\w-]+)@([0-9a-f]{12})",w["note"])
    if not any(l.get("target")==t and (l.get("hash") or "").startswith(h) and l.get("t",0)>w["at"] and l.get("at") in ENDS for t,h in hs for l in DL): dead.append((w["at"],i,w["note"]))
for t,i,n in sorted(dead): P(" ",iso(t),i,"|",n)
P("deploy waits no line answers:",len(dead))

# ---- done with its deploy still held (retro 2026-11-12: raw-library-cas and raw-static-cas were finished by a review's pass
# while the deployer held their versions for the owner; the owner found it, fb-deploy-end-of-task, cloud-brain-dev 76be28a).
P("\n## service issues moved to done whose last deploy line on the issue, before the move, is deploy.waiting (done, not live)")
DLINE=re.compile(r"deploy\.([a-z.]+) · ([\w-]+)@([0-9a-f]{12})")
held_done=[]
for e in E:
    if e["type"]!="moved" or e.get("to")!="done" or e["at"]<D7: continue
    ls=[m for x in BYID.get(e.get("id"),[]) if x["type"]=="commented" and x["seq"]<e["seq"] and (m:=DLINE.match(x.get("body") or ""))]
    if ls and ls[-1].group(1)=="waiting": held_done.append((e["at"],e.get("id"),ls[-1].group(2)+"@"+ls[-1].group(3)))
for t,i,w in held_done: P(" ",iso(t),i,w)
P("done with a held deploy, 24h:",sum(1 for t,_,_ in held_done if t>=D1),"| 7d:",len(held_done))


# ---- the owner's finish of a major issue (retro 2026-11-12: 28 asks in 7 d waited 161.8 h, none of 43 ended asks sent back; the
# issues linked after them wait for the finish, not for the change, which is live at the ask).
P("\n## asks for the owner's finish of a major issue (drain2.ts \"so its finish is yours\"), 7d, by the ask")
fa={}
for e in E:
    if e["type"]=="commented" and "so its finish is yours" in (e.get("body") or "") and e["at"]>=D7: fa.setdefault(e.get("id"),e)
AFTER_OF=collections.defaultdict(set)
for e in E:
    if e["type"]=="linked" and e.get("rel")=="after": (AFTER_OF[e.get("to")].discard if e.get("remove") else AFTER_OF[e.get("to")].add)(e.get("id"))
fh=dh=wh=0
for i,a in sorted(fa.items(),key=lambda x:x[1]["at"]):
    end=min([x["at"] for x in BYID.get(i,[]) if x["type"]=="moved" and x["seq"]>a["seq"]] or [NOW]); w=(end-a["at"])/H; fh+=w; dh+=w*len(AFTER_OF[i]); wh+=w if AFTER_OF[i] else 0
    P(" ",iso(a["at"]),"%5.1f h"%w,"open" if end==NOW else "ended","after it:",len(AFTER_OF[i]),i)
# after it: issues linked after it now (links removed later are not counted), times the whole wait, so an upper bound.
P("finish asks, 7d:",len(fa),"| hours waited:",round(fh,1),"| of them by asks with an issue after them:",round(wh,1),"| hours of the issues after them (at most):",round(dh,1))
