#!/bin/bash
# Prints one line for each entry that is new in the tracker's queue (issue.queue: what the record says is next), and one
# for each label asks-orchestrator put on an issue (a labelled event that adds it, any caller: an agent that still runs
# asks this session), each comment written with a token out- and six hex digits but the one given here (a session outside
# the loop, which the owner may be in: rules.md, "Which token") and each event made with the owner's session; never exits.
# A queue line is `QUEUE <do> <id> <for> <title>`, printed for an entry whose id and `do` were not in the answer before:
# once while it stays, and again when it comes back after an answer without it. The first answer is printed whole.
# An open and a submit are no line of their own since bk-6-skill-watch-and-stats: they are the entries `triage`, `spec` or
# `promote`, and `review`.
# With each read it also reads list?label=asks-orchestrator and prints `<seq> asks-still <id> <N> min …` for an issue that has
# the label and whose updated_at is 5 minutes old or more, once at each 5 minutes: an ask this session did not answer.
# With each read it also reads wakes (issue.wakes with no id: the waits of this token that are due, on every issue) and
# prints `WAKE <id> <when>` for a due wait that was not due in the answer before: once while it stays due, and again when it
# is due after an answer without it. A session that wants to look at an issue again when something is true of it writes
# a wait (`issue-as.sh <token> wait '{"key":…,"id":…,"when":…,"until":…}'`). Part 3 of plan/cloud-brain-tracker-trigger-rules.md.
# Usage: issue-watch.sh <token> [after-seq] [seconds]   (after-seq defaults to the tracker's last)
#        issue-watch.sh --filter <token> < an answer of sync?after=   (the lines of that answer, then LAST <seq>; no call)
#        issue-watch.sh --still <now, ms> < an answer of list?label=asks-orchestrator   (the asks-still lines of it; no call)
#        issue-watch.sh --queue <file> < an answer of queue   (the lines of what is not in <file>, which is then written
#                                                              again from the answer; no call)
#        issue-watch.sh --wakes <file> < an answer of wakes   (the WAKE lines of what is not in <file>, which is then written
#                                                              again from the answer; no call)
# ISSUE_AS_SH names another issue-as.sh: the test's.
cd "$(dirname "$0")/../.." || exit 70
filter() {
  python3 -I -c '
import sys,json,re
try: ev=json.load(sys.stdin).get("events",[])
except Exception: sys.exit()
quiet=len(sys.argv)>2
for e in ev:
    by=e.get("by") or {}; own=by.get("via")=="session"; add=e.get("add")
    asks=e["type"]=="labelled" and isinstance(add,list) and "asks-orchestrator" in add; h=by.get("holder")
    outside=e["type"]=="commented" and isinstance(h,str) and h!="secret:"+sys.argv[1] and bool(re.fullmatch("secret:out-[0-9a-f]{6}",h))
    if not quiet and (own or asks or outside):
        x=e.get("to") or e.get("add") or e.get("remove") or ""
        if isinstance(x,dict): x=x.get("state","")
        t=str(e.get("title") or e.get("body") or e.get("reason") or "")[:140].replace("\n"," ")
        print(e["seq"],e["type"],e.get("id"),"OWNER" if own else by.get("holder","")[7:],x,t,flush=True)
if ev: print("LAST",ev[-1]["seq"],flush=True)' "$@"
}
still() {
  python3 -I -c '
import sys,json
try: iss=json.load(sys.stdin).get("issues",[]); now=int(sys.argv[1])
except Exception: sys.exit()
for i in iss if isinstance(iss,list) else []:
    if not isinstance(i,dict): continue
    labels=i.get("labels"); at=i.get("updated_at")
    if not isinstance(labels,list) or "asks-orchestrator" not in labels or isinstance(at,bool) or not isinstance(at,(int,float)): continue
    m=int((now-at)//60000)
    if m>=5: print(i.get("seq"),"asks-still",i.get("id"),m//5*5,"min with the label asks-orchestrator and no event of the issue: answer it",flush=True)' "$@"
}
# An answer that is not one of queue (not JSON, a refusal, no list) prints nothing and leaves the file as it was.
queue() {
  python3 -I -c '
import sys,json,os
try: q=json.load(sys.stdin)["queue"]
except Exception: sys.exit()
if not isinstance(q,list): sys.exit()
try: seen=set(open(sys.argv[1],encoding="utf-8").read().split("\n"))
except OSError: seen=set()
now=[]
for e in q:
    if not isinstance(e,dict) or not isinstance(e.get("id"),str) or not isinstance(e.get("do"),str): continue
    k=e["id"]+" "+e["do"]; now.append(k)
    if k not in seen: print("QUEUE",e["do"],e["id"],e.get("for") or "-",str(e.get("title") or "")[:140].replace("\n"," "),flush=True)
t=sys.argv[1]+".new"
with open(t,"w",encoding="utf-8") as f: f.write("\n".join(now))
os.replace(t,sys.argv[1])' "$@"
}
# An answer that is not one of wakes prints nothing and leaves the file as it was. A wait is known by its issue and the seq of its event.
wakes() {
  python3 -I -c '
import sys,json,os
try: due=json.load(sys.stdin)["due"]
except Exception: sys.exit()
if not isinstance(due,list): sys.exit()
try: seen=set(open(sys.argv[1],encoding="utf-8").read().split("\n"))
except OSError: seen=set()
now=[]
for e in due:
    if not isinstance(e,dict) or not isinstance(e.get("id"),str) or isinstance(e.get("seq"),bool) or not isinstance(e.get("seq"),int): continue
    k=e["id"]+" "+str(e["seq"]); now.append(k)
    if k not in seen: print("WAKE",e["id"]," ".join(str(e.get("when") or "").split())[:500],flush=True)
t=sys.argv[1]+".new"
with open(t,"w",encoding="utf-8") as f: f.write("\n".join(now))
os.replace(t,sys.argv[1])' "$@"
}
if [ "$1" = "--filter" ]; then filter "${2:?token}"; exit; fi
if [ "$1" = "--still" ]; then still "${2:?now}"; exit; fi
if [ "$1" = "--queue" ]; then queue "${2:?file}"; exit; fi
if [ "$1" = "--wakes" ]; then wakes "${2:?file}"; exit; fi
token=${1:?token}; last=${2:-}; every=${3:-30}; as=${ISSUE_AS_SH:-tools/cloud-brain/issue-as.sh}; told="|"
seen=$(mktemp "${TMPDIR:-/tmp}/issue-watch.XXXXXX") || exit 70
woke=$(mktemp "${TMPDIR:-/tmp}/issue-watch.XXXXXX") || exit 70
trap 'rm -f "$seen" "$seen.new" "$woke" "$woke.new"' EXIT
trap 'exit 143' TERM INT
read_new() { "$as" "$token" "sync?after=$1" 2>/dev/null | filter "$token" $2; }
if [ -z "$last" ]; then last=$(read_new 0 quiet | awk '/^LAST/{print $2}'); last=${last:-0}; fi
while true; do
  out=$(read_new "$last") || true
  n=$(printf '%s\n' "$out" | awk '/^LAST/{print $2}'); [ -n "$n" ] && last=$n
  printf '%s\n' "$out" | grep -v '^LAST' | grep --line-buffered .
  while IFS= read -r l; do
    [ -z "$l" ] && continue
    case "$told" in *"|$l|"*) ;; *) echo "$l"; told="$told$l|";; esac
  done <<< "$("$as" "$token" "list?label=asks-orchestrator&limit=100" 2>/dev/null | still "$(date +%s)000")"
  "$as" "$token" "queue" 2>/dev/null | queue "$seen"
  "$as" "$token" "wakes" 2>/dev/null | wakes "$woke"
  sleep "$every"
done
