# The issue workflow, reviewed against its own record

Written 2026-10-11 10:59 CEST. For the issues `review-the-default-workflow` (event 377) and
`link-issues-with-a-common-cause` (event 399). The design that came out of it is in
`plan/cloud-brain-issues.md`, "Amended 2026-10-11". This file is the evidence.

Tom, 2026-10-11 08:42: "There are many trap states and things that do not make sense in paractice.
We should review all the items and see if they made sense and suggest a new default workflow that
works better." And later that morning, with the nine feedback tickets of 10:11 unconnected:
"lets try to fix both those issues with a review of the whole issues workflow. Remember we want a
system that self adapt and gets better over time, at the moment the system is quite ineffecient. I
think if an agent has spare context left and it already knows how to fix an issue it should jsut do
it as a quick win while it is there. I think we need something consolodating isolated issues into
one larger set of gather  requirements for a large reenginneing project".

## What was read

`issue.sync?after=0` and `?after=200` with the token `issues-implementer-2`, after event 399 (10:42): 399 events,
61 issues, 57 of them not test data (4 are `test-…`, one of those hidden). Events 1 to 399 cover
2026-10-10 11:53 to 2026-10-11 10:42 CEST. 43 of the 57 were opened on the first day.

The counts below are printed by `bun tools/cloud-brain/issue-stats.ts` (written for this review, so
the next one is one command). At 10:57 the record had 406 events and the same shape.

## Where the 57 are

| | issues |
|---|---|
| done, passed at the first review | 14 |
| done after being sent back (1, 2 or 4 times) | 8 |
| rejected after triage or by the owner | 5 |
| filed by an agent and rejected within 2 minutes | 4 |
| waiting for the owner under `needs-owner` | 12 |
| feedback, open (the nine `seen-…` of 10:11 on 2026-10-11) | 9 |
| open or triaged, not started | 4 |
| in-progress with no agent on it | 1 |

22 done of 57 in 23 hours, of which the loop ran about 5.5.

## Where the time went

Time in a state before the move out of it (an issue still in a state is not in these rows):

| state | stays | median | total | longest |
|---|---|---|---|---|
| open | 45 | 1.7 min | 35.6 h | 8.9 h |
| triaged | 31 | 0.0 min | 4.1 h | 1.6 h |
| ready | 25 | 2.4 min | 7.7 h | 3.5 h |
| in-progress | 37 | 6.6 min | 4.4 h | 0.3 h |
| in-review | 37 | 5.8 min | 4.7 h | 0.4 h |

The work is short: a writer's round is 6.6 minutes at the median and a review 5.8. What is long is
before the work and beside it. A done issue took 0.9 h at the median from opened to done, and its
two rounds of work about 12 minutes of that.

`triaged` has a median of 0.0 minutes: 31 stays, and in the usual case the same token made `triage`
and `ready` in one breath. As a state it holds only what waits for the owner or for a child.

## The traps, each with the event that met it

**1. `needs-owner` is a label with no move that takes it away.** 20 of 57 issues got it. Of those, 4
were done and 4 rejected; 12 are open with it now, ten of them idle 13.6 to 16.0 hours (`ndd66a518`,
opened by the owner, 16.0 h at `ready`) and two for 1.2 and 2.1. The label is still on 6 issues
that are done or rejected.
The loop's token took it off twice at the owner's word given in chat (events 88, 107), which an
overseer filed as a breach (`loop-removes-needs-owner`). What the 12 wait for:

| what only the owner can give | issues |
|---|---|
| a policy install | `ndd66a518`, `in-progress-no-way-back`, `move-onto-closed-issue-is-taken` |
| a word on a rule of the loop | `loop-removes-needs-owner`, `rules-never-line-added-unapproved` |
| a plan to approve before building | `n9e1c1256` |
| a deploy of the kernel, core or deployer, or a change to the channel server | `eval-code-cuts-long-return`, `deployer-put-back-issues-worker`, `verify-in-hidden-tab-fails-tests`, `tests-replace-console-log` |
| nothing any more: he answered in the session and the work is deployed | `reference-holes-four-more-workers` |
| a publish rule since loosened | `digest-2026-10-11` |

