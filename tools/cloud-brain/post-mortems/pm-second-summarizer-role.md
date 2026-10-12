# Post mortem: a spec made a second summarizer role, and reached the owner with a pick of A (`pm-second-summarizer-role`)

The first post mortem of the issue loop, written 2026-10-12 by a writer of the loop (token `impl-58df50`,
from its `start` move, event 4495) from the tracker's events, the spec as its commit has it, the orchestrator's
journal and the transcript of the spec writer's run. Nothing was built and no brief was changed by
it. It ends with three issues, filed.

The owner, 2026-10-12, before 21:16:42 CEST (the body of the issue, and comment 4484 for the time):

> Can we have a post mortem on how we had that dumb decision and trace where the decision making went wrong. It should use reflection and backtracing the tasks to identify the root cause of this bad decision. We need this to be a general mechnism, declare a post mortem to prevent someting from never happening again.

## What happened

The spec `plan/cloud-brain-docs-summarised-for-search.md` at `lopecode-dev` 619354c2 added a role
`doc-summarizer`, with a brief `roles/doc-summarizer.md`, and a tool `summarize-docs.ts`. A
summarizer role existed: `paper-summarizer`, started by `summarize-papers.ts`, which had written 63
summaries (comment 4468 of `docs-summarised-for-search`). The spec passed a fresh review and the
loop's review, and was put to the owner as A, B or C with the pick A. He sent it back. His words,
whole (comments 4458 and 4463):

> yeah claude, don;t we have a summarizer persona, it should reuse that

> yeah I think we don;t have two seperate roles, we just make the summarizer more general as it has the same basic job for the same purpose

## The trace

Times are CEST, each the `at` of the event (`issue-as.sh impl-58df50 "get?id=docs-summarised-for-search"`, read 21:21).

| Event | Time | Who | What it did with the role |
|---|---|---|---|
| 4147 of `answers-cut-and-not-said` | 19:01:16 | the owner | "A, we should summarize the doc for search, with a link to the original in file/blob storage". No word on who writes the summary. |
| 4246 | 20:19:20 | `orch-d97e0e` | Opened the issue. Under "Not known": "Who writes the summary and what a run costs (the paper summaries are one light agent a paper, `plan/cloud-brain-paper-summarizer-persona.md`)". The papers' spec is given as the thing to look at. |
| 4253 | 20:20:58 | `spec-6ac003` | Took the spec. Its prompt was four lines: the worktree, the brief, the issue, the token. |
| 4337 | 20:48:25 | `spec-6ac003` | Submitted 619354c2. The role is in it as an answer, not as a choice (below). |
| 4341 | 20:52:15 | `rev-e6fc59` | `pass`, "Nothing holds it". Question 3: "Twelve ways are under \"Not chosen\", each with its reason". Six notes, none on the role. |
| 4342 | 20:52:21 | `rev-e6fc59` | To `awaiting-approval`. The reason names the cost and the token, not the role. |
| 4344 | 20:53:02 | `orch-d97e0e` | The comment for the owner: "One light agent a doc writes the summary, as for the papers". Pick A. |
| 4382 | 21:04:42 | `out-5f56b2` | His first answer, of 21:02, is about cost: "coz we switch to use Claude code + popler which seems much more cost effecient". |
| 4434 | 21:12:29 | for the owner | `send-back`, on his "C". |
| 4458, 4463 | 21:14:25, 21:15:10 | `out-5f56b2` | His two sentences above. |

### What the spec's writer had in hand

The spec, read with `git show 619354c2:plan/cloud-brain-docs-summarised-for-search.md`:

- Its "Read" table, line 556: the first search of the Brain answered
  `doc:cloud-brain-paper-summarizer-persona` first (0.696) and the third answered it first again
  (0.909). Used: "the first two, read whole in the checkout; this design is the first's on another kind".
