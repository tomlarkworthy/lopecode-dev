#!/bin/bash
# issue-as.sh <token name> <method[?query]> [json body | @file]   calls issue.<method> on cb4 as a token.
# Tokens are in .emitted/cb4-issues-tokens.json (a role's) and, read after it, .emitted/cb4-agent-tokens.json (one for each
# agent or session, made by `brain.ts agent-token <role>`; gone from it after `agent-token revoke NAME`). Both are
# git-ignored. The token is never printed. A name in neither is exit 2 and nothing is sent.
# tests/tools/agent-token.test.ts; records/ta-1-agent-token-command.md.
# stdout is the answer's body and nothing else, so a read pipes into a JSON parser. The HTTP status, ` [200]`, is on stderr
# (curl's %{stderr}, 7.63 or later): a terminal shows both, `2>&1` gives the body then the status as before 2026-10-11.
# tests/tools/tool-status-stderr.test.ts; records/tool-read-ends-with-status-not-json.md.
# A body whose `reason` or `body` names a time of day ahead of this machine's clock by more than a minute is
# not sent (exit 3, nothing read or called): such a time was estimated, not read. The date nearest a time
# says which day it is of; a time beside another day's date is not compared. ISSUE_AS_TIME_AHEAD=1 sends anyway.
# tests/tools/issue-as-time-check.test.ts; records/tracker-write-names-a-time-not-read.md.
# A third argument that begins with @ names a file whose bytes are the body, sent as they are: `issue-as.sh NAME comment @body.json`.
# For a body with an apostrophe (it ends the quoting of an inline '{…}' in the caller's shell) or longer than a few lines
# (one over ARG_MAX is "argument list too long"). The time check reads the file. A file that is absent or empty is exit 4
# and nothing is sent. The path is relative to where the call is made; `@-` is a file named `-`, never stdin.
# tests/tools/issue-as-body-file.test.ts; records/issue-as-body-from-a-file.md.
# The token files are read from BRAIN_STATE_DIR, or with none the main checkout's tools/cloud-brain/.emitted, also when the
# copy that runs is a worktree's own (as lock.sh; a worktree's .emitted has no token). A copy that is in no git repository
# reads .emitted beside itself. ISSUE_AS_BASE is the address, https://cb4.endpointservices.workers.dev with none; only the
# tests set it. tests/tools/worktree.test.ts; records/wt-2-worktree-sh.md.
# A third argument `--short` is for a read of `get`: `issue-as.sh NAME "get?id=ID" --short`. The service's answer is whole
# as before; what is printed is cut here, for an agent that reads it at every later request. Left out: of each event
# `prev`, `hash`, `sig`, `ray`, `origin`, `workflow` and `id` (the issue's); of the `opened` event its `title` and `body`
# when they are the issue's; of a `cost` event all but seq, key, type, at, by, role, round, how, outcome, token and event;
# of the issue `workflow` and `runs`; and the answer's `cost`. `by` is the caller's name (the holder with no `secret:`, or
# the caller when a session wrote it), and `at`, `opened_at`, `updated_at` and `last.at` are times in UTC. One event a
# line, the whole still one JSON value. An answer with no `events` (another method, a refusal) is printed as it came.
# tests/tools/issue-as-short.test.ts; records/writer-brief-and-tool-output-smaller.md.
D="$(cd "$(dirname "$0")" && pwd)"
DIR="${BRAIN_STATE_DIR:-}"
if [ -z "$DIR" ]; then
  G="$(git -C "$D" rev-parse --path-format=absolute --git-common-dir 2>/dev/null)" && DIR="$(dirname "$G")/tools/cloud-brain/.emitted" || DIR="$D/.emitted"
