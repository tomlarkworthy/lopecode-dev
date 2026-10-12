# ap-1-approver-tool

Task 1 of `plan/cloud-brain-approver-persona.md` (approved by the owner, event 4123): the tool an
approver makes its one move through, with its test, the role `appr` of `brain.ts agent-token`, and
the approver's count in `issue-stats.ts`. Written 2026-10-12 by a writer of the issue loop
(`impl-16ee12`), round 1, started at event 4146 (18:47:39 CEST by `date`). No seed, no deploy. The
commits are refs of the submit.

Nothing on cb4 changes with it. The policy in force (event 483) names no delegation in an `approve`
guard, the token `loop-approver` is not made, and `agents/approver.md` is task 2's.

## What changed

- `tools/cloud-brain/approver.ts`, new. Seven commands; its header is the reference and says what
  each refuses. `judge`, `asked`, `facts`, `check`, `list` and `trial` take a record, a policy and
  a reader of git and call nothing else; the part under `import.meta.main` reads the tracker
  through `issue-as.sh` with `--token`, and sends with `loop-approver` (read from
  `cb4-tokens.json` of the state directory `issue-as.sh` uses) in two places: the move of
  `approve` and the comment of `id`.
- `tests/tools/approver.test.ts`, new.
- `tools/cloud-brain/brain.ts`: `ROLES` of `agent-token` has `appr`, before `out`
  (`tests/tools/ta-5-outside-session-doc.test.ts` holds that the list ends with `"out"`), and the
  header line names it.
- `tools/cloud-brain/issue-stats.ts`: `role()` knows `appr`; the report has `approveByApprover`,
  the `approve` moves whose `by.via` begins `delegation:`; the line is
  `approve by the session: N pressed, N made for the owner; by the approver: N`.
- `tools/cloud-brain/token-checks.ts`: `agentName` knows `appr`. No count of that tool reads the
  role; a holder `appr-…` was `""` to `prefix` before.
- `tests/tools/agent-token.test.ts` (the usage line, eight roles for seven) and
  `tests/tools/issue-stats.test.ts` (the role, the line, and the count: event 21 of its list, an
  approve a token made, is the 1).
- `plan/cloud-brain-approver-persona.md`: a section "As built" at its end.

## What the spec left open, and what was taken

Each by line 2 of `philosophy.md`, the smaller side, which here is the one that sends fewer moves.

