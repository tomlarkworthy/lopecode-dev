# never-page-up-line-after-a-check

Written 2026-10-13 by the writer of the issue (token `impl-4f8cb6`). The line of the Never list of
`.claude/skills/brain-maintenance/rules.md` against `brain.ts page up` and the Brain's own page in
a browser of the cluster is taken out, in a worktree, and is not landed: the owner was shown that
it goes after one check, and the check is the act the line forbids. This file says what was read
in its place, how the check is made, and what the check has to show. Times are CEST, read from
`date`.

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

Not made when this was written, 2026-10-13 10:28. The writer asked the orchestrating session for
it in its report and on the issue, and the change waits in the worktree `bm-never-page-up`.

## What changed, in the worktree

- `rules.md`, Never: the seven lines above are out. Nothing stands in their place. The item of
  "Always" that a browser an agent started is not left running stands, and so does the cost of
  one in `knowledge/pairing-with-the-cloud-brain-page.md` ("Do not leave one running").
- `tests/tools/never-page-up-line-after-a-check.test.ts`, new, four tests. Before the edit, with
  this file a title alone: 1 pass, 3 fail. The fourth fails until the section above has the check,
  so `land.sh` with this file as `--test` does not land the removal before it.
- `tests/tools/never-list-three-reductions.test.ts`: it held the line word for word, as "not
  reduced". That expectation is out.

Who else repeats the line:
`git grep -n -F 'deployer-put-back-issues-worker' -- .claude/skills/brain-maintenance knowledge 'plan/cloud-brain-*.md' 'tools/cloud-brain/*.md'`
printed 17 lines with the edit made (10:28:16): 14 of `oversight.md` (the overseer's journal,
history), 2 of `tools/cloud-brain/records/review-the-default-workflow.md` (two tables of issues as
they stood on 2026-10-11) and one of `plan/cloud-brain-deploy-verdict-from-a-shared-page.md`, a
table of what that spec left out. No brief has it, and `git grep -n -F 'page up' -- .claude/skills/brain-maintenance`
printed 2 lines, both of `oversight.md`. `tools/cloud-brain/records/sign-p256.md` line 44 says
"`brain.ts page up` is not run until the put-back is redesigned": a record of 2026-10-10, left as
written.

## Not tried

- The check. Nothing here is a run of the page in Chrome 128.
- `deploy.report` with the owner's session.
- `page up` with no `--token`, and `lock.sh take cb4` around a check that deploys nothing.
- The whole suite of `tests/tools`: it is run after the check is recorded, before the landing.