fi
SHORT=""
if [ "$3" = "--short" ]; then SHORT=1; set -- "$1" "$2"; fi
F=""
case "$3" in @*)
  F="${3#@}"
  if [ ! -f "$F" ] || [ ! -s "$F" ]; then echo "issue-as.sh: the body's file $F is absent or empty; nothing was sent" >&2; exit 4; fi
  case "$F" in /*) ;; *) F="./$F";; esac;;
esac
if [ -n "$3" ] && [ -z "$ISSUE_AS_TIME_AHEAD" ]; then python3 - "$3" "$F" <<'PY'
import json, os, re, sys
from datetime import datetime, timezone
try: sent = json.loads(open(sys.argv[2], encoding="utf-8").read() if sys.argv[2] else sys.argv[1])
except ValueError: sys.exit(0)
if not isinstance(sent, dict): sys.exit(0)
# ISSUE_AS_NOW is the test's clock, a local time.
now = (datetime.fromisoformat(os.environ["ISSUE_AS_NOW"]) if os.environ.get("ISSUE_AS_NOW") else datetime.now()).astimezone()
utc = now.astimezone(timezone.utc)
DATE = re.compile(r"(?<!\d)\d{4}-\d{2}-\d{2}(?!\d)")
TIME = re.compile(r"(?:(?<![\w:.+])|(?<=\dT))([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?(?!\d|:\d)")
ahead = []
for field in ("reason", "body"):
    text = sent.get(field)
    if not isinstance(text, str): continue
    dates = [(m.start(), m.end(), m.group()) for m in DATE.finditer(text)]
    for m in TIME.finditer(text):
        clock = utc if re.match(r"(\.\d+)?\s?(Z|UTC)\b", text[m.end():]) else now
        # The nearest date, the one before on a tie.
        near = min(dates, key=lambda d: (m.start() - d[1] if d[1] <= m.start() else d[0] - m.end() + 0.5), default=None)
        if near and near[2] != clock.strftime("%Y-%m-%d"): continue
        named = clock.replace(hour=int(m.group(1)), minute=int(m.group(2)), second=int(m.group(3) or 0), microsecond=0)
        by = (named - clock).total_seconds()
        if by > 60: ahead.append((field, m.group(), clock, by))
if not ahead: sys.exit(0)
for field, time, clock, by in ahead:
    gap = "%d min" % (by // 60) if by < 3600 else "%d h %d min" % (by // 3600, by % 3600 // 60)
    print("issue-as.sh: not sent. The %s names %s, %s ahead of the clock (%s)." % (field, time, gap, clock.strftime("%Y-%m-%d %H:%M:%S %Z")), file=sys.stderr)
print("issue-as.sh: a time in a tracker write is read from `date` or an event's `at`, never estimated. A time of another day: write its date (YYYY-MM-DD) beside it. A time that is rightly ahead (a lease's end), or quoted from a text that has it wrong: ISSUE_AS_TIME_AHEAD=1.", file=sys.stderr)
sys.exit(3)
PY
[ $? -eq 3 ] && exit 3; fi
tok=$(python3 - "$1" "$DIR" <<'PY'
import json, os, sys
for f in ("cb4-issues-tokens.json", "cb4-agent-tokens.json"):
    p = os.path.join(sys.argv[2], f)
    t = json.load(open(p)).get(sys.argv[1]) if os.path.exists(p) else None
    if isinstance(t, str) and t:
        print(t)
        sys.exit(0)
print("issue-as.sh: no token named %s is kept; nothing was sent" % sys.argv[1], file=sys.stderr)
sys.exit(1)
PY
) || exit 2
U="${ISSUE_AS_BASE:-https://cb4.endpointservices.workers.dev}/xrpc/com.lopecode.brain.issue.$2"
if [ -n "$SHORT" ]; then
  read -r -d '' PY <<'PY'
import json, sys
from datetime import datetime, timezone
raw = sys.stdin.read()
try: a = json.loads(raw)
except ValueError: a = None
if not (isinstance(a, dict) and isinstance(a.get("events"), list) and isinstance(a.get("issue"), dict)):
    sys.stdout.write(raw)
    sys.exit(0)
def when(ms):
    return datetime.fromtimestamp(ms / 1000, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ") if isinstance(ms, (int, float)) and not isinstance(ms, bool) else ms
def who(by):
    if not isinstance(by, dict): return by
    h = by.get("holder")
    if isinstance(h, str) and h: return h[7:] if h.startswith("secret:") else h
    return "%s (tab)" % by.get("caller") if by.get("tab") else by.get("caller")
LEFT = ("prev", "hash", "sig", "ray", "origin", "workflow", "id")
COST = ("seq", "key", "type", "at", "by", "role", "round", "how", "outcome", "token", "event")
dump = lambda v: json.dumps(v, ensure_ascii=False, separators=(",", ":"))
issue = {k: v for k, v in a["issue"].items() if k not in ("workflow", "runs")}
for k in ("opened_at", "updated_at"):
    if k in issue: issue[k] = when(issue[k])
if isinstance(issue.get("last"), dict) and "at" in issue["last"]: issue["last"] = dict(issue["last"], at=when(issue["last"]["at"]))
events = []
for e in a["events"]:
    if not isinstance(e, dict):
        events.append(e)
        continue
    s = {k: v for k, v in e.items() if k not in LEFT and (e.get("type") != "cost" or k in COST)}
    if e.get("type") == "opened":
        for k in ("title", "body"):
            if k in s and s[k] == a["issue"].get(k): del s[k]
    if "at" in s: s["at"] = when(s["at"])
    if "by" in s: s["by"] = who(s["by"])
    events.append(s)
parts = ['"issue":' + dump(issue)]
parts += ['"%s":%s' % (k, dump(v)) for k, v in a.items() if k not in ("issue", "events", "cost")]
parts.append('"events":[\n' + ",\n".join(dump(e) for e in events) + "\n]")
sys.stdout.write("{" + ",\n".join(parts) + "}\n")
PY
  curl -s -m 30 -w '%{stderr} [%{http_code}]\n' -H "authorization: Bearer $tok" "$U" | python3 -c "$PY"
  exit "${PIPESTATUS[0]}"
fi
if [ -n "$F" ]; then curl -s -m 30 -w '%{stderr} [%{http_code}]\n' -H "authorization: Bearer $tok" -H 'content-type: application/json' -X POST --data-binary "@$F" "$U"
elif [ -n "$3" ]; then curl -s -m 30 -w '%{stderr} [%{http_code}]\n' -H "authorization: Bearer $tok" -H 'content-type: application/json' -X POST -d "$3" "$U"
else curl -s -m 30 -w '%{stderr} [%{http_code}]\n' -H "authorization: Bearer $tok" "$U"; fi
