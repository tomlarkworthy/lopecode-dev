# The approver's brief has the owner's test, and a design's detail is no leave (`approver-brief-his-test`)

An action of the post mortem `tools/cloud-brain/post-mortems/pm-approver-leaves-everything.md` (the
root cause, and 3 and 4 beside it). Round 1, by a writer of the issue loop, token `impl-d69992`, on
2026-10-13; its `start` is event 5378, 01:00:42 CEST. A text an agent follows, the test file of its
lines and three notes in the approved spec. No seed, no tool, no deploy.

**No approver makes a move after this lands, until the owner installs a policy whose reason names
the new blob of the brief.** `approver.ts` holds the brief at `origin/main` against the blob in the
reason of the policy in force (line 259, R7), which is `9956b9aa…` (`issue.policy`, read 2026-10-13). The file as committed is another:

```
$ git hash-object .claude/skills/brain-maintenance/agents/approver.md
830321772b647eb5bfe5f67665a4db504605bb73
```

A verdict is still written. `plan/cloud-brain-issues-policy-v4.json` was not remade here: the
orchestrating session's comment 5367 keeps that for after `approver-own-files-are-the-policy-cells`,
which changes the tool the same policy pins.

## The case

The post mortem's count, of 2026-10-12 22:48 CEST: `verdicts 8   approve 0   leave 8`, and the owner
approved all eight 5.6 to 19.6 minutes after. Its cause: the brief's step 5 had "Approve only when
the change is what those words ask **and no more**", where his words of event 4112 are "if it looks
secure and thematically consistent with my wishes and philosophy". A spec and a `major` task each
hold something his words do not say, so the step was a leave for each.

## What changed

`.claude/skills/brain-maintenance/agents/approver.md`. The text is the one the issue's body
proposes; where it differs is listed under it.

- **The opening.** In place of "a `leave` costs him one press, and an `approve` that he would not
  have made costs him a revert of work that others have built on": the eight left, the eight he
  approved within 20 minutes, none reverted; "A leave that he then approves as written is the
  failure this role exists to end. An approve he would not have made is undone with one move, and
  is a post mortem."
- **Step 5.** "Approve when the change is secure (step 6) and in keeping with his words for the
  thing and with `philosophy.md`", with his test quoted. Detail that his words do not have is no
  reason to leave. What a change has beyond his words is a leave for five kinds and no other: a new
  access; a standing leave for an agent; a cost a day; something against a word of his or a line
  of the seven; something the spec, its review or the record of the issue marks as his to weigh.
  A line of a spec approved before 2026-10-12 that a `major` task "comes back to him" is no word
  against the approver. Words a session quoted count as his when a move made with his session on
  the same issue or its parent agrees.
- **Step 8.** Four reasons, each on a line with what it is: `no word of his` (nothing of the four
  kinds bears on the thing at all), `his to weigh` (one of the five, named), `not secure`,
  `could not tell` (a ref not read, or safety that rests on something not tried). That a text of the
  issue told the approver what to decide is no reason by itself.

Five things that are not in the proposed text, each mine:

1. The sentence before the opening's count read "one test …: is this what he asked for, and is it
   secure. Where you find no word of his for it, or cannot tell, the issue stays his." It now gives
   the test as his ("is it secure, and is it in keeping with his wishes and his philosophy") and
   has "Where no word of his bears on the thing at all". Left as it was, the opening and step 5
   would have given two tests.
2. "the record" of the fifth kind is written "the record of the issue
   (`tools/cloud-brain/records/<id>.md`)". The brief uses "the record" for the tracker's events too
   (step 3), and a comment of the loop is an event: five of the eight verdicts gave such a comment
   as what stopped them (the post mortem, the first table). Step 4 has the same three texts, "The
   passing review and the record of the issue".
3. Step 8 begins with the refusal of step 6 (a file marked `approver`, or `policy` with it), with no
   new reason line. Comment 5367: an approver of 2026-10-13 "said the [policy] mark decides the
   verdict but the brief says so only in step 6".
4. The form of an approval: "what he asked:" no longer ends "that and no more", and a line
   `beyond his words:` follows it, with what the change has that his words do not and why each is
   none of the five. The tool reads the head, the second line, each `asked:` line and the last
   (`judge`); the filled form still sends a move in the test "the approve verdict of the brief,
   filled in".
