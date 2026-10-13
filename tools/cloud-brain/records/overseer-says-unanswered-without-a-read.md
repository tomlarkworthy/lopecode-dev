# The overseer's brief asks for a read before a comment that says an ask of the owner's was not answered (`overseer-says-unanswered-without-a-read`)

Round 1, by a writer of the issue loop on 2026-10-13, in a worktree made at `5e424746`. Four
sentences and a case were added to one paragraph of
`.claude/skills/brain-maintenance/agents/overseer.md`, under "Feedback that is due", with a test
file. No seed, no tool, no deploy.

The issue is labeled `major`: the overseer does not edit its own brief, so it filed the text (event
4597) and a writer made the edit. No overseer has run from the new sentences.

## What happened, as the record has it

Read with `issue-as.sh <token> "get?id=health-chart-not-useful-remove"` and the same call for
`services-chart-near-the-top`, 2026-10-13:

```
4271  over-8093f9  comment  "this ask of the owner's is not answered by any finished work ... Not seen by me on the page."
4272  over-8093f9  comment  on services-chart-near-the-top: "No finished issue moved the services chart, by the titles
                            of the parts ...; the page was not looked at by me."
4296  orch-d97e0e  promote  "... a project that is done and did not do it (the overseer, comments 4271 and 4272)"
4323  impl-344875  start
4331  impl-344875  close    "Nothing changed: the chart this note is on is already gone. ... That panel left the page on
                            2026-10-11 under fb-a2oogpkdjb"
4332  cost         implementer, round 1: seconds 331, context 149451, tools 20
4334  orch-d97e0e  close    of services-chart-near-the-top: "The owner filed the same ask himself from the page as
                            fb-a2b5yudl8s ... which is done"
```

## What changed

The passage stands after "the orchestrator reads it there." and before the parenthesis that begins
"(Until `owners-feedback-held-by-related-links`". It differs from the text the issue proposed in
three places:

- **The list call.** The issue has "`list?kind=feedback`". On 2026-10-13 that call answered 100
  issues with `total` 117 and `more: true`, 7 of them at `done`; `list?kind=feedback&state=done&limit=500`
  answered 9, `more: false`. The brief has the second call, and says why: "a list has titles and no
  bodies, and with no `limit` it is 100 issues". The first is from the answer, where no issue had a
  `body`; both are in the reference of `issue.list` in `tools/cloud-brain/brain-issues.ojs`, and the
  test reads them there.
- **Where the anchor is.** The issue has "the cell and the text are in the note's last sentence".
  That holds for neither note of the case: each was opened by a session for the owner, and its
  body names the place in its second paragraph ("anchored in the cell `healthView` of
  `@tomlarkworthy/cloud-brain` at the text \"Health\""). In a note filed from the page
  (`fb-a2oogpkdjb`, `fb-a2b5yudl8s`) the sentence "Annotated on the Brain's page: module …, cell …,
  at the text …" stands before the anchor's JSON. The brief has "the note's body names the cell and
  the text, in the sentence before the anchor when it was filed from the page".
- **The case.** The issue has "had not looked" and "the panel had been off the page for a day". The
  brief has "had not seen the page", which is what comment 4271 says, and "the panel had left the
  page on 2026-10-11": `git log -1 --format=%ci 759325a8` prints `2026-10-11 21:50:18 +0200`, and
  comment 4271 is of 2026-10-12 18:31:27 UTC, 22 hours and 41 minutes later.

## The two reads, tried on the two notes

Made 2026-10-13, as the brief's sentence gives them.

`git grep` of the seed for the text the first note is anchored at, at the commit that took the
panel off, which is the tree the overseer of comment 4271 had:

```
$ git grep -n -F 'Health' 759325a8 -- tools/cloud-brain/cloud-brain.ojs      (12 lines; the third)
759325a8:tools/cloud-brain/cloud-brain.ojs:47:// The panels under Health, in order. The strip of faults by Worker (healthStrip) was the second until 2026-10-11,
$ git grep -n -F 'Health' 759325a8^ -- tools/cloud-brain/cloud-brain.ojs     (12 lines; the third)
759325a8^:tools/cloud-brain/cloud-brain.ojs:47:    { title: "Health", body: healthStrip(data, { width: width - 40 }), wide: true },
```

The list, with the token of this run:

```
$ issue-as.sh <token> "list?kind=feedback&state=done&limit=500"      9 issues, total 9, more false; two of them:
fb-a2b5yudl8s | owner | ["annotation"] | Services section is very useful and should be the first thing under the health section
fb-a2oogpkdjb | owner | ["annotation"] | the successful calls dashboard is not very useful and should be removed from the main page
```

Each of the two notes has a line there that asks what it asks. That an overseer who reads those
lines takes them for the same ask is not shown by this.

## The test

`tests/tools/overseer-says-unanswered-without-a-read.test.ts`, four tests: the rule stands once and
in its place; the two reads, what the comment says, and what is said with no read; the case; and
that the reference of `issue.list` in the seed still has what the brief says of a list.

```
$ bun test --timeout=30000 ./tests/tools/overseer-says-unanswered-without-a-read.test.ts
 4 pass, 0 fail, 17 expect() calls
$ OVERSEER=<the brief of 5e424746, from git show> bun test --timeout=30000 ./tests/tools/overseer-says-unanswered-without-a-read.test.ts
 0 pass, 4 fail, 9 expect() calls
$ tests/tools/suite.sh          (2026-10-13 06:16 CEST, after the last edit of the brief and the test)
 1048 pass, 0 fail, 7592 expect() calls, 1048 tests across 107 files
```

## Not tried

- No overseer has run from the sentences. Whether one makes the two reads, and whether its comment
  then says what was read, is not known.
- The reads were tried on the two notes of the one case. A note whose anchored text is a common
  word, or whose ask was answered under an issue at `closed` (68 of the 100 that
  `list?kind=feedback` answered were) or by a task that is no feedback issue, was not tried; the
  brief asks for `done` alone, as the issue does.
- Nothing checks a comment of the overseer against the rule: it is held by the agent that writes
  one. The test holds the sentences in the brief, not what an overseer does.
- `SKILL.md`, the row for `open`, kind `feedback`, was not changed: what the orchestrator does with
  a comment of the overseer that names no read is not said there.
