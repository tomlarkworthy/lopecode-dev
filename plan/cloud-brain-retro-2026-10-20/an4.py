import json,collections,re,os,datetime
S=os.environ["S"]
D=json.load(open(S+"/retro/issues.json"))
P=lambda s: datetime.datetime.fromisoformat(s.replace("Z","+00:00"))
W0=P("2026-10-18T00:00:00Z")
cat=collections.Counter(); ex=collections.defaultdict(list); lab=collections.Counter()
for id,d in D.items():
    i=d["issue"]
    for e in d["events"]:
        if e["type"]=="moved" and e["move"]=="approve" and e["by"]=="owner (tab)" and P(e["at"])>=W0:
            t=i["title"]
            if re.search(r"docs|document|reference|knowledge|brief|records?/|post.?mortem|spec ",t,re.I): c="docs/spec/brief"
            elif i["about"].startswith("brain-x-") and i["about"] not in("brain-x-loop","brain-x-issues"): c="service product"
            elif i["about"] in("cloud-brain-dev","brain-x-loop","brain-x-issues"): c="loop/tracker/dev"
            else: c="owner's four / other"
            cat[c]+=1; ex[c].append(id)
            for l in i["labels"]: lab[l]+=1
print(cat); 
for c in ex: print(c,ex[c][:14])
print(lab.most_common(8))
# major label share among owner approvals
