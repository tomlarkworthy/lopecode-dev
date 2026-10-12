# bk-5-holds-become-links

Task 5 of `plan/cloud-brain-bookkeeping-in-the-tracker.md` (approved by the owner, events 4148 and
4149 of `bookkeeping-in-the-tracker`): the waits the loop kept in `held:` comments and move reasons,
written into the tracker on cb4 as `after` links, holds with a time, the label `needs-owner` and
`ready` moves. An act on cb4 with the token `impl-409c7e`, 2026-10-12. The `start` move is event
5069 (23:10:18 CEST by `date`). No seed, no build, no deploy, no install.

`ia` below is `tools/cloud-brain/issue-as.sh impl-409c7e`, run from the worktree
`bm-bookkeeping-in-the-tracker`. Every time is CEST, from `date` beside the command or from the
`at` of an event.

## The holds were read again, and are not the spec's

The spec's list is of event 3990 (12:21). The body of the task: "read the holds again from the
tracker (the comments that begin `held:`), since tasks were opened and done since". Read at event
5022 (23:03 to 23:07): `ia "sync?after=…&limit=500"` to the end (5022 events), `ia "snapshot"`, and a
script of this writing over the two. It took each issue that is not closed and not `feedback`, at
`open`, `triaged` or `ready`, with a comment that begins `held`, or a move reason with the word
`held`. Its lines name 25 issues. A 26th, `tr-1-wait-in-the-record`, has no such text of its own:
its wait is in the reasons of two moves of other issues (events 5011 and 5013, "One writer in
brain-issues.ojs: tr-1-wait-in-the-record waits behind ac-2").

What became of the spec's 13 links by then:

| The spec's link | At event 5022 |
|---|---|
| `tp-4-docs` after `tp-3-take-and-done` | `tp-4-docs` is `done` |
| `wt-5-docs` after `wt-4-reviewer-in-a-view` | `wt-5-docs` is `done` (approve, event 4733) |
| `wt-6-check-after-a-day` after `wt-5-docs` | the issue it waits for is closed. What is left of its hold is "one whole day of the loop" (comment 3763): a time |
| `ta-1c-parent-revoke-on-cb4` after `ta-6-checks-after-three-issues` | `ta-6` is `done`. Left as it is, below |
| the other 9 | written |

And of the two holds with a time the spec names: `os-5-trial-read` has one. `dv-5-read-first-20-runs`
has none, since its count is met (below).

## What was written

31 calls, each answered 200 with a new `seq` (none `duplicate`; the lines of a log this writing kept,
one a call); the key of each is
`impl/bk-5-holds-become-links/<what>-<issue>`.

**13 links `after`**, events 5077 to 5089 (23:10:40 to 23:10:46). The follower is first.

| Issue | is after | From |
|---|---|---|
| `cu-2-usage-service` | `cu-1-deployer-gains-billing-read` | comment 3468 |
| `cu-3-figures-and-the-price` | `cu-2-usage-service` | comment 3470 |
| `cu-4-price-on-a-stored-write` | `cu-3-figures-and-the-price` | comment 3472; the other issue it names, `priced-calls-of-the-day-used-up`, is `done` |
| `fly-2-image-and-run-sh` | `fly-1-by-hand` | comment 3474 |
| `fly-3-brain-fly-service` | `fly-1-by-hand` | comment 3476 |
| `fly-4-loop-files` | `fly-3-brain-fly-service` | comment 3478 |
| `fly-4b-first-run` | `fly-4-loop-files` | comment 3480 |
| `fly-5-docs` | `fly-4b-first-run` | comment 3482 |
| `fly-6-after-seven-days` | `fly-4b-first-run` | comment 3484 |
| `bk-6-skill-watch-and-stats` | `bk-5-holds-become-links` | comment 4225 |
| `bk-7-read-after-two-days` | `bk-6-skill-watch-and-stats` | comment 4226 |
| `ac-5-prose-names-the-two-shapes` | `ac-2-tracker-lists-say-more` | comment 4242; the other issue it names, `ac-4-docs-tool-marks-a-cut`, is `done` |
| `tr-1-wait-in-the-record` | `ac-2-tracker-lists-say-more` | the reasons of events 5011 and 5013 |

Nine are the spec's and four are of issues opened since.

**4 holds with a time**, events 5096 to 5099 (23:11:02 to 23:11:04). Each reason says what to read
when the issue comes back, and what that read gave today.

| Issue | `until` | What it waits for, and the read |
|---|---|---|
| `ap-3-trial` | 1791925862344, 24 h after the call | 20 verdicts of approvers (comment 4478). `bun tools/cloud-brain/approver.ts trial --token impl-409c7e` at 23:09 printed `verdicts 9   approve 0   leave 9`. It was at `ready` and the queue listed it as `start` |
| `os-5-trial-read` | 1791925862344 | five sent-back rounds after `os-4-writer-waits` passed (event 2873). 3 `rework` moves after 2873 in the record at event 5022: events 3603, 3838, 4833. `bun tools/cloud-brain/issue-stats.ts --token impl-409c7e --window 2873` at 23:10, record at event 5067, printed `4 sent back`; that count has `send-back` moves in it too |
| `wt-6-check-after-a-day` | 1791922166564 | 24 h after the `at` of event 4733 (1791835766564, 22:09:26), the approve that closed `wt-5-docs` |
| `plain-worktree-outside-checkout-fails` | 1794427862344, an hour less than 30 days after the call | its triage (event 2867): "it is started when an agent is sent to such a worktree by a brief, or when a third report names it". Neither an issue nor a time; 30 days is the longest hold the service takes |

`plain-worktree-outside-checkout-fails` is in neither list of the spec. It was a `ready` entry of
the queue marked `late`, with a wait in words. The hold is one call, and `{ remove: true }` takes it
off.

**`needs-owner` on two**, each after a comment in the form of `rules.md`, "What the owner is asked to
decide": `cu-1-deployer-gains-billing-read` (comment 5102, label 5103) and
`ds-ingestion-tail-to-analytics-engine` (comment 5104, label 5105). Neither comment has a choice:
the owner answered A on both (events 3784 and 3790; 1398), and what is left is his deploy of the
deployer. `curl -s "https://cb4.endpointservices.workers.dev/xrpc/com.lopecode.brain.getSource?worker=brain-deployer" | grep -c "Billing Read"`
at 23:09: `0`.

He took this label off both himself after he answered: events 3785 and 3791 on `cu-1`, where the
orchestrating session had put it back between the two (3787), and 1399 on `ds-ingestion`. It is put
on here because the spec he approved later asks for it, and because the queue reads the label:
without it the two were `ready` entries of the loop. The comments say that. If he takes it off
again, this writer's view is that it is not put back a fourth time; that is the orchestrating
session's to hold.

**10 moves to `ready`**, events 5109 to 5117 and 5119 (23:11:49 to 23:11:53), after the links.

- Nine that wait by a link alone: `cu-2`, `cu-3`, `cu-4`, `fly-2`, `fly-3`, `fly-4`, `fly-5`,
  `bk-6-skill-watch-and-stats`, `tr-1-wait-in-the-record`.
- `dv-5-read-first-20-runs`, with no link and no hold. Its triage (event 1074): "Held at triaged
  until logs.deploys shows 20 runs after the install; then ready." Read at 23:05:
  `brain.ts curl "/xrpc/com.lopecode.brain.logs.deploys?from=1791729660000&to=<now>" --as loop-deploys`,
  with `from` 16:41 on 2026-10-11, the time that reason gives for the install. `runs` summed over
  the 21 rows of `workers`: 76. Lines `deploy.verified`: 76. Lines `deploy.verify.none`: 3, which
  the task's own body says to read.

## What was not moved to `ready`, though linked

"`ready` for each task that then waits by a link alone" (the spec). Four of the 13 followers wait
for more than their link, by their own comment, and stay at `triaged`. When the link ends each is a
`ready` entry of the queue, which a session reads before it moves it:

- `fly-4b-first-run`: "the owner's act" (3480). It gets `needs-owner` then.
- `fly-6-after-seven-days`: "7 days after fly-4b-first-run" (3484). A hold then.
- `bk-7-read-after-two-days`: "and then two days" (4226); the spec has it held for two days after `bk-6`.
- `ac-5-prose-names-the-two-shapes`: "and one writer at a time in SKILL.md" (4242), which names no
  issue. `bk-6` and `tr-3-briefs-and-queue` both write that file.

## Left as they were

- `ta-1c-parent-revoke-on-cb4`, at `open`, a `triage` entry of the queue. Its hold (2896): "It is
  put to him with needs-owner when ta-6 is done". `ta-6` is done. Not labeled here: the task names
  two issues for the label, the body of `ta-1c` says "It is not asked of him yet", the act it asks
  for ends the token of every agent that runs, and `ta-6` passed with one of its checks not passing
  (the reason of event 4012). Whether and when it is put to him is the orchestrating session's.
- `ap-5-panel-approved-for-you`, `ap-6-rules-and-live-step`, `decision-comment-names-what-is-added`.
  Every issue their `held:` comments name is `done` (`ap-4-policy-v3`, `ap-2-brief-and-shadow-step`,
  `rules-md-owners-word-not-secrets`, `wt-5-docs`, `owner-decisions-written-dense`; `snapshot` at
  event 5023). They wait for nothing the record names and are `ready` entries of the queue.
  `ap-5` deploys `brain-x-issues`, the seed `ac-2` is in and `tr-1` waits for; nobody has written an
  order between `ap-5` and those two, and none is written here.
- `ac-2-tracker-lists-say-more`: its hold ended with `bk-3`, and its writer started it at event 5028.
- The `held:` comments themselves. They stay in the record; nothing takes a comment off.
- Six `feedback` issues have a comment that begins `held` (`seen-reviewer-brief-spec-section-gaps`,
  `seen-never-crossed-on-chat-word`, `seen-briefs-change-under-a-writer`,
  `seen-cellwise-placeholder-numbers`, `seen-main-checkout-edited-outside-lock`,
  `seen-tool-tests-time-out-under-load`). The spec's count left feedback out, and so did this.

## The confirmation

The count of the task is `waiting` of the queue. Before, `ia "queue"` at 23:02:51, event 5014:

```
queue 31    {"ready":22,"triage":4,"start":4,"review":1}
waiting 28  {"parts":14,"after":8,"work":5,"owner":1}
```

After the last write (event 5119), `ia "queue"` at 23:12:06, `seq` 5119:

```
queue 16    {"review":2,"triage":4,"ready":5,"start":5}
waiting 47  {"parts":14,"owner":2,"until":4,"after":21,"work":6}
```

- **`after`, 21.** 11 of the 13 links of this task, each with `on` the issue of the table above.
  The other 10 are not this task's: the 8 of before (`pm-4`, `sd-2` to `sd-4`, `tr-2` to `tr-5`) and
  two the orchestrating session wrote at events 5072 and 5074.
- **The two that are not there**, `fly-2-image-and-run-sh` and `fly-3-brain-fly-service`: `fly-1-by-hand`
  passed its review at event 5106 (23:11:31), 49 s after their links were written. Both are in
  `queue` with `do` `start`. The link ended and nothing was written for it: the queue read it.
- **`until`, 4**: the four holds, each with its `until`.
- **`owner`, 2**: `cu-1-deployer-gains-billing-read` and `ds-ingestion-tail-to-analytics-engine`.
  The one of before, `dense-rule-says-what-project-is-for`, was approved at event 5026.
- **`ready` entries of `queue`, 22 before and 5 after.** The 5: `ap-5`, `ap-6`,
  `decision-comment-names-what-is-added` (above), and two issues opened at events 5061 and 5063.
- `ia "list?state=ready&limit=100"`, 23:12:06: 13 issues. Each is placed as the row of the spec for
  R3 says: the 7 with an `after` link to an open issue are in `waiting` with `why` `after`; `ap-3-trial`,
  with a hold, `why` `until`; the 5 with neither (`fly-2` and `fly-3` among them, their link ended)
  are in `queue` with `do` `start`.
- `ia "list?link=fly-1-by-hand"`, 23:12:06 (the row of R1 for this task): five ids, `fly-3-brain-fly-service`
  and `fly-2-image-and-run-sh` among them.
- `ia "verify?guards=true"`, 23:12:10: `{"ok":true,"seq":5119,…,"checked":5119,"guards":true}`.

`tests/tools/suite.sh` in the worktree, 23:14:06 to 23:16:05, after the edit of the spec and before this
paragraph was written: `767 pass`, `0 fail`, `Ran 767 tests across 81 files. [118.40s]`. The last six
lines of its output were read, so a `skipped:` line above them was not looked for. No test was
added: the task ends with this record and the count above (`rules.md`, Never, the last item).

## For the orchestrating session

- `fly-2` and `fly-3` are `start` entries now. The hold of `fly-3` (3476) reads "a result of T1 that
  breaks a part of the design is a comment on the project before the tasks after it", and comment
  5040 on `worker-machine-on-fly` is that comment: four results "that touch the design, before T2".
  Nothing in the record holds the two for it.
- `cu-2-usage-service` is at `ready`. When `cu-1` is done it is a `start`; its hold (3468) also
  names the token `loop-usage`, "made when cu-1 is done", which is made before the spawn. The reason
  of its `ready` move says so.
- `ap-3-trial` and `os-5-trial-read` come back as `look` at 23:11 on 2026-10-13 and `wt-6-check-after-a-day`
  at 22:09 that day, each with the command in its reason.

## Read before the act

The Brain, three searches with `loop-knowledge` (`knowledge.search?semantic=true`), before the
`start` move: "holds become after links hold until a time needs-owner", "an act on cb4 with no seed
confirmation is the count record", "five sent-back rounds trial read count command". The first
answered the spec of this task (score 0.71); the others `doc:cloud-brain-record-checked-by-review-alone`
and `doc:cloud-brain-tracker-trigger-rules` first. Nothing beside the spec was used. Read for the
calls: the rows `issue.hold` and `issue.queue` of `tools/cloud-brain/brain-issues.ojs`, the records of
`bk-1` and `bk-3`, and for the three counts the specs of their tasks
(`plan/cloud-brain-deploy-verdict-from-a-shared-page.md`, `plan/cloud-brain-loop-order-of-service.md`,
`plan/cloud-brain-worktree-per-topic.md`).

## Not tried, not known

- No hold was seen to come back: the first ends at 22:09 on 2026-10-13.
- A link was seen to end once, for `fly-2` and `fly-3`. No session was seen to act on a `start`
  that came from one.
- Whether the owner leaves the label on the two.
- A wait written where the scan does not read: a comment that does not begin `held`, an issue's
  body, a comment on a project. `tr-1` was found by reading the reasons of two other issues.
- What the page's panel draws of the 13 links and the 4 holds. No page was opened.
- The four that stay at `triaged` behind a link: nothing but the `held:` comment says what to do
  with each when its link ends.
