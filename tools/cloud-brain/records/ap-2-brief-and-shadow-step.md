# ap-2-brief-and-shadow-step

Task 2 of `plan/cloud-brain-approver-persona.md` (approved by the owner, event 4123): the approver's
brief, and the steps of `SKILL.md` that start an approver for an issue at `awaiting-approval`, write
what its run cost, and tell the owner what it approved. Written 2026-10-12 by a writer of the issue
loop (`impl-13c7da`), round 1, started at event 4171 (19:37:24 CEST by `date`). No seed, no deploy.
The commits are refs of the submit.

Nothing on cb4 changes with it, and no approver was run. The policy in force (event 483) names no
delegation in an `approve` guard, so the tool of task 1 sends no move (exit 3) whatever a run
decides. What starts with this landing: an orchestrator that reads the new row spawns an approver
for each issue at `awaiting-approval`, and each writes one comment and, on a `leave`, one `narrow`.
Five issues were at that state at 19:37 CEST (`issue-as.sh impl-13c7da "list?state=awaiting-approval&limit=100"`).

## What changed

- `.claude/skills/brain-maintenance/agents/approver.md`, new: the brief. `approver.ts brief` prints
  it as `origin/main` has it, with its blob hash.
- `.claude/skills/brain-maintenance/SKILL.md`:
  - step 3, the row "at `awaiting-approval`": spawn the approver when three things hold (below);
    the owner's-word `approve` of the session is kept as it was;
  - step 4, a paragraph "The approver": the token (`agent-token appr <id>`), the view, the three
    lines of the prompt;
  - step 5, a paragraph "The role `approver`" with the `cost` call, `approver` in the list of
    roles, and the removal of the view;
  - step 7: the lines of `approver.ts list --since=… --token …`;
  - step 1 (an `appr-<id>` view in the list of worktrees), step 2 (where an approver stands in the
    order of a pass), "A token for each agent" (the role `appr`), "What the loop does not do".
- `tools/cloud-brain/token-checks.ts`: `appr` among the roles whose holder is held to a `cost` line.
- `tests/tools/approver-brief.test.ts`, new. `tests/tools/token-checks.test.ts`, one test added.
  `tests/tools/briefs-name-the-prompts-token.test.ts` and
  `tests/tools/rework-resumes-the-implementer.test.ts`: each counted two `cost` examples in
  `SKILL.md` and there are three; the second also named the role `implementer` for every example.
- `plan/cloud-brain-approver-persona.md`: "(As built …)" at the spawn rule of part 4 and at the row
  of R7, and a paragraph for task 2 under "As built".
- `knowledge/working-with-cloud-brain-remote-lopecode-cluster.md`: the row of the loop names the approver.

## The spawn rule, mended

Review 4118: the rule of part 4 (no comment keyed `approver/<id>/verdict-<n>`, `<n>` the count of
moves to `awaiting-approval`) starts a second approver after a send-back on an issue that was left,
and `approver.ts approve` refuses that issue (R4). The row now asks three things:

```
no comment keyed approver/<id>/verdict-<n>                 the spec's rule
no comment of the issue, of any round, begins `approver: leave`      the mend
runs?id=<id>&role=approver&round=<n> has no run            a run that wrote no verdict is not started again each pass
```

The third was not asked for. Without it an approver that dies before its comment is spawned at
every pass, at the cost of a reviewer's run (the spec's estimate, 1.20 USD at the median). It
rests on step 5 writing the run's `cost` event with `round` the `<n>` of the verdict's key. The read
was run on cb4: `issue-as.sh impl-13c7da "runs?id=ap-1-approver-tool&role=approver&round=1"`
answered `{"runs":[],…}` and the same with `role=reviewer` answered that issue's one review.

## What the spec left open, and what was taken

