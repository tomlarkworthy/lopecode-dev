# skill-step-2-five-lines-out

Written 2026-10-12 by the writer of the issue (token `impl-75682b`). Commit `9fae78a0` had put five
lines beside the sentence of `.claude/skills/brain-maintenance/SKILL.md`, step 2, that stops new
starts in a pass that names a rate limit. The owner chose to have them out. This change takes them
out and makes the test of that commit hold the sentence alone.

## The choice and the answer

Read with `issue-as.sh impl-75682b "get?id=skill-step-2-advisor-rate-limit"` on 2026-10-12, 21:42 CEST (`date`):

| Event | By | What |
|---|---|---|
| 3851 | the orchestrating session | The choice: "**A.** Approve." "**B.** Send it back to take the five lines out and keep the test alone." Its pick was A. |
| 4354 | the owner | The `approve` move of that issue, with the reason "B". |

The issue was approved and not sent back, so the lines were on `main` and this issue was opened for
taking them out (event 4366).

## What changed

`SKILL.md`, step 2: these five lines are out, and nothing else of the file changed
(`git diff HEAD~1 --stat` at the commit: `SKILL.md | 5 -----`).

```
   A limit of the advisor tool is such a limit, also when every other call of the agent that names it was
   answered: the pass starts nothing new. (The owner, 2026-10-12, event 3768 of `skill-step-2-advisor-rate-limit`: "A".
   Choice A of comment 3682 there: "As written: any named limit stops new starts for that pass." Choice B, not taken,
   had the advisor's limit alone written in the journal and not stop a start. Not known, the issue says: whether
   the advisor's limit comes before the account's.)
```

What step 2 says of a limit is as it was before `9fae78a0`: his A of event 3768 stands, and a limit
of the advisor tool is a named limit under the sentence, with no line of its own. A line on the
approver that came in later ("and not in a pass that names a limit") stood between the sentence and
the five lines and is unchanged.

`tests/tools/skill-step-2-advisor-rate-limit.test.ts`, the same file under the same name, three
tests where it had four:

1. Unchanged: step 2 has the sentence once, and "Start nothing new in a pass" is in the file once.
2. New, in place of the two that read the five lines: step 2 has none of "A limit of the advisor
   tool", "the advisor's limit", "event 3768", "comment 3682", "Choice A", "Choice B".
3. Unchanged: three phrases of choice B's text are not in step 2.

The issue asks for a test that reads the sentence alone. Test 1 is that, and so is a test of
`os-2-order-and-pool.test.ts`; both passed with the five lines in. Test 2 is the one that fails
with them in. Without it nothing in `tests/tools` would say if they came back. Its first try had
the single word "advisor" in the list; that would fail on any later line of step 2 that names the
advisor for another reason, so the list has the two phrases of the five lines instead.

`tools/cloud-brain/records/skill-step-2-advisor-rate-limit.md` gains one dated line at its end that
names this record. The rest of it is the record of `9fae78a0` and was left.

## Counts

Each run in the worktree on 2026-10-12, after the last edit of the two files.

| Command | Result |
|---|---|
| `bun test ./tests/tools/skill-step-2-advisor-rate-limit.test.ts` | 3 pass, 0 fail |
| the same with `SKILL=` a copy of `git show HEAD:.claude/skills/brain-maintenance/SKILL.md` made before the edit (the file with the five lines) | 2 pass, 1 fail: test 2, `Expected to not contain: "A limit of the advisor tool"` |
| `bun test ./tests/tools/os-2-order-and-pool.test.ts` | 6 pass, 0 fail |
| `tests/tools/suite.sh`, 21:41:17 to 21:44:18 CEST | 690 pass, 0 fail, 69 files, 180 s; no `skipped:` line |

The suite's run was made before the rebase of the landing, which brought in other writers' tests (16
files, `SKILL.md` among them in other lines); the count after it is in the comment of the submit. The
two files of the first and third rows were run again after that rebase, under the lock: 9 pass, 0 fail.

A run of the suite before that one, 21:32:42 to 21:37:36, gave 687 pass, 3 fail in 294 s. The three
were tests of `summarize-papers.test.ts`, each stopped at the 30 s the script gives a test
(`[30003.98ms]`, `[30001.38ms]`, `[30001.67ms]`). `uptime` after it: load averages 11.23, 16.97,
18.21. That file does not read the procedure (`grep -c "SKILL\|brain-maintenance"` on it printed 0),
and alone with `bun test --timeout=30000` it gave 26 pass, 0 fail in 123 s at 21:41. I read the
three as the machine's load and did not look further.

## What speaks of the lines elsewhere

`git grep -c -F -e 'limit of the advisor' -e 'event 3768' -e 'comment 3682' -- knowledge 'plan/cloud-brain-*.md' .claude/skills/brain-maintenance 'tools/cloud-brain/*.md' tests tools/cloud-brain/records`,
after the edit: the test (2 lines, its header and its list) and the earlier record (6 lines).
`git grep -n -i -E "advisor.{0,80}limit|limit.{0,80}advisor"` over the first four of those paths
printed lines of `oversight.md` (the overseer's dated notes; line 681 says the five lines went
beyond the test that was asked for) and line 117 of `plan/cloud-brain-approver-persona.md` (a table
of his answers). Each is about the issue and not a claim that step 2 has the lines. None was changed.

## Prior art

Two searches of `knowledge.search?semantic=true` with the token `loop-knowledge`: "rate limit stops
new starts advisor" and "take lines out of SKILL.md keep the test". The first eight entries of each
were a module (`module:tomlarkworthy:rate-estimation`), papers on agents' skills and docs of other
specs. Nothing bore on it.

## Not tried

- An orchestrator's pass that reads step 2 without the lines and meets an agent's report of the
  advisor tool's limit. None was run. What such a pass does rests on the sentence, which names "a
  rate limit or a usage limit" and not the advisor.
- Test 2 holds six phrases. Lines that said the same in other words would pass it.
- `worktree.sh --rebase` with the two files edited and not committed printed
  `error: cannot rebase: You have unstaged changes.` and exited 0. Seen once; not filed.