Three of the twelve are one install. One is stale: the answer was given outside the tracker and
nothing in the tracker heard it.

**2. `in-progress` had one move out, `submit`.** `tests-replace-console-log` was started, found to
need the owner, and could not go back (event 316). `brain-tests-fail-headless-unread` is its parent:
its work landed, its submit is refused while that child is open (403 at event 296), so it has sat
`in-progress` for 14.3 h with nothing to do.

**3. A parent is set at `open` and never again, and it blocks.** `ready` and `submit` both need
`issue.children.open == 0`. A writer that files a follow-up as a child holds its own issue (trap 2),
so the brief tells writers to leave `parent` out, and then nothing joins a follow-up to what it
follows. No call takes a parent off (event 296: "the tracker has no call that takes a parent off").

**4. Nothing joins two issues after they exist.** The nine `seen-…` tickets: five are about the
tests that run after a deploy, and say so only in prose. `two-workers-put-back-on-one-test` held two
causes. The overseer's twelve issues name the reports they came from in their bodies; no query finds
them. From 2026-10-11 the deployer opens one issue for each failed hash, so one flaky test on five
versions is five issues with nothing between them.

**5. An answered question could only be `rejected`.** `who-deploys-a-cloudflare-service`: the owner
answered yes; the one closing move from `open` was `reject` (event 376). The record says the
opposite of what happened.

**6. A move onto a closed issue was taken.** `owner-reject` had `from: "*"`: a second reject of a
rejected issue wrote a second event (measured in a rig, `move-onto-closed-issue-is-taken`).

**7. A reject names what would reopen it, and nothing reopens.** Triage writes "what evidence would
reopen it" in each reject reason (SKILL.md). The workflow had no move out of `rejected`.

**8. Feedback had `open → closed` with no word on what became of it.** Nine are open; closing one
said nothing of whether it was gathered into work or dropped.

**9. Five moves and two agents for any change, whatever its size.** Every done issue's path starts
`triage, ready, start, submit`. A round of one writer and one reviewer was 167,000 to 266,000
tokens, the lowest for a one-line doc change (SKILL.md, Runs). `spec-not-done-rebuild-line-stale`:
94,106 and 72,754 tokens to mark six lines stale (oversight of 19:46). The writer that found the
stale line had it open and could not fix it there: it was not its issue.

**10. Four issues were rejected by triage in under two minutes of being filed**, three by a reviewer
and one by the deployer (a test of that morning). The reviewer saw something real and small; the only thing it could do was file,
and the only thing triage could do with a defect nobody had met was reject.

**11. 15 of 37 submits were sent back.** 14 of 22 done issues passed first time; 8 took 1, 2 or 4
more rounds. `owner-session-file-is-present`: three rounds, about 620,000 tokens, one finding a
round, all in one function. Not a fault of the workflow's states. Not addressed here; it is the
largest cost that is left.

## The four the issue named that are not among the eleven

The issue's body listed nine traps to start from. Five are above. These four were left out of the
first writing of this file (review at event 466) and are decided here.

**12. A `major` change is deployed before the owner approves it.** `submit` needs a ref, and for a
seed the ref is a deploy, so `awaiting-approval` approves what already runs. Not changed. The plan
at triage is where the owner stops a `major` change (`SKILL.md`, Triage: the labels `major` and
`needs-owner` together, and he takes the second off to let it be built); the approval afterwards is
of a change he already let through. What the task workflow lacks is a `send-back` from
`awaiting-approval` such as the project workflow has: the owner can approve or reject, not ask for
more. That is one move in a next install, not made today: one install in a day, and no issue has
met it.

**13. A doc-only change had to name a test file to submit.** That is a brief's rule
(`agents/implementer.md`, "The tracker's write calls": "A change with no seed and no local tool in it (a doc alone) still needs a count for the submit"), not the workflow's: the `submit` guard asks for one ref of any
kind. Not changed here. The overseer has two mentions of tests that assert a doc's phrases
(`oversight.md`); a third is its to act on.

