# never-page-up-line-after-a-check

Written 2026-10-13 by two writers of the issue. The first (token `impl-4f8cb6`, 10:28) took the
line of the Never list of `.claude/skills/brain-maintenance/rules.md` against `brain.ts page up`
and the Brain's own page in a browser of the cluster out in a worktree and did not land it: the
owner was shown that it goes after one check, and the check is the act the line forbids. It wrote
what was read in its place, how the check is made, and what the check has to show. The owner then
answered that the check be run, a session he was in made it at 21:15, and the second writer
(token `impl-206afa`) wrote "The check as it was made" and the sections after it, for the landing
of the change. The sections before that one are the first writer's, as written before the check. Times
are CEST, read from `date`, but for the times of the check, which are the session's.

## The line, and why it had no end

```
- Run `brain.ts page up`, or open the Brain's own page (`https://cb4…/`) in a browser of the
  cluster, until `deployer-put-back-issues-worker` is closed. That browser is Chrome 128, which
  has no Ed25519: the page runs every Worker's tests on opening, the tracker's fail there, and
  the deployer puts `brain-x-issues` back to its previous version (it did at 19:32:38 on
  2026-10-10, taking a reviewed fix off cb4 for 11 minutes). (Added by the orchestrating session
  on 2026-10-10 with no issue; Tom, 2026-10-11, asked to keep it or revert it: "Keep it". Issue
  `rules-never-line-added-unapproved`.)
