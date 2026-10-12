# approver-ts-review-notes-of-ap-1

Three notes of review 4154 of `ap-1-approver-tool`, each a defect of `tools/cloud-brain/approver.ts`
as `23f43b2a` has it. Written 2026-10-12 by a writer of the issue loop (`impl-0ba448`), round 1,
started at event 4170 (19:36:23 CEST by `date`). A local tool and its test: no seed, no deploy. The
commits are refs of the submit.

It lands before `ap-4-policy-v3`, whose file pins the tool by its blob. No policy on cb4 names a
delegation in an `approve` guard yet, so no `approve` has been sent by the tool, before or after.

## What changed

**1. A swap's new workflow is read.** `issueEvent` of `brain-issues.ojs` writes a `swapped` event
with the workflow the issue leaves as its own `workflow`, and the one it is on from then in
`to.workflow` (`base = { id, workflow: i.workflow }`, then `to: verdict.to`). `issueAt` of the tool
read the first and not the second, so an issue that the `migrate` of an install had moved was on the
old hash for the tool until its next event. The policy in force no longer has that hash, and
`approve` was exit 3, "names no delegation (no approve move)". One line after the state's:

```
if (e.type === "swapped" && e.to?.workflow) i.workflow = e.to.workflow;
```

`issueAt` is exported, for the test and for the run on cb4 below.

**2. A key another actor holds is not said to be approved.** The tracker answers a kept key with
its event to the actor that wrote it, and with `{ id, seq, duplicate: true }` to anyone else
(`wrote`, `brain-issues.ojs`). The tool read `duplicate` and not whose it was, and printed
`approved … (sent before; nothing new was written)` with exit 0 for both. With `duplicate` and no
`event` it is now exit 4, nothing on stdout (the judgment and the answer with `--json`), and:

```
approver.ts: no approve was made for task: the key approver/task/approve-1 is kept already as event 41, which another actor wrote. Read the issue
```

