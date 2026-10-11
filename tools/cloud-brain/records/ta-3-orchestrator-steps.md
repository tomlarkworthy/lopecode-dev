# ta-3-orchestrator-steps

2026-10-11. Task 3 of `plan/cloud-brain-record-names-token-not-agent.md`, approved by the owner at
event 1285: the loop's procedure, its briefs and its rules give each agent a tracker token of its
own. Six files of `.claude/skills/brain-maintenance/` and three test files. No seed, no Worker, no
deploy. The commit's message begins `ta-3-orchestrator-steps: a token for each agent`; it was written
2026-10-11 21:35:29 +0200 (`git log --format=%ci`, in the worktree, before the landing's rebase).

`rules.md` is the owner's file. The issue is `major`: it was landed for its review, as
`lk-4-rules-md-two-sentences` was, and waits at `awaiting-approval` for his approve after it.

## What changed

| File | What |
|---|---|
| `SKILL.md` | A section "A token for each agent": the session makes itself an `orch-` token, makes one before each spawn, names it in the prompt and in the `token` field of the `cost` line, and ends it. Step 3's table has four rows that add moves. The limits are 8 and 4. A section "A token an approved spec names". Every command of the session is written with `<your token>`. |
| `agents/implementer.md` | The token is the one the prompt names. Step 3: a token an approved spec names is not "a new secret". Step 4: an issue another started is not yours to submit. Step 10: `LOCK_TOKEN=<token> ` before each of its 13 `lock.sh` calls. "A resumed round": the token is the first round's. |
| `agents/spec.md` | The token. Step 1: at `spec` and another's, stop; at `open` after a `back`, make `spec` with `spec/<id>/spec-<round>`. Step 5: a token the design needs goes in a list "What the orchestrator makes". A section "A resumed round". |
| `agents/digest.md`, `agents/overseer.md` | The token, in `ia`, `io`, `--token=` and `LOCK_TOKEN=`. The overseer's 3 issues are counted from its own token. |
| `rules.md` | "Which token" by agent. The owner's words of event 1406 on `loop-roles`. A section "A token an approved spec names", with the four tokens of 2026-10-11. `cb4-agent-tokens.json` among the files not read into output. The first item of Never names the token of the prompt. |
| `tests/tools/briefs-name-the-prompts-token.test.ts` | New, 14 tests. |
| `tests/tools/lock.test.ts`, `rework-resumes-the-implementer.test.ts` | One assertion each, for the text that changed under them (`LOCK_TOKEN=<token> ` in the overseer's brief; the row of step 3 that is sent back). |

The four rows of step 3, as the spec's table "What changes for the loop" has them:

| Row | `back` is made by | The second `start` or `spec` by |
|---|---|---|
| A dead writer | the orchestrator, after it ends the dead writer's token | the writer it spawns |
| A quick win of the orchestrator's own, sent back | the orchestrator (or it does the round itself, and no move is added) | the writer it spawns |
| A submit made for a writer | the orchestrator, after it ends that writer's token (or the writer submits, by message) | the orchestrator, with its `orch-` token |
| A spec sent back | the orchestrator, from `spec` to `open` (or the spec writer is sent the round by message) | the spec writer it spawns |

The owner's revoke of the three role tokens is the first row: an issue then `in-progress` or at
`spec` whose start was made with one of them. `SKILL.md` ("A token for each agent", last item) and
`rules.md` ("Which token", last item) both say so, from review 1273's note.

### What the comments on the issue added, and where each is

| Comment | In |
|---|---|
| 1409: the owner's wording of event 1406 for `loop-roles` | `rules.md`, "The files of the Brain an agent reads", his words whole |
| 1533: "can we increase the parrallism twofold?" | `SKILL.md` step 2, the frontmatter, "What the loop does not do" |
| 1961: a token an approved spec names is made by the orchestrating session | `rules.md` and `SKILL.md`, a section each of that name; `agents/spec.md` step 5; `agents/implementer.md` step 3 |
| 2074: paragraphs for `loop-docs`, `loop-papers`, `loop-agents`, `loop-dashboard` | `rules.md`, the four items of that section |
| 2181, the overseer's four | Two taken: step 3's `decompose` row says a task has the labels its spec gives (`seen-bd-2-opened-without-major`), and step 1 says the session's lock name is that one and no other (`seen-land-held-under-other-names`). Started without triage (its 1) is not changed. Its 4 is the four items. |

The methods of each token are read from its spec, as comment 2074 asks, and not from that comment,
which gives `loop-docs` a third method:

```
plan/cloud-brain-brain-docs-entered-by-hand.md:334     token loop-docs knowledge.put knowledge.list
plan/cloud-brain-paper-summarizer-persona.md:470       token loop-papers knowledge.put knowledge.search static.get
plan/cloud-brain-dashboard-service.md:487              token loop-dashboard metric.query metric.list 'dashboard.*'
plan/cloud-brain-record-names-token-not-agent.md:381   token loop-agents 'issue.*' --delegate
```

Comments 1952 and 1953 quote the first two commands as run; comment 1954 the last. What each token
answers on cb4 was not asked. The names kept, with no value read:
`python3 -c "import json; print(sorted(json.load(open('tools/cloud-brain/.emitted/cb4-tokens.json'))))"`
printed `loop-agents`, `loop-bluesky`, `loop-dashboard`, `loop-deploys`, `loop-docs`, `loop-knowledge`,
`loop-library`, `loop-papers`, `loop-roles`. `loop-deploys` has no paragraph in `rules.md` either
and none was asked for; it is not added.

### Choices of this task that the spec does not make

- **A brief still names the role's token, once, for a prompt that names none.** The spec's R4 wants
  no brief to name one. Until the owner's revoke a session that read the procedure before this
  change spawns with the old prompt, and a writer with no name to write with would stop. It is the
  form the reviewer's brief on the Brain has since `ta-4-reviewer-brief-names-token`. The spec's
  grep for R4 therefore still finds lines; "After the change" below has them. Taking the fallback
  out is one sentence in each of four briefs, at the revoke.
- **A spec writer's token is kept until the project is `approved`**, not until `to-approval`. The
  project workflow has a `send-back` from `awaiting-approval` to `spec` (`issue-as.sh … policy`), and
  only the token that made `spec` makes `submit-spec`.
- **A digest sent back goes as a writer's**: by message, else `back` and a new `start`. The spec's
  table has no row for it. A new digest writer's submit of an issue another token started is the
  same guard as a writer's. No digest writer has been sent a round.
- **`LOCK_TOKEN` in every `lock.sh` call of a brief.** Not in the spec. `lock.sh` calls as
  `issues-implementer-2` with none (its line 52), and its holder is the name with the token of the
  call. Without it a writer would hold the lock under the role's token, and after the revoke every
  call would be exit 2.
- **The session's own token is not ended by anyone.** The spec says when an agent's is ended and
  not an `orch-` one. Its 48 hours end it.

## The tests

```
$ git show 5ecbbc0c:.claude/skills/brain-maintenance/<file> > <scratch>/before/<file>     # the seven files, as they were
$ BRIEFS=<scratch>/before bun test ./tests/tools/briefs-name-the-prompts-token.test.ts
 0 pass
 14 fail
$ bun test ./tests/tools/briefs-name-the-prompts-token.test.ts                            # in the worktree, with the change
 14 pass
 0 fail
 132 expect() calls
$ bun test ./tests/tools                                                                  # the same, after the last edit of a brief or a test
 332 pass
 0 fail
 1735 expect() calls
Ran 332 tests across 37 files.
$ bun test ./tests/tools                                                                  # after the rebase onto main at a3124e62, which brought two test files and tests of others
 362 pass
 0 fail
 1939 expect() calls
Ran 362 tests across 39 files.
```

Between those two, a run on main at 412fc043 had 344 pass and 2 fail, both in `light-agent.test.ts`:
the worktree's `cloud-brain-dev` was at a commit whose test had not landed in `lopecode-dev` yet. The
next rebase brought that test, and the run above followed it.

The whole directory was run three times while the change was made. The first run, before the two
older tests were changed, had 3 fail: those two, and `issue-lock-sql.test.ts`, which reads a built
notebook the worktree did not have yet (`build.ts --out` made it). The second had 1 fail of 330,
`summarize-papers.test.ts`, "from a worktree: the entries and the texts are the main checkout's";
that file alone then passed 3 times of 3, 11 tests each. This change touches nothing it reads. The
third is the first of the two above.

`doc-token-example.test.ts` reads these files for a line that shows a token made for the tracker's
methods. So the command that made `loop-agents` is not written out in `rules.md` or `SKILL.md`;
both point at the spec and at comment 1954.

### After the change, the spec's grep for R4

```
$ grep -rn 'issues-\(implementer\|reviewer\|overseer\)-[0-9]' .claude/skills/brain-maintenance/SKILL.md .claude/skills/brain-maintenance/agents .claude/skills/brain-maintenance/rules.md
SKILL.md:92                the three names, in the item that says the owner revokes them
agents/digest.md:14        `issues-implementer-2` when it names none
agents/overseer.md:6       `issues-overseer-1` when it names none
agents/spec.md:15          `issues-implementer-2` when it names none
agents/implementer.md:8    `issues-implementer-2` when the prompt names none
rules.md:123, 124          the three names, in the item that says the owner revokes them
```

Seven lines, where 5ecbbc0c had 19 in the same files (`git grep -c` at that commit: `SKILL.md` 3,
`rules.md` 3, `implementer.md` 3, `spec.md` 2, `digest.md` 1, `overseer.md` 7). The other files of
the spec's grep are not this task's: `knowledge/` is task 5, `tools/cloud-brain/issue-stats.ts` is
`issue-stats-default-token-r4` (landed with this, a commit of its own), and `tools/cloud-brain/lock.sh` lines
17 and 52 still give the role's token as the default of `LOCK_TOKEN`. That is the issue
`lock-sh-default-token-r4`, opened with this task (event 2305) and not fixed: a writer started
before the briefs changed calls `lock.sh` with no `LOCK_TOKEN`.

## Tried on cb4

One token was made and ended, to see the three commands of `SKILL.md` answer as it says. It wrote
no event. Between 21:32:09 and 21:32:15 CEST (`date` before and after), from the main checkout:

```
$ brain.ts agent-token nosuchrole x                    the usage line, exit 1
$ N=$(brain.ts agent-token impl ta-3-orchestrator-steps)
  stderr: made "impl-f7643c" (impl; ta-3-orchestrator-steps) under loop-agents for issue.*, until 2026-10-13T19:32:09.969Z; …
  exit 0, N is impl-f7643c
$ brain.ts agent-token list
  {"name":"impl-f7643c","note":"impl; ta-3-orchestrator-steps","made":"2026-10-11T19:32:10.127Z","until":"2026-10-13T19:32:09.969Z","kept":true}
$ issue-as.sh impl-f7643c "get?id=ta-3-orchestrator-steps"          [200]
$ LOCK_TOKEN=impl-f7643c lock.sh show land                          land is held by fb-a2pyxbfzuh since …, exit 0
$ bun tools/cloud-brain/issue-stats.ts --token=impl-f7643c          record 2269 events, 229 issues …
$ brain.ts agent-token revoke impl-f7643c
  401: "impl-f7643c" is revoked and its value is refused, on read 1 of issue.policy, 68 ms after the revoke. Its entry is gone: issue-as.sh impl-f7643c is exit 2
  exit 0
$ issue-as.sh impl-f7643c "get?id=ta-3-orchestrator-steps"          no token named impl-f7643c is kept; nothing was sent, exit 2
$ LOCK_TOKEN=impl-f7643c lock.sh show land                          no token named impl-f7643c is kept …; nothing was sent, exit 2
$ brain.ts agent-token list                                         no line, exit 0
```

For task 6: `impl-f7643c` is a name of no `cost` line and of no event. It only read.

This task's own writes to the tracker are made with `issues-implementer-2`: the prompt that started
its writer named no token, and its `start` (event 2229) is that token's.

## The landing lock, for the sentence of step 2

Comment 1533 asks for "what was seen of the queue on the landing lock since". The cluster keeps
the lock's history since `lk-3-lock-sh-over-the-cluster` landed. Run at 21:36:01 CEST:

```
$ tools/cloud-brain/issue-as.sh issues-implementer-2 "locks?history=200" | python3 -c "
import sys, json, time
h = sorted((x for x in json.load(sys.stdin)['history'] if x['name'] == 'land' and x['n'] <= 25), key=lambda x: x['n'])
held = [(x['ended'] - x['taken']) / 1000 for x in h]
gaps = [(b['taken'] - a['ended']) / 1000 for a, b in zip(h, h[1:])]
at = lambda ms: time.strftime('%H:%M:%S', time.localtime(ms / 1000))
print(len(h), 'holds, n', h[0]['n'], 'to', h[-1]['n'], 'from', at(h[0]['taken']), 'to', at(h[-1]['ended']), '=', round((h[-1]['ended'] - h[0]['taken']) / 60000, 1), 'min')
print('held', round(sum(held), 1), 's in all,', min(held), 'to', max(held), 's a hold')
print(sum(g < 20 for g in gaps), 'of', len(gaps), 'takes less than 20 s after the release before;', sum(g < 2 for g in gaps), 'less than 2 s')
"
25 holds, n 1 to 25 from 20:37:57 to 21:22:16 = 44.3 min
held 731.3 s in all, 2.452 to 140.696 s a hold
9 of 24 takes less than 20 s after the release before; 2 less than 2 s
```

The lock was held 731 s of 2659, so it was free about 72% of those minutes. A take that follows a
release by less than 20 s may be a writer that waited (`take --wait` asks every 20 s) or one that
arrived then: the history does not tell them apart. His word is comment 1533, 19:52:35 (the event's
`at`); the 45 minutes between it and the first hold are not in the history. How many writers and
reviewers ran in the window was not counted.

## Not tried

- **No agent has been spawned by these steps.** No prompt with a token line has been sent, no
  reviewer started with `; your token is <name>` in its task, no `cost` line written with a `token`
  field, no token ended at a `cost` comment. Task 6 is where the first three issues are read.
- **None of the four rows has been walked by the loop.** `ta-1b-agent-token-on-cb4` walked the
  guard under them on two check issues (403, 403, 200 on a task and on a project; events 1980 to
  1995). The orchestrator making `back` on a live issue, and a spawned writer finding an issue
  `ready` with a `back` in its events, have not happened.
- **A spec writer or a digest writer sent a round by message under these steps.** The spec counts
  three spec writers resumed before (`cost` comments 926, 997, 1015); I did not read those events.
- **`issue-watch.sh` with an `orch-` token.** Read in the script: it prints an `opened` event whose
  holder is not the one token it was given. With a token an agent it will print each issue a writer
  or an overseer opens, where it printed none of them before. `SKILL.md` step 8 says so. Whether
  that is too many wakes is not known.
- **`LOCK_TOKEN` with an agent's token on a take, a renew and a release.** Only `show` was run with
  one, on cb4. `tests/tools/lock.test.ts` ("LOCK_TOKEN names the token of the call") has, against a
  stand-in, a release and a renew under another token refused and a `show` with a name of the agent
  tokens' file; it has no take, renew or release made with an agent's token.
- **The session's token after a compaction**, found again by its note in `agent-token list`: the
  note of the one made here was `impl; ta-3-orchestrator-steps`, the form the step relies on; no
  `orch` token was made.
- **A token after its 48 hours.**
- **`cloud-brain-dev/README.md`** still shows the reviewer started with no token in its task. It is
  in the submodule's repository, which the loop has no token to push
  (`records/ta-4-reviewer-brief-names-token.md`).
- **The reviewer's brief on the Brain** was not changed. It has `LOCK_TOKEN=<token>` already
  (lines 46, 170 and 174 of the copy fetched 2026-10-11) and reads its token from the task.
