import json,subprocess,datetime,sys,os
S=os.environ["S"]
def call(m):
    r=subprocess.run(["tools/cloud-brain/issue-as.sh","out-7c8986",m,"--short"] if m.startswith("get") else ["tools/cloud-brain/issue-as.sh","out-7c8986",m],capture_output=True,text=True).stdout
    try: return json.loads(r)
    except Exception: return None
cut=datetime.datetime(2026,10,18,0,0,tzinfo=datetime.timezone.utc).timestamp()*1000
ids=[]
for st in ["open","triaged","ready","in-progress","in-review","spec-review","awaiting-approval","done","closed","spec","needs-spec","blocked"]:
    d=call(f"list?state={st}&limit=500")
    if not d or "issues" not in d: continue
    for i in d["issues"]:
        if i["updated_at"]>=cut or i["opened_at"]>=cut: ids.append(i["id"])
    print(st,len(d["issues"]),d.get("more"),file=sys.stderr)
ids=sorted(set(ids)); print(len(ids),"issues",file=sys.stderr)
out={}
for n,i in enumerate(ids):
    d=call("get?id="+i)
    if d: out[i]=d
json.dump(out,open(S+"/retro/issues.json","w"))
print("done",len(out),file=sys.stderr)
