import json,subprocess,sys,os,time
# pull-sync.py  writes $S/events.json (the whole tracker record, issue.sync), $S/deploys7d.json (logs.deploys, 7 days)
# and $S/loopcfg.json (config.get of brain-x-loop: width, budgetUsd)
# for measure.py. S defaults to /tmp/retro and is made. Run from the repository root with the owner's state file.
S=os.environ.get("S","/tmp/retro"); os.makedirs(S,exist_ok=True)
after=0; events=[]
while True:
    r=subprocess.run(["bun","tools/cloud-brain/brain.ts","curl",f"/xrpc/com.lopecode.brain.issue.sync?after={after}&limit=500","--owner"],capture_output=True,text=True)
    try: d=json.loads(r.stdout)
    except Exception: sys.exit(f"pull-sync.py: issue.sync answered no JSON after seq {after}: {r.stdout[:200]} {r.stderr[:200]}")
    if d.get("error"): sys.exit(f"pull-sync.py: issue.sync answered {d['error']}: {d.get('message','')}. An ended owner session: bun tools/cloud-brain/brain.ts session")
    ev=d.get("events") or []
    if not ev: 
        print("keys",list(d.keys()),{k:d[k] for k in d if k!="events"} ,file=sys.stderr); break
    events+=ev; after=ev[-1]["seq"]
    if not d.get("more") and len(ev)<500: break
json.dump(events,open(S+"/events.json","w"))
print(len(events),"events, last seq",after, "first at", events[0]["at"] if events else None, "last at", events[-1]["at"] if events else None,file=sys.stderr)
now=int(time.time()*1000)
r=subprocess.run(["bun","tools/cloud-brain/brain.ts","curl",f"/xrpc/com.lopecode.brain.logs.deploys?from={now-7*86400000}&to={now}","--owner"],capture_output=True,text=True)
try: d=json.loads(r.stdout); json.dump(d,open(S+"/deploys7d.json","w")); print(len(d.get("lines",[])),"deploy lines, 7 d",file=sys.stderr)
except Exception: print("logs.deploys not read:",r.stdout[:200],r.stderr[:200],file=sys.stderr)
r=subprocess.run(["bun","tools/cloud-brain/brain.ts","curl","/xrpc/com.lopecode.brain.config.get?worker=brain-x-loop","--owner"],capture_output=True,text=True)
try: d=json.loads(r.stdout); json.dump(d,open(S+"/loopcfg.json","w")); print("brain-x-loop budgetUsd",d.get("values",{}).get("budgetUsd"),file=sys.stderr)
except Exception: print("config.get of brain-x-loop not read:",r.stdout[:200],r.stderr[:200],file=sys.stderr)