Exit 4 and not a new number: the header had 4 as "the tracker refused the move", and a caller that
stops on 4 stops here too. A kept key that answers its event (this actor's own repeat) is `sent
before` and exit 0, as it was. The `id` command of the same file already read an answer with no
event as a key another delegation holds, and tried the next key.

**3. `list --since` says when the hours were not read.** `Number("abc")` is `NaN`, `NaN > 0` is
false, and the span fell to 0, which lists every approve. When `--since` is given, its value is now
a number above 0 written in digits (`24`, `0.5`), or the tool is exit 2 before the record is read:

```
approver.ts: the hours of --since were not read ("abc"); nothing was listed
  --since=<hours> takes a number above 0, as 24 or 0.5; with no --since every approve is listed
```

`--since=0` was "everything" and is refused. The other side was to keep it as a way to say "all".
Line 3 of `philosophy.md` decided it (zero hours that lists every hour is a guess for the next
agent), and leaving the flag off still lists all. `1e2`, `Infinity`, `1h`, `-1`, an empty value, 400
digits (a number that is no span of time) and a `--since` with nothing or another flag after it are
refused the same way.

The header of the tool has each of the three where it describes the command.

## The tests

`tests/tools/approver.test.ts`, three tests added (27 in the file, 24 before):

- `a swap: …`: a `policy` event whose `task` workflow has a new hash, then a `swapped` event of the
  issue as `issue.install` writes one. `judge` is exit 3 before the swap and exit 0 after it, with
  the policy as the event and as `issue.policy` answers it; `issueAt` gives the new hash, and the
  old one for `before` the swap; `check` of an approve made after the swap finds nothing.
- `approve, run: a key another actor holds …`: the test's tracker answers the move
  `{ id, seq: 41, duplicate: true }`. Exit 4, stdout empty, the line above.
- `list --since: …`: twelve spellings refused with exit 2 and no call made, four accepted, and a
  span that reaches an approve lists it where a shorter one does not.

Each fails on the tool as committed before this change, for the reason the issue gives. The file of
`git show HEAD:tools/cloud-brain/approver.ts`, in a directory of its own with `issue-as.sh` beside
it, run as `APPROVER_TS=<that file> bun test ./tests/tools/approver.test.ts` at 19:42 CEST:

```
(fail) a swap: an issue the migrate of an install moved is judged on the workflow the swap names, before any later event of it
(fail) approve, run: a key another actor holds already is exit 4 and is not said to be approved
(fail) list --since: hours that are not a number above 0 are exit 2, and nothing is read or listed
 24 pass
 3 fail
```

The first stopped at `the approve guard of the policy in force (event 19) names no delegation (no
approve move)`, the second at `approved task: event 41 (sent before; nothing new was written)`, the
third at exit 0 with the approve's line for `--since=abc`.

With the change, `bun test ./tests/tools/approver.test.ts`: 27 pass, 0 fail, 407 `expect()` calls.
`tests/tools/suite.sh`, run after the last edit of the tool and the test (ended 19:48:05 CEST):
645 pass, 0 fail, 65 files, 86 s.

## On cb4

Reads only, with the writer's own token, 2026-10-12 19:38 CEST. A script of the scratchpad read the
record (`issue.sync`, nine pages) and `issue.list?limit=500`, and for each listed issue held the
`workflow` and `state` that `issueAt` gives against the ones the tracker lists. The record has 38
`swapped` events on 36 issues; for 2 issues the swap is the last event that carries a workflow.

```
after   {"events":4171,"swaps":38,"lastWorkflowEventIsASwap":2,"listed":361,"same":358,"differ":[],"hidden":3}
before  {"events":4173,"swaps":38,"lastWorkflowEventIsASwap":2,"listed":361,"same":356,"differ":["seen-a-small-either-or-put-to-the-owner","seen-a-guess-reported-as-a-cause"],"hidden":3}
```

"before" is the committed file with `export` put before `function issueAt` and nothing else
changed. The 3 hidden are issues the token does not read. The script is not kept.

`approver.ts list --since=abc --token impl-0ba448` from the worktree was exit 2 with the two lines
above, and `list --since=24 --token impl-0ba448` exit 0 with no line (both 19:42 CEST, after the
last edit). `list --token impl-0ba448` was exit 0 with no line too, run once between 19:38 and
19:40, before the edit that refuses 400 digits. The record has no approve by a delegation.

## Not done, not tried

- **No `approve` was sent to cb4**, so neither answer of a kept key was seen there. That the
  tracker leaves `event` out for another actor is read in `wrote` (`brain-issues.ojs`) and held by
  that seed's own test (`other.data.event` is `undefined`); the answer in this test is a stand-in's.
- **A kept key that answers this actor's own event, where that event is not an approve of the
  issue** (the same delegation having used `approver/<id>/approve-<n>` for a comment) still prints
  `sent before`. The tool writes that key for nothing but the move.
- **A swap that lands an issue in `awaiting-approval` from another state** is no round for the
  tool: `rounds` counts moves. A migrate maps state for state; an `escalate` or another named swap
  into that state was not tried.
- **`check` of an approve made before a swap**, with a policy event between, was run for the
  `issueAt` it rests on (`before` the swap gives the old hash) and not as a whole `check`.

## Elsewhere

`git grep -n -F -e '--since' -e 'sent before' -e 'exit 4' -- knowledge 'plan/cloud-brain-*.md' .claude/skills/brain-maintenance 'tools/cloud-brain/*.md'`
and the same for `approver.ts` in `plan/cloud-brain-approver-persona.md`: the spec's
`approver.ts list [--since=<hours>]` (part 5) and "a value the tracker answers 401 for is exit 4
with nothing approved" both hold as written. `tools/cloud-brain/records/ap-1-approver-tool.md`,
"A swap of the issue to another workflow … was not tested", is that record's and is left; the test
above is the one it lacked. No brief names the tool's exits yet (`agents/approver.md` is task 2's).
