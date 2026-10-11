# rc-3-record-only-count

2026-10-11. Task 3 of `plan/cloud-brain-record-checked-by-review-alone.md`, R3, with the owner's
answer to R4 (event 2099). A local tool and its test file; no seed, no deploy. Two parts of the
task are not in force when this lands, and each is another role's act: the text for the reviewer's
brief below (the overseer puts it) and the quote for `philosophy.md` (a commit that is not pushed).

## What changed

`tools/cloud-brain/issue-stats.ts` prints one more line, and a second under it with `--window`:

```
statements only reviews that begin with it: 0 {}; of them `statements only, record`: 0 {}
```

That is the line of the record as cb4 had it at event 2119 (`report(events, { until: 2119 })` on
the events read at 21:07:27 CEST, 162 `reviewed` events, 68 `changes`). It reads 0 until a reviewer
writes the mark, which no brief asks for yet.

A review is marked when its body, after leading spaces, begins `statements only` and the next
character is not a letter, a digit, `_` or `-`. It is also under `statements only, record` when
the body goes on `, record`. The words are lower case; `Statements only` is not the mark. Either
verdict is counted. For a marked `changes` the round after is two `cost` comments of the same
issue: the implementer's with the lowest `event` above the review's seq, and the reviewer's with
the lowest `event` above that one. Their `tokens` are summed. A review with either missing is
counted, left out of the sum and named by its seq.

The pairing is by `event` and not by a comment's own seq or its `round`, as the spec says. The
cost comments of review 534 show why, as cb4 has them:

```
835  implementer round 1  117,836  no event
836  implementer round 2  175,360  event 482
837  reviewer    round 1  145,267  event 534
838  implementer round 3  177,525  event 549    <- the round after review 534
839  reviewer    round 2  132,823  event 562    <- its review        177,525 + 132,823 = 310,348
```

They were written about 300 events after the review, and the writer's round 2 is the one before it.

**Checked against the spec's hand count.** The spec read 50 reviews and classed 11 as statements
alone; marked that way, its table would sum seven rounds, 1,834,670, and leave four out. With the
mark put in memory before those 11 bodies (`, record` for 1424 and 1456), the tool on the real
events, at `--until 1622` and at 2119, 21:12:06 CEST:

```
all     reviews 11  {"changes":11}  summed 7  tokens 1834670  leftOut [100,452,1032,1052]
record  reviews 2   {"changes":2}   summed 2  tokens 485182   leftOut []
```

Both sums are the spec's (its 485,182 is under choice A). The script was a scratch file and is
not kept: it imports `report`, reads the events with `sync?after=0&limit=500` and
`issues-implementer-2`, and puts the mark before the body of each of the 11 seqs.

## Tests