**14. The one who files also triages and starts** (events 343 to 350, inside 66 s). Decided the
other way, by the owner's words of 2026-10-11 ("if an agent has spare context left and it already
knows how to fix an issue it should jsut do it"): `start` from `open` is now the workflow's own
move. What is kept between a writer and its own work is the review: `submit` is the writer's, and
neither the review nor the pass can be (the guards `caller.actor != issue.by.start`). The quick
start is refused for an issue labeled `major` or `needs-owner`.

**15. `test-escalated` is hidden and nobody can end it.** It is test data of 2026-10-10 on the
security workflow, read by the owner present and its opener only, so no token of the loop sees its
title or can move it. Not changed: it is one press of the owner's (reject, in the panel). It is in
no count here.

## Each state and move that was kept

| kept | why |
|---|---|
| `open`, `triaged`, `ready` | `triaged` holds what waits for the owner with a plan; `ready` is the queue a writer is spawned from. Their median stays are 0.0 and 2.4 minutes, so neither costs time when nothing waits. |
| `in-progress`, `in-review` | The two states where work is done; the writer and the reviewer are told apart by them. `in-review` has no move out but a review's: a reviewer is spawned for every issue there, and 37 of 37 got one. |
| `awaiting-approval` | Met once (`review-fixes-13`, 13.6 minutes). Kept for `major`; see 12. |
| `done`, `rejected`, `reverted` | `reverted` has no move out and has never been used: a reverted change that is wanted again is a new issue. |
| `triage`, `ready`, `submit`, `pass`, `rework`, `to-approval`, `approve` | Each was used as written (the path letters below) and no trap was traced to its guard. |
| `revert` | Not used: 0 `revert` moves in events 1 to 588 (the count of the review at event 595). Kept because it is the only move out of `done`, and the one way the record can say that a change which passed review was taken back. Its guard is `caller.present && event.reason != "" && size(event.refs) > 0`: the owner, with why and the commit that took it back. Without it a reverted change reads `done`. The module's rig makes the move (`test_issues_default_policy_review_approval_and_children`: 403 for a token, 200 for the owner present); cb4 never has. |
| swap `escalate` (task to security), swap `promote` (feedback to task) | `escalate` was used once, on test data. `promote` has not been used; kept because the overseer's brief names it for the owner's own feedback. |

## What did work

- No done issue was reverted. No review was passed by its own writer; the guard refused each try.
- 14 of 22 passed first time.
- The reject-at-triage rule (`4b701ac1`) kept 4 unreproduced defects from costing a round each.

## One row an issue

Path letters: T triage, R ready, S start, U submit, W rework (sent back), P pass, X reject,
A to-approval, O approve. `seq` is the event that opened it.

