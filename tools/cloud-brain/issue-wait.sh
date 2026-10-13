#!/bin/bash
# issue-wait.sh <token> <id> <after seq> --when '<CEL>' [seconds] [--until <minutes>] [--last]
# issue-wait.sh <token> <id> <after seq> --left <state> [seconds] [--until <minutes>] [--last] [--no-round]
#   A wait of the tracker's record (issue.wait), then reads of the caller's due waits (issue.wakes?id=), each a call the
#   tracker holds up to 25 s and answers when the wait is due (&seconds=, part 4 of the plan; records/tr-4-held-read.md).
#   Part 3 of plan/cloud-brain-tracker-trigger-rules.md; records/tr-2-issue-wait-over-wakes.md.
#   A read begins 15 s or more after the one before it, so a tracker that answers at once is read every 15 s, as before
#   part 4. After a held read that gave no answer the reads of that run are sent with no seconds, and stderr says so.
#   The wait: key <role>/<id>/wait-<after seq>, <role> the token's name up to its first `-`; `until` the minutes from this
#   run, 25 with no --until. The tracker keeps a key once, so the first run writes the wait and a later run of the same
#   <id> and <after seq> writes nothing. <after seq> is the caller's: the seq of its own submit, or of the event it began
#   to wait at, the same in every run of one wait. --left <state> is --when `issue.state != "<state>"`: the caller names
#   the state it left the issue in, and the tool does not read it.
#   Exit 0: the wait is due. Two lines of JSON: the due entry of issue.wakes, then the `reviewed` event of <id> with the
#           highest seq over <after seq>, whole, read from get?id= after the entry was seen; `null` when it has none.
#           Then the tool takes the wait off (key <role>/<id>/remove-<after seq>), but for one case: the run has --left and
#           no --no-round, and the issue is at `in-progress` or `spec` (a round was sent back). Then nothing is written,
#           the wait stands, and stderr names the two commands below, one of which is the caller's next call.
#   Exit 3: not due in <seconds> (240 by default), nothing on stdout: run it again with the same arguments. With --last
#           the wait is taken off before this exit. stderr says how many calls were not read, when any, and says so when
#           the wait was due and the issue could not be read.
#   Exit 5: the wait is not live, nothing on stdout: it is past its `until`, was taken off, or another wait of this token
#           on the issue took its place.
#   Exit 64: the arguments, or a wait the tracker refused (a `when` it does not take, an id it does not have, a key that
#           is another actor's), with its message on stderr.
# issue-wait.sh <token> <id> <after seq> --work     says the caller is at work on a round: reads the issue's state, then
#   writes the wait `issue.state != "<that state>"`, `until` 60 minutes on, note "at work on the round", key
#   <role>/<id>/work-<after seq>, in the place of the one that stood. A read and a write; it waits for nothing.
# issue-wait.sh <token> <id> <after seq> --remove   takes the caller's wait on the issue off, key
#   <role>/<id>/remove-<after seq>. One call. No wait there is exit 0 too, and stderr says so.
#   Both: exit 0 with one line, {seq, key, …} of the event; exit 1 when it was not written, with the answer on stderr.
# Exit 2, every form: issue-as.sh keeps no token of that name, or a call was answered 401 or 403 (a token that was ended);
#   nothing more is waited.
# No call is begun after <seconds> + 30, and one that runs then is stopped: with 240 a wait ends within about 271 s.
#
# The wait for an event, `issue-wait.sh <token> <id> <after seq> [seconds]` with no flag, and `--filter` were taken out
# with task 3 of that plan (records/tr-3-briefs-and-queue.md): the briefs name --left. A call with no flag is exit 64 with
# nothing sent, and stderr has the line to run in its place.
# ISSUE_WAIT_HOLD names another 25, a number from 0 to 25: with 0 no read is held, and each is `wakes?id=` alone every 15 s.
# ISSUE_AS_SH names another issue-as.sh, ISSUE_WAIT_EVERY another 15 and ISSUE_WAIT_MOVE another 30: the test's. tests/tools/issue-wait.test.ts.
D="$(cd "$(dirname "$0")" && pwd)"
exec python3 -I -c '
import json, os, re, subprocess, sys, time
def usage():
    print("usage: issue-wait.sh <token> <id> <after seq> (--when CEL | --left STATE) [seconds] [--until MINUTES] [--last] [--no-round] | issue-wait.sh <token> <id> <after seq> (--work | --remove)", file=sys.stderr)
    sys.exit(64)
