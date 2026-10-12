# record-names-token-not-agent: the checks of R1, R2 and the parent

Task 6 of `plan/cloud-brain-record-names-token-not-agent.md` (issue `ta-6-checks-after-three-issues`).
Read from cb4's tracker on 2026-10-12 at 12:20:57 CEST (`date`), when its last event was 3988
(written 12:20:56 CEST, its `at`). A count below is of the record to event 3988 and is made
again with `--until 3988`, unless it names another event.

**The first check of R1 does not pass.** `issues-implementer-2` wrote 20 events after the first
round on the new tokens, the last at 12:18:25 CEST on 2026-10-12, two and a half minutes before
the read. The spec has the owner revoke the three role tokens when this check has passed; it has
not.

| Check | Result |
|---|---|
| R1, first: no holder beside two agents, no old role token after N | **fails** on the second half: 20 events of `issues-implementer-2`. The first half holds: 0 of 56 tokens are beside two agents |
| R1, second: a session outside the loop writes as `out-…` | **not seen**: 0 holders start `out-` |
| R1, third: every agent's holder is the `token` of a cost line | **fails as written**: 35 of 126 holders are on none. 29 are reviewers of before the reviewer's line had the field, 5 are overseers, whose runs have no cost line, 1 was 1 event old. The half that reads `agent-token list` was not run |
| R2, first: a revoked child is 401, then exit 2 | not run by this task; `ta-1b` ran it four times on 2026-10-11 |
| R2, second: a revoked role token is 401 | not run: the owner has not revoked |
| the parent: `secret:loop-agents` wrote nothing | **passes**: 0 events of 3988 |

## The tool

The checks of R1 and the parent are `tools/cloud-brain/token-checks.ts`, written with this task so
that the first check can be made again before the revoke. It reads `issue.sync` through
`issue-as.sh` with the caller's token and exits 1 while the first check, the third or the parent's
fails. `tests/tools/token-checks.test.ts` holds it on lists of events written in the test.

```
$ bun tools/cloud-brain/token-checks.ts --token impl-c49ff3 --until 3988
read 3988 events to 3988; N = 2666 (the first start by an impl- token on an issue is 2667, os-1-owner-label, impl-4e8be2)
R1, first check: FAIL
  56 tokens beside an agent in a cost line; beside two agents: 0; agents beside two tokens: 0; tokens on a line with no agent: 35
  issues-implementer-2: 20 events after N, 2682 to 3962, keys {"impl":11,"orch2":9}
  issues-reviewer-2: 0 events after N
  issues-overseer-1: 0 events after N
R1, second check: not seen; 0 holders that start out-
R1, third check: FAIL, of what the record has (the live children are agent-token list's)
  126 holders after N that start impl-, rev-, spec-, over- or dig-; 91 are the token of a cost line an orch- token wrote; 35 are not
    … 35 lines, below …
  cost lines: 858, 121 with a token, by the writer's role {"orch":94,"impl":27}; the first that names a token of a role {"impl":2714,"spec":2745,"rev":3529,"dig":3796}
  orch-d97e0e: 445 events, 2668 to 3988; wrote 128 cost lines; the session of those with an agent {"f501a8e8-b922-4e11-a581-2b725efd6272":62}
the parent: pass; secret:loop-agents wrote 0 events after N, 0 in all
exit 1
```

The tests, run in the worktree on 2026-10-12:

```
$ bun test ./tests/tools/token-checks.test.ts
 9 pass
 0 fail
 34 expect() calls
$ bun test ./tests/tools/token-checks.test.ts      # with tools/cloud-brain/token-checks.ts moved away
 0 pass
 1 fail
 1 error                                           # the import of the tool fails; no assertion ran
$ tests/tools/suite.sh
 598 pass
 0 fail
Ran 598 tests across 62 files.                     # 12:34:56 CEST (`date`), after the rebase that brought in ta-5's test file
```

## N

The spec's N is "the event before the first round on the new tokens". Taken here as 2666: event
2667 is the first `start` by an `impl-` holder on an issue that is not one of `ta-1b`'s two
`r6-check-` issues (`os-1-owner-label`, 2026-10-11 22:33:51 CEST).

The other reading is 1979, the event before the first event of any new token (1980, 20:52:16 CEST,
the R6 check of `ta-1b`). The loop was still on the role tokens between the two: task 3, which
gives each agent its token, was approved at event 2609 (22:29:21 CEST). With that N the three
counts are 478, 103 and 48, and say nothing of the new routine:

```
$ bun tools/cloud-brain/token-checks.ts --token impl-c49ff3 --until 3988 --after 1979
  issues-implementer-2: 478 events after N, 1996 to 3962, keys {"impl":170,"att":1,"open":3,"link":3,"lost":3,"cost":82,"orch":175,"spec":18,"orch2":20,"gi1":3}
  issues-reviewer-2: 103 events after N, 2049 to 2665, keys {"rev":103}
  issues-overseer-1: 48 events after N, 2152 to 2563, keys {"over":48}
```

The verdict of the first check is the same with either: event 3962 is after both.

## R1, first check: the 20 events

`keys` counts each event's key by its first part. The 20, from
`jq -r 'select(.seq>2666 and .seq<=3988 and .by.holder=="secret:issues-implementer-2")|[.seq,.type,.move//"",.key]|@tsv'`
over the events read:

| Events | Keys | What |
|---|---|---|
| 2682 to 2696 but 2695: 11 events, 22:36:43 to 22:42:46 CEST on 2026-10-11 | `impl/<issue>/…` on `ow-2-panel-offers-what-it-shows`, `fb-a2b5yudl8s`, `tests-tools-fail-in-a-fresh-worktree`, `reviewer-brief-suite-skips` | comments, an attachment, an open, a link and three submits, in the nine minutes after the first start on a new token. The three issues submitted were each started with the role token before N (`start` at 2546, 2573 and 2619, each `secret:issues-implementer-2`), and only the starter submits |
| 2695, 2718, 2719 | `orch2/cloudflare-usage-read/open`, `orch2/topics/open`, `orch2/topics/members` | 2026-10-11, 22:42 to 22:50 CEST |
| 3524, 3525, 3526, 3549, 3550 | `orch2/priced-calls-of-the-day-used-up/…`, `orch2/day-count-not-one-row/open` | 2026-10-12 from 03:45:59 CEST: a comment, and the moves `ready`, `start` and `submit`. Already reported as `seen-outside-session-wrote-as-impl-2` (event 3567), whose body quotes event 3526: "Taken by a session outside the loop on the owner's word" |
| 3962 | `orch2/bookkeeping-in-the-tracker/open` | 2026-10-12 12:18:25 CEST |

So nine events with keys that begin `orch2/` were written with the writer's role token after
sessions had tokens of their own, the last on the day of this read. `rules.md`, "Always", gives a
key as `<role>/<issue id>/<what>`; `orch2` is no role there. Which session wrote them is not in the
record: that is what R1 is for.

`issues-reviewer-2` last wrote at 2665 and `issues-overseer-1` at 2563, both before N.

What a revoke now would do, not tried: the next call of that session with `issues-implementer-2`
is refused. The one issue it started, `priced-calls-of-the-day-used-up` (3526), was submitted at
3549 and passed at 3569, so no issue in the 20 events waits on that token for a submit.

The first half of the check: 56 tokens stand beside an agent id in a cost line, none beside two,
and no agent id beside two tokens. 35 more tokens are on a cost line that has no `agent`: each is a
`rev-` name, and each of those lines has a `session` of its own
(`jq -r 'select(.token and .session and (.agent|not))|[.session,.token]|@tsv' | sort -u | cut -f1 | uniq -d | wc -l`
over the cost lines: 0). The check as the spec words it reads `agent` only.

## R1, second check: no `out-` holder

No event in the record has a holder that starts `out-`. So no session outside the loop has made
itself a token and written with it, and the check has nothing to read. The nine `orch2/` events
above are the nearest thing: one of them says it is of a session outside the loop, and it wrote
with the role token. This task made no `out-` token to have one to see: a writer does not run
`brain.ts agent-token` (`agents/implementer.md`).

## R1, third check: 35 holders on no cost line

A cost line here is a `cost` event (since event 2953) or a comment with a key that begins `cost`
and a body `cost {json}` (the form before it): 858 in the record, 121 with a `token`.

The 35 holders of the 126 that are the token of no cost line written with an `orch-` token:

| Holders | Why they are on none |
|---|---|
| 29 `rev-` names, each with 2 or 3 events between 2697 and 3511 | the first cost line that names a `rev-` token is event 3529. The tool prints for each "its last event is before 3529, the first line that names one" |
| 5 `over-` names: `over-0f9d2c` (14 events), `over-9c5aaa` (4), `over-19f89b` (5), `over-9a80e6` (13), `over-10838d` (22) | no cost line names an `over-` token. The roles of the cost lines after N are `implementer`, `reviewer`, `spec-writer`, `digest` and `paper-summarizer` (`jq -r 'select(.seq>2666)|.role' \| sort \| uniq -c` over them), so an overseer's run has no line at all |
| `spec-8717a9`, 1 event, 3987 | written about a minute before the read. Six minutes later (12:26:45 CEST, the record at 3997) it was still on no line, with three more of the same kind: `impl-cdf92d`, `impl-148fcb` and this task's own `impl-c49ff3`, each 1 event old. Whether its run had ended is `agent-token list`'s to say |

