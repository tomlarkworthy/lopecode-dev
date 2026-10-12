# skill-step-2-advisor-rate-limit

Written 2026-10-12 by the writer of the issue (token `impl-9e7967`). Step 2 of the issue loop's
procedure (`.claude/skills/brain-maintenance/SKILL.md`) stops new starts in a pass in which a report
names a rate limit. The overseer asked whether a limit of the advisor tool alone should be let
through. The owner kept the sentence. This change writes his answer beside it and adds a test.

## The choice and the answer

Read with `issue-as.sh impl-9e7967 "get?id=skill-step-2-advisor-rate-limit"` on 2026-10-12, 08:28 CEST (`date`):

| Event | By | What |
|---|---|---|
| 3679 | the overseer (`over-9a80e6`) | The issue. Three writers' reports had named the advisor tool's limit, and two passes started nothing for it. Labeled `major`: the change it proposes narrows a refusal. |
| 3682 | the orchestrating session | The choice put to the owner. A: "As written: any named limit stops new starts for that pass." B: only a limit of the agent's own calls stops a start; the advisor's alone is written in the journal, and two reports of it in one pass stop. |
| 3768 | the owner, in his session | "A" |
| 3770 | the orchestrating session | For the writer: the sentence stays; what is left is a test in `tests/tools` that holds it. |

The counts of event 3679 (three reports, two passes, 9 minutes on `fm-2-open-stays-submits`) are the
overseer's, from the orchestrator's journal. I did not read the journal and did not count them again.

## What was found

The sentence was already held. `tests/tools/os-2-order-and-pool.test.ts`, the test "step 2 has the
rule of the pool as the spec words it, and the owner's numbers as what it replaces", has it letter
for letter in its list (line 77 of the file at `7aa872af`). A second test of the same string alone
would have passed before any change and added nothing.

No rule of the loop said that the advisor's limit is one of the limits meant. Searched in the commit
before this change, in `knowledge`, `plan/cloud-brain-*.md`, the skill's directory, `tools/cloud-brain/*.md`
and `tools/cloud-brain/records`, with
`git grep -n -i -E "advisor.{0,80}limit|limit.{0,80}advisor"`: three lines, each in `oversight.md`
(612, 634 and 651), the overseer's notes. Line 612 says a pass started nothing for the advisor's limit,
"SKILL.md step 2, as written"; 634 and 651 name this issue as a question for the owner. A line in which
"advisor" and "limit" stand more than 80 characters apart is not found by that search.

## What changed

Two files.

`SKILL.md`, step 2. The sentence is as it was. Five lines follow "One agent on an issue, as before.":

```
   A limit of the advisor tool is such a limit, also when every other call of the agent that names it was
   answered: the pass starts nothing new. (The owner, 2026-10-12, event 3768 of `skill-step-2-advisor-rate-limit`: "A".
   Choice A of comment 3682 there: "As written: any named limit stops new starts for that pass." Choice B, not taken,
   had the advisor's limit alone written in the journal and not stop a start. Not known, the issue says: whether
   the advisor's limit comes before the account's.)
```

His word is the letter. The first sentence is my reading of what A decides for the advisor's limit;
the words of the choice are the orchestrating session's, quoted from comment 3682.

`tests/tools/skill-step-2-advisor-rate-limit.test.ts`, new, four tests. `SKILL=<file>` reads another
copy of the procedure, as `os-2-order-and-pool.test.ts` does.

1. Step 2 has the sentence once, and "Start nothing new in a pass" is in the file once.
2. The line on the advisor's limit is in step 2 once, after the sentence.
3. The owner's answer with its event, choice A in the words of comment 3682, and "Choice B, not taken,".
4. Three phrases of choice B's text are not in step 2: "of its own calls", "does not stop a start;",
   "two reports of it in one pass do".

## Counts

Each run in the worktree, after the last edit of the two files.

| Command | Result |
|---|---|
| `bun test ./tests/tools/skill-step-2-advisor-rate-limit.test.ts` | 4 pass, 0 fail |
| the same with `SKILL=` a copy of `git show main:.claude/skills/brain-maintenance/SKILL.md` (the file before the change) | 2 pass, 2 fail: tests 2 and 3 |
| the same with `SKILL=` a copy of the changed file in which the sentence is replaced by the text of choice B from the issue's body | 2 pass, 2 fail: tests 1 and 4 |
| `bun test ./tests/tools/os-2-order-and-pool.test.ts` | in the count of the suite below; it holds the sentence too and still passes |

The count of `bun test ./tests/tools` is in the comment of the submit, from the run made after the
last rebase. A first run, in the worktree before a rebase, gave 501 pass, 3 skip, 1 fail of 505: the
fail was `topic-sql.test.ts` ("Expected: 4, Received: 6" schema statements), and one skip was named,
`skipped: test-ts-cut.test.ts: … cloud-brain-dev/test.ts has no --whole`. The worktree was at
`7aa872af` then and `main` at `c6d118dd`, where `bun test ./tests/tools/topic-sql.test.ts` gave
6 pass, 0 fail in the main checkout. That file does not read `SKILL.md`
(`grep -c "SKILL\|brain-maintenance" tests/tools/topic-sql.test.ts` printed 0).

## Prior art

Two searches of `knowledge.search?semantic=true` with the token `loop-knowledge`: "rate limit stops
new starts" and "test that holds a sentence of SKILL.md". The first eight entries of each were
modules, papers and guides on other matters (`module:tomlarkworthy:rate-estimation`,
`doc:reading-a-list-from-a-paged-web-api`, `doc:writing-unit-tests-in-a-notebook`). Nothing bore on
it. What was used is in the checkout: `os-2-order-and-pool.test.ts` for the form of the test, and the
section "Two standing leaves of the orchestrating session" of `rules.md` for how a one-letter answer
is quoted.

## Not tried

- Whether the advisor's limit comes before a limit of the account. The issue says nobody measured
  it. Neither did I.
- An orchestrator's pass that reads the new lines. None has run since they were written.
- The test does not hold the last sentence of the parenthesis ("Not known, the issue says: …") or
  the words that say what choice B was, past "Choice B, not taken,".
- `oversight.md` line 634 says of this issue "Not edited by me" and "Not known". It is the overseer's
  note of that day and was left as it is.

## 2026-10-12, later: the five lines are out

The owner approved this issue with the reason "B" (event 4354), choice B of comment 3851: the five
lines out, the test kept. `skill-step-2-five-lines-out` took them out and the test file has three
tests since: `tools/cloud-brain/records/skill-step-2-five-lines-out.md`. What is above is the record of `9fae78a0`.
