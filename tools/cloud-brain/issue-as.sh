#!/bin/bash
# issue-as.sh <token name> <method[?query]> [json body]   calls issue.<method> on cb4 as a token.
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
D="$(cd "$(dirname "$0")" && pwd)"
if [ -n "$3" ] && [ -z "$ISSUE_AS_TIME_AHEAD" ]; then python3 - "$3" <<'PY'
import json, os, re, sys
from datetime import datetime, timezone
try: sent = json.loads(sys.argv[1])
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
tok=$(python3 - "$1" "$D/.emitted" <<'PY'
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
U="https://cb4.endpointservices.workers.dev/xrpc/com.lopecode.brain.issue.$2"
if [ -n "$3" ]; then curl -s -m 30 -w '%{stderr} [%{http_code}]\n' -H "authorization: Bearer $tok" -H 'content-type: application/json' -X POST -d "$3" "$U"
else curl -s -m 30 -w '%{stderr} [%{http_code}]\n' -H "authorization: Bearer $tok" "$U"; fi