So the check as written cannot pass on this record: the first two rows are 34 names that no later
event changes. Read for what it is meant to show, a writer that made itself a token, it found
none: every `impl-`, `spec-` and `dig-` holder but the four just started is on a line, and every
`rev-` holder since the reviewer's line gained the field is too.

Two things the check's words do not fit, both in the tool's output:

- 27 of the 121 lines with a token were written by an `impl-` token, not an `orch-` one. They are
  `cost` events
  (`jq -c 'select(.type=="cost" and .token and (.by.holder|test("impl-")))|.by.holder' | sort | uniq -c`:
  21 `secret:impl-b645a6`, 6 `secret:impl-b53276`). Why two writers wrote cost lines was not read.
  Counting them changes nothing: none of the 35 is on a line of any writer (the tool prints
  "on a line another writer wrote" for one that is, and for none here).
- `orch-d97e0e` wrote 445 events after N and 128 cost lines. The 62 of those with an `agent` all
  have the session `f501a8e8-b922-4e11-a581-2b725efd6272`. The spec has the overseer set that
  beside the token's note, which is in `agent-token list` and was not read. `orch-1c2ddc`, of the
  R6 checks, wrote nothing after N.

Not run: `brain.ts agent-token list`, the half of the check that reads the live children. It is
sent with the parent's secret, and the implementer's brief keeps `agent-token` from a writer. The
orchestrating session runs it: each line with one of the five prefixes is a name in the list
above, or a run that has not ended.

## R2

Neither check was run by this task.

- **A revoked child.** `brain.ts agent-token revoke` is the orchestrator's, and a child that is
  live is another agent's. `ta-1b-agent-token-on-cb4` ran the check on 2026-10-11 for four
  children it made: `tools/cloud-brain/records/ta-1-agent-token-command.md`, "Part two", has
  `401: "impl-4f0826" is revoked and its value is refused, on read 1 of issue.policy, 90 ms after the revoke`
  and then `issue-as.sh: no token named impl-4f0826 is kept; nothing was sent (exit 2)`, and the
  same for the other three. That is its writer's run, not mine.
- **A revoked role token.** `issue-as.sh issues-reviewer-2 "get?id=…"` answers 401 only after the
  owner's revoke. Event 3962 says `issues-implementer-2` was live at 12:18 CEST today. Nothing in
  the record says whether the other two are; they last wrote on 2026-10-11. A read with another
  role's token to find out is the mistake of `seen-writer-read-with-reviewer-token`, and was not sent.

## The parent

```
$ jq -c 'select(.by.holder=="secret:loop-agents")' events.jsonl | wc -l
       0
```

over the 3988 events, and the tool's last line. `ta-1b` counted the same 0 at event 2052.

## The three reports

Each of the reports the project gathered has a comment that names this file, written with
`impl-c49ff3` (the answers of `issue.comment`, 200 each):

| Report | Comment | Requirements |
|---|---|---|
| `seen-outside-session-overseer-token` | event 4002 | R1, R3 |
| `seen-writer-read-with-reviewer-token` | event 4003 | R2, R4 |
| `seen-by-hides-session-file-write` | event 4004 | R5, which has no check in this task |

Comment 4002 says "each over- name since is one overseer's". That goes further than what was read:
an overseer's run has no cost line, so nothing in the record sets an `over-` name beside an agent.
What was read is that five `over-` names wrote after N and `issues-overseer-1` did not.

## Not tried

- `brain.ts agent-token list`, and so the live children and the notes of the `orch-` names.
- Both checks of R2.
- The first check on a record where the `orch2/` session has stopped using the role token. The
  tool's exit is 1 until then for N = 2666, since the 20 events stay after N. A later N, chosen by
  whoever runs it (`--after 3962`), shows whether any has been written since: none was in the 36
  events from 3963 to 3998 (`--after 3962` printed `read 3998 events to 3998` and 0 for each of
  the three; 12:28:05 CEST, `date`).
- R3, R4, R5 and R6: tasks 1 to 5 have their checks.
- Who wrote the `orch2/` events.