| seq | issue | kind | opened by | path | where it is |
|---|---|---|---|---|---|
| 19 | `review-fixes-13` | task | owner | TRSUAO | done, first pass |
| 27 | `review-fixes-2` | task | implementer-2 | TRSUWUWUWUWUP | done, sent back 4x |
| 47 | `install-lost-view-bad-policy` | bug | implementer-2 | TRSUP | done, first pass |
| 49 | `rebuild-not-atomic` | bug | implementer-2 | TRSUP | done, first pass |
| 50 | `migrate-cut-short` | bug | implementer-2 | TX | rejected by owner, after needs-owner |
| 51 | `replay-names-no-code-version` | bug | implementer-2 | TX | rejected by implementer-2, after needs-owner |
| 52 | `policy-event-no-reason` | bug | implementer-2 | TRSUP | done, first pass |
| 53 | `owner-session-file-is-present` | bug | implementer-2 | TRSUWUWUP | done, sent back 2x |
| 54 | `headless-harness-cel` | bug | implementer-2 | TRSUWUWUP | done, sent back 2x |
| 77 | `ndd66a518` | bug | owner | TR | waits for the owner at ready, idle 16.0 h |
| 84 | `install-reason-unreadable` | bug | overseer-1 | TRSUP | done, first pass |
| 92 | `headless-harness-foreign-values` | bug | reviewer-2 | TX | rejected by owner, after needs-owner |
| 99 | `n1c3997b1` | bug | owner | TRSUP | done, first pass |
| 119 | `panel-shows-no-policy-reason` | bug | reviewer-2 | TRSUWUP | done, sent back 1x |
| 139 | `loop-removes-needs-owner` | task | overseer-1 | T | waits for the owner at triaged, idle 14.3 h |
| 140 | `lope-tests-throw-reads-timeout` | bug | overseer-1 | TRSUWUP | done, sent back 1x |
| 155 | `n39625a1a` | bug | owner | T | triaged, idle 15.5 h |
| 158 | `rebuild-partial-view-past-297` | bug | reviewer-2 | TX | rejected by implementer-2, after needs-owner |
| 166 | `n9e1c1256` | bug | owner | T | waits for the owner at triaged, idle 15.5 h |
| 167 | `spec-not-done-rebuild-line-stale` | task | overseer-1 | TRSUP | done, first pass |
| 170 | `panel-for-your-attention` | task | implementer-2 | TRSUWUWUP | done, sent back 2x |
| 180 | `page-not-redeployed` | bug | implementer-2 | TRSUP | done, first pass |
| 216 | `eval-code-cuts-long-return` | bug | overseer-1 | T | waits for the owner at triaged, idle 13.9 h |
| 222 | `deployer-put-back-issues-worker` | bug | implementer-2 | TR | waits for the owner at ready, idle 13.9 h |
| 229 | `stale-panel-after-deploy` | bug | reviewer-2 | TRSUWUWUP | done, sent back 2x |
| 234 | `doc-example-mints-tracker-token` | bug | reviewer-2 | TRSUWUP | done, sent back 1x |
| 235 | `bun-test-root-spawn-ebadf` | bug | reviewer-2 | X | rejected 30 s after it was filed by reviewer-2 |
| 261 | `rules-never-line-added-unapproved` | task | overseer-1 | T | waits for the owner at triaged, idle 14.3 h |
| 262 | `worktree-rebase-and-state-gaps` | task | overseer-1 | TRSUP | done, first pass |
| 263 | `brain-tests-fail-headless-unread` | task | overseer-1 | TRS | in-progress with no agent, idle 14.0 h |
| 281 | `move-onto-closed-issue-is-taken` | bug | reviewer-2 | T | waits for the owner at triaged, idle 14.1 h |
| 289 | `worktree-rebase-exit-0-when-main-moved` | task | reviewer-2 | X | rejected 28 s after it was filed by reviewer-2 |
| 291 | `browser-run-timeout-test-wall-clock` | task | implementer-2 | TRSUP | done, first pass |
| 292 | `tests-replace-console-log` | task | implementer-2 | TRS | waits for the owner at in-progress, idle 13.6 h |
| 293 | `bluesky-tick-poll-test-no-overlap` | task | implementer-2 | TRSUP | done, first pass |
| 303 | `verify-in-hidden-tab-fails-tests` | bug | reviewer-2 | T | waits for the owner at triaged, idle 14.0 h |
| 324 | `browser-run-bound-loose-under-load` | task | reviewer-2 | X | rejected 33 s after it was filed by reviewer-2 |
| 327 | `in-progress-no-way-back` | task | overseer-1 | T | waits for the owner at triaged, idle 13.6 h |
| 328 | `seen-json-6-of-19-workers` | task | overseer-1 | TRSUP | done, first pass |
| 343 | `reference-shows-template-holes` | bug | implementer-2 | TRSUP | done, first pass |
| 345 | `git-reference-shows-template-holes` | bug | implementer-2 | TRSUP | done, first pass |
| 367 | `who-deploys-a-cloudflare-service` | task | overseer-1 | X | rejected by implementer-2 |
| 368 | `reference-holes-four-more-workers` | bug | overseer-1 | T | waits for the owner at triaged, idle 2.1 h |
| 374 | `two-workers-put-back-on-one-test` | bug | implementer-2 | - | open, idle 1.5 h |
| 377 | `review-the-default-workflow` | task | implementer-2 | - | open, idle 2.0 h |
| 379 | `digest-2026-10-11` | task | snapshot | TRS | waits for the owner at in-progress, idle 1.2 h |
| 381 | `fix-tests-brain-x-verifycheck-319604f7` | bug | deployer | X | rejected 10 s after it was filed by deployer |
| 390 | `seen-a-guess-reported-as-a-cause` | feedback | implementer-2 | - | feedback, open |
| 391 | `seen-a-small-either-or-put-to-the-owner` | feedback | implementer-2 | - | feedback, open |
| 392 | `seen-every-test-runs-at-once` | feedback | implementer-2 | - | feedback, open |
| 393 | `seen-flaky-timing-tests` | feedback | implementer-2 | - | feedback, open |
| 394 | `seen-no-outside-reading-on-flakiness` | feedback | implementer-2 | - | feedback, open |
| 395 | `seen-no-record-of-test-runs` | feedback | implementer-2 | - | feedback, open |
| 396 | `seen-sweep-outlasts-its-call` | feedback | implementer-2 | - | feedback, open |
| 397 | `seen-tests-swap-console-log` | feedback | implementer-2 | - | feedback, open |
| 398 | `seen-two-chrome-versions` | feedback | implementer-2 | - | feedback, open |
| 399 | `link-issues-with-a-common-cause` | task | implementer-2 | - | open, idle 0.0 h |

