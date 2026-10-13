# ap-6-rules-and-live-step

Task 6 of `plan/cloud-brain-approver-persona.md`: the lines of
`.claude/skills/brain-maintenance/rules.md` for the approver, and the run of `approver.ts check` in
`agents/overseer.md`. Written 2026-10-13 by the writer of the issue (token `impl-642ff5`), round 1,
started at event 5734. Five docs and one test file. No seed, no build, no deploy, nothing emitted.

## It landed after the install, not before

The spec has this task land "before his install" and change "nothing until it". The owner
installed the policy that names the approver's delegation at event 4668 (2026-10-12 22:07:19 CEST,
the event's `at`), and the approver made its first `approve` at event 5170. So the text says what
is in force. Read 2026-10-13 with this writer's token, the record at 5733 (the first `date` before
the three calls printed 05:46:55 CEST):

```
$ issue-as.sh impl-642ff5 policy     # policy.seq, and the approve guard of each workflow
seq 5689
task      caller.present || caller.actor == "delegation:eb3db9d0c6a5"
project   caller.present || caller.actor == "delegation:eb3db9d0c6a5"
security  caller.present
$ bun tools/cloud-brain/approver.ts check --token impl-642ff5
1 approves by a delegation, 0 that do not stand                 exit 0
$ bun tools/cloud-brain/approver.ts list --token impl-642ff5
2026-10-12 23:25  dense-rule-project-line-first  on words a session quoted at event 5034  …   exit 0
```

Until this landing `rules.md`, Never, kept the `approve` move from every agent but a session on
his word, and said of a change to itself that "only the owner can approve" it. The one approval the
approver had made was of a change to `rules.md`.

## What changed

`rules.md`, 36,535 bytes before and 44,045 after (`wc -c`, and `git show HEAD:… | wc -c`):

- **A section, "The approver"**, after "An act of Never, on the owner's word". Before its marker:
  his three sentences with their events (4112, 4115, 4123) and choice A of comment 4121, which his
  "A" answered. After it, eight items: who makes the move; since when it is in force; what the
  approver is not given; that its approval is no word of his; its own files, and the pin in the
  policy's reason; that the overseer does not edit its brief or its tool; `major`; what the owner
  does after. A script over `issue-as.sh impl-642ff5 "get?id=approver-persona"` printed
  `in event: True in rules.md: True` for each of the four quotations; 4123 is `via session` with a
  UUID for its key, and 4112, 4115 and 4121 were written by a token of the orchestrating session.
- **The opening.** "which only the owner can approve" is "which is approved by the owner, or for
  him on words of his that the approval quotes", the spec's sentence for `major`. "The overseer
  does not edit this file" gains "or the approver's brief".