| The spec | Built, and why |
|---|---|
| Where an approver runs | A view of its own, `bm-appr-<id>`, detached at `origin/main` (`worktree.sh --at`). The other side was the main checkout: it is behind whenever its pull was refused, and a file another session has open there would be read as the rule. `origin/main` and not the commit under review, since the tool makes no move unless the file that runs has the blob the policy names |
| "The prompt names that command and not a file" | ``Run `bun <V>/tools/cloud-brain/approver.ts brief` and follow what it prints.`` The brief reads `<V>` from that line |
| The `cost` event of role `approver` | `round` is the `<n>` of the verdict's key; `outcome` is `approve`, `leave` or `stopped`, the verdict and not the move; `token` always, since `approver.ts check` reads it |
| An issue whose refs touch the approver's own files or the policy | Given an approver as any issue is. The brief has it leave, with `why: the approver's own files` (`trial` counts that under `other`), and the narrow then holds the issue through later rounds, where the tool reads the refs of the last submit alone |
| The form of a `leave` | One comment, the verdict: its first two lines as the tool reads them, the line `why:`, then the parts `philosophy.md` asks of a comment that waits for the owner. No label is put on: the five issues at `awaiting-approval` at 19:37 CEST each had `needs-owner` already |
| "judges a ticket against cluster evidence itself" (event 4123) | The brief names the evidence: the record on cb4 read with the run's own token, the commits of the refs, the files at `origin/main`, and `deploy/services.json` of the view beside a `deploy` ref. What a writer, a review or the orchestrator says of the change is a claim |
| `rules.md`, Never: no agent calls the `approve` move | Not changed here (task 6). The brief says so, and that the move is the tool's, under a policy the owner installed |
| An issue judged "as at `awaiting-approval`" (task 3's six made issues) | The brief stops at another state "unless your prompt says to judge it as at that state" |

## Tests

Each count is from the command beside it, run in the worktree after the last edit.

```
bun test ./tests/tools/approver-brief.test.ts        11 pass, 0 fail, 59 expect() calls
bun test ./tests/tools/token-checks.test.ts          14 pass, 0 fail, 95 expect() calls
tests/tools/suite.sh                                 654 pass, 0 fail, 66 files
```

`approver-brief.test.ts` takes the fenced blocks of the brief (the approval, the leave, the five
forms of `asked:`), fills them in, and gives them to `judge`, `asked`, `trial` and `list` of
`approver.ts` with a record and a stand-in for git:

- the approval, with an `asked:` line of an event of the owner's, is exit 0 with the key
  `approver/t1/approve-1`, and the second line of the move's reason is the brief's one sentence;
  the same verdict by an `impl-` holder is exit 1, and so is the form with its `asked:` line not filled in;
- each of the five `asked:` forms is read as its kind (two of kind 1, one of 2, two of 3);
- the leave is counted by `trial` under each of the four reasons the brief names, with 0 under
  `other`, and an approval written after it sends nothing ("was left to the owner");
- `list` prints the brief's sentence for an approve made on such a verdict;
- every call of the tool in the brief has `--token <token>`, and the brief has no `move` call;
- the lines of `SKILL.md`: the row, the prompt, the view, the role in the token section, the
  `cost` example, step 7.

Before the edit, with the test as it is landed and the skill's files as `origin/main` had them
(`git archive origin/main .claude/skills/brain-maintenance` into a scratch directory, then
`BRIEFS=<that directory>/.claude/skills/brain-maintenance bun test ./tests/tools/approver-brief.test.ts`,
19:49 CEST): `0 pass, 11 fail`. `token-checks.test.ts` with `token-checks.ts` put back
(`git stash push tools/cloud-brain/token-checks.ts`): `13 pass, 1 fail`, the new test.

`rework-resumes-the-implementer.test.ts` gives each `cost` example of `SKILL.md` to `issueAct` of
what cb4 runs (`cloud-brain-dev/deploy/@tomlarkworthy/brain-issues.js` of the worktree). With the
third example it passes, 11 pass and no `skipped:` line, so the deployed tracker's own check takes a run of role
`approver` with the outcome `leave`. No `cost` call was sent to cb4.

## Run on cb4 and on this machine

Read only, with `impl-13c7da`, 2026-10-12 between 19:37 and 19:43 CEST.

```
approver.ts facts ap-1-approver-tool --token impl-13c7da
  ap-1-approver-tool: at awaiting-approval, round 1; the verdict's key is approver/ap-1-approver-tool/verdict-1
  parent and its parent when it was started: approver-persona
  last submit: event 4153; passing review: event 4154; verdicts: none
  commit lopecode-dev@85e87fa1…: 7 files     (two marked [approver])