## Outside reading

Line 7 of `philosophy.md` asks for it before a design. Two searches, 2026-10-11:

- Link types. A study of 15 public Jira repositories found 75 link types in use and grouped them
  into five: general relation, duplication, composition, temporal or causal, workflow
  ([Lüders et al., "Beyond Duplicates", arXiv 2204.12893](https://arxiv.org/abs/2204.12893)). Jira's
  defaults are Duplicate, Relate, Block and Subtask; Yandex Tracker and Zoho have the same four with
  other names ([Yandex](https://cloud.yandex.com/docs/tracker/user/links),
  [Zoho](https://www.zoho.com/projects/help/link-bugs.html)). Parent and child is kept apart from
  links in each of them. Taken: one of each group that the record showed a need for, `related`,
  `duplicate`, `part-of` (composition, as the parent), `cause`. Not taken: `blocks`. A part already
  holds its parent, and nothing in the 57 issues was held by an issue that was not its part.
- Waiting against working. Flow efficiency is touch time over touch plus wait; practitioners report
  5 to 25 percent as usual ([CodeSignal](https://codesignal.com/learn/courses/kanban-and-flow-optimization/lessons/advanced-flow-analytics),
  a rule of thumb and not a study). Here: about 9.1 h in `in-progress` and `in-review` against 47.4 h
  in `open`, `triaged` and `ready`, 16 percent, before counting what still waits. A study of 8,000
  items over four years in one company found work in progress correlates with lead time and gave no
  optimal limit ([SINTEF](https://www.sintef.no/en/publications/publication/1637884/)). Read from
  search summaries; the papers themselves were not opened.

## Corrected the same day

The first count here left out `tests-replace-console-log`: the script dropped ids that begin with
`test`, and four are test data, not five. Found by the fresh review the same morning. The counts above are
with it: 57 issues, 20 that got `needs-owner`, 12 waiting. `issue-stats.ts` had the same filter and
is corrected to `test-`.

## Not done

- `close` from `in-progress` is any token's, with a reason: another token can close a writer's live
  work, and a writer can close in place of a review. Left: the reason is in the record and the
  issue opens again with `reopen`. Narrow it to `issue.by.start` if it is misused.
- Taking a part off its parent (`issue.link`, `part-of`, `remove`) lifts the parent's
  `issue.children.open == 0`. The loop's token did it once, at event 515, to free
  `brain-tests-fail-headless-unread`. The owner, 2026-10-11 12:05 CEST, asked whether it should be his alone or the loop's with a reason on record: "its fine". So it is the loop's, and the reason goes in the move or comment that follows it.

- Trap 11, rounds of rework, is measured and not changed.
- `needs-owner` stays a label. What changed is that three of its twelve end with one install, and
  that an agent can `close` an issue the owner answered in a session, with his words as the reason.
- The numbers are of one Brain over two days with one owner.

## Round 3, 2026-10-11: a migration took off links it had no reason to

The review at event 595 found that the link drop of `513f4fcb` also runs inside an install. A
`migrate` swaps its issues one at a time, so of two linked issues of one workflow the first is on
the new `read` guard while the second is still on the old one, and the swap drops their link from
both. After the second swap both are read by one rule and neither names the other. The reviewer's
probe (event 597): `x1 related x2`, an install with `task.read` changed, `moved ["x1","x2"]`,
`links []` and `linked []` after. cb4's 14 links were not touched: the install of event 483 changed
no `read` guard and was made before that code ran.

**What changed.** `issueApply` is as it was: a swap drops the links of its issue to every issue
then read by another rule. `issue.install` now reads the links of each issue before and after its
swap, keeps what the swap took off, and after each swap tries to write again every kept link that
names the issue just moved. The write is an ordinary link event, keyed `policy/<seq>/link/<n>` and
judged by `issueAllowed` as any `issue.link` of the caller's, so it is refused while the two ends
are read by different rules and taken once they are not. The answer has two more lists:
`relinked`, `[{ id, rel, to }]`, and `unlinked`, `[{ id, rel, to, why }]`, the links that stayed
off with the last refusal. The answer of an install sent again has both, empty.

**The other way, and why not.** The reviewer offered two: compare the rule each end will have
once the swaps are done, or put the link back when the second end lands. The first needs the
`migrate` in the policy event, so that `issueApply` can know where the other end goes, and then
keeps the link on a promise. Three things in the seed break the promise:

- `S.onWorkflow` selects `closed = 0`: a closed issue is not moved, and stays read by the old rule.
- An open issue that is moved or closed between the plan and its swap is `left`
  ("the issue is no longer where this swap takes it from"), and an install can be cut short.
- With a `migrate` of A to B and B to C in one install, an issue on B has either arrived or is
  still to go, and the view does not say which.

In each the link would stay between two issues read by different rules, with no later event to
judge it again. Putting back never has a link there: it is off from the first swap until the
write that the link guard allows. The cost is one event a link put back, and the seconds of the
install in which the link is absent.

**The test.** `test_issues_migration_puts_back_links_under_one_rule`: four links, an install that
gives the task and the feedback workflows one new `read` guard. Two are put back (two tasks; a
feedback and a task), two stay off with "the two issues are not read by the same rule" (a task
closed before the install, which is not moved; a project, whose workflow did not change). A second
install that changes `comment` and no `read` puts nothing back and drops nothing. Then
`issue.rebuild` gives the same six issues and `verify?guards=true` is ok.

Run in the worktree at 14:21 CEST, `bun test.ts brain-x-issues --with <the built module>` in
`cloud-brain-dev`, against the other modules as cb4 runs them:

```
the seed as committed                   passed 14  failed 0  needsBrowser 8
the same file with the put-back cut out passed 13  failed 1  needsBrowser 8
  FAIL test_issues_migration_puts_back_links_under_one_rule
  - ["{id:f1,rel:duplicate,to:x2}", "{id:x1,rel:related,to:x2}"]   + []
```

In a QA tab (Chrome 151, 14:22:13) on the notebook built from that commit, each `test_*` cell of
the module observed from a module of its own: 22 of 22, none failed. That is 14 and the 8 that need a browser.

**Also in this round.** The row of the kept table that said `revert` "was used as written" was
false and is replaced by a row of its own. Trap 13 named step 6 of the implementer brief; the rule
on a doc alone is under "The tracker's write calls" there.

**Not tried.**

- No install, swap or link was sent to cb4. The put-back has run in the module's rig only.
- A caller taking a link off by `issue.link` in the moment between the install's read before a
  swap and its read after: the install would count that link as dropped by the swap and write it
  again. Not tested and not guarded.
- An install cut short between a swap and its put-back leaves that link off. The owner's own swaps
  finish the migration (the reference says so); they do not put a link back, and no test covers it.
- `unlinked` carries the refusal of the last try, which the test reads only as "not read by the
  same rule". A link guard that refuses the owner present was not tried.
- Nothing shows `relinked` or `unlinked` but the answer of the call: the seed has no control that sends an install.