- **Never, the first item.** One clause: the writes of an agent's run with another token than its
  own are the `approve` that `approver.ts approve` sends with `loop-approver`, and the one comment
  of `approver.ts id` (event 4475, written in a writer's run: `records/ap-4-policy-v3.md`).
- **Never, the `approve` line.** Three lines at its end: the move is also made by an approver,
  through `tools/cloud-brain/approver.ts approve` and in no other way; no other agent makes it.
- **"An act of Never, on the owner's word", "Who does it"** (review 4118). The paragraph stands
  as it was. After it: an approver is such an agent too, and one thing reads the other way for it
  alone, the words a session quoted, which it may judge a change by and name in its `asked:` line.
  The spec's line for it is quoted ("words a session quoted count as his, and are marked apart from
  his own events"; in the file at `e24b06e4`, the commit review 4118 read, `grep -c` 1).
- **"Which token".** The row `An approver | appr-… | the same`, and an item on the run's second
  token.
- **"A token an approved spec names".** A paragraph: a spec approved `via delegation` is his word
  for a token it names when the verdict's `asked:` line is of words that ask for what the token
  serves, and not otherwise; the orchestrating session reads the line before it makes the token.
  And `loop-approver` as a fifth kept token, with the comment that says who made it (4460 of
  `ap-4-policy-v3`).

`agents/overseer.md`, 16,154 bytes before and 17,693 after:

- **"Measure first"**: `bun $W/tools/cloud-brain/approver.ts check --token <token>` at each
  oversight, its last line in the entry, and what exits 0, 1 and 2 are.
- **"What you may do"**, the row of `rules.md` and its own brief: it now also has the approver's
  brief and tool, with what an edit of them costs.

`SKILL.md`, "Why the overseer may edit briefs and not rules": one sentence names the approver's
brief beside `rules.md` and the overseer's own. And "A token an approved spec names", the
orchestrating session's procedure for that act: it reads the `asked:` line of the verdict of a
spec the approver approved before it makes a token that spec names.

`knowledge/working-with-cloud-brain-remote-lopecode-cluster.md`, the row of the loop: the approver
"approves nothing until the owner installs a policy for it" is what it does since his install.

`plan/cloud-brain-approver-persona.md`, task 6: a note "As built".

## The writer's choices, which the spec did not make

- **A section of its own.** The spec lists lines in four places. His words are quoted once, in the
  section, and the four places name it.
- **"Who does it" is added to, not rewritten.** `tests/tools/rules-md-acts-on-the-owners-word.test.ts`
  holds its list of agents letter for letter; a first edit that put "an approver" in the list
  failed that test in the suite (1,038 pass, 1 fail), and was taken back.
- **What the overseer does on exit 1.** The spec says the run is made and that it is "exit 1 with a
  line for each". The brief has it file one `bug` with the lines as printed, first of its 3, and
  name it first in its report. Taken by line 4 of `philosophy.md` as that file reads it: what he
  said and what he must see is written where the next agent reads it.
- **Who reads the `asked:` line for a token.** The orchestrating session, which makes the token.

## Tests

`tests/tools/rules-md-the-approver.test.ts`, 13 tests. Before any edit of the docs:

```
$ bun test --timeout=30000 ./tests/tools/rules-md-the-approver.test.ts
 1 pass  12 fail  16 expect() calls
```

The one that passed tests the file's own helpers. After the edits: 13 pass, 0 fail, 91 expect()
calls. The whole suite, `tests/tools/suite.sh`, after the last edit: the count is in the issue's
comment with the command.

Besides the texts, the test holds five things against the code: the command line of `approve` in
the tool's header, the last line of `check` and its exit 1, `on words a session quoted at event`
in `list`, the files the tool refuses, and the role `"appr"` in `brain.ts`.

## Not tried

- **No overseer has run the new step.** `approver.ts check` was run with a writer's token from this
  worktree, exit 0. Exit 1 was not seen on cb4: the brief's line for it is from the tool's code
  (`approver.ts`, the branch `check`) and `tests/tools/approver.test.ts`. Exit 2 was seen for a
  token that is not kept and for no `--token`, not for a tracker that was not reached.
- **`check` from the overseer's worktree**, `bm-over-<host>`, was not run. It reads commits from
  the checkout it runs in.
- **No approver has read `rules.md` as it now is**, and none was run for this record.
- **The refusals of the item "What it is not given"** are the rig test's
  (`test_issues_an_approver_delegation_approves_and_no_other_token`), read in the seed and not run
  here. `loop-approver` was sent nothing by this writer.
- **`revert`, `owner-reject` and `brain.ts token revoke loop-approver`** are the owner's and were
  not sent. The item that names them is from the spec, part 5.
- **A spec approved by the approver.** None exists, so the paragraph on its token has no case.
- **The size.** `rules.md` is 7,510 bytes longer, and every agent of the loop reads it whole. What
  that costs a run was not measured.

## Left as it is, for the overseer

- `agents/approver.md`, "You do not send the `approve` move": "when this was written it had no
  line for an approver (`ap-6-rules-and-live-step` writes it)". True as written, and now behind. A
  mend changes the brief's blob, which stops every approval until the owner installs again, and
  this issue would then be one the approver does not judge. Not changed.
- `SKILL.md`, step 4, "The approver": "First approver started this way: not yet, when this was
  written." The first verdict is event 5169 or earlier.
