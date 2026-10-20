import json,subprocess,sys,os
after=0; events=[]
while True:
    r=subprocess.run(["bun","tools/cloud-brain/brain.ts","curl",f"/xrpc/com.lopecode.brain.issue.sync?after={after}&limit=500","--owner"],capture_output=True,text=True)
    try: d=json.loads(r.stdout)
    except Exception: print("bad",r.stdout[:200],r.stderr[:200],file=sys.stderr); break
    ev=d.get("events") or []
    if not ev: 
        print("keys",list(d.keys()),{k:d[k] for k in d if k!="events"} ,file=sys.stderr); break
    events+=ev; after=ev[-1]["seq"]
    if not d.get("more") and len(ev)<500: break
json.dump(events,open(os.environ.get("S","/tmp/retro")+"/events.json","w"))
print(len(events),"events, last seq",after, "first at", events[0]["at"] if events else None, "last at", events[-1]["at"] if events else None,file=sys.stderr)