- Section 3, line 321, of the new tool: "It is `summarize-papers.ts`'s `run` with another source of text."
- Lines 326 to 329: task 2 changes `summarize-papers.ts` so that the canary and the start of the
  agent are "exported functions that take the role", and `judge` takes the headings as an argument
  "so that one rule judges both".

So the writer knew the role existed, said the new design was the same design, and wrote the old
tool's parts to take a role and a list of headings as arguments. The spec then names a second role
and a second tool that call them.

### Where the choice was made

Lines 28 to 31, after the owner's words of 2026-10-11 on the papers ("this would be a new persona
\"paper summerizer\""):

> He gave no words on who writes a doc's summary. This spec reads the two together: the loop's
> subagents, one a doc, with a brief of their own. That is the writer's reading and not his words;
> his approval of this spec is where he says otherwise.

"With a brief of their own" is the whole of the decision. From there the role is an answer: the
row "Who writes the summary" (line 41) has "One light agent a doc, the role `doc-summarizer`,
started by a tool as `paper-summarizer` is".

"## Not chosen" has twelve items. None is one role for both kinds:

```
$ git show 619354c2:plan/cloud-brain-docs-summarised-for-search.md | awk '/^## Not chosen/{f=1;next} /^## /{f=0} f' | grep -c '^- \*\*'
12
$ … | grep -c -i 'paper-summarizer\|role\|brief'
1
```

The one line is "No brief changes", of the summarizer started by `lock.sh`. The twelve are ways to
make or place a summary (no model, one `ai.run` call, parts, a larger limit, and so on). The spec
gives no reason for a second role, because it did not write one role against two as two ways.

### What each check after it read

- **The fresh review the writer ran** (`/review-notebook`, one agent with no context; the spec's
  last section but one): eleven findings, each of a citation, a number or the order of the text.
  The spec says of it: "found the other citations and the arithmetic to hold". None is of the design.
- **The loop's review, 4341.** Its question 3 is "Is the smallest version that meets them the one
  proposed, and what was not chosen?" (`tests/tools/fixtures/reviewer-brief.md` line 370, the copy
  of the brief at this commit). The reviewer answered it from the list: twelve ways, each with a
  reason. It read `SKILL.md`, "The role `paper-summarizer`", and the lines of
  `summarize-papers.ts` that the spec cites, and found each citation to hold.
- **The comment for the owner, 4344.** It names the token: "It names a token for the orchestrator
  to make: `loop-doc-files`". `agents/spec.md` line 75 asks for that: "say in the comment for his
  approval that the spec names a token, and which". No line asks the same of a role or a tool, and
  the comment has neither. The orchestrating session of its own comment (4485 of this issue): "I
  named \"one light agent a doc, a new role, the same way paper summaries are written\" as a fact
  of the spec and did not ask why a new role where one exists."
- **The session outside the loop** gave him the ten waiting decisions in a few sentences each and
  "did not name the second role either" (its own words, the body of this issue).

The spec left its reading "for his approval". What he was shown at his approval did not have it.

## The root cause

No text that a spec's writer or its reviewer follows asks, of a thing the design adds, what exists
that does the same job and why that is not extended. The writer had the fact and was not asked the
question, so the choice was never written down as a choice, and each check after it checked what
was written down.

What the texts have, read at 619354c2:

- `agents/spec.md`, step 5 (line 53): "the smallest design that meets the requirements, and what
  was not chosen and why". A list of ways, of the writer's choosing.
- `agents/implementer.md`, step 2: "a module is reused by import, never copied". The sentence
  exists for a module. `grep -n -i 'reuse\|exists already\|already exist' .claude/skills/brain-maintenance/agents/*.md .claude/skills/brain-maintenance/*.md tests/tools/fixtures/reviewer-brief.md`
  printed that line and no other (21:26).
- `philosophy.md`: nothing on it (`grep -n -i 'reuse\|exists already\|general' cloud-brain-dev/philosophy.md`
  printed one line, "a general philosophy"). Line 2's reading, "Take the side that is smaller and easier to
  undo", says which of two ways to take, and here there were not two.

