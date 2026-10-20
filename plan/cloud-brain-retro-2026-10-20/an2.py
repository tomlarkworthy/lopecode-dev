import json,collections,re,os,subprocess,datetime
S=os.environ["S"]
D=json.load(open(S+"/retro/issues.json"))
P=lambda s: datetime.datetime.fromisoformat(s.replace("Z","+00:00"))
# landing-not-about: which issues, how many
lna=collections.Counter(); tl=collections.Counter(); first={}
for id,d in D.items():
    for e in d["events"]:
        b=e.get("body") or ""
        if e["type"]=="commented" and b.startswith('{"kind":"run-stop"'):
            m=re.search(r'"outcome":"([^"]+)"',b)
            if m and m.group(1)=="landing-not-about": lna[id]+=1; first.setdefault(id,e["at"])
            if m and m.group(1)=="two-landings": tl[id]+=1
print("landing-not-about:",sum(lna.values()),"on",len(lna),"issues; top",lna.most_common(8))
print("two-landings:",sum(tl.values()),"on",len(tl),"issues; top",tl.most_common(4))
ex=[e["body"][:700] for d in D.values() for e in d["events"] if e["type"]=="commented" and '"outcome":"landing-not-about"' in (e.get("body") or "")][:1]; print(ex)
# spend
usd=0; n=0
for d in D.values():
    for e in d["events"]:
        b=e.get("body") or ""
        if '"kind":"run-stop"' in b:
            for m in re.finditer(r'"usd":([0-9.]+)',b): usd+=float(m.group(1))
print("usd inside run-stop comments (partial):",round(usd,2))
# classify done issues by title
LOOPW=re.compile(r"drain|approver|approv|ship\.ts|ship |run\.ts|push\.ts|land|loop|unstick|tracker|policy|queue|stranded|lock|token|restart|machine|orchestrat|overseer|triage|role|brief|guard|stale|redo|review|run-stop|requeue|issue\.|workflow",re.I)
cnt=collections.Counter(); ex=collections.defaultdict(list)
for id,d in D.items():
    i=d["issue"]
    dn=[e for e in d["events"] if e["type"]=="moved" and e["to"]=="done" and P(e["at"])>=P("2026-10-18T00:00:00Z")]
    if not dn: continue
    k="loop-mechanism" if (i["about"] in("cloud-brain-dev","brain-x-loop","brain-x-issues","brain-deployer","brain","brain-core","brain-db","brain-kernel","brain-x-kernel") and LOOPW.search(i["title"])) else ("other-dev" if i["about"] in("cloud-brain-dev",) else "service/product")
    cnt[k]+=1; ex[k].append(i["title"][:70])
print(cnt); print(ex["other-dev"][:12])
# the fix chain around ship/approval
CH=["i17852","i17852-ship","i18040","i17349-redo-ship","i18262","i17965","i18145","i18027","i18031","i18037","i17346","i17349","i15004","i15337","drain-ships-service"]
for c in CH:
    d=D.get(c)
    if not d: print(c,"not in window"); continue
    dn=[e["at"] for e in d["events"] if e["type"]=="moved" and e["to"]=="done"]
    print(c,d["issue"]["state"],"|",d["issue"]["title"][:90],"| done",dn[-1] if dn else None)