def whole(s): return isinstance(s, str) and re.fullmatch(r"[0-9]{1,15}", s) is not None
a = sys.argv[2:]
opt = {}; pos = []; i = 0
while i < len(a):
    x = a[i]
    if x in ("--when", "--left", "--until"):
        if x in opt or i + 1 >= len(a): usage()
        opt[x] = a[i + 1]; i += 2
    elif x in ("--last", "--no-round", "--work", "--remove"):
        if x in opt: usage()
        opt[x] = True; i += 1
    elif x.startswith("--"): usage()
    else: pos.append(x); i += 1
a = pos; mode = [x for x in ("--when", "--left", "--work", "--remove") if x in opt]
if len(a) not in (3, 4) or not a[0] or not re.fullmatch(r"[a-z0-9-]{1,40}", a[1]) or not whole(a[2]) or (len(a) == 4 and not whole(a[3])): usage()
if len(mode) > 1 or (not mode and opt): usage()
if not mode:
    print("issue-wait.sh: the wait with no flag was taken out (tr-3-briefs-and-queue), and nothing was sent. After your submit: issue-wait.sh %s %s %s --left %s%s" % (a[0], a[1], a[2], "spec-review" if a[0].startswith("spec-") else "in-review", " " + a[3] if len(a) == 4 else ""), file=sys.stderr)
    sys.exit(64)
token, seconds = a[0], int(a[3]) if len(a) == 4 else 240
every = float(os.environ.get("ISSUE_WAIT_EVERY") or 15); grace = float(os.environ.get("ISSUE_WAIT_MOVE") or 30)
hold = os.environ.get("ISSUE_WAIT_HOLD")
if hold is not None and hold != "" and (not re.fullmatch(r"[0-9]{1,2}(\.[0-9]{1,3})?", hold) or float(hold) > 25):
    print("issue-wait.sh: ISSUE_WAIT_HOLD is a number from 0 to 25; nothing was sent", file=sys.stderr); sys.exit(64)
hold = float(hold) if hold else 25.0
tool = os.environ.get("ISSUE_AS_SH") or os.path.join(sys.argv[1], "issue-as.sh")
mode = mode[0]; id, after = a[1], int(a[2]); role = token.split("-")[0]
if mode in ("--work", "--remove") and (len(a) != 3 or len(opt) != 1): usage()
if "--no-round" in opt and mode != "--left": usage()
if "--until" in opt and (not whole(opt["--until"]) or not 1 <= int(opt["--until"]) <= 43200): usage()
if mode == "--when" and not 1 <= len(opt["--when"]) <= 500: usage()
if mode == "--left" and not re.fullmatch(r"[a-z][a-z0-9-]{0,39}", opt["--left"]): usage()
if not role: usage()
start = time.monotonic(); hard = start + seconds + grace
key = lambda what: "%s/%s/%s-%d" % (role, id, what, after)
say = lambda text: print("issue-wait.sh: " + text, file=sys.stderr)
def obj(text):
    try: d = json.loads(text)
    except ValueError: return None
    return d if isinstance(d, dict) else None
def why(status, text):
    d = obj(text) or {}
    return "[%s] %s" % (status if status else "no answer", d.get("message") or d.get("error") or text.strip()[:200])
def call(method, body=None):
    # (status, body). The status is None for a call with no answer. A token that is not kept, or was ended, ends the run.
    args = [tool, token, method] + ([] if body is None else [json.dumps(body, separators=(",", ":"))])
    try: p = subprocess.run(args, capture_output=True, text=True, timeout=max(1.0, min(30.0, hard - time.monotonic())))
    except (subprocess.TimeoutExpired, OSError): return None, ""
    if p.returncode == 2 and not p.stdout.strip():
        sys.stderr.write(p.stderr); sys.exit(2)
    m = re.search(r"\[([0-9]{3})\]\s*$", p.stderr); status = int(m.group(1)) if m else None
    if status in (401, 403):
        say("the call %s was refused %s; the token has ended or does not name it" % (method.split("?")[0], why(status, p.stdout))); sys.exit(2)
    return status, p.stdout
def line(d):
    e = d.get("event") if isinstance(d.get("event"), dict) else {}
    o = {"seq": d.get("seq")}; o.update((k, e[k]) for k in ("key", "when", "until", "note", "remove") if k in e)
    if d.get("duplicate"): o["duplicate"] = True
    return json.dumps(o, separators=(",", ":"))
def remove():
    # 0: no wait of the caller stands on the issue, as far as the answer says. 1: the call was not written.
    status, text = call("wait", {"key": key("remove"), "id": id, "remove": True}); d = obj(text) or {}
    if status == 200:
        if d.get("duplicate"): say("the key %s was kept before, so nothing was written now: a wait written after that remove stands until its time" % key("remove"))
        return 0, d
    if status == 404 and d.get("message") == "no such wait":
        say("no wait of this token stands on %s: nothing to take off" % id); return 0, None
    say("the remove was not written %s; the wait stands until its time, or: issue-wait.sh %s %s %d --remove" % (why(status, text), token, id, after))
    return 1, None