Two things beside it, each of which let it pass and neither of which made it:

1. **A reading the spec marked for the owner did not reach him.** The writer did flag it, in the
   sentence quoted above. Nothing carries such a sentence from line 30 of a file of 655 lines to the
   comment he answers.
2. **The papers' spec is the pattern, and it made a role for a kind.** `plan/cloud-brain-paper-summarizer-persona.md`,
   lines 42 to 48, read his "a new persona" as "a second role of that kind" beside the reviewer. That was
   right then: no summarizer existed. The doc spec did the same act a second time, when one did.

## What is not known

- **Why the writer chose it.** The transcript of its run
  (`agent-a470d5baabd969ffd.jsonl` of session `f501a8e8-b922-4e11-a581-2b725efd6272`) keeps no
  reasoning: every `thinking` block in it has length 0 (46, read 21:24) and both answers of its
  advisor are `advisor_redacted_result`. Its report names the role in one line, as a fact. So this
  trace reaches what the writer wrote and nothing of why. "Reflection" by the writer itself was not
  asked for: it was at work on round 2 of the spec.
- **When the owner saw that the spec made a second role.** His first answer was on cost. Asked what
  "Claude code + popler" named (comment 4458), he answered with the first sentence above. Whether he
  knew before that of the second role is not in the tracker. The orchestrating session says it had
  named "a new role" to him in chat (4485); that chat was not read.
- **Whether the line below would have caught it.** Not tried: no spec was written under a changed
  brief.
- **Whether one role is right for every such case.** His words are of this one: "the same basic
  job for the same purpose".
- The spec's eleven fresh-review findings were read in the spec's own account of them, not in the
  reviewer's report.

## What it cost

From the two `cost` events of the issue (4338, 4343): the spec's round 1 was 1683 s, a context of
280,304 tokens, 50 requests and two advisor calls; its review was 223 s and $1.25. The owner
answered four times between 21:02 and 21:15 (comments 4382, 4433, 4458, 4463) before the round could start again. Round 2 was being
written when this was (comment 4485). How much of round 1 stands is that round's to say.

## Next actions, filed

Each is an issue of kind `task`, opened by this writer and linked `related` to this one. None is
done here: `spec-6ac003` was working under `agents/spec.md` (`seen-briefs-change-under-a-writer`),
the reviewer's brief is put by the overseer, and `philosophy.md` is the orchestrating session's to add to.

| Issue | Event | What changes | The part of the trace it answers |
|---|---|---|---|
| `spec-names-what-exists-of-the-job` | 4497 | `agents/spec.md` step 5: for each standing thing a design adds (a role and its brief, a tool, a token, a Worker, a method, a store) the spec names what exists of the same job and says under "Not chosen" why it is not extended. The reviewer's question 3 lists those things and reads that sentence for each. | The root cause. |
| `decision-comment-names-what-is-added` | 4499 | The comment that puts a spec to the owner names each standing thing it adds, and each sentence the spec marks as the writer's reading of his words. | A reading marked for him did not reach him. |
| `philosophy-one-role-for-one-job` | 4501 | His two sentences under "Clarifications" of `philosophy.md`. | Nothing an agent decides by had it. |

Not filed, and why:

- A change to the fresh review's brief (`.claude/skills/review-notebook/reviewer.md`). It is named
  in the first issue as not known. That reviewer has no context by design, and whether it can know
  what exists is not clear.
- Keeping an agent's reasoning. It would have answered "why", at an unknown cost. It is told to
  `post-mortems-declared-and-kept` as a limit of what a post mortem can reach, for its spec.
- Anything of the papers' spec or of `paper-summarizer` itself: round 2 of the doc spec decides how
  the role is made general.

## How it is known later

Not built. Two reads that would show it, once the first issue has landed: the next spec that adds a
role, a tool or a token has the sentence for each, and no spec after it is sent back by the owner
with a reason that names a thing that existed. The second is a count over `send-back` moves and
their comments, which `post-mortems-declared-and-kept` may give a tool for.
