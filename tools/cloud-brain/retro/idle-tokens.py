# idle-tokens.py   the delegations of cb4 that are alive with no end, with their calls over the 7 days the logs keep and
# the files of the tree that name them. Run from the repository root: S=<scratch dir> python3 tools/cloud-brain/retro/idle-tokens.py
# Reads delegation.list and logs.query with the owner's session; writes $S/idle-tokens.json; changes nothing.
# A call is counted by the `delegation` key of the core's line. A call the kernel answers itself (infra.*, token.*) may
# carry none, so a delegation whose scope names such a method is marked `kernel` and is not known to be idle.
import json, os, subprocess, time
S = os.environ["S"]; ROOT = os.getcwd(); env = {**os.environ, "BRAIN_BASE": "cb4"}
def curl(path, *extra):
    r = subprocess.run(["bun", "tools/cloud-brain/brain.ts", "curl", path, "--owner", *extra], capture_output=True, text=True, env=env)
    return json.loads(r.stdout)
now = int(time.time() * 1000)
dl = curl("/xrpc/com.lopecode.brain.delegation.list")["delegations"]
q = {"queryId": "retro-idle-tokens", "timeframe": {"from": now - 7 * 864e5, "to": now}, "view": "calculations", "limit": 500,
     "parameters": {"datasets": ["cloudflare-workers"], "filterCombination": "and", "limit": 500, "calculations": [{"operator": "count"}],
                    "groupBys": [{"type": "string", "value": "delegation"}],
                    "filters": [{"kind": "group", "filterCombination": "and", "filters": [{"key": "status", "operation": "gte", "value": 0, "type": "number"}]}]}}
open(S + "/idle-tokens-query.json", "w").write(json.dumps(q))
res = curl("/xrpc/com.lopecode.brain.logs.query", "-X", "POST", "-H", "content-type: application/json", "--data", "@" + S + "/idle-tokens-query.json")
calls = {a.get("groupKey", ""): a["value"] for c in res["result"]["calculations"] for a in c["aggregates"]}
KERNEL = ("infra.", "token.", "quota.")
rows = []
for d in dl:
    if d.get("until"): continue
    scope = [(s if isinstance(s, str) else s.get("method", "")).replace("com.lopecode.brain.", "") for s in d["scope"]]
    n = sum(v for k, v in calls.items() if d["id"] in k)
    kids = [x["name"] for x in dl if x.get("parent") == d["id"]]
    g = subprocess.run(["git", "grep", "-lw", "--recurse-submodules", d["name"], "--", "*.ts", "*.sh", "*.js", "*.py", "*.json"], capture_output=True, text=True, cwd=ROOT)
    files = [f for f in g.stdout.split() if "/records/" not in f and "post-mortems" not in f]
    rows.append({"name": d["name"], "id": d["id"], "made": time.strftime("%Y-%m-%d", time.gmtime(d["created"] / 1000)), "calls7d": n,
                 "children": kids, "kernel": any(s.startswith(KERNEL) for s in scope), "files": files[:5], "scope": scope})
open(S + "/idle-tokens.json", "w").write(json.dumps(rows, indent=1))
rows.sort(key=lambda r: (r["calls7d"] > 0, bool(r["files"]), r["made"]))
for r in rows:
    tag = "idle" if not r["calls7d"] and not r["children"] and not r["kernel"] else "used" if r["calls7d"] else "unknown"
    print(f'{tag:7s} {r["calls7d"]:6.0f} {r["name"][:28]:28s} {r["made"]} files {len(r["files"])} {",".join(r["scope"])[:70]}')
print(f'{len(rows)} alive with no end; idle (no call in 7 d, no child, no kernel method): {sum(1 for r in rows if not r["calls7d"] and not r["children"] and not r["kernel"])}')