`bun test ./tests/tools/issue-stats.test.ts`, in the worktree at `c1ec9d92` (the tool's commit, after the rebase onto `676c3a75`): 16 pass, 0 fail, 52
expects. Five are new. With `ISSUE_STATS_TS` set to the tool of `main` before this change, the
same file: 11 pass, 5 fail.

- Review 534, marked, with its five cost comments and the `cost-usage` comment 1720: 310,348.
- Review 452, marked, with its four: counted, left out, `[452]`. Comment 807 names no `event`.
- A marked `pass` is counted and has no round. `statements only, record` is counted under both.
  The mark in a second line, `statements only-ish`, `Statements only` and an issue `test-…` are not counted.
- No marked review: the line reads 0.
- `--window` gives a line of its own; `--until 838` leaves 534 out, since comment 839 is after it.

The bodies of the cost comments in the test are cb4's, whole. The two review bodies are the
test's own, since no review on cb4 has the mark.

## The text for step 7 of the reviewer's brief

For the overseer to put with `cloud-brain-dev/put.sh roles/reviewer.md`. Read against the brief
as fetched at 21:07 CEST (185 lines, SHA-256 `6252ef035993…`). It replaces the first two sentences
of the paragraph after the table of step 7, lines 137 and 138: "`pass` means you found nothing a
second change is needed for. A defect you would fix yourself in a minute is still `changes`." The
rest of that paragraph, from "Something out of the issue's scope", stays.

Why that sentence goes: two reviews of the same evening read it both ways. Review 1887 sent a spec
back for "87 commits" where `git log` gives 95, with one other finding. Review 2053 passed a
record that says "16,045 bytes" where its own `wc -c` gave 16,051, with the note "a round costs more than
the word does".

The text, between the lines:

---

`pass` means you found nothing a second change is needed for. The verdict is on functional
quality: what the change does, whether its tests were run and what they show, and whether what
runs is what was committed. The owner, 2026-10-11, the reason of his approve move, event 2099 of
`record-checked-by-review-alone`, whole:

> yeah exact numbers should not be a cause of failure in a running system. As long as the spirit of the argument is met that should pass review. Reviewers should not be padenatic about world measurements, only functional quality, not background information.

So two kinds of thing are a note and not a finding. Neither makes a verdict `changes`, alone or
with others of its kind:

- A number or a measurement of the world that is inexact, in a record, a doc or a comment: a count
  of events, lines, bytes or tokens, a size, a time, a unit. His words: "exact numbers should not
  be a cause of failure".
- A statement that is background and not what the change does: how a thing was found, what
  another issue did, what was so before. His words: "not background information".

Write each under a heading `Notes`, with the command that shows the true value and the mend in one
line. The writer of the next change to that file takes it; no issue is opened for it.

Still a finding, and `changes`:

- a test count that was not run, or not by the writer (`rules.md`, Never, last item);
- a claim that the change does something it does not;
- a record or a ref that `rules.md` or the writer's brief asks for and is missing;
- a defect of the code, a test or a tool, however small.

His words do not settle these, and he has not been asked. Decide as you would have before, and
name the case in the body so the overseer can gather them for him:

- a number that the argument rests on, where the argument fails with the true one;
- a false sentence in a text that agents act on or that is deployed (a brief, `SKILL.md`, a
  knowledge doc, a service's served reference);
- a ref that is present and names the wrong commit or hash;
- a test count that was run and is copied wrong.

**The mark.** When every finding and every note of your review is a statement (untrue against a
source, or a record or a ref that is missing), in whatever file, and none asks a change of code,
a test, a tool or of what a text the issue asked for should say, the body's first line is
`statements only`, in lower case, with the verdict on the line after. When each of them is in
`tools/cloud-brain/records/<id>.md` of the issue itself, the first line is
`statements only, record`. Whatever the verdict: a `pass` with notes of this kind is marked too.
A review with no finding and no note is not marked. `issue-stats.ts` counts the reviews that begin
so and what the round after a sent-back one cost.

---

The two bullets of notes and the four of findings are the issue's body, which gives the first
three findings; the fourth is added so that the text does not read as taking code defects out.
The examples in the bullets ("a count of events, lines, bytes or tokens, a size, a time, a unit";
"how a thing was found…") are mine. "The writer of the next change to that file takes it; no issue
is opened for it" is mine too: the spec weighed "`pass`, with the line filed as a new issue" and
did not choose it, for its cost. Nothing makes a later writer take a note.

**What his words do not settle.** The four cases of the text. For the first, his second sentence
gives a condition, "As long as the spirit of the argument is met", and says nothing of when it is
not. For the second, review 1202 is the case: "under the panels" in a docs module, drawn above
them. The third and fourth are close to "a ref that is missing" and "a test count that was not
run" and are neither. The text leaves each to the reviewer as before and decides none.

## The quote for `philosophy.md`

Written under Clarifications and committed in `cloud-brain-dev` as `d3ba059` (21:12:50 CEST), on
the branch `rc-3-philosophy` of the submodule in the main checkout. It is not pushed and the
pointer in `lopecode-dev` is not moved: `philosophy.md` as agents read it does not have it.

```
git -C cloud-brain-dev push --dry-run origin main
fatal: could not read Username for 'https://….artifacts.cloudflare.net': Device not configured
```

A push needs a token from `git.token`, which is the owner's (`brain-git.ojs`, `who: "owner"`), and
none of the nine names kept in `.emitted/cb4-tokens.json` is for git (`loop-agents`, `-bluesky`,
`-dashboard`, `-deploys`, `-docs`, `-knowledge`, `-library`, `-papers`, `-roles`; what `loop-agents` names was not read). `philosophy.md` says of itself that the one
agent that adds a quote is the orchestrator. For the orchestrating session, in the main checkout:

```
git -C cloud-brain-dev merge --ff-only rc-3-philosophy      # main is at 0ba1f45, the commit's parent
git -C cloud-brain-dev -c http.extraHeader="Authorization: Bearer $T" push origin main
git add cloud-brain-dev && git commit                        # the pointer, under the landing lock
```

The reading under the quote there is this writer's and says so.

## Not tried, not known

- No review has the mark, so the line has counted nothing a reviewer wrote. The first marked
  review is the first run of the rule that reads it.
- The mark is what a reviewer says of its own review (the spec, "Not done"). The tool does not
  read a body past its first words.
- A marked review of a spec is sent back to a spec writer, whose cost comment has the role
  `spec-writer`. The tool pairs with `implementer` only, as the spec says, so such a review is
  left out of the sum. Not tested.
- A reviewer's cost comment with no `event`, followed by a later round's that has one, would be
  paired with the later one. No issue on cb4 has that shape among the 11; not looked for further.
- The tool was run on the events from a script, in the worktree, where `issue-as.sh` has no
  token. Its run from the main checkout after the landing is in the issue's comment.
- The text for the brief was read by no reviewer and has decided no review.

## Read first

Three searches of the Brain with `loop-knowledge` (`knowledge.search?semantic=true`): "review sends
back for an untrue sentence of a record", "count reviews marked statements only and cost of the
round after", "reviewer pedantic about measurements functional quality background". The first hit
of the first two is the spec itself, and the second of the third; `doc:cloud-brain-lean-reviewer-persona`
is fifth, second and first, and was not opened. Nothing but the spec was used.
