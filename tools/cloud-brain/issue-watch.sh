#!/bin/bash
# Prints one line for each issue another caller opened, each issue opened with the label owner (any caller), each
# submit of a change or a spec (the moves submit and submit-spec, any caller: a review is then wanted, and a writer
# that waits for it with issue-wait.sh has not reported), each label asks-orchestrator put on an issue (a labelled event that adds
# it, any caller: an agent that still runs asks this session) and each event made with the owner's session; never exits.
# Usage: issue-watch.sh <token> [after-seq] [seconds]   (after-seq defaults to the tracker's last)
#        issue-watch.sh --filter <token> < an answer of sync?after=   (the lines of that answer, then LAST <seq>; no call)
cd "$(dirname "$0")/../.." || exit 70
filter() {
  python3 -I -c '
import sys,json
try: ev=json.load(sys.stdin).get("events",[])
except Exception: sys.exit()
quiet=len(sys.argv)>2
for e in ev:
    by=e.get("by") or {}; own=by.get("via")=="session"; labels=e.get("labels")
    asked=isinstance(labels,list) and "owner" in labels
    sent=e["type"]=="moved" and e.get("move") in ("submit","submit-spec"); add=e.get("add")
    asks=e["type"]=="labelled" and isinstance(add,list) and "asks-orchestrator" in add
    if not quiet and (own or sent or asks or (e["type"]=="opened" and (asked or by.get("holder")!="secret:"+sys.argv[1]))):
        x=e.get("to") or e.get("add") or e.get("remove") or ""
        if isinstance(x,dict): x=x.get("state","")
        t=str(e.get("title") or e.get("body") or e.get("reason") or "")[:140].replace("\n"," ")
        print(e["seq"],e["type"],e.get("id"),"OWNER" if own else by.get("holder","")[7:],x,t,flush=True)
if ev: print("LAST",ev[-1]["seq"],flush=True)' "$@"
}
if [ "$1" = "--filter" ]; then filter "${2:?token}"; exit; fi
token=${1:?token}; last=${2:-}; every=${3:-30}
read_new() { tools/cloud-brain/issue-as.sh "$token" "sync?after=$1" 2>/dev/null | filter "$token" $2; }
if [ -z "$last" ]; then last=$(read_new 0 quiet | awk '/^LAST/{print $2}'); last=${last:-0}; fi
while true; do
  out=$(read_new "$last") || true
  n=$(printf '%s\n' "$out" | awk '/^LAST/{print $2}'); [ -n "$n" ] && last=$n
  printf '%s\n' "$out" | grep -v '^LAST' | grep --line-buffered .
  sleep "$every"
done
