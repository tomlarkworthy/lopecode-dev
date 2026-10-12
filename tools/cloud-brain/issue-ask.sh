#!/bin/bash
# issue-ask.sh <token> <id> <n> <minutes> --nothing-billed <the ask>
# issue-ask.sh <token> <id> <n> <minutes> --runs <what> --since <HH:MM> --stop-in <minutes> <the ask>
# The ask of an agent that still runs to the orchestrating session: the comment, then the label asks-orchestrator, which
# issue-watch.sh prints (.claude/skills/brain-maintenance/agents/implementer.md, "When you need the orchestrating session").
# It refuses, exit 64 with nothing sent, an ask that does not say for how long the agent waits (1 to 10 minutes) or
# what it started that is billed while it waits: --nothing-billed, or --runs with what it is, since when (a time of
# this machine's clock, the last such time) and in how many minutes the agent stops it itself, the wait's at most.
# The wait's end and the stop are written by the tool from the clock, as times; the agent gives minutes.
# The comment's key is <role>/<id>/ask-<n> and the label's <role>/<id>/asks-<n>, <role> being the token's name to its
# first `-`. The comment is sent with ISSUE_AS_TIME_AHEAD=1: issue-as.sh refuses a body that names a time ahead of
# the clock, and the wait's end is one.
# Exit 0: both written; stdout is one line of JSON: comment and label (the seq of each), until and untilEpoch (the
#         wait's end), stop (the time the billed thing is stopped by, or null).
# Exit 1: the comment or the label was not written, and stderr says which. With the comment written and the label
#         not, nothing is printed at the session: run the same call again (the comment's key writes nothing twice).
#         Both keys used before: nothing was written, take the next <n>.
# Exit 2: issue-as.sh keeps no token of that name. Exit 64: the arguments.
# ISSUE_AS_SH names another issue-as.sh and ISSUE_ASK_NOW another clock (a local time, ISO): the test's.
# tests/tools/issue-ask.test.ts; records/wait-says-what-runs-and-until-when.md.
D="$(cd "$(dirname "$0")" && pwd)"
exec python3 -I -c '
import json, os, re, subprocess, sys
from datetime import datetime, timedelta
def refuse(why):
    print("issue-ask.sh: not sent. " + why, file=sys.stderr)
    print("usage: issue-ask.sh <token> <id> <n> <minutes, 1 to 10> (--nothing-billed | --runs <what> --since <HH:MM> --stop-in <minutes>) <the ask>", file=sys.stderr)
    sys.exit(64)
def whole(s): return re.fullmatch(r"[0-9]{1,4}", s) is not None
a = sys.argv[2:]
if len(a) < 4: refuse("Four arguments come before the flags.")
token, id, n, minutes = a[:4]
if not re.fullmatch(r"[a-z]+-[a-z0-9-]+", token): refuse("The token is a name, a role and what follows its first `-`.")
if not re.fullmatch(r"[a-z0-9-]{1,40}", id): refuse("The id of the issue.")
if not whole(n) or int(n) < 1: refuse("<n> is the number of this ask on the issue, from 1.")
if not whole(minutes) or not 1 <= int(minutes) <= 10: refuse("An ask says for how long its agent waits: 1 to 10 minutes. A wait with no time is not written.")
minutes = int(minutes); rest = a[4:]; nothing = False; runs = since = stop = None; ask = []
while rest:
    f = rest.pop(0)
    if f == "--nothing-billed": nothing = True
    elif f in ("--runs", "--since", "--stop-in"):
        if not rest: refuse(f + " takes a value.")
        v = rest.pop(0)
        if f == "--runs": runs = v.strip()
        elif f == "--since": since = v
        else: stop = v
    else: ask.append(f)
ask = " ".join(ask).strip()
if not ask: refuse("The ask is the words after the flags: what you need of the orchestrating session.")
if nothing and (runs is not None or since is not None or stop is not None): refuse("--nothing-billed, or --runs with --since and --stop-in: not both.")
if not nothing and runs is None: refuse("An ask says what its agent started that is billed while it waits (a Fly machine, a browser or a container of the cluster): --nothing-billed, or --runs <what> --since <HH:MM> --stop-in <minutes>.")
now = (datetime.fromisoformat(os.environ["ISSUE_ASK_NOW"]) if os.environ.get("ISSUE_ASK_NOW") else datetime.now()).astimezone()
fmt = "%Y-%m-%d %H:%M:%S %Z"
until = now + timedelta(minutes=minutes); by = None
if nothing: billed = "Billed while it waits: nothing this agent started."
else:
    if not runs: refuse("--runs names what is billed.")
    m = re.fullmatch(r"([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?", since or "")
    if not m: refuse("--since is the time what is billed was started, HH:MM of this machine, read and not estimated.")
    if stop is None or not whole(stop) or int(stop) > minutes:
        refuse("--stop-in is the minutes from now at which you stop it yourself, 0 to the %d of the wait: nothing billed outlasts the wait." % minutes)
    began = now.replace(hour=int(m.group(1)), minute=int(m.group(2)), second=int(m.group(3) or 0), microsecond=0)
    if began > now: began -= timedelta(days=1)
    by = now + timedelta(minutes=int(stop))
    billed = "Billed while it waits: %s, running since %s. This agent stops it by %s (%d min from this write), answered or not." % (runs, began.strftime(fmt), by.strftime(fmt), int(stop))
body = "%s\nWaits until %s (%d min from this write); then it takes the label off and ends the run with a report.\n%s" % (ask, until.strftime(fmt), minutes, billed)
role = token.split("-")[0]
tool = os.environ.get("ISSUE_AS_SH") or os.path.join(sys.argv[1], "issue-as.sh")
def send(call, sent):
    p = subprocess.run([tool, token, call, json.dumps(sent)], capture_output=True, text=True, env=dict(os.environ, ISSUE_AS_TIME_AHEAD="1"))
    if p.returncode == 2 and not p.stdout.strip():
        sys.stderr.write(p.stderr); sys.exit(2)
    s = re.search(r"\[(\d{3})\]\s*$", p.stderr)
    try: d = json.loads(p.stdout)
    except ValueError: d = None
    ok = s is not None and s.group(1) == "200" and isinstance(d, dict)
    return ok, d if ok else (p.stdout.strip()[:300] + " " + p.stderr.strip()[-300:]).strip()
ok, c = send("comment", {"key": "%s/%s/ask-%s" % (role, id, n), "id": id, "body": body})
if not ok:
    print("issue-ask.sh: the comment was not written, and no label was sent: " + c, file=sys.stderr); sys.exit(1)
ok, l = send("label", {"key": "%s/%s/asks-%s" % (role, id, n), "id": id, "add": ["asks-orchestrator"]})
if not ok:
    print("issue-ask.sh: the comment is written and the label is not, so nothing is printed at the session. Run the same call again: " + l, file=sys.stderr); sys.exit(1)
if c.get("duplicate") and l.get("duplicate"):
    print("issue-ask.sh: both keys of ask %s were used before; nothing was written. Take the next <n>." % n, file=sys.stderr); sys.exit(1)
print(json.dumps({"comment": c.get("seq"), "label": l.get("seq"), "until": until.strftime(fmt), "untilEpoch": int(until.timestamp()), "stop": by.strftime(fmt) if by else None}))' "$D" "$@"
