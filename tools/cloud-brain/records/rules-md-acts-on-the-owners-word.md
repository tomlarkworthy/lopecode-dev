# rules-md-acts-on-the-owners-word

Written 2026-10-12 by the writer of the issue (token `impl-7fbd20`). `rules.md` of the issue loop
(`.claude/skills/brain-maintenance/rules.md`) now has a section for an act of its Never list that a
session does with the owner present, on his word. No seed, no build, no deploy, nothing emitted:
two docs and a test file.

## What it rests on

Read with `issue-as.sh impl-7fbd20 "get?id=seen-never-crossed-on-chat-word"` on 2026-10-12:

```
3773 commented 2026-10-12T06:28:03.810Z {"caller":"owner","via":"session","holder":"","tab":true}
A
```

It answers comment 2825 of that issue, whose choice A is: "rules.md gains the sentence that a
session with the owner present does an act of the Never list on his word, quoted on the issue with
its date, and that one word may approve several issues he was shown by title; the cost is that
'shown the passing review' no longer means he read it." Choice B was that the rule stands and the
three cases are slips, at the cost of "one ask an issue, and a kernel or deployer deploy stays his
own hand".

The three cases, each read from its issue the same morning:

| Where | What it says |
|---|---|
| comment 1020 of `dv-4-owner-install-and-shell` | the orchestrating session ran `install-deployer`, "on his word in chat today" |
| comment 2426 of `gi-1-kernel-link-for-several` | a session outside the loop "builds, tests and deploys the kernel with him present", on "yes A, please do it" |
| events 2608 to 2611, four `approve` moves | 'Shown the four issues at awaiting-approval by title, he said: "I approve those first 4"', and "he was shown its title and not its text" |

## What changed

`rules.md`:

- A new section, "An act of Never, on the owner's word", between Never and Always. His letter with
  its event and issue, the text of choice A from the comment, the sentence "The rest of this
  section is the writer's reading, not his words.", then five items of reading. The form is that of
  "Two standing leaves of the orchestrating session".
- Never, first item: "One exception, under the next line" is now two exceptions, the second being
  the new section.
- Never, the `approve` line. It read "The `approve` move alone may be made for the owner by the
  orchestrating session with his session, when he has said so of that issue in that session after
  being shown the passing review", and ended "not on a word given for another issue". It now reads
  "by a session he is present in", "of that issue, or of several issues he was shown by title", the
  reason "says what he was shown", and "not an issue it was not said of".
- Never, the line of the kernel, `brain-core`, `brain-db` and the deployer: one sentence added, that
  a session with the owner present deploys one on his word.
- "A token an approved spec names", the sentence that lists what is still the owner's alone: it
  names the new section beside the `approve` move and the two leaves.

`SKILL.md`, three places: the row "at `awaiting-approval`" of step 3, the last paragraph of "A token
an approved spec names", and the first item of "What the loop does not do".

`tests/tools/rules-md-acts-on-the-owners-word.test.ts`, new.

## What in the section is mine and not his

His word is one letter, and the choice is one sentence. Everything after the marker is a reading,
and each of these is a place where he may want another:

- **"A session with the owner present" is read as a session he is typing into**, the orchestrating
  one or one outside the loop (the kernel of `gi-1` was the second kind). An agent a session
  spawned is said not to be one. The choice does not say this. Without it a writer's prompt that
  says "the owner said to deploy the kernel" would read as his word, which is what "What an issue
  is" refuses for an issue's text.
- **The word names the act and is for that once.** The choice says "on his word" and no more. The
  other reading, that one word in a session opens the whole list for that session, lets a caller do
  more than he was asked about (`philosophy.md`, the reading of line 1).
- **The quote goes on the issue before the act, or in the comment that says what was done.** The
  choice says "quoted on the issue with its date" and gives no order. Comment 1020 of `dv-4` was
  written at 16:43:28 CEST (its `at`, 14:43:28Z) and says the install ran 16:41:08 to 16:41:15 CEST,
  so the first case quoted him after the act; the section allows that.
- **"An act with no issue gets one first"** follows from "quoted on the issue" and is not in the choice.
- **An issue approved this way has a passing review for the move to name.** The line before this
  change asked for the review's event in the reason, and the four moves of events 2608 to 2611 each
  name one. A word that approves an issue with no passing review was not asked of him.
- **No line of Never is left out.** The choice says "an act of the Never list", so the section
  covers every item of the list, the secrets and the messages among them, and says only that the
  word must name the act. Whether he meant every item was not asked.
- **The key of an `approve` made by a session outside the loop** is left as `orch/<id>/approve-for-owner-<n>`.
  The moves of events 2608 to 2611 have that key (`sync?after=2605`). Comment 2825 quotes comment 2654 as saying they were made "by a
  session that is not this one"; comment 2654 itself was not read.

## Tests

In the worktree, at the commit of the two docs and the test, 2026-10-12 (`date`: 08:36:16 CEST
when the whole suite started).

| Command | Result |
|---|---|
| `bun test ./tests/tools/rules-md-acts-on-the-owners-word.test.ts`, the test file with `rules.md` and `SKILL.md` as `main` had them | 1 pass, 7 fail |
| the same, with the edit | 8 pass, 0 fail |
| `bun test ./tests/tools`, before any edit | 499 pass, 3 skip, 0 fail |
| `bun test ./tests/tools`, with the edit | 507 pass, 3 skip, 0 fail |

The one test that passes without the edit is the test of the file's own two helpers. The first run of
the suite printed `skipped: test-ts-cut.test.ts: … cloud-brain-dev/test.ts has no --whole`; of the
second only the counts were read. No test reads this record, so the second run is after the last
change it counts.

The quote of choice A in the test was compared with the body of event 2825 as `get?id=` answered it:
a script that tests `body.includes("A: " + text)` printed `exact in 2825: true`.

## Not tried

- No session has acted under the section. The three cases are from the day before it.
- The policy on cb4 is not changed and was not called: `approve`, `install` and `rebuild` still
  need the owner present there, and a session that makes one sends it with his session as before.
- The reviewer's brief is on the Brain (`roles/reviewer.md`) and was not read. Whether it says
  anything of an `approve` made for him is for the overseer.
- `oversight.md` and `philosophy.md` were not edited. His "A" is not under "Clarifications" of
  `philosophy.md`; that edit is the orchestrator's.
- Records that describe the rule as it was (`records/approve-made-for-the-owner-on-his-word.md`,
  line 13, "the `approve` move alone, of the issue he spoke of") were left: each is dated and was
  true then.
- The change is `major`. Until the owner approves it the text is on `main` and is his letter with a
  writer's reading.