def got():
    # (the state, the last review after the seq), or None when the issue was not read.
    status, text = call("get?id=" + id); d = obj(text) if status == 200 else None
    if not d or not isinstance(d.get("issue"), dict) or not isinstance(d.get("events"), list): return None
    r = None
    for e in d["events"]:
        if isinstance(e, dict) and e.get("type") == "reviewed" and isinstance(e.get("seq"), int) and e["seq"] > after and (r is None or e["seq"] > r["seq"]): r = e
    return d["issue"].get("state"), r
if mode == "--remove":
    code, d = remove()
    if d: print(line(d), flush=True)
    sys.exit(code)
if mode == "--work":
    g = got()
    if g is None or not isinstance(g[0], str) or not re.fullmatch(r"[a-z][a-z0-9-]{0,39}", g[0]):
        say("the state of %s was not read; nothing was written" % id); sys.exit(1)
    status, text = call("wait", {"key": key("work"), "id": id, "when": "issue.state != \"%s\"" % g[0], "until": int(time.time() * 1000) + 3600000, "note": "at work on the round"})
    d = obj(text) or {}
    if status != 200:
        say("the wait was not written %s" % why(status, text)); sys.exit(1)
    if d.get("duplicate"): say("the key %s was kept before, so nothing was written now" % key("work"))
    print(line(d), flush=True); sys.exit(0)
when = opt["--when"] if mode == "--when" else "issue.state != \"%s\"" % opt["--left"]
wait = {"key": key("wait"), "id": id, "when": when, "until": int(time.time() * 1000) + int(opt.get("--until", 25)) * 60000}
mine = None; calls = unread = 0; due = False
while True:
    began = time.monotonic()
    if began >= start + seconds: break
    if mine is None:
        calls += 1; status, text = call("wait", wait); d = obj(text) or {}
        if status == 200 and isinstance(d.get("seq"), int):
            if d.get("duplicate") and not isinstance(d.get("event"), dict):
                say("the key %s is another actor\x27s (event %d): no wait of this token was written" % (wait["key"], d["seq"])); sys.exit(64)
            mine = d["seq"]
        elif status is not None and 400 <= status < 500:
            say("the wait was refused %s" % why(status, text)); sys.exit(64)
        else: unread += 1
    if mine is not None:
        # A held read: the tracker answers when the wait is due, or after the seconds, which end with the run.
        held = ("%.3f" % min(hold, start + seconds - time.monotonic())).rstrip("0").rstrip(".") if hold else "0"
        calls += 1; status, text = call("wakes?id=" + id + ("&seconds=" + held if held != "0" else "")); d = obj(text) if status == 200 else None
        if not d or not isinstance(d.get("due"), list) or not isinstance(d.get("waiting"), list):
            unread += 1
            if held != "0":
                hold = 0; say("a read held %s s gave no answer that was read %s: the reads of this run are sent with no seconds from here" % (held, why(status, text)))
        else:
            of = lambda l: next((e for e in l if isinstance(e, dict) and e.get("id") == id and e.get("seq") == mine), None)
            e = of(d["due"])
            if e:
                due = True; calls += 1; g = got()
                if g is None: unread += 1
                else:
                    print(json.dumps(e, separators=(",", ":"))); print(json.dumps(g[1], separators=(",", ":")), flush=True)
                    state = g[0] if isinstance(g[0], str) else (e.get("issue") or {}).get("state")
                    if mode == "--left" and "--no-round" not in opt and state in ("in-progress", "spec"):
                        say("%s is at %s: a round was sent back, and the wait stands as it is. Take the round: issue-wait.sh %s %s %d --work   Leave it: issue-wait.sh %s %s %d --remove" % (id, state, token, id, after, token, id, after))
                    else: remove()
                    sys.exit(0)
            elif not of(d["waiting"]):
                say("the wait %s (event %d) is not live: it is past its until, was taken off, or another wait of this token on %s took its place" % (wait["key"], mine, id)); sys.exit(5)
            else: due = False
    time.sleep(max(0.0, min(began + every, start + seconds) - time.monotonic()))
if due: say("the wait is due and the issue was not read (get?id=%s): run it again" % id)
if unread: say("%d of %d calls gave no answer that was read" % (unread, calls))
if "--last" in opt: remove()
sys.exit(3)' "$D" "$@"