| The spec | Built |
|---|---|
| Commands are written with no token (`approver.ts check`) | `--token NAME` on each command that reads, exit 2 without it, as `issue-stats.ts` and `cost-events.ts` |
| "the policy cells of `brain-issues.ojs`" (part 4) | A ref that touches the file at all is refused. No cell is read |
| The blobs of the brief and the tool at `origin/main` are the policy's | And the file that runs has the tool's blob (`git hash-object`): a checkout behind `origin/main` sends nothing |
| "after a fetch" | `git fetch -q --no-recurse-submodules origin main`, twice at most, as `worktree.sh`. Not fetched is exit 2 and nothing sent or printed |
| A verdict of an earlier round | Refused: the key is `approver/<id>/verdict-<n>` with `<n>` the count of moves to `awaiting-approval`, and the verdict is after the last such move |
| "any verdict beginning `approver: leave`" (R4) | Any comment of the issue that begins so, whoever wrote it and whatever its key |
| The holder of the verdict is not the holder of a `start`… (R5) | Also not the same delegation (`by.via`) |
| A short quotation "also names the comment it answered" | The line ends ` answers <seq>`; that event is a comment, on the same issue, before the event quoted |
| An event "of the issue, its parent or that one's parent when the issue was started" | The parents as the events before the issue's first `start` or `spec` move leave them. The event is before the verdict |
| "the spec file of the issue's project" | A `plan/<file>.md` that the `submit-spec` before the project's last `approve` names in its reason, or that a commit ref of it touches; the words are in the file at one of those commits |
| No ref, or no `commit` ref | Refused: there is no diff to have judged |
| A ref of another repository (`cloud-brain-dev@<sha>`: 11 refs of the record's submits at event 4146) | Read in the directory of that name under the checkout; its files are listed with that prefix |
| Several `asked:` lines | Each must hold; `list` and `trial` say the kind of the first |
| The reason of a `leave`, for `trial` | A line `why: <reason>` of the verdict; four reasons are counted by name, the rest as `other` |
| `id`, when the key `approver/id` is held by an earlier token | `approver/id-2` and on, to 20: the tracker answers a held key with no event to another delegation |
| `--record FILE`, `--policy FILE` ("against a record in a file") | Read from files; `approve` then sends nothing and prints the move |
| The issue's workflow has no delegation, another has | Exit 3 for that issue. With none in any workflow the tool stops after `issue.policy`, before the record is read |

## R8, "ends all of it with one command"

Review 4118 said it had no check. The command is `brain.ts token revoke loop-approver`. What is
checked, and where:

- `tests/tools/approver.test.ts`, "R8, ending all of it": with `loop-approver` gone from
  `cb4-tokens.json` `approve` of a good verdict is exit 2 and the stand-in tracker has no POST;
  with the value kept and the tracker answering 401, exit 4 and the answer printed.
- `brain.ts`, the branch `revoke` of `token`: `token.revoke` with the owner's session, and on 200
  the name is deleted from the kept file. `tests/tools/agent-token.test.ts`, "token revoke of the
  parent ends its children", runs that command for `loop-agents` against a stand-in and reads the
  kept file as `{}`.
- Not checked by anyone: the revoke of `loop-approver` on cb4. The token is not made.

## Tests

Each count is from the command beside it, run in the worktree after the last edit of a tool or a
test.

```
bun test ./tests/tools/approver.test.ts        24 pass, 0 fail, 354 expect() calls
tests/tools/suite.sh                           642 pass, 0 fail, 65 files
```

The cases the spec lists under "How each requirement is known to be met" are each a test of that
file: the positive case (a ref that touches `brain-core.ojs`), R3, R6, R4, R5, R7 (the five files,
the blobs, exit 3), a ref not in the checkout, `facts`, `check`, `list`, `brief`, `id`.

**Each refusal has a test that fails without it.** 35 lines of `approver.ts` were each replaced by
a line that refuses nothing, one at a time, in a copy run with `APPROVER_TS`; every copy failed 1
to 16 of the 24 tests (the run ended 19:14:32 CEST by `date`, after the last edit of the tool and
the test). The 35: the two of R6; a ref in the approver's files; an event at or after the verdict;
an earlier `leave`; the three blobs of now and the verdict's; an event of another issue; the parent
read at the start; the spec's `approve` via session; the spec read at its commit; the spec named by
the submit; the two of R5; exit 3 in `judge` and in the command; letter for letter; the short
quotation, its `answers`, and a short one of a file; the state; the key; the round; no ref; a ref
not read; no `asked:` line; a file of no kind; the pin missing; the two lines of `check`; `approve`
from a file sending; origin not fetched; and no token kept. The script is not kept.

Before the change `tests/tools/issue-stats.test.ts` and `tests/tools/agent-token.test.ts`, as they
are now, failed 4 tests of 52 with `brain.ts` and `issue-stats.ts` put back (`git stash` of the
two), and passed with them.

## On cb4

Read only, with `impl-16ee12`, 19:03 CEST. No move and no comment was sent by the tool.

```
approver.ts approve ap-1-approver-tool 4146 --token impl-16ee12
  approver.ts: no approve guard of the policy in force (event 483) names a delegation; nothing was sent. …   exit 3
approver.ts check --token impl-16ee12     0 approves by a delegation, 0 that do not stand                  exit 0
approver.ts list --token impl-16ee12      (no line)                                                        exit 0
approver.ts trial --token impl-16ee12     verdicts 0   approve 0   leave 0  (and four lines of 0)          exit 0
approver.ts brief                         approver.ts: origin/main has no …/agents/approver.md             exit 1
approver.ts facts rules-md-philosophy-push-leave --token impl-16ee12
  … at done, round 1 …  commit lopecode-dev@0197c1cf…: 2 files   [rules]    .claude/skills/brain-maintenance/rules.md
issue-stats.ts --token impl-16ee12        approve by the session: 31 pressed, 20 made for the owner; by the approver: 0
```

The `approve` line stops at the read of `issue.policy`: the one call it made.

One run of `judge` on the record as cb4 has it (4146 events, in a file) with one event added, a
made verdict on `wt-4-reviewer-in-a-view`, and the policy with a guard and two blobs written in:
`approve … --record … --policy …` was exit 1 with five lines. Three were R7 (no brief and no tool
at `origin/main`, and the file that runs), one a sentence that is not in the spec at the commit of
event 3537, one event 4115, which is of another issue. Three lines of that verdict drew no reason:
`asked: 3737 "A" answers <the comment before it>`, a line of `philosophy.md` and one of `rules.md`.

## Not done, not tried

- **No `approve` was sent to cb4, and no `id`.** The first needs the install, the second the token.
  What cb4 answers to either was not seen; the answers of the test are a stand-in's.
- **`brief` that prints a brief** was run in the test's repository only. On cb4's checkout it is
  exit 1 until task 2 lands the file.
- **`philosophy.md` when the checkout's `cloud-brain-dev` lacks the commit `origin/main` records**
  is refused as "could not be read"; the test has the commit.
- **Whether the words are his.** `asked: rules.md "…"` holds for any 20 characters of the file, the
  loop's own sentences among them, and an event a token wrote holds as kind 4. The spec names the
  second ("What the test does not hold"); the first is the same hole in a file.
- **A record of more than one page** in a run: the test's is under 500 events. The live reads above
  were of nine pages.
- **A swap of the issue to another workflow** between the verdict and the move was not tested.

## For task 2 (`ap-2-brief-and-shadow-step`)

What the brief must have a run write, for this tool to read it:

```
approver: approve            (or: approver: leave)
<one sentence: what the change does and whose words it rests on>
…
asked: <seq of an event> "<20 characters or more of its text>"
asked: <seq of an event of his own> "A" answers <seq of the comment it answered>
asked: rules.md "<20 characters or more of the file>"
asked: plan/cloud-brain-<spec>.md "<20 characters or more of the approved spec>"
why: no word of his          (on leave: or `more than the words`, `not secure`, `could not tell`)
brief <the blob `approver.ts brief` printed>
```

The key is `approver/<id>/verdict-<n>`, which `approver.ts facts <id>` prints. The `cost` event of
the run has role `approver` and the run's token as `token`, written by the orchestrating session:
`check` reads it.

## For the overseer

- `rules.md`, "Which token": the table has no row `appr-`. Task 6 (`ap-6-rules-and-live-step`)
  writes it.
- `tools/cloud-brain/brain-issues.ojs:624`, `openerOf` of `issue.flow`: its list of roles has no
  `appr`, so an issue an `appr-` token opened would be counted under the token's whole name. An
  approver opens none. Not changed: it is a deploy of `brain-x-issues`.