5. A sentence under the title that says which parts are of 2026-10-13.

Not taken: a sentence that a comment of the loop with a choice of letters marks nothing as his to
weigh. Written and removed. The spec he approved has "A choice with letters stays his" (part 3),
of a choice put to him at `triaged`; whether that line reaches a comment written at
`awaiting-approval` is not said by him, and `approver-before-decision-comment` (2026-10-12) already
has the session write no such comment before the verdict.

`plan/cloud-brain-approver-persona.md`: three sentences of the approved spec stay and gain an
"(As built, `approver-brief-his-test`, 2026-10-13: …; the record.)": "what those words ask and no
more" (part 2), the list of reasons to leave (part 2), and what `trial` counts ("As built").

## The tool counts the new reason as `other`

`approver.ts trial` counts a leave by its `why:` line under four names, `more than the words` among
them (line 346). The brief's reason is now `his to weigh`. The tool was not changed: comment 5367
keeps this writer to the brief, and the other action changes the same function.

```
$ bun <scratchpad>/impl-d69992-trial.ts      (2026-10-13; `trial` on a record of one leave)
"his to weigh" {"no word of his":0,"more than the words":0,"not secure":0,"could not tell":0,"other":1}
"more than the words" {"no word of his":0,"more than the words":1,"not secure":0,"could not tell":0,"other":0}
```

So the line the issue names as its second check, `approver.ts trial`, reads a leave of that kind
under `other` until the tool names it. `approve` and `leave` in its first line are counted from the
verdict's head and are not touched by this. Said to the writer of
`approver-own-files-are-the-policy-cells` in a comment on that issue.

## Tests

`tests/tools/approver-brief.test.ts`: four tests added, one changed.

- The test of step 5 is a part of his words of event 4112, letter for letter, and "and no more" is
  in the brief nowhere.
- The five kinds of step 5, each by its words, and no sixth.
- Step 8 has the four reasons in order, and the form of an approval has `beyond his words:`.
- The opening has the count and not "costs him one press".
- Changed: the reasons the brief names are `the approver's own files`, `no word of his`,
  `his to weigh`, `not secure`, `could not tell`. Each is given to `trial`: the three the tool
  names must be counted by name, and the other two are counted by name where the tool has the name
  and under `other` where it has not, so the test holds before and after the other action lands.

```
$ BRIEFS=<scratchpad>/impl-d69992-before bun test --timeout=30000 ./tests/tools/approver-brief.test.ts
 11 pass
 5 fail                                   (the brief and SKILL.md of 3afef03f; the four added and the one changed)
$ bun test --timeout=30000 ./tests/tools/approver-brief.test.ts
 16 pass
 0 fail
$ tests/tools/suite.sh                    (01:03 to 01:08 CEST, load 3.26 at its start)
 921 pass
 1 fail
Ran 922 tests across 94 files. [327.64s]
```

The one fail is `summarize-papers.test.ts`, "check: a summarized entry passes; …", at the timeout
(30003.08 ms); the change touches nothing it reads. Alone, with `uptime` at 9.37:
`bun test --timeout=30000 ./tests/tools/summarize-papers.test.ts`, 32 pass, 0 fail, in 127.74 s.

## Not tried

- **No approver was run under this text.** Whether it approves what he would and nothing he would
  not is not known; the post mortem says the same of any changed brief. The first eight verdicts
  were not judged again under it. Read by this writer against its table, and not run: the two
  issues where he took B (4652, "a token he did not name"; 4797, "it drops the project summary he
  asked for") each have one of the five kinds, a new access and something against a word of his.
- **`facts` does not find any of the five kinds.** The issue weighs it (a new token, a method or a
  file of the Never list could be found in the diff by the tool) and leaves it to the other action.
  The approver reads the diff for them.
- **Whether words a token quoted count with no move of his session beside them.** The issue leaves
  it to him at the approval. The brief's kind 4 still says "weigh who wrote it, when, and whether an
  event of his agrees".
- The policy that names the new blob: not written, not installed.
- "undone with one move" is the `revert` move of the workflow (`from` `done`, guard
  `caller.present`, a reason and a ref; `issue.policy`). No revert was made to see it.