```

`deployer-put-back-issues-worker` is `rejected` (event 709, 2026-10-11 13:22:33 UTC, "Already so;
nothing left to build"), and a rejected issue is not closed later. The issue's body has what the
owner was shown on 2026-10-13: "I have not confirmed that opening the full page no longer
triggers a put-back; that needs one check before the line goes."

## What the put-back of 2026-10-10 went through

Comment 239 of `deployer-put-back-issues-worker` has it from the logs of that evening: `page up`
at 19:31 opened the signed-in page in Chrome 128, the page ran the tracker's tests, one failed on
`generateKey` (no Ed25519), the page sent `deploy.report` to the core with the fail, and the
Worker was put back at 19:32:38. Three things of that chain were read on 2026-10-13. None of them
is the check.

**The core refuses the report from anyone but the deployer.** The seed, `brain-core.ojs`:
`app.post(NS + "deploy.report", deployerOnly, …)`, and its test expects 401 for the owner, for
anonymous and for a Worker. What cb4 runs, read at 10:21:48 with
`curl -s "https://cb4.endpointservices.workers.dev/xrpc/com.lopecode.brain.getSource?worker=brain-core"`
(238,208 bytes): one `deploy.report`, behind `deployerOnly`. One call was sent to it with no
session, for a Worker that does not exist:

```
curl -s -X POST -H 'content-type: application/json' -d '{"worker":"brain-x-no-such-worker","hash":"0","ok":false}' …/xrpc/com.lopecode.brain.deploy.report
{"error":"AuthRequired","message":"the deployer"} [401]
```

The same call with the owner's session was not sent: it is the owner's. The page of `page up` is
signed in as the owner, so that is the caller the old chain had.

**The page cb4 serves does not name the report.** `getSource?worker=brain-x-page` at the same
time: 206,750 bytes, hash `ac2e21b2ec54`, `grep -c 'deploy.report'` prints 0. In the seeds, the
page's calls of the deployer are `infra.getState`, `infra.apply` and `infra.confirm`
(`grep -n -E '"(infra|deploy)\.[a-zA-Z]+' tools/cloud-brain/cloud-brain.ojs tools/cloud-brain/brain-shell.ojs`),
and `brain.apply` and `brain.confirm` are called from four places
(`grep -n -E 'brain\.(apply|confirm)\(' tools/cloud-brain/*.ojs`). Not read: whether each of the
four runs only at a press of the owner. That is what the check shows and this reading does not.

**The tracker signs with P-256 since 2026-10-10** (`tools/cloud-brain/records/sign-p256.md`), so the
test that failed in Chrome 128 is not the test that runs now. Whether every test of the 24
Workers passes in Chrome 128 on the full page was not read, and the check does not need it: with
the report refused, a test that fails on the page has nowhere to send its fail.

The put-backs cb4 did make, `logs.deploys` for the 30 hours before 10:26:55 (449 lines), one line:

```
1791842585901 deploy.put-back brain-x-issues 36c15fa382ff -> 40e024c3bfbe POST /workers/scripts/cb4-x-issues/versions 400 [{"code":10054,"message":"Text binding 'BRAIN_INFO' is too large, its si
```

Its reason is Cloudflare's answer to an upload, in a deploy. A run of the same read some minutes
earlier, whose time was not kept, had a second line at the old end of its window: `brain-x-ai`,
t 1791771969954, "health check failed after go-live". Neither is a test run of a page.

## The check

One act: the Brain's own page, signed in, open in the cluster's browser for 3 minutes. The old
chain took 90 s from the open to the put-back (19:31:08 to 19:32:38). It deploys nothing and
names no Worker: a put-back of any of the 24 would show, and `brain-x-issues` is the one the old
chain put back. It is made by a session the owner is present in, on his word quoted on the issue
(`rules.md`, "An act of Never, on the owner's word"), not by a writer.

`B` below is `BRAIN_STATE_DIR=<root>/tools/cloud-brain/.emitted BRAIN_BASE=cb4`, and `<s>` a
directory of the session. The reads were run by this writer on 2026-10-13 between 10:26 and 10:28,
with what each printed beside it. The three lines of the act were not run.

Before:

```
LOCK_TOKEN=<token> tools/cloud-brain/lock.sh take cb4 <who>      # no deploy runs beside the check; not run by this writer
date; python3 -I -c 'import time;print(int(time.time()*1000))'   # T0
env B bun tools/cloud-brain/brain.ts state > <s>/before.txt      # 60 lines: each Worker's hash and state
grep -c probation <s>/before.txt                                 # 0. Above 0: wait; the tick puts an unconfirmed Worker back at 10 minutes
env B bun tools/cloud-brain/brain.ts curl /xrpc/com.lopecode.brain.browser.all --owner   # nothing up; the owner's read, not run by this writer
```

The act, with a pairing token of the session (`get_pairing_token`). With no `--token` the page
opens unpaired and `page up` still stays in the foreground; that form was read in `brain.ts` and
not run.

```
env B bun tools/cloud-brain/brain.ts page up --minutes 3 --token <LOPE token>    # about $0.005 at $0.09 an hour
env B bun tools/cloud-brain/brain.ts page state                                  # signedIn: true, the page's address
# 3 minutes by the clock, then:
env B bun tools/cloud-brain/brain.ts page down
```

After:

```
python3 -I -c 'import time;print(int(time.time()*1000))'         # T1
env B bun tools/cloud-brain/brain.ts state > <s>/after.txt
diff <s>/before.txt <s>/after.txt && echo same                   # same
env B bun tools/cloud-brain/brain.ts curl "/xrpc/com.lopecode.brain.logs.deploys?from=T0&to=T1" --as loop-deploys 2>/dev/null | python3 -I <s>/window.py
LOCK_TOKEN=<token> tools/cloud-brain/lock.sh release cb4 <who>
```

`window.py`:

```
import sys, json
t = sys.stdin.read(); d = json.loads(t[t.index("{"):t.rindex("}") + 1])
L = d["lines"]
for l in L:
    if l["at"] in ("deploy.put-back", "deploy.failed", "deploy.unhealthy"):
        print(l["t"], l["at"], l.get("target"), str(l.get("hash"))[:12], "->", str(l.get("previous"))[:12], str(l.get("reason"))[:120])
print("lines in the window:", len(L))
print("put-back lines in the window:", sum(l["at"] == "deploy.put-back" for l in L))
```

Over the 10 minutes before 10:26:55, in which nothing was deployed, it printed
`lines in the window: 0` and `put-back lines in the window: 0`. Cloudflare's logs are not there at
once: how long after T1 a line of the window can still arrive was not measured, so the read is
made again 2 minutes later.

**How a put-back would show.** A line `deploy.put-back` in the window with the Worker as `target`
and the hash it went back to as `previous`; that Worker's line in `after.txt` with another hash
than in `before.txt`; and, when tests were its reason, a new issue `fix-tests-WORKER-HASH8`
(`issue-as.sh <token> "list?kind=bug"` listed one of that name on 2026-10-13 10:27,
`fix-tests-brain-x-verifycheck-319604f7`).

**What each result does.** No put-back line, `same`, and no new `fix-tests-` issue: the section
below gets the commands with what they printed, and this change lands. A put-back: the line goes
back into `rules.md` with what it now waits for, the issue the put-back opened, in place of
`deployer-put-back-issues-worker`; the Worker put back is deployed again by whoever holds its fix.

**What the check does not show.** That no later change to the page or the core brings a report
back. `brain-core.ojs` has the test for the refusal (`deploy.report` answers 401 to the owner);
nothing holds that the page sends none.

## The check as it was made

Made 2026-10-13, 21:15 to 21:21 CEST, by a session the owner was in (token `out-5bc2ed`), and not
by a writer. The owner had been shown nine things that waited for him as a numbered list, this
issue the sixth with A, run the check, and B, keep the rule. His answer, as that session quotes
it in event 7116 of the issue: "1B 2A 3A 4A 5A 6A 7A 8A 9 can't u do it (later)". What follows
down to "Read again" is that session's account in event 7116, with what it says each command
printed. This writer ran none of it.

| When | Command | What it printed |
|---|---|---|
| 21:15:25 | `LOCK_TOKEN=out-5bc2ed tools/cloud-brain/lock.sh take cb4 out-page-check` | `cb4 taken by out-page-check at 2026-10-13 21:15:25 CEST` |
| 21:15:25 | T0 | 1791918925948 |
| | `brain.ts state > before.txt`; `grep -c probation before.txt` | 60 lines; 0 |
| | `browser.all --owner` | `{"browsers":[]}`, 200 |
| 21:15:31 | `brain.ts page up --minutes 3`, with no `--token` | `bought 180 s for 0.0045 USD`, `page opened, signed in`, `19:15:41 bridge up`, `19:19:18 the browser's time ran out; "page up" buys more`, exit 0 |
| 21:15:38 | `brain.ts page state` | `"up":true`, `"remaining":173`, `"pages":["page"]`, `"signedIn":true`, `"heapMB":73`, and the address of cb4 with the layout of `cloud-brain`, `brain-shell` and `claude-code-pairing` |
| 21:19:18 | `brain.ts page down` | `{"closed":[],"browser":"brain"}`: its time had run out |
| | `browser.all` | `{"browsers":[]}` |
| 21:19:21 | T1 | 1791919161350 |
| | `brain.ts state > after.txt`; `diff before.txt after.txt && echo same` | `same` |
| 21:19:21, 21:20:42, 21:21:38 | `logs.deploys?from=T0&to=T1` as `loop-deploys` through `window.py`, three reads | each `lines in the window: 0` and `put-back lines in the window: 0` |
| | `list?kind=bug` | one issue named `fix-tests-`, `fix-tests-brain-x-verifycheck-319604f7`, `rejected`, the one of before; none new |
| 21:21:38 | the lock released | it was kept past T1 for the owner's deploy of the core, 21:20:49 |

From `bridge up` to the end of the browser's time is 3 minutes 37 s by those lines (19:15:41 to
19:19:18 UTC); the old chain took 90 s. The session used the form with no `--token`, which the section above has as read
and not run: the page opened unpaired. The last read of the log was 2 min 17 s after T1.

By "What each result does", above, this is the first result: no put-back line, `same`, no new
`fix-tests-` issue. The session took the label `needs-owner` off the issue with that comment
(event 7117).

**Read again by this writer**, 2026-10-13, 21:28:51 to 21:29:41, 9 minutes after T1, from the
worktree. `B` is as above and `window.py` the file above, copied to the scratchpad.

```
env B bun tools/cloud-brain/brain.ts curl "/xrpc/com.lopecode.brain.logs.deploys?from=1791918925948&to=1791919161350" --as loop-deploys 2>/dev/null | python3 -I window.py
lines in the window: 0
put-back lines in the window: 0
```

The same read with `to=1791919761350`, T1 and 10 minutes: `lines in the window: 12`,
`put-back lines in the window: 0`, and no line of `deploy.failed` or `deploy.unhealthy` printed.
The session says the owner deployed the core at 21:20:49, which is in that span; the 12 lines were
not read one by one. `brain.ts state` at 21:29:02: 60 lines, `grep -c probation` 0,
`brain-x-issues 60cd890fdf9e deployed`, `brain-x-page ac2e21b2ec54 deployed`: the page's hash is
the one whose source the first writer read at 10:21 and found no `deploy.report` in.
`issue-as.sh impl-206afa "list?kind=bug&limit=300"` at 21:29:41: 113 issues, `more` false, one
whose id has `fix-tests`, `fix-tests-brain-x-verifycheck-319604f7`, `rejected`.

**What the check does not show**, beside what the section above says of it: `before.txt` and
`after.txt` are the session's and were not read by this writer; the hash of the page at 21:15 is
taken to be the one of 21:29 because `diff` printed `same` and no deploy of the page is among the
put-back lines, and was not read at that time; one open of 3 minutes is one open.

## What changed

- `rules.md`, Never: the seven lines of "The line", above, are out. Nothing stands in their place.
  The item of "Always" that a browser an agent started is not left running stands, and so does
  the cost of one in `knowledge/pairing-with-the-cloud-brain-page.md` ("Do not leave one running").
- `tests/tools/never-page-up-line-after-a-check.test.ts`, new, five tests. Before the first
  writer's edit, with this file a title alone: 1 pass, 3 fail, of the four it then had. The fourth
  failed until the section above had the check: with the first writer's commit alone,
  `bun test --timeout=30000 ./tests/tools/never-page-up-line-after-a-check.test.ts` printed
  `3 pass`, `1 fail` (21:30:28). The fifth holds the two lines of the plans, below: with the two
  plans as they were it printed `4 pass`, `1 fail` (21:30:44).
- `tests/tools/never-list-three-reductions.test.ts`: it held the line word for word, as "not
  reduced". That expectation is out.
- Two plans said of the line that it stands, and each has a clause with the date beside it now:
  `plan/cloud-brain-page-modifications-how-they-are-kept.md` ("The loop does not open the Brain's
  own page in a browser of the cluster (`rules.md`, Never)") and `plan/cloud-brain-i1842.md` ("It
  is not the act the Never list names").

Who else repeats the line. The first writer's search,
`git grep -n -F 'deployer-put-back-issues-worker' -- .claude/skills/brain-maintenance knowledge 'plan/cloud-brain-*.md' 'tools/cloud-brain/*.md'`,
printed 17 lines with the edit made (10:28:16): 14 of `oversight.md` (the overseer's journal,
history), 2 of `tools/cloud-brain/records/review-the-default-workflow.md` (two tables of issues as
they stood on 2026-10-11) and one of `plan/cloud-brain-deploy-verdict-from-a-shared-page.md`, a
table of what that spec left out. The second writer's,
`git grep -n -F -e 'page up' -- knowledge 'plan/cloud-brain-*.md' .claude/skills/brain-maintenance 'tools/cloud-brain/*.md' ':!tools/cloud-brain/records/never-page-up-line-after-a-check.md'`,
which leaves this file out, printed 18 lines (21:30:54): in the briefs, 2 of `oversight.md` and
no other; 14 are how `page up` is run or that it was built (the three guides of `knowledge/`,
`plan/cloud-brain-backlog.md`, `running-a-cloud-brain.md`, the two as-built specs); 2 are records,
`tx-3-two-references.md` and `sign-p256.md`. No brief has the line. Records of other issues that say
"the rules forbid opening the Brain's page there" under what they did not try
(`bluesky-tick-poll-test-no-overlap.md`, `brain-tests-fail-headless-unread.md`,
`browser-run-timeout-test-wall-clock.md`, `stale-panel-after-deploy.md`), and `sign-p256.md` line
44, "`brain.ts page up` is not run until the put-back is redesigned", are of their day and left
as written.

## Not tried

- The check, by either writer: it is the session's, above.
- `deploy.report` with the owner's session.
- The page in the cluster's browser with a pairing token, and a second open.
- Whether each test of the 24 Workers passes on the full page in Chrome 128. The check shows that
  nothing was put back, not that nothing failed.

## Tests

- `bun test --timeout=30000 ./tests/tools/never-page-up-line-after-a-check.test.ts ./tests/tools/never-list-three-reductions.test.ts`:
  15 pass, 0 fail (21:30:44, and 21:41:35 after the rebase). With `rules.md` as `origin/main` has it
  and all else of the change: 13 pass, 2 fail, the first two tests of the new file (21:44:23).
- `tests/tools/suite.sh`, after the last edit of a file a test reads: 1333 pass, 0 fail, 140 files, no line `skipped:` (21:44:32 to 21:49:14, after the rebase; before it, 1312 pass, 0 fail, 138 files).
