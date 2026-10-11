#!/bin/bash
# Prints one line for each issue another caller opened and each event made with the owner's session; never exits.
# Usage: issue-watch.sh <token> [after-seq] [seconds]   (after-seq defaults to the tracker's last)
cd "$(dirname "$0")/../.." || exit 70
token=${1:?token}; last=${2:-}; every=${3:-30}
read_new() {
  tools/cloud-brain/issue-as.sh "$token" "sync?after=$1" 2>/dev/null | python3 -I -c '
import sys,json
try: ev=json.load(sys.stdin).get("events",[])
except Exception: sys.exit()
quiet=len(sys.argv)>2
for e in ev:
    by=e.get("by") or {}; own=by.get("via")=="session"
    if not quiet and (own or (e["type"]=="opened" and by.get("holder")!="secret:"+sys.argv[1])):
        x=e.get("to") or e.get("add") or e.get("remove") or ""
        if isinstance(x,dict): x=x.get("state","")
        t=str(e.get("title") or e.get("body") or e.get("reason") or "")[:140].replace("\n"," ")
        print(e["seq"],e["type"],e.get("id"),"OWNER" if own else by.get("holder","")[7:],x,t,flush=True)
if ev: print("LAST",ev[-1]["seq"],flush=True)' "$token" $2
}
if [ -z "$last" ]; then last=$(read_new 0 quiet | awk '/^LAST/{print $2}'); last=${last:-0}; fi
while true; do
  out=$(read_new "$last") || true
  n=$(printf '%s\n' "$out" | awk '/^LAST/{print $2}'); [ -n "$n" ] && last=$n
  printf '%s\n' "$out" | grep -v '^LAST' | grep --line-buffered .
  sleep "$every"
done
