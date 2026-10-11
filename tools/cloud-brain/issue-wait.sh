#!/bin/bash
# issue-wait.sh <token> <id> <after seq> [seconds]   waits for the first review of one issue after an event. It writes nothing.
# Reads sync?after= every 15 s (200 events an answer; a full answer is followed at once by the next).
# Exit 0: the first `reviewed` event of <id> with a seq over <after seq>, one line of JSON. Then, when it comes within 30 s
#         of that read, the first `moved` event of <id> after the review (the reviewer's pass, to-approval or rework), a second
#         line. One line and no second: the review is recorded and no move was read, so the issue may still be `in-review`.
# Exit 3: no review in <seconds> (240 by default), nothing on stdout. stderr says how many calls were not read, when any.
# Exit 2: issue-as.sh keeps no token of that name, or a read was answered 401 or 403 (a token that was ended); nothing
#         more is waited. Exit 64: the arguments.
# No call is begun after <seconds> + 30, and one that runs then is stopped: with 240 the command ends within 271 s.
# An <after seq> past the tracker's last event (the answer has reset: true) is read as that last event's seq, and stderr says so.
#        issue-wait.sh --filter <id> [after seq] < an answer of sync?after=   (the same lines from that one answer, exit 0 or 3; no call)
# ISSUE_AS_SH names another issue-as.sh, ISSUE_WAIT_EVERY another 15 and ISSUE_WAIT_MOVE another 30: the test's. tests/tools/issue-wait.test.ts.
# Part 5 of plan/cloud-brain-loop-order-of-service.md; records/os-4-writer-waits.md.
D="$(cd "$(dirname "$0")" && pwd)"
exec python3 -I -c '
import json, os, re, subprocess, sys, time
def usage():
    print("usage: issue-wait.sh <token> <id> <after seq> [seconds] | issue-wait.sh --filter <id> [after seq] < answer", file=sys.stderr)
    sys.exit(64)
def whole(s): return isinstance(s, str) and re.fullmatch(r"[0-9]{1,15}", s) is not None
def events(text):
    # The answer and its events, or None for an answer that is not one of sync.
    try: d = json.loads(text)
    except ValueError: return None
    if not isinstance(d, dict) or not isinstance(d.get("events"), list): return None
    d["events"] = [e for e in d["events"] if isinstance(e, dict) and isinstance(e.get("seq"), int)]
    return d
class Seen:
    def __init__(self, id, after): self.id, self.after, self.review = id, after, None
    def read(self, evs):
        # True when the move after the review is read: nothing more is waited for.
        for e in evs:
            if e["seq"] <= self.after: continue
            self.after = e["seq"]
            if e.get("id") != self.id: continue
            if self.review is None:
                if e.get("type") == "reviewed":
                    self.review = e; print(json.dumps(e, separators=(",", ":")), flush=True)
            elif e.get("type") == "moved":
                print(json.dumps(e, separators=(",", ":")), flush=True); return True
        return False
a = sys.argv[2:]
if a[:1] == ["--filter"]:
    if len(a) not in (2, 3) or not a[1] or (len(a) == 3 and not whole(a[2])): usage()
    d = events(sys.stdin.read()); s = Seen(a[1], int(a[2]) if len(a) == 3 else 0)
    if d: s.read(d["events"])
    sys.exit(0 if s.review else 3)
if len(a) not in (3, 4) or not a[0] or not re.fullmatch(r"[a-z0-9-]{1,40}", a[1]) or not whole(a[2]) or (len(a) == 4 and not whole(a[3])): usage()
token, seconds = a[0], int(a[3]) if len(a) == 4 else 240
every = float(os.environ.get("ISSUE_WAIT_EVERY") or 15); grace = float(os.environ.get("ISSUE_WAIT_MOVE") or 30)
tool = os.environ.get("ISSUE_AS_SH") or os.path.join(sys.argv[1], "issue-as.sh")
s = Seen(a[1], int(a[2])); start = time.monotonic(); calls = unread = 0; move_by = None
while True:
    now = time.monotonic()
    end = move_by if s.review else start + seconds
    if now >= end: break
    calls += 1; text = ""
    try:
        p = subprocess.run([tool, token, "sync?after=%d" % s.after], capture_output=True, text=True, timeout=max(1.0, start + seconds + grace - now))
        if p.returncode == 2 and not p.stdout.strip():
            sys.stderr.write(p.stderr); sys.exit(2)
        if re.search(r"\[40[13]\]\s*$", p.stderr):
            print("issue-wait.sh: the read was refused%s; the token has ended or does not name issue.sync" % p.stderr.rstrip()[-6:], file=sys.stderr); sys.exit(2)
        text = p.stdout
    except (subprocess.TimeoutExpired, OSError): pass
    d = events(text); full = False
    if d is None: unread += 1
    else:
        if d.get("reset") and isinstance(d.get("seq"), int) and d["seq"] < s.after:
            print("issue-wait.sh: after %d is past the last event, %d; reading from %d" % (s.after, d["seq"], d["seq"]), file=sys.stderr)
            s.after = d["seq"]
        had = s.review is not None
        if s.read(d["events"]): sys.exit(0)
        if s.review and not had: move_by = min(time.monotonic() + grace, start + seconds + grace)
        full = len(d["events"]) >= 200
    if not full: time.sleep(max(0.0, min(min(every, 5.0) if s.review else every, (move_by if s.review else start + seconds) - time.monotonic())))
if s.review: sys.exit(0)
if unread: print("issue-wait.sh: %d of %d calls gave no answer that was read" % (unread, calls), file=sys.stderr)
sys.exit(3)' "$D" "$@"