worktree.sh --at $(git -C <root> rev-parse origin/main) appr-ap-1-approver-tool
  exit 0, the path …/.claude/worktrees/bm-appr-ap-1-approver-tool, 5 s (19:40:56 to 19:41:01)
  there: cloud-brain-dev/deploy/services.json and philosophy.md are read; `approver.ts facts` as above;
  issue-as.sh impl-13c7da "get?id=ap-1-approver-tool" answered 200
worktree.sh --list      appr-ap-1-approver-tool clean changed=0 untracked=0 ahead=0 dev-changed=0 dev-ahead=0 occupant=- branch=detached
worktree.sh --remove appr-ap-1-approver-tool      exit 0
token-checks.ts --token impl-13c7da
  151 holders after N that start impl-, rev-, spec-, over-, dig- or appr-; 114 are the token of a cost line an orch- token wrote; 37 are not
```

`token-checks.ts` failed its first and third checks in that run, as it does without this change:
no `appr-` holder is in the record, so the 151 and the 37 are of the five roles it had.

`approver.ts brief`, run in that view before the push, was exit 1, `origin/main has no
.claude/skills/brain-maintenance/agents/approver.md`. After the push the writer runs it once; its
answer is in the issue's comment and not here, since this file is pushed with the brief.

## Not done, not tried

- **No approver was run.** Whether an agent that reads the brief writes a verdict the tool takes,
  how long the brief makes a run, and how its lines read to the owner are not known. The test
  fills the brief's forms in by a script. Task 3 (`ap-3-trial`) is the first runs.
- **No `narrow` was sent.** The record of cb4 has no `narrowed` event (the spec, "What exists
  today"). The call in the brief is the shape of the tracker's reference
  (`getSource?worker=brain-x-issues&part=reference`: `{ key, id, move, guard, reason }`) and of
  `test_issues_*` in the seed (`rig.a("narrow", { id, move, guard })`); the brief says what to do
  with an answer that is not 200.
- **No `cost` event of role `approver` was written**, and `approver.ts check` has none to read.
- **The row, the spawn and step 7 were not run by an orchestrator.** `SKILL.md` says "not yet" at each.
- **A view `appr-<id>` beside a view `rev-<id>` of the same issue**, and step 1's removal of one
  left by a session that ended, were not tried.
- **`approver.ts list` on cb4** prints nothing (task 1's record); what its lines look like in step 7
  is the test's stand-in record.
- **The deploy ref beside `services.json`** (the brief, step 4) is a reading no run has made; the
  file is as old as the view.

## For the overseer

- `rules.md`, Never, "Call … the `approve` … moves", and "An act of Never, on the owner's word",
  "Who does it" ("Not an agent that a session spawned"), have no line for the approver. The brief
  tells an approver to run the tool of task 1, which sends the move after the owner's install.
  Task 6 (`ap-6-rules-and-live-step`) writes the lines; it lands before the install.
- `SKILL.md`, "Why the overseer may edit briefs and not rules": nothing there says the overseer
  does not edit `agents/approver.md`. Task 6 again. An edit of it changes the blob, which after the
  install stops every approval until the owner installs again.
- `approver.ts` reads the refs of the last submit alone: a second round whose refs leave out the
  commit that touched one of the approver's own files is not refused by the ref check. The brief's
  leave and its narrow in the first round hold such an issue; the tool alone does not.
- `token-checks.ts --token impl-13c7da` named `issues-implementer-2` as the holder of events up to
  4174 at 19:42 CEST, after the day each agent had a token of its own. Not looked into.
